import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPlatformCommand } from '../../../platform/common/commands.mjs';
import {
  PLATFORM_OBSERVABILITY_NS,
  BACKEND_URLS,
  SIGNAL_PROBE_PATH,
} from './signals.mjs';
import {
  STABLE_PVC_NAMES,
  extractStableIdentities,
  refuseDisruptionInvocation,
} from './proof-host.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));

export const PERSISTENCE_RESTART_ORDER = Object.freeze([
  {
    kind: 'deployment',
    name: 'obs-prometheus',
    workloadKey: 'Deployment/obs-prometheus',
  },
  {
    kind: 'statefulset',
    name: 'obs-loki',
    workloadKey: 'StatefulSet/obs-loki',
  },
  {
    kind: 'statefulset',
    name: 'obs-tempo',
    workloadKey: 'StatefulSet/obs-tempo',
  },
]);

const PERSISTENCE_PHASES = Object.freeze([
  'restart-prometheus',
  'restart-loki',
  'restart-tempo',
]);

const REQUIRED_POD_WORKLOADS = Object.freeze([
  'Deployment/obs-prometheus',
  'Deployment/obs-collector',
  'Deployment/obs-grafana',
  'StatefulSet/obs-loki',
  'StatefulSet/obs-tempo',
]);

export const OUTAGE_TARGET = Object.freeze({
  kind: 'statefulset',
  name: 'obs-tempo',
  workloadKey: 'StatefulSet/obs-tempo',
});

export const DISRUPTION_PHASE_BUDGET_MS = Object.freeze({
  baseline: 270_000,
  rollout: 240_000,
  queryReplay: 120_000,
  scale: 30_000,
  tempoDown: 490_000,
  restore: 820_000,
  finish: 735_000,
  recoveryEvidence: 90_000,
});

const ROLLOUT_ANNOTATION = 'kubectl.kubernetes.io/restartedAt';

/**
 * @param {string} gate
 * @param {NodeJS.ProcessEnv} [env]
 */
export function requireDisruptionAuthorization(gate, env = process.env) {
  return refuseDisruptionInvocation({ gate, env });
}

/**
 * @param {object} session
 * @param {object} identityJson
 * @param {'normal' | 'tempo-outage'} mode
 * @param {{ runPythonProbe?: Function, evidenceSubdir?: string }} [deps]
 */
export async function runProbeSession(session, identityJson, mode, deps = {}) {
  const workDir = join(
    session.evidenceDir,
    deps.evidenceSubdir ??
      (mode === 'tempo-outage' ? 'outage-probe' : 'persistence-probe'),
  );
  const collector = BACKEND_URLS.collector;
  const prom = BACKEND_URLS.prometheus;
  const loki = BACKEND_URLS.loki;
  const tempo = BACKEND_URLS.tempo;
  const replayArg = identityJson == null ? '' : JSON.stringify(identityJson);
  const argv = [
    SIGNAL_PROBE_PATH,
    workDir,
    collector,
    prom,
    loki,
    tempo,
    replayArg,
    mode,
  ];
  if (deps.runPythonProbe) {
    const probed = await deps.runPythonProbe({
      argv,
      mode,
      session,
      identityJson,
    });
    if (!probed.ok) {
      return probed;
    }
    return { ok: true, workDir: probed.workDir ?? workDir };
  }
  const run = deps.run ?? runPlatformCommand;
  const result = run('python3', argv, {
    timeoutMs: Math.min(session.remainingWorkMs(), 240_000),
  });
  if (!result.ok) {
    return {
      ok: false,
      reasonCode:
        mode === 'tempo-outage'
          ? 'outage-probe-failed'
          : 'persistence-probe-failed',
    };
  }
  return { ok: true, workDir };
}

/**
 * @param {string} contextName
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function readPlatformPodUids(contextName, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      '-n',
      PLATFORM_OBSERVABILITY_NS,
      'get',
      'pods',
      '-l',
      'app.kubernetes.io/name',
      '-o',
      'json',
    ],
    { timeoutMs: 15_000 },
  );
  if (!result.ok) {
    return { ok: false, reasonCode: 'platform-pods-unreadable' };
  }
  try {
    const items = JSON.parse(result.stdout).items ?? [];
    /** @type {Record<string, string>} */
    const byWorkload = {};
    for (const pod of items) {
      const instance = pod.metadata?.labels?.['app.kubernetes.io/instance'];
      const uid = pod.metadata?.uid;
      if (typeof instance === 'string' && typeof uid === 'string') {
        const kind =
          pod.metadata?.ownerReferences?.[0]?.kind === 'StatefulSet'
            ? 'StatefulSet'
            : 'Deployment';
        byWorkload[`${kind}/${instance}`] = uid;
      }
    }
    return { ok: true, podUids: byWorkload };
  } catch {
    return { ok: false, reasonCode: 'platform-pods-parse' };
  }
}

/**
 * @param {object} claimSnapshots
 */
export function pvcTupleFromSnapshots(claimSnapshots) {
  /** @type {Record<string, { name: string, uid: string, volumeName: string | null }>} */
  const tuple = {};
  for (const name of STABLE_PVC_NAMES) {
    const entry = claimSnapshots?.[name];
    if (!entry?.uid) {
      return { ok: false, reasonCode: 'pvc-tuple-missing' };
    }
    tuple[name] = {
      name,
      uid: entry.uid,
      volumeName: entry.volumeName ?? null,
    };
  }
  return { ok: true, tuple };
}

/**
 * @param {Record<string, { uid: string, volumeName?: string | null }>} before
 * @param {Record<string, { uid: string, volumeName?: string | null }>} after
 */
export function assertPvcTupleCompatible(before, after) {
  for (const name of STABLE_PVC_NAMES) {
    if (before[name]?.uid !== after[name]?.uid) {
      return { ok: false, reasonCode: 'claim-uid-changed' };
    }
    if (
      (before[name]?.volumeName ?? null) !== (after[name]?.volumeName ?? null)
    ) {
      return { ok: false, reasonCode: 'claim-volume-changed' };
    }
  }
  return { ok: true };
}

function isReadyPod(pod) {
  if (pod?.status?.phase !== 'Running') {
    return false;
  }
  return (pod.status?.conditions ?? []).some(
    (row) => row.type === 'Ready' && row.status === 'True',
  );
}

/**
 * @param {Record<string, object>} objects
 * @param {object} pod
 */
function workloadKeyForPod(objects, pod) {
  const owner = pod.metadata?.ownerReferences?.[0];
  if (!owner) {
    return null;
  }
  if (owner.kind === 'StatefulSet') {
    const parent = objects[`StatefulSet/${owner.name}`];
    if (!parent || (owner.uid != null && parent.metadata?.uid !== owner.uid)) {
      return null;
    }
    return `StatefulSet/${owner.name}`;
  }
  if (owner.kind === 'ReplicaSet') {
    const rs = objects[`ReplicaSet/${owner.name}`];
    if (!rs || (owner.uid != null && rs.metadata?.uid !== owner.uid)) {
      return null;
    }
    const deployOwner = rs.metadata?.ownerReferences?.[0];
    const deploy = deployOwner
      ? objects[`Deployment/${deployOwner.name}`]
      : null;
    if (
      !deploy ||
      deployOwner?.uid == null ||
      deploy.metadata?.uid !== deployOwner.uid
    ) {
      return null;
    }
    return `Deployment/${deployOwner.name}`;
  }
  return null;
}

/**
 * @param {Record<string, object>} objects
 */
export function deriveActiveWorkloadPods(objects) {
  /** @type {Record<string, string>} */
  const podUids = {};
  /** @type {Set<string>} */
  const duplicates = new Set();
  for (const object of Object.values(objects ?? {})) {
    if (object?.kind !== 'Pod' || !isReadyPod(object)) {
      continue;
    }
    const workloadKey = workloadKeyForPod(objects, object);
    const uid = object.metadata?.uid;
    if (!workloadKey || typeof uid !== 'string' || uid.length === 0) {
      continue;
    }
    if (podUids[workloadKey] != null && podUids[workloadKey] !== uid) {
      duplicates.add(workloadKey);
    }
    podUids[workloadKey] = uid;
  }
  if (duplicates.size > 0) {
    return { ok: false, reasonCode: 'duplicate-active-pod' };
  }
  for (const key of REQUIRED_POD_WORKLOADS) {
    if (typeof podUids[key] !== 'string' || podUids[key].length === 0) {
      return { ok: false, reasonCode: 'active-pod-missing' };
    }
  }
  return { ok: true, podUids };
}

const OUTAGE_BACKEND_POD_WORKLOADS = Object.freeze(
  REQUIRED_POD_WORKLOADS.filter(
    (key) => key !== OUTAGE_TARGET.workloadKey,
  ),
);

/**
 * @param {Record<string, object>} objects
 */
export function deriveHealthyOutageBackends(objects) {
  /** @type {Record<string, string>} */
  const podUids = {};
  for (const object of Object.values(objects ?? {})) {
    if (object?.kind !== 'Pod' || !isReadyPod(object)) {
      continue;
    }
    const workloadKey = workloadKeyForPod(objects, object);
    const uid = object.metadata?.uid;
    if (!workloadKey || typeof uid !== 'string') {
      continue;
    }
    if (!OUTAGE_BACKEND_POD_WORKLOADS.includes(workloadKey)) {
      continue;
    }
    if (podUids[workloadKey] != null && podUids[workloadKey] !== uid) {
      return { ok: false, reasonCode: 'duplicate-active-pod' };
    }
    podUids[workloadKey] = uid;
  }
  for (const key of OUTAGE_BACKEND_POD_WORKLOADS) {
    if (typeof podUids[key] !== 'string' || podUids[key].length === 0) {
      return { ok: false, reasonCode: 'active-pod-missing' };
    }
  }
  return { ok: true, podUids };
}

/**
 * @param {Record<string, object>} objects
 */
export function assertZeroActiveTempoPods(objects) {
  for (const object of Object.values(objects ?? {})) {
    if (object?.kind !== 'Pod') {
      continue;
    }
    const owner = object.metadata?.ownerReferences?.[0];
    if (
      owner?.kind === 'StatefulSet' &&
      owner.name === OUTAGE_TARGET.name &&
      object.status?.phase !== 'Succeeded' &&
      object.status?.phase !== 'Failed'
    ) {
      return { ok: false, reasonCode: 'tempo-pod-active' };
    }
  }
  return { ok: true };
}

/**
 * @param {{ uid: string, resourceVersion: string, generation: number, replicas: number }} pre
 * @param {number} targetReplicas
 */
export function buildTempoScaleJsonPatch(pre, targetReplicas) {
  return [
    { op: 'test', path: '/metadata/uid', value: pre.uid },
    {
      op: 'test',
      path: '/metadata/resourceVersion',
      value: pre.resourceVersion,
    },
    { op: 'test', path: '/metadata/generation', value: pre.generation },
    { op: 'test', path: '/spec/replicas', value: pre.replicas },
    { op: 'replace', path: '/spec/replicas', value: targetReplicas },
  ];
}

/**
 * @param {object} baseline
 * @param {object} tempoWorkload
 */
function buildOutageBeginDetails(baseline, tempoWorkload) {
  return {
    baseline: baseline.disruptionBaseline,
    tempo: {
      uid: baseline.disruptionBaseline.workloadUids[OUTAGE_TARGET.workloadKey],
      originalReplicas: 1,
    },
    down: {
      resourceVersion: tempoWorkload.metadata.resourceVersion,
      generation: Number(tempoWorkload.metadata.generation),
      outcome: 'planned',
    },
    restore: null,
  };
}

/**
 * @param {object} observation
 */
export function projectDisruptionClaims(observation) {
  const objects = observation?.snapshot?.objects ?? {};
  const persistentVolumes = observation?.snapshot?.persistentVolumes ?? [];
  /** @type {Array<object>} */
  const claims = [];
  for (const name of [...STABLE_PVC_NAMES].sort((left, right) =>
    left.localeCompare(right),
  )) {
    const pvc = objects[`PersistentVolumeClaim/${name}`];
    const uid = pvc?.metadata?.uid;
    const volumeName = pvc?.spec?.volumeName;
    const claimNamespace =
      pvc?.metadata?.namespace ?? PLATFORM_OBSERVABILITY_NS;
    if (
      typeof uid !== 'string' ||
      uid.length === 0 ||
      typeof volumeName !== 'string' ||
      volumeName.length === 0
    ) {
      return { ok: false, reasonCode: 'claim-projection-missing' };
    }
    const boundPv = persistentVolumes.find(
      (pv) =>
        pv?.spec?.claimRef?.name === name &&
        pv?.spec?.claimRef?.namespace === claimNamespace,
    );
    const pvUid = boundPv?.metadata?.uid;
    const claimRef = boundPv?.spec?.claimRef;
    if (
      typeof pvUid !== 'string' ||
      pvUid.length === 0 ||
      claimRef?.uid !== uid
    ) {
      return { ok: false, reasonCode: 'pv-projection-missing' };
    }
    claims.push({
      name,
      uid,
      volumeName,
      pvUid,
      claimRef: {
        name: claimRef.name,
        namespace: claimRef.namespace,
        uid: claimRef.uid,
      },
    });
  }
  return { ok: true, claims };
}

/**
 * @param {Array<object>} before
 * @param {Array<object>} after
 */
export function assertDisruptionClaimsCompatible(before, after) {
  for (const row of before) {
    const next = after.find((entry) => entry.name === row.name);
    if (!next || next.uid !== row.uid) {
      return { ok: false, reasonCode: 'claim-uid-changed' };
    }
    if (next.volumeName !== row.volumeName || next.pvUid !== row.pvUid) {
      return { ok: false, reasonCode: 'claim-volume-changed' };
    }
    if (
      next.claimRef?.uid !== row.claimRef?.uid ||
      next.claimRef?.name !== row.claimRef?.name ||
      next.claimRef?.namespace !== row.claimRef?.namespace
    ) {
      return { ok: false, reasonCode: 'claim-volume-changed' };
    }
  }
  return { ok: true };
}

/**
 * @param {{ uid: string, resourceVersion: string, generation: number, replicas?: number }} pre
 * @param {string} restartedAt
 * @param {{ hasAnnotations?: boolean }} [options]
 */
export function buildRolloutRestartJsonPatch(pre, restartedAt, options = {}) {
  const operations = [
    { op: 'test', path: '/metadata/uid', value: pre.uid },
    {
      op: 'test',
      path: '/metadata/resourceVersion',
      value: pre.resourceVersion,
    },
    { op: 'test', path: '/metadata/generation', value: pre.generation },
    { op: 'test', path: '/spec/replicas', value: pre.replicas ?? 1 },
  ];
  if (options.hasAnnotations !== false) {
    operations.push({
      op: 'add',
      path: '/spec/template/metadata/annotations/kubectl.kubernetes.io~1restartedAt',
      value: restartedAt,
    });
  } else {
    operations.push({
      op: 'add',
      path: '/spec/template/metadata/annotations',
      value: { [ROLLOUT_ANNOTATION]: restartedAt },
    });
  }
  return operations;
}

/**
 * @param {object} observation
 */
export function projectPersistenceBaseline(observation) {
  const stable = extractStableIdentities(observation);
  if (!stable.complete) {
    return { ok: false, reasonCode: 'baseline-incomplete' };
  }
  const objects = observation?.snapshot?.objects ?? {};
  const pods = deriveActiveWorkloadPods(objects);
  if (!pods.ok) {
    return pods;
  }
  const claims = projectDisruptionClaims(observation);
  if (!claims.ok) {
    return claims;
  }
  const workloadUids = {
    'Deployment/obs-prometheus': stable.workloads['Deployment/obs-prometheus'],
    'StatefulSet/obs-loki': stable.workloads['StatefulSet/obs-loki'],
    'StatefulSet/obs-tempo': stable.workloads['StatefulSet/obs-tempo'],
    'Deployment/obs-collector': stable.workloads['Deployment/obs-collector'],
    'Deployment/obs-grafana': stable.workloads['Deployment/obs-grafana'],
  };
  return {
    ok: true,
    disruptionBaseline: {
      collectorPodUid: pods.podUids['Deployment/obs-collector'],
      workloadUids,
      claims: claims.claims,
    },
    podUids: pods.podUids,
  };
}

function intentKindForStep(step) {
  return step.kind === 'deployment' ? 'Deployment' : 'StatefulSet';
}

/**
 * @param {typeof PERSISTENCE_RESTART_ORDER[number]} step
 * @param {object} workload
 * @param {object} baseline
 */
function buildPersistenceIntent(step, workload, baseline) {
  return {
    kind: intentKindForStep(step),
    name: step.name,
    uid: baseline.workloadUids[step.workloadKey],
    resourceVersion: workload.metadata.resourceVersion,
    generation: Number(workload.metadata.generation),
    replicas: 1,
  };
}

/**
 * @param {object} session
 * @param {object} deps
 */
async function finishActiveProbe(session, deps) {
  if (deps.finishProbePod) {
    return deps.finishProbePod(session);
  }
  if (session.resources?.finishPod) {
    return session.resources.finishPod({
      deadline: session.clock.now() + session.remainingWorkMs(),
    });
  }
  if (deps.runPythonProbe) {
    return { ok: true };
  }
  return { ok: false, reasonCode: 'proof-resources-required' };
}

/**
 * @param {object} session
 * @param {object} deps
 */
async function readFreshClaims(session, observation, deps) {
  if (deps.readClaims) {
    const result = await Promise.resolve(deps.readClaims(session, observation));
    if (!result.ok) {
      return result;
    }
    if (Array.isArray(result.claims)) {
      return { ok: true, claims: result.claims };
    }
    if (result.tuple) {
      return {
        ok: true,
        claims: [...STABLE_PVC_NAMES]
          .sort((left, right) => left.localeCompare(right))
          .map((name) => ({
            name,
            uid: result.tuple[name]?.uid ?? '',
            volumeName: result.tuple[name]?.volumeName ?? '',
            pvUid: `pv-${name}`,
            claimRef: {
              name,
              namespace: PLATFORM_OBSERVABILITY_NS,
              uid: result.tuple[name]?.uid ?? '',
            },
          })),
      };
    }
  }
  return projectDisruptionClaims(observation);
}

/**
 * @param {object} session
 * @param {string} kind
 * @param {string} name
 * @param {{ uid: string, resourceVersion: string, generation: number, replicas?: number, podUidBefore: string }} pre
 * @param {{ rollWorkload?: Function, run?: typeof runPlatformCommand, postRolloutObjects?: Record<string, object>, preReadWorkload?: object }} [deps]
 */
export async function guardedRolloutRestart(
  session,
  kind,
  name,
  pre,
  deps = {},
) {
  if (deps.rollWorkload) {
    return deps.rollWorkload({ session, kind, name, pre });
  }
  const run = deps.run ?? runPlatformCommand;
  const identity = session.identity;
  const restartedAt = new Date(session.clock.now()).toISOString();
  const hasAnnotations =
    deps.preReadWorkload?.spec?.template?.metadata?.annotations != null;
  const patchOps = buildRolloutRestartJsonPatch(pre, restartedAt, {
    hasAnnotations,
  });
  const result = run(
    'kubectl',
    [
      '--kubeconfig',
      identity.snapshotPath,
      '--context',
      identity.contextName,
      '-n',
      PLATFORM_OBSERVABILITY_NS,
      'patch',
      kind,
      name,
      '--type=json',
      '-p',
      JSON.stringify(patchOps),
      '-o',
      'json',
    ],
    { timeoutMs: 30_000 },
  );
  if (!result.ok) {
    return {
      ok: false,
      reasonCode: 'rollout-patch-failed',
      unknownWrite: true,
    };
  }
  let patched;
  try {
    patched = JSON.parse(result.stdout);
  } catch {
    return { ok: false, reasonCode: 'rollout-patch-parse', unknownWrite: true };
  }
  if (
    patched?.metadata?.uid !== pre.uid ||
    Number(patched?.metadata?.generation) !== pre.generation + 1
  ) {
    return {
      ok: false,
      reasonCode: 'rollout-patch-response',
      unknownWrite: true,
    };
  }
  const wait = run(
    'kubectl',
    [
      '--kubeconfig',
      identity.snapshotPath,
      '--context',
      identity.contextName,
      '-n',
      PLATFORM_OBSERVABILITY_NS,
      'rollout',
      'status',
      kind,
      name,
      `--timeout=${Math.min(210, Math.floor(session.remainingWorkMs() / 1000))}s`,
    ],
    { timeoutMs: Math.min(session.remainingWorkMs(), 240_000) },
  );
  if (!wait.ok) {
    return { ok: false, reasonCode: 'rollout-wait-failed', unknownWrite: true };
  }
  if (deps.postRolloutObjects != null) {
    const pods = deriveActiveWorkloadPods(deps.postRolloutObjects);
    if (!pods.ok) {
      return pods;
    }
    const workloadKey =
      kind === 'deployment' ? `Deployment/${name}` : `StatefulSet/${name}`;
    const podUidAfter = pods.podUids[workloadKey];
    if (!podUidAfter || podUidAfter === pre.podUidBefore) {
      return { ok: false, reasonCode: 'rollout-pod-unchanged' };
    }
    return {
      ok: true,
      podUidAfter,
      generation: Number(patched.metadata.generation),
    };
  }
  return { ok: true, generation: Number(patched.metadata.generation) };
}

/**
 * @param {object} session
 * @param {number} replicas
 * @param {{ uid: string, resourceVersion: string, generation: number, replicas: number }} pre
 * @param {{ scaleWorkload?: Function, run?: typeof runPlatformCommand, runMutation?: Function }} [deps]
 */
export async function guardedScaleTempo(session, replicas, pre, deps = {}) {
  if (deps.scaleWorkload) {
    return deps.scaleWorkload({
      session,
      kind: OUTAGE_TARGET.kind,
      name: OUTAGE_TARGET.name,
      replicas,
      pre,
    });
  }
  const expectedBefore = replicas === 0 ? 1 : 0;
  if (pre.replicas !== expectedBefore) {
    return { ok: false, reasonCode: 'scale-precondition-replica' };
  }
  if (!pre.uid || !pre.resourceVersion || !pre.generation) {
    return { ok: false, reasonCode: 'scale-precondition-metadata' };
  }
  const identity = session.identity;
  const patchOps = buildTempoScaleJsonPatch(
    {
      uid: pre.uid,
      resourceVersion: pre.resourceVersion,
      generation: pre.generation,
      replicas: pre.replicas,
    },
    replicas,
  );
  const argv = [
    'patch',
    OUTAGE_TARGET.kind,
    OUTAGE_TARGET.name,
    '--kubeconfig',
    identity.snapshotPath,
    '--context',
    identity.contextName,
    '-n',
    PLATFORM_OBSERVABILITY_NS,
    '--type=json',
    '-p',
    JSON.stringify(patchOps),
    '-o',
    'json',
  ];
  let patched;
  let unknownWrite = false;
  if (session.custody?.assertOwnPending) {
    const runMutation =
      deps.runMutation ??
      (await import('../../../platform/observability/custody.mjs')).runMutation;
    const outcome = await runMutation('kubectl', argv, {
      custody: session.custody,
      timeoutMs: DISRUPTION_PHASE_BUDGET_MS.scale,
      now: session.clock.now,
      deadline: session.clock.now() + session.remainingWorkMs(),
    });
    if (!outcome.ok) {
      return {
        ok: false,
        reasonCode: outcome.cancelled
          ? 'tempo-scale-cancelled'
          : 'tempo-scale-failed',
        unknownWrite: outcome.closeUnconfirmed === true,
        cancelled: outcome.cancelled === true,
      };
    }
    try {
      patched = JSON.parse(outcome.stdout ?? '');
    } catch {
      return {
        ok: false,
        reasonCode: 'tempo-scale-parse',
        unknownWrite: true,
      };
    }
  } else {
    const run = deps.run ?? runPlatformCommand;
    const result = run('kubectl', argv, {
      timeoutMs: DISRUPTION_PHASE_BUDGET_MS.scale,
    });
    if (!result.ok) {
      return {
        ok: false,
        reasonCode: 'tempo-scale-failed',
        unknownWrite: true,
      };
    }
    try {
      patched = JSON.parse(result.stdout);
    } catch {
      return { ok: false, reasonCode: 'tempo-scale-parse', unknownWrite: true };
    }
  }
  if (
    patched?.metadata?.uid !== pre.uid ||
    Number(patched?.metadata?.generation) !== pre.generation + 1
  ) {
    unknownWrite = true;
    return {
      ok: false,
      reasonCode: 'tempo-scale-response',
      unknownWrite,
    };
  }
  if (replicas === 1) {
    const run = deps.run ?? runPlatformCommand;
    const wait = run(
      'kubectl',
      [
        '--kubeconfig',
        identity.snapshotPath,
        '--context',
        identity.contextName,
        '-n',
        PLATFORM_OBSERVABILITY_NS,
        'rollout',
        'status',
        `${OUTAGE_TARGET.kind}/${OUTAGE_TARGET.name}`,
        `--timeout=${Math.min(240, Math.floor(session.remainingWorkMs() / 1000))}s`,
      ],
      { timeoutMs: Math.min(session.remainingWorkMs(), 240_000) },
    );
    if (!wait.ok) {
      return { ok: false, reasonCode: 'tempo-rollout-wait-failed', unknownWrite: true };
    }
  }
  return {
    ok: true,
    generation: Number(patched.metadata.generation),
    resourceVersion: patched.metadata.resourceVersion,
    observed: {
      uid: pre.uid,
      resourceVersion: patched.metadata.resourceVersion,
      generation: Number(patched.metadata.generation),
      replicas,
    },
  };
}

/**
 * @param {object} observation
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function capturePersistenceBaseline(
  observation,
  contextName,
  deps = {},
) {
  const stable = extractStableIdentities(observation);
  const objects = observation?.snapshot?.objects ?? {};
  /** @type {Record<string, { uid: string, volumeName: string | null }>} */
  const claims = {};
  for (const name of STABLE_PVC_NAMES) {
    const pvc = objects[`PersistentVolumeClaim/${name}`];
    claims[name] = {
      uid: pvc?.metadata?.uid ?? '',
      volumeName: pvc?.status?.volumeName ?? null,
    };
  }
  const pods = readPlatformPodUids(contextName, deps);
  return { stable, claims, pods };
}

/**
 * @param {object} session
 * @param {object} [deps]
 */
export async function runPersistenceProof(session, deps = {}) {
  const auth = requireDisruptionAuthorization(
    'persistence',
    session.env ?? process.env,
  );
  if (auth.refused) {
    return { ok: false, reasonCode: auth.reasonCode, phase: 'disruption-auth' };
  }
  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.baseline) {
    return { ok: false, reasonCode: 'persistence-budget', phase: 'preflight' };
  }

  const custody = deps.custody ?? session.custody;
  if (!custody?.begin || !custody?.advance || !custody?.clear) {
    return { ok: false, reasonCode: 'custody-required', phase: 'custody' };
  }

  const observe =
    deps.observe ??
    (() => {
      throw new Error('observe-runner-required');
    });
  const recheckIdentity =
    deps.recheckIdentity ?? (() => ({ ok: true }));

  const observation = await observe(session);
  const baselineProjection = projectPersistenceBaseline(observation);
  if (!baselineProjection.ok) {
    return {
      ok: false,
      reasonCode: baselineProjection.reasonCode,
      phase: 'baseline',
    };
  }
  const disruptionBaseline = baselineProjection.disruptionBaseline;
  /** @type {Record<string, string>} */
  let activePodUids = { ...baselineProjection.podUids };

  const first = await runProbeSession(session, null, 'normal', deps);
  if (!first.ok) {
    return {
      ok: false,
      reasonCode: first.reasonCode ?? 'baseline-positive',
      phase: 'baseline',
    };
  }

  let identityJson;
  try {
    identityJson = JSON.parse(
      readFileSync(join(first.workDir, 'identity.json'), 'utf8'),
    );
  } catch {
    return { ok: false, reasonCode: 'identity-unreadable', phase: 'baseline' };
  }

  const finishedBaseline = await finishActiveProbe(session, deps);
  if (!finishedBaseline.ok) {
    return {
      ok: false,
      reasonCode: finishedBaseline.reasonCode ?? 'probe-finish-failed',
      phase: 'baseline',
    };
  }

  let pendingBegun = false;

  for (let stepIndex = 0; stepIndex < PERSISTENCE_RESTART_ORDER.length; stepIndex += 1) {
    const step = PERSISTENCE_RESTART_ORDER[stepIndex];
    if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.rollout) {
      return {
        ok: false,
        reasonCode: 'persistence-rollout-budget',
        phase: 'rollout',
      };
    }

    const freshObservation = await observe(session);
    const recheck = recheckIdentity(session, {
      now: session.clock.now,
      deadline: session.clock.now() + session.remainingWorkMs(),
    });
    if (!recheck?.ok) {
      return {
        ok: false,
        reasonCode: recheck.reasonCode ?? 'identity-recheck-failed',
        phase: 'identity',
      };
    }

    const freshBaseline = projectPersistenceBaseline(freshObservation);
    if (!freshBaseline.ok) {
      return {
        ok: false,
        reasonCode: freshBaseline.reasonCode,
        phase: 'inventory',
      };
    }
    for (const key of Object.keys(disruptionBaseline.workloadUids)) {
      if (
        freshBaseline.disruptionBaseline.workloadUids[key] !==
        disruptionBaseline.workloadUids[key]
      ) {
        return {
          ok: false,
          reasonCode: 'workload-uid-changed',
          phase: 'identity',
        };
      }
    }
    if (
      freshBaseline.disruptionBaseline.collectorPodUid !==
      disruptionBaseline.collectorPodUid
    ) {
      return {
        ok: false,
        reasonCode: 'collector-uid-changed',
        phase: 'identity',
      };
    }

    const objects = freshObservation?.snapshot?.objects ?? {};
    const workload = objects[step.workloadKey];
    const resourceVersion = workload?.metadata?.resourceVersion;
    const generation = Number(workload?.metadata?.generation ?? 0);
    const uid = workload?.metadata?.uid;
    const podUidBefore = activePodUids[step.workloadKey];
    if (!resourceVersion || !podUidBefore || !uid) {
      return {
        ok: false,
        reasonCode: 'workload-metadata-missing',
        phase: 'rollout',
      };
    }

    const finishedBeforeRollout = await finishActiveProbe(session, deps);
    if (!finishedBeforeRollout.ok) {
      return {
        ok: false,
        reasonCode: finishedBeforeRollout.reasonCode ?? 'probe-finish-failed',
        phase: 'rollout',
      };
    }

    const intent = buildPersistenceIntent(
      step,
      workload,
      disruptionBaseline,
    );
    const phase = PERSISTENCE_PHASES[stepIndex];
    const persistenceDetails = {
      baseline: disruptionBaseline,
      step: stepIndex,
      intent,
    };

    if (!pendingBegun) {
      try {
        custody.begin({
          operation: 'persistence',
          phase,
          tuple: session.identity.tuple,
          details: persistenceDetails,
        });
        pendingBegun = true;
      } catch (error) {
        return {
          ok: false,
          reasonCode: 'persistence-begin-failed',
          phase: 'pending',
          detail: error instanceof Error ? error.message : 'begin-failed',
        };
      }
    } else {
      try {
        custody.advance({
          phase,
          tuple: session.identity.tuple,
          details: persistenceDetails,
        });
      } catch (error) {
        return {
          ok: false,
          reasonCode: 'persistence-advance-failed',
          phase: 'pending',
          detail: error instanceof Error ? error.message : 'advance-failed',
        };
      }
    }

    const roll = await guardedRolloutRestart(
      session,
      step.kind,
      step.name,
      {
        uid,
        resourceVersion,
        generation,
        replicas: 1,
        podUidBefore,
      },
      {
        ...deps,
        preReadWorkload: workload,
        postRolloutObjects: deps.postRolloutObjects?.(session, step) ?? null,
      },
    );
    if (!roll.ok) {
      const reasonCode =
        roll.reasonCode ??
        (roll.unknownWrite ? 'rollout-patch-unknown' : 'rollout-failed');
      return {
        ok: false,
        reasonCode,
        phase: 'rollout',
        unknownWrite: roll.unknownWrite === true,
      };
    }

    const claimsAfter = await readFreshClaims(session, freshObservation, deps);
    if (!claimsAfter.ok) {
      return {
        ok: false,
        reasonCode: claimsAfter.reasonCode,
        phase: 'claims',
      };
    }
    const compatible = assertDisruptionClaimsCompatible(
      disruptionBaseline.claims,
      claimsAfter.claims,
    );
    if (!compatible.ok) {
      return { ok: false, reasonCode: compatible.reasonCode, phase: 'claims' };
    }

    const postPods =
      roll.podUidAfter != null
        ? { ok: true, podUidAfter: roll.podUidAfter }
        : deps.postRolloutObjects
          ? deriveActiveWorkloadPods(deps.postRolloutObjects(session, step))
          : await observe(session).then((postObservation) =>
              deriveActiveWorkloadPods(postObservation?.snapshot?.objects ?? {}),
            );
    if (!postPods.ok) {
      return {
        ok: false,
        reasonCode: postPods.reasonCode ?? 'rollout-pod-missing',
        phase: 'rollout',
      };
    }
    const podUidAfter =
      roll.podUidAfter ?? postPods.podUids?.[step.workloadKey];
    if (!podUidAfter || podUidAfter === podUidBefore) {
      return {
        ok: false,
        reasonCode: 'rollout-pod-unchanged',
        phase: 'rollout',
      };
    }
    activePodUids = {
      ...activePodUids,
      [step.workloadKey]: podUidAfter,
    };

    if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.queryReplay) {
      return {
        ok: false,
        reasonCode: 'persistence-query-budget',
        phase: 'query',
      };
    }

    const replay = await runProbeSession(session, identityJson, 'normal', {
      ...deps,
      evidenceSubdir: `persistence-query-${step.name}`,
    });
    if (!replay.ok) {
      return {
        ok: false,
        reasonCode: replay.reasonCode ?? 'persistence-query-failed',
        phase: 'query',
      };
    }

    writeFileSync(
      join(session.evidenceDir, `persistence-${step.name}.json`),
      JSON.stringify({ step: step.name, identity: identityJson }),
    );
  }

  const finalObservation = await observe(session);
  const finalShape = await Promise.resolve(
    deps.verifyFinalShape
      ? deps.verifyFinalShape(finalObservation, session)
      : (async () => {
          const { verifyOwnedFinalShape } = await import(
            '../../../platform/observability/readiness.mjs'
          );
          const snapshot = finalObservation?.snapshot ?? finalObservation;
          return verifyOwnedFinalShape(
            snapshot,
            deps.desired ?? { releases: [] },
            {
              identity: session.identity,
              custody,
              expectedOperation: 'persistence',
              expectedRevision: deps.expectedRevision ?? 1,
            },
          );
        })(),
  );
  if (!finalShape?.ok) {
    return {
      ok: false,
      reasonCode: finalShape.detail ?? 'owned-final-shape',
      phase: 'final-shape',
    };
  }

  const cleanup =
    deps.cleanupProofResources ??
    (session.resources?.cleanup
      ? () =>
          session.resources.cleanup({
            deadline: session.clock.now() + session.remainingWorkMs(),
          })
      : null);
  if (cleanup) {
    const cleaned = await cleanup(session);
    if (!cleaned?.ok) {
      return {
        ok: false,
        reasonCode: cleaned.reasonCode ?? 'proof-cleanup-failed',
        phase: 'cleanup',
      };
    }
  }

  try {
    custody.clear();
  } catch (error) {
    return {
      ok: false,
      reasonCode: 'persistence-clear-failed',
      phase: 'clear',
      detail: error instanceof Error ? error.message : 'clear-failed',
    };
  }

  return {
    ok: true,
    reasonCode: null,
    phase: 'persistence-complete',
    identity: identityJson,
  };
}

function refusedIfCancelled(session, custody) {
  if (session.custody?.cancelled || custody?.cancelled) {
    return { ok: false, reasonCode: 'outage-cancelled', phase: 'cancelled' };
  }
  return null;
}

/**
 * @param {object} session
 * @param {object} deps
 * @param {object} downObservation
 * @param {object} disruptionBaseline
 */
async function buildOutageRestoreFresh(
  session,
  deps,
  downObservation,
  disruptionBaseline,
) {
  const objects = downObservation?.snapshot?.objects ?? {};
  const tempo = objects[OUTAGE_TARGET.workloadKey];
  if (
    !tempo ||
    tempo.metadata?.uid !== disruptionBaseline.workloadUids[OUTAGE_TARGET.workloadKey]
  ) {
    return { ok: false, reasonCode: 'tempo-uid-changed', phase: 'restore' };
  }
  if (Number(tempo.spec?.replicas ?? -1) !== 0) {
    return { ok: false, reasonCode: 'tempo-not-down', phase: 'restore' };
  }
  const backends = deriveHealthyOutageBackends(objects);
  if (!backends.ok) {
    return {
      ok: false,
      reasonCode: backends.reasonCode,
      phase: 'restore',
    };
  }
  if (
    backends.podUids['Deployment/obs-collector'] !==
    disruptionBaseline.collectorPodUid
  ) {
    return {
      ok: false,
      reasonCode: 'collector-uid-changed',
      phase: 'restore',
    };
  }
  const zeroTempo = assertZeroActiveTempoPods(objects);
  if (!zeroTempo.ok) {
    return { ok: false, reasonCode: zeroTempo.reasonCode, phase: 'restore' };
  }
  const claims = await readFreshClaims(session, downObservation, deps);
  if (!claims.ok) {
    return { ok: false, reasonCode: claims.reasonCode, phase: 'restore' };
  }
  const compatible = assertDisruptionClaimsCompatible(
    disruptionBaseline.claims,
    claims.claims,
  );
  if (!compatible.ok) {
    return { ok: false, reasonCode: compatible.reasonCode, phase: 'restore' };
  }
  return {
    ok: true,
    fresh: {
      uid: tempo.metadata.uid,
      resourceVersion: tempo.metadata.resourceVersion,
      generation: Number(tempo.metadata.generation),
      replicas: 0,
      claims: claims.claims,
      collectorPodUid: disruptionBaseline.collectorPodUid,
    },
  };
}

/**
 * @param {object} session
 * @param {object} deps
 * @param {{ disruptionBaseline: object, downResourceVersion?: string }} outageState
 */
export async function restoreTempoAfterOutage(session, deps, outageState = {}) {
  if (deps.restoreTempo) {
    return deps.restoreTempo({ session, outageState });
  }
  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.restore) {
    return {
      ok: false,
      reasonCode: 'outage-restore-budget',
      phase: 'restore',
    };
  }
  const observe =
    deps.observe ??
    (() => {
      throw new Error('observe-runner-required');
    });
  const downObservation = await observe(session, 'pre-restore');
  const disruptionBaseline =
    outageState.disruptionBaseline ??
    projectPersistenceBaseline(downObservation).disruptionBaseline;
  const freshProjection = await buildOutageRestoreFresh(
    session,
    deps,
    downObservation,
    disruptionBaseline,
  );
  if (!freshProjection.ok) {
    return freshProjection;
  }
  const custody = deps.custody ?? session.custody;
  if (custody?.restoreTempoOnce) {
    const identity = {
      snapshotPath: session.identity.snapshotPath,
      contextName: session.identity.contextName,
      namespace: session.identity.namespace ?? PLATFORM_OBSERVABILITY_NS,
      tuple: session.identity.tuple,
    };
    const restore = await custody.restoreTempoOnce(identity, {
      fresh: freshProjection.fresh,
      deadline:
        session.clock.now() +
        Math.min(DISRUPTION_PHASE_BUDGET_MS.restore, session.remainingWorkMs()),
      now: session.clock.now,
    });
    if (restore.restorationFailed === true || restore.ok !== true) {
      return {
        ok: false,
        reasonCode: 'outage-restore-failed',
        phase: 'restore',
        restorationFailed: true,
        restorationAttempted: restore.restorationAttempted === true,
      };
    }
    return {
      ok: true,
      restorationFailed: false,
      restorationAttempted: restore.restorationAttempted === true,
    };
  }
  const pre = freshProjection.fresh;
  const scaled = await guardedScaleTempo(
    session,
    1,
    {
      uid: pre.uid,
      resourceVersion: pre.resourceVersion,
      generation: pre.generation,
      replicas: 0,
    },
    deps,
  );
  if (!scaled.ok) {
    return {
      ok: false,
      reasonCode: scaled.reasonCode ?? 'outage-restore-failed',
      phase: 'restore',
      restorationFailed: true,
    };
  }
  return { ok: true, restorationFailed: false, restorationAttempted: true };
}

/**
 * @param {object} session
 * @param {object} deps
 * @param {object} outageState
 */
async function tryEmergencyRestore(session, deps, outageState) {
  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.restore) {
    return { attempted: false };
  }
  const restored = await restoreTempoAfterOutage(session, deps, outageState);
  return {
    attempted: restored.restorationAttempted === true,
    restorationFailed: restored.restorationFailed === true,
    restored,
  };
}

/**
 * @param {object} session
 * @param {{ observe?: Function, runPythonProbe?: Function, scaleWorkload?: Function, restoreTempo?: Function, readClaims?: Function, custody?: object, recheckIdentity?: Function, verifyTempoDown?: Function, verifyFinalShape?: Function, cleanupProofResources?: Function }} [deps]
 */
export async function runOutageProof(session, deps = {}) {
  const auth = requireDisruptionAuthorization(
    'outage',
    session.env ?? process.env,
  );
  if (auth.refused) {
    return { ok: false, reasonCode: auth.reasonCode, phase: 'disruption-auth' };
  }
  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.baseline) {
    return { ok: false, reasonCode: 'outage-budget', phase: 'preflight' };
  }

  const custody = deps.custody ?? session.custody;
  const observe =
    deps.observe ??
    (() => {
      throw new Error('observe-runner-required');
    });
  const recheckIdentity = deps.recheckIdentity ?? (() => ({ ok: true }));

  const observation = await observe(session);
  const baselineProjection = projectPersistenceBaseline(observation);
  if (!baselineProjection.ok) {
    return {
      ok: false,
      reasonCode: baselineProjection.reasonCode,
      phase: 'baseline',
    };
  }
  const disruptionBaseline = baselineProjection.disruptionBaseline;

  const positive = await runProbeSession(session, null, 'normal', deps);
  if (!positive.ok) {
    return {
      ok: false,
      reasonCode: positive.reasonCode ?? 'baseline-positive',
      phase: 'baseline',
    };
  }

  const finishedBaseline = await finishActiveProbe(session, deps);
  if (!finishedBaseline.ok) {
    return {
      ok: false,
      reasonCode: finishedBaseline.reasonCode ?? 'probe-finish-failed',
      phase: 'baseline',
    };
  }

  let cancelled = refusedIfCancelled(session, custody);
  if (cancelled) {
    return cancelled;
  }

  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.tempoDown) {
    return { ok: false, reasonCode: 'outage-down-budget', phase: 'down' };
  }

  const preDownObservation = await observe(session, 'pre-down');
  const recheck = recheckIdentity(session, {
    now: session.clock.now,
    deadline: session.clock.now() + session.remainingWorkMs(),
  });
  if (!recheck?.ok) {
    return {
      ok: false,
      reasonCode: recheck.reasonCode ?? 'identity-recheck-failed',
      phase: 'identity',
    };
  }
  const tempoWorkload =
    preDownObservation?.snapshot?.objects?.[OUTAGE_TARGET.workloadKey];
  const tempoUid = disruptionBaseline.workloadUids[OUTAGE_TARGET.workloadKey];
  const tempoResourceVersion = tempoWorkload?.metadata?.resourceVersion;
  const tempoGeneration = Number(tempoWorkload?.metadata?.generation ?? 0);
  const tempoReplicas = Number(tempoWorkload?.spec?.replicas ?? 1);
  if (
    !tempoWorkload ||
    tempoWorkload.metadata?.uid !== tempoUid ||
    !tempoResourceVersion ||
    tempoReplicas !== 1 ||
    !tempoGeneration
  ) {
    return {
      ok: false,
      reasonCode: 'tempo-baseline-invalid',
      phase: 'down',
    };
  }

  let pendingBegun = false;
  if (custody?.begin) {
    try {
      custody.begin({
        operation: 'outage',
        phase: 'outage-down',
        tuple: session.identity.tuple,
        details: buildOutageBeginDetails(
          { disruptionBaseline },
          tempoWorkload,
        ),
      });
      pendingBegun = true;
    } catch (error) {
      return {
        ok: false,
        reasonCode: 'outage-begin-failed',
        phase: 'pending',
        detail: error instanceof Error ? error.message : 'begin-failed',
      };
    }
  }

  const scaleDown = await guardedScaleTempo(
    session,
    0,
    {
      uid: tempoUid,
      resourceVersion: tempoResourceVersion,
      generation: tempoGeneration,
      replicas: 1,
    },
    deps,
  );
  if (!scaleDown.ok) {
    if (scaleDown.cancelled === true) {
      const emergency = await tryEmergencyRestore(session, deps, {
        disruptionBaseline,
      });
      return {
        ok: false,
        reasonCode: 'outage-cancelled',
        phase: 'scale-down',
        restorationAttempted: emergency.attempted === true,
        restorationFailed: emergency.restorationFailed === true,
        retainedPending: pendingBegun,
      };
    }
    if (pendingBegun && custody?.confirmOutageDown) {
      custody.confirmOutageDown({
        notAttempted: scaleDown.unknownWrite !== true,
      });
    }
    return {
      ok: false,
      reasonCode: scaleDown.reasonCode ?? 'tempo-scale-down-failed',
      phase: 'scale-down',
      unknownWrite: scaleDown.unknownWrite === true,
      retainedPending: pendingBegun,
    };
  }

  const downObservation = await observe(session, 'post-down');
  const downObjects = downObservation?.snapshot?.objects ?? {};
  const backendsAfterDown = deriveHealthyOutageBackends(downObjects);
  if (!backendsAfterDown.ok) {
    if (pendingBegun && custody?.confirmOutageDown) {
      custody.confirmOutageDown({ notAttempted: false });
    }
    const emergency = await tryEmergencyRestore(session, deps, {
      disruptionBaseline,
    });
    return {
      ok: false,
      reasonCode: backendsAfterDown.reasonCode,
      phase: 'down-verify',
      restorationAttempted: emergency.attempted === true,
      restorationFailed: emergency.restorationFailed === true,
      retainedPending: pendingBegun,
    };
  }
  if (
    backendsAfterDown.podUids['Deployment/obs-collector'] !==
    disruptionBaseline.collectorPodUid
  ) {
    return {
      ok: false,
      reasonCode: 'collector-uid-changed',
      phase: 'down-verify',
      retainedPending: pendingBegun,
    };
  }
  const zeroTempo = assertZeroActiveTempoPods(downObjects);
  if (!zeroTempo.ok) {
    if (pendingBegun && custody?.confirmOutageDown) {
      custody.confirmOutageDown({ notAttempted: false });
    }
    return {
      ok: false,
      reasonCode: zeroTempo.reasonCode,
      phase: 'down-verify',
      retainedPending: pendingBegun,
    };
  }

  const downTempo = downObjects[OUTAGE_TARGET.workloadKey];
  const downObserved =
    scaleDown.observed ??
    (downTempo
      ? {
          uid: tempoUid,
          resourceVersion: downTempo.metadata.resourceVersion,
          generation: Number(downTempo.metadata.generation),
          replicas: Number(downTempo.spec?.replicas ?? -1),
        }
      : null);
  if (pendingBegun && custody?.confirmOutageDown) {
    if (
      downObserved?.uid === tempoUid &&
      downObserved.replicas === 0 &&
      downObserved.generation === tempoGeneration + 1
    ) {
      custody.confirmOutageDown({ observed: downObserved });
    } else {
      custody.confirmOutageDown({ notAttempted: false });
    }
  }

  if (deps.verifyTempoDown) {
    const downCheck = await deps.verifyTempoDown(downObservation, session);
    if (!downCheck?.ok) {
      const emergency = await tryEmergencyRestore(session, deps, {
        disruptionBaseline,
      });
      return {
        ok: false,
        reasonCode: downCheck.reasonCode ?? 'tempo-down-shape',
        phase: 'down-verify',
        restorationAttempted: emergency.attempted === true,
        restorationFailed: emergency.restorationFailed === true,
        retainedPending: pendingBegun,
      };
    }
  }

  cancelled = refusedIfCancelled(session, custody);
  if (cancelled) {
    const emergency = await tryEmergencyRestore(session, deps, {
      disruptionBaseline,
    });
    return {
      ...cancelled,
      restorationAttempted: emergency.attempted === true,
      restorationFailed: emergency.restorationFailed === true,
      retainedPending: pendingBegun,
    };
  }

  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.queryReplay) {
    return {
      ok: false,
      reasonCode: 'outage-isolation-budget',
      phase: 'isolation',
      retainedPending: pendingBegun,
    };
  }

  const finishedBeforeIsolation = await finishActiveProbe(session, deps);
  if (!finishedBeforeIsolation.ok) {
    const emergency = await tryEmergencyRestore(session, deps, {
      disruptionBaseline,
    });
    return {
      ok: false,
      reasonCode:
        finishedBeforeIsolation.reasonCode ?? 'probe-finish-failed',
      phase: 'isolation',
      restorationAttempted: emergency.attempted === true,
      restorationFailed: emergency.restorationFailed === true,
      retainedPending: pendingBegun,
    };
  }

  const isolation = await runProbeSession(session, null, 'tempo-outage', {
    ...deps,
    evidenceSubdir: 'outage-isolation',
  });
  if (!isolation.ok) {
    const emergency = await tryEmergencyRestore(session, deps, {
      disruptionBaseline,
    });
    return {
      ok: false,
      reasonCode: isolation.reasonCode ?? 'outage-isolation-failed',
      phase: 'isolation',
      restorationAttempted: emergency.attempted === true,
      restorationFailed: emergency.restorationFailed === true,
      retainedPending: pendingBegun,
    };
  }

  const finishedBeforeRestore = await finishActiveProbe(session, deps);
  if (!finishedBeforeRestore.ok) {
    const emergency = await tryEmergencyRestore(session, deps, {
      disruptionBaseline,
    });
    return {
      ok: false,
      reasonCode:
        finishedBeforeRestore.reasonCode ?? 'probe-finish-failed',
      phase: 'restore',
      restorationAttempted: emergency.attempted === true,
      restorationFailed: emergency.restorationFailed === true,
      retainedPending: pendingBegun,
    };
  }

  cancelled = refusedIfCancelled(session, custody);
  if (cancelled) {
    const emergency = await tryEmergencyRestore(session, deps, {
      disruptionBaseline,
    });
    return {
      ...cancelled,
      restorationAttempted: emergency.attempted === true,
      restorationFailed: emergency.restorationFailed === true,
      retainedPending: pendingBegun,
    };
  }

  if (session.remainingWorkMs() < DISRUPTION_PHASE_BUDGET_MS.restore) {
    return {
      ok: false,
      reasonCode: 'outage-restore-budget',
      phase: 'restore',
      retainedPending: pendingBegun,
    };
  }

  const restored = await restoreTempoAfterOutage(session, deps, {
    disruptionBaseline,
    downResourceVersion: downObserved?.resourceVersion,
  });
  if (!restored.ok) {
    return {
      ok: false,
      reasonCode: restored.reasonCode ?? 'outage-restore-failed',
      phase: 'restore',
      restorationFailed: true,
      restorationAttempted: restored.restorationAttempted === true,
      retainedPending: pendingBegun,
    };
  }

  const postRestoreObservation = await observe(session, 'post-restore');
  const postObjects = postRestoreObservation?.snapshot?.objects ?? {};
  const postPods = deriveActiveWorkloadPods(postObjects);
  if (!postPods.ok) {
    return {
      ok: false,
      reasonCode: postPods.reasonCode,
      phase: 'post-restore',
      retainedPending: pendingBegun,
    };
  }
  if (
    postPods.podUids['Deployment/obs-collector'] !==
    disruptionBaseline.collectorPodUid
  ) {
    return {
      ok: false,
      reasonCode: 'collector-uid-changed',
      phase: 'post-restore',
      retainedPending: pendingBegun,
    };
  }
  const postClaims = await readFreshClaims(session, postRestoreObservation, deps);
  if (!postClaims.ok) {
    return {
      ok: false,
      reasonCode: postClaims.reasonCode,
      phase: 'post-restore',
      retainedPending: pendingBegun,
    };
  }
  const claimCheck = assertDisruptionClaimsCompatible(
    disruptionBaseline.claims,
    postClaims.claims,
  );
  if (!claimCheck.ok) {
    return {
      ok: false,
      reasonCode: claimCheck.reasonCode,
      phase: 'post-restore',
      retainedPending: pendingBegun,
    };
  }

  if (
    session.remainingWorkMs() <
    DISRUPTION_PHASE_BUDGET_MS.recoveryEvidence + DISRUPTION_PHASE_BUDGET_MS.finish
  ) {
    return {
      ok: false,
      reasonCode: 'outage-recovery-budget',
      phase: 'recovery',
      retainedPending: pendingBegun,
    };
  }

  const recovery = await runProbeSession(session, null, 'normal', {
    ...deps,
    evidenceSubdir: 'outage-recovery',
  });
  if (!recovery.ok) {
    return {
      ok: false,
      reasonCode: recovery.reasonCode ?? 'outage-recovery-failed',
      phase: 'recovery',
      retainedPending: pendingBegun,
    };
  }

  const finalObservation = await observe(session, 'final');
  const finalShape = await Promise.resolve(
    deps.verifyFinalShape
      ? deps.verifyFinalShape(finalObservation, session)
      : (async () => {
          const { verifyOwnedFinalShape } = await import(
            '../../../platform/observability/readiness.mjs'
          );
          const snapshot = finalObservation?.snapshot ?? finalObservation;
          return verifyOwnedFinalShape(
            snapshot,
            deps.desired ?? { releases: [] },
            {
              identity: session.identity,
              custody,
              expectedOperation: 'outage',
              expectedRevision: deps.expectedRevision ?? 1,
            },
          );
        })(),
  );
  if (!finalShape?.ok) {
    return {
      ok: false,
      reasonCode: finalShape.detail ?? 'owned-final-shape',
      phase: 'final-shape',
      retainedPending: pendingBegun,
    };
  }

  const cleanup =
    deps.cleanupProofResources ??
    (session.resources?.cleanup
      ? () =>
          session.resources.cleanup({
            deadline: session.clock.now() + session.remainingWorkMs(),
          })
      : null);
  if (cleanup) {
    const cleaned = await cleanup(session);
    if (!cleaned?.ok) {
      return {
        ok: false,
        reasonCode: cleaned.reasonCode ?? 'proof-cleanup-failed',
        phase: 'cleanup',
        retainedPending: pendingBegun,
      };
    }
  }

  const finishedRecovery = await finishActiveProbe(session, deps);
  if (!finishedRecovery.ok) {
    return {
      ok: false,
      reasonCode: finishedRecovery.reasonCode ?? 'probe-finish-failed',
      phase: 'recovery',
      retainedPending: pendingBegun,
    };
  }

  if (custody?.clear) {
    try {
      custody.clear();
    } catch (error) {
      return {
        ok: false,
        reasonCode: 'outage-clear-failed',
        phase: 'clear',
        detail: error instanceof Error ? error.message : 'clear-failed',
        retainedPending: true,
      };
    }
  }

  return { ok: true, reasonCode: null, phase: 'outage-complete' };
}
