import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import { readPlatformProfile } from '../common/profile.mjs';
import { runPlatformCommand } from '../common/commands.mjs';
import { loadArtifacts } from './artifacts.mjs';
import { acquireCustody, readPending, runMutation } from './custody.mjs';
import {
  captureIdentity,
  INVENTORY_BUDGET_MS,
  recheckIdentity,
} from './identity.mjs';
import { collectInventory, GRAFANA_ADMIN_SECRET } from './inventory.mjs';
import {
  classifyInventory,
  observeObservability,
  verifyWorkloadImageIdentity,
} from './readiness.mjs';
import {
  OBSERVABILITY_MUTATION_PHASES,
  isValidPhasePrefix,
} from './receipt.mjs';

export const WORKER_BUDGET_MS = 1_500_000;
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
});

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
 * }} fields
 */
export function buildWorkerReceipt(fields) {
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
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 * @param {string[]} completedPhases
 * @param {ReturnType<typeof readPlatformProfile>} profile
 */
export function verifyCompletedPhasePrefix(
  snapshot,
  artifacts,
  completedPhases,
  profile,
) {
  if (!isValidPhasePrefix(completedPhases)) {
    return { ok: false, detail: 'invalid-phase-prefix' };
  }
  const expected = artifacts.expectedInventory;
  if (!expected?.direct) {
    return { ok: false, detail: 'missing-expected-inventory' };
  }

  const completedReleasePhases = completedPhases.filter((phase) =>
    phase.startsWith('obs-'),
  );

  if (completedPhases.includes('namespace')) {
    if (snapshot.namespace?.absent) {
      return { ok: false, detail: 'namespace-absent' };
    }
    const labels = snapshot.namespace?.object?.metadata?.labels ?? {};
    if (labels[profile.ownerLabel] !== profile.ownerValue) {
      return { ok: false, detail: 'namespace-owner-label' };
    }
  } else if (Object.keys(snapshot.objects ?? {}).length > 0) {
    return { ok: false, detail: 'unexpected-objects-before-namespace' };
  }

  if (completedPhases.includes('secret')) {
    const secret = snapshot.objects?.[`Secret/${GRAFANA_ADMIN_SECRET}`];
    if (!secret) {
      return { ok: false, detail: 'missing-grafana-secret' };
    }
    const keys = secret.dataKeys ?? [];
    if (!keys.includes('admin-user') || !keys.includes('admin-password')) {
      return { ok: false, detail: 'grafana-secret-keys' };
    }
  } else {
    if (snapshot.objects?.[`Secret/${GRAFANA_ADMIN_SECRET}`]) {
      return { ok: false, detail: 'unexpected-grafana-secret' };
    }
  }

  const allowedReleaseNames = new Set(completedReleasePhases);
  for (const row of expected.direct) {
    const releaseName = row[4];
    if (!allowedReleaseNames.has(releaseName)) {
      const key = `${row[1]}/${row[3]}`;
      if (key === `Secret/${GRAFANA_ADMIN_SECRET}`) {
        continue;
      }
      if (snapshot.objects?.[key]) {
        return { ok: false, detail: `unexpected-${row[3]}` };
      }
    }
  }

  for (const row of expected.direct) {
    const releaseName = row[4];
    if (!allowedReleaseNames.has(releaseName)) {
      continue;
    }
    const key = `${row[1]}/${row[3]}`;
    if (!snapshot.objects?.[key]) {
      return { ok: false, detail: `missing-${row[3]}` };
    }
  }

  for (const row of expected.generatedClaims ?? []) {
    const releaseName = row[4];
    if (!allowedReleaseNames.has(releaseName)) {
      const key = `${row[1]}/${row[3]}`;
      if (snapshot.objects?.[key]) {
        return { ok: false, detail: `unexpected-claim-${row[3]}` };
      }
      continue;
    }
    const key = `${row[1]}/${row[3]}`;
    if (!snapshot.objects?.[key]) {
      return { ok: false, detail: `missing-claim-${row[3]}` };
    }
  }

  for (const release of artifacts.releases) {
    const secretName = `sh.helm.release.v1.${release.name}.v1`;
    const key = `Secret/${secretName}`;
    if (allowedReleaseNames.has(release.name)) {
      if (!snapshot.objects?.[key]) {
        return { ok: false, detail: `missing-helm-${release.name}` };
      }
      const role = release.role;
      const kind =
        role === 'loki' || role === 'tempo' ? 'StatefulSet' : 'Deployment';
      const workloadName = `obs-${role === 'collector' ? 'collector' : role}`;
      const workload = snapshot.objects?.[`${kind}/${workloadName}`];
      if (!workload) {
        return { ok: false, detail: `missing-workload-${workloadName}` };
      }
      const imageCheck = verifyWorkloadImageIdentity(
        workload,
        release.expectedImage,
      );
      if (!imageCheck.ok) {
        return { ok: false, detail: `${workloadName}-${imageCheck.reason}` };
      }
    } else if (snapshot.objects?.[key]) {
      return { ok: false, detail: `unexpected-helm-${release.name}` };
    }
  }

  return { ok: true };
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
    '-f',
    release.valuesPath,
    ...release.helmValueArgs,
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
  const artifacts = loadArtifacts(profileId, {
    run: deps.run,
    verifyArchive: deps.verifyArchive !== false,
  });
  const observation = observeObservability(profileId, {
    run: deps.run,
    verifyArchive: false,
    artifacts,
    readPending: deps.readPending,
    stateRoot: deps.stateRoot,
    now: deps.now,
    deadline: deps.deadline,
  });
  return {
    ...structuralObservationReceipt(profileId, contextName, observation),
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
  /** @type {string | null} */
  let adminPassword = null;
  const now = deps.now ?? (() => performance.now());
  const started = now();
  const workerDeadline = started + WORKER_BUDGET_MS;
  const run = deps.run ?? runPlatformCommand;

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
    });
  }

  let artifacts;
  try {
    artifacts = loadArtifacts(profileId, {
      run,
      verifyArchive: deps.verifyArchive !== false,
    });
  } catch {
    return fail('refused', 'artifact-invalid', 'none', false);
  }

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

    const collect =
      deps.collectInventorySnapshot ??
      ((currentIdentity) =>
        collectInventory(currentIdentity, artifacts, {
          run,
          now,
          deadline: now() + FINAL_OBSERVATION_RESERVE_MS,
          readPending: deps.readPending,
          stateRoot: deps.stateRoot,
        }));

    const snapshot = collect(identity);

    const admission = classifyInventory({ ...snapshot, profileId }, artifacts);

    if (
      snapshot.pending === true &&
      (snapshot.pendingValid === false ||
        deps.foreignPendingAtAdmission === true)
    ) {
      return fail('not-ready', 'pending', 'none', true);
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

    const runWrite = async (phaseId, command, args) => {
      assertPhaseBudget(remainingMs(), phaseId);

      const recheck = (deps.recheckIdentity ?? recheckIdentity)(identity, {
        run,
        now,
        deadline: workerDeadline,
        expectedNamespaceUid: identity.tuple.targetNamespaceUid,
      });
      if (!recheck.ok) {
        throw new Error('identity-changed');
      }

      const prefixCheck = verifyCompletedPhasePrefix(
        collect(identity),
        artifacts,
        completedPhases,
        profile,
      );
      if (!prefixCheck.ok) {
        throw new Error(`phase-prefix-${prefixCheck.detail ?? 'failed'}`);
      }

      if (!pendingBegun) {
        custody.begin({ phase: phaseId, tuple: identity.tuple });
        pendingBegun = true;
      } else {
        custody.advance({ phase: phaseId, tuple: identity.tuple });
      }

      const timeoutMs = PHASE_TIMEOUT_MS[phaseId];
      const result = await (deps.runMutation ?? runMutation)(command, args, {
        custody,
        now,
        deadline: workerDeadline,
        timeoutMs,
        signal: deps.signal,
      });
      mutationAttempted = true;
      if (!result.ok || result.timedOut) {
        throw new Error('phase-failed');
      }

      completedPhases = [...completedPhases, phaseId];
      const after = collect(identity);
      const verify = verifyCompletedPhasePrefix(
        after,
        artifacts,
        completedPhases,
        profile,
      );
      if (!verify.ok) {
        throw new Error(`phase-verify-${verify.detail ?? 'failed'}`);
      }
      if (phaseId === 'namespace') {
        const uid = after.namespace?.uid;
        if (identity.tuple.targetNamespaceUid !== null ||
            typeof uid !== 'string' || uid.length === 0 ||
            after.namespace?.object?.metadata?.name !== identity.namespace) {
          throw new Error('identity-changed');
        }
        const bound = { ...identity, tuple: { ...identity.tuple, targetNamespaceUid: uid } };
        const check = (deps.recheckIdentity ?? recheckIdentity)(bound, {
          run, now, deadline: workerDeadline, expectedNamespaceUid: uid,
        });
        if (!check.ok) throw new Error('identity-changed');
        identity = bound;
        custody.advance({ phase: phaseId, tuple: identity.tuple });
      } else if (after.namespace?.uid !== identity.tuple.targetNamespaceUid) {
        throw new Error('identity-changed');
      }
      return after;
    };

    const phaseFailureReason = (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('identity-changed')) {
        return 'identity-changed';
      }
      if (message.includes('deadline')) {
        return 'deadline';
      }
      return 'phase-failed';
    };

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
            '-f',
            manifestPath,
          ]);
        },
      );
    } catch (error) {
      return fail(
        'not-ready',
        phaseFailureReason(error),
        mutationAttempted ? 'confirmed' : 'none',
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
      return fail('not-ready', phaseFailureReason(error), 'confirmed', true);
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
        return fail('partial', phaseFailureReason(error), 'confirmed', true);
      }
    }

    assertPhaseBudget(remainingMs(), 'obs-grafana');

    const finalObservation = deps.finalObservation
      ? deps.finalObservation()
      : observeObservability(profileId, {
          run,
          identity,
          artifacts,
          now,
          deadline: now() + FINAL_OBSERVATION_RESERVE_MS,
          readPending:
            deps.readPending ??
            ((ctx) => readPending(ctx, { stateRoot: deps.stateRoot })),
          verifyArchive: false,
        });

    const structuralClass =
      finalObservation.snapshot != null
        ? classifyInventory(
            { ...finalObservation.snapshot, pending: false, profileId },
            artifacts,
          )
        : finalObservation;

    const shapeReady = structuralClass.state === 'ready';
    const ownPendingFinalize =
      shapeReady &&
      finalObservation.pending === true &&
      deps.foreignPendingAtFinalize !== true;

    if (
      !shapeReady ||
      (!ownPendingFinalize && finalObservation.pending === true)
    ) {
      return fail(
        finalObservation.state ?? 'not-ready',
        finalObservation.reasonCode ?? 'not-ready',
        'confirmed',
        true,
      );
    }

    if (deps.foreignPendingAtFinalize === true) {
      return fail('not-ready', 'pending', 'confirmed', true);
    }

    if (completedPhases.length !== OBSERVABILITY_MUTATION_PHASES.length) {
      return fail('partial', 'phase-failed', 'confirmed', true);
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
    });
  } finally {
    adminPassword = null;
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
