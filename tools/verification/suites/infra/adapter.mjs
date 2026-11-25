import { join, relative } from 'node:path';
import { runCommand } from '../../../../infra/verification/diagnostic-engine.mjs';
import {
  INFRA_SECTION_BY_ID,
  infraScenarioHasFixtureProof,
} from './manifest.mjs';

const ALLOWED_CHILD_SUITES = new Set(['source', 'diagnostic']);
const VERIFY_ENTRY = 'infra/verification/verify.mjs';

/**
 * @param {string} stderr
 */
export function extractChildReportPath(stderr) {
  if (typeof stderr !== 'string' || stderr.length === 0) return null;
  const diagnostic = /Diagnostic report:\s+(.+)/m.exec(stderr);
  if (diagnostic) return diagnostic[1].trim();
  const report = /Report:\s+(.+)/m.exec(stderr);
  if (report) return report[1].trim();
  return null;
}

/**
 * Parse explicit JSON child output only; never infer from unstructured text.
 *
 * @param {string} stdout
 */
export function parseInfraChildReport(stdout) {
  if (typeof stdout !== 'string' || stdout.trim().length === 0) {
    return { ok: false, reason: 'empty child stdout' };
  }
  try {
    const parsed = JSON.parse(stdout);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, reason: 'child json was not an object' };
    }
    return { ok: true, report: parsed };
  } catch {
    return { ok: false, reason: 'child stdout was not valid json' };
  }
}

/**
 * @param {{ status?: string, reason?: string | null, detail?: string | null }} outcome
 */
function engineChildOutcome(outcome) {
  const status = outcome.status ?? 'FAIL';
  if (!['PASS', 'FAIL', 'BLOCKED', 'NOT-RUN', 'TIMEOUT'].includes(status)) {
    return {
      status: 'FAIL',
      reason: 'invalid-child-result',
      reasonCode: 'invalid-child-result',
    };
  }
  return {
    status,
    reason: typeof outcome.reason === 'string' ? outcome.reason : null,
    reasonCode: typeof outcome.reason === 'string' ? outcome.reason : null,
  };
}

/**
 * @param {string} sourceCoverage
 */
function mapSourceCoverage(sourceCoverage) {
  if (sourceCoverage === 'COVERED') return { status: 'PASS' };
  if (sourceCoverage === 'BLOCKED') return { status: 'BLOCKED' };
  if (sourceCoverage === 'GAP') return { status: 'FAIL', reason: 'source-gap' };
  if (sourceCoverage === 'NOT-RUN') {
    return { status: 'NOT-RUN', reason: 'not-in-source-suite' };
  }
  return {
    status: 'FAIL',
    reason: 'invalid-child-result',
    reasonCode: 'invalid-child-result',
  };
}

/**
 * @param {Array<{ status?: string }>} observations
 */
function aggregateObservationStatus(observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return { status: 'NOT-RUN', reason: 'no-observations' };
  }
  const statuses = observations.map((row) => row.status ?? 'FAIL');
  if (statuses.some((status) => status === 'FAIL' || status === 'TIMEOUT')) {
    return { status: 'FAIL', reason: 'fixture-observation-failed' };
  }
  if (statuses.some((status) => status === 'BLOCKED')) {
    return { status: 'BLOCKED', reason: 'fixture-blocked' };
  }
  if (statuses.every((status) => status === 'PASS')) {
    return { status: 'PASS' };
  }
  return {
    status: 'FAIL',
    reason: 'invalid-child-result',
    reasonCode: 'invalid-child-result',
  };
}

/**
 * @param {'source' | 'diagnostic'} childSuite
 * @param {object} childReport
 * @param {string} scenarioId
 * @param {boolean} live
 */
export function mapInfraScenarioFromChild(childSuite, childReport, scenarioId, live) {
  if (childSuite === 'source') {
    const scenarios = Array.isArray(childReport.scenarios)
      ? childReport.scenarios
      : [];
    const row = scenarios.find((entry) => entry.id === scenarioId);
    if (!row) {
      return {
        status: 'NOT-RUN',
        reason: 'missing-scenario-in-child-report',
        reasonCode: 'missing-scenario-in-child-report',
      };
    }
    if (row.sourceCoverage) {
      return mapSourceCoverage(row.sourceCoverage);
    }
    if (row.liveStatus === 'NOT-RUN') {
      return { status: 'NOT-RUN', reason: 'live-not-run' };
    }
    return {
      status: 'FAIL',
      reason: 'invalid-child-result',
      reasonCode: 'invalid-child-result',
    };
  }

  const capabilities = Array.isArray(childReport.capabilities)
    ? childReport.capabilities
    : [];
  const capability = capabilities.find((entry) => entry.id === scenarioId);
  const fixtureBacked = infraScenarioHasFixtureProof(scenarioId);
  if (!capability) {
    return {
      status: 'NOT-RUN',
      reason: 'missing-scenario-in-child-report',
      reasonCode: 'missing-scenario-in-child-report',
    };
  }

  if (!fixtureBacked) {
    const hasObservations =
      Array.isArray(capability.observations) &&
      capability.observations.length > 0;
    return {
      status: 'NOT-RUN',
      reason: hasObservations
        ? 'live-acceptance-not-run'
        : 'live-not-authorized',
      reasonCode: 'live-not-authorized',
    };
  }

  return engineChildOutcome(
    aggregateObservationStatus(capability.observations),
  );
}

/**
 * @param {{
 *   repoRoot: string,
 *   childSuite: 'source' | 'diagnostic',
 *   run?: typeof runCommand,
 *   timeoutMs?: number,
 *   progress?: (chunk: string) => void,
 * }} options
 */
export async function invokeInfraVerifyChild(options) {
  if (!ALLOWED_CHILD_SUITES.has(options.childSuite)) {
    return {
      ok: false,
      reason: 'invalid-child-suite',
      outcome: {
        status: 'FAIL',
        reason: 'invalid-child-suite',
        reasonCode: 'invalid-child-suite',
      },
    };
  }

  const run = options.run ?? runCommand;
  const args = [
    VERIFY_ENTRY,
    '--suite',
    options.childSuite,
    '--json',
  ];
  const started = Date.now();
  const result = await run(process.execPath, args, {
    cwd: options.repoRoot,
    timeoutMs: options.timeoutMs,
  });
  const durationMs = Math.max(0, Date.now() - started);
  const stderr = `${result.stderr ?? ''}`;
  options.progress?.(stderr);

  if (result.reason === 'timeout') {
    return {
      ok: false,
      durationMs,
      outcome: {
        status: 'TIMEOUT',
        reason: 'timeout',
        reasonCode: 'timeout',
      },
    };
  }

  const parsed = parseInfraChildReport(result.stdout ?? '');
  if (!parsed.ok) {
    return {
      ok: false,
      durationMs,
      outcome: {
        status: 'FAIL',
        reason: 'invalid-child-result',
        reasonCode: 'invalid-child-result',
      },
    };
  }

  const childReportPath = extractChildReportPath(stderr);
  return {
    ok: true,
    durationMs,
    childSuite: options.childSuite,
    childReport: parsed.report,
    childReportPath,
    exitCode: result.code,
  };
}

/**
 * @param {object} plan
 * @param {{
 *   repoRoot: string,
 *   run?: typeof runCommand,
 *   progress?: (chunk: string) => void,
 * }} deps
 */
export function createInfraScenarioRunner(plan, deps) {
  /** @type {Map<string, Promise<object>>} */
  const inflight = new Map();
  /** @type {Map<string, object>} */
  const resolved = new Map();

  /**
   * @param {string} sectionId
   */
  async function loadSectionChild(sectionId) {
    if (resolved.has(sectionId)) return resolved.get(sectionId);
    if (inflight.has(sectionId)) return inflight.get(sectionId);

    const definition = INFRA_SECTION_BY_ID.get(sectionId);
    const pending = (async () => {
      if (!definition) {
        return {
          ok: false,
          outcome: {
            status: 'FAIL',
            reason: 'unknown-section',
            reasonCode: 'unknown-section',
          },
        };
      }
      return invokeInfraVerifyChild({
        repoRoot: deps.repoRoot,
        childSuite: definition.childSuite,
        timeoutMs: definition.timeoutMs,
        run: deps.run,
        progress: deps.progress,
      });
    })();
    inflight.set(sectionId, pending);
    const child = await pending;
    resolved.set(sectionId, child);
    return child;
  }

  return async function runInfraScenario({ section, scenarioId, runContext }) {
    const child = await loadSectionChild(section.id);
    const durationMs =
      typeof child.durationMs === 'number' ? child.durationMs : 0;

    if (!child.ok) {
      return { ...child.outcome, durationMs };
    }

    const mapped = mapInfraScenarioFromChild(
      child.childSuite,
      child.childReport,
      scenarioId,
      Boolean(runContext.live),
    );
    const row = { ...engineChildOutcome(mapped), durationMs };
    if (child.childReportPath && scenarioId === section.scenarioIds[0]) {
      const absolute = child.childReportPath.startsWith(deps.repoRoot)
        ? child.childReportPath
        : join(deps.repoRoot, child.childReportPath);
      row.childReportPath = relative(deps.repoRoot, absolute).replace(/\\/g, '/');
    }
    return row;
  };
}

/**
 * @param {object} catalogPlan
 * @param {object} deps
 */
export function buildInfraVerificationDeps(catalogPlan, deps) {
  if (catalogPlan.subject?.kind !== 'infra') {
    return deps;
  }
  return {
    ...deps,
    runScenario: createInfraScenarioRunner(catalogPlan, deps),
  };
}