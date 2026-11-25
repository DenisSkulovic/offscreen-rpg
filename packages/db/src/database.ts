import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import type { DatabaseConfig } from './config';
import { DatabaseAdmissionError } from './connection/admission';
import {
  createManagedClientRuntime,
  safeBackgroundErrorSink,
} from './connection/managed-client';
import { executeManagedTransaction } from './transaction/execute';
import type { TransactionPolicy } from './transaction/policy';
import type { Transaction } from './transaction/types';
const DEFAULT_MANAGED = {
  queueLimit: 20,
  acquireTimeoutMs: 5000,
} as const;

export function createDatabase(
  config: DatabaseConfig,
  onBackgroundError: (error: Error) => void,
) {
  const managedConfig = config.managed ?? DEFAULT_MANAGED;
  const { managed, ...pgConfig } = config;
  void managed;
  const pool = new Pool(pgConfig);
  pool.on('error', safeBackgroundErrorSink(onBackgroundError));

  const runtime = createManagedClientRuntime<PoolClient>({
    maxActive: config.max,
    maxQueued: managedConfig.queueLimit,
    acquireTimeoutMs: managedConfig.acquireTimeoutMs,
    connect: () => pool.connect(),
    end: () => pool.end(),
  });

  return {
    db: drizzle(pool),
    withClient: runtime.withClient.bind(runtime),
    transaction<T>(
      policy: TransactionPolicy,
      run: (tx: Transaction) => Promise<T>,
    ): Promise<T> {
      return executeManagedTransaction(
        {
          withClient: runtime.withClient.bind(runtime),
          onBackgroundError,
        },
        policy,
        run,
      );
    },
    async checkConnection(): Promise<void> {
      const probeTimeoutMs = Math.min(
        config.connectionTimeoutMillis,
        managedConfig.acquireTimeoutMs,
      );

      let discardLease: (() => void) | undefined;
      let acquired = false;

      const work = runtime.withClient(
        { timeoutMs: probeTimeoutMs },
        async (client, _remainingMs, discard) => {
          acquired = true;
          discardLease = discard;
          await client.query('SELECT 1');
        },
      );

      let probeTimer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;

      await new Promise<void>((resolve, reject) => {
        probeTimer = setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          if (acquired && discardLease) {
            discardLease();
          }
          reject(new DatabaseAdmissionError('timeout'));
          void work.catch(() => {
            // Bounded probe response; permit held until query settles.
          });
        }, probeTimeoutMs);

        void work.then(
          () => {
            if (probeTimer !== undefined) {
              clearTimeout(probeTimer);
            }
            if (settled) {
              return;
            }
            settled = true;
            resolve();
          },
          (error) => {
            if (probeTimer !== undefined) {
              clearTimeout(probeTimer);
            }
            if (settled) {
              return;
            }
            settled = true;
            reject(error);
          },
        );
      });
    },
    close(): Promise<void> {
      return runtime.close();
    },
  };
}

export type Database = ReturnType<typeof createDatabase>;
