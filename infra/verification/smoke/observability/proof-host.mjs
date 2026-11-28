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
  ARTIFACT_HISTORY_ROWS,
  HISTORY_ROLES,
} from '../../../platform/observability/artifact-history.mjs';
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

const E2_ARTIFACT_ID = 'dev-e2';
const E1_DEVELOPER_ARTIFACT_ID = 'dev-e1-developer';
const E1_DEVELOPER_HISTORY_IDS = Object.freeze([
  'developer-fresh',
  'developer-upgraded',
]);
/** Gates that run a disruptive or specialized E1-only proof. */
export const E1_ONLY_ADMISSION_GATES = Object.freeze(
  new Set(['persistence', 'outage', 'resources']),
);
/** Gates that classify the installed state before dispatch. */
export const ADMISSION_GATES = Object.freeze(
  new Set([
    'health',
    'signals',
    'developer',
    'persistence',
    'outage',
    'resources',
  ]),
);

/**
 * True when the frozen source history carries an E2 row for the profile.
 * @param {string} profile
 */
export function sourceEnablesE2(profile) {
  return ARTIFACT_HISTORY_ROWS.some(
    (row) => row.profileId === profile && row.artifactId === E2_ARTIFACT_ID,
  );
}

/**
 * Pure eligibility decision from an operational classification
 * (classifyOperationalInventory result). Never uses desired convergence to
 * qualify an installed E1 predecessor. Reads only the matched descriptor
 * identity; unreadable, absent, foreign, base, pending and mixed states refuse.
 * @param {string} gate
 * @param {object | null | undefined} classification
 */
export function decideProofAdmission(gate, classification) {
  const c = classification;
  if (c == null || c.state === 'unreadable') {
    return { ok: false, reasonCode: 'admission-unreadable' };
  }
  if (c.pending === true) {
    return { ok: false, reasonCode: 'pending-refused' };
  }
  const matched =
    typeof c.artifactId === 'string' &&
    typeof c.historyId === 'string' &&
    c.artifacts != null;
  if (!matched) {
    return { ok: false, reasonCode: 'proof-not-admitted' };
  }
  if (c.artifactId === E2_ARTIFACT_ID) {
    if (E1_ONLY_ADMISSION_GATES.has(gate)) {
      return { ok: false, reasonCode: 'unsupported-evolution' };
    }
    if (c.structuralReady === true && c.state === 'ready') {
      return {
        ok: true,
        admission: admissionOf(c, 'e2'),
      };
    }
    return { ok: false, reasonCode: 'proof-not-admitted' };
  }
  if (
    c.artifactId === E1_DEVELOPER_ARTIFACT_ID &&
    E1_DEVELOPER_HISTORY_IDS.includes(c.historyId) &&
    c.structuralReady === true &&
    c.state === 'not-ready' &&
    c.reasonCode === 'upgrade-required'
  ) {
    return { ok: true, admission: admissionOf(c, 'e1-developer') };
  }
  return { ok: false, reasonCode: 'proof-not-admitted' };
}

function admissionOf(c, evolution) {
  return {
    evolution,
    artifactId: c.artifactId,
    historyId: c.historyId,
    artifacts: c.artifacts,
  };
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

const HELM_RELEASE_PREFIX = 'sh.helm.release.v1.';

/**
 * Exact stable workload, storage and Helm-history identities of the matched
 * artifact/history carried on `session.admission`. Helm storage names come
 * from the frozen history row (every retained revision of every role),
 * workloads from the matched descriptor's declared expectedWorkloads (so E2
 * helper workloads are included), claims from the stable claim list.
 * @param {{ artifactId?: string, historyId?: string, artifacts?: any } | null | undefined} admission
 */
export function deriveStableSpec(admission) {
  const bundle = admission?.artifacts;
  const row = ARTIFACT_HISTORY_ROWS.find(
    (candidate) => candidate.id === admission?.historyId,
  );
  if (!bundle || !row || bundle.artifactId !== admission.artifactId) {
    return { ok: false, reasonCode: 'stable-spec-unavailable' };
  }
  const workloadKeys = [];
  const helmSecretNames = [];
  for (const role of HISTORY_ROLES) {
    const release = (bundle.releases ?? []).find((r) => r.role === role);
    const revisions = row.releases?.[role]?.length ?? 0;
    const declared = Object.keys(release?.expectedWorkloads ?? {});
    if (!release?.name || revisions < 1 || declared.length === 0) {
      return { ok: false, reasonCode: 'stable-spec-unavailable' };
    }
    for (let revision = 1; revision <= revisions; revision += 1) {
      helmSecretNames.push(`${HELM_RELEASE_PREFIX}${release.name}.v${revision}`);
    }
    for (const key of declared) {
      const match = /^namespaced\/[^/]+\/(Deployment|StatefulSet)\/(.+)$/.exec(key);
      if (!match) return { ok: false, reasonCode: 'stable-spec-unavailable' };
      workloadKeys.push(`${match[1]}/${match[2]}`);
    }
  }
  return {
    ok: true,
    spec: Object.freeze({
      artifactId: admission.artifactId,
      historyId: admission.historyId,
      workloadKeys: Object.freeze([...new Set(workloadKeys)].sort()),
      pvcNames: STABLE_PVC_NAMES,
      helmSecretNames: Object.freeze([...new Set(helmSecretNames)].sort()),
    }),
  };
}

const LEGACY_SPEC = Object.freeze({
  artifactId: null,
  historyId: null,
  workloadKeys: STABLE_WORKLOAD_KEYS,
  pvcNames: STABLE_PVC_NAMES,
  helmSecretNames: HELM_STORAGE_SECRET_NAMES,
});

/**
 * Operational observation must be the admitted artifact/history.
 * @param {object} observation
 * @param {{ artifactId?: string | null, historyId?: string | null } | null | undefined} spec
 */
export function observationMatchesSpec(observation, spec) {
  if (!spec?.artifactId) return true;
  return (
    observation?.artifactId === spec.artifactId &&
    observation?.historyId === spec.historyId
  );
}

/**
 * Repeat the classification under held custody and require the admitted
 * artifact/history to be unchanged.
 * @param {object} session
 */
export async function recheckAdmissionUnchanged(session) {
  if (!session?.admission) return { ok: true };
  if (typeof session.reclassifyAdmission !== 'function') {
    return { ok: false, reasonCode: 'admission-required' };
  }
  const again = await session.reclassifyAdmission();
  if (
    !again?.ok ||
    again.admission?.artifactId !== session.admission.artifactId ||
    again.admission?.historyId !== session.admission.historyId
  ) {
    return { ok: false, reasonCode: 'history-changed' };
  }
  return { ok: true };
}

/** Claim each proof actually makes; none claims E2 coverage or disruption. */
export const PROOF_CLAIMS = Object.freeze({
  health: 'structural-health',
  signals: 'synthetic-signals',
  developer: 'developer-forwards',
});

/**
 * @param {object} observation
 * @param {typeof LEGACY_SPEC} [spec]
 */
export function extractStableIdentities(observation, spec = LEGACY_SPEC) {
  const snapshot = observation?.snapshot ?? {};
  const objects = snapshot.objects ?? {};
  /** @type {Record<string, string>} */
  const workloads = {};
  for (const key of spec.workloadKeys) {
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
  for (const claimName of spec.pvcNames) {
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
  for (const name of spec.helmSecretNames) {
    helmStorage[name] = uidOf(objects[`Secret/${name}`]);
  }
  const collectorPodUid = uidOf(objects[COLLECTOR_POD_KEY]);
  const complete =
    typeof namespaceUid === 'string' &&
    namespaceUid.length > 0 &&
    spec.workloadKeys.every((key) => typeof workloads[key] === 'string') &&
    spec.pvcNames.every(
      (name) =>
        typeof claims[name] === 'string' && typeof volumes[name] === 'string',
    ) &&
    typeof grafanaAdminUid === 'string' &&
    spec.helmSecretNames.every((name) => typeof helmStorage[name] === 'string') &&
    typeof collectorPodUid === 'string';
  return {
    complete,
    artifactId: spec.artifactId,
    historyId: spec.historyId,
    keys: {
      workloads: [...spec.workloadKeys],
      claims: [...spec.pvcNames],
      helm: [...spec.helmSecretNames],
    },
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
  if (
    before.artifactId !== after.artifactId ||
    before.historyId !== after.historyId ||
    JSON.stringify(before.keys) !== JSON.stringify(after.keys)
  ) {
    return { ok: false, reasonCode: 'history-changed' };
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
  for (const name of before.keys.helm) {
    if (before.helmStorage[name] !== after.helmStorage[name]) {
      return { ok: false, reasonCode: 'helm-storage-uid-changed' };
    }
  }
  for (const key of before.keys.workloads) {
    if (before.workloads[key] !== after.workloads[key]) {
      return { ok: false, reasonCode: 'workload-uid-changed' };
    }
  }
  for (const claimName of before.keys.claims) {
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
export function assessHealthStructuralObservation(
  observation,
  spec = LEGACY_SPEC,
) {
  if (!observationMatchesSpec(observation, spec)) {
    return { ok: false, reasonCode: 'history-changed' };
  }
  if (observation?.structuralReady !== undefined) {
    // Operational observation: structural readiness of the matched exact
    // artifact/history, never desired convergence.
    if (observation.structuralReady !== true || observation.pending === true) {
      return {
        ok: false,
        reasonCode: observation.pending ? 'pending-refused' : 'not-ready',
      };
    }
  } else if (
    observation?.reasonCode !== 'ready' ||
    observation?.state !== 'ready'
  ) {
    return {
      ok: false,
      reasonCode: observation?.reasonCode ?? 'not-ready',
    };
  }
  const objects = observation?.snapshot?.objects ?? {};
  for (const key of spec.workloadKeys) {
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
  for (const claimName of spec.pvcNames) {
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
    ...(input.admission
      ? {
          artifactId: input.admission.artifactId ?? null,
          historyId: input.admission.historyId ?? null,
          claim: PROOF_CLAIMS[input.gate] ?? null,
          e2Coverage: false,
          disruptiveCertification: false,
        }
      : {}),
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
 *   classifyAdmission?: (session: object) => Promise<object> | object,
 *   e2Enabled?: boolean | ((profile: string) => boolean),
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

  if (input.gate === 'partial-install') {
    const e2 =
      typeof input.e2Enabled === 'function'
        ? input.e2Enabled(input.profile)
        : (input.e2Enabled ?? sourceEnablesE2(input.profile));
    if (e2) {
      return {
        ok: false,
        phase: 'refused',
        reasonCode: 'unsupported-evolution',
        completed: false,
        cleanup: false,
      };
    }
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
  /** @type {object | null} */
  let admissionForReceipt = null;

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
      admission: admissionForReceipt,
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
      admission: null,
    };

    if (ADMISSION_GATES.has(input.gate)) {
      const classify = input.classifyAdmission;
      if (typeof classify !== 'function') {
        if (E1_ONLY_ADMISSION_GATES.has(input.gate)) {
          reasonCode = 'admission-required';
          return { ok: false, phase: 'admission', reasonCode };
        }
      } else {
        /**
         * Classify the installed state, decide, and bind the matched
         * descriptor/history. Repeated under custody with identity recheck.
         */
        const admit = async (phase) => {
          if (
            refusePhaseStart(remainingWorkMs(), HEALTH_PHASE_BUDGET_MS.observe)
          ) {
            return { ok: false, reasonCode: 'observe-budget', phase };
          }
          const checked = recheck(identity, {
            now: clock.now,
            deadline: clock.now() + Math.min(15_000, remainingWorkMs()),
            expectedNamespaceUid: identity.tuple.targetNamespaceUid,
          });
          if (!checked.ok) {
            return {
              ok: false,
              phase: 'identity-recheck',
              reasonCode:
                checked.reason === 'namespace-uid-changed'
                  ? 'namespace-uid-changed'
                  : checked.reason === 'context-changed'
                    ? 'context-not-canonical-dev'
                    : 'cluster-uid-changed',
            };
          }
          const decision = decideProofAdmission(
            input.gate,
            await classify(session),
          );
          return { ...decision, phase };
        };
        const first = await admit('admission');
        if (!first.ok) {
          reasonCode = first.reasonCode;
          return { ok: false, phase: first.phase, reasonCode };
        }
        const second = await admit('admission-repeat');
        if (!second.ok) {
          reasonCode = second.reasonCode;
          return { ok: false, phase: second.phase, reasonCode };
        }
        if (
          second.admission.artifactId !== first.admission.artifactId ||
          second.admission.historyId !== first.admission.historyId
        ) {
          reasonCode = 'admission-identity-changed';
          return { ok: false, phase: 'admission-repeat', reasonCode };
        }
        session.admission = second.admission;
        admissionForReceipt = second.admission;
        /** Re-run classification under a held custody and compare identity. */
        session.reclassifyAdmission = async () => {
          const again = await admit('admission-custody');
          if (
            !again.ok ||
            again.admission.artifactId !== session.admission.artifactId ||
            again.admission.historyId !== session.admission.historyId
          ) {
            return {
              ok: false,
              reasonCode: again.ok
                ? 'admission-identity-changed'
                : again.reasonCode,
            };
          }
          return { ok: true, admission: again.admission };
        };
      }
    }

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
      const developerHistory = await recheckAdmissionUnchanged(session);
      if (!developerHistory.ok) {
        reasonCode = developerHistory.reasonCode;
        cleanupOk = developer.cleanup === true;
        return { ok: false, phase: 'history-recheck', reasonCode };
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
      const signalsHistory = await recheckAdmissionUnchanged(session);
      if (!signalsHistory.ok) {
        reasonCode = signalsHistory.reasonCode;
        return { ok: false, phase: 'history-recheck', reasonCode };
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
    let stableSpec = LEGACY_SPEC;
    if (session.admission) {
      const derived = deriveStableSpec(session.admission);
      if (!derived.ok) {
        reasonCode = derived.reasonCode;
        return { ok: false, phase: 'observe', reasonCode };
      }
      stableSpec = derived.spec;
    }
    const primary = await observe(session);
    const structural = assessHealthStructuralObservation(primary, stableSpec);
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

    const before = extractStableIdentities(primary, stableSpec);

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
    const repeatStructural = assessHealthStructuralObservation(
      repeated,
      stableSpec,
    );
    if (!repeatStructural.ok) {
      reasonCode = repeatStructural.reasonCode ?? 'repeat-not-ready';
      return { ok: false, phase: 'repeat', reasonCode };
    }
    const after = extractStableIdentities(repeated, stableSpec);
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
