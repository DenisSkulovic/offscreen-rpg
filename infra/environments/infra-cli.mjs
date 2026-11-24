#!/usr/bin/env node
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../platform/common/commands.mjs';
import { readPlatformProfile } from '../platform/common/profile.mjs';
import { observeDevObjectStoreReady } from '../platform/object-storage/readiness.mjs';
import { observeDevPostgresReady } from '../platform/postgres/readiness.mjs';
import { RELEASE_CNPG_CLUSTER } from '../platform/postgres/dev-bootstrap.mjs';
import { observeDevTemporalReady } from '../platform/temporal/readiness.mjs';
import { observeDevRedisReady } from '../platform/redis/dev-install.mjs';
import {
  BROKER_NAME,
  NAMESPACE as RABBITMQ_NAMESPACE,
} from '../platform/rabbitmq/release-install.mjs';
import {
  buildPlatformPlan,
  defaultPlatformRunner,
  parsePlatformServiceSelection,
  runPlatformPlan,
  REPO_ROOT,
} from './platform-plan.mjs';

/** @typedef {'plan' | 'up' | 'status'} InfraCommand */
/** @typedef {'dev' | 'release'} InfraProfileId */

export const DEV_CLUSTER_CLI = join(
  REPO_ROOT,
  'infra/clusters/kind/manager/dev-cli.mjs',
);
export const RELEASE_CLUSTER_UP = join(
  REPO_ROOT,
  'infra/clusters/kind/release/up.sh',
);

/**
 * @param {string[]} argv
 */
export function parseInfraCliArgs(argv) {
  if (argv.length === 0) {
    return { ok: false, exitCode: 2, message: 'missing command' };
  }
  const command = argv[0];
  if (command !== 'plan' && command !== 'up' && command !== 'status') {
    return { ok: false, exitCode: 2, message: `unknown command: ${command}` };
  }

  /** @type {InfraProfileId | undefined} */
  let profileId;
  let services = 'core';
  /** @type {string[]} */
  const positional = [];

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--env') {
      if (index + 1 >= argv.length) {
        return { ok: false, exitCode: 2, message: '--env requires a value' };
      }
      index += 1;
      const env = argv[index];
      if (env !== 'dev' && env !== 'release') {
        return { ok: false, exitCode: 2, message: `unsupported --env: ${env}` };
      }
      profileId = env;
      continue;
    }
    if (token === '--services') {
      if (index + 1 >= argv.length) {
        return {
          ok: false,
          exitCode: 2,
          message: '--services requires a value',
        };
      }
      index += 1;
      services = argv[index];
      continue;
    }
    if (token.startsWith('--')) {
      return { ok: false, exitCode: 2, message: `unknown option: ${token}` };
    }
    positional.push(token);
  }

  if (positional.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      message: 'unexpected positional arguments',
    };
  }
  if (!profileId) {
    return { ok: false, exitCode: 2, message: '--env is required' };
  }

  return {
    ok: true,
    command: /** @type {InfraCommand} */ (command),
    profileId,
    services,
  };
}

/**
 * @param {typeof runPlatformCommand} run
 */
export function inventoryKindClusters(run) {
  const result = run('kind', ['get', 'clusters']);
  if (!result.ok) {
    return {
      ok: false,
      state: 'unreadable',
      reason: (
        result.stderr ??
        result.stdout ??
        'kind get clusters failed'
      ).trim(),
    };
  }
  const clusters = (result.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return { ok: true, state: 'ok', clusters };
}

/**
 * @param {InfraProfileId} profileId
 * @param {typeof runPlatformCommand} run
 */
export function verifyClusterNodesReady(profileId, run) {
  const profile = readPlatformProfile(profileId);
  const result = run('kubectl', [
    '--context',
    profile.contextName,
    'get',
    'nodes',
    '-o',
    'json',
  ]);
  if (!result.ok) {
    throw new Error('cluster nodes are unreadable');
  }
  let body;
  try {
    body = JSON.parse(result.stdout ?? '{}');
  } catch {
    throw new Error('cluster nodes response is malformed');
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    throw new Error('cluster has no nodes');
  }
  for (const node of items) {
    const conditions = Array.isArray(node.status?.conditions)
      ? node.status.conditions
      : [];
    const ready = conditions.find((item) => item?.type === 'Ready');
    if (ready?.status !== 'True') {
      throw new Error('cluster node is not Ready');
    }
  }
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 */
export function verifyReleaseLocalPathProvisioner(run, contextName) {
  if (typeof contextName !== 'string' || contextName.length === 0) {
    throw new Error('release context is required');
  }
  const observation = readPlatformObject(
    {
      profileId: 'release',
      resource: 'deployment',
      name: 'local-path-provisioner',
      namespace: 'local-path-storage',
    },
    { run },
  );
  if (observation.state === 'unreadable') {
    throw new Error(
      `local-path provisioner is unreadable: ${observation.reason ?? 'unknown'}`,
    );
  }
  if (observation.state === 'absent') {
    throw new Error('local-path provisioner is absent');
  }
  const conditions = Array.isArray(observation.object?.status?.conditions)
    ? observation.object.status.conditions
    : [];
  const available = conditions.find((item) => item?.type === 'Available');
  if (available?.status !== 'True') {
    throw new Error('local-path provisioner is not Available');
  }
}

/**
 * @param {object} deployment
 */
function deploymentIsReady(deployment) {
  if (!deployment || typeof deployment !== 'object') return false;
  const desired = deployment.spec?.replicas ?? 1;
  const available = deployment.status?.availableReplicas ?? 0;
  if (desired > 0 && available >= desired) {
    return true;
  }
  const conditions = Array.isArray(deployment.status?.conditions)
    ? deployment.status.conditions
    : [];
  return conditions.some(
    (item) => item?.type === 'Available' && item?.status === 'True',
  );
}

/**
 * @param {object} cluster
 */
function cnpgClusterIsReady(cluster) {
  const conditions = Array.isArray(cluster?.status?.conditions)
    ? cluster.status.conditions
    : [];
  return conditions.some(
    (item) => item?.type === 'Ready' && item?.status === 'True',
  );
}

/**
 * @param {{ ok: boolean, detail?: string }} observation
 */
function devReadinessToServiceState(observation) {
  if (observation.ok) {
    return { state: 'installed' };
  }
  const detail = observation.detail ?? '';
  if (/absent/i.test(detail)) {
    return { state: 'not-installed', detail };
  }
  if (/unreadable/i.test(detail)) {
    return { state: 'unreadable', detail };
  }
  return { state: 'not-ready', detail };
}

/**
 * @param {string} serviceId
 * @param {{ run?: typeof runPlatformCommand }} deps
 */
function observeReleaseServiceState(serviceId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const profile = readPlatformProfile('release');

  /** @type {import('../platform/common/commands.mjs').readPlatformObject extends Function ? Parameters<typeof readPlatformObject>[0] : never} */
  const read = (resource, name, namespace) =>
    readPlatformObject(
      {
        profileId: 'release',
        resource,
        name,
        namespace,
      },
      { run },
    );

  if (serviceId === 'postgres') {
    const cluster = read(
      'cluster.postgresql.cnpg.io',
      RELEASE_CNPG_CLUSTER,
      profile.namespaces.postgres,
    );
    if (cluster.state === 'unreadable') {
      return { state: 'unreadable', detail: cluster.reason };
    }
    if (cluster.state === 'absent') {
      return { state: 'not-installed' };
    }
    return {
      state: cnpgClusterIsReady(cluster.object) ? 'installed' : 'not-ready',
    };
  }

  if (serviceId === 'object-storage') {
    const deployment = read(
      'deployment',
      'object-store',
      profile.namespaces.objectStorage,
    );
    if (deployment.state === 'unreadable') {
      return { state: 'unreadable', detail: deployment.reason };
    }
    if (deployment.state === 'absent') {
      return { state: 'not-installed' };
    }
    return {
      state: deploymentIsReady(deployment.object) ? 'installed' : 'not-ready',
    };
  }

  if (serviceId === 'temporal') {
    const namespace = profile.namespaces.temporal;
    const postgres = read('deployment', 'temporal-postgres', namespace);
    const server = read('deployment', 'temporal-server', namespace);
    const schemaJob = read('job', 'temporal-schema', namespace);
    if (
      [postgres, server, schemaJob].some((item) => item.state === 'unreadable')
    ) {
      return { state: 'unreadable' };
    }
    if (
      postgres.state === 'absent' &&
      server.state === 'absent' &&
      schemaJob.state === 'absent'
    ) {
      return { state: 'not-installed' };
    }
    const schemaConditions = Array.isArray(schemaJob.object?.status?.conditions)
      ? schemaJob.object.status.conditions
      : [];
    const schemaComplete = schemaConditions.some(
      (item) => item?.type === 'Complete' && item?.status === 'True',
    );
    const postgresReady =
      postgres.state === 'present' && deploymentIsReady(postgres.object);
    const serverReady =
      server.state === 'present' && deploymentIsReady(server.object);
    if (postgresReady && serverReady && schemaComplete) {
      return { state: 'installed' };
    }
    return { state: 'not-ready' };
  }

  if (serviceId === 'gateway') {
    const traefik = read('deployment', 'lab-gateway-traefik', 'gateway-system');
    const gateway = read('gateway', 'lab-edge', 'lab-edge');
    if (traefik.state === 'unreadable' || gateway.state === 'unreadable') {
      return { state: 'unreadable' };
    }
    if (traefik.state === 'absent' && gateway.state === 'absent') {
      return { state: 'not-installed' };
    }
    const programmed = Array.isArray(gateway.object?.status?.conditions)
      ? gateway.object.status.conditions.find(
          (item) => item?.type === 'Programmed',
        )
      : null;
    const ready =
      traefik.state === 'present' &&
      deploymentIsReady(traefik.object) &&
      gateway.state === 'present' &&
      programmed?.status === 'True';
    return { state: ready ? 'installed' : 'not-ready' };
  }

  if (serviceId === 'redis') {
    const redisNamespace = profile.namespaces.redis ?? 'lab-a';
    const deployment = read('deployment', 'redis', redisNamespace);
    const service = read('service', 'redis', redisNamespace);
    if (deployment.state === 'unreadable' || service.state === 'unreadable') {
      return { state: 'unreadable' };
    }
    if (deployment.state === 'absent' && service.state === 'absent') {
      return { state: 'not-installed' };
    }
    const ready =
      deployment.state === 'present' &&
      deploymentIsReady(deployment.object) &&
      service.state === 'present';
    return { state: ready ? 'installed' : 'not-ready' };
  }

  if (serviceId === 'rabbitmq') {
    const broker = read('rabbitmqcluster', BROKER_NAME, RABBITMQ_NAMESPACE);
    if (broker.state === 'unreadable') {
      return { state: 'unreadable', detail: broker.reason };
    }
    if (broker.state === 'absent') {
      return { state: 'not-installed' };
    }
    const clusterStatus = broker.object?.status?.conditions ?? [];
    const ready = clusterStatus.some(
      (item) => item?.type === 'AllReplicasReady' && item?.status === 'True',
    );
    return { state: ready ? 'installed' : 'not-ready' };
  }

  if (serviceId === 'observability') {
    const deployment = read('deployment', 'otel-collector', 'lab-a');
    const service = read('service', 'otel-collector', 'lab-a');
    if (deployment.state === 'unreadable' || service.state === 'unreadable') {
      return { state: 'unreadable' };
    }
    if (deployment.state === 'absent' && service.state === 'absent') {
      return { state: 'not-installed' };
    }
    const ready =
      deployment.state === 'present' &&
      deploymentIsReady(deployment.object) &&
      service.state === 'present';
    return { state: ready ? 'installed' : 'not-ready' };
  }

  return { state: 'unreadable', detail: `unknown service: ${serviceId}` };
}

/**
 * @param {InfraProfileId} profileId
 * @param {string} serviceId
 * @param {{ run?: typeof runPlatformCommand }} deps
 */
export function observeSelectedServiceState(profileId, serviceId, deps = {}) {
  const supported = parsePlatformServiceSelection(profileId, serviceId);
  if (!supported.ok) {
    if (supported.refusal.id === 'unsupported-service') {
      return {
        state: 'unsupported',
        detail: supported.refusal.message,
      };
    }
    return { state: 'unreadable', detail: supported.refusal.message };
  }

  if (profileId === 'dev') {
    if (serviceId === 'postgres') {
      return devReadinessToServiceState(observeDevPostgresReady(deps));
    }
    if (serviceId === 'object-storage') {
      return devReadinessToServiceState(observeDevObjectStoreReady(deps));
    }
    if (serviceId === 'temporal') {
      return devReadinessToServiceState(observeDevTemporalReady(deps));
    }
    if (serviceId === 'redis') {
      return devReadinessToServiceState(observeDevRedisReady(deps));
    }
    return {
      state: 'unsupported',
      detail: `${serviceId} is not supported on profile dev`,
    };
  }

  return observeReleaseServiceState(serviceId, deps);
}

/**
 * @param {{ profileId: InfraProfileId, services?: string }} input
 */
export function buildInfraEnsurePreview(input) {
  const profile = readPlatformProfile(input.profileId);
  const plan = buildPlatformPlan({
    profileId: input.profileId,
    command: 'ensure',
    services: input.services ?? 'core',
    confirmation: profile.contextName,
  });
  if (!plan.ok) {
    return {
      ok: false,
      exitCode: 2,
      phase: 'selection',
      refusals: plan.refusals,
    };
  }
  return {
    ok: true,
    exitCode: 0,
    phase: 'plan',
    profileId: plan.profileId,
    contextName: plan.contextName,
    selectedServices: plan.selectedServices,
    preflight: plan.preflight,
    phases: plan.phases.map((item) => ({
      id: item.id,
      argv: item.argv,
      mutate: item.mutate,
    })),
  };
}

/**
 * @param {{
 *   profileId: InfraProfileId,
 *   services?: string,
 *   run?: typeof runPlatformCommand,
 *   runner?: typeof defaultPlatformRunner,
 *   memoryMiB?: number | null,
 * }} input
 */
export function runInfraUp(input) {
  const profile = readPlatformProfile(input.profileId);
  const selection = parsePlatformServiceSelection(
    input.profileId,
    input.services ?? 'core',
  );
  if (!selection.ok) {
    return {
      ok: false,
      exitCode: 2,
      phase: 'selection',
      refusals: [selection.refusal],
      ran: [],
    };
  }

  const run = input.run ?? runPlatformCommand;
  const runner = input.runner ?? defaultPlatformRunner;

  const inventory = inventoryKindClusters(run);
  if (!inventory.ok) {
    process.stderr.write(`cluster inventory: ${inventory.reason}\n`);
    return {
      ok: false,
      exitCode: 1,
      phase: 'cluster-inventory',
      message: inventory.reason,
      ran: [],
    };
  }

  const clusterPresent = inventory.clusters.includes(profile.clusterName);
  /** @type {string[]} */
  const clusterPhases = [];

  if (!clusterPresent) {
    const argv =
      input.profileId === 'dev'
        ? [process.execPath, DEV_CLUSTER_CLI, 'ensure']
        : ['bash', RELEASE_CLUSTER_UP];
    const result = runner(argv, {
      env:
        input.profileId === 'dev'
          ? { OFFSCREEN_DEV_CLUSTER_ENSURE: 'authorized' }
          : undefined,
      phaseId: 'cluster-ensure',
    });
    clusterPhases.push('cluster-ensure');
    if (!result.ok) {
      process.stderr.write('cluster ensure failed\n');
      return {
        ok: false,
        exitCode: result.status ?? 1,
        phase: 'cluster-ensure',
        ran: clusterPhases,
      };
    }
  } else {
    try {
      assertPlatformTarget(input.profileId, { run });
      verifyClusterNodesReady(input.profileId, run);
      if (input.profileId === 'release') {
        verifyReleaseLocalPathProvisioner(run, profile.contextName);
      }
      clusterPhases.push('cluster-verify');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      return {
        ok: false,
        exitCode: 1,
        phase: 'cluster-verify',
        message,
        ran: clusterPhases,
      };
    }
  }

  if (selection.selected.length === 0) {
    return {
      ok: true,
      exitCode: 0,
      phase: 'cluster-ready',
      selectedServices: [],
      cluster: clusterPresent ? 'present' : 'created',
      ran: clusterPhases,
    };
  }

  const plan = buildPlatformPlan({
    profileId: input.profileId,
    command: 'ensure',
    services: input.services ?? 'core',
    confirmation: profile.contextName,
  });

  const receipt = runPlatformPlan(plan, runner, {
    run,
    memoryMiB: input.memoryMiB,
  });

  if (!receipt.ok) {
    const refusal = receipt.refusals[0];
    const message = refusal?.message ?? 'platform ensure failed';
    process.stderr.write(`${message}\n`);
  }

  return {
    ok: receipt.ok,
    exitCode: receipt.exitCode,
    phase: receipt.ok ? 'complete' : 'platform-ensure',
    selectedServices: plan.selectedServices,
    cluster: clusterPresent ? 'present' : 'created',
    ran: [...clusterPhases, ...receipt.ran.map((item) => item.id)],
    receipt,
  };
}

/**
 * @param {{
 *   profileId: InfraProfileId,
 *   services?: string,
 *   run?: typeof runPlatformCommand,
 * }} input
 */
export function runInfraStatus(input) {
  const parsed = parsePlatformServiceSelection(
    input.profileId,
    input.services ?? 'core',
  );
  if (!parsed.ok) {
    return {
      ok: false,
      exitCode: 2,
      phase: 'selection',
      refusals: [parsed.refusal],
    };
  }

  const run = input.run ?? runPlatformCommand;
  const profile = readPlatformProfile(input.profileId);
  const inventory = inventoryKindClusters(run);

  /** @type {'absent' | 'present' | 'unreadable'} */
  let cluster;
  if (!inventory.ok) {
    cluster = 'unreadable';
  } else {
    cluster = inventory.clusters.includes(profile.clusterName)
      ? 'present'
      : 'absent';
  }

  /** @type {Record<string, { state: string, detail?: string }>} */
  const services = {};
  for (const serviceId of parsed.selected) {
    services[serviceId] =
      cluster === 'present' || cluster === 'unreadable'
        ? observeSelectedServiceState(input.profileId, serviceId, { run })
        : { state: 'not-installed', detail: 'cluster absent' };
  }

  return {
    ok: true,
    exitCode: 0,
    phase: 'status',
    profileId: input.profileId,
    contextName: profile.contextName,
    cluster,
    selectedServices: parsed.selected,
    services,
  };
}

/**
 * @param {{
 *   ok: true,
 *   command: InfraCommand,
 *   profileId: InfraProfileId,
 *   services: string,
 * } | { ok: false, exitCode: number, message: string }} parsed
 * @param {{ run?: typeof runPlatformCommand, runner?: typeof defaultPlatformRunner, memoryMiB?: number | null }} [deps]
 */
export function dispatchInfraCli(parsed, deps = {}) {
  if (!parsed.ok) {
    return {
      exitCode: parsed.exitCode,
      payload: { ok: false, message: parsed.message },
      stderr: `${parsed.message}\n`,
    };
  }

  if (parsed.command === 'plan') {
    const preview = buildInfraEnsurePreview({
      profileId: parsed.profileId,
      services: parsed.services,
    });
    if (!preview.ok) {
      const message =
        preview.refusals?.map((item) => item.message).join('; ') ??
        'invalid selection';
      return {
        exitCode: preview.exitCode,
        payload: preview,
        stderr: `${message}\n`,
      };
    }
    return { exitCode: 0, payload: preview };
  }

  if (parsed.command === 'up') {
    const result = runInfraUp({
      profileId: parsed.profileId,
      services: parsed.services,
      ...deps,
    });
    return { exitCode: result.exitCode, payload: result };
  }

  const result = runInfraStatus({
    profileId: parsed.profileId,
    services: parsed.services,
    run: deps.run,
  });
  if (!result.ok) {
    const message =
      result.refusals?.map((item) => item.message).join('; ') ??
      'invalid status';
    return {
      exitCode: result.exitCode ?? 2,
      payload: result,
      stderr: `${message}\n`,
    };
  }
  return { exitCode: 0, payload: result };
}

function usage() {
  process.stderr.write(
    'usage: node infra/environments/infra-cli.mjs <plan|up|status> --env dev|release [--services none|core|all|service,...]\n',
  );
}

const modulePath = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] === modulePath ||
  process.argv[1] === join(dirname(modulePath), 'infra-cli.mjs');
if (isMain) {
  const parsed = parseInfraCliArgs(process.argv.slice(2));
  if (!parsed.ok) {
    usage();
    process.stderr.write(`${parsed.message}\n`);
    process.exitCode = parsed.exitCode;
  } else {
    const result = dispatchInfraCli(parsed);
    process.stdout.write(`${JSON.stringify(result.payload)}\n`);
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exitCode = result.exitCode;
  }
}
