/**
 * Read-only kind observation for the pinned offscreen lab.
 * The command runner is injected. Live calls use kubectl/kind GET only.
 */

import { spawn } from 'node:child_process';
import {
  LAB_OWNED_APP_IDENTITY,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
  OPENROUTER_API_KEY_ENV,
} from './testlab-target-guard.mjs';

const CONTEXT = LAB_OWNED_APP_IDENTITY.contextName;
const MAX_STDOUT = 1_500_000;
const DEFAULT_TIMEOUT_MS = 8_000;

const SENSITIVE_ENV = new Set([
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
  OPENROUTER_API_KEY_ENV,
]);

/**
 * @param {string[]} argv
 * @returns {string | null}
 */
export function refusedKindReadArgv(argv) {
  if (argv[0] === 'kind' && argv.length === 3 && argv[1] === 'get' && argv[2] === 'clusters') {
    return null;
  }
  if (argv[0] === 'kubectl' && argv.length === 3 && argv[1] === 'config' && argv[2] === 'current-context') {
    return null;
  }
  if (argv[0] !== 'kubectl') {
    return 'only kind get clusters and kubectl reads are allowed';
  }
  const contextAt = argv.indexOf('--context');
  if (contextAt < 0 || argv[contextAt + 1] !== CONTEXT) {
    return 'kubectl reads must pin --context kind-offscreen-release';
  }
  if (!argv.includes('get') || argv.includes('delete') || argv.includes('apply') || argv.includes('patch') || argv.includes('exec')) {
    return 'kubectl verb must be get';
  }
  if (!argv.includes('-o') || argv[argv.indexOf('-o') + 1] !== 'json') {
    return 'kubectl reads must use -o json';
  }
  return null;
}

/**
 * @param {string[]} argv
 * @param {{ timeoutMs?: number }} [options]
 */
export function runKindReadCommand(argv, options = {}) {
  const refused = refusedKindReadArgv(argv);
  if (refused) {
    return Promise.resolve({ code: 1, stdout: '', stderr: refused, timedOut: false });
  }
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      if (stdout.length > MAX_STDOUT) {
        timedOut = true;
        child.kill('SIGKILL');
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code: code ?? 1,
        stdout: stdout.slice(0, MAX_STDOUT),
        stderr,
        timedOut,
      });
    });
  });
}

/**
 * @param {string[]} argv
 * @param {(argv: string[]) => Promise<{ code: number, stdout: string, stderr: string, timedOut?: boolean }>} exec
 */
async function readJson(argv, exec) {
  const refused = refusedKindReadArgv(argv);
  if (refused) {
    return { ok: false, id: 'kubectl-verb-refused', message: refused };
  }
  const result = await exec(argv);
  if (result.timedOut) {
    return { ok: false, id: 'kubectl-timeout', message: 'Kind read exceeded timeout or size limit.' };
  }
  if (result.code !== 0) {
    return {
      ok: false,
      id: 'kubectl-read-failed',
      message: `Read failed (${result.code}).`,
    };
  }
  try {
    return { ok: true, value: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, id: 'kubectl-json-invalid', message: 'Kind read was not JSON.' };
  }
}

/**
 * @param {Record<string, unknown>} container
 */
function readContainerEnv(container) {
  /** @type {Record<string, string>} */
  const env = {};
  let ambiguousValueFrom = false;
  const rows = Array.isArray(container.env) ? container.env : [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const name = typeof row.name === 'string' ? row.name : '';
    if (!SENSITIVE_ENV.has(name)) continue;
    if (row.valueFrom) {
      ambiguousValueFrom = true;
      if (name === OPENROUTER_API_KEY_ENV || name.includes('PROVIDER')) {
        env[name] = 'secret-ref';
      }
      continue;
    }
    if (typeof row.value === 'string') env[name] = row.value;
  }
  const envFrom = Array.isArray(container.envFrom) && container.envFrom.length > 0;
  return { env, envFrom, ambiguousValueFrom };
}

/**
 * @param {Record<string, unknown>} deployment
 * @param {Record<string, unknown>} podList
 * @param {string} namespace
 * @param {string} name
 */
function workloadFrom(deployment, podList, namespace, name) {
  const meta = deployment.metadata ?? {};
  const spec = deployment.spec ?? {};
  const template = spec.template?.spec ?? {};
  const containers = Array.isArray(template.containers) ? template.containers : [];
  const container = containers[0] ?? {};
  const image = typeof container.image === 'string' ? container.image : '';
  const parsed = readContainerEnv(container);
  const pods = Array.isArray(podList.items) ? podList.items : [];
  const owned = pods.filter((pod) => {
    const owners = pod?.metadata?.ownerReferences ?? [];
    return owners.some(
      (owner) =>
        owner?.kind === 'ReplicaSet' &&
        typeof owner?.name === 'string' &&
        owner.name.startsWith(`${name}-`),
    );
  });
  const readyPod = owned.find((pod) => {
    const phase = pod?.status?.phase;
    const statuses = pod?.status?.containerStatuses ?? [];
    return phase === 'Running' && statuses.length > 0 && statuses.every((item) => item.ready === true);
  });
  const podContainer = readyPod?.spec?.containers?.[0] ?? {};
  const podImage = typeof podContainer.image === 'string' ? podContainer.image : '';
  const podEnv = readContainerEnv(podContainer);
  return {
    namespace,
    deploymentName: name,
    deploymentUid: typeof meta.uid === 'string' ? meta.uid : '',
    image,
    podImage,
    ready: Boolean(readyPod) && podImage === image && image !== '',
    env: { ...parsed.env, ...podEnv.env },
    envFrom: parsed.envFrom || podEnv.envFrom,
    ambiguousValueFrom: parsed.ambiguousValueFrom || podEnv.ambiguousValueFrom,
  };
}

/**
 * @param {{ exec?: (argv: string[]) => Promise<{ code: number, stdout: string, stderr: string, timedOut?: boolean }> }} [deps]
 */
export async function createTestlabKindObservation(deps = {}) {
  const exec = deps.exec ?? runKindReadCommand;
  const id = LAB_OWNED_APP_IDENTITY;
  const kubectl = ['kubectl', '--context', CONTEXT];

  const clusters = await exec(['kind', 'get', 'clusters']);
  if (clusters.code !== 0 || clusters.timedOut) {
    return blocked('kind-clusters-unreadable', 'kind get clusters failed.');
  }
  const names = clusters.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!names.includes(id.clusterName)) {
    return blocked('wrong-cluster-name', `kind clusters do not include ${id.clusterName}.`);
  }

  const context = await exec(['kubectl', 'config', 'current-context']);
  if (context.code !== 0 || context.stdout.trim() !== CONTEXT) {
    return blocked('wrong-cluster-context', `Current context must be ${CONTEXT}.`);
  }

  const kubeSystem = await readJson([...kubectl, 'get', 'namespace', 'kube-system', '-o', 'json'], exec);
  if (!kubeSystem.ok) return blocked(kubeSystem.id, kubeSystem.message);
  const clusterUid = kubeSystem.value?.metadata?.uid;
  if (typeof clusterUid !== 'string' || clusterUid === '') {
    return blocked('missing-cluster-uid', 'kube-system UID was missing.');
  }

  const cnpg = await readJson(
    [...kubectl, '-n', id.postgresNamespace, 'get', 'cluster.postgresql.cnpg.io', id.postgresClusterName, '-o', 'json'],
    exec,
  );
  if (!cnpg.ok) return blocked(cnpg.id, cnpg.message);
  const dbUid = cnpg.value?.metadata?.uid;
  const primary = cnpg.value?.status?.currentPrimary;
  if (typeof dbUid !== 'string' || dbUid === '' || typeof primary !== 'string' || primary === '') {
    return blocked('missing-db-instance-uid', 'CNPG cluster UID or current primary is missing.');
  }

  const service = await readJson(
    [...kubectl, '-n', id.postgresNamespace, 'get', 'service', 'lab-pg-rw', '-o', 'json'],
    exec,
  );
  if (!service.ok) return blocked(service.id, service.message);
  const endpoints = await readJson(
    [...kubectl, '-n', id.postgresNamespace, 'get', 'endpoints', 'lab-pg-rw', '-o', 'json'],
    exec,
  );
  if (!endpoints.ok) return blocked(endpoints.id, endpoints.message);
  const addresses = (endpoints.value?.subsets ?? []).flatMap((subset) => subset.addresses ?? []);
  if (addresses.length !== 1 || addresses[0]?.targetRef?.name !== primary) {
    return blocked('ambiguous-db-endpoint', 'lab-pg-rw must select exactly the current CNPG primary.');
  }

  const authorityDeploy = await readJson(
    [...kubectl, '-n', id.authorityNamespace, 'get', 'deployment', id.gameAuthorityDeployment, '-o', 'json'],
    exec,
  );
  const authorityPods = await readJson(
    [...kubectl, '-n', id.authorityNamespace, 'get', 'pods', '-o', 'json'],
    exec,
  );
  const workerDeploy = await readJson(
    [...kubectl, '-n', id.workersNamespace, 'get', 'deployment', id.gameExecutorDeployment, '-o', 'json'],
    exec,
  );
  const workerPods = await readJson(
    [...kubectl, '-n', id.workersNamespace, 'get', 'pods', '-o', 'json'],
    exec,
  );
  for (const item of [authorityDeploy, authorityPods, workerDeploy, workerPods]) {
    if (!item.ok) return blocked(item.id, item.message);
  }

  const gameAuthority = workloadFrom(authorityDeploy.value, authorityPods.value, id.authorityNamespace, id.gameAuthorityDeployment);
  const gameExecutor = workloadFrom(workerDeploy.value, workerPods.value, id.workersNamespace, id.gameExecutorDeployment);
  if (!gameAuthority.ready || !gameExecutor.ready) {
    return blocked('workload-not-ready', 'game-authority and game-executor need a Ready pod whose image matches the deployment template.');
  }

  return {
    ok: true,
    observation: {
      target: 'kind-offscreen-release',
      cluster: {
        contextName: CONTEXT,
        clusterName: id.clusterName,
        uid: clusterUid,
      },
      dbInstance: {
        namespace: id.postgresNamespace,
        name: id.postgresClusterName,
        kind: id.postgresClusterKind,
        uid: dbUid,
      },
      primaryPod: primary,
      gameAuthority,
      gameExecutor,
    },
  };
}

function blocked(id, message) {
  return { ok: false, id, message };
}
