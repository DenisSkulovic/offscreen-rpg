import { NodePgSession, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PoolClient, QueryResult } from 'pg';
import type { DatabaseTelemetryHandle } from '../telemetry/runtime.js';
import { resolveRegisteredOperationName } from '../telemetry/types.js';
import type { Transaction } from './types.js';
import { type TransactionIsolation, type TransactionPolicy } from './policy.js';
import {
  classifyCommitRejection,
  classifyDatabaseError,
  databaseTransactionError,
} from './errors.js';
import { MIN_BUDGET_MS } from './validate-policy.js';

const ISOLATION_SQL: Record<TransactionIsolation, string> = {
  'read committed': 'READ COMMITTED',
  'repeatable read': 'REPEATABLE READ',
  serializable: 'SERIALIZABLE',
};

type FullSchema = Record<string, never>;
type Schema = ExtractTablesWithRelations<FullSchema>;

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
    const classified = classifyCommitRejection(error);
    if (classified.category === 'commit-unknown') {
      discard();
    }
    throw classified;
  }

  if (result.command === 'ROLLBACK') {
    throw databaseTransactionError(
      'application',
      result,
      'COMMIT acknowledged with a ROLLBACK command tag.',
    );
  }

  if (result.command !== 'COMMIT') {
    discard();
    throw databaseTransactionError(
      'commit-unknown',
      result,
      'COMMIT returned an unexpected command tag.',
    );
  }
}

export type AttemptState = {
  confirmedRollback: boolean;
};

export async function runOneAttempt<T>(
  client: PoolClient,
  policy: TransactionPolicy,
  floorRemainingMs: () => number,
  discard: () => void,
  run: (tx: Transaction) => Promise<T>,
  attemptState: AttemptState,
  telemetry: DatabaseTelemetryHandle | undefined,
): Promise<T> {
  const operationName = resolveRegisteredOperationName(policy.name);
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
    // Begin: open transaction and verify BEGIN tag.
    requireBudget('BEGIN');
    let beginResult: QueryResult;
    try {
      beginResult = await client.query(buildBeginSql(policy));
    } catch (beginError) {
      discard();
      throw beginError;
    }

    if (beginResult.command !== 'BEGIN') {
      discard();
      throw databaseTransactionError(
        'application',
        beginResult,
        'BEGIN did not acknowledge with a BEGIN command tag.',
      );
    }

    inTransaction = true;

    // Setup: apply session-local timeout knobs before user work.
    await applyLocalTimeouts(client, policy);

    const tx = createDrizzleTransaction(client);

    // Callback: run application logic inside the Drizzle transaction.
    requireBudget('callback');
    const callbackResult = await run(tx);

    // Commit: finalize or surface commit/unknown outcomes.
    requireBudget('COMMIT');
    await commitClient(client, discard);
    inTransaction = false;
    return callbackResult;
  } catch (error) {
    // Rollback: best-effort cleanup when still inside a transaction.
    if (inTransaction) {
      const classified = classifyDatabaseError(error);
      if (classified.category !== 'commit-unknown') {
        try {
          const rollbackResult = await client.query('ROLLBACK');
          if (rollbackResult.command !== 'ROLLBACK') {
            discard();
            telemetry?.emit({
              operation: 'rollback',
              outcome: 'error',
              workload: policy.workload,
              isolation: policy.isolation,
              operationName,
              category: 'application',
            });
          } else {
            attemptState.confirmedRollback = true;
            telemetry?.emit({
              operation: 'rollback',
              outcome: 'ok',
              workload: policy.workload,
              isolation: policy.isolation,
              operationName,
            });
          }
        } catch {
          discard();
          telemetry?.emit({
            operation: 'rollback',
            outcome: 'error',
            workload: policy.workload,
            isolation: policy.isolation,
            operationName,
            category: 'unavailable',
          });
        }
      }
    }
    throw error;
  }
}
