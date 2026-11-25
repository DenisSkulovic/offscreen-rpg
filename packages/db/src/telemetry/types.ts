import type {
  DatabaseErrorCategory,
  DatabaseWorkload,
  TransactionIsolation,
} from '../transaction/policy';

export type DatabaseTelemetryOperation =
  'acquire' | 'transaction' | 'retry' | 'rollback' | 'connection';

export type DatabaseTelemetryOutcome = 'ok' | 'error';

export type DatabaseRegisteredOperationName =
  'database.probe' | 'database.managed' | 'database.transaction';

export type DatabaseTelemetryEvent = Readonly<{
  operation: DatabaseTelemetryOperation;
  outcome: DatabaseTelemetryOutcome;
  workload: DatabaseWorkload;
  category?: DatabaseErrorCategory;
  durationMs?: number;
  queueDurationMs?: number;
  count?: number;
  isolation?: TransactionIsolation;
  operationName?: DatabaseRegisteredOperationName;
}>;

export type DatabaseTelemetry = (event: DatabaseTelemetryEvent) => void;

export type DatabaseTelemetryGauges = Readonly<{
  admissionActive: number;
  admissionQueued: number;
  poolIdle: number;
  poolWaiting: number;
}>;

export type DatabaseTelemetryCounters = Readonly<Record<string, number>>;

export type DatabaseTelemetrySnapshot = Readonly<{
  elapsedMs: number;
  counters: DatabaseTelemetryCounters;
  gauges: DatabaseTelemetryGauges;
}>;

const REGISTERED_OPERATION_NAMES = new Set<DatabaseRegisteredOperationName>([
  'database.probe',
  'database.managed',
  'database.transaction',
]);

export function resolveRegisteredOperationName(
  policyName: string,
): DatabaseRegisteredOperationName {
  if (
    REGISTERED_OPERATION_NAMES.has(
      policyName as DatabaseRegisteredOperationName,
    )
  ) {
    return policyName as DatabaseRegisteredOperationName;
  }
  return 'database.transaction';
}
