import { databaseTransactionError } from './errors.js';
import type {
  DatabaseWorkload,
  TransactionIsolation,
  TransactionPolicy,
  TransactionRetry,
} from './policy.js';

export const MIN_BUDGET_MS = 1;
const MAX_BUDGET_MS = 300_000;
const TRANSACTION_NAME_PATTERN = /^[a-z][a-z0-9.-]{0,63}$/;

const WORKLOADS = new Set<DatabaseWorkload>([
  'interactive',
  'worker',
  'admin',
  'migration',
]);

const ISOLATIONS = new Set<TransactionIsolation>([
  'read committed',
  'repeatable read',
  'serializable',
]);

const RETRIES = new Set<TransactionRetry>(['none', 'sql-only-conflicts']);

function isPositiveBudgetMs(value: number): boolean {
  return (
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= MIN_BUDGET_MS &&
    value <= MAX_BUDGET_MS
  );
}

export function validateTransactionPolicy(policy: TransactionPolicy): void {
  if (!TRANSACTION_NAME_PATTERN.test(policy.name)) {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'Transaction name must match /^[a-z][a-z0-9.-]{0,63}$/.',
    );
  }
  if (!WORKLOADS.has(policy.workload)) {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'Invalid workload.',
    );
  }
  if (!ISOLATIONS.has(policy.isolation)) {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'Invalid isolation.',
    );
  }
  if (!RETRIES.has(policy.retry)) {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'Invalid retry policy.',
    );
  }
  if (typeof policy.readOnly !== 'boolean') {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'readOnly must be boolean.',
    );
  }

  if (
    !isPositiveBudgetMs(policy.timeoutMs) ||
    !isPositiveBudgetMs(policy.statementTimeoutMs) ||
    !isPositiveBudgetMs(policy.lockTimeoutMs)
  ) {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'Timeout budgets must be positive integers not exceeding 300000.',
    );
  }

  if (
    policy.lockTimeoutMs > policy.statementTimeoutMs ||
    policy.statementTimeoutMs > policy.timeoutMs
  ) {
    throw databaseTransactionError(
      'invalid-config',
      policy,
      'lockTimeoutMs <= statementTimeoutMs <= timeoutMs is required.',
    );
  }
}
