import type {
  DatabaseErrorCategory,
  DatabaseWorkload,
} from '../transaction/policy';

export type DatabaseTelemetryOperation =
  | 'acquire'
  | 'transaction'
  | 'retry'
  | 'rollback'
  | 'connection';

export type DatabaseTelemetryOutcome = 'ok' | 'error';

export type DatabaseTelemetryEvent = Readonly<{
  operation: DatabaseTelemetryOperation;
  outcome: DatabaseTelemetryOutcome;
  workload: DatabaseWorkload;
  category?: DatabaseErrorCategory;
  durationMs?: number;
  count?: number;
}>;

export type DatabaseTelemetry = (event: DatabaseTelemetryEvent) => void;