import type {
  DatabaseErrorCategory,
  DatabaseWorkload,
  TransactionIsolation,
  TransactionPolicy,
  TransactionRetry,
} from '../src/transaction/policy';
import type { DatabaseTelemetryEvent } from '../src/telemetry/types';

function assertInvalidPolicyVocabulary(): void {
  const policy: TransactionPolicy = {
    name: 'proof.policy',
    workload: 'interactive',
    isolation: 'read committed',
    readOnly: false,
    retry: 'none',
    timeoutMs: 10_000,
    statementTimeoutMs: 10_000,
    lockTimeoutMs: 2_000,
  };
  void policy;

  // @ts-expect-error invalid workload
  const badWorkload: DatabaseWorkload = 'batch';

  // @ts-expect-error invalid isolation
  const badIsolation: TransactionIsolation = 'read uncommitted';

  // @ts-expect-error invalid retry
  const badRetry: TransactionRetry = 'always';
}

function assertInvalidTelemetryVocabulary(): void {
  const event: DatabaseTelemetryEvent = {
    operation: 'transaction',
    outcome: 'ok',
    workload: 'worker',
    durationMs: 12,
    count: 1,
  };
  void event;

  // @ts-expect-error invalid telemetry operation
  const badOperation: DatabaseTelemetryEvent['operation'] = 'query';

  // @ts-expect-error invalid error category
  const badCategory: DatabaseErrorCategory = 'network';
}

void assertInvalidPolicyVocabulary;
void assertInvalidTelemetryVocabulary;