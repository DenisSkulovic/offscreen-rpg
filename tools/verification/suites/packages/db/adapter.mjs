import {
  createPostgresDockerResource,
  releasePostgresDockerResource,
} from '../../../resources/postgres/docker.mjs';
import { DB_SECTION_BY_ID } from './manifest.mjs';
import { dbScenarioOwnership } from './policy.mjs';
import { runAdmissionScenario } from './scenarios/admission.mjs';
import { ensureDbPackageBuilt, runSourceScenario } from './scenarios/source.mjs';

/**
 * @param {{ repoRoot: string, run?: Function }} deps
 */
export async function ensureDbPackageBuiltForLive(deps) {
  return ensureDbPackageBuilt(deps);
}

/**
 * @param {{ repoRoot: string }} options
 */
export function createPostgresLiveAdapter(options) {
  return {
    /**
     * @param {object} requirement
     * @param {object} runContext
     */
    acquire: async (requirement, runContext) => {
      if (!runContext.live) {
        throw new Error('resource acquire refused without --live');
      }
      const created = await createPostgresDockerResource({
        profile: requirement.profile,
        runId: runContext.runId,
        live: true,
      });
      if (!created.ok) {
        throw new Error(created.reason ?? 'postgres-acquire-failed');
      }
      const resource = created.resource;
      return {
        publicFacts: created.publicFacts,
        privateHandle: resource,
        release: async () => {
          await releasePostgresDockerResource(resource);
        },
      };
    },
  };
}

/**
 * @param {object} catalogPlan
 * @param {{
 *   repoRoot: string,
 *   adapters?: Record<string, unknown>,
 *   run?: Function,
 *   runScenario?: Function,
 * }} deps
 */
export function buildDbVerificationDeps(catalogPlan, deps) {
  if (catalogPlan.subject?.manifestName !== '@offscreen/db') {
    return deps;
  }

  const adapters = { ...(deps.adapters ?? {}) };
  if (!adapters.postgres) {
    adapters.postgres = createPostgresLiveAdapter({ repoRoot: deps.repoRoot });
  }

  return {
    ...deps,
    adapters,
    runScenario: createDbScenarioRunner(catalogPlan, { ...deps, adapters }),
  };
}

/**
 * @param {object} catalogPlan
 * @param {{ repoRoot: string, run?: Function, adapters: Record<string, unknown> }} deps
 */
export function createDbScenarioRunner(catalogPlan, deps) {
  return async function runDbScenario({ section, scenarioId, runContext, handles }) {
    if (catalogPlan.subject?.manifestName !== '@offscreen/db') {
      return {
        status: 'NOT-RUN',
        reason: 'scenario-not-implemented',
        reasonCode: 'scenario-not-implemented',
        durationMs: 0,
      };
    }

    const definition = DB_SECTION_BY_ID.get(section.id);
    if (!definition) {
      return {
        status: 'FAIL',
        reason: 'unknown-section',
        reasonCode: 'unknown-section',
        durationMs: 0,
      };
    }

    if (section.id !== 'source' && runContext.live) {
      const buildOutcome = await ensureDbPackageBuiltForLive({
        repoRoot: deps.repoRoot,
        run: deps.run ?? runContext.run,
      });
      if (buildOutcome.status !== 'PASS') {
        return {
          status: 'BLOCKED',
          reason: 'source-build-prerequisite-failed',
          reasonCode: 'source-build-prerequisite-failed',
          durationMs: buildOutcome.durationMs ?? 0,
        };
      }
    }

    if (section.id === 'source') {
      return runSourceScenario({
        scenarioId,
        repoRoot: deps.repoRoot,
        run: deps.run ?? runContext.run,
      });
    }

    const ownedModule = dbScenarioOwnership(scenarioId);
    if (ownedModule === 'admission') {
      const postgresLease = handles?.find((row) =>
        row.resource?.startsWith('postgres:'),
      )?.lease?.privateHandle;
      return runAdmissionScenario({
        scenarioId,
        live: Boolean(runContext.live),
        postgresResource: postgresLease,
      });
    }

    return {
      status: 'NOT-RUN',
      reason: 'not-implemented-scenario',
      reasonCode: 'not-implemented-scenario',
      durationMs: 0,
    };
  };
}