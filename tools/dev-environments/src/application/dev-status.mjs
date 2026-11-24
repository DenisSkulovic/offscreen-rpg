import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  devRuntimeReceiptRoot,
  evaluateDevLoadedRuntimeReadiness,
} from '../../runtime/generation.mjs';
import { DEV_POD_RUNTIME_RECEIPT_DIR } from '../rendering/dev-slot-app-graph.mjs';

/** @typedef {{
 *   pid: number | null,
 *   processStartTicks?: string | null,
 *   forwardPid?: number | null,
 *   forwardStartTicks?: string | null,
 *   slotId: string,
 *   namespace: string,
 *   gamePort: number,
 *   tiltPort: number,
 *   startedAt: string,
 *   stopped?: boolean,
 *   stoppedAt?: string,
 *   parked?: boolean,
 *   checkoutPath?: string,
 * }} DevSessionRecord */

const LOOPBACK = '127.0.0.1';

const SLOT_NAMESPACE = /^offscreen-dev-[1-9][0-9]*$/;
const SLOT_WORKLOADS = [
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
];

export const LAB_RESOURCES = Object.freeze([...SLOT_WORKLOADS]);

/** @typedef {{ role: string, receiptRole: string, compiledEntryPath: string }} DevRuntimeFreshnessRole */

export const DEV_RUNTIME_FRESHNESS_ROLES = Object.freeze(
  /** @type {const} */ ([
    {
      role: 'api',
      receiptRole: 'api',
      compiledEntryPath: 'apps/api/dist/src/main.js',
    },
    {
      role: 'authority',
      receiptRole: 'game-authority',
      compiledEntryPath: 'apps/game-authority/dist/src/bootstrap/main.js',
    },
    {
      role: 'control',
      receiptRole: 'worker-control',
      compiledEntryPath: 'apps/worker/dist/src/bootstrap/control-main.js',
    },
    {
      role: 'executor',
      receiptRole: 'worker-executor',
      compiledEntryPath: 'apps/worker/dist/src/bootstrap/executor-main.js',
    },
    {
      role: 'relay',
      receiptRole: 'worker-relay',
      compiledEntryPath: 'apps/worker/dist/src/bootstrap/main.js',
    },
  ]),
);

const FRESHNESS_ROLE_WORKLOAD = Object.freeze({
  api: 'game-api',
  authority: 'game-authority',
  control: 'game-control',
  executor: 'game-executor',
  relay: 'game-relay',
});

const POD_COMPILED_ENTRY = Object.freeze({
  api: '/app/apps/api/dist/src/main.js',
  authority: '/app/apps/game-authority/dist/src/bootstrap/main.js',
  control: '/app/apps/worker/dist/src/bootstrap/control-main.js',
  executor: '/app/apps/worker/dist/src/bootstrap/executor-main.js',
  relay: '/app/apps/worker/dist/src/bootstrap/main.js',
});

export const DEV_POD_RUNTIME_STATUS_SCRIPT =
  '/app/tools/dev-environments/runtime/status.mjs';

export const KIND_DEV_IMAGE_NODES = Object.freeze([
  'offscreen-dev-worker',
  'offscreen-dev-control-plane',
]);

/** @typedef {Record<string, boolean | undefined>} ReadinessMap */

/**
 * @param {string} worktree
 * @returns {string}
 */
function devSessionPath(worktree) {
  return join(resolve(worktree), '.offscreen', 'dev-session.json');
}

/**
 * @param {string} worktree
 * @returns {DevSessionRecord | null}
 */
function readDevSession(worktree) {
  const file = devSessionPath(worktree);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   slotId: string,
 *   phase: string,
 *   nextAction?: string | null,
 * }} input
 */
function formatDevOperatorSummaryLine(input) {
  const parts = [`slot ${input.slotId}`, `phase=${input.phase}`];
  if (input.nextAction) {
    parts.push(`next=${input.nextAction}`);
  }
  return parts.join(' ');
}

/**
 * Docker Hub's default registry and single-name library namespace are the
 * same image. A different registry, repository, tag or digest stays different.
 * @param {string | null | undefined} reference
 * @returns {string | null}
 */
export function canonicalDockerImageReference(reference) {
  if (!reference || typeof reference !== 'string') return null;
  let digest = null;
  const at = reference.lastIndexOf('@');
  let rest = reference;
  if (at > 0 && reference.slice(at + 1).startsWith('sha256:')) {
    digest = reference.slice(at + 1);
    rest = reference.slice(0, at);
  }
  let registry = 'docker.io';
  let name = rest;
  const firstSlash = rest.indexOf('/');
  const firstSegment = firstSlash > 0 ? rest.slice(0, firstSlash) : '';
  if (
    firstSegment.includes('.') ||
    firstSegment.includes(':') ||
    firstSegment === 'localhost'
  ) {
    registry = firstSegment;
    name = rest.slice(firstSlash + 1);
  }
  if (registry === 'docker.io' && !name.includes('/')) {
    name = `library/${name}`;
  }
  const colon = name.lastIndexOf(':');
  let tag = 'latest';
  if (colon > 0) {
    tag = name.slice(colon + 1);
    name = name.slice(0, colon);
  }
  return `${registry}/${name}:${tag}${digest ? `@${digest}` : ''}`;
}

/**
 * Digests that identify one CRI image record. `status.id` is the config id.
 * `repoDigests` are the manifest ids Kubernetes stores on a running container.
 * Callers may match either form. An OCI index digest is not included.
 * @param {string} inspectText
 * @returns {string[]}
 */
export function acceptedCriImageIds(inspectText) {
  let parsed;
  try {
    parsed = JSON.parse(inspectText);
  } catch {
    return [];
  }
  const ids = [];
  const statusId = parsed?.status?.id;
  if (typeof statusId === 'string' && /^sha256:[a-f0-9]{64}$/.test(statusId))
    ids.push(statusId);
  for (const ref of parsed?.status?.repoDigests ?? []) {
    const digest = String(ref).match(/sha256:[a-f0-9]{64}/)?.[0];
    if (digest && !ids.includes(digest)) ids.push(digest);
  }
  return ids;
}

/**
 * Image config digests accepted on each dev Kind node for one registry tag.
 * @param {string} image
 * @param {typeof spawnSync} [runCommand]
 * @returns {string[]}
 */
export function resolveDevImageConfigIds(image, runCommand = spawnSync) {
  /** @type {string[]} */
  const accepted = [];
  for (const node of KIND_DEV_IMAGE_NODES) {
    const cri = runCommand(
      'docker',
      ['exec', node, 'crictl', 'inspecti', `docker.io/library/${image}`],
      { encoding: 'utf8' },
    );
    if (cri.status !== 0) continue;
    for (const id of acceptedCriImageIds(String(cri.stdout ?? ''))) {
      if (!accepted.includes(id)) accepted.push(id);
    }
  }
  return accepted;
}

/**
 * @param {number} gamePort
 * @param {{ fetch?: typeof fetch, signalMs?: number }} [deps]
 * @returns {Promise<number | null>}
 */
export async function probeHostGameHttp(gamePort, deps = {}) {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') return null;
  const timeoutMs = deps.signalMs ?? 2_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`http://${LOOPBACK}:${gamePort}/sign-in`, {
      signal: controller.signal,
    });
    return response.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function assessWebDevServerReadiness(input) {
  const pod = input.pod ?? null;
  if (!pod?.ready) {
    return {
      ready: false,
      reason: 'web_pod_not_ready',
      currentGeneration: null,
    };
  }
  if (pod.namespace !== input.namespace) {
    return {
      ready: false,
      reason: 'namespace_mismatch',
      currentGeneration: null,
    };
  }
  const expectedImage = canonicalDockerImageReference(input.expectedImage);
  const runningImage = canonicalDockerImageReference(pod.image);
  const accepted =
    input.expectedConfigIds ??
    (input.expectedConfigId ? [input.expectedConfigId] : null);
  const runningConfig =
    typeof pod.imageId === 'string'
      ? ((pod.imageId.match(/sha256:[a-f0-9]{64}/) ?? [])[0] ?? null)
      : null;
  const identityMatches = Boolean(
    accepted && runningConfig && accepted.includes(runningConfig),
  );
  if (expectedImage && runningImage !== expectedImage && !identityMatches) {
    return { ready: false, reason: 'image_mismatch', currentGeneration: null };
  }
  if (accepted && !identityMatches) {
    return { ready: false, reason: 'image_mismatch', currentGeneration: null };
  }
  if (
    typeof input.httpStatus !== 'number' ||
    input.httpStatus < 200 ||
    input.httpStatus >= 300
  ) {
    return {
      ready: false,
      reason: 'http_unsuccessful',
      currentGeneration: null,
    };
  }
  return {
    ready: true,
    reason: 'dev_server_serving',
    currentGeneration: expectedImage,
  };
}

/**
 * Deployment readyReplicas for the six slot workloads. Missing output is not ready.
 * @param {string} namespace
 * @param {typeof spawnSync} [spawnFn]
 */
export function collectOwnedWorkloadReadiness(namespace, spawnFn = spawnSync) {
  if (!SLOT_NAMESPACE.test(namespace)) {
    throw new Error(`refusing to read readiness in ${namespace}`);
  }
  /** @type {Record<string, boolean>} */
  const readiness = {};
  for (const name of SLOT_WORKLOADS) {
    const result = spawnFn(
      'kubectl',
      [
        '--context',
        'kind-offscreen-dev',
        '-n',
        namespace,
        'get',
        'deploy',
        name,
        '-o',
        'jsonpath={.status.readyReplicas}',
      ],
      { encoding: 'utf8' },
    );
    readiness[name] =
      result.status === 0 && String(result.stdout).trim() === '1';
  }
  return readiness;
}

/**
 * @param {string} displayRole
 * @param {{ ready: boolean, reason: string, currentGeneration: string | null }} status
 * @returns {string}
 */
export function formatDevFreshnessStatusLine(displayRole, status) {
  if (status.ready) {
    return `${displayRole} READY ${status.reason} ${status.currentGeneration}`;
  }
  return `${displayRole} NOT READY ${status.reason}`;
}

/**
 * @param {number} gamePort
 * @param {number} tiltPort
 */
export function buildReadyUrls(gamePort, tiltPort) {
  return {
    game: `http://${LOOPBACK}:${gamePort}/`,
    control: `http://${LOOPBACK}:${gamePort}/control`,
    tilt: `http://${LOOPBACK}:${tiltPort}/`,
  };
}

/**
 * @param {{ status?: number | null, stdout?: string, stderr?: string }} execResult
 */
export function parseRemoteRuntimeObservation(execResult) {
  if (execResult.status !== 0 || !String(execResult.stdout ?? '').trim()) {
    return { ok: false, reason: 'remote_unreadable' };
  }
  try {
    const parsed = JSON.parse(String(execResult.stdout).trim());
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, reason: 'remote_unreadable' };
    }
    return parsed;
  } catch {
    return { ok: false, reason: 'remote_unreadable' };
  }
}

/**
 * @param {Record<string, unknown>} observation
 */
function writeEphemeralReceiptRoot(observation) {
  const desired = /** @type {Record<string, unknown>} */ (observation.desired);
  const loaded = /** @type {Record<string, unknown>} */ (observation.loaded);
  const root = mkdtempSync(join(tmpdir(), 'offscreen-remote-rcpt-'));
  writeFileSync(
    join(root, `${String(desired.role)}.desired.json`),
    `${JSON.stringify(desired)}\n`,
    'utf8',
  );
  writeFileSync(
    join(root, `${String(loaded.role)}.loaded.json`),
    `${JSON.stringify(loaded)}\n`,
    'utf8',
  );
  return root;
}

/**
 * @param {DevRuntimeFreshnessRole} roleSpec
 * @param {Record<string, unknown> | null | undefined} observation
 * @param {typeof evaluateDevLoadedRuntimeReadiness} evaluate
 * @param {string | null} [expectedEnvironmentId]
 */
export function readinessFromRemoteObservation(
  roleSpec,
  observation,
  evaluate,
  expectedEnvironmentId = null,
) {
  if (!observation?.ok) {
    return {
      ready: false,
      reason:
        typeof observation?.reason === 'string'
          ? observation.reason
          : 'remote_unreadable',
      currentGeneration: null,
    };
  }
  if (observation.legacyReceipt === true) {
    return {
      ready: false,
      reason: 'restart_required',
      currentGeneration: null,
    };
  }
  if (observation.concurrentUpdate === true) {
    return {
      ready: false,
      reason: 'concurrent_compile',
      currentGeneration: null,
    };
  }
  if (observation.pidAlive === false) {
    return {
      ready: false,
      reason: 'dead_loaded_process',
      currentGeneration: null,
    };
  }
  if (typeof observation.diskIdentity !== 'string') {
    return {
      ready: false,
      reason: 'missing_disk_identity',
      currentGeneration: null,
    };
  }
  const ephemeralRoot = writeEphemeralReceiptRoot(observation);
  try {
    return evaluate({
      role: roleSpec.receiptRole,
      compiledEntryPath: roleSpec.compiledEntryPath,
      cwd: '/',
      receiptRoot: ephemeralRoot,
      environmentId:
        expectedEnvironmentId ??
        (typeof observation.environmentId === 'string'
          ? observation.environmentId
          : null),
      diskIdentity: observation.diskIdentity,
      requireRemoteDiskIdentity: true,
    });
  } finally {
    rmSync(ephemeralRoot, { recursive: true, force: true });
  }
}

/**
 * One kubectl exec per role runs the pod status helper; no host receipt cache.
 * @param {{
 *   namespace: string,
 *   roles: readonly DevRuntimeFreshnessRole[],
 *   environmentId?: string,
 *   receiptDir?: string,
 *   context?: string,
 *   run: (args: string[]) => { status?: number | null, stdout?: string, stderr?: string },
 * }} input
 */
export function observeSelectedSlotRuntimeRoles(input) {
  const context = input.context ?? 'kind-offscreen-dev';
  const receiptDir = input.receiptDir ?? DEV_POD_RUNTIME_RECEIPT_DIR;
  /** @type {Record<string, ReturnType<typeof parseRemoteRuntimeObservation>>} */
  const observations = {};
  for (const roleSpec of input.roles) {
    const deploy = `deploy/game-${roleSpec.role}`;
    const podEntry = POD_COMPILED_ENTRY[roleSpec.role];
    const args = [
      '--context',
      context,
      '-n',
      input.namespace,
      'exec',
      deploy,
      '--',
      'node',
      DEV_POD_RUNTIME_STATUS_SCRIPT,
      '--receipt-role',
      roleSpec.receiptRole,
      '--compiled-entry',
      podEntry,
      '--receipt-dir',
      receiptDir,
    ];
    if (input.environmentId) {
      args.push('--environment-id', input.environmentId);
    }
    observations[roleSpec.role] = parseRemoteRuntimeObservation(
      input.run(args),
    );
  }
  return observations;
}

/**
 * Read the selected slot's game-web pod image and one HTTP status from inside
 * the cluster. A missing pod or a failed request stays unsuccessful.
 * @param {{ namespace: string, run?: Function, httpStatus?: number | null }} input
 */
export function collectWebDevServerReadiness(input) {
  const run =
    input.run ?? ((args) => spawnSync('kubectl', args, { encoding: 'utf8' }));
  const pod = run([
    '--context',
    'kind-offscreen-dev',
    '-n',
    input.namespace,
    'get',
    'pod',
    '-l',
    'app=game-web',
    '-o',
    'jsonpath={.items[0].metadata.namespace}{" "}{.items[0].status.containerStatuses[0].ready}{" "}{.items[0].status.containerStatuses[0].image}{" "}{.items[0].status.containerStatuses[0].imageID}',
  ]);
  const [namespace, ready, image, imageId] = String(pod.stdout ?? '')
    .trim()
    .split(/\s+/);
  let httpStatus = input.httpStatus ?? null;
  if (httpStatus === null && pod.status === 0 && ready === 'true') {
    const http = run([
      '--context',
      'kind-offscreen-dev',
      '-n',
      input.namespace,
      'exec',
      'deploy/game-web',
      '--',
      'node',
      '-e',
      'fetch("http://127.0.0.1:3000/sign-in").then((r)=>process.stdout.write(String(r.status))).catch(()=>process.exit(1))',
    ]);
    httpStatus = http.status === 0 ? Number(String(http.stdout).trim()) : null;
  }
  const expected = run([
    '--context',
    'kind-offscreen-dev',
    '-n',
    input.namespace,
    'get',
    'deploy',
    'game-web',
    '-o',
    'jsonpath={.spec.template.spec.containers[0].image}',
  ]);
  const expectedImage =
    expected.status === 0 ? String(expected.stdout).trim() : null;
  const expectedConfigIds = [...(input.expectedConfigIds ?? [])];
  if (input.expectedConfigId) expectedConfigIds.push(input.expectedConfigId);
  if (
    expectedConfigIds.length === 0 &&
    expectedImage &&
    input.resolveImageIds
  ) {
    expectedConfigIds.push(
      ...input.resolveImageIds(expectedImage).filter(Boolean),
    );
  }
  return {
    namespace: input.namespace,
    expectedImage,
    expectedConfigIds: expectedConfigIds.length > 0 ? expectedConfigIds : null,
    pod:
      pod.status === 0 && namespace
        ? {
            ready: ready === 'true',
            namespace,
            image: image || null,
            imageId: imageId || null,
          }
        : null,
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : null,
  };
}

/**
 * One probe for deployment readiness, pod image, remote v2 generations and web
 * HTTP. Host cached receipts are not used when observing the selected slot.
 * @param {{
 *   namespace: string,
 *   environmentId?: string | null,
 *   roles?: readonly DevRuntimeFreshnessRole[],
 *   useRemoteObservations?: boolean,
 *   observeDeployments?: boolean,
 *   deploymentReadiness?: Record<string, boolean>,
 *   requireHostHttp?: boolean,
 *   gamePort?: number,
 *   hostHttpStatus?: number | null,
 *   cwd?: string,
 *   receiptRoot?: string | null,
 *   diskIdentities?: Record<string, string | undefined>,
 *   roleObservations?: Record<string, ReturnType<typeof parseRemoteRuntimeObservation>> | null,
 *   webReadiness?: Parameters<typeof assessWebDevServerReadiness>[0],
 *   run?: (args: string[]) => { status?: number | null, stdout?: string, stderr?: string },
 *   spawnFn?: typeof spawnSync,
 *   resolveImageIds?: (image: string) => string[],
 *   evaluateDevLoadedRuntimeReadiness?: typeof evaluateDevLoadedRuntimeReadiness,
 *   assessWebDevServerReadiness?: typeof assessWebDevServerReadiness,
 *   readinessFromRemoteObservation?: typeof readinessFromRemoteObservation,
 *   fetch?: typeof fetch,
 * }} input
 */
export function collectSelectedSlotReadiness(input) {
  const roles = input.roles ?? DEV_RUNTIME_FRESHNESS_ROLES;
  const evaluate =
    input.evaluateDevLoadedRuntimeReadiness ??
    evaluateDevLoadedRuntimeReadiness;
  const assessWeb =
    input.assessWebDevServerReadiness ?? assessWebDevServerReadiness;
  const remoteReadiness =
    input.readinessFromRemoteObservation ?? readinessFromRemoteObservation;
  const useRemoteObservations = input.useRemoteObservations === true;
  const observeDeployments =
    input.observeDeployments === undefined
      ? useRemoteObservations
      : input.observeDeployments;
  const run =
    input.run ?? ((args) => spawnSync('kubectl', args, { encoding: 'utf8' }));
  const spawnFn = input.spawnFn ?? spawnSync;
  const resolveImageIds =
    input.resolveImageIds ??
    ((image) => resolveDevImageConfigIds(image, spawnFn));
  const deploymentReadiness =
    input.deploymentReadiness ??
    (observeDeployments && input.namespace
      ? collectOwnedWorkloadReadiness(input.namespace, spawnFn)
      : Object.fromEntries(LAB_RESOURCES.map((name) => [name, true])));

  let roleObservations = input.roleObservations ?? null;
  if (useRemoteObservations && !roleObservations) {
    roleObservations = observeSelectedSlotRuntimeRoles({
      namespace: input.namespace,
      roles,
      environmentId: input.environmentId ?? undefined,
      run,
    });
  }

  const webInput =
    input.webReadiness ??
    (useRemoteObservations
      ? collectWebDevServerReadiness({
          namespace: input.namespace,
          run,
          resolveImageIds,
        })
      : {
          namespace: input.namespace,
          expectedImage: null,
          pod: null,
          httpStatus: null,
        });

  /** @type {Record<string, ReturnType<typeof evaluateDevLoadedRuntimeReadiness>>} */
  const roleStatuses = {};
  for (const roleSpec of roles) {
    roleStatuses[roleSpec.role] = useRemoteObservations
      ? remoteReadiness(
          roleSpec,
          roleObservations?.[roleSpec.role],
          evaluate,
          input.environmentId ?? null,
        )
      : evaluate({
          role: roleSpec.receiptRole,
          compiledEntryPath: roleSpec.compiledEntryPath,
          cwd: input.cwd ?? '/',
          receiptRoot:
            input.receiptRoot ?? devRuntimeReceiptRoot(input.cwd ?? '/'),
          environmentId: input.environmentId ?? null,
          diskIdentity: input.diskIdentities?.[roleSpec.role],
        });
  }

  const webStatus = assessWeb(webInput);
  /** @type {ReadinessMap} */
  const readiness = {};
  for (const roleSpec of roles) {
    const deploy = FRESHNESS_ROLE_WORKLOAD[roleSpec.role];
    if (!deploy) continue;
    readiness[deploy] =
      deploymentReadiness[deploy] === true &&
      roleStatuses[roleSpec.role]?.ready === true;
  }
  readiness['game-web'] =
    deploymentReadiness['game-web'] === true && webStatus.ready === true;

  return {
    deploymentReadiness,
    roleObservations,
    roleStatuses,
    webInput,
    webStatus,
    readiness,
    hostHttpStatus: input.hostHttpStatus ?? null,
    runtimeReady: LAB_RESOURCES.every((name) => readiness[name] === true),
  };
}

/**
 * Apply the post-forward host HTTP check without re-running cluster probes.
 * @param {ReturnType<typeof collectSelectedSlotReadiness>} snapshot
 * @param {{
 *   gamePort: number,
 *   hostHttpStatus?: number | null,
 *   fetch?: typeof fetch,
 *   signalMs?: number,
 * }} input
 */
export async function applySelectedSlotHostReadiness(snapshot, input) {
  const readiness = { ...snapshot.readiness };
  let hostHttpStatus = input.hostHttpStatus ?? null;
  if (hostHttpStatus === null) {
    hostHttpStatus = await probeHostGameHttp(input.gamePort, input);
  }
  if (!(
    typeof hostHttpStatus === 'number' &&
    hostHttpStatus >= 200 &&
    hostHttpStatus < 300
  )) {
    readiness['game-web'] = false;
  }
  return {
    ...snapshot,
    readiness,
    hostHttpStatus,
    runtimeReady: LAB_RESOURCES.every((name) => readiness[name] === true),
  };
}

/**
 * @typedef {{
 *   log?: (line: string) => void,
 *   roles?: readonly DevRuntimeFreshnessRole[],
 *   evaluateDevLoadedRuntimeReadiness?: typeof evaluateDevLoadedRuntimeReadiness,
 * }} PrintDevStatusDeps */

/**
 * @param {string} worktree
 * @param {PrintDevStatusDeps & Record<string, unknown>} [deps]
 * @returns {number}
 */
export function printDevStatus(worktree, deps = {}) {
  const log = deps.log ?? ((line) => console.log(line));
  const roles = deps.roles ?? DEV_RUNTIME_FRESHNESS_ROLES;
  const evaluate =
    deps.evaluateDevLoadedRuntimeReadiness ?? evaluateDevLoadedRuntimeReadiness;
  const session = deps.session ?? readDevSession(worktree);
  if (!session) {
    return 2;
  }
  if (session.parked === true) {
    log(
      formatDevOperatorSummaryLine({
        slotId: session.slotId,
        phase: 'parked',
        nextAction: null,
      }),
    );
    return 2;
  }
  if (
    session.checkoutPath &&
    resolve(String(session.checkoutPath)) !== resolve(worktree)
  ) {
    log(
      formatDevOperatorSummaryLine({
        slotId: session.slotId,
        phase: 'checkout_mismatch',
        nextAction: 'stop',
      }),
    );
    return 2;
  }
  log(
    formatDevOperatorSummaryLine({
      slotId: session.slotId,
      phase: 'status',
      nextAction: null,
    }),
  );
  const rows = [
    ['pid', session.pid ?? 'stopped'],
    ['namespace', session.namespace],
    ['gameUrl', `http://${LOOPBACK}:${session.gamePort}/`],
    ['tiltPort', session.tiltPort],
    ['startedAt', session.startedAt],
  ];
  for (const [key, value] of rows) {
    log(`${key}: ${value}`);
  }

  const cwd = resolve(worktree);
  if (deps.imageReadiness && deps.imageReadiness.applicationReady !== true) {
    log('runtime NOT READY image_loading');
    return 2;
  }
  const useRemoteObservations =
    deps.pullSlotReceipts === true && Boolean(session.namespace);
  const receiptRoot = useRemoteObservations
    ? null
    : (deps.receiptRoot ??
      (session.slotId
        ? join(cwd, '.offscreen-dev-runtime', String(session.slotId))
        : join(cwd, '.offscreen-dev-runtime')));
  const diskIdentities = deps.diskIdentities ?? {};
  const execKubectl =
    deps.execKubectl ??
    ((args) => spawnSync('kubectl', args, { encoding: 'utf8' }));
  let everyRoleReady = true;
  if (session.namespace) {
    const snapshot =
      deps.selectedSlotReadiness ??
      collectSelectedSlotReadiness({
        namespace: session.namespace,
        environmentId: session.slotId ?? null,
        roles,
        useRemoteObservations,
        observeDeployments: deps.observeDeployments === true,
        cwd,
        receiptRoot: receiptRoot ?? devRuntimeReceiptRoot(cwd),
        diskIdentities,
        roleObservations: deps.roleObservations ?? null,
        webReadiness: deps.webReadiness,
        run: execKubectl,
        spawnFn: deps.spawnFn,
        resolveImageIds: deps.resolveImageIds ?? resolveDevImageConfigIds,
        evaluateDevLoadedRuntimeReadiness: evaluate,
        assessWebDevServerReadiness: deps.assessWebDevServerReadiness,
        readinessFromRemoteObservation: deps.readinessFromRemoteObservation,
      });
    log(formatDevFreshnessStatusLine('web', snapshot.webStatus));
    if (!snapshot.webStatus.ready) everyRoleReady = false;
    for (const roleSpec of roles) {
      const status = snapshot.roleStatuses[roleSpec.role];
      log(formatDevFreshnessStatusLine(roleSpec.role, status));
      if (!status.ready) everyRoleReady = false;
    }
  }

  return everyRoleReady ? 0 : 2;
}
