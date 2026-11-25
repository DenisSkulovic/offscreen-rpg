import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_OWNER,
} from './dev-bootstrap.mjs';
import { assessCnpgClusterTopologyReadiness } from './topology.mjs';

const CNPG_CLUSTER_LABEL = 'cnpg.io/cluster';
const CNPG_INSTANCE_ROLE = 'cnpg.io/instanceRole';
const DEV_DATABASE = 'dev';
const SQL_PROBE_TIMEOUT_MS = 30_000;
const DEFAULT_READINESS_TIMEOUT_MS = 480_000;
const READINESS_POLL_MS = 5_000;

/**
 * @param {object} pod
 * @param {string} expectedName
 * @returns {{ ok: true, primaryPod: string } | { ok: false, detail: string }}
 */
function verifyPrimaryPodLabels(pod, expectedName) {
  const name = pod?.metadata?.name;
  const namespace = pod?.metadata?.namespace;
  if (name !== expectedName || namespace !== DEV_CNPG_NAMESPACE) {
    return { ok: false, detail: 'primary pod name or namespace mismatch' };
  }
  const clusterLabel = pod?.metadata?.labels?.[CNPG_CLUSTER_LABEL];
  if (clusterLabel !== DEV_CNPG_CLUSTER) {
    return {
      ok: false,
      detail: 'primary pod cluster label is foreign or missing',
    };
  }
  const role = pod?.metadata?.labels?.[CNPG_INSTANCE_ROLE];
  if (typeof role !== 'string' || role.length === 0) {
    return { ok: false, detail: 'primary pod instance role is unknown' };
  }
  if (role !== 'primary') {
    return {
      ok: false,
      detail: `primary pod instance role is ${role}, not primary`,
    };
  }
  return { ok: true, primaryPod: name };
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} primaryPod
 */
function execAuthenticatedSelectOne(run, primaryPod) {
  return run(
    'kubectl',
    [
      '--context',
      DEV_CNPG_CONTEXT,
      '-n',
      DEV_CNPG_NAMESPACE,
      'exec',
      primaryPod,
      '--',
      'psql',
      '-U',
      'postgres',
      '-d',
      DEV_DATABASE,
      '-tAc',
      'SELECT 1',
    ],
    { timeoutMs: SQL_PROBE_TIMEOUT_MS },
  );
}

/**
 * Read-only observation that dev CNPG is ready on the verified current primary.
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 * @returns {{ ok: boolean, detail?: string, primaryPod?: string }}
 */
export function observeDevPostgresReady(deps = {}) {
  const run = deps.run ?? runPlatformCommand;

  try {
    assertPlatformTarget('dev', { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }

  const clusterObservation = readPlatformObject(
    {
      profileId: 'dev',
      resource: 'cluster.postgresql.cnpg.io',
      name: DEV_CNPG_CLUSTER,
      namespace: DEV_CNPG_NAMESPACE,
    },
    { run },
  );
  if (clusterObservation.state === 'unreadable') {
    return {
      ok: false,
      detail: `shared CNPG cluster status is unreadable: ${clusterObservation.reason}`,
    };
  }
  if (clusterObservation.state === 'absent') {
    return { ok: false, detail: 'shared CNPG cluster is absent' };
  }

  const cluster = clusterObservation.object;
  const owner = cluster?.metadata?.labels?.['offscreen.dev/owner'];
  if (owner !== DEV_CNPG_OWNER) {
    return { ok: false, detail: 'shared CNPG cluster has foreign ownership' };
  }

  const expectedInstances = cluster?.spec?.instances;
  const topology = assessCnpgClusterTopologyReadiness(
    cluster,
    expectedInstances,
  );
  if (!topology.ok) {
    return { ok: false, detail: `shared CNPG cluster ${topology.detail}` };
  }

  const currentPrimary = topology.currentPrimary;

  const podObservation = readPlatformObject(
    {
      profileId: 'dev',
      resource: 'pod',
      name: currentPrimary,
      namespace: DEV_CNPG_NAMESPACE,
    },
    { run },
  );
  if (podObservation.state === 'unreadable') {
    return {
      ok: false,
      detail: `shared CNPG primary pod is unreadable: ${podObservation.reason}`,
    };
  }
  if (podObservation.state === 'absent') {
    return { ok: false, detail: 'shared CNPG currentPrimary pod is absent' };
  }

  const podCheck = verifyPrimaryPodLabels(
    podObservation.object,
    currentPrimary,
  );
  if (!podCheck.ok) {
    return podCheck;
  }

  const sql = execAuthenticatedSelectOne(run, podCheck.primaryPod);
  if (!sql.ok || String(sql.stdout ?? '').trim() !== '1') {
    return {
      ok: false,
      detail: 'shared CNPG did not answer authenticated SELECT 1',
    };
  }

  return { ok: true, primaryPod: podCheck.primaryPod };
}

/**
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   readinessTimeoutMs?: number,
 * }} [deps]
 */
export function waitForDevPostgresReadiness(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const sleep = deps.sleep ?? (() => {});
  const now = deps.now ?? Date.now;
  const deadline =
    now() + (deps.readinessTimeoutMs ?? DEFAULT_READINESS_TIMEOUT_MS);
  let last = { ok: false, detail: 'shared CNPG cluster readiness timed out' };
  while (now() <= deadline) {
    last = observeDevPostgresReady({ run });
    if (last.ok) {
      return last;
    }
    if (now() >= deadline) {
      break;
    }
    sleep(READINESS_POLL_MS);
  }
  return last;
}

export const DEV_POSTGRES_READINESS_POLL_MS = READINESS_POLL_MS;
export const DEV_POSTGRES_READINESS_TIMEOUT_MS = DEFAULT_READINESS_TIMEOUT_MS;
export const DEV_POSTGRES_SQL_PROBE_TIMEOUT_MS = SQL_PROBE_TIMEOUT_MS;
export const DEV_POSTGRES_COMMAND_TIMEOUT_MS = PLATFORM_COMMAND_TIMEOUT_MS;
