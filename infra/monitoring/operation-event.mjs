import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

export const SCHEMA_VERSION = 1;
export const MAX_OPERATION_RECORD_BYTES = 4096;
export const RECORD_SOURCE = 'operation-event.mjs';
export const OPERATION_RECORD_KIND = 'operation';

export const OPERATION_EVENT_KINDS = Object.freeze([
  'start',
  'end',
  'phase-start',
  'phase-end',
  'failure',
  'rollback',
]);

export const OPERATION_RESULT_CODES = Object.freeze([
  'success',
  'failure',
  'refused',
  'cancelled',
  'timeout',
  'unknown',
  'rollback',
]);

export const RECORD_LINE_STATE = Object.freeze({
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  CORRUPT: 'corrupt',
  EMPTY: 'empty',
});

const SECRET_PATTERN =
  /(?:password|passwd|secret|token|api[_-]?key|bearer|authorization|credential|private[_-]?key|BEGIN\s+(?:RSA|OPENSSH)\s+PRIVATE)/i;

const BOUNDED_LABEL_RE = /^[a-z][a-z0-9._-]{0,63}$/i;
const CHANGE_BRANCH_RE = /^change\/([a-z0-9]+)-/i;

/**
 * @param {string | undefined} value
 */
export function resolveMonitorStateRoot(value = process.env.OFFSCREEN_MONITOR_STATE_ROOT) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  const home = process.env.HOME?.trim() || homedir();
  return join(home, '.local', 'state', 'offscreen-monitor');
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function looksLikeSecret(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  if (text.length > 256) return true;
  if (SECRET_PATTERN.test(text)) return true;
  if (/^Bearer\s+/i.test(text)) return true;
  if (text.includes('=') && text.length > 48 && /^[A-Za-z0-9+/=_-]+$/.test(text)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function rejectSecretFields(fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' && looksLikeSecret(value)) {
      return { ok: false, reason: `secret_like_${key}` };
    }
  }
  return { ok: true };
}

/**
 * @param {unknown} code
 * @returns {string | null}
 */
export function sanitizeResultCode(code) {
  if (typeof code !== 'string') return null;
  const normalized = code.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!normalized || normalized.length > 32) return null;
  if (!OPERATION_RESULT_CODES.includes(normalized)) return null;
  return normalized;
}

/**
 * @param {unknown} name
 * @returns {string | null}
 */
export function sanitizeBoundedLabel(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 64) return null;
  if (looksLikeSecret(trimmed)) return null;
  if (!BOUNDED_LABEL_RE.test(trimmed)) return null;
  return trimmed;
}

/**
 * @param {string} repoRoot
 * @returns {{ kind: 'basename' | 'hash', value: string }}
 */
export function stableRepoRef(repoRoot) {
  try {
    const canonical = realpathSync(repoRoot);
    const base = basename(canonical);
    if (base && !canonical.startsWith('/home/')) {
      return { kind: 'hash', value: createHash('sha256').update(canonical).digest('hex').slice(0, 16) };
    }
    if (base && /^offscreen-rpg[-a-z0-9]*$/i.test(base)) {
      return { kind: 'basename', value: base.slice(0, 64) };
    }
    return { kind: 'hash', value: createHash('sha256').update(canonical).digest('hex').slice(0, 16) };
  } catch {
    const fallback = basename(String(repoRoot || 'unknown')).slice(0, 64) || 'unknown';
    return { kind: 'basename', value: fallback };
  }
}

/**
 * @param {{ approvedChangeId?: string | null, branch?: string | null }} input
 * @returns {string | null}
 */
export function resolveChangeId(input = {}) {
  const approved =
    input.approvedChangeId ??
    process.env.OFFSCREEN_MONITOR_CHANGE_ID ??
    process.env.OFFSCREEN_CHANGE_ID ??
    null;
  if (typeof approved === 'string' && /^[a-z0-9]{2,16}$/i.test(approved.trim())) {
    return approved.trim().toLowerCase();
  }
  const branch = input.branch;
  if (typeof branch === 'string') {
    const match = branch.match(CHANGE_BRANCH_RE);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

/**
 * @param {string} installationId
 * @param {string} bootId
 * @param {string} [runtimeBoundary]
 */
export function buildScopeId(installationId, bootId, runtimeBoundary = 'host') {
  const parts = [installationId.trim(), bootId.trim(), runtimeBoundary.trim()];
  if (parts.some((part) => !part)) {
    throw new Error('scope identity components must be non-empty');
  }
  return parts.join(':');
}

/**
 * @param {number} pid
 * @param {(target: number) => string} [readStat]
 */
export function readProcessStartTicks(pid, readStat) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const read = readStat ?? ((target) => readFileSync(`/proc/${target}/stat`, 'utf8'));
  try {
    const statText = read(pid);
    const close = statText.lastIndexOf(')');
    if (close < 0) return null;
    const fields = statText.slice(close + 2).trim().split(/\s+/);
    const start = fields[19];
    if (!start || !/^[0-9]+$/.test(start)) return null;
    return start;
  } catch {
    return null;
  }
}

/**
 * @param {() => string | null} [readBootId]
 */
export function readBootId(readBootId) {
  const read = readBootId ?? (() => {
    try {
      return readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
    } catch {
      return null;
    }
  });
  const value = read();
  if (typeof value === 'string' && /^[0-9a-f-]{8,}$/i.test(value)) {
    return value.toLowerCase();
  }
  return 'unknown-boot';
}

/**
 * @param {string} repoRoot
 * @param {(cmd: string, args: string[]) => { status: number | null, stdout: string }} [runGit]
 */
export function readGitIdentityAtOperationBegin(repoRoot, runGit) {
  const runner =
    runGit ??
    ((cmd, args) => {
      const result = spawnSync(cmd, args, {
        encoding: 'utf8',
        timeout: 3_000,
        maxBuffer: 512,
      });
      return { status: result.status, stdout: result.stdout ?? '' };
    });
  const result = runner('git', ['-C', repoRoot, 'log', '-1', '--format=%H|%D']);
  if (result.status !== 0) return null;
  const line = result.stdout.trim().split('\n')[0] ?? '';
  const [head, refs = ''] = line.split('|');
  if (!head || !/^[0-9a-f]{7,40}$/i.test(head)) return null;
  const branchMatch = refs.match(/HEAD\s*->\s*([^,]+)/);
  const branch = (branchMatch?.[1] ?? 'HEAD').trim().slice(0, 128);
  return { head: head.slice(0, 40), branch };
}

/**
 * @param {unknown} raw
 * @param {{ partialAtEof?: boolean }} [options]
 */
export function parseOperationRecordLine(raw, options = {}) {
  if (typeof raw === 'string') raw = Buffer.from(raw, 'utf8');
  if (!Buffer.isBuffer(raw)) {
    return { state: RECORD_LINE_STATE.CORRUPT, record: null, message: 'raw must be bytes' };
  }
  const stripped = raw.toString('utf8').replace(/\r?\n$/, '');
  if (!stripped) {
    return { state: RECORD_LINE_STATE.EMPTY, record: null, message: '' };
  }
  let value;
  try {
    value = JSON.parse(stripped);
  } catch (error) {
    const state = options.partialAtEof ? RECORD_LINE_STATE.PARTIAL : RECORD_LINE_STATE.CORRUPT;
    return { state, record: null, message: String(error) };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { state: RECORD_LINE_STATE.CORRUPT, record: null, message: 'JSON value is not an object' };
  }
  try {
    validateOperationRecord(value);
  } catch (error) {
    return { state: RECORD_LINE_STATE.CORRUPT, record: null, message: String(error) };
  }
  return { state: RECORD_LINE_STATE.COMPLETE, record: value, message: '' };
}

/**
 * @param {Record<string, unknown>} record
 */
export function validateOperationRecord(record) {
  const required = [
    'schemaVersion',
    'kind',
    'collectorSession',
    'source',
    'scopeId',
    'observedAt',
    'monotonicNs',
    'sequence',
    'operation',
  ];
  for (const field of required) {
    if (!(field in record)) throw new Error(`missing required field ${field}`);
  }
  if (record.schemaVersion !== SCHEMA_VERSION) throw new Error('unsupported schemaVersion');
  if (record.kind !== OPERATION_RECORD_KIND) throw new Error('unsupported kind');
  if (typeof record.collectorSession !== 'string' || !record.collectorSession) {
    throw new Error('collectorSession must be a non-empty string');
  }
  if (typeof record.scopeId !== 'string' || !record.scopeId) {
    throw new Error('scopeId must be a non-empty string');
  }
  if (typeof record.observedAt !== 'string' || !record.observedAt) {
    throw new Error('observedAt must be a non-empty string');
  }
  if (typeof record.monotonicNs !== 'string' || !/^\d+$/.test(record.monotonicNs)) {
    throw new Error('monotonicNs must be a decimal string');
  }
  if (!Number.isInteger(record.sequence) || record.sequence < 0) {
    throw new Error('sequence must be a non-negative integer');
  }
  const operation = record.operation;
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    throw new Error('operation must be an object');
  }
  if (!OPERATION_EVENT_KINDS.includes(operation.event)) {
    throw new Error('unsupported operation event');
  }
}

/**
 * @param {readonly Record<string, unknown>[]} completeRecords
 * @param {string} operationId
 */
export function operationSpanIsComplete(completeRecords, operationId) {
  let sawStart = false;
  let sawTerminal = false;
  for (const record of completeRecords) {
    const op = record.operation;
    if (!op || op.operationId !== operationId) continue;
    if (op.event === 'start') sawStart = true;
    if (op.event === 'end' || op.event === 'failure' || op.event === 'rollback') {
      sawTerminal = true;
    }
  }
  if (!sawStart) return null;
  return sawTerminal;
}

/**
 * @param {() => number} [wallSeconds]
 * @param {() => bigint} [hrtimeBigint]
 */
export function createInjectableClock(wallSeconds, hrtimeBigint) {
  const wall = wallSeconds ?? (() => Date.now() / 1000);
  const mono = hrtimeBigint ?? (() => process.hrtime.bigint());
  return {
    wallSeconds: wall,
    observedAtUtc(explicit) {
      if (typeof explicit === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(explicit)) {
        return explicit.endsWith('Z') ? explicit : `${explicit}Z`;
      }
      const instant = new Date(wall() * 1000);
      return instant.toISOString();
    },
    monotonicNs(explicit) {
      if (typeof explicit === 'string' && /^\d+$/.test(explicit)) return explicit;
      return mono().toString();
    },
  };
}

/**
 * @param {ReturnType<typeof createInjectableClock>} clock
 * @param {string | undefined} explicit
 */
function observedAtUtc(clock, explicit) {
  return clock.observedAtUtc(explicit);
}

/**
 * @param {object} deps
 */
export function createOperationEventWriter(deps = {}) {
  const stateRoot = deps.stateRoot ?? resolveMonitorStateRoot();
  const disabled = deps.disabled ?? process.env.OFFSCREEN_MONITOR_DISABLED === '1';
  const clock = deps.clock ?? createInjectableClock(deps.wallSeconds, deps.hrtimeBigint);
  const collectorSession = deps.collectorSession ?? randomUUID();
  const installationId =
    deps.installationId ??
    process.env.OFFSCREEN_MONITOR_INSTALLATION_ID ??
    'offscreen-operation-writer';
  const bootId = deps.bootId ?? readBootId(deps.readBootId);
  const scopeId = deps.scopeId ?? buildScopeId(installationId, bootId, deps.runtimeBoundary ?? 'host');
  const pid = deps.pid ?? process.pid;
  const starttimeTicks = deps.starttimeTicks ?? readProcessStartTicks(pid, deps.readStat);
  const repoRoot = deps.repoRoot ?? process.cwd();
  const repoRef = deps.repoRef ?? stableRepoRef(repoRoot);
  const devSlot = sanitizeBoundedLabel(deps.devSlot ?? process.env.OFFSCREEN_DEV_SLOT ?? '');
  const devContext = sanitizeBoundedLabel(deps.devContext ?? process.env.OFFSCREEN_DEV_CONTEXT ?? '');
  const devProfile = sanitizeBoundedLabel(deps.devProfile ?? process.env.OFFSCREEN_DEV_PROFILE ?? '');

  let sequence = 0;
  let lastDiagnostic = '';
  let diagnosticEmitted = false;

  const fs = {
    existsSync: deps.existsSync ?? existsSync,
    mkdirSync: deps.mkdirSync ?? mkdirSync,
    openSync: deps.openSync ?? openSync,
    writeSync: deps.writeSync ?? writeSync,
    closeSync: deps.closeSync ?? closeSync,
    chmodSync: deps.chmodSync,
  };

  function monitorReady() {
    if (disabled) return false;
    if (!fs.existsSync(stateRoot)) return false;
    return true;
  }

  function emitDiagnostic(message) {
    if (diagnosticEmitted) return;
    diagnosticEmitted = true;
    lastDiagnostic = message.slice(0, 120);
  }

  function writeRecord(record) {
    if (!monitorReady()) {
      emitDiagnostic('monitor_state_unavailable');
      return { written: false, reason: 'monitor_unavailable' };
    }
    if (!fs.existsSync(stateRoot)) {
      try {
        fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
      } catch {
        emitDiagnostic('monitor_state_unwritable');
        return { written: false, reason: 'state_root_unwritable' };
      }
    }
    if (fs.chmodSync) {
      try {
        fs.chmodSync(stateRoot, 0o700);
      } catch {
        // best effort
      }
    }

    const payload = `${JSON.stringify(record)}\n`;
    if (Buffer.byteLength(payload, 'utf8') > MAX_OPERATION_RECORD_BYTES) {
      emitDiagnostic('record_too_large');
      return { written: false, reason: 'record_too_large' };
    }

    const attemptName = `events-op-${randomUUID()}.jsonl`;
    const targetPath = join(stateRoot, attemptName);
    try {
      const fd = fs.openSync(targetPath, 'a', 0o600);
      try {
        fs.writeSync(fd, payload);
      } finally {
        fs.closeSync(fd);
      }
      return { written: true, path: targetPath };
    } catch {
      emitDiagnostic('monitor_write_failed');
      return { written: false, reason: 'write_failed' };
    }
  }

  function buildRecord(event, operationBody) {
    sequence += 1;
    return {
      schemaVersion: SCHEMA_VERSION,
      kind: OPERATION_RECORD_KIND,
      collectorSession,
      source: RECORD_SOURCE,
      scopeId,
      observedAt: operationBody.observedAt,
      monotonicNs: operationBody.monotonicNs,
      sequence,
      operation: {
        event,
        operationId: operationBody.operationId,
        ...(operationBody.parentOperationId
          ? { parentOperationId: operationBody.parentOperationId }
          : {}),
        ...(operationBody.phaseId ? { phaseId: operationBody.phaseId } : {}),
        ...(operationBody.parentPhaseId ? { parentPhaseId: operationBody.parentPhaseId } : {}),
        ...(operationBody.name ? { name: operationBody.name } : {}),
        ...(operationBody.phaseName ? { phaseName: operationBody.phaseName } : {}),
        ...(operationBody.result ? { result: operationBody.result } : {}),
        repoRef,
        ...(operationBody.changeId ? { changeId: operationBody.changeId } : {}),
        ...(devSlot ? { devSlot } : {}),
        ...(devContext ? { devContext } : {}),
        ...(devProfile ? { devProfile } : {}),
        ...(operationBody.git ? { git: operationBody.git } : {}),
        process: {
          pid,
          ...(starttimeTicks ? { starttimeTicks } : {}),
        },
        bootId,
      },
    };
  }

  function emit(event, body) {
    try {
      const secretCheck = rejectSecretFields({
        name: body.name ?? '',
        phaseName: body.phaseName ?? '',
        parentOperationId: body.parentOperationId ?? '',
      });
      if (!secretCheck.ok) {
        emitDiagnostic(secretCheck.reason);
        return { written: false, reason: secretCheck.reason };
      }
      const record = buildRecord(event, body);
      return writeRecord(record);
    } catch {
      emitDiagnostic('emit_internal_error');
      return { written: false, reason: 'emit_error' };
    }
  }

  /**
   * @param {object} input
   */
  function beginOperation(input = {}) {
    const rawName = String(input.name ?? input.operationName ?? 'operation');
    if (looksLikeSecret(rawName)) {
      emitDiagnostic('secret_like_name');
      return null;
    }
    const name = sanitizeBoundedLabel(rawName);
    if (!name) {
      emitDiagnostic('invalid_operation_name');
      return null;
    }

    const inheritedParent =
      typeof process.env.OFFSCREEN_MONITOR_OPERATION_ID === 'string'
        ? process.env.OFFSCREEN_MONITOR_OPERATION_ID.trim()
        : null;
    const parentOperationId =
      input.parentOperationId ??
      (inheritedParent && /^[0-9a-f-]{36}$/i.test(inheritedParent) ? inheritedParent : null);

    const operationId = input.operationId ?? randomUUID();
    const skipGit = Boolean(input.skipGit ?? deps.skipGit);
    const git =
      input.git ?? (skipGit ? null : readGitIdentityAtOperationBegin(repoRoot, deps.runGit));
    const changeId = resolveChangeId({
      approvedChangeId: input.changeId,
      branch: git?.branch,
    });

    let activePhaseId = null;
    let activePhaseName = null;
    let ended = false;

    const timestamps = {
      observedAt: observedAtUtc(clock, input.observedAt),
      monotonicNs: clock.monotonicNs(input.monotonicNs),
    };

    emit('start', {
      ...timestamps,
      operationId,
      parentOperationId,
      name,
      changeId,
      git,
    });

    function startPhase(phaseName, phaseOptions = {}) {
      if (ended) return null;
      if (looksLikeSecret(String(phaseName))) {
        emitDiagnostic('secret_like_phaseName');
        return null;
      }
      const safePhase = sanitizeBoundedLabel(phaseName);
      if (!safePhase) return null;
      const phaseId = randomUUID();
      activePhaseId = phaseId;
      activePhaseName = safePhase;
      emit('phase-start', {
        observedAt: observedAtUtc(clock, phaseOptions.observedAt),
        monotonicNs: clock.monotonicNs(phaseOptions.monotonicNs),
        operationId,
        parentOperationId,
        phaseId,
        parentPhaseId: phaseOptions.parentPhaseId ?? null,
        name,
        phaseName: safePhase,
        changeId,
      });
      return phaseId;
    }

    function endPhase(resultCode, phaseOptions = {}) {
      if (ended || !activePhaseId) return { written: false, reason: 'no_active_phase' };
      const phaseId = activePhaseId;
      const phaseName = activePhaseName;
      activePhaseId = null;
      activePhaseName = null;
      const result = sanitizeResultCode(resultCode) ?? 'success';
      return emit('phase-end', {
        observedAt: observedAtUtc(clock, phaseOptions.observedAt),
        monotonicNs: clock.monotonicNs(phaseOptions.monotonicNs),
        operationId,
        parentOperationId,
        phaseId,
        parentPhaseId: phaseOptions.parentPhaseId ?? null,
        name,
        phaseName,
        result,
        changeId,
      });
    }

    function finish(resultCode, terminalOptions = {}) {
      if (ended) return { written: false, reason: 'already_terminal' };
      ended = true;
      const result = sanitizeResultCode(resultCode) ?? 'success';
      return emit('end', {
        observedAt: observedAtUtc(clock, terminalOptions.observedAt),
        monotonicNs: clock.monotonicNs(terminalOptions.monotonicNs),
        operationId,
        parentOperationId,
        name,
        result,
        changeId,
      });
    }

    function fail(resultCode, terminalOptions = {}) {
      if (ended) return { written: false, reason: 'already_terminal' };
      ended = true;
      const result = sanitizeResultCode(resultCode) ?? 'failure';
      return emit('failure', {
        observedAt: observedAtUtc(clock, terminalOptions.observedAt),
        monotonicNs: clock.monotonicNs(terminalOptions.monotonicNs),
        operationId,
        parentOperationId,
        name,
        result,
        changeId,
      });
    }

    function rollback(resultCode, terminalOptions = {}) {
      if (ended) return { written: false, reason: 'already_terminal' };
      ended = true;
      const result = sanitizeResultCode(resultCode) ?? 'rollback';
      return emit('rollback', {
        observedAt: observedAtUtc(clock, terminalOptions.observedAt),
        monotonicNs: clock.monotonicNs(terminalOptions.monotonicNs),
        operationId,
        parentOperationId,
        name,
        result,
        changeId,
      });
    }

    return {
      operationId,
      name,
      startPhase,
      endPhase,
      finish,
      fail,
      rollback,
      childEnv() {
        return { OFFSCREEN_MONITOR_OPERATION_ID: operationId };
      },
    };
  }

  return {
    stateRoot,
    scopeId,
    collectorSession,
    beginOperation,
    emit,
    get lastDiagnostic() {
      return lastDiagnostic;
    },
    resetDiagnosticForTests() {
      diagnosticEmitted = false;
      lastDiagnostic = '';
    },
  };
}

export function childOperationEnv(operationId) {
  if (typeof operationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(operationId)) {
    return {};
  }
  return { OFFSCREEN_MONITOR_OPERATION_ID: operationId };
}