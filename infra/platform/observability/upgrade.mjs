import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';

import { helmValuesArgv, loadObservabilityVariants } from './artifacts.mjs';
import { runPlatformCommand } from '../common/commands.mjs';
import { acquireCustody, readPending, runMutation } from './custody.mjs';
import { openForwards, probeForwardTransport } from './forward.mjs';
import {
  MIN_HOST_MEMORY_MIB,
  parseMeminfoMiB,
} from '../../clusters/kind/manager/host-probe.mjs';
import { captureIdentity, recheckIdentity } from './identity.mjs';
import { collectInventory, GRAFANA_ADMIN_SECRET } from './inventory.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { classifyInventory, verifyOwnedFinalShape } from './readiness.mjs';

const ADMISSION_MS = 30_000;
const MEMORY_TIMEOUT_MS = 3_000;
const UPGRADE_TIMEOUT_MS = 240_000;
const CLAIM_NAMES = [
  'obs-prometheus',
  'storage-obs-loki-0',
  'storage-obs-tempo-0',
];

/**
 * @param {string} text
 */
function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * @param {ReturnType<typeof loadObservabilityVariants>['desired']} artifacts
 */
export function relaySha256(artifacts) {
  const collector = artifacts.releases.find((row) => row.role === 'collector');
  return sha256(JSON.stringify(collector?.documents ?? []));
}

/**
 * Active backend Pod owned by the live workload.
 * Deployments resolve Deployment → ReplicaSet → Pod. Names are never inferred.
 *
 * @param {Record<string, object>} objects
 * @param {'Deployment' | 'StatefulSet'} kind
 * @param {string} workloadName
 */
function activeBackendPodUid(objects, kind, workloadName) {
  const workload = objects[`${kind}/${workloadName}`];
  const workloadUid = workload?.metadata?.uid;
  if (typeof workloadUid !== 'string') {
    return null;
  }
  /** @type {string[]} */
  const uids = [];
  for (const object of Object.values(objects)) {
    if (object?.kind !== 'Pod' || object.metadata?.deletionTimestamp != null) {
      continue;
    }
    const owners = object.metadata?.ownerReferences ?? [];
    if (owners.length !== 1) {
      continue;
    }
    const owner = owners[0];
    if (typeof owner?.uid !== 'string' || typeof owner?.name !== 'string') {
      continue;
    }
    let owned = false;
    if (kind === 'StatefulSet') {
      owned =
        owner.kind === 'StatefulSet' &&
        owner.name === workloadName &&
        owner.uid === workloadUid;
    } else if (owner.kind === 'ReplicaSet') {
      const replicaSet = objects[`ReplicaSet/${owner.name}`];
      const replicaOwners = replicaSet?.metadata?.ownerReferences ?? [];
      const replicaOwner = replicaOwners.length === 1 ? replicaOwners[0] : null;
      owned =
        replicaSet?.metadata?.uid === owner.uid &&
        replicaSet?.metadata?.deletionTimestamp == null &&
        replicaOwner?.kind === 'Deployment' &&
        replicaOwner?.name === workloadName &&
        replicaOwner?.uid === workloadUid;
    }
    const podUid = object.metadata?.uid;
    if (owned && typeof podUid === 'string') {
      uids.push(podUid);
    }
  }
  if (uids.length !== 1) {
    return null;
  }
  return uids[0];
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadObservabilityVariants>['desired']} artifacts
 */
export function projectUpgradePreservation(snapshot, artifacts) {
  const namespaceUid = snapshot.namespace?.uid;
  if (typeof namespaceUid !== 'string') {
    return null;
  }
  const objects = snapshot.objects ?? {};
  const collectorRelease = artifacts.releases.find((row) => row.role === 'collector');
  if (!collectorRelease) {
    return null;
  }
  const collector = {
    deploymentUid: objects['Deployment/obs-collector']?.metadata?.uid ?? null,
    configMapUid: null,
    serviceUid: null,
    serviceAccountUid: null,
  };
  for (const doc of collectorRelease.documents ?? []) {
    const live = objects[`${doc.kind}/${doc.metadata?.name}`];
    if (doc.kind === 'ConfigMap') {
      collector.configMapUid = live?.metadata?.uid ?? null;
    }
    if (doc.kind === 'Service') {
      collector.serviceUid = live?.metadata?.uid ?? null;
    }
    if (doc.kind === 'ServiceAccount') {
      collector.serviceAccountUid = live?.metadata?.uid ?? null;
    }
  }
  if (Object.values(collector).some((uid) => typeof uid !== 'string')) {
    return null;
  }
  /** @type {Record<string, object>} */
  const backends = {};
  for (const release of artifacts.releases) {
    if (release.role === 'collector') {
      continue;
    }
    const direct = [];
    const seen = new Set();
    for (const doc of release.documents ?? []) {
      const name = doc.metadata?.name;
      const live = objects[`${doc.kind}/${name}`];
      const uid = live?.metadata?.uid;
      if (typeof uid !== 'string' || seen.has(`${doc.kind}/${name}`)) {
        return null;
      }
      seen.add(`${doc.kind}/${name}`);
      direct.push({ kind: doc.kind, name, uid });
    }
    direct.sort((left, right) =>
      `${left.kind}/${left.name}`.localeCompare(`${right.kind}/${right.name}`),
    );
    const helm = snapshot.helmReleases?.find((row) => row.name === release.name);
    const revision = Number.parseInt(String(helm?.revision), 10);
    const secret = objects[`Secret/sh.helm.release.v1.${release.name}.v${revision}`];
    const kind = release.role === 'loki' || release.role === 'tempo' ? 'StatefulSet' : 'Deployment';
    const workloadName = `obs-${release.role}`;
    backends[release.role] = {
      direct,
      workloadUid: objects[`${kind}/${workloadName}`]?.metadata?.uid ?? null,
      podUid: activeBackendPodUid(objects, kind, workloadName),
      serviceUids: direct.filter((row) => row.kind === 'Service').map((row) => row.uid),
      revision,
      helmSecretUid: secret?.metadata?.uid ?? null,
    };
  }
  const claims = CLAIM_NAMES.map((name) => {
    const claim = objects[`PersistentVolumeClaim/${name}`];
    const volumeName = claim?.spec?.volumeName;
    const pv = (snapshot.persistentVolumes ?? []).find(
      (row) => row?.metadata?.name === volumeName,
    );
    return {
      name,
      uid: claim?.metadata?.uid ?? null,
      volumeName: volumeName ?? null,
      pvUid: pv?.metadata?.uid ?? null,
      claimRef: pv?.spec?.claimRef ?? null,
    };
  });
  if (
    claims.some(
      (claim) =>
        typeof claim.uid !== 'string' ||
        typeof claim.volumeName !== 'string' ||
        typeof claim.pvUid !== 'string' ||
        claim.claimRef == null ||
        typeof claim.claimRef.name !== 'string' ||
        typeof claim.claimRef.namespace !== 'string' ||
        typeof claim.claimRef.uid !== 'string',
    )
  ) {
    return null;
  }
  const grafanaSecretUid = objects[`Secret/${GRAFANA_ADMIN_SECRET}`]?.metadata?.uid;
  if (typeof grafanaSecretUid !== 'string') {
    return null;
  }
  const backendRoles = Object.keys(backends);
  if (backendRoles.length !== 4) {
    return null;
  }
  for (const role of backendRoles) {
    const backend = backends[role];
    if (
      !Array.isArray(backend.direct) ||
      backend.direct.length === 0 ||
      typeof backend.workloadUid !== 'string' ||
      typeof backend.podUid !== 'string' ||
      !Array.isArray(backend.serviceUids) ||
      backend.serviceUids.length === 0 ||
      !Number.isInteger(backend.revision) ||
      typeof backend.helmSecretUid !== 'string'
    ) {
      return null;
    }
  }
  return {
    namespaceUid,
    collector,
    backends,
    claims,
    grafanaSecretUid,
  };
}

const BACKEND_RELEASES = [
  'obs-prometheus',
  'obs-loki',
  'obs-tempo',
  'obs-grafana',
];

/**
 * @param {object} snapshot
 * @param {string} name
 * @param {number} revision
 */
function helmStorageUid(snapshot, name, revision) {
  const uid =
    snapshot.objects?.[`Secret/sh.helm.release.v1.${name}.v${revision}`]?.metadata
      ?.uid;
  return typeof uid === 'string' ? uid : null;
}

/**
 * @param {object} before
 * @param {object} after
 */
export function upgradeHistoryPreserved(before, after) {
  for (const name of BACKEND_RELEASES) {
    if (!isDeepStrictEqual(before.helmHistory?.[name], after.helmHistory?.[name])) {
      return false;
    }
    const uid = helmStorageUid(before, name, 1);
    if (uid == null || uid !== helmStorageUid(after, name, 1)) {
      return false;
    }
  }
  const previous = helmStorageUid(before, 'obs-collector', 1);
  const current = helmStorageUid(after, 'obs-collector', 2);
  const history = after.helmHistory?.['obs-collector'];
  const retainedObject = helmStorageUid(after, 'obs-collector', 1);
  if (
    previous == null ||
    current == null ||
    current === previous ||
    !Array.isArray(history) ||
    history.length < 2 ||
    String(history[0]?.revision) !== '1' ||
    history[0]?.status !== 'superseded' ||
    String(history.at(-1)?.revision) !== '2' ||
    String(history.at(-1)?.status) !== 'deployed'
  ) {
    return false;
  }
  if (retainedObject == null || retainedObject !== previous) {
    return false;
  }
  const beforeHistory = before.helmHistory?.['obs-collector'];
  if (!Array.isArray(beforeHistory) || String(beforeHistory.at(-1)?.revision) !== '1') {
    return false;
  }
  return true;
}

const STABLE_KINDS = new Set([
  'Deployment',
  'StatefulSet',
  'Service',
  'ConfigMap',
  'ServiceAccount',
  'PersistentVolumeClaim',
]);

/**
 * Resource versions of stable objects. Pod status is excluded.
 *
 * @param {object} snapshot
 * @param {object} artifacts
 */
export function stableResourceVersions(snapshot, artifacts) {
  /** @type {unknown[]} */
  const rows = [];
  rows.push([
    'Namespace',
    snapshot.namespace?.uid ?? null,
    snapshot.namespace?.object?.metadata?.resourceVersion ?? null,
  ]);
  for (const release of artifacts.releases ?? []) {
    for (const doc of release.documents ?? []) {
      if (!STABLE_KINDS.has(doc.kind)) {
        continue;
      }
      const live = snapshot.objects?.[`${doc.kind}/${doc.metadata?.name}`];
      rows.push([
        doc.kind,
        doc.metadata?.name ?? null,
        live?.metadata?.uid ?? null,
        live?.metadata?.resourceVersion ?? null,
      ]);
    }
  }
  const grafana = snapshot.objects?.[`Secret/${GRAFANA_ADMIN_SECRET}`];
  rows.push([
    'Secret',
    GRAFANA_ADMIN_SECRET,
    grafana?.metadata?.uid ?? null,
    grafana?.metadata?.resourceVersion ?? null,
  ]);
  for (const name of CLAIM_NAMES) {
    const claim = snapshot.objects?.[`PersistentVolumeClaim/${name}`];
    const volumeName = claim?.spec?.volumeName ?? null;
    const pv = (snapshot.persistentVolumes ?? []).find(
      (row) => row?.metadata?.name === volumeName,
    );
    rows.push([
      'PersistentVolume',
      volumeName,
      pv?.metadata?.uid ?? null,
      pv?.metadata?.resourceVersion ?? null,
    ]);
  }
  for (const release of artifacts.releases ?? []) {
    const revision = Number.parseInt(
      String(snapshot.helmReleases?.find((row) => row.name === release.name)?.revision),
      10,
    );
    rows.push([
      'HelmSecret',
      release.name,
      Number.isInteger(revision) ? revision : null,
      helmStorageUid(snapshot, release.name, revision),
    ]);
  }
  return rows;
}

/**
 * @param {object} receipt
 */
function finish(receipt) {
  return receipt;
}

/**
 * @param {string} reasonCode
 * @param {{ pending?: boolean, mutation?: string, oldRevision?: number | null, newRevision?: number | null, ok?: boolean, state?: string }} [extra]
 */
function refused(reasonCode, extra = {}) {
  return finish({
    schema: 1,
    operation: 'upgrade',
    profile: 'dev',
    ok: extra.ok === true,
    state: extra.state ?? 'refused',
    reasonCode,
    mutation: extra.mutation ?? 'none',
    pending: extra.pending === true,
    oldRevision: extra.oldRevision ?? null,
    newRevision: extra.newRevision ?? null,
  });
}

/**
 * @param {object} deps
 */
async function readMemory(deps, started) {
  const remaining = ADMISSION_MS - (performance.now() - started);
  const timeoutMs = Math.min(MEMORY_TIMEOUT_MS, remaining);
  if (timeoutMs <= 0) {
    return null;
  }
  const run = deps.run ?? runPlatformCommand;
  const result = await run('cat', ['/proc/meminfo'], { timeoutMs });
  if (!result?.ok) {
    return null;
  }
  const parsed = parseMeminfoMiB(result.stdout ?? '');
  if (!Number.isInteger(parsed.memAvailableMiB)) {
    return null;
  }
  return parsed.memAvailableMiB;
}

/**
 * @param {object} identity
 * @param {object} release
 */
export function helmUpgradeArgv(identity, release) {
  return [
    'upgrade',
    'obs-collector',
    release.chartPath,
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    '--namespace',
    identity.namespace,
    ...helmValuesArgv(release),
    '--reset-values',
    '--wait',
    '--timeout',
    '180s',
    '--history-max',
    '5',
  ];
}

/**
 * @param {object} snapshot
 */
function collectorRevision(snapshot) {
  const row = snapshot.helmReleases?.find((item) => item.name === 'obs-collector');
  const revision = Number.parseInt(String(row?.revision), 10);
  return Number.isInteger(revision) ? revision : null;
}

/**
 * @param {object} identity
 * @param {object} deps
 */
function confirmIdentity(identity, deps) {
  const recheck = deps.recheckIdentity ?? recheckIdentity;
  return recheck(identity, {
    run: deps.observeRun ?? runPlatformCommand,
    now: deps.now,
    deadline: deps.identityDeadline,
    expectedNamespaceUid: identity.tuple?.targetNamespaceUid,
  });
}

const INVENTORY_PHASE_MS = 120_000;

/**
 * Fresh inventory budget for one observation. The upgrade's earlier phases do not consume it.
 *
 * @param {() => number} now
 */
export function inventoryObservationDeadline(now) {
  return now() + INVENTORY_PHASE_MS;
}

/**
 * @param {object} identity
 * @param {object} artifacts
 * @param {object} deps
 * @param {number} _started
 */
function collectObserved(identity, artifacts, deps, _started) {
  if (deps.collectInventory) {
    return deps.collectInventory(identity, artifacts);
  }
  const now = deps.now ?? (() => Date.now());
  const deadline = inventoryObservationDeadline(now);
  const snapshot = collectInventory(identity, artifacts, {
    run: deps.observeRun ?? runPlatformCommand,
    now,
    deadline,
    stateRoot: deps.stateRoot,
    readPending:
      deps.readPending ??
      ((contextName) => readPending(contextName, { stateRoot: deps.stateRoot })),
  });
  snapshot.profileId = 'dev';
  return snapshot;
}

/**
 * @param {string} reasonCode
 * @param {string} [mutation]
 */
function fenced(reasonCode, mutation = 'possible') {
  return refused(reasonCode, {
    state: 'not-ready',
    mutation,
    pending: true,
    oldRevision: 1,
  });
}

/**
 * @param {object} [deps]
 */
export async function runObservabilityUpgrade(deps = {}) {
  const argv = deps.argv ?? [];
  if (argv.length !== 0) {
    return refused('invalid-invocation');
  }
  if (process.env.OFFSCREEN_OBSERVABILITY_UPGRADE !== 'authorized') {
    return refused('ensure-not-authorized');
  }
  const started = deps.now?.() ?? Date.now();
  const available = await readMemory(deps, performance.now());
  if (available == null || available < MIN_HOST_MEMORY_MIB) {
    return refused('refused');
  }
  const profile = (deps.readPlatformProfile ?? readPlatformProfile)('dev');
  let variants;
  try {
    variants = (deps.loadObservabilityVariants ?? loadObservabilityVariants)('dev');
  } catch {
    return refused('artifact-invalid');
  }
  const identity = await (deps.captureIdentity ?? captureIdentity)(
    'dev',
    profile.contextName,
    {
      run: deps.observeRun ?? runPlatformCommand,
      now: deps.now,
      deadline: deps.identityDeadline,
    },
  );
  let custody;
  try {
    custody = await (deps.acquireCustody ?? acquireCustody)(profile.contextName, {
      mode: 'exclusive',
      signal: deps.signal,
      stateRoot: deps.stateRoot,
      now: deps.now,
      deadline: deps.deadline,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('pending')) {
      return refused('pending', { state: 'not-ready', pending: true });
    }
    return refused('lock-unavailable');
  }
  try {
    const first = await collectObserved(identity, variants.desired, deps, started);
    if (first?.pending === true) {
      return refused('pending', { state: 'not-ready', pending: true });
    }
    const classified = (deps.classifyInventory ?? classifyInventory)(first, variants.desired, {
      predecessorArtifacts: variants.predecessor,
    });
    const identityOk = confirmIdentity(identity, deps);
    if (!identityOk?.ok) {
      return refused('unreadable', { state: 'unreadable' });
    }
    if (classified.reasonCode === 'ready' && classified.state === 'ready') {
      const second = await collectObserved(identity, variants.desired, deps, started);
      const again = confirmIdentity(identity, deps);
      const before = projectUpgradePreservation(first, variants.desired);
      const after = projectUpgradePreservation(second, variants.desired);
      const revision = collectorRevision(second);
      if (
        !again?.ok ||
        before == null ||
        after == null ||
        !isDeepStrictEqual(before, after) ||
        !isDeepStrictEqual(
          stableResourceVersions(first, variants.desired),
          stableResourceVersions(second, variants.desired),
        ) ||
        revision == null
      ) {
        return refused('unreadable', { state: 'unreadable' });
      }
      return {
        schema: 1,
        operation: 'upgrade',
        profile: 'dev',
        ok: true,
        state: 'ready',
        reasonCode: 'ready',
        mutation: 'none',
        pending: false,
        oldRevision: revision,
        newRevision: revision,
      };
    }
    if (classified.reasonCode !== 'upgrade-required') {
      return refused(classified.reasonCode ?? 'not-ready', {
        state: classified.state ?? 'not-ready',
        pending: classified.pending === true,
      });
    }
    const preservation = projectUpgradePreservation(
      first,
      variants.predecessor ?? variants.desired,
    );
    if (preservation == null) {
      return refused('not-ready', { state: 'not-ready' });
    }
    const collector = variants.desired.releases.find((row) => row.role === 'collector');
    const predecessor = variants.predecessor.releases.find((row) => row.role === 'collector');
    if (collector == null || predecessor == null) {
      return refused('artifact-invalid');
    }
    const beforeWrite = confirmIdentity(identity, deps);
    if (!beforeWrite?.ok) {
      return refused('unreadable', { state: 'unreadable' });
    }
    custody.begin({
      operation: 'upgrade',
      phase: 'collector-upgrade',
      tuple: identity.tuple,
      details: {
        oldRevision: 1,
        desiredRevision: 2,
        oldRelaySha256: relaySha256(variants.predecessor),
        desiredRelaySha256: relaySha256(variants.desired),
        preservation,
      },
    });
    custody.assertOwnPending();
    const argvUpgrade = helmUpgradeArgv(identity, collector);
    let mutation = 'possible';
    try {
      const result = await (deps.runMutation ?? runMutation)('helm', argvUpgrade, {
        custody,
        timeoutMs: UPGRADE_TIMEOUT_MS,
        signal: deps.signal,
        deadline: deps.deadline,
        now: deps.now,
      });
      if (!result?.ok || result.timedOut || result.cancelled) {
        return fenced('phase-failed');
      }
      mutation = 'confirmed';
      const observed = await collectObserved(identity, variants.desired, deps, started);
      const owned = {
        ...observed,
        pending: true,
        pendingValid: true,
      };
      const shape = verifyOwnedFinalShape(owned, variants.desired, {
        identity,
        custody,
        predecessorArtifacts: variants.predecessor,
        expectedOperation: 'upgrade',
        expectedRevision: 2,
      });
      if (!shape.ok) {
        return fenced(shape.detail ?? 'not-ready');
      }
      const preserved = projectUpgradePreservation(observed, variants.desired);
      if (
        preserved == null ||
        !isDeepStrictEqual(preservation, preserved) ||
        !upgradeHistoryPreserved(first, observed)
      ) {
        return fenced('not-ready');
      }
      if (deps.failTransport === true) {
        return fenced('phase-failed');
      }
      if (deps.openForwards !== false) {
        const forwards = await (deps.openForwards ?? openForwards)(
          identity,
          { ...custody, pending: true },
          {
            bindings: [{ key: 'developerHttp' }],
            signal: deps.signal,
            now: deps.now,
            deadline: deps.forwardDeadline,
            artifacts: variants.desired,
          },
        );
        let probe = { ok: true };
        try {
          probe = await (deps.probeForwardTransport ?? probeForwardTransport)(
            forwards.ports,
            deps,
          );
        } finally {
          const closed = await forwards.close();
          if (!closed?.ok) {
            probe = { ok: false, cleanupFailed: true };
          }
        }
        if (!probe?.ok) {
          return fenced('phase-failed');
        }
      }
      const afterMutation = confirmIdentity(identity, deps);
      if (!afterMutation?.ok) {
        return fenced('unreadable');
      }
      custody.assertOwnPending();
      custody.clear();
      const pending = deps.readPending
        ? deps.readPending(profile.contextName)
        : readPending(profile.contextName, { stateRoot: deps.stateRoot });
      if (pending?.pending) {
        return refused('cleanup-failed', {
          state: 'unreadable',
          mutation: 'confirmed',
          pending: true,
          oldRevision: 1,
          newRevision: 2,
        });
      }
      const cleaned = identity.cleanup?.() ?? { ok: true };
      if (cleaned?.ok === false || deps.failCleanup === true) {
        return refused('cleanup-failed', {
          state: 'unreadable',
          mutation: 'confirmed',
          pending: false,
          oldRevision: 1,
          newRevision: 2,
          ok: false,
        });
      }
      return {
        schema: 1,
        operation: 'upgrade',
        profile: 'dev',
        ok: true,
        state: 'ready',
        reasonCode: 'ready',
        mutation: 'confirmed',
        pending: false,
        oldRevision: 1,
        newRevision: 2,
        argv: argvUpgrade,
        oldRelaySha256: relaySha256(variants.predecessor),
        desiredRelaySha256: relaySha256(variants.desired),
      };
    } catch {
      return fenced('phase-failed', mutation);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('unreadable:') || message.startsWith('refused:')) {
      return refused('unreadable', { state: 'unreadable' });
    }
    return refused('unreadable', { state: 'unreadable' });
  } finally {
    custody.close?.();
  }
}

/**
 * @param {object} receipt
 */
export function exitCodeForUpgrade(receipt) {
  if (receipt.ok) {
    return 0;
  }
  if (
    receipt.reasonCode === 'invalid-invocation' ||
    receipt.reasonCode === 'ensure-not-authorized'
  ) {
    return 2;
  }
  return 1;
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const receipt = await runObservabilityUpgrade({ ...deps, argv });
  const publicReceipt = { ...receipt };
  delete publicReceipt.argv;
  delete publicReceipt.oldRelaySha256;
  delete publicReceipt.desiredRelaySha256;
  process.stdout.write(`${JSON.stringify(publicReceipt)}\n`);
  return exitCodeForUpgrade(receipt);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => {
    process.exitCode = code;
  });
}
