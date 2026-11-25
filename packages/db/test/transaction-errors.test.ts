import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseAdmissionError } from '../src/connection/admission.js';
import {
  classifyDatabaseError,
  databaseTransactionError,
  decideTransactionRetry,
  MAX_CAUSE_LINKS,
  MAX_RETRY_JITTER_MS,
  MIN_RETRY_JITTER_MS,
  type JitterFn,
} from '../src/transaction/errors.js';

function pgError(code: string, message = 'postgres failure'): Error {
  const error = new Error(message);
  Object.assign(error, { code });
  return error;
}

function wrapCause(outer: string, cause: unknown): Error {
  const error = new Error(outer);
  Object.assign(error, { cause });
  return error;
}

const fixedJitter: JitterFn = (minMs, maxMs) => {
  assert.ok(minMs >= MIN_RETRY_JITTER_MS);
  assert.ok(maxMs <= MAX_RETRY_JITTER_MS);
  assert.ok(minMs <= maxMs);
  return minMs;
};

test('classify walks wrapped errors and preserves internal cause', () => {
  const driver = pgError('40001', 'serialization failure');
  const wrapped = wrapCause('query failed', driver);
  const classified = classifyDatabaseError(wrapped);

  assert.equal(classified.category, 'serialization');
  assert.equal(classified.cause, wrapped);
});

test('classify recognizes admission errors in the cause chain', () => {
  const admission = new DatabaseAdmissionError('saturated');
  const wrapped = wrapCause('acquire failed', admission);
  const classified = classifyDatabaseError(wrapped);

  assert.equal(classified.category, 'saturated');
  assert.equal(classified.cause, wrapped);
});

test('classify stops at max cause depth with cycle guard', () => {
  const inner = pgError('40001');
  const a = wrapCause('a', inner);
  const b = wrapCause('b', a);
  const c = wrapCause('c', b);
  const d = wrapCause('d', c);
  const e = wrapCause('e', d);
  const classified = classifyDatabaseError(e);
  assert.equal(classified.category, 'application');

  const cyclicA: Error & { cause?: unknown } = new Error('cycle-a');
  const cyclicB: Error & { cause?: unknown } = new Error('cycle-b');
  cyclicA.cause = cyclicB;
  cyclicB.cause = cyclicA;
  const cyclic = wrapCause('outer', cyclicA);
  const cyclicClassified = classifyDatabaseError(cyclic);
  assert.equal(cyclicClassified.category, 'application');
  assert.equal(MAX_CAUSE_LINKS, 4);
});

test('serialization conflict retries with sql-only-conflicts after confirmed rollback', () => {
  const conflict = pgError('40001');
  const decision = decideTransactionRetry(
    conflict,
    'sql-only-conflicts',
    true,
    0,
    500,
    fixedJitter,
  );

  assert.deepEqual(decision, { action: 'retry', afterMs: MIN_RETRY_JITTER_MS });
});

test('deadlock retries and attempt budget stops after three tries', () => {
  const deadlock = pgError('40P01');
  const second = decideTransactionRetry(
    deadlock,
    'sql-only-conflicts',
    true,
    1,
    500,
    fixedJitter,
  );
  assert.equal(second.action, 'retry');

  const third = decideTransactionRetry(
    deadlock,
    'sql-only-conflicts',
    true,
    2,
    500,
    fixedJitter,
  );
  assert.equal(third.action, 'propagate');
  if (third.action === 'propagate') {
    assert.equal(third.error.category, 'deadlock');
  }
});

test('budget below 25ms does not retry', () => {
  const conflict = pgError('40001');
  const decision = decideTransactionRetry(
    conflict,
    'sql-only-conflicts',
    true,
    0,
    24,
    fixedJitter,
  );
  assert.equal(decision.action, 'propagate');
});

test('classify maps timeout and lock-timeout SQLSTATEs', () => {
  assert.equal(classifyDatabaseError(pgError('57014')).category, 'timeout');
  assert.equal(
    classifyDatabaseError(pgError('55P03')).category,
    'lock-timeout',
  );
});

test('sql-only-conflicts without confirmed rollback does not retry', () => {
  const conflict = pgError('40001');
  const decision = decideTransactionRetry(
    conflict,
    'sql-only-conflicts',
    false,
    0,
    500,
    fixedJitter,
  );
  assert.equal(decision.action, 'propagate');
});

test('retry none never retries serialization conflicts', () => {
  const conflict = pgError('40001');
  const decision = decideTransactionRetry(
    conflict,
    'none',
    true,
    0,
    500,
    fixedJitter,
  );
  assert.equal(decision.action, 'propagate');
  if (decision.action === 'propagate') {
    assert.equal(decision.error.category, 'serialization');
  }
});

test('connection loss and constraint failures never retry', () => {
  const connection = pgError('08006');
  const connectionDecision = decideTransactionRetry(
    connection,
    'sql-only-conflicts',
    true,
    0,
    500,
    fixedJitter,
  );
  assert.equal(connectionDecision.action, 'propagate');
  if (connectionDecision.action === 'propagate') {
    assert.equal(connectionDecision.error.category, 'unavailable');
  }

  const constraint = pgError('23505');
  const constraintDecision = decideTransactionRetry(
    constraint,
    'sql-only-conflicts',
    true,
    0,
    500,
    fixedJitter,
  );
  assert.equal(constraintDecision.action, 'propagate');
  if (constraintDecision.action === 'propagate') {
    assert.equal(constraintDecision.error.category, 'constraint');
  }
});

test('commit-unknown never retries', () => {
  const commitUnknown = databaseTransactionError(
    'commit-unknown',
    new Error('transport loss after commit'),
  );
  const decision = decideTransactionRetry(
    commitUnknown,
    'sql-only-conflicts',
    true,
    0,
    500,
    fixedJitter,
  );
  assert.equal(decision.action, 'propagate');
  if (decision.action === 'propagate') {
    assert.equal(decision.error.category, 'commit-unknown');
  }
});

test('injected jitter respects remaining budget cap', () => {
  const conflict = pgError('40001');
  let observedMax = 0;
  const jitter: JitterFn = (minMs, maxMs) => {
    observedMax = maxMs;
    return maxMs;
  };
  const decision = decideTransactionRetry(
    conflict,
    'sql-only-conflicts',
    true,
    0,
    80,
    jitter,
  );
  assert.equal(decision.action, 'retry');
  assert.equal(observedMax, 80);
  if (decision.action === 'retry') {
    assert.equal(decision.afterMs, 80);
  }
});
