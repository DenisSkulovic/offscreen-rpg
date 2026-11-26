import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKER_LOSS_SUCCESS_TEXT,
  buildPublishPodArgv,
  buildWorkerPodArgv,
  canCreatePublisherAfterQueueRecorded,
  countPublisherCreates,
  createScriptedRunner,
  evaluateWorkerLossPass,
  identitiesCompatible,
  initialReceipt,
  parseProofCli,
  persistReceiptAtomic,
  publishArgvDeclaresQueue,
  proofPodName,
  refuseProofInvocation,
  refuseSubsequentWrites,
  remainingWorkBudgetMs,
  runProofSupervisor,
  runnerCallLog,
  shouldCreatePublisher,
  shouldLaunchRepeatEnsure,
  stopAfterUnknownConfirm,
  validateQueueName,
} from './proof-host.mjs';
import { main } from './proof.mjs';

const BASELINE = {
  baselineUid: 'base-1',
  namespaceUid: 'ns-1',
  crUid: 'cr-1',
  serviceUid: 'svc-1',
  secretUid: 'sec-1',
  pvcUid: 'pvc-1',
  pvUid: 'pv-1',
  vhost: '/',
  brokerPodUid: 'broker-1',
  brokerRestartCount: '0',
};

const QUEUE = 'amq.gen-proof-1';
const RUN_ID = 'proof-run-01';

/**
 * @param {{ failQueueReceipt?: boolean, lostDeclare?: boolean, holdLogs?: string, skipEnsure?: boolean, timeRef?: { now: number } }} [opts]
 */
function createHappyRunner(opts = {}) {
  const declared = `DECLARED ${JSON.stringify({ record: 'DECLARED', runId: RUN_ID, queue: QUEUE })}`;
  const published = `PUBLISHED ${JSON.stringify({ record: 'PUBLISHED', runId: RUN_ID, queue: QUEUE })}`;
  return createScriptedRunner([
    {
      match: (op) => op.op === 'capture-identities',
      result: { ok: true, identities: { ...BASELINE } },
    },
    {
      match: (op) => op.op === 'configmap-create',
      result: { ok: true, uid: 'cm-uid' },
    },
    {
      match: (op) => op.op === 'pod-create' && op.role === 'declare',
      result: opts.lostDeclare
        ? { ok: true, lostResponse: true }
        : { ok: true, uid: 'declare-uid' },
    },
    {
      match: (op) =>
        op.op === 'pod-wait' && String(op.name).endsWith('-declare'),
      result: { ok: true },
    },
    {
      match: (op) =>
        op.op === 'pod-logs' && String(op.name).endsWith('-declare'),
      result: { ok: true, stdout: `${declared}\n` },
    },
    {
      match: (op) => op.op === 'pod-create' && op.role === 'publish',
      result: { ok: true, uid: 'publish-uid' },
    },
    {
      match: (op) =>
        op.op === 'pod-wait' && String(op.name).endsWith('-publish'),
      result: { ok: true },
    },
    {
      match: (op) =>
        op.op === 'pod-logs' && String(op.name).endsWith('-publish'),
      result: () => {
        if (opts.timeRef) {
          opts.timeRef.now = 1_000_000;
        }
        return { ok: true, stdout: `${published}\n` };
      },
    },
    {
      match: (op) => op.op === 'ensure-repeat',
      result: opts.skipEnsure
        ? { ok: false }
        : { ok: true, stdout: 'mutation-none' },
    },
    {
      match: (op) => op.op === 'broker-pod-uid',
      result: (op, state) => ({
        ok: true,
        brokerPodUid: state.brokerUid ?? 'broker-1',
      }),
    },
    {
      match: (op) => op.op === 'broker-state',
      result: { ok: true, brokerPodUid: 'broker-1', brokerRestartCount: 0 },
    },
    {
      match: (op) => op.op === 'pod-delete' && op.name === 'rabbitmq-server-0',
      result: (op, state) => {
        state.brokerUid = 'broker-2';
        return { ok: true };
      },
    },
    { match: (op) => op.op === 'pod-wait-ready', result: { ok: true } },
    {
      match: (op) => op.op === 'pod-create' && op.role === 'durable-get',
      result: { ok: true, uid: 'get-uid' },
    },
    {
      match: (op) =>
        op.op === 'pod-logs' && String(op.name).endsWith('-durable-get'),
      result: { ok: true, stdout: 'DURABLE-DRAIN redelivered=0\n' },
    },
    {
      match: (op) => op.op === 'pod-create' && op.role === 'hold',
      result: { ok: true, uid: 'hold-uid' },
    },
    {
      match: (op) => op.op === 'pod-logs' && String(op.name).endsWith('-hold'),
      result: {
        ok: true,
        stdout:
          opts.holdLogs ??
          `APPLY ${RUN_ID} redelivered=0\nHOLD_LIVE seq=1\nHOLD_LIVE seq=2\n`,
      },
    },
    {
      match: (op) => op.op === 'pod-create' && op.role === 'replacement',
      result: { ok: true, uid: 'replacement-uid' },
    },
    {
      match: (op) =>
        op.op === 'pod-logs' && String(op.name).endsWith('-replacement'),
      result: {
        ok: true,
        stdout: `APPLY ${RUN_ID} redelivered=1\nREPLACEMENT-EMPTY\n`,
      },
    },
    {
      match: (op) => op.op === 'assert-exactly-once',
      result: { ok: true, exitCode: 1, stdout: 'ASSERTION-FAILED' },
    },
    { match: (op) => op.op === 'queue-delete', result: { ok: true } },
    { match: (op) => op.op === 'configmap-delete', result: { ok: true } },
    { match: (op) => op.op === 'pod-absent', result: { ok: true } },
    { match: (op) => op.op === 'pod-delete', result: { ok: true } },
    { match: (op) => op.op === 'pod-wait', result: { ok: true } },
  ]);
}

function createMemoryIo({ failReadbackOn = 0 } = {}) {
  /** @type {Map<string, string>} */
  const store = new Map();
  let readbackCount = 0;
  return {
    writeTemp(path, data) {
      store.set(path, data);
    },
    fsyncFile() {},
    rename(from, to) {
      store.set(to, store.get(from) ?? '');
      store.delete(from);
    },
    fsyncDir() {},
    readBack(path) {
      readbackCount += 1;
      if (failReadbackOn > 0 && readbackCount === failReadbackOn) {
        return '{"phase":"broken"}\n';
      }
      return store.get(path) ?? '';
    },
    ensureDir() {},
  };
}

const AUTH_ENV = {
  OFFSCREEN_RABBITMQ_PROOF: 'authorized',
  OFFSCREEN_RABBITMQ_DISRUPTION: 'authorized',
};

test('parseProofCli accepts canonical invocation', () => {
  const parsed = parseProofCli([
    'node',
    'proof.mjs',
    'smoke',
    'dev',
    'kind-offscreen-dev',
  ]);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.mode, 'smoke');
});

test('declare publish argv cannot include declare token', () => {
  const argv = buildPublishPodArgv('amq.gen-1', 'run-a');
  assert.equal(publishArgvDeclaresQueue({ publishArgv: argv }), false);
  assert.deepEqual(JSON.parse(argv[3]), ['amq.gen-1', 'run-a']);
});

test('receipt fsync or readback failure creates no publisher', () => {
  const receipt = { phase: 'QUEUE_RECORDED', queue: 'amq.gen-1' };
  assert.equal(
    shouldCreatePublisher(receipt, { fsyncOk: false, readbackOk: true }),
    false,
  );
  assert.equal(
    shouldCreatePublisher(receipt, { fsyncOk: true, readbackOk: false }),
    false,
  );
});

test('host crash before receipt means no publisher exists', () => {
  const receipt = { phase: 'INIT', queue: null };
  assert.equal(canCreatePublisherAfterQueueRecorded(receipt), false);
  assert.equal(shouldCreatePublisher(receipt), false);
});

test('unknown confirm stops with queue retained', () => {
  const stop = stopAfterUnknownConfirm({
    confirmKnown: false,
    publishRecorded: false,
  });
  assert.equal(stop.stop, true);
  assert.equal(stop.retainQueue, true);
});

test('wrong baseline identity blocks subsequent writes', () => {
  const baseline = { namespaceUid: 'uid-a', vhost: '/' };
  const observed = { namespaceUid: 'uid-b', vhost: '/' };
  const refusal = refuseSubsequentWrites({
    baseline,
    observed,
    attemptedWrite: true,
  });
  assert.equal(refusal.refused, true);
});

test('hold failure before delete is not PASS', () => {
  const outcome = evaluateWorkerLossPass({
    holdFailed: true,
    applySeen: true,
    replacementOk: true,
  });
  assert.equal(outcome.ok, false);
});

test('insufficient repeat-ensure budget does not launch ensure', () => {
  assert.equal(shouldLaunchRepeatEnsure(899_000), false);
  const remaining = remainingWorkBudgetMs(1_000_000, 'durability');
  assert.equal(shouldLaunchRepeatEnsure(remaining), false);
});

test('worker-loss success uses narrowed attribution wording', () => {
  const outcome = evaluateWorkerLossPass({
    holdFailed: false,
    applySeen: true,
    replacementOk: true,
  });
  assert.equal(outcome.wording, WORKER_LOSS_SUCCESS_TEXT);
});

test('refusal without proof authorization is observed', async () => {
  const code = await main(
    ['node', 'proof.mjs', 'smoke', 'dev', 'kind-offscreen-dev'],
    {},
  );
  assert.equal(code, 1);
});

test('persistReceiptAtomic rejects readback mismatch', () => {
  const receipt = { phase: 'QUEUE_RECORDED', queue: 'amq.gen-9' };
  const result = persistReceiptAtomic({
    receiptDir: '/tmp',
    receiptPath: '/tmp/receipt.json',
    payload: receipt,
    io: {
      writeTemp() {},
      fsyncFile() {},
      rename() {},
      fsyncDir() {},
      readBack() {
        return '{"phase":"INIT"}\n';
      },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'receipt-readback');
});

test('validateQueueName rejects control characters', () => {
  const validated = validateQueueName('ab\x01');
  assert.equal(validated.ok, false);
});

test('buildWorkerPodArgv uses exact JSON queue argument', () => {
  const argv = buildWorkerPodArgv('amq.gen-worker', 'nonce-1', 'hold');
  assert.deepEqual(JSON.parse(argv[3]), ['amq.gen-worker', 'nonce-1']);
});

test('release profile refusal before writes', () => {
  const refusal = refuseProofInvocation({
    mode: 'smoke',
    profile: 'release',
    env: { OFFSCREEN_RABBITMQ_PROOF: 'authorized' },
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reason, 'release-proof-refused');
});

test('identitiesCompatible accepts matching baseline', () => {
  assert.equal(
    identitiesCompatible(
      { namespaceUid: 'a', vhost: '/' },
      { namespaceUid: 'a', vhost: '/' },
    ),
    true,
  );
});

test('supervisor completes durability without partial phase', async () => {
  const runner = createHappyRunner();
  const result = await runProofSupervisor({
    mode: 'durability',
    profile: 'dev',
    context: 'kind-offscreen-dev',
    env: AUTH_ENV,
    runner,
    io: createMemoryIo(),
    receiptDir: '/tmp/rabbitmq-proof-dur',
    receiptPath: '/tmp/rabbitmq-proof-dur/receipt.json',
    receipt: initialReceipt({
      mode: 'durability',
      profile: 'dev',
      context: 'kind-offscreen-dev',
      runId: RUN_ID,
    }),
    baseline: BASELINE,
    clock: { now: () => 0 },
    runLive: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.phase, 'durability-complete');
  assert.equal(
    runnerCallLog(runner).some((op) => op.op === 'ensure-repeat'),
    true,
  );
});

test('supervisor stops repeat ensure when work budget is insufficient', async () => {
  const timeRef = { now: 0 };
  const budgetRunner = createHappyRunner({ timeRef });
  const budgetResult = await runProofSupervisor({
    mode: 'durability',
    profile: 'dev',
    context: 'kind-offscreen-dev',
    env: AUTH_ENV,
    runner: budgetRunner,
    io: createMemoryIo(),
    receiptDir: '/tmp/rabbitmq-proof-budget2',
    receiptPath: '/tmp/rabbitmq-proof-budget2/receipt.json',
    receipt: initialReceipt({
      mode: 'durability',
      profile: 'dev',
      context: 'kind-offscreen-dev',
      runId: 'late-run',
    }),
    baseline: BASELINE,
    clock: { now: () => timeRef.now },
    runLive: true,
  });
  assert.equal(budgetResult.ok, false);
  assert.equal(budgetResult.reason, 'repeat-ensure-budget');
  assert.equal(
    runnerCallLog(budgetRunner).some((op) => op.op === 'ensure-repeat'),
    false,
  );
});

test('supervisor completes worker-loss with C06-B wording', async () => {
  const runner = createHappyRunner();
  const result = await runProofSupervisor({
    mode: 'worker-loss',
    profile: 'dev',
    context: 'kind-offscreen-dev',
    env: AUTH_ENV,
    runner,
    io: createMemoryIo(),
    receiptDir: '/tmp/rabbitmq-proof-wl',
    receiptPath: '/tmp/rabbitmq-proof-wl/receipt.json',
    receipt: initialReceipt({
      mode: 'worker-loss',
      profile: 'dev',
      context: 'kind-offscreen-dev',
      runId: RUN_ID,
    }),
    baseline: BASELINE,
    clock: { now: () => 0 },
    runLive: true,
    holdObservation: {
      holdLogs: `APPLY ${RUN_ID} redelivered=0\nHOLD_LIVE seq=1\nHOLD_LIVE seq=2\n`,
      status: { phase: 'Running', restartCount: 0, deletionTimestamp: null },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.phase, 'worker-loss-complete');
  assert.equal(result.wording, WORKER_LOSS_SUCCESS_TEXT);
  assert.equal(
    runnerCallLog(runner).some(
      (op) =>
        op.op === 'pod-delete' && op.name === proofPodName(RUN_ID, 'hold'),
    ),
    true,
  );
});

test('supervisor fails worker-loss when HOLD_FAILED observed before delete', async () => {
  const runner = createHappyRunner({
    holdLogs: `APPLY ${RUN_ID} redelivered=0\nHOLD_FAILED reason=eof\n`,
  });
  const result = await runProofSupervisor({
    mode: 'worker-loss',
    profile: 'dev',
    context: 'kind-offscreen-dev',
    env: AUTH_ENV,
    runner,
    io: createMemoryIo(),
    receiptDir: '/tmp/rabbitmq-proof-holdfail',
    receiptPath: '/tmp/rabbitmq-proof-holdfail/receipt.json',
    receipt: initialReceipt({
      mode: 'worker-loss',
      profile: 'dev',
      context: 'kind-offscreen-dev',
      runId: RUN_ID,
    }),
    baseline: BASELINE,
    clock: { now: () => 0 },
    runLive: true,
    holdObservation: {
      holdLogs: `APPLY ${RUN_ID} redelivered=0\nHOLD_FAILED reason=eof\n`,
      status: { phase: 'Running', restartCount: 0, deletionTimestamp: null },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'hold-failed-before-delete');
  assert.equal(
    runnerCallLog(runner).some(
      (op) => op.op === 'pod-create' && op.role === 'replacement',
    ),
    false,
  );
});

test('lost declare response retains name without uid delete', async () => {
  const runner = createHappyRunner({ lostDeclare: true });
  const name = proofPodName(RUN_ID, 'declare');
  const result = await runProofSupervisor({
    mode: 'durability',
    profile: 'dev',
    context: 'kind-offscreen-dev',
    env: AUTH_ENV,
    runner,
    io: createMemoryIo(),
    receiptDir: '/tmp/rabbitmq-proof-lost',
    receiptPath: '/tmp/rabbitmq-proof-lost/receipt.json',
    receipt: initialReceipt({
      mode: 'durability',
      profile: 'dev',
      context: 'kind-offscreen-dev',
      runId: RUN_ID,
    }),
    baseline: BASELINE,
    runLive: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.lostName, name);
  assert.equal(
    runnerCallLog(runner).some(
      (op) => op.op === 'pod-delete' && op.name === name,
    ),
    false,
  );
});

test('queue receipt fsync failure creates zero publisher pods', async () => {
  const runner = createHappyRunner();
  const result = await runProofSupervisor({
    mode: 'durability',
    profile: 'dev',
    context: 'kind-offscreen-dev',
    env: AUTH_ENV,
    runner,
    io: createMemoryIo({ failReadbackOn: 2 }),
    receiptDir: '/tmp/rabbitmq-proof-fsync',
    receiptPath: '/tmp/rabbitmq-proof-fsync/receipt.json',
    receipt: initialReceipt({
      mode: 'durability',
      profile: 'dev',
      context: 'kind-offscreen-dev',
      runId: RUN_ID,
    }),
    baseline: BASELINE,
    runLive: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.publisherCreates, 0);
  assert.equal(countPublisherCreates(runner), 0);
});
