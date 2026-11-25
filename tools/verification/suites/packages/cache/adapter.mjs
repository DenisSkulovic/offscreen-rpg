import { join } from 'node:path';
import process from 'node:process';

import { runBounded } from '../../../resources/postgres/docker.mjs';
import {
  createRedisDockerResource,
  releaseRedisDockerResource,
} from '../../../resources/redis/docker.mjs';
import { planRedisDockerResource } from '../../../resources/redis/docker-plan.mjs';
import { runChildCommand } from '../../../runner/execute.mjs';
import { CACHE_MANIFEST_NAME, CACHE_SECTION_BY_ID } from './manifest.mjs';

/**
 * @param {string} repoRoot
 * @param {string} scenarioId
 */
function sourceScenarioSpec(repoRoot, scenarioId) {
  if (scenarioId === 'CA-S01') {
    return {
      command: 'pnpm',
      args: ['--filter', '@offscreen/cache', 'test'],
      timeoutMs: 120_000,
    };
  }
  if (scenarioId === 'CA-S02') {
    return {
      command: process.execPath,
      args: [
        '--test',
        join(repoRoot, 'packages/cache/test/distributed/harness.test.mjs'),
      ],
      timeoutMs: 120_000,
    };
  }
  return null;
}

/**
 * @param {object} resource
 */
function releasePlanFromResource(resource) {
  return {
    runId: resource.runId,
    containerName: resource.containerName,
    profile: resource.profile,
    imageId: resource.imageId,
    keyNamespace: resource.keyNamespace,
    runtimeUser: resource.runtimeUser,
    adminUser: resource.adminUser,
    limits: { maxmemoryPolicy: resource.maxmemoryPolicy },
  };
}

/**
 * @param {{ repoRoot: string }} deps
 */
export function createRedisLiveResourceAdapter(deps) {
  void deps;
  const run = (command, args) => runBounded(command, args, undefined, 30_000);

  return {
    acquire: async (requirement, runContext) => {
      if (requirement.kind !== 'redis') {
        return null;
      }
      const runId =
        typeof runContext.runId === 'string' && runContext.runId.length > 0
          ? runContext.runId
          : 'verify-cache';
      const planned = planRedisDockerResource({
        profile: requirement.profile,
        runId,
        live: true,
        env: process.env,
        run,
      });
      if (!planned.ok) {
        throw new Error(planned.reason ?? 'redis-plan-failed');
      }
      const created = await createRedisDockerResource({
        profile: requirement.profile,
        runId,
        live: true,
        plan: planned.plan,
        run,
      });
      if (!created.ok) {
        throw new Error(created.reason ?? 'redis-acquire-failed');
      }
      const resource = created.resource;
      const plan = planned.plan;
      return {
        publicFacts: created.publicFacts ?? {},
        privateHandle: { resource, plan },
        release: async () => {
          const released = await releaseRedisDockerResource({
            resource,
            plan,
            run,
            containerId: resource.containerId,
          });
          if (!released.ok) {
            throw new Error(released.reason ?? 'redis-release-failed');
          }
        },
      };
    },
  };
}

/**
 * @param {object} catalogPlan
 * @param {{
 *   repoRoot: string,
 *   run?: Function,
 * }} deps
 */
export function createCacheScenarioRunner(catalogPlan, deps) {
  return async function runCacheScenario({ section, scenarioId, runContext }) {
    const definition = CACHE_SECTION_BY_ID.get(section.id);
    if (!definition) {
      return {
        status: 'FAIL',
        reason: 'unknown-section',
        reasonCode: 'unknown-section',
        durationMs: 0,
      };
    }

    if (section.id === 'source') {
      const spec = sourceScenarioSpec(deps.repoRoot, scenarioId);
      if (!spec) {
        return {
          status: 'NOT-RUN',
          reason: 'missing-scenario-in-child-report',
          reasonCode: 'missing-scenario-in-child-report',
          durationMs: 0,
        };
      }
      const outcome = await runChildCommand(spec.command, spec.args, {
        cwd: deps.repoRoot,
        timeoutMs: spec.timeoutMs,
        run: runContext.run ?? deps.run,
      });
      return { ...outcome, durationMs: outcome.durationMs ?? 0 };
    }

    return {
      status: 'NOT-RUN',
      reason: 'scenario-not-implemented',
      reasonCode: 'scenario-not-implemented',
      durationMs: 0,
    };
  };
}

/**
 * @param {object} catalogPlan
 * @param {object} deps
 */
export function buildCacheVerificationDeps(catalogPlan, deps) {
  if (catalogPlan.subject?.manifestName !== CACHE_MANIFEST_NAME) {
    return deps;
  }

  /** @type {Record<string, import('../../../runner/execute.mjs').LiveResourceAdapter>} */
  const adapters = { ...(deps.adapters ?? {}) };
  if (catalogPlan.live) {
    adapters.redis = createRedisLiveResourceAdapter(deps);
  }

  return {
    ...deps,
    adapters,
    runScenario: createCacheScenarioRunner(catalogPlan, deps),
  };
}

export { releasePlanFromResource };
