import { createHash } from 'node:crypto';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadArtifacts } from '../../../platform/observability/artifacts.mjs';
import { helmInstallArgv } from '../../../platform/observability/install.mjs';
import { recheckIdentity } from '../../../platform/observability/identity.mjs';
import { runPlatformCommand } from '../../../platform/common/commands.mjs';

import {
  refuseDisruptionInvocation,
  RESTORATION_RESERVE_MS,
} from './proof-host.mjs';
import { PLATFORM_OBSERVABILITY_NS } from './signals.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(MODULE_ROOT, '../../../..');

export const ISOLATED_AUTHORIZATION_ENV =
  'OFFSCREEN_OBSERVABILITY_ISOLATED_PROOF';
export const EXPECTED_CLUSTER_UID_ENV =
  'OFFSCREEN_OBSERVABILITY_EXPECTED_CLUSTER_UID';
export const PROOF_AUTHORIZATION_ENV = 'OFFSCREEN_OBSERVABILITY_PROOF';

export const A9_DENIAL_MARKER = 'OFFSCREEN_A9_ISOLATED_LOKI_DENIAL';
export const A9_POLICY_NAME = 'offscreen-a9-isolated-loki';
export const A9_BINDING_NAME = 'offscreen-a9-isolated-loki';

export const QUOTA_NAME = 'deny-loki-statefulset';
export const QUOTA_HARD_KEY = 'count/statefulsets.apps';
export const QUOTA_WAIT_MS = 20_000;

export const PARTIAL_INSTALL_PHASE_BUDGET_MS = Object.freeze({
  preflight: 45_000,
  firstEnsure: 1_800_000,
  repeatEnsure: 1_800_000,
});

export const READ_ONLY_HELM_COMMANDS = new Set([
  'template',
  'list',
  'get',
  'status',
  'history',
  'show',
  'version',
  'repo',
  'search',
]);

const LATER_PHASES = ['obs-tempo', 'obs-collector', 'obs-grafana'];

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function requireIsolatedProofAuthorization(env = process.env) {
  if (env[PROOF_AUTHORIZATION_ENV] !== 'authorized') {
    return { refused: true, reasonCode: 'proof-unauthorized' };
  }
  const disruption = refuseDisruptionInvocation({
    gate: 'partial-install',
    env,
  });
  if (disruption.refused) {
    return disruption;
  }
  if (env[ISOLATED_AUTHORIZATION_ENV] !== 'authorized') {
    return { refused: true, reasonCode: 'isolated-unauthorized' };
  }
  const expected = env[EXPECTED_CLUSTER_UID_ENV];
  if (typeof expected !== 'string' || expected.trim().length === 0) {
    return { refused: true, reasonCode: 'expected-cluster-uid-missing' };
  }
  return { refused: false, expectedClusterUid: expected.trim() };
}

/**
 * @param {string} profileId
 * @param {object} [deps]
 */
export function resolvePartialInstallPlans(profileId, deps = {}) {
  const artifacts = loadArtifacts(profileId, {
    run: deps.run ?? (() => ({ ok: true, stdout: '', stderr: '' })),
    verifyArchive: deps.verifyArchive === true,
  });
  const prometheus = artifacts.releases.find(
    (r) => r.name === 'obs-prometheus',
  );
  const loki = artifacts.releases.find((r) => r.name === 'obs-loki');
  if (!prometheus || !loki) {
    throw new Error('partial-install-artifacts-missing');
  }
  return { artifacts, prometheus, loki };
}

/**
 * @param {string} chartPath
 */
export function chartSha256Hex(chartPath) {
  return createHash('sha256').update(readFileSync(chartPath)).digest('hex');
}

/**
 * @param {string[]} left
 * @param {string[]} right
 */
export function argvExactlyEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * @param {string[]} helmArgv
 */
export function isReadOnlyHelmInvocation(helmArgv) {
  if (helmArgv.length === 0) {
    return false;
  }
  const sub = helmArgv[0];
  return READ_ONLY_HELM_COMMANDS.has(sub);
}

/**
 * @param {object} identity
 * @param {ReturnType<typeof resolvePartialInstallPlans>['prometheus']} release
 */
export function buildExpectedPrometheusInstallArgv(identity, release) {
  return helmInstallArgv(identity, release);
}

/**
 * @param {object} identity
 * @param {ReturnType<typeof resolvePartialInstallPlans>['loki']} release
 */
export function buildExpectedLokiInstallArgv(identity, release) {
  return helmInstallArgv(identity, release);
}

/**
 * @param {string[]} helmArgv
 * @param {object} identity
 * @param {ReturnType<typeof resolvePartialInstallPlans>['loki']} lokiRelease
 * @param {{ chartSha256?: string, verifyChartSha256?: (path: string) => string }} [options]
 */
export function isExactLokiInstallArgv(
  helmArgv,
  identity,
  lokiRelease,
  options = {},
) {
  const expected = buildExpectedLokiInstallArgv(identity, lokiRelease);
  if (!argvExactlyEqual(helmArgv, expected)) {
    return { ok: false, reasonCode: 'loki-argv-mismatch' };
  }
  const chartIndex = expected.indexOf(lokiRelease.chartPath);
  if (chartIndex < 0) {
    return { ok: false, reasonCode: 'loki-chart-path-missing' };
  }
  const verify =
    options.verifyChartSha256 ??
    ((path) =>
      options.chartSha256 != null ? options.chartSha256 : chartSha256Hex(path));
  const actualHex = verify(lokiRelease.chartPath);
  if (actualHex.toLowerCase() !== lokiRelease.sha256.toLowerCase()) {
    return { ok: false, reasonCode: 'loki-chart-sha256-mismatch' };
  }
  return { ok: true };
}

/**
 * @param {string[]} helmArgv
 * @param {object} identity
 * @param {ReturnType<typeof resolvePartialInstallPlans>} plans
 * @param {{ chartSha256?: string, verifyChartSha256?: (path: string) => string }} [options]
 */
export function classifyHelmWrapperInstall(
  helmArgv,
  identity,
  plans,
  options = {},
) {
  if (helmArgv[0] !== 'install') {
    return { allowed: false, reasonCode: 'helm-not-install' };
  }
  const releaseName = helmArgv[1];
  if (releaseName === plans.prometheus.name) {
    const expected = buildExpectedPrometheusInstallArgv(
      identity,
      plans.prometheus,
    );
    return argvExactlyEqual(helmArgv, expected)
      ? { allowed: true, phase: 'obs-prometheus', injectQuota: false }
      : { allowed: false, reasonCode: 'prometheus-argv-mismatch' };
  }
  if (releaseName === plans.loki.name) {
    const exact = isExactLokiInstallArgv(
      helmArgv,
      identity,
      plans.loki,
      options,
    );
    return exact.ok
      ? { allowed: true, phase: 'obs-loki', injectQuota: true }
      : {
          allowed: false,
          reasonCode: exact.reasonCode ?? 'loki-argv-mismatch',
        };
  }
  return { allowed: false, reasonCode: 'unexpected-helm-install' };
}

/**
 * @param {string[]} helmArgv
 * @param {object} identity
 * @param {ReturnType<typeof resolvePartialInstallPlans>} plans
 * @param {object} [options]
 */
export function classifyHelmWrapperInvocation(
  helmArgv,
  identity,
  plans,
  options = {},
) {
  if (isReadOnlyHelmInvocation(helmArgv)) {
    return { action: 'delegate', reasonCode: null };
  }
  if (helmArgv[0] === 'install') {
    const decision = classifyHelmWrapperInstall(
      helmArgv,
      identity,
      plans,
      options,
    );
    if (!decision.allowed) {
      return { action: 'refuse', reasonCode: decision.reasonCode };
    }
    return {
      action: decision.injectQuota ? 'inject-loki' : 'delegate',
      phase: decision.phase,
      reasonCode: null,
    };
  }
  return { action: 'refuse', reasonCode: 'unexpected-helm-mutation' };
}

/**
 * @param {object} quotaStatus
 */
export function quotaHardPopulated(quotaStatus) {
  const hard = quotaStatus?.status?.hard ?? {};
  return hard[QUOTA_HARD_KEY] === '0';
}

/**
 * @param {object} workerReceipt
 */
export function assessPartialInstallEnsureReceipt(workerReceipt) {
  if (!workerReceipt || workerReceipt.timedOut === true) {
    return { ok: false, reasonCode: 'ensure-supervisor-timeout' };
  }
  if (workerReceipt.exitCode === 0) {
    return { ok: false, reasonCode: 'ensure-exit-zero' };
  }
  const receipt = workerReceipt.receipt ?? workerReceipt;
  if (receipt.ok === true) {
    return { ok: false, reasonCode: 'ensure-reported-success' };
  }
  const phases = receipt.completedPhases ?? [];
  if (!phases.includes('obs-prometheus')) {
    return { ok: false, reasonCode: 'prometheus-not-retained' };
  }
  if (!phases.includes('obs-loki')) {
    return { ok: false, reasonCode: 'loki-phase-missing' };
  }
  if (receipt.state !== 'partial' && receipt.reasonCode !== 'phase-failed') {
    return { ok: false, reasonCode: 'loki-not-failed' };
  }
  for (const late of LATER_PHASES) {
    if (phases.includes(late)) {
      return { ok: false, reasonCode: 'later-phase-written' };
    }
  }
  if (receipt.pending !== true) {
    return { ok: false, reasonCode: 'pending-fence-missing' };
  }
  return { ok: true, reasonCode: null };
}

/**
 * @param {{ ok?: boolean, reasonCode?: string | null, mutation?: string, writes?: number, refused?: boolean }} repeatResult
 */
export function assessRepeatEnsureRefusal(repeatResult) {
  if ((repeatResult.writes ?? 0) > 0) {
    return { ok: false, reasonCode: 'repeat-ensure-wrote' };
  }
  if (
    repeatResult.mutation === 'confirmed' ||
    repeatResult.mutation === 'possible'
  ) {
    return { ok: false, reasonCode: 'repeat-ensure-mutated' };
  }
  if (repeatResult.refused !== true && repeatResult.ok !== false) {
    return { ok: false, reasonCode: 'repeat-ensure-succeeded' };
  }
  return { ok: true, reasonCode: null };
}

/**
 * @param {string} evidenceDir
 * @param {string} realHelmPath
 * @param {string} handlerModulePath
 */
export function writeHelmPathWrapper(
  evidenceDir,
  realHelmPath,
  handlerModulePath,
) {
  const wrapperPath = join(evidenceDir, 'helm-wrapper');
  const body = `#!/usr/bin/env bash
set -euo pipefail
exec node "${handlerModulePath}" "${realHelmPath}" "$@"
`;
  writeFileSync(wrapperPath, body, { mode: 0o700 });
  chmodSync(wrapperPath, 0o700);
  return wrapperPath;
}

/**
 * @param {object} session
 * @param {string[]} helmArgv
 * @param {{ createQuota?: Function, waitQuotaHard?: Function, recheck?: typeof recheckIdentity, plans?: ReturnType<typeof resolvePartialInstallPlans>, chartSha256?: string }} deps
 */
export async function maybeInjectQuotaForLokiInstall(
  session,
  helmArgv,
  deps = {},
) {
  const plans =
    deps.plans ??
    resolvePartialInstallPlans(session.profile, { verifyArchive: false });
  const decision = classifyHelmWrapperInvocation(
    helmArgv,
    session.identity,
    plans,
    { chartSha256: deps.chartSha256 },
  );
  if (decision.action === 'refuse') {
    return { ok: false, reasonCode: decision.reasonCode, quotaCreated: false };
  }
  if (decision.action !== 'inject-loki') {
    return { ok: true, quotaCreated: false, reasonCode: null };
  }

  const recheck = deps.recheck ?? recheckIdentity;
  const rechecked = recheck(session.identity, {
    now: session.clock.now,
    deadline: session.clock.now() + Math.min(15_000, session.remainingWorkMs()),
    expectedNamespaceUid: session.identity.tuple.targetNamespaceUid,
  });
  if (!rechecked.ok) {
    return {
      ok: false,
      reasonCode:
        rechecked.reason === 'namespace-uid-changed'
          ? 'namespace-uid-changed'
          : 'cluster-uid-changed',
      quotaCreated: false,
    };
  }

  if (deps.createQuota) {
    const created = await deps.createQuota(session);
    if (!created.ok) {
      return {
        ok: false,
        reasonCode: created.reasonCode ?? 'quota-create-failed',
        quotaCreated: false,
      };
    }
  } else {
    return {
      ok: false,
      reasonCode: 'quota-runner-required',
      quotaCreated: false,
    };
  }

  const wait = deps.waitQuotaHard
    ? await deps.waitQuotaHard(session)
    : { ok: false, reasonCode: 'quota-wait-runner-required' };
  if (!wait.ok) {
    return {
      ok: false,
      reasonCode: wait.reasonCode ?? 'quota-hard-missing',
      quotaCreated: true,
    };
  }

  return { ok: true, quotaCreated: true, reasonCode: null };
}

/**
 * @param {unknown} policy
 * @param {unknown} binding
 */
export function assessAdmissionPolicy(policy, binding) {
  const objects = [policy, binding];
  for (const object of objects) {
    if (object == null || typeof object !== 'object') {
      return { ok: false, reasonCode: 'admission-policy-missing' };
    }
    const value = /** @type {Record<string, unknown>} */ (object);
    const metadata = /** @type {Record<string, unknown>} */ (value.metadata ?? {});
    if (value.apiVersion !== 'admissionregistration.k8s.io/v1') {
      return { ok: false, reasonCode: 'admission-policy-api' };
    }
    if (typeof metadata.uid !== 'string' || metadata.uid.length === 0) {
      return { ok: false, reasonCode: 'admission-policy-uid' };
    }
    if (metadata.deletionTimestamp != null) {
      return { ok: false, reasonCode: 'admission-policy-terminating' };
    }
  }
  const policyMeta = /** @type {Record<string, unknown>} */ (
    /** @type {Record<string, unknown>} */ (policy).metadata
  );
  const bindingMeta = /** @type {Record<string, unknown>} */ (
    /** @type {Record<string, unknown>} */ (binding).metadata
  );
  if (policyMeta.name !== A9_POLICY_NAME || bindingMeta.name !== A9_BINDING_NAME) {
    return { ok: false, reasonCode: 'admission-policy-name' };
  }
  const spec = /** @type {Record<string, unknown>} */ (
    /** @type {Record<string, unknown>} */ (policy).spec ?? {}
  );
  const validations = spec.validations;
  const message = Array.isArray(validations)
    ? validations.map((row) => String(row?.message ?? '')).join('\n')
    : '';
  if (!message.includes(A9_DENIAL_MARKER)) {
    return { ok: false, reasonCode: 'admission-policy-marker' };
  }
  return { ok: true, reasonCode: null, policyUid: policyMeta.uid, bindingUid: bindingMeta.uid };
}

/**
 * @param {unknown} rows
 */
export function assessLokiFailureHistory(rows) {
  if (!Array.isArray(rows) || rows.length !== 1) {
    return { ok: false, reasonCode: 'loki-history-shape' };
  }
  const row = /** @type {Record<string, unknown>} */ (rows[0]);
  if (row.revision !== 1 || row.status !== 'failed') {
    return { ok: false, reasonCode: 'loki-history-revision' };
  }
  const description = String(row.description ?? '');
  if (
    !description.includes(A9_DENIAL_MARKER) ||
    !description.includes(A9_POLICY_NAME) ||
    !description.includes(A9_BINDING_NAME) ||
    !description.includes('obs-loki')
  ) {
    return { ok: false, reasonCode: 'loki-denial-marker-missing' };
  }
  return { ok: true, reasonCode: null };
}

/**
 * @param {{ releases?: { name: string, revision: number, status: string }[], lokiStatefulSet?: unknown, prometheusReady?: boolean }} snapshot
 */
export function assessRetainedPartialSnapshot(snapshot) {
  if (snapshot.lokiStatefulSet != null) {
    return { ok: false, reasonCode: 'loki-statefulset-present' };
  }
  const releases = snapshot.releases ?? [];
  for (const name of LATER_PHASES) {
    if (releases.some((row) => row.name === name)) {
      return { ok: false, reasonCode: 'later-release' };
    }
  }
  const prometheus = releases.find((row) => row.name === 'obs-prometheus');
  const loki = releases.find((row) => row.name === 'obs-loki');
  if (
    snapshot.prometheusReady !== true ||
    prometheus?.revision !== 1 ||
    prometheus.status !== 'deployed'
  ) {
    return { ok: false, reasonCode: 'prometheus-not-retained' };
  }
  if (loki?.revision !== 1 || loki.status !== 'failed') {
    return { ok: false, reasonCode: 'loki-not-failed' };
  }
  return { ok: true, reasonCode: null };
}

/**
 * @param {Record<string, unknown> | null} record
 * @param {{ namespaceUid: string, kubeSystemUid: string }} expected
 */
export function assessA9Pending(record, expected) {
  if (record == null || record.schema !== 2 || record.operation !== 'ensure') {
    return { ok: false, reasonCode: 'pending-not-ensure' };
  }
  if (record.phase !== 'obs-loki') {
    return { ok: false, reasonCode: 'pending-phase' };
  }
  const tuple = /** @type {Record<string, unknown>} */ (record.tuple ?? {});
  if (tuple.targetNamespaceUid !== expected.namespaceUid) {
    return { ok: false, reasonCode: 'namespace-uid-mismatch' };
  }
  if (tuple.kubeSystemUid !== expected.kubeSystemUid) {
    return { ok: false, reasonCode: 'cluster-uid-mismatch' };
  }
  return { ok: true, reasonCode: null };
}

/**
 * Public installer argv. Live spawn stays behind an explicit owner flag.
 */
export function publicEnsureArgv() {
  return ['infra:up', '--env', 'dev', '--services', 'observability', '--json'];
}

/**
 * @param {object} session
 * @param {{ runPublicCli?: Function, readPolicy?: Function, readHistory?: Function, readRetained?: Function, inspectPending?: Function }} [deps]
 */
export async function runIsolatedPartialInstallProof(session, deps = {}) {
  const auth = requireIsolatedProofAuthorization(session.env ?? process.env);
  if (auth.refused) {
    return { ok: false, reasonCode: auth.reasonCode, phase: 'isolated-auth' };
  }
  if (session.identity.tuple.kubeSystemUid !== auth.expectedClusterUid) {
    return {
      ok: false,
      reasonCode: 'expected-cluster-uid-mismatch',
      phase: 'preflight',
    };
  }
  if (session.identity.tuple.targetNamespaceUid != null) {
    return {
      ok: false,
      reasonCode: 'target-namespace-present',
      phase: 'preflight',
    };
  }
  const readPolicy = deps.readPolicy;
  if (!readPolicy) {
    return { ok: false, reasonCode: 'policy-read-required', phase: 'policy' };
  }
  const before = await readPolicy(session);
  const policy = assessAdmissionPolicy(before.policy, before.binding);
  if (!policy.ok) {
    return { ok: false, reasonCode: policy.reasonCode, phase: 'policy' };
  }
  if (!deps.runPublicCli) {
    return {
      ok: false,
      reasonCode: 'live-process-withheld',
      phase: 'ensure',
      argv: publicEnsureArgv(),
    };
  }
  const first = await deps.runPublicCli(session, { attempt: 'first' });
  if (first.reason === 'timeout' || first.reason === 'close-unconfirmed') {
    return {
      ok: false,
      reasonCode: first.reason,
      phase: 'ensure',
      mutation: 'possible',
    };
  }
  if (
    first.code === 0 ||
    first.workerState !== 'partial' ||
    first.reason !== 'phase-failed' ||
    first.pending !== true ||
    (first.mutation !== 'confirmed' && first.mutation !== 'possible')
  ) {
    return { ok: false, reasonCode: 'first-ensure-receipt', phase: 'ensure' };
  }
  const phases = first.completedPhases ?? [];
  if (
    phases.includes('obs-loki') ||
    phases.join(',') !== 'namespace,secret,obs-prometheus'
  ) {
    return { ok: false, reasonCode: 'completed-phases', phase: 'ensure' };
  }
  const pending = await deps.inspectPending(session);
  const pendingCheck = assessA9Pending(pending.record, {
    namespaceUid: first.namespaceUid,
    kubeSystemUid: auth.expectedClusterUid,
  });
  if (!pendingCheck.ok || pending.outcome !== 'record') {
    return {
      ok: false,
      reasonCode: pendingCheck.reasonCode ?? 'pending-not-ensure',
      phase: 'pending',
    };
  }
  const history = assessLokiFailureHistory(await deps.readHistory(session));
  if (!history.ok) {
    return { ok: false, reasonCode: history.reasonCode, phase: 'history' };
  }
  const retainedBefore = await deps.readRetained(session);
  const retained = assessRetainedPartialSnapshot(retainedBefore);
  if (!retained.ok) {
    return { ok: false, reasonCode: retained.reasonCode, phase: 'retained' };
  }
  const repeat = await deps.runPublicCli(session, { attempt: 'repeat' });
  if (repeat.mutation !== 'none' || (repeat.completedPhases ?? []).length > 0) {
    return { ok: false, reasonCode: 'repeat-ensure-mutated', phase: 'repeat' };
  }
  if (repeat.code === 0 || typeof repeat.reason !== 'string' || repeat.reason.length === 0) {
    return { ok: false, reasonCode: 'repeat-ensure-succeeded', phase: 'repeat' };
  }
  const retainedAfter = await deps.readRetained(session);
  if (JSON.stringify(retainedBefore) !== JSON.stringify(retainedAfter)) {
    return { ok: false, reasonCode: 'retained-state-changed', phase: 'repeat' };
  }
  const policyAfter = await readPolicy(session);
  if (
    policyAfter.policy?.metadata?.uid !== policy.policyUid ||
    policyAfter.binding?.metadata?.uid !== policy.bindingUid
  ) {
    return { ok: false, reasonCode: 'admission-policy-changed', phase: 'repeat' };
  }
  return {
    ok: true,
    reasonCode: null,
    phase: 'partial-install-complete',
    cleanup: false,
    intentionalRetainedPlatform: true,
    policyUid: policy.policyUid,
    bindingUid: policy.bindingUid,
  };
}

/**
 * @param {object} session
 * @param {{ run?: typeof runPlatformCommand, resolvePlans?: typeof resolvePartialInstallPlans, verifyNamespaceAbsent?: Function, recheck?: typeof recheckIdentity, writeWrapper?: typeof writeHelmPathWrapper, runWrappedEnsure?: Function, runRepeatEnsure?: Function, createQuota?: Function, waitQuotaHard?: Function, resolveRealHelm?: Function, chartSha256?: string }} [deps]
 */
export async function runPartialInstallProof(session, deps = {}) {
  const auth = requireIsolatedProofAuthorization(session.env ?? process.env);
  if (auth.refused) {
    return { ok: false, reasonCode: auth.reasonCode, phase: 'isolated-auth' };
  }

  if (
    session.remainingWorkMs() <
    RESTORATION_RESERVE_MS +
      PARTIAL_INSTALL_PHASE_BUDGET_MS.preflight +
      PARTIAL_INSTALL_PHASE_BUDGET_MS.firstEnsure
  ) {
    return {
      ok: false,
      reasonCode: 'partial-install-budget',
      phase: 'preflight',
    };
  }

  if (session.identity.tuple.kubeSystemUid !== auth.expectedClusterUid) {
    return {
      ok: false,
      reasonCode: 'expected-cluster-uid-mismatch',
      phase: 'preflight',
    };
  }

  const verifyAbsent =
    deps.verifyNamespaceAbsent ??
    (async () => {
      if (session.identity.tuple.targetNamespaceUid != null) {
        return { ok: false, reasonCode: 'target-namespace-present' };
      }
      return { ok: true };
    });
  const absence = await verifyAbsent(session);
  if (!absence.ok) {
    return {
      ok: false,
      reasonCode: absence.reasonCode ?? 'target-namespace-not-absent',
      phase: 'preflight',
    };
  }

  const recheck = deps.recheck ?? recheckIdentity;
  const preflightRecheck = recheck(session.identity, {
    now: session.clock.now,
    deadline: session.clock.now() + Math.min(15_000, session.remainingWorkMs()),
    expectedNamespaceUid: null,
  });
  if (!preflightRecheck.ok) {
    return {
      ok: false,
      reasonCode: 'cluster-uid-changed',
      phase: 'preflight',
    };
  }

  let plans;
  try {
    plans =
      deps.resolvePlans?.(session.profile) ??
      resolvePartialInstallPlans(session.profile, { verifyArchive: false });
  } catch {
    return { ok: false, reasonCode: 'artifact-invalid', phase: 'preflight' };
  }

  const realHelm = deps.resolveRealHelm?.() ?? {
    ok: false,
    reasonCode: 'helm-path-required',
  };
  if (!realHelm.ok || !realHelm.path) {
    return {
      ok: false,
      reasonCode: realHelm.reasonCode ?? 'helm-path-unreadable',
      phase: 'preflight',
    };
  }

  const wrapperPath = deps.writeWrapper
    ? deps.writeWrapper(
        session.evidenceDir,
        realHelm.path,
        join(MODULE_ROOT, 'partial-install.mjs'),
      )
    : writeHelmPathWrapper(
        session.evidenceDir,
        realHelm.path,
        join(MODULE_ROOT, 'partial-install.mjs'),
      );

  const runWrappedEnsure = deps.runWrappedEnsure;
  if (!runWrappedEnsure) {
    return {
      ok: false,
      reasonCode: 'wrapped-ensure-required',
      phase: 'ensure',
    };
  }
  const firstEnsure = await runWrappedEnsure({
    session,
    wrapperPath,
    plans,
    chartSha256: deps.chartSha256,
    createQuota: deps.createQuota,
    waitQuotaHard: deps.waitQuotaHard,
    recheck,
  });
  if (!firstEnsure.ok) {
    return {
      ok: false,
      reasonCode: firstEnsure.reasonCode ?? 'first-ensure-failed',
      phase: 'ensure',
    };
  }

  const ensureAssessment = assessPartialInstallEnsureReceipt(
    firstEnsure.workerReceipt,
  );
  if (!ensureAssessment.ok) {
    return {
      ok: false,
      reasonCode: ensureAssessment.reasonCode,
      phase: 'ensure-assess',
    };
  }

  if (
    session.remainingWorkMs() <
    RESTORATION_RESERVE_MS + PARTIAL_INSTALL_PHASE_BUDGET_MS.repeatEnsure
  ) {
    return { ok: false, reasonCode: 'repeat-ensure-budget', phase: 'repeat' };
  }

  const repeat = deps.runRepeatEnsure
    ? await deps.runRepeatEnsure({ session, plans })
    : {
        refused: false,
        writes: 0,
        ok: false,
        reasonCode: 'repeat-ensure-required',
      };
  const repeatAssessment = assessRepeatEnsureRefusal(repeat);
  if (!repeatAssessment.ok) {
    return {
      ok: false,
      reasonCode: repeatAssessment.reasonCode,
      phase: 'repeat-ensure',
    };
  }

  return {
    ok: true,
    reasonCode: null,
    phase: 'partial-install-complete',
    namespace: PLATFORM_OBSERVABILITY_NS,
    quotaName: QUOTA_NAME,
    wrapperPath,
    retainPlatform: true,
  };
}

/**
 * @param {string} realHelmPath
 * @param {string[]} forwardedArgv
 * @param {{ env?: NodeJS.ProcessEnv, run?: typeof runPlatformCommand, injectQuota?: typeof maybeInjectQuotaForLokiInstall }} [deps]
 */
export async function dispatchHelmWrapperInvocation(
  realHelmPath,
  forwardedArgv,
  deps = {},
) {
  const env = deps.env ?? process.env;
  const specRaw = env.OFFSCREEN_OBS_HELM_WRAPPER_SPEC;
  if (!specRaw) {
    return { ok: false, exitCode: 2, reasonCode: 'wrapper-spec-missing' };
  }
  /** @type {{ identity: object, profile: string, evidenceDir: string, chartSha256?: string }} */
  let spec;
  try {
    spec = JSON.parse(specRaw);
  } catch {
    return { ok: false, exitCode: 2, reasonCode: 'wrapper-spec-invalid' };
  }
  const session = {
    profile: spec.profile,
    identity: spec.identity,
    evidenceDir: spec.evidenceDir,
    clock: { now: () => Date.now() },
    remainingWorkMs: () => QUOTA_WAIT_MS,
    env,
  };
  const plans = resolvePartialInstallPlans(spec.profile, {
    verifyArchive: false,
  });
  const decision = classifyHelmWrapperInvocation(
    forwardedArgv,
    spec.identity,
    plans,
    { chartSha256: spec.chartSha256 },
  );
  if (decision.action === 'refuse') {
    return { ok: false, exitCode: 2, reasonCode: decision.reasonCode };
  }
  if (decision.action === 'inject-loki') {
    const injected = await (deps.injectQuota ?? maybeInjectQuotaForLokiInstall)(
      session,
      forwardedArgv,
      {
        plans,
        chartSha256: spec.chartSha256,
        createQuota: deps.createQuota,
        waitQuotaHard: deps.waitQuotaHard,
      },
    );
    if (!injected.ok) {
      return { ok: false, exitCode: 2, reasonCode: injected.reasonCode };
    }
  }
  const run = deps.run ?? runPlatformCommand;
  const result = run(realHelmPath, forwardedArgv, { timeoutMs: 210_000 });
  return {
    ok: result.ok,
    exitCode: result.ok ? 0 : result.status || 1,
    timedOut: result.timedOut === true,
    reasonCode: result.ok ? null : 'helm-delegation-failed',
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(2);
}
