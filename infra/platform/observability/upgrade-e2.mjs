import process from 'node:process';
import { performance } from 'node:perf_hooks';

import { helmValuesArgv, loadOperationalArtifactSet } from './artifacts.mjs';
import { runPlatformCommand } from '../common/commands.mjs';
import { acquireCustody, readPending, runMutation } from './custody.mjs';
import {
  compareE2Preservation,
  markerIdsFromIdentity,
  projectE2Preservation,
  runMarkerProbe,
} from './e2-preservation.mjs';
import {
  openE2UpgradeMarkerForwards,
  openForwards,
  probeForwardTransport,
} from './forward.mjs';
import {
  MIN_HOST_MEMORY_MIB,
  parseMeminfoMiB,
} from '../../clusters/kind/manager/host-probe.mjs';
import { captureIdentity, recheckIdentity } from './identity.mjs';
import { collectInventory } from './inventory.mjs';
import { readDevKubeletTrust } from './kubelet-trust.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  classifyOperationalInventory,
  manifestSetSha256,
  verifyOwnedHistoryShape,
} from './readiness.mjs';

/**
 * Guarded occupied E1-developer to E2 upgrade (`--evolution e2`).
 *
 * Ordered, no resume/rollback: custody `upgrade-e2` phases
 * prometheus-intent (verify exact predecessor, supervised P helm upgrade,
 * verify P2/G1 + retained markers, advance) -> grafana-intent (G helm upgrade,
 * verify P2/G2 + markers, advance) -> final-verification (verify, preservation,
 * markers, transport, clear). Every verifier call receives the original live
 * exclusive custody handle and the H04 historyId/phase/pendingPhase tuple; its
 * verdict is what custody advance/clear consume. Any failure retains the
 * owned pending record and stops.
 */

const ADMISSION_MS = 30_000;
const MEMORY_TIMEOUT_MS = 3_000;
const HELM_TIMEOUT_MS = 240_000;
const ORIGINAL_COLLECTOR_REVISION = {
  'developer-fresh': 1,
  'developer-upgraded': 2,
};

class StepFailure extends Error {
  /** @param {string} reasonCode */
  constructor(reasonCode) {
    super(reasonCode);
    this.reasonCode = reasonCode;
  }
}

/**
 * @param {string} reasonCode
 * @param {Record<string, unknown>} [extra]
 */
function receipt(reasonCode, extra = {}) {
  return {
    schema: 1,
    operation: 'upgrade',
    profile: 'dev',
    evolution: 'e2',
    ok: false,
    state: 'refused',
    reasonCode,
    mutation: 'none',
    pending: false,
    phase: null,
    lastProven: null,
    ...extra,
  };
}

/**
 * Exact P or G upgrade argv. Same release/chart/values as the bound E2
 * descriptor; never --force, --reuse-values, --atomic or rollback.
 * @param {object} identity
 * @param {{ name: string, chartPath: string, valuesPaths: string[], helmValueArgs: string[] }} release
 */
export function helmE2UpgradeArgv(identity, release) {
  return [
    'upgrade',
    release.name,
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

/** @param {object} deps */
async function hostMemoryOk(deps) {
  const run = deps.run ?? runPlatformCommand;
  const result = await run('cat', ['/proc/meminfo'], {
    timeoutMs: Math.min(MEMORY_TIMEOUT_MS, ADMISSION_MS),
  });
  if (!result?.ok) return false;
  const parsed = parseMeminfoMiB(result.stdout ?? '');
  return (
    Number.isInteger(parsed.memAvailableMiB) &&
    parsed.memAvailableMiB >= MIN_HOST_MEMORY_MIB
  );
}

/**
 * @param {{ argv?: string[], [key: string]: any }} deps
 */
export async function runE2Upgrade(deps = {}) {
  const profile = (deps.readPlatformProfile ?? readPlatformProfile)('dev');
  const now = deps.now ?? (() => performance.now());
  if (!(await hostMemoryOk(deps))) {
    return receipt('refused');
  }
  const identity = await (deps.captureIdentity ?? captureIdentity)(
    'dev',
    profile.contextName,
    { run: deps.observeRun ?? runPlatformCommand, now: deps.now, deadline: deps.identityDeadline },
  );
  const readTrust =
    deps.readKubeletTrust ??
    ((id) =>
      readDevKubeletTrust(id, {
        ...(deps.trustRun ? { run: deps.trustRun } : {}),
      }));
  /** @type {any} */
  let artifactSet;
  let binding;
  try {
    const trust = readTrust(identity);
    binding = trust?.bindingSha256;
    artifactSet = (deps.loadOperationalArtifactSet ?? loadOperationalArtifactSet)(
      'dev',
      { kubeletTrust: trust },
    );
  } catch {
    return receipt('kubelet-trust-unavailable');
  }
  const desired = artifactSet?.desired;
  if (
    desired?.artifactId !== 'dev-e2' ||
    typeof binding !== 'string' ||
    desired.kubeletTrustBindingSha256 !== binding
  ) {
    return receipt('kubelet-trust-unavailable');
  }
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
    return message.includes('pending')
      ? receipt('pending', { state: 'not-ready', pending: true })
      : receipt('lock-unavailable');
  }

  let began = false;
  let mutation = 'none';
  /** @type {string | null} */
  let phase = null;
  /** @type {string | null} */
  let lastProven = null;
  try {
    const collect = async () => {
      if (deps.collectInventory) {
        return deps.collectInventory(identity, desired, artifactSet);
      }
      const snapshot = collectInventory(identity, desired, {
        run: deps.observeRun ?? runPlatformCommand,
        now: deps.now ?? (() => Date.now()),
        deadline: (deps.now ?? (() => Date.now()))() + 120_000,
        stateRoot: deps.stateRoot,
        staticInventory: artifactSet.staticInventory ?? undefined,
        readPending:
          deps.readPending ??
          ((contextName) => readPending(contextName, { stateRoot: deps.stateRoot })),
      });
      snapshot.profileId = 'dev';
      return snapshot;
    };
    // Identity and the one G2 trust binding digest, rechecked before each write.
    const guard = () => {
      const again = (deps.recheckIdentity ?? recheckIdentity)(identity, {
        run: deps.observeRun ?? runPlatformCommand,
        now: deps.now,
        deadline: deps.identityDeadline,
        expectedNamespaceUid: identity.tuple?.targetNamespaceUid,
      });
      if (!again?.ok) throw new StepFailure('unreadable');
      let current;
      try {
        current = readTrust(identity)?.bindingSha256;
      } catch {
        throw new StepFailure('kubelet-trust-unavailable');
      }
      if (current !== binding) throw new StepFailure('kubelet-trust-changed');
    };

    const first = await collect();
    if (first?.pending === true) {
      return receipt('pending', { state: 'not-ready', pending: true });
    }
    const classified = (deps.classifyOperationalInventory ?? classifyOperationalInventory)(
      first,
      artifactSet,
    );
    if (
      classified.state === 'ready' &&
      classified.artifactId === 'dev-e2' &&
      classified.desiredConverged === true &&
      classified.pending !== true
    ) {
      guard();
      return receipt('ready', {
        ok: true,
        state: 'ready',
        pending: false,
        mutation: 'none',
        phase: 'final-verification',
        lastProven: 'e2-final-repeat',
      });
    }
    if (
      classified.artifactId !== 'dev-e1-developer' ||
      !(classified.historyId in ORIGINAL_COLLECTOR_REVISION) ||
      classified.reasonCode !== 'upgrade-required'
    ) {
      return receipt(
        classified.reasonCode === 'upgrade-required' ? 'not-ready' : classified.reasonCode,
        { state: classified.state ?? 'not-ready', pending: classified.pending === true },
      );
    }
    const originalId = classified.historyId;
    const predecessor = (artifactSet.admissible ?? []).find(
      (b) => b.artifactId === 'dev-e1-developer',
    );
    const prometheus = desired.releases?.find((r) => r.role === 'prometheus');
    const grafana = desired.releases?.find((r) => r.role === 'grafana');
    if (!predecessor || !prometheus || !grafana) {
      return receipt('artifact-invalid');
    }
    const before = projectE2Preservation(first);
    if (before == null) return receipt('not-ready', { state: 'not-ready' });
    const headroom = deps.checkHeadroom
      ? await deps.checkHeadroom(identity, first)
      : true;
    if (headroom !== true) return receipt('insufficient-headroom');

    const markerDeps = {
      verifyIdentity: () => {
        guard();
        return true;
      },
      stateRoot: deps.stateRoot,
      signal: deps.signal,
      now: deps.now,
      artifacts: desired,
      startChild: deps.startChild,
    };
    const withForwards = async (stage, action) => {
      const forwards = await (deps.openMarkerForwards ?? openE2UpgradeMarkerForwards)(
        identity,
        custody,
        {
          ...markerDeps,
          authorized: true,
          stage,
          predecessor: { artifactId: 'dev-e1-developer', historyId: originalId },
        },
      );
      let result;
      let failure = null;
      try {
        result = await action(forwards.ports);
      } catch (error) {
        failure = error;
      }
      const closed = await forwards.close();
      if (!closed?.ok) throw new StepFailure('forward-close-failed');
      if (failure) throw failure;
      return result;
    };

    // Pre-intent positive markers (the only POST); refuses before any mutation.
    guard();
    const marker = await withForwards('pre-intent', (ports) =>
      (deps.runMarkerProbe ?? runMarkerProbe)({
        custody,
        stage: 'pre-intent',
        ports,
        startChild: deps.startChild,
        now: deps.now,
        signal: deps.signal,
      }),
    ).catch(() => null);
    if (!marker?.ok || marker.receipt == null) {
      return receipt('marker-failed');
    }
    const identityBytes = marker.receipt.markerIds;
    guard();
    began = true;
    custody.begin({
      operation: 'upgrade-e2',
      phase: 'prometheus-intent',
      tuple: identity.tuple,
      details: {
        predecessorId: 'dev-e1-developer',
        predecessorHistoryId: originalId,
        targetId: 'dev-e2',
        predecessorManifestSetSha256: manifestSetSha256(predecessor),
        targetManifestSetSha256: manifestSetSha256(desired),
        kubeletTrustBindingSha256: binding,
        originalCollectorRevision: ORIGINAL_COLLECTOR_REVISION[originalId],
        originalPrometheusRevision: 1,
        originalGrafanaRevision: 1,
        targetPrometheusRevision: 2,
        targetGrafanaRevision: 2,
        preservedUids: before.preservedUids,
        markerIds: markerIdsFromIdentity(identityBytes),
      },
    });
    phase = 'prometheus-intent';
    const namespaceUid = identity.tuple.targetNamespaceUid;

    /**
     * Fresh owned verification with the live exclusive handle (H04).
     * @param {string} historyId @param {string | null} shapePhase @param {string} pendingPhase
     */
    const verify = async (historyId, shapePhase, pendingPhase) => {
      const record = custody.assertOwnPending();
      const snapshot = await collect();
      const verdict = (deps.verifyOwnedHistoryShape ?? verifyOwnedHistoryShape)(
        snapshot,
        artifactSet,
        {
          custody,
          historyId,
          operationId: record.operationId,
          phase: shapePhase,
          namespaceUid,
          expectedOperation: 'upgrade-e2',
          pendingPhase,
        },
      );
      if (!verdict?.ok) throw new StepFailure(verdict?.detail ?? 'shape-refused');
      return { verdict, snapshot };
    };
    const preserved = (snapshot) => {
      const check = compareE2Preservation(before, projectE2Preservation(snapshot));
      if (!check.ok) throw new StepFailure('preservation-failed');
    };
    const replay = async () => {
      const result = await withForwards('replay', (ports) =>
        (deps.runMarkerProbe ?? runMarkerProbe)({
          custody,
          stage: 'replay',
          ports,
          identity: identityBytes,
          startChild: deps.startChild,
          now: deps.now,
          signal: deps.signal,
        }),
      );
      if (!result?.ok) throw new StepFailure('marker-failed');
    };
    const helm = async (release, expectedPhase) => {
      guard();
      if (custody.assertOwnPending().phase !== expectedPhase) {
        throw new StepFailure('phase-mismatch');
      }
      mutation = 'possible';
      const result = await (deps.runMutation ?? runMutation)(
        'helm',
        helmE2UpgradeArgv(identity, release),
        {
          custody,
          timeoutMs: HELM_TIMEOUT_MS,
          signal: deps.signal,
          deadline: deps.deadline,
          now: deps.now,
        },
      );
      if (!result?.ok || result.timedOut || result.cancelled) {
        throw new StepFailure('phase-failed');
      }
      mutation = 'confirmed';
    };
    const advance = (next, verdict) => {
      guard();
      const record = custody.assertOwnPending();
      custody.advance({
        phase: next,
        tuple: record.tuple,
        details: record.details,
        verified: verdict,
      });
      phase = next;
    };

    // prometheus-intent
    await verify(originalId, null, 'prometheus-intent');
    lastProven = 'predecessor-verified';
    await helm(prometheus, 'prometheus-intent');
    const afterP = await verify(originalId, 'prometheus-intent', 'prometheus-intent');
    preserved(afterP.snapshot);
    await replay();
    lastProven = 'p2-g1-verified';
    advance('grafana-intent', afterP.verdict);

    // grafana-intent
    await verify(originalId, 'grafana-intent', 'grafana-intent');
    await helm(grafana, 'grafana-intent');
    const finalId = `e2-from-${originalId}`;
    const afterG = await verify(finalId, null, 'grafana-intent');
    preserved(afterG.snapshot);
    await replay();
    lastProven = 'p2-g2-verified';
    advance('final-verification', afterG.verdict);

    // final-verification
    const last = await verify(finalId, null, 'final-verification');
    preserved(last.snapshot);
    await replay();
    const forwards = await (deps.openForwards ?? openForwards)(
      identity,
      { fd: custody.fd, mode: custody.mode, pending: true },
      {
        bindings: [{ key: 'developerHttp' }],
        signal: deps.signal,
        now: deps.now,
        deadline: deps.forwardDeadline,
        artifacts: desired,
      },
    );
    let probeOk = false;
    try {
      probeOk = (
        await (deps.probeForwardTransport ?? probeForwardTransport)(forwards.ports, deps)
      )?.ok === true;
    } finally {
      const closed = await forwards.close();
      if (!closed?.ok) probeOk = false;
    }
    if (!probeOk) throw new StepFailure('transport-failed');
    lastProven = 'final-verified';
    guard();
    const fresh = await verify(finalId, null, 'final-verification');
    guard();
    custody.clear({ verified: fresh.verdict });
    began = false;
    const remaining = deps.readPending
      ? deps.readPending(profile.contextName)
      : readPending(profile.contextName, { stateRoot: deps.stateRoot });
    if (remaining?.pending) {
      return receipt('cleanup-failed', {
        state: 'unreadable',
        mutation: 'confirmed',
        pending: true,
        phase,
        lastProven,
      });
    }
    return receipt('ready', {
      ok: true,
      state: 'ready',
      mutation: 'confirmed',
      phase: 'final-verification',
      lastProven: 'cleared',
    });
  } catch (error) {
    const reasonCode =
      error instanceof StepFailure ? error.reasonCode : 'phase-failed';
    return receipt(reasonCode, {
      state: 'not-ready',
      mutation,
      pending: began,
      phase,
      lastProven,
    });
  } finally {
    try {
      custody.close?.();
    } catch {
      // an unsettled child keeps the lock; pending (if any) stays retained
    }
    try {
      identity.cleanup?.();
    } catch {
      // cleanup failure never clears pending
    }
  }
}
