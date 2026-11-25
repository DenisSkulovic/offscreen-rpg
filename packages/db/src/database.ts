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
import {
  createDatabaseTelemetry,
  setPendingAdmissionInstrumentation,
} from './telemetry/runtime';
import type { DatabaseTelemetry } from './telemetry/types';
const DEFAULT_MANAGED = {
  queueLimit: 20,
  acquireTimeoutMs: 5000,
} as const;

export function createDatabase(
  config: DatabaseConfig,
  onBackgroundError: (error: Error) => void,
  observer?: DatabaseTelemetry,
) {
  const managedConfig = config.managed ?? DEFAULT_MANAGED;
  const { managed, ...pgConfig } = config;
  void managed;
  const pool = new Pool(pgConfig);
  const telemetry = createDatabaseTelemetry(observer);
  telemetry.setPoolGauges(() => ({
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }));

  pool.on(
    'error',
    safeBackgroundErrorSink((error: Error) => {
      telemetry.emit({
        operation: 'connection',
        outcome: 'error',
        workload: 'interactive',
        category: 'unavailable',
      });
      onBackgroundError(error);
    }),
  );

  setPendingAdmissionInstrumentation({
    emit: (event) => telemetry.emit(event),
    registerAdmissionGauges: (reader) =>
      telemetry.registerAdmissionGauges(reader),
  });

  const runtime = createManagedClientRuntime<PoolClient>({
    maxActive: config.max,
    maxQueued: managedConfig.queueLimit,
    acquireTimeoutMs: managedConfig.acquireTimeoutMs,
    connect: () => pool.connect(),
    end: () => pool.end(),
  });

  const managedWithClient = runtime.withClient.bind(runtime);
  const withClient: typeof managedWithClient = (options, run) =>
    managedWithClient(
      {
        ...options,
        workload: options.workload ?? 'interactive',
        operationName: options.operationName ?? 'database.managed',
      },
      run,
    );

  return {
    db: drizzle(pool),
    withClient,
    transaction<T>(
      policy: TransactionPolicy,
      run: (tx: Transaction) => Promise<T>,
    ): Promise<T> {
      return executeManagedTransaction(
        {
          withClient,
          onBackgroundError,
          telemetry,
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
      const probeStartedAt = performance.now();

      const work = withClient(
        {
          timeoutMs: probeTimeoutMs,
          operationName: 'database.probe',
          workload: 'interactive',
        },
        async (client, _remainingMs, discard) => {
          acquired = true;
          discardLease = discard;
          await client.query('SELECT 1');
        },
      );

      let probeTimer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;

      try {
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
        telemetry.emit({
          operation: 'connection',
          outcome: 'ok',
          workload: 'interactive',
          operationName: 'database.probe',
          durationMs: Math.max(
            0,
            Math.floor(performance.now() - probeStartedAt),
          ),
        });
      } catch (error) {
        const category =
          error instanceof DatabaseAdmissionError
            ? error.category
            : 'unavailable';
        telemetry.emit({
          operation: 'connection',
          outcome: 'error',
          workload: 'interactive',
          operationName: 'database.probe',
          category,
          durationMs: Math.max(
            0,
            Math.floor(performance.now() - probeStartedAt),
          ),
        });
        throw error;
      }
    },
    telemetrySnapshot() {
      return telemetry.snapshot();
    },
    close(): Promise<void> {
      return runtime.close();
    },
  };
}

export type Database = ReturnType<typeof createDatabase>;
