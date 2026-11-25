import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import type { DatabaseConfig } from './config';
import {
  createManagedClientRuntime,
  safeBackgroundErrorSink,
} from './connection/managed-client';
import { checkDatabaseConnection } from './connection/probe';
import { executeManagedTransaction } from './transaction/execute';
import type { TransactionPolicy } from './transaction/policy';
import type { Transaction } from './transaction/types';
import { createDatabaseTelemetry } from './telemetry/runtime';
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

  const runtime = createManagedClientRuntime<PoolClient>({
    maxActive: config.max,
    maxQueued: managedConfig.queueLimit,
    acquireTimeoutMs: managedConfig.acquireTimeoutMs,
    connect: () => pool.connect(),
    end: () => pool.end(),
    instrumentation: {
      emit: (event) => telemetry.emit(event),
      registerAdmissionGauges: (reader) =>
        telemetry.registerAdmissionGauges(reader),
    },
  });

  const probeTimeoutMs = Math.min(
    config.connectionTimeoutMillis,
    managedConfig.acquireTimeoutMs,
  );

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
    checkConnection(): Promise<void> {
      return checkDatabaseConnection({
        withClient,
        probeTimeoutMs,
        telemetry,
      });
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
