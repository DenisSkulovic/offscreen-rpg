export type DatabaseWorkload =
  | 'interactive'
  | 'worker'
  | 'admin'
  | 'migration';

export type TransactionIsolation =
  | 'read committed'
  | 'repeatable read'
  | 'serializable';

export type TransactionRetry = 'none' | 'sql-only-conflicts';

export type DatabaseErrorCategory =
  | 'saturated'
  | 'unavailable'
  | 'timeout'
  | 'cancelled'
  | 'serialization'
  | 'deadlock'
  | 'constraint'
  | 'lock-timeout'
  | 'commit-unknown'
  | 'closed'
  | 'application'
  | 'invalid-config';

export type TransactionPolicy = Readonly<{
  name: string;
  workload: DatabaseWorkload;
  isolation: TransactionIsolation;
  readOnly: boolean;
  retry: TransactionRetry;
  timeoutMs: number;
  statementTimeoutMs: number;
  lockTimeoutMs: number;
}>;