import { Buffer } from 'node:buffer';
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { join } from 'node:path';

import {
  captureIdentity,
  recheckIdentity,
} from '../../../platform/observability/identity.mjs';

export const PROOF_SCHEMA = 1;
export const CANONICAL_DEV_CONTEXT = 'kind-offscreen-dev';
export const PROOF_GATES = Object.freeze([
  'health',
  'signals',
  'persistence',
  'outage',
  'resources',
  'partial-install',
  'developer',
]);

export const GATE_WORK_MS = Object.freeze({
  health: 1_225_000,
  developer: 1_765_000,
  resources: 1_525_000,
  signals: 4_510_000,
  persistence: 8_950_000,
  outage: 6_915_000,
  'partial-install': 8_940_000,
});

export const GATE_RESERVE_MS = Object.freeze({
  health: 120_000,
  developer: 120_000,
  resources: 120_000,
  signals: 1_020_000,
  persistence: 1_020_000,
  outage: 2_040_000,
  'partial-install': 300_000,
});

export const GATE_BUDGET_MS = Object.freeze(
  Object.fromEntries(
    Object.keys(GATE_WORK_MS).map((gate) => [
      gate,
      GATE_WORK_MS[gate] + GATE_RESERVE_MS[gate],
    ]),
  ),
);

export const CLEANUP_RESERVE_MS = 120_000;
export const RESTORATION_RESERVE_MS = 300_000;
export const DISRUPTION_AUTHORIZATION_ENV =
  'OFFSCREEN_OBSERVABILITY_DISRUPTION';

const DISRUPTION_GATES = new Set(['persistence', 'outage', 'partial-install']);
export const MAX_RECEIPT_BYTES = 16_384;

export const HEALTH_PHASE_BUDGET_MS = Object.freeze({
  identity: 210_000,
  observe: 345_000,
  datasource: 90_000,
  repeat: 345_000,
});

export const GRAFANA_DATASOURCE_UIDS = Object.freeze([
  'offscreen-metrics',
  'offscreen-logs',
  'offscreen-traces',
]);

export const STABLE_WORKLOAD_KEYS = Object.freeze([
  'Deployment/obs-prometheus',
  'Deployment/obs-collector',
  'Deployment/obs-grafana',
  'StatefulSet/obs-loki',
  'StatefulSet/obs-tempo',
]);

export const STABLE_PVC_NAMES = Object.freeze([
  'obs-prometheus',
  'storage-obs-loki-0',
  'storage-obs-tempo-0',
]);

export const HELM_STORAGE_SECRET_NAMES = Object.freeze([
  'sh.helm.release.v1.obs-prometheus.v1',
  'sh.helm.release.v1.obs-loki.v1',
  'sh.helm.release.v1.obs-tempo.v1',
  'sh.helm.release.v1.obs-collector.v1',
  'sh.helm.release.v1.obs-grafana.v1',
]);

export const GRAFANA_ADMIN_SECRET_NAME = 'obs-grafana-admin';
export const COLLECTOR_POD_KEY = 'Pod/obs-collector';

const AUTHORIZATION_ENV = 'OFFSCREEN_OBSERVABILITY_PROOF';

/**
 * @param {string[]} argv
 */
export function parseProofCli(argv) {
  const args = argv.slice(2);
  if (args.length !== 3) {
    return { ok: false, reason: 'usage' };
  }
  const [gate, profile, context] = args;
  if (!PROOF_GATES.includes(gate)) {
    return { ok: false, reason: 'unknown-gate' };
  }
  if (profile !== 'dev') {
    return { ok: false, reason: 'profile-not-accepted' };
  }
  if (typeof context !== 'string' || context.length === 0) {
    return { ok: false, reason: 'invalid-context' };
  }
  return { ok: true, gate, profile, context };
}

/**
 * @param {{ gate: string, profile: string, context: string, env?: NodeJS.ProcessEnv }} input
 */
export function refuseProofInvocation({
  gate,
  profile,
  context,
  env = process.env,
}) {
  if (env[AUTHORIZATION_ENV] !== 'authorized') {
    return { refused: true, reasonCode: 'proof-unauthorized' };
  }
  if (profile !== 'dev') {
    return { refused: true, reasonCode: 'profile-not-accepted' };
  }
  if (context !== CANONICAL_DEV_CONTEXT) {
    return { refused: true, reasonCode: 'context-not-canonical-dev' };
  }
  if (!PROOF_GATES.includes(gate)) {
    return { refused: true, reasonCode: 'unknown-gate' };
  }
  if (DISRUPTION_GATES.has(gate)) {
    if (env[DISRUPTION_AUTHORIZATION_ENV] !== 'authorized') {
      return { refused: true, reasonCode: 'disruption-unauthorized' };
    }
  }
  return { refused: false };
}

/**
 * @param {{ gate: string, env?: NodeJS.ProcessEnv }} input
 */
export function refuseDisruptionInvocation({ gate, env = process.env }) {
  if (!DISRUPTION_GATES.has(gate)) {
    return { refused: false };
  }
  if (env[DISRUPTION_AUTHORIZATION_ENV] !== 'authorized') {
    return { refused: true, reasonCode: 'disruption-unauthorized' };
  }
  return { refused: false };
}

/**
 * @param {string} gate
 */
export function reserveMsForGate(gate) {
  return GATE_RESERVE_MS[gate] ?? 0;
}

/**
 * @param {string} gate
 */
const IMPLEMENTED_GATES = new Set([
  'signals',
  'developer',
  'health',
  'resources',
  'persistence',
  'outage',
  'partial-install',
]);

export function gateImplemented(gate) {
  return IMPLEMENTED_GATES.has(gate);
}

/**
 * @param {number} elapsedMs
 * @param {string} gate
 */
export function remainingWorkBudgetMs(elapsedMs, gate) {
  const overall = GATE_BUDGET_MS[gate] ?? 0;
  return Math.max(0, overall - reserveMsForGate(gate) - elapsedMs);
}

/**
 * @param {number} remainingMs
 * @param {number} phaseMs
 */
export function refusePhaseStart(remainingMs, phaseMs) {
  return remainingMs < phaseMs;
}

/**
 * @param {number} elapsedMs
 * @param {string} gate
 */
export function remainingInclusiveBudgetMs(elapsedMs, gate) {
  const overall = GATE_BUDGET_MS[gate] ?? 0;
  return Math.max(0, overall - elapsedMs);
}

/**
 * @typedef {{
 *   writeTemp: (path: string, data: string) => void,
 *   fsyncFile: (path: string) => void,
 *   rename: (from: string, to: string) => void,
 *   fsyncDir: (path: string) => void,
 *   readBack: (path: string) => string,
 * }} ReceiptIO
 */

/**
 * @param {{ receiptDir: string, receiptPath: string, payload: object, io: ReceiptIO }} input
 */
export function persistProofReceipt({ receiptDir, receiptPath, payload, io }) {
  const serialized = `${JSON.stringify(payload)}\n`;
  if (Buffer.byteLength(serialized, 'utf8') > MAX_RECEIPT_BYTES) {
    return { ok: false, reasonCode: 'receipt-overflow' };
  }
  const tempPath = join(
    receiptDir,
    `.receipt-${process.pid}-${randomBytes(4).toString('hex')}.tmp`,
  );
  io.writeTemp(tempPath, serialized);
  io.fsyncFile(tempPath);
  io.rename(tempPath, receiptPath);
  io.fsyncDir(receiptDir);
  const readBack = io.readBack(receiptPath);
  if (readBack.trim() !== serialized.trim()) {
    return { ok: false, reasonCode: 'receipt-readback' };
  }
  return { ok: true };
}

/**
 * @param {string} root
 */
export function defaultReceiptIo(root) {
  return {
    writeTemp(path, data) {
      const fd = openSync(path, 'wx', 0o600);
      try {
        writeSync(fd, data);
      } finally {
        closeSync(fd);
      }
    },
    fsyncFile(path) {
      const fd = openSync(path, 'r');
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    },
    rename(from, to) {
      renameSync(from, to);
    },
    fsyncDir(path) {
      const fd = openSync(path, 'r');
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    },
    readBack(path) {
      return readFileSync(path, 'utf8');
    },
    ensureDir(path) {
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true, mode: 0o700 });
        chmodSync(path, 0o700);
      }
    },
    root,
  };
}

/**
 * @param {string} repoRoot
 */
export function createEvidenceDirectory(repoRoot) {
  const nonce = randomBytes(16).toString('hex');
  const dir = join(
    repoRoot,
    '.offscreen',
    'verification',
    `observability-${nonce}`,
  );
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return { dir, receiptPath: join(dir, 'receipt.json') };
}

/**
 * @param {object} observation
 */
export function extractStableIdentities(observation) {
  const snapshot = observation?.snapshot ?? {};
  const objects = snapshot.objects ?? {};
  /** @type {Record<string, string>} */
  const workloads = {};
  for (const key of STABLE_WORKLOAD_KEYS) {
    const uid = objects[key]?.metadata?.uid;
    if (typeof uid === 'string' && uid.length > 0) {
      workloads[key] = uid;
    }
  }
  /** @type {Record<string, string>} */
  const claims = {};
  /** @type {Record<string, string>} */
  const volumes = {};
  const namespaceUid =
    snapshot.namespace?.object?.metadata?.uid ??
    observation?.identity?.tuple?.targetNamespaceUid ??
    null;
  for (const claimName of STABLE_PVC_NAMES) {
    const pvc = objects[`PersistentVolumeClaim/${claimName}`];
    const pvcUid = pvc?.metadata?.uid;
    if (typeof pvcUid === 'string' && pvcUid.length > 0) {
      claims[claimName] = pvcUid;
    }
    const namespace = pvc?.metadata?.namespace;
    const boundPv = (snapshot.persistentVolumes ?? []).find(
      (pv) =>
        pv?.spec?.claimRef?.name === claimName &&
        pv?.spec?.claimRef?.namespace === namespace,
    );
    const pvUid = boundPv?.metadata?.uid;
    if (typeof pvUid === 'string' && pvUid.length > 0) {
      volumes[claimName] = pvUid;
    }
  }
  const grafanaAdminUid = uidOf(objects[`Secret/${GRAFANA_ADMIN_SECRET_NAME}`]);
  /** @type {Record<string, string | null>} */
  const helmStorage = {};
  for (const name of HELM_STORAGE_SECRET_NAMES) {
    helmStorage[name] = uidOf(objects[`Secret/${name}`]);
  }
  const collectorPodUid = uidOf(objects[COLLECTOR_POD_KEY]);
  const complete =
    typeof namespaceUid === 'string' &&
    namespaceUid.length > 0 &&
    STABLE_WORKLOAD_KEYS.every((key) => typeof workloads[key] === 'string') &&
    STABLE_PVC_NAMES.every(
      (name) =>
        typeof claims[name] === 'string' && typeof volumes[name] === 'string',
    ) &&
    typeof grafanaAdminUid === 'string' &&
    HELM_STORAGE_SECRET_NAMES.every((name) => typeof helmStorage[name] === 'string') &&
    typeof collectorPodUid === 'string';
  return {
    complete,
    namespaceUid,
    workloads,
    claims,
    volumes,
    grafanaAdminUid,
    helmStorage,
    collectorPodUid,
  };
}

/**
 * @param {object | undefined} object
 */
function uidOf(object) {
  const uid = object?.metadata?.uid;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

/**
 * @param {ReturnType<typeof extractStableIdentities>} before
 * @param {ReturnType<typeof extractStableIdentities>} after
 */
export function stableIdentitiesCompatible(before, after) {
  if (!before?.complete || !after?.complete) {
    return { ok: false, reasonCode: 'identity-incomplete' };
  }
  if (before.namespaceUid !== after.namespaceUid) {
    return { ok: false, reasonCode: 'namespace-uid-changed' };
  }
  if (before.grafanaAdminUid !== after.grafanaAdminUid) {
    return { ok: false, reasonCode: 'grafana-admin-uid-changed' };
  }
  if (before.collectorPodUid !== after.collectorPodUid) {
    return { ok: false, reasonCode: 'collector-pod-uid-changed' };
  }
  for (const name of HELM_STORAGE_SECRET_NAMES) {
    if (before.helmStorage[name] !== after.helmStorage[name]) {
      return { ok: false, reasonCode: 'helm-storage-uid-changed' };
    }
  }
  for (const key of STABLE_WORKLOAD_KEYS) {
    if (before.workloads[key] !== after.workloads[key]) {
      return { ok: false, reasonCode: 'workload-uid-changed' };
    }
  }
  for (const claimName of STABLE_PVC_NAMES) {
    if (before.claims[claimName] !== after.claims[claimName]) {
      return { ok: false, reasonCode: 'claim-uid-changed' };
    }
    if (before.volumes[claimName] !== after.volumes[claimName]) {
      return { ok: false, reasonCode: 'volume-uid-changed' };
    }
  }
  return { ok: true };
}

/**
 * @param {object} observation
 */
export function assessHealthStructuralObservation(observation) {
  if (observation?.reasonCode !== 'ready' || observation?.state !== 'ready') {
    return {
      ok: false,
      reasonCode: observation?.reasonCode ?? 'not-ready',
    };
  }
  const objects = observation?.snapshot?.objects ?? {};
  for (const key of STABLE_WORKLOAD_KEYS) {
    const workload = objects[key];
    if (!workload) {
      return { ok: false, reasonCode: 'workload-missing' };
    }
    const readyReplicas = Number(workload.status?.readyReplicas ?? 0);
    const desired = Number(
      workload.spec?.replicas ?? workload.status?.replicas ?? 1,
    );
    if (readyReplicas < desired) {
      return { ok: false, reasonCode: 'workload-not-ready' };
    }
  }
  for (const claimName of STABLE_PVC_NAMES) {
    const pvc = objects[`PersistentVolumeClaim/${claimName}`];
    if (!pvc || pvc.status?.phase !== 'Bound') {
      return { ok: false, reasonCode: 'claim-not-bound' };
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, { status?: string, ok?: boolean }>} datasourceHealth
 */
export function assessDatasourceHealth(datasourceHealth) {
  for (const uid of GRAFANA_DATASOURCE_UIDS) {
    const entry = datasourceHealth?.[uid];
    if (!entry || entry.status !== 'ok' || entry.ok !== true) {
      return { ok: false, reasonCode: 'datasource-health' };
    }
  }
  return { ok: true };
}

/**
 * @param {{ gate: string, profile: string, context: string, sourceSha?: string | null, clusterUid?: string | null, namespaceUid?: string | null, completed?: boolean, cleanup?: boolean, reasonCode?: string | null }} input
 */
export function buildProofReceipt(input) {
  return {
    schema: PROOF_SCHEMA,
    gate: input.gate,
    ok:
      input.completed === true &&
      input.reasonCode == null &&
      (input.cleanup === true || input.intentionalRetainedPlatform === true),
    profile: input.profile,
    context: input.context,
    sourceSha: input.sourceSha ?? null,
    clusterUid: input.clusterUid ?? null,
    namespaceUid: input.namespaceUid ?? null,
    completed: input.completed === true,
    cleanup: input.cleanup === true,
    reasonCode: input.reasonCode ?? null,
  };
}

/**
 * @param {{
 *   gate: string,
 *   profile: string,
 *   context: string,
 *   env?: NodeJS.ProcessEnv,
 *   evidenceDir: string,
 *   receiptPath: string,
 *   io?: ReceiptIO & { ensureDir?: (path: string) => void },
 *   clock?: { now: () => number },
 *   readSourceSha?: () => string | null,
 *   captureIdentity?: typeof captureIdentity,
 *   recheckIdentity?: typeof recheckIdentity,
 *   observe?: (session: object) => Promise<object> | object,
 *   queryDatasourceHealth?: (session: object) => Promise<Record<string, { ok: boolean, status: string }>> | Record<string, { ok: boolean, status: string }>,
 *   repeatObservation?: (session: object) => Promise<object> | object,
 *   runSignals?: (session: object) => Promise<{ ok: boolean, reasonCode?: string | null }> | { ok: boolean, reasonCode?: string | null },
 *   runPersistence?: (session: object) => Promise<{ ok: boolean, reasonCode?: string | null }> | { ok: boolean, reasonCode?: string | null },
 *   runOutage?: (session: object) => Promise<{ ok: boolean, reasonCode?: string | null }> | { ok: boolean, reasonCode?: string | null },
 *   runResources?: (session: object) => Promise<{ ok: boolean, reasonCode?: string | null }> | { ok: boolean, reasonCode?: string | null },
 *   runPartialInstall?: (session: object) => Promise<{ ok: boolean, reasonCode?: string | null }> | { ok: boolean, reasonCode?: string | null },
 *   deleteProofResources?: (resources: object) => Promise<{ ok: boolean }> | { ok: boolean },
 * }} input
 */
export async function runProofOperationSession(input) {
  const refusal = refuseProofInvocation({
    gate: input.gate,
    profile: input.profile,
    context: input.context,
    env: input.env,
  });
  if (refusal.refused) {
    return {
      ok: false,
      phase: 'refused',
      reasonCode: refusal.reasonCode,
    };
  }
  if (!gateImplemented(input.gate)) {
    return {
      ok: false,
      phase: 'not-implemented',
      reasonCode: 'gate-not-implemented',
      completed: false,
      cleanup: false,
    };
  }

  if (input.verifyCleanCheckout) {
    const clean = input.verifyCleanCheckout();
    if (!clean?.ok) {
      return {
        ok: false,
        phase: 'source',
        reasonCode: clean?.reasonCode ?? 'source-not-clean',
        completed: false,
        cleanup: false,
      };
    }
  }

  const clock = input.clock ?? { now: () => Date.now() };
  const startedMs = clock.now();
  const elapsedMs = () => clock.now() - startedMs;
  const remainingWorkMs = () => remainingWorkBudgetMs(elapsedMs(), input.gate);
  const io = input.io ?? defaultReceiptIo(input.evidenceDir);
  io.ensureDir?.(input.evidenceDir);

  const capture = input.captureIdentity ?? captureIdentity;
  const recheck = input.recheckIdentity ?? recheckIdentity;
  const readSourceSha =
    input.readSourceSha ??
    (() => {
      throw new Error('source-sha-runner-required');
    });

  /** @type {ReturnType<typeof captureIdentity> | null} */
  let identity = null;
  let cleanupOk = false;
  /** @type {string | null} */
  let reasonCode = null;
  /** @type {string | null} */
  let sourceSha = null;
  /** @type {string | null} */
  let clusterUid = null;
  /** @type {string | null} */
  let namespaceUid = null;
  let completed = false;

  const writeReceipt = (partial) => {
    const receiptCleanup =
      input.gate === 'partial-install' ? false : (partial.cleanup ?? cleanupOk);
    const receipt = buildProofReceipt({
      gate: input.gate,
      profile: input.profile,
      context: input.context,
      sourceSha,
      clusterUid,
      namespaceUid,
      completed: partial.completed ?? completed,
      cleanup: receiptCleanup,
      reasonCode: partial.reasonCode ?? reasonCode,
    });
    return persistProofReceipt({
      receiptDir: input.evidenceDir,
      receiptPath: input.receiptPath,
      payload: receipt,
      io,
    });
  };

  try {
    if (refusePhaseStart(remainingWorkMs(), HEALTH_PHASE_BUDGET_MS.identity)) {
      reasonCode = 'identity-budget';
      return { ok: false, phase: 'identity', reasonCode };
    }

    const identityDeadline =
      clock.now() +
      Math.min(HEALTH_PHASE_BUDGET_MS.identity, remainingWorkMs());
    identity = capture(input.profile, input.context, {
      now: clock.now,
      deadline: identityDeadline,
    });
    clusterUid = identity.tuple.kubeSystemUid;
    namespaceUid = identity.tuple.targetNamespaceUid;

    try {
      sourceSha = readSourceSha();
    } catch {
      reasonCode = 'source-sha-unreadable';
      return { ok: false, phase: 'source-sha', reasonCode };
    }

    const session = {
      gate: input.gate,
      profile: input.profile,
      context: input.context,
      identity,
      env: input.env ?? process.env,
      clock,
      remainingWorkMs,
      elapsedMs,
      evidenceDir: input.evidenceDir,
      receiptPath: input.receiptPath,
      deleteProofResources: input.deleteProofResources,
      custody: input.custody ?? null,
      proofCustody: input.proofCustody ?? null,
    };

    if (input.gate === 'persistence') {
      const runPersistence =
        input.runPersistence ??
        (() => {
          throw new Error('persistence-runner-required');
        });
      const persistence = await runPersistence(session);
      if (!persistence.ok) {
        reasonCode = persistence.reasonCode ?? 'persistence-failed';
        return {
          ok: false,
          phase: persistence.phase ?? 'persistence',
          reasonCode,
        };
      }
      completed = true;
      return {
        ok: true,
        phase: persistence.phase ?? 'persistence-complete',
        reasonCode: null,
      };
    }

    if (input.gate === 'outage') {
      const runOutage =
        input.runOutage ??
        (() => {
          throw new Error('outage-runner-required');
        });
      const outage = await runOutage(session);
      if (!outage.ok) {
        reasonCode = outage.reasonCode ?? 'outage-failed';
        if (outage.restorationFailed === true) {
          reasonCode = outage.reasonCode ?? 'outage-restore-failed';
        }
        return {
          ok: false,
          phase: outage.phase ?? 'outage',
          reasonCode,
          restorationAttempted: outage.restorationAttempted === true,
          restorationFailed: outage.restorationFailed === true,
          retainedPending: outage.retainedPending === true,
        };
      }
      completed = true;
      return {
        ok: true,
        phase: outage.phase ?? 'outage-complete',
        reasonCode: null,
      };
    }

    if (input.gate === 'resources') {
      const runResources =
        input.runResources ??
        (() => {
          throw new Error('resources-runner-required');
        });
      const resources = await runResources(session);
      if (!resources.ok) {
        reasonCode = resources.reasonCode ?? 'resources-failed';
        return { ok: false, phase: resources.phase ?? 'resources', reasonCode };
      }
      completed = true;
      return {
        ok: true,
        phase: resources.phase ?? 'resources-complete',
        reasonCode: null,
      };
    }

    if (input.gate === 'partial-install') {
      const runPartialInstall =
        input.runPartialInstall ??
        (() => {
          throw new Error('partial-install-runner-required');
        });
      const partial = await runPartialInstall(session);
      if (!partial.ok) {
        reasonCode = partial.reasonCode ?? 'partial-install-failed';
        return {
          ok: false,
          phase: partial.phase ?? 'partial-install',
          reasonCode,
        };
      }
      completed = true;
      return {
        ok: true,
        phase: partial.phase ?? 'partial-install-complete',
        reasonCode: null,
        cleanup: false,
      };
    }

    if (input.gate === 'developer') {
      const runDeveloper =
        input.runDeveloper ??
        (() => {
          throw new Error('developer-runner-required');
        });
      const developer = await runDeveloper(session);
      if (!developer.ok) {
        reasonCode = developer.reasonCode ?? 'developer-failed';
        cleanupOk = developer.cleanup === true;
        return { ok: false, phase: 'developer', reasonCode };
      }
      completed = true;
      cleanupOk = true;
      return { ok: true, phase: 'developer-complete', reasonCode: null };
    }

    if (input.gate === 'signals') {
      const runSignals =
        input.runSignals ??
        (() => {
          throw new Error('signals-runner-required');
        });
      const recheckBeforeSignals = recheck(identity, {
        now: clock.now,
        deadline: clock.now() + Math.min(15_000, remainingWorkMs()),
        expectedNamespaceUid: identity.tuple.targetNamespaceUid,
      });
      if (!recheckBeforeSignals.ok) {
        reasonCode =
          recheckBeforeSignals.reason === 'namespace-uid-changed'
            ? 'namespace-uid-changed'
            : recheckBeforeSignals.reason === 'context-changed'
              ? 'context-not-canonical-dev'
              : 'cluster-uid-changed';
        return { ok: false, phase: 'identity-recheck', reasonCode };
      }
      const signals = await runSignals(session);
      if (!signals.ok) {
        reasonCode = signals.reasonCode ?? 'signals-failed';
        return { ok: false, phase: 'signals', reasonCode };
      }
      const finalSignalsRecheck = recheck(identity, {
        now: clock.now,
        deadline:
          clock.now() +
          Math.min(
            15_000,
            remainingInclusiveBudgetMs(elapsedMs(), input.gate) -
              reserveMsForGate(input.gate),
          ),
        expectedNamespaceUid: identity.tuple.targetNamespaceUid,
      });
      if (!finalSignalsRecheck.ok) {
        reasonCode =
          finalSignalsRecheck.reason === 'namespace-uid-changed'
            ? 'namespace-uid-changed'
            : 'cluster-uid-changed';
        return { ok: false, phase: 'finalize-recheck', reasonCode };
      }
      completed = true;
      return { ok: true, phase: 'signals-complete', reasonCode: null };
    }

    const observe =
      input.observe ??
      (() => {
        throw new Error('observe-runner-required');
      });
    const queryDatasourceHealth =
      input.queryDatasourceHealth ??
      (() => {
        throw new Error('datasource-health-runner-required');
      });
    const repeatObservation = input.repeatObservation ?? observe;

    if (refusePhaseStart(remainingWorkMs(), HEALTH_PHASE_BUDGET_MS.observe)) {
      reasonCode = 'observe-budget';
      return { ok: false, phase: 'observe', reasonCode };
    }
    const primary = await observe(session);
    const structural = assessHealthStructuralObservation(primary);
    if (!structural.ok) {
      reasonCode = structural.reasonCode ?? 'not-ready';
      return { ok: false, phase: 'observe', reasonCode };
    }

    if (
      refusePhaseStart(remainingWorkMs(), HEALTH_PHASE_BUDGET_MS.datasource)
    ) {
      reasonCode = 'datasource-budget';
      return { ok: false, phase: 'datasource', reasonCode };
    }
    const datasourceHealth = await queryDatasourceHealth(session);
    const datasource = assessDatasourceHealth(datasourceHealth);
    if (!datasource.ok) {
      reasonCode = datasource.reasonCode ?? 'datasource-health';
      return { ok: false, phase: 'datasource', reasonCode };
    }

    const before = extractStableIdentities(primary);

    const recheckBeforeRepeat = recheck(identity, {
      now: clock.now,
      deadline: clock.now() + Math.min(15_000, remainingWorkMs()),
      expectedNamespaceUid: identity.tuple.targetNamespaceUid,
    });
    if (!recheckBeforeRepeat.ok) {
      reasonCode =
        recheckBeforeRepeat.reason === 'namespace-uid-changed'
          ? 'namespace-uid-changed'
          : recheckBeforeRepeat.reason === 'context-changed'
            ? 'context-not-canonical-dev'
            : 'cluster-uid-changed';
      return { ok: false, phase: 'identity-recheck', reasonCode };
    }

    if (refusePhaseStart(remainingWorkMs(), HEALTH_PHASE_BUDGET_MS.repeat)) {
      reasonCode = 'repeat-budget';
      return { ok: false, phase: 'repeat', reasonCode };
    }
    const repeated = await repeatObservation(session);
    const repeatStructural = assessHealthStructuralObservation(repeated);
    if (!repeatStructural.ok) {
      reasonCode = repeatStructural.reasonCode ?? 'repeat-not-ready';
      return { ok: false, phase: 'repeat', reasonCode };
    }
    const after = extractStableIdentities(repeated);
    const compatible = stableIdentitiesCompatible(before, after);
    if (!compatible.ok) {
      reasonCode = compatible.reasonCode ?? 'identity-changed';
      return { ok: false, phase: 'repeat-compare', reasonCode };
    }

    const finalRecheck = recheck(identity, {
      now: clock.now,
      deadline:
        clock.now() +
        Math.min(
          15_000,
          remainingInclusiveBudgetMs(elapsedMs(), input.gate) -
            reserveMsForGate(input.gate),
        ),
      expectedNamespaceUid: identity.tuple.targetNamespaceUid,
    });
    if (!finalRecheck.ok) {
      reasonCode =
        finalRecheck.reason === 'namespace-uid-changed'
          ? 'namespace-uid-changed'
          : 'cluster-uid-changed';
      return { ok: false, phase: 'finalize-recheck', reasonCode };
    }

    completed = true;
    return { ok: true, phase: 'health-complete', reasonCode: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('context profile mismatch')) {
      reasonCode = 'context-not-canonical-dev';
    } else if (message.includes('namespace-uid-changed')) {
      reasonCode = 'namespace-uid-changed';
    } else {
      reasonCode = 'session-failed';
    }
    return { ok: false, phase: 'session', reasonCode };
  } finally {
    if (identity?.cleanup) {
      const cleanupDeadline =
        clock.now() +
        Math.min(
          reserveMsForGate(input.gate),
          remainingInclusiveBudgetMs(elapsedMs(), input.gate),
        );
      if (cleanupDeadline > clock.now()) {
        const cleanup = identity.cleanup();
        cleanupOk = cleanup.ok === true;
        if (!cleanupOk && reasonCode == null) {
          reasonCode = 'cleanup-failed';
        }
      }
    }
    writeReceipt({
      completed,
      cleanup: cleanupOk,
      reasonCode,
    });
  }
}
