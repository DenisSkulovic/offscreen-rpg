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
  RESTORATION_RESERVE_MS,
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
  tempoDown: 120_000,
  restore: 240_000,
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

/**
 * @param {object} session
 * @param {string} kind
 * @param {string} name
 * @param {{ resourceVersion: string, podUidBefore: string, generation: number }} pre
 * @param {{ rollWorkload?: Function, run?: typeof runPlatformCommand }} [deps]
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
  const contextName = session.identity.contextName;
  const patch = {
    spec: {
      template: {
        metadata: {
          annotations: {
            [ROLLOUT_ANNOTATION]: new Date(session.clock.now()).toISOString(),
          },
        },
      },
    },
  };
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      '-n',
      PLATFORM_OBSERVABILITY_NS,
      'patch',
      kind,
      name,
      '--type',
      'strategic',
      '--patch',
      JSON.stringify(patch),
      `--resource-version=${pre.resourceVersion}`,
    ],
    { timeoutMs: 30_000 },
  );
  if (!result.ok) {
    return { ok: false, reasonCode: 'rollout-patch-failed' };
  }
  const wait = run(
    'kubectl',
    [
      '--context',
      contextName,
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
    return { ok: false, reasonCode: 'rollout-wait-failed' };
  }
  const pods = readPlatformPodUids(contextName, { run });
  if (!pods.ok) {
    return pods;
  }
  const workloadKey =
    kind === 'deployment' ? `Deployment/${name}` : `StatefulSet/${name}`;
  const podUidAfter = pods.podUids[workloadKey];
  if (!podUidAfter || podUidAfter === pre.podUidBefore) {
    return { ok: false, reasonCode: 'rollout-pod-unchanged' };
  }
  return { ok: true, podUidAfter };
}

/**
 * @param {object} session
 * @param {number} replicas
 * @param {{ resourceVersion: string, replicas: number }} pre
 * @param {{ scaleWorkload?: Function, run?: typeof runPlatformCommand }} [deps]
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
  if (pre.replicas !== (replicas === 0 ? 1 : 0)) {
    return { ok: false, reasonCode: 'scale-precondition-replica' };
  }
  const run = deps.run ?? runPlatformCommand;
  const contextName = session.identity.contextName;
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      '-n',
      PLATFORM_OBSERVABILITY_NS,
      'scale',
      `${OUTAGE_TARGET.kind}/${OUTAGE_TARGET.name}`,
      `--replicas=${replicas}`,
      `--resource-version=${pre.resourceVersion}`,
      '--current-replicas',
      String(pre.replicas),
    ],
    { timeoutMs: 30_000 },
  );
  if (!result.ok) {
    return { ok: false, reasonCode: 'tempo-scale-failed' };
  }
  return { ok: true };
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
 * @param {{ observe?: Function, runPythonProbe?: Function, rollWorkload?: Function, readClaims?: Function, recheckIdentity?: Function }} [deps]
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

  const observe =
    deps.observe ??
    (() => {
      throw new Error('observe-runner-required');
    });
  const observation = await observe(session);
  const baseline = capturePersistenceBaseline(
    observation,
    session.identity.contextName,
    deps,
  );
  if (!baseline.pods.ok) {
    return {
      ok: false,
      reasonCode: baseline.pods.reasonCode,
      phase: 'baseline',
    };
  }

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

  const initialClaims = await Promise.resolve(
    deps.readClaims?.(session) ?? { ok: true, tuple: baseline.claims },
  );
  if (!initialClaims.ok) {
    return { ok: false, reasonCode: initialClaims.reasonCode, phase: 'claims' };
  }
  let claimTuple = initialClaims.tuple;

  const objects = observation?.snapshot?.objects ?? {};
  for (const step of PERSISTENCE_RESTART_ORDER) {
    if (
      session.remainingWorkMs() <
      RESTORATION_RESERVE_MS + DISRUPTION_PHASE_BUDGET_MS.rollout
    ) {
      return {
        ok: false,
        reasonCode: 'persistence-rollout-budget',
        phase: 'rollout',
      };
    }
    const workload = objects[step.workloadKey];
    const resourceVersion = workload?.metadata?.resourceVersion;
    const generation = Number(workload?.status?.observedGeneration ?? 0);
    const podUidBefore = baseline.pods.podUids[step.workloadKey];
    if (!resourceVersion || !podUidBefore) {
      return {
        ok: false,
        reasonCode: 'workload-metadata-missing',
        phase: 'rollout',
      };
    }
    const roll = await guardedRolloutRestart(
      session,
      step.kind,
      step.name,
      { resourceVersion, podUidBefore, generation },
      deps,
    );
    if (!roll.ok) {
      return {
        ok: false,
        reasonCode: roll.reasonCode ?? 'rollout-failed',
        phase: 'rollout',
      };
    }

    const afterClaims = await Promise.resolve(
      deps.readClaims?.(session) ?? initialClaims,
    );
    if (!afterClaims.ok) {
      return { ok: false, reasonCode: afterClaims.reasonCode, phase: 'claims' };
    }
    const compatible = assertPvcTupleCompatible(claimTuple, afterClaims.tuple);
    if (!compatible.ok) {
      return { ok: false, reasonCode: compatible.reasonCode, phase: 'claims' };
    }

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

  return {
    ok: true,
    reasonCode: null,
    phase: 'persistence-complete',
    identity: identityJson,
  };
}

/**
 * @param {object} session
 * @param {{ observe?: Function, runPythonProbe?: Function, scaleWorkload?: Function, restoreTempo?: Function, readClaims?: Function }} [deps]
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

  const observe =
    deps.observe ??
    (() => {
      throw new Error('observe-runner-required');
    });
  const observation = await observe(session);
  const baseline = capturePersistenceBaseline(
    observation,
    session.identity.contextName,
    deps,
  );
  if (!baseline.pods.ok) {
    return {
      ok: false,
      reasonCode: baseline.pods.reasonCode,
      phase: 'baseline',
    };
  }

  const collectorUid = baseline.pods.podUids['Deployment/obs-collector'];
  if (!collectorUid) {
    return {
      ok: false,
      reasonCode: 'collector-uid-missing',
      phase: 'baseline',
    };
  }

  const positive = await runProbeSession(session, null, 'normal', deps);
  if (!positive.ok) {
    return {
      ok: false,
      reasonCode: positive.reasonCode ?? 'baseline-positive',
      phase: 'baseline',
    };
  }

  const tempoWorkload =
    observation?.snapshot?.objects?.[OUTAGE_TARGET.workloadKey];
  const tempoResourceVersion = tempoWorkload?.metadata?.resourceVersion;
  const tempoReplicas = Number(tempoWorkload?.spec?.replicas ?? 1);
  if (!tempoResourceVersion || tempoReplicas !== 1) {
    return {
      ok: false,
      reasonCode: 'tempo-baseline-invalid',
      phase: 'baseline',
    };
  }

  const scaleDown = await guardedScaleTempo(
    session,
    0,
    { resourceVersion: tempoResourceVersion, replicas: 1 },
    deps,
  );
  if (!scaleDown.ok) {
    return {
      ok: false,
      reasonCode: scaleDown.reasonCode ?? 'tempo-scale-down-failed',
      phase: 'scale-down',
    };
  }

  const isolation = await runProbeSession(session, null, 'tempo-outage', {
    ...deps,
    evidenceSubdir: 'outage-isolation',
  });
  if (!isolation.ok) {
    if (session.remainingWorkMs() >= RESTORATION_RESERVE_MS) {
      await restoreTempoAfterOutage(session, deps, tempoResourceVersion);
    }
    return {
      ok: false,
      reasonCode: isolation.reasonCode ?? 'outage-isolation-failed',
      phase: 'isolation',
      restorationAttempted: true,
    };
  }

  if (session.remainingWorkMs() < RESTORATION_RESERVE_MS) {
    return { ok: false, reasonCode: 'outage-restore-budget', phase: 'restore' };
  }

  const restored = await restoreTempoAfterOutage(
    session,
    deps,
    tempoResourceVersion,
  );
  if (!restored.ok) {
    return {
      ok: false,
      reasonCode: restored.reasonCode ?? 'outage-restore-failed',
      phase: 'restore',
      restorationFailed: true,
    };
  }

  const afterPods = await Promise.resolve(
    deps.readPodUids?.(session) ??
      readPlatformPodUids(session.identity.contextName, deps),
  );
  if (!afterPods.ok) {
    return {
      ok: false,
      reasonCode: afterPods.reasonCode,
      phase: 'post-restore',
    };
  }
  if (afterPods.podUids['Deployment/obs-collector'] !== collectorUid) {
    return {
      ok: false,
      reasonCode: 'collector-uid-changed',
      phase: 'post-restore',
    };
  }

  const claimsAfter = await Promise.resolve(
    deps.readClaims?.(session) ?? { ok: true, tuple: baseline.claims },
  );
  const claimCheck = assertPvcTupleCompatible(
    baseline.claims,
    claimsAfter.tuple ?? {},
  );
  if (!claimCheck.ok) {
    return {
      ok: false,
      reasonCode: claimCheck.reasonCode,
      phase: 'post-restore',
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
    };
  }

  return { ok: true, reasonCode: null, phase: 'outage-complete' };
}

/**
 * @param {object} session
 * @param {object} deps
 * @param {string} tempoResourceVersion
 */
async function restoreTempoAfterOutage(session, deps, tempoResourceVersion) {
  if (deps.restoreTempo) {
    return deps.restoreTempo({
      session,
      pre: { resourceVersion: tempoResourceVersion, replicas: 0 },
    });
  }
  return guardedScaleTempo(
    session,
    1,
    { resourceVersion: tempoResourceVersion, replicas: 0 },
    deps,
  );
}
