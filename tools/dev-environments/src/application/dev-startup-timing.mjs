/**
 * Wall-clock phases for one dev startup.
 * Nested phases keep their own duration. Exclusive time subtracts direct children
 * so a parent and its children are not added together unless siblings overlap.
 */
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  childOperationEnv,
  createOperationEventWriter,
} from '../../../../infra/monitoring/operation-event.mjs';

export { childOperationEnv };

/** @typedef {{
 *   path: string,
 *   startedAt: string,
 *   origin: number,
 *   phases: object[],
 *   operationId: string,
 *   operation: ReturnType<ReturnType<typeof createOperationEventWriter>['beginOperation']> | null,
 *   operationTerminalEmitted: boolean,
 *   openPhases: Map<string, { phaseId: string, parentPhaseId: string | null, parentHintApproximate: boolean }>,
 *   writer: ReturnType<typeof createOperationEventWriter>,
 * }} ActiveTiming */

/** @type {ActiveTiming | null} */
let active = null;

/** @type {ReturnType<typeof createOperationEventWriter> | null} */
let sharedWriter = null;

/** @type {ReturnType<ReturnType<typeof createOperationEventWriter>['beginOperation']> | null} */
let rollbackSpan = null;

function writerDeps() {
  return {};
}

function getSharedWriter() {
  if (!sharedWriter) {
    sharedWriter = createOperationEventWriter(writerDeps());
  }
  return sharedWriter;
}

/**
 * @param {string} name
 * @param {{ parentOperationId?: string | null }} [options]
 */
export function beginMonitorOperation(name, options = {}) {
  return getSharedWriter().beginOperation({
    name,
    skipGit: true,
    parentOperationId: options.parentOperationId ?? null,
  });
}

export function getStartupOperationId() {
  return active?.operationId ?? null;
}

export function beginRollbackMonitorSpan(parentOperationId) {
  const parent = parentOperationId ?? active?.operationId ?? null;
  rollbackSpan = beginMonitorOperation('dev.rollback', { parentOperationId: parent });
  return rollbackSpan;
}

export function endRollbackMonitorSpan(parkOk = false) {
  if (!rollbackSpan) return;
  if (parkOk) rollbackSpan.finish('success');
  else rollbackSpan.rollback('rollback');
  rollbackSpan = null;
}

/**
 * @param {string} outcome
 */
export function emitStartupOutcomeBeforeCleanup(outcome) {
  if (!active?.operation || active.operationTerminalEmitted) return;
  active.operationTerminalEmitted = true;
  if (successStartupOutcome(outcome)) {
    active.operation.finish('success');
    return;
  }
  if (String(outcome).startsWith('refused')) {
    active.operation.fail('refused');
    return;
  }
  if (String(outcome).startsWith('signal:')) {
    active.operation.fail('cancelled');
    return;
  }
  active.operation.fail('failure');
}

function successStartupOutcome(outcome) {
  return outcome === 'six-roles-ready' || outcome === 'ok' || outcome === 'test';
}

function mapOperationResult(outcome) {
  if (successStartupOutcome(outcome)) return 'success';
  if (String(outcome).startsWith('refused')) return 'refused';
  if (String(outcome).startsWith('signal:')) return 'cancelled';
  return 'failure';
}

function monoNowNs() {
  return process.hrtime.bigint();
}

function wallNowIso() {
  return new Date().toISOString();
}

/**
 * @param {'phase-start' | 'phase-end'} event
 * @param {Record<string, unknown>} fields
 */
function emitTimelinePhase(event, fields) {
  if (!active?.writer || !active.operationId) return;
  active.writer.emit(event, {
    operationId: active.operationId,
    name: 'dev.startup',
    ...fields,
  });
}

/**
 * @param {string | null} parentName
 * @param {{ allowApproximate?: boolean }} [options]
 */
function resolveParentPhaseId(parentName, options = {}) {
  if (!parentName || !active) return { parentPhaseId: null, parentHintApproximate: false };
  const direct = active.openPhases.get(parentName);
  if (direct) {
    return {
      parentPhaseId: direct.phaseId,
      parentHintApproximate: false,
    };
  }
  for (const phase of active.phases) {
    if (phase.name === parentName && phase.phaseId) {
      return { parentPhaseId: phase.phaseId, parentHintApproximate: false };
    }
  }
  if (options.allowApproximate !== false && parentName) {
    return { parentPhaseId: null, parentHintApproximate: true };
  }
  return { parentPhaseId: null, parentHintApproximate: false };
}

export function beginStartupTiming(receiptPath, options = {}) {
  const writer = options.writer ?? getSharedWriter();
  const operation =
    writer.beginOperation({
      name: 'dev.startup',
      skipGit: options.skipGit ?? false,
    }) ?? null;
  const operationId = operation?.operationId ?? randomUUID();
  active = {
    path: receiptPath,
    startedAt: wallNowIso(),
    origin: performance.now(),
    phases: [],
    operationId,
    operation,
    operationTerminalEmitted: false,
    openPhases: new Map(),
    writer,
  };
  const childPath = `${receiptPath}.phases.jsonl`;
  rmSync(childPath, { force: true });
  process.env.OFFSCREEN_STARTUP_TIMING = childPath;
  for (const [key, value] of Object.entries(childOperationEnv(operationId))) {
    process.env[key] = value;
  }
}

export function startupTimingActive() {
  return active !== null;
}

/**
 * @param {string} name
 * @param {string | null} parent
 * @param {(note: (extra: object) => void) => unknown} fn
 */
export async function timePhase(name, parent, fn) {
  if (!active) {
    return fn(() => {});
  }
  const phaseId = randomUUID();
  const parentLink = resolveParentPhaseId(parent, { allowApproximate: true });
  const startedAt = wallNowIso();
  const monotonicStartNs = monoNowNs();
  active.openPhases.set(name, {
    phaseId,
    parentPhaseId: parentLink.parentPhaseId,
    parentHintApproximate: parentLink.parentHintApproximate,
  });
  emitTimelinePhase('phase-start', {
    observedAt: startedAt,
    monotonicNs: monotonicStartNs.toString(),
    phaseId,
    parentPhaseId: parentLink.parentPhaseId,
    phaseName: name,
  });
  /** @type {object} */
  let extra = {};
  let failed = false;
  try {
    return await fn((value) => {
      extra = { ...extra, ...value };
    });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const monotonicEndNs = monoNowNs();
    const finishedAt = wallNowIso();
    const durationMs = Number(monotonicEndNs - monotonicStartNs) / 1e6;
    emitTimelinePhase('phase-end', {
      observedAt: finishedAt,
      monotonicNs: monotonicEndNs.toString(),
      phaseId,
      parentPhaseId: parentLink.parentPhaseId,
      phaseName: name,
      result: failed ? 'failure' : 'success',
    });
    if (active.openPhases.get(name)?.phaseId === phaseId) {
      active.openPhases.delete(name);
    }
    pushPhase({
      name,
      parent,
      ms: Math.max(0, Math.round(durationMs)),
      operationId: active.operationId,
      phaseId,
      parentPhaseId: parentLink.parentPhaseId,
      parentHintApproximate: parentLink.parentHintApproximate || undefined,
      startedAt,
      finishedAt,
      monotonicStartNs: monotonicStartNs.toString(),
      monotonicEndNs: monotonicEndNs.toString(),
      measuredStart: true,
      ...sanitize(extra),
    });
  }
}

export function recordPhase(name, parent, durationMs, extra = {}) {
  if (!active) return;
  const parentLink = resolveParentPhaseId(parent, { allowApproximate: true });
  const finishedAt = wallNowIso();
  const monotonicEndNs = monoNowNs();
  const roundedMs = Math.max(0, Math.round(durationMs));
  const monotonicStartNs = monotonicEndNs - BigInt(Math.round(roundedMs * 1_000_000));
  const startedAtEstimated = new Date(
    Date.parse(finishedAt) - roundedMs,
  ).toISOString();
  const phaseId = randomUUID();
  pushPhase({
    name,
    parent,
    ms: roundedMs,
    operationId: active.operationId,
    phaseId,
    parentPhaseId: parentLink.parentPhaseId,
    parentHintApproximate: parentLink.parentHintApproximate || undefined,
    startedAtEstimated,
    finishedAt,
    monotonicStartNs: monotonicStartNs.toString(),
    monotonicEndNs: monotonicEndNs.toString(),
    startEstimated: true,
    ...sanitize(extra),
  });
}

/**
 * @param {Record<string, unknown>} phase
 */
function pushPhase(phase) {
  if (!active) return;
  active.phases.push(phase);
}

function sanitize(extra) {
  const text = JSON.stringify(extra);
  if (/password|secret|token|api[_-]?key/i.test(text)) return { redacted: true };
  return extra;
}

function intervalsOverlap(a, b) {
  const aStart = Date.parse(a.startedAt ?? a.startedAtEstimated ?? '');
  const aEnd = Date.parse(a.finishedAt ?? '');
  const bStart = Date.parse(b.startedAt ?? b.startedAtEstimated ?? '');
  const bEnd = Date.parse(b.finishedAt ?? '');
  if ([aStart, aEnd, bStart, bEnd].some((value) => Number.isNaN(value))) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function exclusiveDurations(phases) {
  return phases.map((phase) => {
    const children = phases.filter((other) => other.parent === phase.name);
    const siblingOverlap =
      children.length > 1 &&
      children.some(
        (left, index) =>
          children.slice(index + 1).some((right) => intervalsOverlap(left, right)),
      );
    if (siblingOverlap) {
      return {
        ...phase,
        exclusiveMs: phase.ms,
        exclusiveApproximate: true,
      };
    }
    const childMs = children.reduce((sum, child) => sum + child.ms, 0);
    return { ...phase, exclusiveMs: Math.max(0, phase.ms - childMs) };
  });
}

/**
 * @param {unknown} value
 */
function normalizeChildPhase(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = /** @type {Record<string, unknown>} */ (value);
  const name = typeof record.name === 'string' ? record.name : null;
  if (!name) return null;
  const parent = typeof record.parent === 'string' ? record.parent : null;
  const ms = Number(record.ms);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const normalized = {
    name,
    parent,
    ms: Math.max(0, Math.round(ms)),
    ...(typeof record.cache === 'string' ? { cache: record.cache } : {}),
    ...(typeof record.operationId === 'string' ? { operationId: record.operationId } : {}),
    ...(typeof record.phaseId === 'string' ? { phaseId: record.phaseId } : {}),
    ...(typeof record.parentPhaseId === 'string'
      ? { parentPhaseId: record.parentPhaseId }
      : {}),
    ...(record.parentHintApproximate === true ? { parentHintApproximate: true } : {}),
    ...(typeof record.startedAt === 'string' ? { startedAt: record.startedAt, measuredStart: true } : {}),
    ...(typeof record.finishedAt === 'string' ? { finishedAt: record.finishedAt } : {}),
    ...(typeof record.startedAtEstimated === 'string'
      ? { startedAtEstimated: record.startedAtEstimated, startEstimated: true }
      : {}),
    ...(typeof record.monotonicStartNs === 'string'
      ? { monotonicStartNs: record.monotonicStartNs }
      : {}),
    ...(typeof record.monotonicEndNs === 'string'
      ? { monotonicEndNs: record.monotonicEndNs }
      : {}),
  };
  if (
    !normalized.parentPhaseId &&
    parent &&
    record.parentHintApproximate !== false
  ) {
    normalized.parentHintApproximate = true;
  }
  return sanitize(normalized);
}

function readChildPhases(path) {
  let text;
  try {
    text = readFileSync(`${path}.phases.jsonl`, 'utf8');
  } catch {
    return [];
  }
  const rawLines = text.split('\n');
  /** @type {object[]} */
  const phases = [];
  const seenPhaseIds = new Set();
  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index];
    if (!line.trim()) continue;
    const isLast = index === rawLines.length - 1;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      if (isLast) continue;
      continue;
    }
    const phase = normalizeChildPhase(parsed);
    if (!phase) continue;
    const dedupeKey =
      typeof phase.phaseId === 'string'
        ? phase.phaseId
        : `${phase.name}:${phase.startedAt ?? phase.startedAtEstimated ?? index}`;
    if (seenPhaseIds.has(dedupeKey)) continue;
    seenPhaseIds.add(dedupeKey);
    phases.push(phase);
  }
  return phases;
}

export function finishStartupTiming(outcome) {
  if (!active) return null;
  if (active.operation && !active.operationTerminalEmitted) {
    active.operationTerminalEmitted = true;
    const result = mapOperationResult(outcome);
    if (result === 'success') active.operation.finish('success');
    else if (result === 'refused') active.operation.fail('refused');
    else if (result === 'cancelled') active.operation.fail('cancelled');
    else active.operation.fail('failure');
  }
  const phases = exclusiveDurations([...active.phases, ...readChildPhases(active.path)]);
  const receipt = {
    startedAt: active.startedAt,
    finishedAt: wallNowIso(),
    elapsedMs: Math.round(performance.now() - active.origin),
    outcome,
    operationId: active.operationId,
    phases,
  };
  mkdirSync(dirname(active.path), { recursive: true });
  writeFileSync(active.path, `${JSON.stringify(receipt, null, 2)}\n`);
  const lines = phases.map(
    (phase) =>
      `${phase.name} ${phase.ms}ms wall, ${phase.exclusiveMs}ms exclusive${phase.cache ? ` cache=${phase.cache}` : ''}`,
  );
  console.log(`startup timing ${active.path}\n${lines.join('\n')}`);
  active = null;
  rollbackSpan = null;
  delete process.env.OFFSCREEN_STARTUP_TIMING;
  return receipt;
}

export function appendTimingLine(file, phase) {
  appendFileSync(file, `${JSON.stringify(phase)}\n`);
}

/** Reset shared writer for isolated tests. */
export function resetStartupTimingForTests() {
  active = null;
  rollbackSpan = null;
  sharedWriter = null;
  delete process.env.OFFSCREEN_STARTUP_TIMING;
  delete process.env.OFFSCREEN_MONITOR_OPERATION_ID;
}