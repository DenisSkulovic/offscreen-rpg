import { NodePgSession, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PoolClient, QueryResult } from 'pg';
import type { ManagedClientRuntime } from '../connection/managed-client.js';
import type { DatabaseTelemetry } from '../telemetry/types.js';
import type { Transaction } from './types.js';
import {
  type DatabaseWorkload,
  type TransactionIsolation,
  type TransactionPolicy,
  type TransactionRetry,
} from './policy.js';
import {
  classifyDatabaseError,
  databaseTransactionError,
  decideTransactionRetry,
  MAX_TRANSACTION_ATTEMPTS,
  type JitterFn,
} from './errors.js';

const MIN_BUDGET_MS = 1;
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

const ISOLATION_SQL: Record<TransactionIsolation, string> = {
  'read committed': 'READ COMMITTED',
  'repeatable read': 'REPEATABLE READ',
  serializable: 'SERIALIZABLE',
};

type FullSchema = Record<string, never>;
type Schema = ExtractTablesWithRelations<FullSchema>;

const noopTelemetry: DatabaseTelemetry = () => {};

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

function buildBeginSql(policy: TransactionPolicy): string {
  const isolation = ISOLATION_SQL[policy.isolation];
  const readOnly = policy.readOnly ? ' READ ONLY' : '';
  return `BEGIN ISOLATION LEVEL ${isolation}${readOnly}`;
}

async function applyLocalTimeouts(
  client: PoolClient,
  policy: TransactionPolicy,
): Promise<void> {
  await client.query(
    `SELECT set_config('statement_timeout', $1, true),
            set_config('lock_timeout', $2, true),
            set_config('idle_in_transaction_session_timeout', $3, true)`,
    [
      String(policy.statementTimeoutMs),
      String(policy.lockTimeoutMs),
      String(policy.timeoutMs),
    ],
  );
}

function createDrizzleTransaction(client: PoolClient): Transaction {
  const dialect = new PgDialect();
  const session = new NodePgSession<FullSchema, Schema>(
    client,
    dialect,
    undefined,
    {},
  );
  return new NodePgTransaction<FullSchema, Schema>(dialect, session, undefined);
}

async function commitClient(
  client: PoolClient,
  discard: () => void,
): Promise<void> {
  let result: QueryResult;
  try {
    result = await client.query('COMMIT');
  } catch (error) {
    discard();
    throw databaseTransactionError('commit-unknown', error);
  }

  if (result.command !== 'COMMIT') {
    throw databaseTransactionError(
      'application',
      result,
      'COMMIT did not acknowledge with a COMMIT command tag.',
    );
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type AttemptState = {
  confirmedRollback: boolean;
};

async function runOneAttempt<T>(
  client: PoolClient,
  policy: TransactionPolicy,
  floorRemainingMs: () => number,
  discard: () => void,
  run: (tx: Transaction) => Promise<T>,
  attemptState: AttemptState,
): Promise<T> {
  const requireBudget = (phase: string): void => {
    if (floorRemainingMs() < MIN_BUDGET_MS) {
      throw databaseTransactionError(
        'timeout',
        undefined,
        `Transaction deadline exceeded before ${phase}.`,
      );
    }
  };

  let inTransaction = false;

  try {
    requireBudget('BEGIN');
    await client.query(buildBeginSql(policy));
    await applyLocalTimeouts(client, policy);
    inTransaction = true;

    const tx = createDrizzleTransaction(client);
    requireBudget('callback');
    const callbackResult = await run(tx);

    requireBudget('COMMIT');
    await commitClient(client, discard);
    inTransaction = false;
    return callbackResult;
  } catch (error) {
    if (inTransaction) {
      const classified = classifyDatabaseError(error);
      if (classified.category !== 'commit-unknown') {
        try {
          await client.query('ROLLBACK');
          attemptState.confirmedRollback = true;
        } catch {
          discard();
        }
      }
    }
    throw error;
  }
}

export interface ExecuteManagedTransactionOptions {
  withClient: ManagedClientRuntime<PoolClient>['withClient'];
  onBackgroundError: (error: Error) => void;
  telemetry?: DatabaseTelemetry;
}

export async function executeManagedTransaction<T>(
  options: ExecuteManagedTransactionOptions,
  policy: TransactionPolicy,
  run: (tx: Transaction) => Promise<T>,
  jitter?: JitterFn,
): Promise<T> {
  validateTransactionPolicy(policy);
  const telemetry = options.telemetry ?? noopTelemetry;

  const startedAt = performance.now();
  const absoluteDeadline = startedAt + policy.timeoutMs;
  const budgetRemainingMs = () =>
    Math.max(0, Math.floor(absoluteDeadline - performance.now()));

  let attemptIndex = 0;

  while (attemptIndex < MAX_TRANSACTION_ATTEMPTS) {
    const remainingForAcquire = budgetRemainingMs();
    if (remainingForAcquire < MIN_BUDGET_MS) {
      throw databaseTransactionError(
        'timeout',
        undefined,
        'Transaction deadline exceeded before acquire.',
      );
    }

    const attemptState: AttemptState = { confirmedRollback: false };

    try {
      const result = await options.withClient(
        { timeoutMs: remainingForAcquire },
        async (client, admissionRemainingMs, discard) => {
          const floorRemainingMs = () => {
            const left = Math.min(budgetRemainingMs(), admissionRemainingMs());
            return Math.max(0, Math.floor(left));
          };

          return runOneAttempt(
            client,
            policy,
            floorRemainingMs,
            discard,
            run,
            attemptState,
          );
        },
      );

      telemetry({
        operation: 'transaction',
        outcome: 'ok',
        workload: policy.workload,
      });
      return result;
    } catch (error) {
      const classified = classifyDatabaseError(error);

      const decision = decideTransactionRetry(
        error,
        policy.retry,
        attemptState.confirmedRollback,
        attemptIndex,
        budgetRemainingMs(),
        jitter,
      );

      if (decision.action === 'retry') {
        telemetry({
          operation: 'retry',
          outcome: 'ok',
          workload: policy.workload,
          count: attemptIndex + 1,
        });
        await sleepMs(decision.afterMs);
        if (budgetRemainingMs() < MIN_BUDGET_MS) {
          throw databaseTransactionError(
            'timeout',
            error,
            'Transaction deadline exceeded during retry backoff.',
          );
        }
        attemptIndex += 1;
        continue;
      }

      telemetry({
        operation: 'transaction',
        outcome: 'error',
        workload: policy.workload,
        category: decision.error?.category ?? classified.category,
      });

      throw decision.action === 'propagate' ? decision.error : classified;
    }
  }

  throw databaseTransactionError(
    'application',
    undefined,
    'Transaction retry limit exceeded.',
  );
}
