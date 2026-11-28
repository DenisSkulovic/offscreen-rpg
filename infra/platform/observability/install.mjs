import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import { readPlatformProfile } from '../common/profile.mjs';
import {
  helmValuesArgv,
  loadArtifacts,
  loadOperationalArtifactSet,
} from './artifacts.mjs';
import { acquireCustody, readPending, runMutation } from './custody.mjs';
import {
  captureIdentity,
  INVENTORY_BUDGET_MS,
  OBSERVABILITY_ENSURE_WORKER_MS,
  recheckIdentity,
  runObservabilityReadCommand,
} from './identity.mjs';
import {
  collectInventory,
  findAbsentNamespaceRbacCollisions,
  GRAFANA_ADMIN_SECRET,
} from './inventory.mjs';
import { readDevKubeletTrust } from './kubelet-trust.mjs';
import {
  classifyOperationalInventory,
  observeObservability,
  observeOperationalObservability,
  verifyOwnedEnsurePrefix,
  verifyOwnedFinalShape,
  verifyOwnedHistoryShape,
} from './readiness.mjs';
import { OBSERVABILITY_MUTATION_PHASES } from './receipt.mjs';

export const WORKER_BUDGET_MS = OBSERVABILITY_ENSURE_WORKER_MS;
export const FINAL_OBSERVATION_RESERVE_MS = INVENTORY_BUDGET_MS;
export const HELM_WAIT_TIMEOUT = '180s';

/** @typedef {'dev' | 'release'} ObservabilityProfileId */
/** @typedef {'none' | 'confirmed' | 'possible'} MutationState */

/** @type {Record<string, number>} */
export const PHASE_TIMEOUT_MS = Object.freeze({
  namespace: 30_000,
  secret: 30_000,
  'obs-prometheus': 210_000,
  'obs-loki': 210_000,
  'obs-tempo': 210_000,
  'obs-collector': 210_000,
  'obs-grafana': 210_000,
  upgrade: 240_000,
  disruption: 30_000,
});

const OPERATIONAL_GROUP_KEYS = Object.freeze([
  'artifactId',
  'historyId',
  'structuralReady',
  'desiredConverged',
]);

/** Unverified or unmatched outcome: null IDs and false readiness. */
const NO_MATCH = Object.freeze({
  artifactId: null,
  historyId: null,
  structuralReady: false,
  desiredConverged: false,
});

/**
 * The H05 additive field group from an operational classification. Only an
 * exactly matched final row carries IDs; everything else is null/false.
 * @param {{ artifactId?: string | null, historyId?: string | null, structuralReady?: boolean, desiredConverged?: boolean } | null | undefined} classified
 */
export function operationalGroup(classified) {
  if (classified?.artifactId == null || classified?.historyId == null) {
    return NO_MATCH;
  }
  return {
    artifactId: classified.artifactId,
    historyId: classified.historyId,
    structuralReady: classified.structuralReady === true,
    desiredConverged:
      classified.structuralReady === true &&
      classified.desiredConverged === true,
  };
}

/**
 * @param {{
 *   ok: boolean,
 *   state: string,
 *   reasonCode: string,
 *   mutation: MutationState,
 *   completedPhases: string[],
 *   pending?: boolean,
 *   profile?: ObservabilityProfileId,
 *   operation?: string,
 *   artifactId?: string | null,
 *   historyId?: string | null,
 *   structuralReady?: boolean,
 *   desiredConverged?: boolean,
 * }} fields
 */
export function buildWorkerReceipt(fields) {
  const operational = OPERATIONAL_GROUP_KEYS.some(
    (key) => fields[key] !== undefined,
  );
  return {
    schema: 1,
    ok: fields.ok,
    profile: fields.profile,
    operation: fields.operation,
    state: fields.state,
    reasonCode: fields.reasonCode,
    mutation: fields.mutation,
    completedPhases: fields.completedPhases,
    pending: fields.pending === true,
    ...(operational
      ? {
          artifactId: fields.artifactId ?? null,
          historyId: fields.historyId ?? null,
          structuralReady: fields.structuralReady === true,
          desiredConverged: fields.desiredConverged === true,
        }
      : {}),
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {string} contextName
 */
function assertInstallContext(profileId, contextName) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const profile = readPlatformProfile(profileId);
  if (contextName !== profile.contextName) {
    throw new Error(
      `refused: observability context must be exactly ${profile.contextName}`,
    );
  }
  return profile;
}

/**
 * @param {number} remainingMs
 * @param {string} phaseId
 */
export function assertPhaseBudget(remainingMs, phaseId) {
  const phaseMs = PHASE_TIMEOUT_MS[phaseId];
  if (phaseMs == null) {
    throw new Error(`unknown phase: ${phaseId}`);
  }
  if (remainingMs < phaseMs + FINAL_OBSERVATION_RESERVE_MS) {
    throw new Error('refused: insufficient worker budget for phase');
  }
}

/**
 * @param {string} manifestText
 * @param {(manifestPath: string) => Promise<void>} runner
 */
async function withPrivateManifest(manifestText, runner) {
  const directory = mkdtempSync(join(tmpdir(), 'observability-install-'));
  const manifestPath = join(directory, 'manifest.json');
  writeFileSync(manifestPath, manifestText, { mode: 0o600 });
  try {
    await runner(manifestPath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} desired
 * @param {string[]} completedPhases
 * @param {{
 *   identity: ReturnType<typeof captureIdentity>,
 *   custody: { assertOwnPending: () => object },
 *   profile?: ReturnType<typeof readPlatformProfile>,
 * }} params
 */
export function verifyCompletedPhasePrefix(
  snapshot,
  desired,
  completedPhases,
  params,
) {
  const ownedSnapshot = {
    ...snapshot,
    pending: true,
    pendingValid: snapshot.pendingValid !== false,
  };
  return verifyOwnedEnsurePrefix(ownedSnapshot, desired, {
    identity: params.identity,
    custody: params.custody,
    completedPhases,
  });
}

/**
 * @param {ReturnType<typeof captureIdentity>} identity
 * @param {ReturnType<typeof loadArtifacts>['releases'][number]} release
 */
export function helmInstallArgv(identity, release) {
  return [
    'install',
    release.name,
    release.chartPath,
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    '--namespace',
    identity.namespace,
    ...helmValuesArgv(release),
    '--wait',
    '--timeout',
    HELM_WAIT_TIMEOUT,
  ];
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {string} contextName
 * @param {object} observation
 */
function structuralObservationReceipt(profileId, contextName, observation) {
  return buildWorkerReceipt({
    ok: observation.state !== 'unreadable',
    profile: profileId,
    operation: 'status',
    state: observation.state ?? 'unreadable',
    reasonCode: observation.reasonCode ?? 'unreadable',
    mutation: 'none',
    completedPhases: [],
    pending: observation.pending === true,
    // Operational observations always carry the group (null/false when
    // unmatched); a legacy-shaped observation keeps the legacy receipt.
    ...(observation.artifactId !== undefined
      ? operationalGroup(observation)
      : {}),
  });
}

/**
 * @param {string[]} argv
 * @param {{ ok?: boolean, state?: string, reasonCode?: string }} result
 */
function exitCodeForResult(argv, result) {
  const [command] = argv;
  if (command !== 'plan' && command !== 'ensure' && command !== 'status') {
    return 2;
  }
  if (result.ok) {
    return 0;
  }
  if (
    result.reasonCode === 'invalid-invocation' ||
    result.reasonCode === 'ensure-not-authorized' ||
    result.reasonCode === 'context-mismatch'
  ) {
    return 2;
  }
  return 1;
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {string} contextName
 * @param {object} [deps]
 */
export async function runObservabilityPlan(profileId, contextName, deps = {}) {
  try {
    assertInstallContext(profileId, contextName);
  } catch {
    return buildWorkerReceipt({
      ok: false,
      profile: profileId,
      operation: 'plan',
      state: 'refused',
      reasonCode: 'context-mismatch',
      mutation: 'none',
      completedPhases: [],
      pending: false,
    });
  }
  // Normal observation uses the operational selector (09); historical
  // explicit-descriptor routes stay strict E1 in observeObservability.
  const observation = (
    deps.observeOperational ?? observeOperationalObservability
  )(profileId, {
    run: deps.run,
    artifactSet: deps.artifactSet,
    readKubeletTrust: deps.readKubeletTrust,
    trustRun: deps.trustRun,
    readPending: deps.readPending,
    stateRoot: deps.stateRoot,
    now: deps.now,
    deadline: deps.deadline,
    verifyArchive: deps.verifyArchive,
  });
  const classified = observation;
  return {
    ...structuralObservationReceipt(profileId, contextName, classified),
    operation: 'plan',
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {string} contextName
 * @param {object} [deps]
 */
export async function runObservabilityStatus(
  profileId,
  contextName,
  deps = {},
) {
  const receipt = await runObservabilityPlan(profileId, contextName, deps);
  return { ...receipt, operation: 'status' };
}

/**
 * @param {ReturnType<typeof captureIdentity>} identity
 * @param {ReturnType<typeof readPlatformProfile>} profile
 * @param {string} password
 */
function namespaceManifest(profile, namespace) {
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespace,
      labels: {
        [profile.ownerLabel]: profile.ownerValue,
      },
    },
  };
}

/**
 * @param {string} namespace
 * @param {string} password
 */
function grafanaSecretManifest(namespace, password) {
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: GRAFANA_ADMIN_SECRET,
      namespace,
    },
    type: 'Opaque',
    stringData: {
      'admin-user': 'admin',
      'admin-password': password,
    },
  };
}

/**
 * @param {{
 *   ok?: boolean,
 *   timedOut?: boolean,
 *   cancelled?: boolean,
 *   stdout?: string,
 * }} result
 * @param {ReturnType<typeof captureIdentity>} identity
 * @param {ReturnType<typeof readPlatformProfile>} profile
 */
export function parseNamespaceCreateResponse(result, identity, profile) {
  if (!result.ok || result.timedOut === true || result.cancelled === true) {
    throw new Error('phase-failed');
  }
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    throw new Error('namespace-response-invalid');
  }
  /** @type {unknown} */
  let object;
  try {
    object = JSON.parse(trimmed);
  } catch {
    throw new Error('namespace-response-invalid');
  }
  if (typeof object !== 'object' || object == null) {
    throw new Error('namespace-response-invalid');
  }
  const body =
    /** @type {{ kind?: string, metadata?: Record<string, unknown> }} */ (
      object
    );
  if (body.kind !== 'Namespace') {
    throw new Error('namespace-response-invalid');
  }
  const metadata = body.metadata ?? {};
  if (metadata.name !== identity.namespace) {
    throw new Error('namespace-response-invalid');
  }
  const uid = metadata.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('namespace-response-invalid');
  }
  if (metadata.deletionTimestamp != null) {
    throw new Error('namespace-response-invalid');
  }
  const labels =
    metadata.labels && typeof metadata.labels === 'object'
      ? /** @type {Record<string, string>} */ (metadata.labels)
      : {};
  if (labels[profile.ownerLabel] !== profile.ownerValue) {
    throw new Error('namespace-response-invalid');
  }
  return uid;
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {string} contextName
 * @param {object} [deps]
 */
export async function runObservabilityEnsure(
  profileId,
  contextName,
  deps = {},
) {
  /** @type {ReturnType<typeof captureIdentity> | null} */
  let identity = null;
  /** @type {Awaited<ReturnType<typeof acquireCustody>> | null} */
  let custody = null;
  /** @type {string[]} */
  let completedPhases = [];
  let mutationAttempted = false;
  let pendingBegun = false;
  /** @type {string | null | undefined} */
  let adminPassword;
  const now = deps.now ?? (() => performance.now());
  const started = now();
  const workerDeadline = started + WORKER_BUDGET_MS;
  const run = deps.run ?? runObservabilityReadCommand;

  /** Verified identity of the admission observation; null/false otherwise. */
  let reportGroup = NO_MATCH;

  const fail = (state, reasonCode, mutation, pending = mutationAttempted) =>
    buildWorkerReceipt({
      ok: false,
      profile: profileId,
      operation: 'ensure',
      state,
      reasonCode,
      mutation,
      completedPhases: completedPhases.slice(),
      pending,
      ...(mutation === 'none' ? reportGroup : NO_MATCH),
    });

  const remainingMs = () => Math.max(0, Math.floor(workerDeadline - now()));

  /** @type {ReturnType<typeof assertInstallContext> | null} */
  let profile = null;
  try {
    profile = assertInstallContext(profileId, contextName);
  } catch {
    return buildWorkerReceipt({
      ok: false,
      profile: profileId,
      operation: 'ensure',
      state: 'refused',
      reasonCode: 'context-mismatch',
      mutation: 'none',
      completedPhases: [],
      pending: false,
      ...NO_MATCH,
    });
  }

  if (process.env.OFFSCREEN_OBSERVABILITY_ENSURE !== 'authorized') {
    return buildWorkerReceipt({
      ok: false,
      profile: profileId,
      operation: 'ensure',
      state: 'refused',
      reasonCode: 'ensure-not-authorized',
      mutation: 'none',
      completedPhases: [],
      pending: false,
      ...NO_MATCH,
    });
  }

  /** @type {ReturnType<typeof loadOperationalArtifactSet> | null} */
  let artifactSet = null;
  /** @type {ReturnType<typeof loadArtifacts> | null} */
  let artifacts = null;

  try {
    identity = await (deps.captureIdentity ?? captureIdentity)(
      profileId,
      contextName,
      { run, now, deadline: workerDeadline },
    );

    try {
      custody = await (deps.acquireCustody ?? acquireCustody)(contextName, {
        stateRoot: deps.stateRoot,
        now,
        deadline: workerDeadline,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('pending')) {
        return fail('not-ready', 'pending', 'none', true);
      }
      if (message.includes('lock')) {
        return fail('refused', 'lock-unavailable', 'none', false);
      }
      return fail('refused', 'refused', 'none', false);
    }

    // One validated G2 binding, read once under the exclusive custody. The
    // exact desired descriptor (never an E1 fallback) is bound from it.
    const readBinding = (currentIdentity) =>
      deps.readKubeletTrust
        ? deps.readKubeletTrust(currentIdentity)
        : readDevKubeletTrust(
            currentIdentity,
            deps.trustRun ? { run: deps.trustRun } : {},
          );
    try {
      artifactSet =
        deps.artifactSet ??
        loadOperationalArtifactSet(profileId, {
          verifyArchive: deps.verifyArchive !== false,
          ...(profileId === 'dev'
            ? { readKubeletTrust: () => readBinding(identity) }
            : {}),
        });
    } catch {
      return fail('refused', 'artifact-invalid', 'none', false);
    }
    artifacts = artifactSet.desired;
    const inventoryArtifacts =
      artifacts ?? [...(artifactSet.admissible ?? [])].reverse()[0] ?? null;
    if (inventoryArtifacts == null) {
      return fail('refused', 'artifact-invalid', 'none', false);
    }
    const boundBindingSha256 = artifacts?.kubeletTrustBindingSha256 ?? null;

    /** Recheck the live G2 binding digest equals the bound descriptor's. */
    const assertBinding = () => {
      if (boundBindingSha256 == null) {
        return;
      }
      let current;
      try {
        current = readBinding(identity);
      } catch {
        throw new Error('binding-changed');
      }
      if (current?.bindingSha256 !== boundBindingSha256) {
        throw new Error('binding-changed');
      }
    };

    const rawCollect =
      deps.collectInventorySnapshot ??
      ((currentIdentity) =>
        collectInventory(currentIdentity, inventoryArtifacts, {
          run,
          now,
          deadline: now() + FINAL_OBSERVATION_RESERVE_MS,
          readPending: deps.readPending,
          stateRoot: deps.stateRoot,
          staticInventory: artifactSet.staticInventory ?? undefined,
        }));
    const collect = (currentIdentity) => ({
      ...rawCollect(currentIdentity),
      profileId,
    });

    const snapshot = collect(identity);

    if (
      snapshot.pending === true &&
      (snapshot.pendingValid === false ||
        deps.foreignPendingAtAdmission === true)
    ) {
      return fail('not-ready', 'pending', 'none', true);
    }

    // Union admission over every admissible bundle plus the desired one.
    const admission = classifyOperationalInventory(snapshot, artifactSet);

    if (admission.reasonCode === 'upgrade-required') {
      reportGroup = operationalGroup(admission);
      return fail('not-ready', 'upgrade-required', 'none', false);
    }

    if (admission.state === 'ready' && admission.pending !== true) {
      return buildWorkerReceipt({
        ok: true,
        profile: profileId,
        operation: 'ensure',
        state: 'ready',
        reasonCode: 'ready',
        mutation: 'none',
        completedPhases: [],
        pending: false,
        ...operationalGroup(admission),
      });
    }

    if (admission.state !== 'absent') {
      return fail(
        admission.state ?? 'not-ready',
        admission.reasonCode ?? 'not-ready',
        'none',
        admission.pending === true,
      );
    }

    if (artifacts == null) {
      return fail(
        'refused',
        artifactSet.desiredUnavailableReason ?? 'artifact-invalid',
        'none',
        false,
      );
    }

    const runWrite = async (phaseId, command, args) => {
      assertPhaseBudget(remainingMs(), phaseId);
      assertBinding();

      const recheck = (deps.recheckIdentity ?? recheckIdentity)(identity, {
        run,
        now,
        deadline: workerDeadline,
        expectedNamespaceUid: identity.tuple.targetNamespaceUid,
      });
      if (!recheck.ok) {
        throw new Error('identity-changed');
      }

      const pendingNow =
        deps.readPending?.(contextName) ??
        readPending(contextName, { stateRoot: deps.stateRoot });
      if (pendingNow.pending) {
        if (!pendingBegun) {
          throw new Error('foreign-pending');
        }
        try {
          custody.assertOwnPending();
        } catch {
          throw new Error('foreign-pending');
        }
      }

      if (
        phaseId !== 'namespace' &&
        identity.tuple.targetNamespaceUid == null
      ) {
        throw new Error('identity-changed');
      }

      if (custody.cancelled || custody.mode !== 'exclusive') {
        throw new Error('phase-failed');
      }
      if (phaseId === 'namespace') {
        // Named cluster RBAC must not exist while the namespace is absent.
        const preCreate = collect(identity);
        if (
          preCreate.namespace?.absent !== true ||
          findAbsentNamespaceRbacCollisions(preCreate).length > 0
        ) {
          throw new Error('rbac-collision');
        }
      }
      if (!pendingBegun) {
        custody.begin({
          phase: phaseId,
          tuple: identity.tuple,
          operation: 'ensure',
          details: {},
        });
        pendingBegun = true;
      } else {
        custody.advance({
          phase: phaseId,
          tuple: identity.tuple,
          details: {},
        });
      }
      custody.assertOwnPending();

      const prefixCheck = verifyCompletedPhasePrefix(
        collect(identity),
        artifacts,
        completedPhases,
        { identity, custody, profile },
      );
      if (!prefixCheck.ok) {
        throw new Error(`phase-prefix-${prefixCheck.detail ?? 'failed'}`);
      }

      const timeoutMs = PHASE_TIMEOUT_MS[phaseId];
      const phaseStart = now();
      if (workerDeadline - phaseStart < timeoutMs) {
        throw new Error('deadline');
      }
      mutationAttempted = true;
      const result = await (deps.runMutation ?? runMutation)(command, args, {
        custody,
        now,
        deadline: workerDeadline,
        timeoutMs,
        signal: deps.signal,
      });
      if (result.closeUnconfirmed) {
        throw new Error('close-unconfirmed');
      }

      if (phaseId === 'namespace') {
        const createdUid = parseNamespaceCreateResponse(
          result,
          identity,
          profile,
        );
        const bound = {
          ...identity,
          tuple: Object.freeze({
            ...identity.tuple,
            targetNamespaceUid: createdUid,
          }),
        };
        try {
          custody.advance({ phase: phaseId, tuple: bound.tuple });
        } catch {
          throw new Error('custody-advance-failed');
        }

        const check = (deps.recheckIdentity ?? recheckIdentity)(bound, {
          run,
          now,
          deadline: workerDeadline,
          expectedNamespaceUid: createdUid,
        });
        if (!check.ok) {
          throw new Error('identity-changed');
        }

        completedPhases = [...completedPhases, phaseId];
        const after = collect(bound);
        const verify = verifyCompletedPhasePrefix(
          after,
          artifacts,
          completedPhases,
          { identity: bound, custody, profile },
        );
        if (!verify.ok) {
          throw new Error(`phase-verify-${verify.detail ?? 'failed'}`);
        }
        const collectedUid = after.namespace?.uid;
        if (
          collectedUid !== createdUid ||
          after.namespace?.object?.metadata?.name !== identity.namespace
        ) {
          throw new Error('identity-changed');
        }
        identity = bound;
        return after;
      }

      if (!result.ok || result.timedOut) {
        throw new Error('phase-failed');
      }

      completedPhases = [...completedPhases, phaseId];
      const after = collect(identity);
      const verify = verifyCompletedPhasePrefix(
        after,
        artifacts,
        completedPhases,
        { identity, custody, profile },
      );
      if (!verify.ok) {
        throw new Error(`phase-verify-${verify.detail ?? 'failed'}`);
      }
      if (after.namespace?.uid !== identity.tuple.targetNamespaceUid) {
        throw new Error('identity-changed');
      }
      return after;
    };

    const phaseFailureReason = (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('foreign-pending')) {
        return 'pending';
      }
      if (message.includes('rbac-collision')) {
        return 'not-ready';
      }
      if (
        message.includes('identity-changed') ||
        message.includes('binding-changed')
      ) {
        return 'identity-changed';
      }
      if (
        message.includes('custody-advance-failed') ||
        message.includes('close-unconfirmed')
      ) {
        return 'phase-failed';
      }
      if (message.includes('deadline')) {
        return 'deadline';
      }
      return 'phase-failed';
    };

    const mutationForPhaseFailure = () =>
      mutationAttempted ? /** @type {MutationState} */ ('possible') : 'none';

    try {
      await withPrivateManifest(
        `${JSON.stringify(namespaceManifest(profile, identity.namespace))}\n`,
        async (manifestPath) => {
          await runWrite('namespace', 'kubectl', [
            '--kubeconfig',
            identity.snapshotPath,
            '--context',
            identity.contextName,
            'create',
            '-o',
            'json',
            '-f',
            manifestPath,
          ]);
        },
      );
    } catch (error) {
      return fail(
        'not-ready',
        phaseFailureReason(error),
        mutationForPhaseFailure(error),
        mutationAttempted,
      );
    }

    try {
      adminPassword = randomBytes(24).toString('base64url');
      const password = adminPassword;
      await withPrivateManifest(
        `${JSON.stringify(grafanaSecretManifest(identity.namespace, password))}\n`,
        async (manifestPath) => {
          await runWrite('secret', 'kubectl', [
            '--kubeconfig',
            identity.snapshotPath,
            '--context',
            identity.contextName,
            'create',
            '-f',
            manifestPath,
          ]);
        },
      );
    } catch (error) {
      adminPassword = null;
      return fail(
        'not-ready',
        phaseFailureReason(error),
        mutationForPhaseFailure(),
        mutationAttempted,
      );
    } finally {
      adminPassword = null;
    }

    for (const release of artifacts.releases) {
      try {
        await runWrite(
          release.name,
          'helm',
          helmInstallArgv(identity, release),
        );
      } catch (error) {
        return fail(
          'partial',
          phaseFailureReason(error),
          mutationForPhaseFailure(),
          true,
        );
      }
    }

    assertPhaseBudget(remainingMs(), 'obs-grafana');

    if (completedPhases.length !== OBSERVABILITY_MUTATION_PHASES.length) {
      return fail('partial', 'phase-failed', 'confirmed', true);
    }

    if (deps.foreignPendingAtFinalize === true) {
      return fail('not-ready', 'pending', 'confirmed', true);
    }

    /** Recheck identity and binding right before an owned clear. */
    const recheckForClear = () => {
      assertBinding();
      const check = (deps.recheckIdentity ?? recheckIdentity)(identity, {
        run,
        now,
        deadline: workerDeadline,
        expectedNamespaceUid: identity.tuple.targetNamespaceUid,
      });
      if (!check.ok) {
        throw new Error('identity-changed');
      }
    };

    if (artifacts.artifactId === 'dev-e2') {
      // Fresh E2 finalization: the real pending snapshot is verified against
      // the exact owned e2-fresh row. No state-only or public-ready shortcut.
      try {
        assertBinding();
        const finalObservation = deps.finalObservation
          ? deps.finalObservation()
          : { snapshot: collect(identity) };
        const finalSnapshot = finalObservation?.snapshot;
        if (finalSnapshot == null) {
          return fail('not-ready', 'not-ready', 'confirmed', true);
        }
        const prefix = verifyCompletedPhasePrefix(
          finalSnapshot,
          artifacts,
          completedPhases,
          { identity, custody, profile },
        );
        if (!prefix.ok) {
          return fail('not-ready', 'not-ready', 'confirmed', true);
        }
        const owned = custody.assertOwnPending();
        const shape = verifyOwnedHistoryShape(finalSnapshot, artifactSet, {
          custody,
          historyId: 'e2-fresh',
          operationId: owned?.operationId,
          phase: null,
          namespaceUid: identity.tuple.targetNamespaceUid,
          expectedOperation: 'ensure',
          pendingPhase: 'obs-grafana',
        });
        if (!shape.ok) {
          return fail('not-ready', 'not-ready', 'confirmed', true);
        }
        recheckForClear();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return fail(
          'not-ready',
          message.includes('binding-changed') ||
            message.includes('identity-changed')
            ? 'identity-changed'
            : 'not-ready',
          'confirmed',
          true,
        );
      }
    } else {
      // Legacy release finalization is unchanged.
      const finalObservation = deps.finalObservation
        ? deps.finalObservation()
        : observeObservability(profileId, {
            run,
            identity,
            artifacts,
            predecessorArtifacts: null,
            now,
            deadline: now() + FINAL_OBSERVATION_RESERVE_MS,
            readPending:
              deps.readPending ??
              ((ctx) => readPending(ctx, { stateRoot: deps.stateRoot })),
          });
      let shapeReady = false;
      if (finalObservation.snapshot != null) {
        const ownedShape = verifyOwnedFinalShape(
          { ...finalObservation.snapshot, pending: true, pendingValid: true },
          artifacts,
          {
            identity,
            custody,
            predecessorArtifacts: null,
            expectedOperation: 'ensure',
            expectedRevision: 1,
          },
        );
        shapeReady = ownedShape.ok;
      } else {
        shapeReady = finalObservation.state === 'ready';
      }
      if (!shapeReady) {
        return fail(
          finalObservation.state ?? 'not-ready',
          finalObservation.reasonCode ?? 'not-ready',
          'confirmed',
          true,
        );
      }
    }

    try {
      custody.clear();
    } catch {
      return fail('unreadable', 'cleanup-failed', 'confirmed', true);
    }

    const pendingAfterClear =
      deps.readPending?.(contextName) ??
      readPending(contextName, { stateRoot: deps.stateRoot });
    if (pendingAfterClear.pending) {
      return fail('unreadable', 'cleanup-failed', 'confirmed', true);
    }

    return buildWorkerReceipt({
      ok: true,
      profile: profileId,
      operation: 'ensure',
      state: 'ready',
      reasonCode: 'ready',
      mutation: 'confirmed',
      completedPhases: OBSERVABILITY_MUTATION_PHASES.slice(),
      pending: false,
      ...(artifacts.artifactId === 'dev-e2'
        ? {
            artifactId: 'dev-e2',
            historyId: 'e2-fresh',
            structuralReady: true,
            desiredConverged: true,
          }
        : {
            artifactId: artifacts.artifactId,
            historyId: artifacts.artifactId,
            structuralReady: true,
            desiredConverged: true,
          }),
    });
  } finally {
    adminPassword = null;
    void adminPassword;
    if (identity?.cleanup) {
      identity.cleanup();
    }
    if (custody) {
      try {
        custody.close();
      } catch {
        // observed only if close fails on a live lock
      }
    }
  }
}

/**
 * @param {'plan' | 'status' | 'ensure'} operation
 * @param {ObservabilityProfileId} profileId
 * @param {string} contextName
 * @param {object} [deps]
 */
export async function runObservability(
  operation,
  profileId,
  contextName,
  deps = {},
) {
  if (operation === 'plan') {
    return runObservabilityPlan(profileId, contextName, deps);
  }
  if (operation === 'status') {
    return runObservabilityStatus(profileId, contextName, deps);
  }
  if (operation === 'ensure') {
    return runObservabilityEnsure(profileId, contextName, deps);
  }
  return buildWorkerReceipt({
    ok: false,
    profile: profileId,
    operation,
    state: 'refused',
    reasonCode: 'invalid-invocation',
    mutation: 'none',
    completedPhases: [],
    pending: false,
  });
}

/**
 * @param {string[]} argv
 * @param {object} [deps]
 */
export async function runObservabilityCli(argv, deps = {}) {
  const [operation, profileId, contextName, extra] = argv;
  if (
    extra !== undefined ||
    (operation !== 'plan' &&
      operation !== 'ensure' &&
      operation !== 'status') ||
    (profileId !== 'dev' && profileId !== 'release') ||
    typeof contextName !== 'string' ||
    contextName.length === 0
  ) {
    const invalid = buildWorkerReceipt({
      ok: false,
      profile: /** @type {ObservabilityProfileId} */ (profileId ?? 'dev'),
      operation: operation ?? 'invalid',
      state: 'refused',
      reasonCode: 'invalid-invocation',
      mutation: 'none',
      completedPhases: [],
      pending: false,
    });
    process.stdout.write(`${JSON.stringify(invalid)}\n`);
    return 2;
  }
  const result = await runObservability(
    /** @type {'plan' | 'status' | 'ensure'} */ (operation),
    /** @type {ObservabilityProfileId} */ (profileId),
    contextName,
    deps,
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return exitCodeForResult(argv, result);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runObservabilityCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      const fallback = buildWorkerReceipt({
        ok: false,
        profile: 'dev',
        operation: 'ensure',
        state: 'unreadable',
        reasonCode: 'unreadable',
        mutation: 'possible',
        completedPhases: [],
        pending: false,
      });
      process.stdout.write(`${JSON.stringify(fallback)}\n`);
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
