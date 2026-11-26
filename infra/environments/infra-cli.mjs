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
import { statusObjectStorage } from '../platform/object-storage/providers/seaweedfs/install.mjs';
import { observeDevPostgresReady } from '../platform/postgres/readiness.mjs';
import { RELEASE_CNPG_CLUSTER } from '../platform/postgres/config.mjs';
import { assessCnpgClusterTopologyReadiness } from '../platform/postgres/cluster-readiness.mjs';
import {
  observeTemporalReady,
  observeTemporalRelease,
} from '../platform/temporal/readiness.mjs';
import { observeGatewayStatus } from '../platform/gateway/install.mjs';
import { observeRedisReady } from '../platform/redis/readiness.mjs';
import { observeRabbitmqReady } from '../platform/rabbitmq/readiness.mjs';
import {
  buildPlatformPlan,
  defaultPlatformRunner,
  parsePlatformServiceSelection,
  runPlatformPlan,
  REPO_ROOT,
} from './platform-plan.mjs';
import { runTrackedEntrypoint } from '../monitoring/operation-entrypoint.mjs';
import { formatInfraResult } from './infra-presentation.mjs';
import {
  createInfraProgressReporter,
  formatInfraProgressLine,
} from './infra-progress.mjs';

/** @typedef {'plan' | 'up' | 'status'} InfraCommand */
/** @typedef {'json' | 'human'} InfraOutputMode */
/** @typedef {'dev' | 'release'} InfraProfileId */

export const DEV_CLUSTER_CLI = join(
  REPO_ROOT,
  'infra/clusters/kind/manager/dev-cli.mjs',
);
export const RELEASE_CLUSTER_UP = join(
  REPO_ROOT,
  'infra/clusters/kind/release/up.sh',
);

const INFRA_COMMANDS = ['plan', 'up', 'status'];

/**
 * @param {InfraCommand | undefined} [focusedCommand]
 * @returns {string}
 */
export function buildInfraCliHelp(focusedCommand) {
  /** @type {string[]} */
  const lines = [
    'OFFSCREEN PLATFORM',
    '',
    'usage: node infra/environments/infra-cli.mjs <plan|up|status> [options]',
    '',
    'commands:',
    '  plan    read-only ensure preview (no cluster mutation)',
    '  status  read-only cluster and service observation',
    '  up      may create cluster and apply selected services',
    '',
    'options:',
    '  --env dev|release           target profile (required except --help)',
    '  --services <selection>    none, core, all, or comma-separated ids',
    '  --human                     plain multi-line summary on stdout',
    '  --json                      single JSON object on stdout (default)',
    '  --no-color                  accepted with --human only (plain text)',
    '  --help                      show this help and exit',
    '',
    'profiles:',
    '  dev      context kind-offscreen-dev',
    '  release  context kind-offscreen-release',
    '',
    'service examples:',
    '  --services none',
    '  --services core',
    '  --services postgres,redis',
    '',
    'read-only vs mutating:',
    '  plan and status perform no Helm apply or cluster create',
    '  up may run cluster ensure, verify, and platform ensure phases',
    '',
    'output examples:',
    '  node infra/environments/infra-cli.mjs status --env dev --json',
    '    {"ok":true,"phase":"status",...}',
    '  node infra/environments/infra-cli.mjs status --env dev --human',
    '    OFFSCREEN',
    '    PLATFORM',
    '    cmd: status',
    '    env: dev',
    '',
    'examples:',
    '  node infra/environments/infra-cli.mjs plan --env dev --services core',
    '  node infra/environments/infra-cli.mjs status --env release --services postgres',
    '  node infra/environments/infra-cli.mjs up --env dev --services none --human',
  ];
  if (focusedCommand) {
    lines.splice(
      2,
      0,
      '',
      `focused: ${focusedCommand} (${focusedCommand === 'up' ? 'mutating' : 'read-only'})`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} option
 */
function duplicateOptionMessage(option) {
  return `duplicate option: ${option}`;
}

/**
 * @param {string[]} argv
 */
export function parseInfraCliArgs(argv) {
  if (argv.length === 0) {
    return { ok: false, exitCode: 2, message: 'missing command' };
  }

  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    return { ok: true, help: true };
  }

  const command = argv[0];
  if (!INFRA_COMMANDS.includes(command)) {
    if (command === '--help' || command === '-h') {
      return { ok: true, help: true };
    }
    return { ok: false, exitCode: 2, message: `unknown command: ${command}` };
  }

  /** @type {InfraProfileId | undefined} */
  let profileId;
  let services = 'core';
  /** @type {InfraOutputMode} */
  let outputMode = 'json';
  let noColor = false;
  let help = false;
  let humanSeen = false;
  let jsonSeen = false;
  let noColorSeen = false;
  let envSeen = false;
  let servicesSeen = false;
  /** @type {string[]} */
  const positional = [];

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      if (help) {
        return {
          ok: false,
          exitCode: 2,
          message: duplicateOptionMessage('--help'),
        };
      }
      help = true;
      continue;
    }
    if (token === '--human') {
      if (humanSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: duplicateOptionMessage('--human'),
        };
      }
      if (jsonSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: 'conflicting options: --human and --json',
        };
      }
      humanSeen = true;
      outputMode = 'human';
      continue;
    }
    if (token === '--json') {
      if (jsonSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: duplicateOptionMessage('--json'),
        };
      }
      if (humanSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: 'conflicting options: --human and --json',
        };
      }
      jsonSeen = true;
      outputMode = 'json';
      continue;
    }
    if (token === '--no-color') {
      if (noColorSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: duplicateOptionMessage('--no-color'),
        };
      }
      noColorSeen = true;
      noColor = true;
      continue;
    }
    if (token === '--env') {
      if (envSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: duplicateOptionMessage('--env'),
        };
      }
      if (index + 1 >= argv.length) {
        return { ok: false, exitCode: 2, message: '--env requires a value' };
      }
      index += 1;
      const env = argv[index];
      if (env !== 'dev' && env !== 'release') {
        return { ok: false, exitCode: 2, message: `unsupported --env: ${env}` };
      }
      envSeen = true;
      profileId = env;
      continue;
    }
    if (token === '--services') {
      if (servicesSeen) {
        return {
          ok: false,
          exitCode: 2,
          message: duplicateOptionMessage('--services'),
        };
      }
      if (index + 1 >= argv.length) {
        return {
          ok: false,
          exitCode: 2,
          message: '--services requires a value',
        };
      }
      index += 1;
      servicesSeen = true;
      services = argv[index];
      continue;
    }
    if (token.startsWith('--')) {
      return { ok: false, exitCode: 2, message: `unknown option: ${token}` };
    }
    positional.push(token);
  }

  if (noColor && outputMode !== 'human') {
    return {
      ok: false,
      exitCode: 2,
      message: '--no-color requires --human',
    };
  }

  if (help) {
    return {
      ok: true,
      help: true,
      command: /** @type {InfraCommand} */ (command),
    };
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
    outputMode,
    noColor,
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
 * @param {{ ok: boolean, state?: string, detail?: string }} observation
 */
function rabbitmqReadinessToServiceState(observation) {
  const detail = observation.detail ?? observation.reason;
  const state = observation.state;
  if (observation.ok) {
    return { state: 'installed', detail };
  }
  if (state === 'absent') {
    return { state: 'not-installed', detail };
  }
  if (state === 'legacy_occupied' || state === 'foreign') {
    return { state: 'not-installed', detail: detail ?? state };
  }
  if (state === 'unreadable') {
    return { state: 'unreadable', detail };
  }
  return { state: 'not-ready', detail };
}

function redisReadinessToServiceState(observation) {
  const detail = observation.detail;
  const state = observation.state;
  if (state === 'ready') {
    return { state: 'installed', detail };
  }
  if (state === 'absent') {
    return { state: 'not-installed', detail };
  }
  if (state === 'unreadable') {
    return { state: 'unreadable', detail };
  }
  return { state: 'not-ready', detail };
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
    const expectedInstances = cluster.object?.spec?.instances;
    const topology = assessCnpgClusterTopologyReadiness(
      cluster.object,
      expectedInstances,
    );
    return {
      state: topology.ok ? 'installed' : 'not-ready',
      detail: topology.ok ? undefined : topology.detail,
    };
  }

  if (serviceId === 'temporal') {
    const release = observeTemporalRelease('release', { run });
    if (release.state === 'absent') return { state: 'not-installed' };
    if (release.state === 'unreadable')
      return { state: 'unreadable', detail: release.detail };
    const readiness = observeTemporalReady('release', { run });
    return {
      state: readiness.ok ? 'installed' : 'not-ready',
      detail: readiness.detail,
    };
  }

  if (serviceId === 'gateway') {
    return observeGatewayStatus({ run });
  }

  if (serviceId === 'redis') {
    return redisReadinessToServiceState(observeRedisReady('release', deps));
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

  if (serviceId === 'object-storage') {
    const run = deps.run ?? runPlatformCommand;
    const native =
      deps.statusObjectStorage?.(profileId) ??
      statusObjectStorage(profileId, { run });
    /** @type {Record<string, 'not-installed' | 'installed' | 'unreadable' | 'not-ready'>} */
    const stateByNative = {
      absent: 'not-installed',
      'native-noop': 'installed',
      unknown: 'unreadable',
      refused: 'not-ready',
    };
    return {
      state: stateByNative[native.state] ?? 'unreadable',
      detail: native.reason,
    };
  }

  if (profileId === 'dev') {
    if (serviceId === 'postgres') {
      return devReadinessToServiceState(observeDevPostgresReady(deps));
    }
    if (serviceId === 'temporal') {
      const release = observeTemporalRelease('dev', deps);
      if (release.state === 'absent')
        return { state: 'not-installed', detail: release.detail };
      if (release.state === 'unreadable')
        return { state: 'unreadable', detail: release.detail };
      return devReadinessToServiceState(observeTemporalReady('dev', deps));
    }
    if (serviceId === 'redis') {
      return redisReadinessToServiceState(observeRedisReady('dev', deps));
    }
    if (serviceId === 'rabbitmq') {
      return rabbitmqReadinessToServiceState(observeRabbitmqReady('dev', deps));
    }
    return {
      state: 'unsupported',
      detail: `${serviceId} is not supported on profile dev`,
    };
  }

  if (serviceId === 'rabbitmq') {
    return rabbitmqReadinessToServiceState(
      observeRabbitmqReady('release', deps),
    );
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
 *   onProgress?: import('./infra-progress.mjs').InfraProgressCallback,
 *   now?: () => number,
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
  const progressReporter =
    input.onProgress != null
      ? createInfraProgressReporter({
          onProgress: input.onProgress,
          now: input.now,
        })
      : null;

  progressReporter?.phaseStart('cluster-inventory');
  const inventory = inventoryKindClusters(run);
  if (!inventory.ok) {
    progressReporter?.phaseFail('cluster-inventory');
    process.stderr.write(`cluster inventory: ${inventory.reason}\n`);
    return {
      ok: false,
      exitCode: 1,
      phase: 'cluster-inventory',
      message: inventory.reason,
      ran: [],
    };
  }
  progressReporter?.phaseOk('cluster-inventory');

  const clusterPresent = inventory.clusters.includes(profile.clusterName);
  /** @type {string[]} */
  const clusterPhases = [];

  if (!clusterPresent) {
    const argv =
      input.profileId === 'dev'
        ? [process.execPath, DEV_CLUSTER_CLI, 'ensure']
        : ['bash', RELEASE_CLUSTER_UP];
    progressReporter?.phaseStart('cluster-ensure');
    const result = runner(argv, {
      env:
        input.profileId === 'dev'
          ? { OFFSCREEN_DEV_CLUSTER_ENSURE: 'authorized' }
          : undefined,
      phaseId: 'cluster-ensure',
    });
    clusterPhases.push('cluster-ensure');
    if (!result.ok) {
      progressReporter?.phaseFail('cluster-ensure');
      process.stderr.write('cluster ensure failed\n');
      return {
        ok: false,
        exitCode: result.status ?? 1,
        phase: 'cluster-ensure',
        ran: clusterPhases,
      };
    }
    progressReporter?.phaseOk('cluster-ensure');
  }

  progressReporter?.phaseStart('cluster-verify');
  try {
    assertPlatformTarget(input.profileId, { run });
    verifyClusterNodesReady(input.profileId, run);
    if (input.profileId === 'release') {
      verifyReleaseLocalPathProvisioner(run, profile.contextName);
    }
    progressReporter?.phaseOk('cluster-verify');
    clusterPhases.push('cluster-verify');
  } catch (error) {
    progressReporter?.phaseFail('cluster-verify');
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
    progress: progressReporter ?? undefined,
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

/**
 * @param {(chunk: string) => void} writeError
 */
function usage(writeError) {
  writeError(
    'usage: node infra/environments/infra-cli.mjs <plan|up|status> --env dev|release [--services none|core|all|service,...]\n',
  );
}

/**
 * @param {string[]} argv
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   runner?: typeof defaultPlatformRunner,
 *   memoryMiB?: number | null,
 *   operationDeps?: object,
 *   onProgress?: import('./infra-progress.mjs').InfraProgressCallback,
 *   now?: () => number,
 *   io?: { write?: (chunk: string) => void, writeError?: (chunk: string) => void },
 * }} [deps]
 */
export function runInfraCliArgv(argv, deps = {}) {
  const write = deps.io?.write ?? ((chunk) => process.stdout.write(chunk));
  const writeError =
    deps.io?.writeError ?? ((chunk) => process.stderr.write(chunk));

  const parsed = parseInfraCliArgs(argv);
  if (parsed.ok && parsed.help) {
    write(buildInfraCliHelp(parsed.command));
    return { exitCode: 0, wroteHelp: true };
  }
  if (!parsed.ok) {
    usage(writeError);
    writeError(`${parsed.message}\n`);
    return { exitCode: parsed.exitCode, wroteUsage: true };
  }

  const writeDispatch = (result) => {
    if (parsed.outputMode === 'human') {
      write(
        formatInfraResult(parsed.command, parsed.profileId, result.payload, {
          services: parsed.services,
        }),
      );
    } else {
      write(`${JSON.stringify(result.payload)}\n`);
      if (result.stderr) {
        writeError(result.stderr);
      }
    }
    return result.exitCode;
  };

  if (parsed.command === 'up') {
    /** @type {typeof deps} */
    const upDeps = { ...deps };
    if (parsed.outputMode === 'human' && upDeps.onProgress == null) {
      upDeps.onProgress = (event) => {
        writeError(formatInfraProgressLine(event));
      };
    }
    let dispatchResult;
    runTrackedEntrypoint(
      `infra.up.${parsed.profileId}`,
      () => {
        dispatchResult = dispatchInfraCli(parsed, upDeps);
        return {
          exitCode: dispatchResult.exitCode,
          refused: dispatchResult.exitCode === 2,
        };
      },
      { repoRoot: REPO_ROOT, ...deps.operationDeps },
    );
    return { exitCode: writeDispatch(dispatchResult) };
  }

  const dispatchResult = dispatchInfraCli(parsed, deps);
  return { exitCode: writeDispatch(dispatchResult) };
}

const modulePath = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] === modulePath ||
  process.argv[1] === join(dirname(modulePath), 'infra-cli.mjs');
if (isMain) {
  const result = runInfraCliArgv(process.argv.slice(2));
  process.exitCode = result.exitCode;
}
