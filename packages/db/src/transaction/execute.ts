import type { PoolClient } from 'pg';
import type { ManagedClientRuntime } from '../connection/managed-client.js';
import type { DatabaseTelemetryHandle } from '../telemetry/runtime.js';
import { resolveRegisteredOperationName } from '../telemetry/types.js';
import type { Transaction } from './types.js';
import type { TransactionPolicy } from './policy.js';
import {
  classifyDatabaseError,
  databaseTransactionError,
  decideTransactionRetry,
  MAX_TRANSACTION_ATTEMPTS,
  type JitterFn,
} from './errors.js';
import { runOneAttempt, type AttemptState } from './attempt.js';
import { MIN_BUDGET_MS, validateTransactionPolicy } from './validate-policy.js';

export { validateTransactionPolicy } from './validate-policy.js';

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface ExecuteManagedTransactionOptions {
  withClient: ManagedClientRuntime<PoolClient>['withClient'];
  onBackgroundError: (error: Error) => void;
  telemetry?: DatabaseTelemetryHandle;
}

export async function executeManagedTransaction<T>(
  options: ExecuteManagedTransactionOptions,
  policy: TransactionPolicy,
  run: (tx: Transaction) => Promise<T>,
  jitter?: JitterFn,
): Promise<T> {
  validateTransactionPolicy(policy);
  const telemetry = options.telemetry;
  const operationName = resolveRegisteredOperationName(policy.name);

  const startedAt = performance.now();
  const absoluteDeadline = startedAt + policy.timeoutMs;
  const budgetRemainingMs = () =>
    Math.max(0, Math.floor(absoluteDeadline - performance.now()));

  let attemptIndex = 0;

  // Retry loop: acquire client, run one attempt, decide retry vs propagate.
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
        {
          timeoutMs: remainingForAcquire,
          workload: policy.workload,
          operationName,
        },
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
            telemetry,
          );
        },
      );

      telemetry?.emit({
        operation: 'transaction',
        outcome: 'ok',
        workload: policy.workload,
        isolation: policy.isolation,
        operationName,
        durationMs: Math.max(0, Math.floor(performance.now() - startedAt)),
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
        telemetry?.emit({
          operation: 'retry',
          outcome: 'ok',
          workload: policy.workload,
          isolation: policy.isolation,
          operationName,
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

      const finalCategory = decision.error?.category ?? classified.category;
      telemetry?.emit({
        operation: 'transaction',
        outcome: 'error',
        workload: policy.workload,
        isolation: policy.isolation,
        operationName,
        category: finalCategory,
        durationMs: Math.max(0, Math.floor(performance.now() - startedAt)),
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
