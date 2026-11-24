/**
 * Wall-clock phases for one dev startup.
 * Nested phases keep their own duration. Exclusive time subtracts direct children
 * so a parent and its children are not added together.
 */
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { dirname } from 'node:path';

/** @type {null | { path: string, startedAt: string, origin: number, phases: object[] }} */
let active = null;

export function beginStartupTiming(receiptPath) {
  active = {
    path: receiptPath,
    startedAt: new Date().toISOString(),
    origin: performance.now(),
    phases: [],
  };
  const childPath = `${receiptPath}.phases.jsonl`;
  rmSync(childPath, { force: true });
  process.env.OFFSCREEN_STARTUP_TIMING = childPath;
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
  const started = performance.now();
  /** @type {object} */
  let extra = {};
  try {
    return await fn((value) => {
      extra = { ...extra, ...value };
    });
  } finally {
    recordPhase(name, parent, performance.now() - started, extra);
  }
}

export function recordPhase(name, parent, durationMs, extra = {}) {
  if (!active) return;
  active.phases.push({
    name,
    parent,
    ms: Math.max(0, Math.round(durationMs)),
    ...sanitize(extra),
  });
}

function sanitize(extra) {
  const text = JSON.stringify(extra);
  if (/password|secret|token|api[_-]?key/i.test(text)) return { redacted: true };
  return extra;
}

export function exclusiveDurations(phases) {
  return phases.map((phase) => {
    // Nested phases finish, and are recorded, before their parent.
    // Match on parent name rather than later position so exclusive time
    // still subtracts those children once.
    const childMs = phases
      .filter((other) => other.parent === phase.name)
      .reduce((sum, child) => sum + child.ms, 0);
    return { ...phase, exclusiveMs: Math.max(0, phase.ms - childMs) };
  });
}

function readChildPhases(path) {
  try {
    return readFileSync(`${path}.phases.jsonl`, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function finishStartupTiming(outcome) {
  if (!active) return null;
  const phases = exclusiveDurations([...active.phases, ...readChildPhases(active.path)]);
  const receipt = {
    startedAt: active.startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - active.origin),
    outcome,
    phases,
  };
  mkdirSync(dirname(active.path), { recursive: true });
  writeFileSync(active.path, `${JSON.stringify(receipt, null, 2)}\n`);
  const lines = phases.map((phase) => `${phase.name} ${phase.ms}ms wall, ${phase.exclusiveMs}ms exclusive${phase.cache ? ` cache=${phase.cache}` : ''}`);
  console.log(`startup timing ${active.path}\n${lines.join('\n')}`);
  active = null;
  return receipt;
}

export function appendTimingLine(file, phase) {
  appendFileSync(file, `${JSON.stringify(phase)}\n`);
}
