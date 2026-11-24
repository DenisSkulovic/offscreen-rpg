#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';

const devProfile = readPlatformProfile('dev');
export const DEV_REDIS_CONTEXT = devProfile.contextName;
export const DEV_REDIS_NAMESPACE = devProfile.namespaces.redis;
const DEV_REDIS_OWNER = devProfile.ownerValue;
const OWNER_LABEL = `${devProfile.ownerLabel}/owner`;
const ROLLOUT_TIMEOUT_MS = 180_000;

/**
 * @param {object | undefined} object
 */
function classifyDevObject(object) {
  if (!object) return 'absent';
  const owner = object.metadata?.labels?.[OWNER_LABEL];
  if (owner !== DEV_REDIS_OWNER) return 'foreign';
  return 'owned';
}

/**
 * @param {ReturnType<typeof readPlatformObject>} result
 */
function toKindState(result) {
  if (result.state === 'unreadable') {
    return { state: 'unreadable', reason: result.reason };
  }
  if (result.state === 'absent') {
    return { state: 'absent' };
  }
  return {
    state: 'present',
    classification: classifyDevObject(result.object),
    object: result.object,
  };
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeDevRedis(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  return {
    namespace: toKindState(
      readPlatformObject(
        {
          profileId: 'dev',
          resource: 'namespace',
          name: DEV_REDIS_NAMESPACE,
        },
        { run },
      ),
    ),
    deployment: toKindState(
      readPlatformObject(
        {
          profileId: 'dev',
          resource: 'deployment',
          name: 'redis',
          namespace: DEV_REDIS_NAMESPACE,
        },
        { run },
      ),
    ),
    service: toKindState(
      readPlatformObject(
        {
          profileId: 'dev',
          resource: 'service',
          name: 'redis',
          namespace: DEV_REDIS_NAMESPACE,
        },
        { run },
      ),
    ),
  };
}

/**
 * @param {ReturnType<typeof observeDevRedis>} observations
 */
export function planDevRedisInstall(observations) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (observations.namespace.state === 'unreadable') {
    refusals.push({
      id: 'namespace-unreadable',
      detail: observations.namespace.reason ?? 'namespace unreadable',
    });
  } else if (
    observations.namespace.state === 'present' &&
    observations.namespace.classification === 'foreign'
  ) {
    refusals.push({
      id: 'namespace-foreign',
      detail: `namespace ${DEV_REDIS_NAMESPACE} has a foreign owner label`,
    });
  }
  for (const key of ['deployment', 'service']) {
    const item = observations[key];
    if (item.state === 'unreadable') {
      refusals.push({
        id: `${key}-unreadable`,
        detail: item.reason ?? `${key} unreadable`,
      });
    } else if (item.state === 'present' && item.classification === 'foreign') {
      refusals.push({
        id: `${key}-foreign`,
        detail: `${key} redis is foreign-owned`,
      });
    }
  }
  /** @type {{ op: string }[]} */
  const actions = [];
  if (refusals.length === 0) {
    if (
      observations.namespace.state === 'absent' ||
      observations.namespace.state === 'present'
    ) {
      actions.push({ op: 'ensure-namespace' });
    }
    actions.push({ op: 'apply-redis' });
    actions.push({ op: 'verify-rollout' });
    actions.push({ op: 'verify-service' });
  }
  return {
    mode: 'plan',
    readOnly: true,
    context: DEV_REDIS_CONTEXT,
    namespace: DEV_REDIS_NAMESPACE,
    refusals,
    actions,
    ok: refusals.length === 0,
  };
}

/**
 * @param {object} deployment
 */
function deploymentIsReady(deployment) {
  const desired = deployment?.status?.replicas ?? deployment?.spec?.replicas;
  const available = deployment?.status?.availableReplicas ?? 0;
  return Number(desired) > 0 && available === desired;
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeDevRedisReady(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  try {
    assertPlatformTarget('dev', { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }
  const observations = observeDevRedis({ run });
  if (observations.deployment.state === 'unreadable') {
    return {
      ok: false,
      detail: `redis deployment unreadable: ${observations.deployment.reason}`,
    };
  }
  if (observations.service.state === 'unreadable') {
    return {
      ok: false,
      detail: `redis service unreadable: ${observations.service.reason}`,
    };
  }
  if (
    observations.deployment.state === 'absent' &&
    observations.service.state === 'absent'
  ) {
    return { ok: false, detail: 'redis deployment and service are absent' };
  }
  if (
    observations.deployment.state !== 'present' ||
    observations.service.state !== 'present'
  ) {
    return {
      ok: false,
      detail: 'redis deployment or service is not installed',
    };
  }
  if (
    observations.deployment.classification === 'foreign' ||
    observations.service.classification === 'foreign'
  ) {
    return { ok: false, detail: 'redis resources are foreign-owned' };
  }
  if (!deploymentIsReady(observations.deployment.object)) {
    return { ok: false, detail: 'redis deployment is not ready' };
  }
  if (observations.service.object?.spec?.type !== 'ClusterIP') {
    return { ok: false, detail: 'redis service is not ClusterIP' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   renderDeps?: { run?: typeof runPlatformCommand },
 *   observe?: typeof observeDevRedis,
 * }} [deps]
 */
export function executeAuthorizedDevRedis(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const renderDeps = deps.renderDeps ?? { run };
  const observe = deps.observe ?? observeDevRedis;
  assertPlatformTarget('dev', { run });
  const observations = observe({ run });
  const plan = planDevRedisInstall(observations);
  if (!plan.ok) {
    return { ...plan, mutated: false, actions: [] };
  }
  /** @type {{ op: string, detail?: string }[]} */
  const completed = [];
  if (plan.actions.some((action) => action.op === 'ensure-namespace')) {
    if (observations.namespace.state === 'absent') {
      const namespaceDoc = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: DEV_REDIS_NAMESPACE,
          labels: { [OWNER_LABEL]: DEV_REDIS_OWNER },
        },
      };
      const created = run(
        'kubectl',
        ['--context', DEV_REDIS_CONTEXT, 'apply', '-f', '-'],
        {
          input: `${JSON.stringify(namespaceDoc)}\n`,
          timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS,
        },
      );
      completed.push({ op: 'ensure-namespace' });
      if (!created.ok) {
        return {
          ...plan,
          ok: false,
          mutated: true,
          refusals: [
            { id: 'ensure-namespace-failed', detail: 'namespace apply failed' },
          ],
          actions: completed,
        };
      }
    } else {
      completed.push({ op: 'reuse-namespace' });
    }
  }

  const manifest = renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'redis', profile: 'dev', section: 'all' },
      renderDeps,
    ),
  );
  const rendered = manifest
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== '---');
  if (
    rendered.some((line) => /requirepass|REDIS_PASSWORD|password:/i.test(line))
  ) {
    return {
      ...plan,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'auth-material',
          detail: 'refusing redis manifest with authentication material',
        },
      ],
      actions: completed,
    };
  }

  const applied = run(
    'kubectl',
    ['--context', DEV_REDIS_CONTEXT, 'apply', '-f', '-'],
    { input: manifest, timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  completed.push({ op: 'apply-redis' });
  if (!applied.ok) {
    return {
      ...plan,
      ok: false,
      mutated: true,
      refusals: [{ id: 'apply-failed', detail: 'redis apply failed' }],
      actions: completed,
    };
  }

  const rollout = run(
    'kubectl',
    [
      '--context',
      DEV_REDIS_CONTEXT,
      '-n',
      DEV_REDIS_NAMESPACE,
      'rollout',
      'status',
      'deployment/redis',
      `--timeout=${Math.ceil(ROLLOUT_TIMEOUT_MS / 1000)}s`,
    ],
    { timeoutMs: ROLLOUT_TIMEOUT_MS + 5_000 },
  );
  completed.push({ op: 'verify-rollout' });
  if (!rollout.ok) {
    return {
      ...plan,
      ok: false,
      mutated: true,
      refusals: [
        { id: 'rollout-failed', detail: 'redis deployment rollout failed' },
      ],
      actions: completed,
    };
  }

  const svc = run(
    'kubectl',
    [
      '--context',
      DEV_REDIS_CONTEXT,
      '-n',
      DEV_REDIS_NAMESPACE,
      'get',
      'svc',
      'redis',
      '-o',
      'jsonpath={.spec.type}',
    ],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  completed.push({ op: 'verify-service' });
  const svcType = (svc.stdout ?? '').trim();
  if (!svc.ok || svcType !== 'ClusterIP') {
    return {
      ...plan,
      ok: false,
      mutated: true,
      refusals: [
        {
          id: 'service-type',
          detail: 'redis service is not ClusterIP',
        },
      ],
      actions: completed,
    };
  }

  return { ...plan, ok: true, mutated: true, actions: completed };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2] ?? 'plan';
  if (command === 'plan') {
    const observations = observeDevRedis();
    const plan = planDevRedisInstall(observations);
    process.stdout.write(`${JSON.stringify(plan)}\n`);
    process.exitCode = plan.ok ? 0 : 1;
  } else if (command === 'ensure') {
    if (process.env.OFFSCREEN_DEV_REDIS_ENSURE !== 'authorized') {
      process.stderr.write(
        'refusing live redis ensure: set OFFSCREEN_DEV_REDIS_ENSURE=authorized after a passing preflight\n',
      );
      process.exitCode = 2;
    } else {
      const result = executeAuthorizedDevRedis();
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = result.ok ? 0 : 1;
    }
  } else {
    process.stderr.write(`unsupported command: ${command}\n`);
    process.exitCode = 2;
  }
}
