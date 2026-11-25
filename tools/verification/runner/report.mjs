import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { diagnosticExcerpt } from '../../../infra/verification/diagnostic-engine.mjs';

export const REPORT_SCHEMA_VERSION = 1;
export const SECRET_SENTINEL =
  'authorization Bearer SUPERSECRET-should-never-appear-in-report';
export const PUBLIC_STATUSES = Object.freeze([
  'PASS',
  'FAIL',
  'BLOCKED',
  'NOT-RUN',
  'TIMEOUT',
]);

const STATIC_REASON_CODES = new Set([
  'timeout',
  'prerequisite-not-passed',
  'scenario-not-implemented',
  'resource-adapter-missing',
  'resource-acquire-failed',
  'resource-cleanup-failed',
  'interrupted',
  'invalid-child-result',
  'invalid-report-path',
  'section-blocked',
  'live-not-authorized',
]);

const MEASUREMENT_KEYS = new Set([
  'durationMs',
  'count',
  'pass',
  'fail',
  'tests',
  'exitCode',
  'availableKiB',
  'testsRan',
]);

/**
 * @param {string} repoRoot
 * @param {string} candidate
 */
export function validateChildReportPath(repoRoot, candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return { ok: false, reason: 'missing path' };
  }
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return { ok: false, reason: 'arbitrary URL refused' };
  }
  const absolute = resolve(repoRoot, candidate);
  const allowedRoot = resolve(repoRoot, '.offscreen', 'verification');
  if (absolute !== allowedRoot && !absolute.startsWith(allowedRoot + '/')) {
    return { ok: false, reason: 'report path outside verification directory' };
  }
  return { ok: true, path: absolute };
}

/**
 * @param {unknown} value
 */
export function sanitizePublicReason(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const excerpt = diagnosticExcerpt(value).trim();
  if (!excerpt) return null;
  if (STATIC_REASON_CODES.has(excerpt)) return excerpt;
  return excerpt.slice(0, 240);
}

/**
 * @param {Record<string, unknown>} measurements
 */
export function sanitizeMeasurements(measurements) {
  if (!measurements || typeof measurements !== 'object') return {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const [key, value] of Object.entries(measurements)) {
    if (!MEASUREMENT_KEYS.has(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * @param {unknown} raw
 */
export function normalizeEngineStatus(raw) {
  const status = typeof raw?.status === 'string' ? raw.status : 'FAIL';
  if (status === 'TIMEOUT') {
    return {
      engine: { status: 'FAIL', reason: 'timeout' },
      publicStatus: 'TIMEOUT',
      reasonCode: 'timeout',
    };
  }
  if (!['PASS', 'FAIL', 'BLOCKED', 'NOT-RUN'].includes(status)) {
    return {
      engine: { status: 'FAIL', reason: 'invalid-child-result' },
      publicStatus: 'FAIL',
      reasonCode: 'invalid-child-result',
    };
  }
  return {
    engine: { status, reason: raw?.reason ?? null },
    publicStatus: status,
    reasonCode:
      typeof raw?.reasonCode === 'string' &&
      STATIC_REASON_CODES.has(raw.reasonCode)
        ? raw.reasonCode
        : null,
  };
}

/**
 * Schema-validate and sanitize a child scenario row before it influences dependencies.
 * Strips raw error blobs and non-allowlisted evidence.
 *
 * @param {unknown} raw
 * @param {{ scenarioId: string, sectionId: string, tier: string }} context
 */
export function sanitizeChildScenarioResult(raw, context) {
  const normalized = normalizeEngineStatus(raw);
  const reason =
    typeof raw?.reason === 'string'
      ? sanitizePublicReason(raw.reason)
      : normalized.reasonCode;
  const measurements = sanitizeMeasurements(
    /** @type {Record<string, unknown>} */ (raw?.measurements ?? {}),
  );
  /** @type {Record<string, unknown>} */
  const row = {
    scenarioId: context.scenarioId,
    sectionId: context.sectionId,
    tier: context.tier,
    status: normalized.publicStatus,
    durationMs:
      typeof raw?.durationMs === 'number' && Number.isFinite(raw.durationMs)
        ? Math.max(0, Math.round(raw.durationMs))
        : 0,
    reason,
    reasonCode: normalized.reasonCode ?? reason,
    measurements,
  };
  if (typeof raw?.childReportPath === 'string') {
    row.childReportPath = raw.childReportPath;
  }
  return { ...row, engine: normalized.engine };
}

/**
 * @param {{
 *   repoRoot: string,
 *   subject: object,
 *   profile: string,
 *   live: boolean,
 *   revision?: string | null,
 *   dirty?: boolean | null,
 *   selectedSections: string[],
 * }} input
 */
export function createVerificationReport(input) {
  const dir = join(input.repoRoot, '.offscreen', 'verification');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const root = mkdtempSync(join(dir, 'run-'));
  const path = join(root, 'report.json');
  const startedAt = new Date().toISOString();
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    runId: randomUUID(),
    startedAt,
    finishedAt: null,
    revision: input.revision ?? null,
    dirty: input.dirty ?? null,
    subject: input.subject,
    profile: input.profile,
    live: input.live,
    selectedSections: [...input.selectedSections],
    complete: false,
    interrupted: false,
    scenarios: [],
    cleanup: [],
    counts: Object.fromEntries(PUBLIC_STATUSES.map((status) => [status, 0])),
    exitCode: 1,
    reportPath: path,
  };
  return { report, path, persist: () => persistReport(report, path) };
}

/**
 * @param {object} report
 * @param {string} path
 */
export function persistReport(report, path) {
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, path);
}

/**
 * @param {object} report
 * @param {object} row
 * @param {string} repoRoot
 */
export function appendScenarioRow(report, row, repoRoot) {
  if (typeof row.childReportPath === 'string') {
    const validated = validateChildReportPath(repoRoot, row.childReportPath);
    if (!validated.ok) {
      row.status = 'FAIL';
      row.reason = validated.reason;
      row.reasonCode = 'invalid-report-path';
      delete row.childReportPath;
    } else {
      row.childReportPath = validated.path.replace(repoRoot + '/', '');
    }
  }
  const stored = { ...row };
  delete stored.engine;
  report.scenarios.push(stored);
  recomputeCounts(report);
}

/**
 * @param {object} report
 * @param {{ resource: string, status: string, reason?: string | null }} entry
 */
export function appendCleanupEntry(report, entry) {
  report.cleanup.push({
    resource: entry.resource,
    status: entry.status,
    reason: entry.reason ? sanitizePublicReason(entry.reason) : null,
  });
}

/**
 * @param {object} report
 */
export function recomputeCounts(report) {
  for (const status of PUBLIC_STATUSES) {
    report.counts[status] = report.scenarios.filter(
      (row) => row.status === status,
    ).length;
  }
  const cleanupFailed = report.cleanup.some((row) => row.status === 'FAIL');
  const scenarioFailed = report.scenarios.some((row) =>
    ['FAIL', 'TIMEOUT', 'BLOCKED'].includes(row.status),
  );
  const notRun = report.scenarios.some((row) => row.status === 'NOT-RUN');
  report.exitCode =
    report.complete && !cleanupFailed && !scenarioFailed && !notRun ? 0 : 1;
}

/**
 * @param {object} report
 * @param {{ interrupted?: boolean }} [options]
 */
export function finalizeReport(report, options = {}) {
  report.finishedAt = new Date().toISOString();
  report.interrupted = Boolean(options.interrupted);
  report.complete = !options.interrupted;
  recomputeCounts(report);
}

/**
 * @param {object} report
 */
export function reportContainsForbiddenSecrets(report) {
  const text = JSON.stringify(report);
  return /bearer|password|secret.?token|api.?key|connection.?string/i.test(
    text,
  );
}
