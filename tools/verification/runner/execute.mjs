import { performance } from 'node:perf_hooks';
import process from 'node:process';
import {
  commandOutcome,
  diagnosticExcerpt,
  executeChecks,
  runCommand,
} from '../../../infra/verification/diagnostic-engine.mjs';
import { materializeExecutionPlan } from './plan.mjs';
import {
  appendCleanupEntry,
  appendScenarioRow,
  createVerificationReport,
  finalizeReport,
  normalizeEngineStatus,
  sanitizeChildScenarioResult,
} from './report.mjs';

export const DEFAULT_COMMAND_TIMEOUT_MS = 15_000;
export const SHUTDOWN_GRACE_MS = 5_000;

/**
 * @typedef {object} LiveResourceAdapter
 * @property {(requirement: object, runContext: object) => Promise<{publicFacts: object, privateHandle: unknown, release: () => Promise<void>}>} acquire
 */

/**
 * @param {object} requirement
 * @param {object} runContext
 * @param {Record<string, LiveResourceAdapter>} adapters
 */
export async function acquireLiveResource(requirement, runContext, adapters) {
  if (!runContext.live) {
    throw new Error('resource acquire refused without --live');
  }
  const adapter = adapters[requirement.kind];
  if (!adapter) {
    return null;
  }
  return adapter.acquire(requirement, runContext);
}

/**
 * @param {string} resource
 */
export function resourceRequirementFromSpec(resource) {
  const [kind, profile] = resource.split(':');
  return { kind, profile, access: 'owned' };
}

async function executeSectionWithCleanup(section, runContext) {
  const handles = [];
  const scenarioRows = [];
  /** @type {Array<{ resource: string, status: string, reason: string | null }>} */
  const cleanup = [];

  const skippedWithoutLive =
    !runContext.live &&
    section.tier !== 'SOURCE' &&
    (section.resources?.length ?? 0) > 0;

  if (skippedWithoutLive) {
    for (const scenarioId of section.scenarioIds) {
      scenarioRows.push(
        sanitizeChildScenarioResult(
          {
            status: 'NOT-RUN',
            reason: 'live-not-authorized',
            reasonCode: 'live-not-authorized',
          },
          { scenarioId, sectionId: section.id, tier: section.tier },
        ),
      );
    }
    return {
      engine: { status: 'NOT-RUN', reason: 'live-not-authorized' },
      scenarios: scenarioRows,
      cleanup,
    };
  }

  try {
    const needsLiveResource =
      runContext.live &&
      section.tier !== 'SOURCE' &&
      (section.resources?.length ?? 0) > 0;
    if (needsLiveResource) {
      for (const resource of section.resources ?? []) {
        const requirement = resourceRequirementFromSpec(resource);
        const lease = await acquireLiveResource(
          requirement,
          runContext,
          runContext.adapters,
        );
        if (!lease) {
          for (const scenarioId of section.scenarioIds) {
            scenarioRows.push(
              sanitizeChildScenarioResult(
                {
                  status: 'NOT-RUN',
                  reason: 'resource-adapter-missing',
                  reasonCode: 'resource-adapter-missing',
                },
                { scenarioId, sectionId: section.id, tier: section.tier },
              ),
            );
          }
          return {
            engine: { status: 'NOT-RUN', reason: 'resource-adapter-missing' },
            scenarios: scenarioRows,
            cleanup,
          };
        }
        handles.push({ resource, lease });
      }
    }

    for (const scenarioId of section.scenarioIds) {
      if (runContext.interrupted) {
        scenarioRows.push(
          sanitizeChildScenarioResult(
            {
              status: 'NOT-RUN',
              reason: 'interrupted',
              reasonCode: 'interrupted',
            },
            { scenarioId, sectionId: section.id, tier: section.tier },
          ),
        );
        continue;
      }

      const raw = await runContext.runScenario?.({
        section,
        scenarioId,
        runContext,
        handles,
      });
      scenarioRows.push(
        sanitizeChildScenarioResult(
          raw ?? {
            status: 'NOT-RUN',
            reason: 'scenario-not-implemented',
            reasonCode: 'scenario-not-implemented',
          },
          { scenarioId, sectionId: section.id, tier: section.tier },
        ),
      );
    }
  } catch (error) {
    for (const scenarioId of section.scenarioIds) {
      if (!scenarioRows.some((row) => row.scenarioId === scenarioId)) {
        scenarioRows.push(
          sanitizeChildScenarioResult(
            {
              status: 'FAIL',
              reason: 'resource-acquire-failed',
              reasonCode: 'resource-acquire-failed',
            },
            { scenarioId, sectionId: section.id, tier: section.tier },
          ),
        );
      }
    }
    return {
      engine: {
        status: 'FAIL',
        reason: 'resource-acquire-failed',
        detail: diagnosticExcerpt(
          error instanceof Error ? error.message : 'acquire failed',
        ),
      },
      scenarios: scenarioRows,
      cleanup,
    };
  } finally {
    for (const owned of handles.reverse()) {
      let status = 'PASS';
      let reason = null;
      try {
        await owned.lease.release();
      } catch (error) {
        status = 'FAIL';
        reason = diagnosticExcerpt(
          error instanceof Error ? error.message : 'cleanup failed',
        );
      }
      cleanup.push({ resource: owned.resource, status, reason });
    }
  }

  const statuses = scenarioRows.map((row) => row.engine.status);
  const engineStatus = statuses.every((status) => status === 'PASS')
    ? 'PASS'
    : statuses.includes('FAIL')
      ? 'FAIL'
      : statuses.includes('BLOCKED')
        ? 'BLOCKED'
        : statuses.includes('NOT-RUN')
          ? 'NOT-RUN'
          : 'FAIL';
  return { engine: { status: engineStatus }, scenarios: scenarioRows, cleanup };
}

function sectionEngineResult(sectionResult) {
  const normalized = normalizeEngineStatus(sectionResult.engine);
  return normalized.engine;
}

/**
 * @param {object} catalogPlan
 * @param {{
 *   repoRoot: string,
 *   adapters?: Record<string, LiveResourceAdapter>,
 *   run?: typeof runCommand,
 *   runScenario?: Function,
 *   now?: () => number,
 *   progress?: (chunk: string) => void,
 *   revision?: string | null,
 *   dirty?: boolean | null,
 * }} deps
 */
export async function runVerification(catalogPlan, deps) {
  const materialized = materializeExecutionPlan(catalogPlan);
  if (!materialized.ok) {
    return { ok: false, exitCode: 2, message: materialized.message };
  }

  const plan = materialized.plan;
  const runContext = {
    repoRoot: deps.repoRoot,
    live: plan.live,
    adapters: deps.adapters ?? {},
    run: deps.run ?? runCommand,
    runScenario: deps.runScenario,
    interrupted: false,
    runId: null,
  };

  const { report, path, persist } = createVerificationReport({
    repoRoot: deps.repoRoot,
    subject: plan.subject,
    profile: plan.profile,
    live: plan.live,
    revision: deps.revision ?? null,
    dirty: deps.dirty ?? null,
    selectedSections: plan.sections.map((row) => row.id),
  });
  runContext.runId = report.runId;

  const progress = deps.progress ?? ((chunk) => process.stderr.write(chunk));
  progress(`Verification report: ${path}\n`);

  const checks = plan.sections.map((section) => ({
    id: section.id,
    tier: section.tier,
    requires: section.requires,
    capability: null,
    command: null,
    async run() {
      const start = (deps.now ?? (() => performance.now()))();
      const sectionResult = await executeSectionWithCleanup(
        section,
        runContext,
      );
      for (const scenario of sectionResult.scenarios) {
        appendScenarioRow(report, scenario, deps.repoRoot);
        persist();
        progress(
          `${scenario.status} ${section.id}/${scenario.scenarioId} (${scenario.durationMs}ms)\n`,
        );
      }
      for (const entry of sectionResult.cleanup) {
        appendCleanupEntry(report, entry);
        persist();
      }
      const durationMs = Math.max(
        0,
        Math.round((deps.now ?? (() => performance.now()))() - start),
      );
      const engine = sectionEngineResult(sectionResult);
      if (sectionResult.cleanup.some((row) => row.status === 'FAIL')) {
        return {
          ...engine,
          status: 'FAIL',
          reason: 'resource-cleanup-failed',
          durationMs,
        };
      }
      return { ...engine, durationMs };
    },
  }));

  await executeChecks(checks, {
    now: deps.now ?? (() => performance.now()),
    onResult(row) {
      if (row.status !== 'BLOCKED') return;
      const section = plan.sections.find((entry) => entry.id === row.id);
      if (!section) return;
      for (const scenarioId of section.scenarioIds) {
        const scenario = sanitizeChildScenarioResult(
          {
            status: 'BLOCKED',
            reason: 'prerequisite-not-passed',
            reasonCode: 'prerequisite-not-passed',
          },
          { scenarioId, sectionId: section.id, tier: section.tier },
        );
        appendScenarioRow(report, scenario, deps.repoRoot);
        persist();
        progress(`BLOCKED ${section.id}/${scenarioId} (0ms)\n`);
      }
    },
  });

  finalizeReport(report, { interrupted: runContext.interrupted });
  persist();
  return { ok: true, exitCode: report.exitCode, report, reportPath: path };
}

/**
 * Bound child command helper for suite adapters.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd: string, timeoutMs?: number, run?: typeof runCommand }} options
 */
export async function runChildCommand(command, args, options) {
  const run = options.run ?? runCommand;
  const result = await run(command, args, {
    cwd: options.cwd,
    timeoutMs: options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
  });
  const outcome = commandOutcome(result);
  if (result.reason === 'timeout') {
    return {
      status: 'TIMEOUT',
      reason: 'timeout',
      reasonCode: 'timeout',
      durationMs: options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
      measurements: { exitCode: result.code },
    };
  }
  return {
    status: outcome.status,
    reason: outcome.reason ?? null,
    durationMs: 0,
    measurements: { exitCode: outcome.exitCode ?? result.code },
  };
}
