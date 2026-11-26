import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { join } from 'node:path';

export const PROOF_SCHEMA = 1;
export const PROOF_MODES = Object.freeze([
  'smoke',
  'durability',
  'worker-loss',
]);
export const CANONICAL_DEV_CONTEXT = 'kind-offscreen-dev';

export const MODE_BUDGET_MS = Object.freeze({
  smoke: 420_000,
  durability: 1_800_000,
  'worker-loss': 900_000,
});

export const CLEANUP_RESERVE_MS = 90_000;
export const REPEAT_ENSURE_MIN_REMAINING_MS = 900_000;
export const API_TIMEOUT_MS = 10_000;
export const WORKER_LOSS_SUCCESS_TEXT =
  'Observed unacknowledged redelivery after an owned worker-termination exercise, with no independently observed pre-delete hold failure.';

export const PYTHON_IMAGE =
  'docker.io/library/python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89';

/**
 * @param {string[]} argv
 */
export function parseProofCli(argv) {
  const args = argv.slice(2);
  if (args.length !== 3) {
    return { ok: false, reason: 'usage' };
  }
  const [mode, profile, context] = args;
  if (!PROOF_MODES.includes(mode)) {
    return { ok: false, reason: 'unknown-mode' };
  }
  if (profile !== 'dev' && profile !== 'release') {
    return { ok: false, reason: 'unknown-profile' };
  }
  if (typeof context !== 'string' || context.length === 0) {
    return { ok: false, reason: 'invalid-context' };
  }
  return { ok: true, mode, profile, context };
}

/**
 * @param {{ mode: string, profile: string, env?: NodeJS.ProcessEnv }} input
 */
export function refuseProofInvocation({ mode, profile, env = process.env }) {
  if (env.OFFSCREEN_RABBITMQ_PROOF !== 'authorized') {
    return { refused: true, reason: 'proof-unauthorized' };
  }
  if (profile === 'release') {
    return { refused: true, reason: 'release-proof-refused' };
  }
  if (mode === 'durability' || mode === 'worker-loss') {
    if (env.OFFSCREEN_RABBITMQ_DISRUPTION !== 'authorized') {
      return { refused: true, reason: 'disruption-unauthorized' };
    }
    if (profile !== 'dev') {
      return { refused: true, reason: 'disruption-dev-only' };
    }
  }
  return { refused: false };
}

/**
 * @param {string} name
 */
export function validateQueueName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return { ok: false, reason: 'queue-empty' };
  }
  const bytes = Buffer.from(name, 'utf8');
  if (bytes.length > 255) {
    return { ok: false, reason: 'queue-length' };
  }
  for (const byte of bytes) {
    if (byte < 0x20 || byte === 0x7f) {
      return { ok: false, reason: 'queue-control' };
    }
  }
  return { ok: true, name };
}

/**
 * @param {string} queue
 * @param {string} runId
 */
export function buildPublishPodArgv(queue, runId) {
  return [
    'python3',
    '/opt/amqp_smoke.py',
    'publish',
    JSON.stringify([queue, runId]),
  ];
}

/**
 * @param {string} queue
 * @param {string} runId
 * @param {'hold' | 'replacement'} role
 */
export function buildWorkerPodArgv(queue, runId, role) {
  return [
    'python3',
    '/opt/worker_loss.py',
    role,
    JSON.stringify([queue, runId]),
  ];
}

/**
 * @param {{ publishArgv: string[] }} input
 */
export function publishArgvDeclaresQueue({ publishArgv }) {
  return publishArgv.includes('declare');
}

/**
 * @typedef {{
 *   writeTemp: (path: string, data: string) => void,
 *   fsyncFile: (path: string) => void,
 *   rename: (from: string, to: string) => void,
 *   fsyncDir: (path: string) => void,
 *   readBack: (path: string) => string,
 * }} ReceiptIO
 */

/**
 * @param {{ receiptDir: string, receiptPath: string, payload: object, io: ReceiptIO }} input
 */
export function persistReceiptAtomic({ receiptDir, receiptPath, payload, io }) {
  const tempPath = join(
    receiptDir,
    `.receipt-${process.pid}-${randomBytes(4).toString('hex')}.tmp`,
  );
  const serialized = `${JSON.stringify(payload)}\n`;
  io.writeTemp(tempPath, serialized);
  io.fsyncFile(tempPath);
  io.rename(tempPath, receiptPath);
  io.fsyncDir(receiptDir);
  const readBack = io.readBack(receiptPath);
  if (readBack.trim() !== serialized.trim()) {
    return { ok: false, reason: 'receipt-readback' };
  }
  return { ok: true };
}

/**
 * @param {object} receipt
 */
export function canCreatePublisherAfterQueueRecorded(receipt) {
  return (
    receipt?.phase === 'QUEUE_RECORDED' && typeof receipt.queue === 'string'
  );
}

/**
 * @param {object} receipt
 * @param {{ fsyncOk?: boolean, readbackOk?: boolean }} gate
 */
export function shouldCreatePublisher(
  receipt,
  gate = { fsyncOk: true, readbackOk: true },
) {
  if (!gate.fsyncOk || !gate.readbackOk) {
    return false;
  }
  return canCreatePublisherAfterQueueRecorded(receipt);
}

/**
 * @param {object} current
 * @param {object} baseline
 */
export function identitiesCompatible(current, baseline) {
  const keys = [
    'baselineUid',
    'namespaceUid',
    'crUid',
    'serviceUid',
    'secretUid',
    'pvcUid',
    'pvUid',
    'vhost',
  ];
  for (const key of keys) {
    if (baseline[key] == null) {
      continue;
    }
    if (current[key] !== baseline[key]) {
      return false;
    }
  }
  return true;
}

/**
 * @param {{ baseline: object, observed: object, attemptedWrite?: boolean }} input
 */
export function refuseSubsequentWrites({
  baseline,
  observed,
  attemptedWrite = true,
}) {
  if (!attemptedWrite) {
    return { refused: false };
  }
  if (!identitiesCompatible(observed, baseline)) {
    return { refused: true, reason: 'identity-mismatch' };
  }
  return { refused: false };
}

/**
 * @param {{ holdFailed: boolean, applySeen: boolean, replacementOk: boolean }} input
 */
export function evaluateWorkerLossPass({
  holdFailed,
  applySeen,
  replacementOk,
}) {
  if (holdFailed) {
    return { ok: false, reason: 'hold-failed-before-delete' };
  }
  if (!applySeen || !replacementOk) {
    return { ok: false, reason: 'replacement-incomplete' };
  }
  return { ok: true, wording: WORKER_LOSS_SUCCESS_TEXT };
}

/**
 * @param {number} remainingWorkMs
 */
export function shouldLaunchRepeatEnsure(remainingWorkMs) {
  return remainingWorkMs >= REPEAT_ENSURE_MIN_REMAINING_MS;
}

/**
 * @param {number} elapsedMs
 * @param {'durability' | 'worker-loss' | 'smoke'} mode
 */
export function remainingWorkBudgetMs(elapsedMs, mode) {
  const overall = MODE_BUDGET_MS[mode];
  const workEnd = overall - CLEANUP_RESERVE_MS;
  return Math.max(0, workEnd - elapsedMs);
}

/**
 * @param {string} line
 */
export function parseDeclaredRecord(line) {
  const prefix = 'DECLARED ';
  if (!line.startsWith(prefix)) {
    return { ok: false, reason: 'declared-prefix' };
  }
  try {
    const parsed = JSON.parse(line.slice(prefix.length));
    if (parsed.record !== 'DECLARED' || typeof parsed.queue !== 'string') {
      return { ok: false, reason: 'declared-shape' };
    }
    return { ok: true, record: parsed };
  } catch {
    return { ok: false, reason: 'declared-json' };
  }
}

/**
 * @param {string} line
 */
export function parsePublishedRecord(line) {
  const prefix = 'PUBLISHED ';
  if (!line.startsWith(prefix)) {
    return { ok: false, reason: 'published-prefix' };
  }
  try {
    const parsed = JSON.parse(line.slice(prefix.length));
    if (parsed.record !== 'PUBLISHED') {
      return { ok: false, reason: 'published-shape' };
    }
    return { ok: true, record: parsed };
  } catch {
    return { ok: false, reason: 'published-json' };
  }
}

/**
 * @param {{ confirmKnown: boolean, publishRecorded: boolean }} input
 */
export function stopAfterUnknownConfirm({ confirmKnown, publishRecorded }) {
  if (!confirmKnown) {
    return { stop: true, retainQueue: true, reason: 'unknown-confirm' };
  }
  if (!publishRecorded) {
    return { stop: true, retainQueue: true, reason: 'publish-record-missing' };
  }
  return { stop: false, retainQueue: false };
}

/**
 * @param {string} root
 */
export function defaultReceiptIo(root) {
  return {
    writeTemp(path, data) {
      const fd = openSync(path, 'wx', 0o600);
      try {
        writeSync(fd, data);
      } finally {
        closeSync(fd);
      }
    },
    fsyncFile(path) {
      const fd = openSync(path, 'r');
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    },
    rename(from, to) {
      renameSync(from, to);
    },
    fsyncDir(path) {
      const fd = openSync(path, 'r');
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    },
    readBack(path) {
      return readFileSync(path, 'utf8');
    },
    ensureDir(path) {
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true, mode: 0o700 });
        chmodSync(path, 0o700);
      }
    },
    root,
  };
}

/**
 * @param {string} repoRoot
 */
export function createReceiptDirectory(repoRoot) {
  const nonce = randomBytes(16).toString('hex');
  const dir = join(repoRoot, '.offscreen', 'verification', `rabbitmq-${nonce}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return { dir, receiptPath: join(dir, 'receipt.json') };
}

/**
 * @param {{ mode: string, profile: string, context: string, runId?: string }} input
 */
export function initialReceipt({
  mode,
  profile,
  context,
  runId = randomBytes(8).toString('hex'),
}) {
  return {
    schema: PROOF_SCHEMA,
    runId,
    profile,
    context,
    vhost: '/',
    mode,
    phase: 'INIT',
    queue: null,
    fixtureUids: {},
    outcome: null,
  };
}

export const BROKER_POD_NAME = 'rabbitmq-server-0';
export const HOLD_LIVE_WINDOW_MS = 5_000;

/**
 * @param {string} runId
 * @param {string} role
 */
export function proofPodName(runId, role) {
  return `rabbitmq-proof-${runId}-${role}`;
}

/**
 * @param {string} log
 */
export function parseHoldObservation(log) {
  const lines = log.split('\n');
  let applySeen = false;
  let holdFailed = false;
  const liveSeqs = [];
  for (const line of lines) {
    if (line.startsWith('APPLY ')) {
      applySeen = true;
    }
    if (line.startsWith('HOLD_FAILED ')) {
      holdFailed = true;
    }
    const live = /^HOLD_LIVE seq=(\d+)$/.exec(line.trim());
    if (live) {
      liveSeqs.push(Number(live[1]));
    }
  }
  return { applySeen, holdFailed, liveSeqs, lastSeq: liveSeqs.at(-1) ?? -1 };
}

/**
 * @param {{ currentSeq: number, previousSeq: number, elapsedMs: number }} input
 */
export function holdLivenessPairOk({ currentSeq, previousSeq, elapsedMs }) {
  if (currentSeq <= previousSeq) {
    return false;
  }
  return elapsedMs <= HOLD_LIVE_WINDOW_MS;
}

/**
 * @typedef {{
 *   op: string,
 *   [key: string]: unknown,
 * }} ProofOp
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   stdout?: string,
 *   stderr?: string,
 *   uid?: string,
 *   identities?: Record<string, string>,
 *   status?: { phase?: string, restartCount?: number, deletionTimestamp?: string|null },
 *   exitCode?: number,
 *   lostResponse?: boolean,
 *   brokerPodUid?: string,
 *   brokerRestartCount?: number,
 * }} ProofOpResult
 */

/**
 * @typedef {(request: ProofOp) => Promise<ProofOpResult> | ProofOpResult} ProofRunner
 */

/**
 * @param {ProofRunner} runner
 * @returns {ProofOp[]}
 */
export function runnerCallLog(runner) {
  return /** @type {ProofOp[]} */ (runner.calls ?? []);
}

/**
 * @param {Array<{ match: (op: ProofOp) => boolean, result: ProofOpResult | ((op: ProofOp, state: object) => ProofOpResult) }>} script
 */
export function createScriptedRunner(script) {
  /** @type {ProofOp[]} */
  const calls = [];
  const state = { seq: 0 };
  /** @type {ProofRunner & { calls: ProofOp[] }} */
  const runner = (request) => {
    calls.push(request);
    state.seq += 1;
    for (const entry of script) {
      if (entry.match(request)) {
        return typeof entry.result === 'function'
          ? entry.result(request, state)
          : entry.result;
      }
    }
    return { ok: false, stderr: `unscripted-op:${request.op}` };
  };
  runner.calls = calls;
  return runner;
}

/**
 * @param {{
 *   receipt: object,
 *   receiptDir: string,
 *   receiptPath: string,
 *   payloadPhase: string,
 *   io: ReceiptIO,
 * }} input
 */
function persistReceipt({
  receipt,
  receiptDir,
  receiptPath,
  payloadPhase,
  io,
}) {
  receipt.phase = payloadPhase;
  const result = persistReceiptAtomic({
    receiptDir,
    receiptPath,
    payload: receipt,
    io,
  });
  return {
    ok: result.ok,
    reason: result.reason,
    fsyncOk: result.ok,
    readbackOk: result.ok,
  };
}

/**
 * @param {{
 *   mode: 'smoke' | 'durability' | 'worker-loss',
 *   profile: string,
 *   context: string,
 *   receipt: object,
 *   runner: ProofRunner,
 *   io: ReceiptIO & { ensureDir?: (path: string) => void },
 *   receiptDir: string,
 *   receiptPath: string,
 *   queue: string,
 *   baseline: Record<string, string>,
 *   elapsedMs: () => number,
 *   remainingWorkMs: () => number,
 * }} ctx
 */
async function runDurabilityTail(ctx) {
  if (!shouldLaunchRepeatEnsure(ctx.remainingWorkMs())) {
    return {
      ok: false,
      reason: 'repeat-ensure-budget',
      phase: 'repeat-ensure',
      retainQueue: true,
    };
  }
  const ensure = await ctx.runner({
    op: 'ensure-repeat',
    profile: ctx.profile,
    context: ctx.context,
  });
  if (!ensure.ok) {
    return {
      ok: false,
      reason: 'ensure-repeat-failed',
      phase: 'repeat-ensure',
    };
  }

  const before = await ctx.runner({ op: 'broker-pod-uid' });
  if (!before.ok || !before.brokerPodUid) {
    return { ok: false, reason: 'broker-uid-read', phase: 'restart' };
  }
  const deleteBroker = await ctx.runner({
    op: 'pod-delete',
    name: BROKER_POD_NAME,
    uid: before.brokerPodUid,
    gracePeriod: 5,
    force: false,
  });
  if (!deleteBroker.ok) {
    return {
      ok: false,
      reason: 'broker-delete',
      phase: 'restart',
      retainQueue: true,
    };
  }
  const ready = await ctx.runner({
    op: 'pod-wait-ready',
    name: BROKER_POD_NAME,
    timeoutMs: 420_000,
  });
  if (!ready.ok) {
    return {
      ok: false,
      reason: 'broker-ready',
      phase: 'restart',
      retainQueue: true,
    };
  }
  const after = await ctx.runner({ op: 'broker-pod-uid' });
  if (!after.ok || after.brokerPodUid === before.brokerPodUid) {
    return {
      ok: false,
      reason: 'broker-uid-unchanged',
      phase: 'restart',
      retainQueue: true,
    };
  }
  const ids = await ctx.runner({ op: 'capture-identities' });
  const compat = refuseSubsequentWrites({
    baseline: ctx.baseline,
    observed: ids.identities ?? {},
    attemptedWrite: true,
  });
  if (compat.refused) {
    return {
      ok: false,
      reason: compat.reason,
      phase: 'identity-check',
      retainQueue: true,
    };
  }

  const getArgv = [
    'python3',
    '/opt/amqp_smoke.py',
    'durable-get',
    JSON.stringify([ctx.queue, ctx.receipt.runId]),
  ];
  const drain = await createProofPod(ctx, 'durable-get', getArgv);
  if (!drain.ok) {
    return {
      ok: false,
      reason: drain.reason,
      phase: 'durable-get',
      retainQueue: true,
    };
  }
  if (!drain.stdout.includes('DURABLE-DRAIN')) {
    return {
      ok: false,
      reason: 'durable-payload',
      phase: 'durable-get',
      retainQueue: true,
    };
  }

  const cleanup = await cleanupProofFixtures(ctx);
  if (!cleanup.ok) {
    return {
      ok: false,
      reason: cleanup.reason,
      phase: 'cleanup',
      retainQueue: cleanup.retainQueue ?? true,
    };
  }
  ctx.receipt.phase = 'COMPLETE';
  ctx.receipt.outcome = 'durability-complete';
  persistReceipt({
    receipt: ctx.receipt,
    receiptDir: ctx.receiptDir,
    receiptPath: ctx.receiptPath,
    payloadPhase: 'COMPLETE',
    io: ctx.io,
  });
  return { ok: true, phase: 'durability-complete', queue: ctx.queue };
}

/**
 * @param {Parameters<typeof runDurabilityTail>[0]} ctx
 * @param {{ holdLogs: string, status?: ProofOpResult['status'] }} observation
 */
async function runWorkerLossTail(ctx, observation) {
  const holdName = proofPodName(ctx.receipt.runId, 'hold');
  const holdUid = ctx.receipt.fixtureUids.hold;
  if (!holdUid) {
    return { ok: false, reason: 'hold-uid-missing', phase: 'hold' };
  }
  const parsed = parseHoldObservation(observation.holdLogs);
  if (parsed.holdFailed) {
    return {
      ok: false,
      reason: 'hold-failed-before-delete',
      phase: 'hold',
      retainQueue: true,
    };
  }
  if (!parsed.applySeen) {
    return {
      ok: false,
      reason: 'hold-apply-missing',
      phase: 'hold',
      retainQueue: true,
    };
  }
  const status = observation.status ?? {};
  if (status.phase !== 'Running' || (status.restartCount ?? 0) !== 0) {
    return {
      ok: false,
      reason: 'hold-terminal-before-delete',
      phase: 'hold',
      retainQueue: true,
    };
  }
  if (status.deletionTimestamp) {
    return {
      ok: false,
      reason: 'hold-deletion-timestamp',
      phase: 'hold',
      retainQueue: true,
    };
  }

  if (parsed.liveSeqs.length < 2) {
    return {
      ok: false,
      reason: 'hold-liveness-missing',
      phase: 'hold',
      retainQueue: true,
    };
  }
  const previousSeq = parsed.liveSeqs[parsed.liveSeqs.length - 2];
  const currentSeq = parsed.liveSeqs[parsed.liveSeqs.length - 1];
  if (
    !holdLivenessPairOk({
      currentSeq,
      previousSeq,
      elapsedMs: 2_000,
    })
  ) {
    return {
      ok: false,
      reason: 'hold-liveness-window',
      phase: 'hold',
      retainQueue: true,
    };
  }

  const deleted = await ctx.runner({
    op: 'pod-delete',
    name: holdName,
    uid: holdUid,
    gracePeriod: 5,
    force: false,
  });
  if (!deleted.ok) {
    return {
      ok: false,
      reason: 'hold-delete',
      phase: 'hold',
      retainQueue: true,
    };
  }
  const absent = await ctx.runner({
    op: 'pod-absent',
    uid: holdUid,
    timeoutMs: 30_000,
  });
  if (!absent.ok) {
    return {
      ok: false,
      reason: 'hold-absent-timeout',
      phase: 'hold',
      retainQueue: true,
    };
  }

  const broker = await ctx.runner({ op: 'broker-state' });
  if (
    broker.brokerPodUid !== ctx.baseline.brokerPodUid ||
    Number(broker.brokerRestartCount ?? 0) !==
      Number(ctx.baseline.brokerRestartCount ?? 0)
  ) {
    return {
      ok: false,
      reason: 'broker-changed-during-hold',
      phase: 'worker-loss',
      retainQueue: true,
    };
  }

  const replacementArgv = buildWorkerPodArgv(
    ctx.queue,
    ctx.receipt.runId,
    'replacement',
  );
  const replacement = await createProofPod(ctx, 'replacement', replacementArgv);
  if (!replacement.ok) {
    return {
      ok: false,
      reason: replacement.reason,
      phase: 'replacement',
      retainQueue: true,
    };
  }
  const applyLine = `APPLY ${ctx.receipt.runId} redelivered=1`;
  if (
    !replacement.stdout.includes(applyLine) ||
    !replacement.stdout.includes('REPLACEMENT-EMPTY')
  ) {
    return {
      ok: false,
      reason: 'replacement-incomplete',
      phase: 'replacement',
      retainQueue: true,
    };
  }

  const holdApply = `APPLY ${ctx.receipt.runId} redelivered=0`;
  const assert = await ctx.runner({
    op: 'assert-exactly-once',
    text: `${holdApply}\n${applyLine}\n`,
  });
  if (assert.exitCode !== 1) {
    return {
      ok: false,
      reason: 'duplicate-assertion-not-failed',
      phase: 'replacement',
      retainQueue: true,
    };
  }

  const verdict = evaluateWorkerLossPass({
    holdFailed: false,
    applySeen: true,
    replacementOk: true,
  });
  const cleanup = await cleanupProofFixtures(ctx);
  if (!cleanup.ok) {
    return {
      ok: false,
      reason: cleanup.reason,
      phase: 'cleanup',
      retainQueue: cleanup.retainQueue ?? true,
    };
  }
  ctx.receipt.phase = 'COMPLETE';
  ctx.receipt.outcome = verdict.wording;
  persistReceipt({
    receipt: ctx.receipt,
    receiptDir: ctx.receiptDir,
    receiptPath: ctx.receiptPath,
    payloadPhase: 'COMPLETE',
    io: ctx.io,
  });
  return {
    ok: true,
    phase: 'worker-loss-complete',
    wording: verdict.wording,
    queue: ctx.queue,
  };
}

/**
 * @param {Parameters<typeof runDurabilityTail>[0]} ctx
 * @param {string} role
 * @param {string[]} command
 */
async function createProofPod(ctx, role, command) {
  const name = proofPodName(ctx.receipt.runId, role);
  const created = await ctx.runner({
    op: 'pod-create',
    role,
    name,
    command,
    runId: ctx.receipt.runId,
  });
  if (created.lostResponse) {
    ctx.receipt.fixtureUids[role] = null;
    ctx.receipt.possibleOrphans = ctx.receipt.possibleOrphans ?? [];
    ctx.receipt.possibleOrphans.push({ role, name, uid: null });
    return { ok: false, reason: 'pod-create-lost-response', lostName: name };
  }
  if (!created.ok) {
    return { ok: false, reason: `${role}-pod-create` };
  }
  if (created.uid) {
    ctx.receipt.fixtureUids[role] = created.uid;
  }
  const waited = await ctx.runner({
    op: 'pod-wait',
    name,
    uid: created.uid,
    phase: 'Succeeded',
    timeoutMs: 120_000,
  });
  if (!waited.ok) {
    return { ok: false, reason: `${role}-${waited.reason ?? 'pod-wait'}` };
  }
  const logs = await ctx.runner({ op: 'pod-logs', name, uid: created.uid });
  return {
    ok: logs.ok,
    stdout: logs.stdout ?? '',
    reason: logs.ok ? undefined : `${role}-pod-logs`,
  };
}

/**
 * @param {Parameters<typeof runDurabilityTail>[0]} ctx
 */
async function cleanupProofFixtures(ctx) {
  const compat = refuseSubsequentWrites({
    baseline: ctx.baseline,
    observed: (await ctx.runner({ op: 'capture-identities' })).identities ?? {},
    attemptedWrite: true,
  });
  if (compat.refused) {
    return {
      ok: false,
      reason: 'cleanup-identity-mismatch',
      retainQueue: true,
    };
  }
  for (const [role, uid] of Object.entries(ctx.receipt.fixtureUids)) {
    if (!uid) {
      continue;
    }
    const name = proofPodName(ctx.receipt.runId, role);
    await ctx.runner({
      op: 'pod-delete',
      name,
      uid,
      gracePeriod: 5,
      force: false,
      precondition: 'uid',
    });
  }
  if (ctx.queue) {
    const deleted = await ctx.runner({
      op: 'queue-delete',
      queue: ctx.queue,
      vhost: ctx.receipt.vhost,
      ifUnused: true,
      ifEmpty: true,
    });
    if (!deleted.ok) {
      return { ok: false, reason: 'queue-delete', retainQueue: true };
    }
  }
  const configUid = ctx.receipt.fixtureUids.configmap;
  if (configUid) {
    await ctx.runner({
      op: 'configmap-delete',
      name: `rabbitmq-proof-${ctx.receipt.runId}`,
      uid: configUid,
    });
  }
  return { ok: true };
}

/**
 * @param {{
 *   mode: string,
 *   profile: string,
 *   context: string,
 *   env?: NodeJS.ProcessEnv,
 *   runner?: ProofRunner,
 *   io?: ReceiptIO & { ensureDir?: (path: string) => void },
 *   receiptDir?: string,
 *   receiptPath?: string,
 *   receipt?: object,
 *   baseline?: Record<string, string>,
 *   clock?: { now: () => number },
 *   runLive?: boolean,
 *   repoRoot?: string,
 *   skipAuth?: boolean,
 *   holdObservation?: { holdLogs: string, status?: ProofOpResult['status'] },
 * }} input
 */
export async function runProofSupervisor(input) {
  const refusal = refuseProofInvocation({
    mode: input.mode,
    profile: input.profile,
    env: input.env,
  });
  if (refusal.refused) {
    return { ok: false, reason: refusal.reason, phase: 'refused' };
  }
  if (input.mode !== 'smoke' && input.context !== CANONICAL_DEV_CONTEXT) {
    return { ok: false, reason: 'context-not-canonical-dev', phase: 'refused' };
  }

  const clock = input.clock ?? { now: () => Date.now() };
  const startMs = clock.now();
  const budgetMs = MODE_BUDGET_MS[input.mode];
  const elapsedMs = () => clock.now() - startMs;
  const remainingWorkMs = () =>
    remainingWorkBudgetMs(
      elapsedMs(),
      /** @type {'smoke'|'durability'|'worker-loss'} */ (input.mode),
    );

  if (input.runLive === false && !input.runner) {
    return {
      ok: true,
      phase: 'dry-plan',
      mode: input.mode,
      budgetMs,
      remainingMs: remainingWorkMs(),
    };
  }
  if (!input.runner) {
    return { ok: false, reason: 'runner-required', phase: 'blocked' };
  }

  const receiptDir = input.receiptDir ?? '/tmp/rabbitmq-proof';
  const receiptPath = input.receiptPath ?? join(receiptDir, 'receipt.json');
  const io = input.io ?? defaultReceiptIo(receiptDir);
  io.ensureDir?.(receiptDir);

  const receipt =
    input.receipt ??
    initialReceipt({
      mode: input.mode,
      profile: input.profile,
      context: input.context,
    });

  const captured = input.baseline ? { ok: true, identities: input.baseline } : await input.runner({ op: 'capture-identities' });
  const baseline = captured.identities ?? {};
  if (input.mode === 'smoke' && (!captured.ok || !['namespaceUid', 'crUid', 'serviceUid', 'secretUid'].every(key => typeof baseline[key] === 'string' && baseline[key])))
    return { ok: false, reason: 'baseline-identity-incomplete', phase: 'refused' };
  receipt.baseline = baseline;
  const initPersist = persistReceipt({
    receipt,
    receiptDir,
    receiptPath,
    payloadPhase: 'INIT',
    io,
  });
  if (!initPersist.ok) {
    return { ok: false, reason: initPersist.reason, phase: 'receipt-init' };
  }

  if (input.mode === 'smoke') {
    const persist = phase => persistReceipt({ receipt, receiptDir, receiptPath, payloadPhase: phase, io });
    const finish = (ok, phase, reason, stdout) => {
      receipt.outcome = { ok, reason: reason ?? null };
      const saved = persist(phase);
      return saved.ok ? { ok, phase, ...(reason ? { reason } : {}), ...(stdout ? { stdout } : {}) } :
        { ok: false, phase: 'receipt-failed', reason: saved.reason };
    };
    const sameIdentity = async () => {
      const current = await input.runner({ op: 'capture-identities' });
      return current.ok && identitiesCompatible(current.identities ?? {}, baseline);
    };
    const create = async (role, command) => {
      if (!await sameIdentity()) return { ok: false, reason: 'identity-changed' };
      const name = role === 'configmap' ? `rabbitmq-proof-${receipt.runId}` : proofPodName(receipt.runId, role);
      receipt.pendingFixture = { role, name };
      if (!persist('CREATE_INTENT').ok) return { ok: false, reason: 'receipt-intent' };
      const result = await input.runner({ op: role === 'configmap' ? 'configmap-create' : 'pod-create', role, name, command, runId: receipt.runId });
      if (!result.ok || !result.uid) return { ok: false, reason: 'fixture-create-unknown' };
      receipt.fixtureUids[role] = result.uid;
      receipt.pendingFixture = null;
      if (!persist('FIXTURE_CREATED').ok) return { ok: false, reason: 'receipt-fixture' };
      if (role === 'configmap') return { ok: true };
      const waited = await input.runner({ op: 'pod-wait', name, uid: result.uid, phase: 'Succeeded', timeoutMs: Math.min(120_000, remainingWorkMs()) });
      if (!waited.ok) return { ok: false, reason: waited.reason ?? 'pod-wait' };
      return input.runner({ op: 'pod-logs', name, uid: result.uid });
    };
    const config = await create('configmap');
    if (!config.ok) return finish(false, 'RETAINED', config.reason);
    const smoke = await create('smoke', ['python3', '/opt/amqp_smoke.py', 'smoke']);
    const lines = (smoke.stdout ?? '').split('\n');
    if (!smoke.ok || !lines.some(line => /^SMOKE-PUBLISHED queue=amq\.gen-\S+$/.test(line)) ||
        !['SMOKE-EMPTY', 'MGMT-OK', 'METRICS-OK'].every(line => lines.includes(line)))
      return finish(false, 'RETAINED', smoke.reason ?? 'positive-markers-missing');
    const auth = await create('wrong-password', ['python3', '/opt/amqp_smoke.py', 'wrong-password']);
    if (!auth.ok || !(auth.stdout ?? '').split('\n').includes('AUTH-REFUSED 403'))
      return finish(false, 'RETAINED', auth.reason ?? 'explicit-auth-refusal-missing');
    receipt.proofEvidence = { positive: smoke.stdout, negative: 'AUTH-REFUSED 403' };
    receipt.cleanedFixtures = [];
    if (!persist('CLEANUP_INTENT').ok) return { ok: false, phase: 'receipt-failed', reason: 'cleanup-intent' };
    for (const role of ['smoke', 'wrong-password', 'configmap']) {
      if (!await sameIdentity()) return finish(false, 'RETAINED', 'cleanup-identity-changed');
      const name = role === 'configmap' ? `rabbitmq-proof-${receipt.runId}` : proofPodName(receipt.runId, role);
      const deleted = await input.runner({ op: 'smoke-fixture-delete', kind: role === 'configmap' ? 'configmaps' : 'pods', name, uid: receipt.fixtureUids[role] });
      if (!deleted.ok) return finish(false, 'RETAINED', 'cleanup-unconfirmed');
      receipt.cleanedFixtures.push(role);
      if (!persist('CLEANUP_PROGRESS').ok) return { ok: false, phase: 'receipt-failed', reason: 'cleanup-progress' };
    }
    return finish(true, 'smoke-complete', null, smoke.stdout);
  }

  const config = await input.runner({
    op: 'configmap-create',
    name: `rabbitmq-proof-${receipt.runId}`,
    runId: receipt.runId,
  });
  if (!config.ok) {
    return { ok: false, reason: 'configmap-create', phase: 'fixture' };
  }
  if (config.uid) {
    receipt.fixtureUids.configmap = config.uid;
  }

  const ctx = ctxFrom(
    input,
    receipt,
    receiptDir,
    receiptPath,
    io,
    baseline,
    elapsedMs,
    remainingWorkMs,
  );

  const declared = await createProofPod(ctx, 'declare', [
    'python3',
    '/opt/amqp_smoke.py',
    'declare',
  ]);
  if (!declared.ok) {
    return {
      ok: false,
      reason: declared.reason,
      phase: 'declare',
      lostName: declared.lostName,
    };
  }
  const declaredLine = declared.stdout
    .split('\n')
    .find((line) => line.startsWith('DECLARED '));
  const declaredRecord = declaredLine
    ? parseDeclaredRecord(declaredLine)
    : { ok: false };
  if (!declaredRecord.ok) {
    return { ok: false, reason: 'declare-record', phase: 'declare' };
  }
  const queueCheck = validateQueueName(declaredRecord.record.queue);
  if (!queueCheck.ok) {
    return { ok: false, reason: queueCheck.reason, phase: 'declare' };
  }
  receipt.queue = queueCheck.name;
  const queuePersist = persistReceipt({
    receipt,
    receiptDir,
    receiptPath,
    payloadPhase: 'QUEUE_RECORDED',
    io,
  });
  if (!shouldCreatePublisher(receipt, queuePersist)) {
    return {
      ok: false,
      reason: queuePersist.reason ?? 'queue-receipt-fsync',
      phase: 'declare',
      publisherCreates: countPublisherCreates(input.runner),
    };
  }

  const intentPersist = persistReceipt({
    receipt,
    receiptDir,
    receiptPath,
    payloadPhase: 'PUBLISH_INTENT',
    io,
  });
  if (!intentPersist.ok) {
    return { ok: false, reason: intentPersist.reason, phase: 'publish-intent' };
  }

  const publishArgv = buildPublishPodArgv(queueCheck.name, receipt.runId);
  if (publishArgvDeclaresQueue({ publishArgv })) {
    return { ok: false, reason: 'publish-declares', phase: 'publish' };
  }
  const publish = await createProofPod(ctx, 'publish', publishArgv);
  if (!publish.ok) {
    return {
      ok: false,
      reason: publish.reason,
      phase: 'publish',
      retainQueue: true,
    };
  }
  const publishedLine = publish.stdout
    .split('\n')
    .find((line) => line.startsWith('PUBLISHED '));
  const published = publishedLine
    ? parsePublishedRecord(publishedLine)
    : { ok: false };
  const stop = stopAfterUnknownConfirm({
    confirmKnown: published.ok,
    publishRecorded: published.ok,
  });
  if (stop.stop) {
    return {
      ok: false,
      reason: stop.reason,
      phase: 'publish',
      retainQueue: stop.retainQueue,
    };
  }
  persistReceipt({
    receipt,
    receiptDir,
    receiptPath,
    payloadPhase: 'PUBLISHED',
    io,
  });

  if (input.mode === 'durability') {
    return runDurabilityTail({ ...ctx, queue: queueCheck.name });
  }

  const holdArgv = buildWorkerPodArgv(queueCheck.name, receipt.runId, 'hold');
  const hold = await createProofPod(ctx, 'hold', holdArgv);
  if (!hold.ok) {
    return { ok: false, reason: hold.reason, phase: 'hold', retainQueue: true };
  }

  let holdLogs = hold.stdout;
  let status = { phase: 'Running', restartCount: 0, deletionTimestamp: null };
  if (input.holdObservation) {
    holdLogs = input.holdObservation.holdLogs;
    status = input.holdObservation.status ?? status;
  } else {
    const polled = await input.runner({
      op: 'hold-observe',
      name: proofPodName(receipt.runId, 'hold'),
      uid: receipt.fixtureUids.hold,
    });
    if (polled.stdout) {
      holdLogs = polled.stdout;
    }
    if (polled.status) {
      status = polled.status;
    }
  }

  return runWorkerLossTail(
    { ...ctx, queue: queueCheck.name },
    { holdLogs, status },
  );
}

/**
 * @param {ProofRunner} runner
 */
export function countPublisherCreates(runner) {
  return runnerCallLog(runner).filter(
    (op) => op.op === 'pod-create' && op.role === 'publish',
  ).length;
}

/**
 * @param {Parameters<typeof runProofSupervisor>[0]} input
 * @param {object} receipt
 * @param {string} receiptDir
 * @param {string} receiptPath
 * @param {ReceiptIO} io
 * @param {Record<string, string>} baseline
 * @param {() => number} elapsedMs
 * @param {() => number} remainingWorkMs
 */
function ctxFrom(
  input,
  receipt,
  receiptDir,
  receiptPath,
  io,
  baseline,
  elapsedMs,
  remainingWorkMs,
) {
  return {
    mode: input.mode,
    profile: input.profile,
    context: input.context,
    receipt,
    runner: input.runner,
    io,
    receiptDir,
    receiptPath,
    baseline,
    elapsedMs,
    remainingWorkMs,
    queue: receipt.queue,
  };
}
