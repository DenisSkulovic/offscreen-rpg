import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';

import { helmValuesArgv, loadObservabilityVariants } from './artifacts.mjs';
import { acquireCustody, readPending, runMutation } from './custody.mjs';
import { openForwards, probeForwardTransport } from './forward.mjs';
import {
  MIN_HOST_MEMORY_MIB,
  parseMeminfoMiB,
} from '../../clusters/kind/manager/host-probe.mjs';
import { captureIdentity } from './identity.mjs';
import { GRAFANA_ADMIN_SECRET } from './inventory.mjs';
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
      podUid: objects[`Pod/${workloadName}-0`]?.metadata?.uid ?? null,
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
        typeof claim.pvUid !== 'string',
    )
  ) {
    return null;
  }
  return {
    namespaceUid,
    collector,
    backends,
    claims,
    grafanaSecretUid: objects[`Secret/${GRAFANA_ADMIN_SECRET}`]?.metadata?.uid ?? null,
  };
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
  const run = deps.run;
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
  const started = performance.now();
  const available = await readMemory(deps, started);
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
  const identity = await (deps.captureIdentity ?? captureIdentity)('dev', profile.contextName, deps);
  let custody;
  try {
    custody = await (deps.acquireCustody ?? acquireCustody)(profile.contextName, deps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('pending')) {
      return refused('pending', { state: 'not-ready', pending: true });
    }
    return refused('lock-unavailable');
  }
  try {
    const collect = deps.collectInventory ?? (async () => ({}));
    const first = await collect(identity);
    if (first?.pending === true) {
      return refused('pending', { state: 'not-ready', pending: true });
    }
    const classified = (deps.classifyInventory ?? classifyInventory)(first, variants.desired, {
      predecessorArtifacts: variants.predecessor,
    });
    if (classified.reasonCode === 'ready' && classified.state === 'ready') {
      const second = await collect(identity);
      const before = projectUpgradePreservation(first, variants.desired);
      const after = projectUpgradePreservation(second, variants.desired);
      if (before == null || !isDeepStrictEqual(before, after)) {
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
        oldRevision: 2,
        newRevision: 2,
      };
    }
    if (classified.reasonCode !== 'upgrade-required') {
      return refused(classified.reasonCode ?? 'not-ready', {
        state: classified.state ?? 'not-ready',
        pending: classified.pending === true,
      });
    }
    const preservation = projectUpgradePreservation(first, variants.predecessor ?? variants.desired);
    if (preservation == null || typeof preservation.grafanaSecretUid !== 'string') {
      return refused('not-ready', { state: 'not-ready' });
    }
    const collector = variants.desired.releases.find((row) => row.role === 'collector');
    const predecessor = variants.predecessor.releases.find((row) => row.role === 'collector');
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
        return refused('phase-failed', {
          state: 'not-ready',
          mutation: 'possible',
          pending: true,
          oldRevision: 1,
        });
      }
      mutation = 'confirmed';
      const after = await collect(identity);
      const owned = {
        ...after,
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
        return refused(shape.detail ?? 'not-ready', {
          state: 'not-ready',
          mutation: 'possible',
          pending: true,
          oldRevision: 1,
        });
      }
      const preserved = projectUpgradePreservation(after, variants.desired);
      if (preserved?.grafanaSecretUid !== preservation.grafanaSecretUid) {
        return refused('not-ready', {
          state: 'not-ready',
          mutation: 'possible',
          pending: true,
          oldRevision: 1,
        });
      }
      if (deps.failTransport === true) {
        return refused('phase-failed', {
          state: 'not-ready',
          mutation: 'possible',
          pending: true,
          oldRevision: 1,
        });
      }
      if (deps.openForwards !== false) {
        const forwards = await (deps.openForwards ?? openForwards)(identity, custody, {
          ports: ['developerHttp'],
        });
        const probe = await (deps.probeForwardTransport ?? probeForwardTransport)(
          forwards?.ports ?? { developerHttp: 1 },
          deps,
        );
        await forwards?.close?.();
        if (probe && probe.ok === false) {
          return refused('phase-failed', {
            state: 'not-ready',
            mutation: 'possible',
            pending: true,
            oldRevision: 1,
          });
        }
      }
      custody.clear();
      const pending = deps.readPending
        ? deps.readPending(profile.contextName)
        : readPending(profile.contextName, deps);
      if (pending?.pending) {
        return refused('cleanup-failed', {
          state: 'unreadable',
          mutation: 'confirmed',
          pending: true,
          oldRevision: 1,
          newRevision: 2,
        });
      }
      if (deps.failCleanup === true) {
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
        oldRelaySha256: relaySha256(predecessor ? variants.predecessor : variants.desired),
        desiredRelaySha256: relaySha256(variants.desired),
      };
    } catch {
      return refused('phase-failed', {
        state: 'not-ready',
        mutation,
        pending: true,
        oldRevision: 1,
      });
    }
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
