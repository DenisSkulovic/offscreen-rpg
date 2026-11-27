import { Buffer } from 'node:buffer';
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';

import { readPlatformProfile } from '../common/profile.mjs';
import { ownedChildResult, startOwnedChild } from './forward.mjs';

export const DEFAULT_LOCK_WAIT_SEC = 30;
export const DEFAULT_KILL_GRACE_MS = 5_000;
export const OBSERVABILITY_SERVICE = 'observability';
const LOCK_PHASE_MS = 10_000;
const PENDING_LIMIT = 256 * 1024;
const TUPLE_FIELDS = [
  'profileId',
  'contextName',
  'clusterName',
  'port',
  'dockerContext',
  'dockerControlPlaneId',
  'dockerEndpointHost',
  'caSha256',
  'kubeSystemUid',
  'baselineUid',
  'targetNamespaceUid',
];

/**
 * @returns {string}
 */
export function resolveProductionStateRoot() {
  return join(homedir(), '.local', 'state', 'offscreen-rpg');
}

/**
 * @param {string} stateRoot
 * @param {string} contextName
 */
export function custodyPaths(stateRoot, contextName) {
  const lockDirectory = join(stateRoot, 'platform-locks');
  return {
    lockDirectory,
    lockPath: join(
      lockDirectory,
      `${contextName}-${OBSERVABILITY_SERVICE}.lock`,
    ),
    pendingPath: join(
      lockDirectory,
      `${contextName}-${OBSERVABILITY_SERVICE}.pending`,
    ),
  };
}

/**
 * @param {string} contextName
 */
function assertProfileContext(contextName) {
  if (typeof contextName !== 'string' || contextName.length === 0) {
    throw new Error('refused: observability context is not a profile context');
  }
  const allowed = [
    readPlatformProfile('dev').contextName,
    readPlatformProfile('release').contextName,
  ];
  if (!allowed.includes(contextName)) {
    throw new Error('refused: observability context is not a profile context');
  }
}

/**
 * @param {import('node:fs').Stats} stat
 * @param {boolean} expectDirectory
 */
function assertOwnerOnly(stat, expectDirectory) {
  if (expectDirectory ? !stat.isDirectory() : !stat.isFile()) {
    throw new Error('refused: unexpected observability custody node type');
  }
  if (stat.isSymbolicLink()) {
    throw new Error('refused: observability custody path is a symlink');
  }
  if (stat.uid !== process.getuid()) {
    throw new Error('refused: observability custody path has unexpected owner');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('refused: observability custody path is not owner-private');
  }
}

/**
 * @param {string} value
 * @param {number} max
 */
function boundedText(value, max) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    ![...value].some((character) => character.charCodeAt(0) <= 31)
  );
}

/**
 * @param {unknown} value
 */
function stable(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stable(item)).join(',')}]`;
  }
  if (value != null && typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * @param {unknown} value
 */
function isUtcStamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

/**
 * @param {unknown} tuple
 * @param {string} contextName
 * @param {string} phase
 */
function validateTuple(tuple, contextName, phase) {
  if (tuple == null || typeof tuple !== 'object' || Array.isArray(tuple)) {
    throw new Error('refused: observability tuple is invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (tuple);
  const keys = Object.keys(value);
  if (
    keys.length !== TUPLE_FIELDS.length ||
    TUPLE_FIELDS.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability tuple is invalid');
  }
  const profileId = value.profileId;
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error('refused: observability tuple is invalid');
  }
  const profile = readPlatformProfile(profileId);
  if (
    value.contextName !== contextName ||
    value.contextName !== profile.contextName ||
    value.clusterName !== profile.clusterName ||
    !Number.isInteger(value.port) ||
    value.port < 1 ||
    value.port > 65535
  ) {
    throw new Error('refused: observability tuple is invalid');
  }
  for (const key of [
    'dockerContext',
    'dockerControlPlaneId',
    'dockerEndpointHost',
    'kubeSystemUid',
    'baselineUid',
  ]) {
    if (!boundedText(value[key], 256)) {
      throw new Error('refused: observability tuple is invalid');
    }
  }
  if (
    typeof value.caSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.caSha256)
  ) {
    throw new Error('refused: observability tuple is invalid');
  }
  const uid = value.targetNamespaceUid;
  const uidOk = typeof uid === 'string' && boundedText(uid, 128);
  if (phase === 'namespace') {
    if (uid != null && !uidOk) {
      throw new Error('refused: observability tuple is invalid');
    }
  } else if (!uidOk) {
    throw new Error('refused: observability namespace is not bound');
  }
  return {
    profileId,
    contextName: value.contextName,
    clusterName: value.clusterName,
    port: value.port,
    dockerContext: value.dockerContext,
    dockerControlPlaneId: value.dockerControlPlaneId,
    dockerEndpointHost: value.dockerEndpointHost,
    caSha256: value.caSha256,
    kubeSystemUid: value.kubeSystemUid,
    baselineUid: value.baselineUid,
    targetNamespaceUid: uid == null ? null : uid,
  };
}

/**
 * @param {unknown} record
 * @param {string} contextName
 */
function classifyPending(record, contextName) {
  if (record == null || typeof record !== 'object' || Array.isArray(record)) {
    return 'invalid';
  }
  const value = /** @type {Record<string, unknown>} */ (record);
  if (value.schema === undefined) {
    const keys = Object.keys(value);
    const legacy = [
      'operationId',
      'service',
      'context',
      'phase',
      'tuple',
      'start',
    ];
    const legacyOk =
      keys.length === legacy.length &&
      legacy.every((key) => keys.includes(key)) &&
      typeof value.operationId === 'string' &&
      value.operationId.length > 0 &&
      value.service === OBSERVABILITY_SERVICE &&
      value.context === contextName &&
      typeof value.phase === 'string' &&
      value.phase.length > 0 &&
      typeof value.start === 'string' &&
      value.tuple != null &&
      typeof value.tuple === 'object' &&
      !Array.isArray(value.tuple);
    return legacyOk ? 'legacy' : 'invalid';
  }
  try {
    validateStoredEnsure(value, contextName);
    return 'ensure';
  } catch {
    try {
      validateStoredUpgrade(value, contextName);
      return 'upgrade';
    } catch {
      try {
        validateStoredPersistence(value, contextName);
        return 'persistence';
      } catch {
        try {
          validateStoredOutage(value, contextName);
          return 'outage';
        } catch {
          return 'invalid';
        }
      }
    }
  }
}

/**
 * @param {unknown} kind
 */
function isDurableKind(kind) {
  return (
    kind === 'ensure' ||
    kind === 'upgrade' ||
    kind === 'persistence' ||
    kind === 'outage'
  );
}

const DISRUPTION_CLAIM_NAMES = [
  'obs-prometheus',
  'storage-obs-loki-0',
  'storage-obs-tempo-0',
];

const WORKLOAD_UID_KEYS = [
  'Deployment/obs-prometheus',
  'StatefulSet/obs-loki',
  'StatefulSet/obs-tempo',
  'Deployment/obs-collector',
  'Deployment/obs-grafana',
];

const PERSISTENCE_RESTARTS = [
  {
    step: 0,
    phase: 'restart-prometheus',
    kind: 'Deployment',
    name: 'obs-prometheus',
  },
  {
    step: 1,
    phase: 'restart-loki',
    kind: 'StatefulSet',
    name: 'obs-loki',
  },
  {
    step: 2,
    phase: 'restart-tempo',
    kind: 'StatefulSet',
    name: 'obs-tempo',
  },
];

const OUTAGE_OUTCOMES = [
  'planned',
  'confirmed',
  'unknown',
  'not-attempted',
];

/**
 * @param {unknown} value
 */
function positiveSafeInteger(value) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    Number.isSafeInteger(value)
  );
}

/**
 * @param {unknown} baseline
 */
function validateDisruptionBaseline(baseline) {
  if (
    baseline == null ||
    typeof baseline !== 'object' ||
    Array.isArray(baseline)
  ) {
    throw new Error('refused: observability disruption baseline is invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (baseline);
  const keys = ['collectorPodUid', 'workloadUids', 'claims'];
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability disruption baseline is invalid');
  }
  if (!boundedText(value.collectorPodUid, 128)) {
    throw new Error('refused: observability disruption baseline is invalid');
  }
  const workloadUids = value.workloadUids;
  if (
    workloadUids == null ||
    typeof workloadUids !== 'object' ||
    Array.isArray(workloadUids)
  ) {
    throw new Error('refused: observability disruption baseline is invalid');
  }
  const workload = /** @type {Record<string, unknown>} */ (workloadUids);
  const workloadKeys = Object.keys(workload);
  if (
    workloadKeys.length !== WORKLOAD_UID_KEYS.length ||
    WORKLOAD_UID_KEYS.some((key) => !Object.hasOwn(workload, key)) ||
    WORKLOAD_UID_KEYS.some((key) => !boundedText(workload[key], 128))
  ) {
    throw new Error('refused: observability disruption baseline is invalid');
  }
  if (!Array.isArray(value.claims) || value.claims.length !== 3) {
    throw new Error('refused: observability disruption baseline is invalid');
  }
  const claims = value.claims.map((claim) => {
    if (claim == null || typeof claim !== 'object' || Array.isArray(claim)) {
      throw new Error('refused: observability disruption claim is invalid');
    }
    const row = /** @type {Record<string, unknown>} */ (claim);
    const claimKeys = ['name', 'uid', 'volumeName', 'pvUid', 'claimRef'];
    if (
      Object.keys(row).length !== claimKeys.length ||
      claimKeys.some((key) => !Object.hasOwn(row, key))
    ) {
      throw new Error('refused: observability disruption claim is invalid');
    }
    if (
      !boundedText(row.name, 128) ||
      !boundedText(row.uid, 128) ||
      !boundedText(row.volumeName, 256) ||
      !boundedText(row.pvUid, 128)
    ) {
      throw new Error('refused: observability disruption claim is invalid');
    }
    const claimRef = row.claimRef;
    if (
      claimRef == null ||
      typeof claimRef !== 'object' ||
      Array.isArray(claimRef)
    ) {
      throw new Error('refused: observability disruption claimRef is invalid');
    }
    const ref = /** @type {Record<string, unknown>} */ (claimRef);
  const refKeys = ['name', 'namespace', 'uid'];
    if (
      Object.keys(ref).length !== refKeys.length ||
      refKeys.some((key) => !Object.hasOwn(ref, key)) ||
      refKeys.some((key) => !boundedText(ref[key], 256))
    ) {
      throw new Error('refused: observability disruption claimRef is invalid');
    }
    return {
      name: row.name,
      uid: row.uid,
      volumeName: row.volumeName,
      pvUid: row.pvUid,
      claimRef: {
        name: ref.name,
        namespace: ref.namespace,
        uid: ref.uid,
      },
    };
  });
  const expectedNames = [...DISRUPTION_CLAIM_NAMES].sort((left, right) =>
    left.localeCompare(right),
  );
  for (let index = 0; index < expectedNames.length; index += 1) {
    if (claims[index]?.name !== expectedNames[index]) {
      throw new Error('refused: observability disruption claims are invalid');
    }
  }
  return {
    collectorPodUid: value.collectorPodUid,
    workloadUids: globalThis.structuredClone(workload),
    claims,
  };
}

/**
 * @param {unknown} intent
 * @param {ReturnType<typeof validateDisruptionBaseline>} baseline
 * @param {number} step
 */
function validatePersistenceIntent(intent, baseline, step) {
  if (intent == null || typeof intent !== 'object' || Array.isArray(intent)) {
    throw new Error('refused: observability persistence intent is invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (intent);
  const keys = [
    'kind',
    'name',
    'uid',
    'resourceVersion',
    'generation',
    'replicas',
  ];
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability persistence intent is invalid');
  }
  const target = PERSISTENCE_RESTARTS[step];
  if (target == null) {
    throw new Error('refused: observability persistence step is invalid');
  }
  if (value.kind !== target.kind || value.name !== target.name) {
    throw new Error('refused: observability persistence intent is invalid');
  }
  const workloadKey = `${target.kind}/${target.name}`;
  if (value.uid !== baseline.workloadUids[workloadKey]) {
    throw new Error('refused: observability persistence intent is invalid');
  }
  if (
    !boundedText(value.resourceVersion, 128) ||
    !positiveSafeInteger(value.generation) ||
    value.replicas !== 1
  ) {
    throw new Error('refused: observability persistence intent is invalid');
  }
  return {
    kind: value.kind,
    name: value.name,
    uid: value.uid,
    resourceVersion: value.resourceVersion,
    generation: value.generation,
    replicas: 1,
  };
}

/**
 * @param {unknown} details
 * @param {string} phase
 */
function validatePersistenceDetails(details, phase) {
  if (
    details == null ||
    typeof details !== 'object' ||
    Array.isArray(details)
  ) {
    throw new Error('refused: observability persistence details are invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (details);
  const keys = ['baseline', 'step', 'intent'];
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability persistence details are invalid');
  }
  if (
    !Number.isInteger(value.step) ||
    value.step < 0 ||
    value.step > 2
  ) {
    throw new Error('refused: observability persistence step is invalid');
  }
  const baseline = validateDisruptionBaseline(value.baseline);
  const intent = validatePersistenceIntent(value.intent, baseline, value.step);
  const target = PERSISTENCE_RESTARTS[value.step];
  if (phase !== target.phase) {
    throw new Error('refused: observability persistence phase mismatch');
  }
  return {
    baseline,
    step: value.step,
    intent,
  };
}

/**
 * @param {unknown} value
 */
function validateOutageWrite(value) {
  if (
    value == null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('refused: observability outage write state is invalid');
  }
  const row = /** @type {Record<string, unknown>} */ (value);
  const keys = ['resourceVersion', 'generation', 'outcome'];
  if (
    Object.keys(row).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(row, key)) ||
    !positiveSafeInteger(row.generation) ||
    !boundedText(row.resourceVersion, 128) ||
    typeof row.outcome !== 'string' ||
    !OUTAGE_OUTCOMES.includes(row.outcome)
  ) {
    throw new Error('refused: observability outage write state is invalid');
  }
}

/**
 * @param {unknown} details
 * @param {string} phase
 */
function validateOutageDetails(details, phase) {
  if (details == null || typeof details !== 'object' || Array.isArray(details)) {
    throw new Error('refused: observability outage details are invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (details);
  const keys = ['baseline', 'tempo', 'down', 'restore'];
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability outage details are invalid');
  }
  const baseline = validateDisruptionBaseline(value.baseline);
  const tempo = value.tempo;
  if (tempo == null || typeof tempo !== 'object' || Array.isArray(tempo)) {
    throw new Error('refused: observability outage tempo is invalid');
  }
  const tempoRecord = /** @type {Record<string, unknown>} */ (tempo);
  if (
    Object.keys(tempoRecord).length !== 2 ||
    !boundedText(tempoRecord.uid, 128) ||
    tempoRecord.originalReplicas !== 1
  ) {
    throw new Error('refused: observability outage tempo is invalid');
  }
  if (tempoRecord.uid !== baseline.workloadUids['StatefulSet/obs-tempo']) {
    throw new Error('refused: observability outage tempo is invalid');
  }
  const down = value.down;
  if (down == null || typeof down !== 'object' || Array.isArray(down)) {
    throw new Error('refused: observability outage down is invalid');
  }
  validateOutageWrite(down);
  const restore = value.restore;
  if (phase === 'outage-down') {
    if (restore != null) {
      throw new Error('refused: observability outage restore must be null');
    }
  } else if (phase === 'outage-restore') {
    const downRecord = /** @type {Record<string, unknown>} */ (down);
    if (
      downRecord.outcome !== 'confirmed' &&
      downRecord.outcome !== 'unknown' &&
      downRecord.outcome !== 'planned'
    ) {
      throw new Error('refused: observability outage down is not confirmed');
    }
    if (restore == null || typeof restore !== 'object' || Array.isArray(restore)) {
      throw new Error('refused: observability outage restore is invalid');
    }
    validateOutageWrite(restore);
  } else {
    throw new Error('refused: observability outage phase is invalid');
  }
  return {
    baseline,
    tempo: {
      uid: tempoRecord.uid,
      originalReplicas: 1,
    },
    down: globalThis.structuredClone(down),
    restore: restore == null ? null : globalThis.structuredClone(restore),
  };
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} contextName
 */
function validateStoredPersistence(value, contextName) {
  const keys = Object.keys(value);
  const expected = [
    'schema',
    'operationId',
    'service',
    'context',
    'start',
    'operation',
    'phase',
    'tuple',
    'details',
  ];
  if (
    keys.length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key)) ||
    value.schema !== 2 ||
    value.operation !== 'persistence' ||
    value.service !== OBSERVABILITY_SERVICE ||
    value.context !== contextName ||
    typeof value.operationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.operationId,
    ) ||
    !isUtcStamp(value.start) ||
    typeof value.phase !== 'string' ||
    !PERSISTENCE_RESTARTS.some((row) => row.phase === value.phase)
  ) {
    throw new Error('refused: observability pending record is invalid');
  }
  validatePersistenceDetails(value.details, value.phase);
  validateTuple(value.tuple, contextName, value.phase);
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} contextName
 */
function validateStoredOutage(value, contextName) {
  const keys = Object.keys(value);
  const expected = [
    'schema',
    'operationId',
    'service',
    'context',
    'start',
    'operation',
    'phase',
    'tuple',
    'details',
  ];
  if (
    keys.length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key)) ||
    value.schema !== 2 ||
    value.operation !== 'outage' ||
    value.service !== OBSERVABILITY_SERVICE ||
    value.context !== contextName ||
    typeof value.operationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.operationId,
    ) ||
    !isUtcStamp(value.start) ||
    typeof value.phase !== 'string' ||
    (value.phase !== 'outage-down' && value.phase !== 'outage-restore')
  ) {
    throw new Error('refused: observability pending record is invalid');
  }
  validateOutageDetails(value.details, value.phase);
  validateTuple(value.tuple, contextName, value.phase);
}

/**
 * @param {{ tuple: object, snapshotPath: string, contextName: string, namespace: string }} identity
 * @param {{ uid: string, resourceVersion: string, generation: number, replicas: number }} fresh
 */
function tempoRestoreArgv(identity, fresh) {
  const patch = JSON.stringify([
    { op: 'test', path: '/metadata/uid', value: fresh.uid },
    {
      op: 'test',
      path: '/metadata/resourceVersion',
      value: fresh.resourceVersion,
    },
    { op: 'test', path: '/metadata/generation', value: fresh.generation },
    { op: 'test', path: '/spec/replicas', value: 0 },
    { op: 'replace', path: '/spec/replicas', value: 1 },
  ]);
  return [
    'patch',
    'statefulset',
    'obs-tempo',
    '--kubeconfig',
    identity.snapshotPath,
    '--context',
    identity.contextName,
    '-n',
    identity.namespace,
    '--type=json',
    '-p',
    patch,
    '-o',
    'json',
  ];
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} contextName
 */
function validateStoredEnsure(value, contextName) {
  const keys = Object.keys(value);
  const expected = [
    'schema',
    'operationId',
    'service',
    'context',
    'start',
    'operation',
    'phase',
    'tuple',
    'details',
  ];
  if (
    keys.length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key)) ||
    value.schema !== 2 ||
    value.operation !== 'ensure' ||
    value.service !== OBSERVABILITY_SERVICE ||
    value.context !== contextName ||
    typeof value.operationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.operationId,
    ) ||
    !isUtcStamp(value.start) ||
    typeof value.phase !== 'string' ||
    !boundedText(value.phase, 64) ||
    value.details == null ||
    typeof value.details !== 'object' ||
    Array.isArray(value.details) ||
    Object.keys(value.details).length !== 0
  ) {
    throw new Error('refused: observability pending record is invalid');
  }
  validateTuple(value.tuple, contextName, value.phase);
}

/**
 * @param {string} phase
 */
function assertPhase(phase) {
  if (typeof phase !== 'string' || !boundedText(phase, 64)) {
    throw new Error('refused: observability phase is invalid');
  }
}

/**
 * @param {unknown} details
 */
const UPGRADE_DETAIL_KEYS = [
  'desiredRelaySha256',
  'desiredRevision',
  'oldRelaySha256',
  'oldRevision',
  'preservation',
];

/**
 * @param {unknown} details
 */
function validateUpgradeDetails(details) {
  if (details == null || typeof details !== 'object' || Array.isArray(details)) {
    throw new Error('refused: observability upgrade details are invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (details);
  const keys = Object.keys(value);
  if (
    keys.length !== UPGRADE_DETAIL_KEYS.length ||
    UPGRADE_DETAIL_KEYS.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability upgrade details are invalid');
  }
  if (value.oldRevision !== 1 || value.desiredRevision !== 2) {
    throw new Error('refused: observability upgrade details are invalid');
  }
  for (const key of ['oldRelaySha256', 'desiredRelaySha256']) {
    if (typeof value[key] !== 'string' || !/^[0-9a-f]{64}$/.test(value[key])) {
      throw new Error('refused: observability upgrade details are invalid');
    }
  }
  validatePreservation(value.preservation);
  return {
    oldRevision: 1,
    desiredRevision: 2,
    oldRelaySha256: value.oldRelaySha256,
    desiredRelaySha256: value.desiredRelaySha256,
    preservation: globalThis.structuredClone(value.preservation),
  };
}

/**
 * @param {unknown} preservation
 */
function validatePreservation(preservation) {
  if (
    preservation == null ||
    typeof preservation !== 'object' ||
    Array.isArray(preservation)
  ) {
    throw new Error('refused: observability upgrade preservation is invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (preservation);
  const keys = [
    'backends',
    'claims',
    'collector',
    'grafanaSecretUid',
    'namespaceUid',
  ];
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key)) ||
    typeof value.namespaceUid !== 'string' ||
    typeof value.grafanaSecretUid !== 'string' ||
    !Array.isArray(value.claims) ||
    value.claims.length !== 3
  ) {
    throw new Error('refused: observability upgrade preservation is invalid');
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} contextName
 */
function validateStoredUpgrade(value, contextName) {
  const keys = Object.keys(value);
  const expected = [
    'schema',
    'operationId',
    'service',
    'context',
    'start',
    'operation',
    'phase',
    'tuple',
    'details',
  ];
  if (
    keys.length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key)) ||
    value.schema !== 2 ||
    value.operation !== 'upgrade' ||
    value.phase !== 'collector-upgrade' ||
    value.service !== OBSERVABILITY_SERVICE ||
    value.context !== contextName ||
    typeof value.operationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.operationId,
    ) ||
    !isUtcStamp(value.start)
  ) {
    throw new Error('refused: observability pending record is invalid');
  }
  validateUpgradeDetails(value.details);
  validateTuple(value.tuple, contextName, value.phase);
}

function assertEmptyDetails(details) {
  if (details == null) {
    return;
  }
  if (
    typeof details !== 'object' ||
    Array.isArray(details) ||
    Object.keys(details).length !== 0
  ) {
    throw new Error('refused: ensure details must be empty');
  }
}

/**
 * @param {string} pendingPath
 * @param {string} contextName
 */
function inspectPending(pendingPath, contextName) {
  const parent = dirname(pendingPath);
  let parentStat;
  try {
    parentStat = lstatSync(parent);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {
        pending: false,
        valid: true,
        kind: 'absent',
        record: null,
        identity: null,
      };
    }
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  }
  if (
    parentStat.isSymbolicLink() ||
    !parentStat.isDirectory() ||
    parentStat.uid !== process.getuid() ||
    (parentStat.mode & 0o077) !== 0
  ) {
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  }

  let fd;
  try {
    fd = openSync(pendingPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {
        pending: false,
        valid: true,
        kind: 'absent',
        record: null,
        identity: null,
      };
    }
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  }
  try {
    const before = fstatSync(fd);
    const pathBefore = lstatSync(pendingPath);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.size > PENDING_LIMIT ||
      before.uid !== process.getuid() ||
      (before.mode & 0o077) !== 0 ||
      pathBefore.isSymbolicLink() ||
      pathBefore.dev !== before.dev ||
      pathBefore.ino !== before.ino ||
      pathBefore.nlink !== 1
    ) {
      return {
        pending: true,
        valid: false,
        kind: 'invalid',
        record: null,
        identity: null,
      };
    }
    const buffer = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const read = readSync(fd, buffer, offset, buffer.length - offset, offset);
      if (read === 0) {
        break;
      }
      offset += read;
    }
    const after = fstatSync(fd);
    const pathAfter = lstatSync(pendingPath);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.mode !== before.mode ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.nlink !== 1 ||
      offset !== before.size
    ) {
      return {
        pending: true,
        valid: false,
        kind: 'invalid',
        record: null,
        identity: null,
      };
    }
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
      return {
        pending: true,
        valid: false,
        kind: 'invalid',
        record: null,
        identity: null,
      };
    }
    const kind = classifyPending(parsed, contextName);
    if (kind === 'invalid') {
      return {
        pending: true,
        valid: false,
        kind,
        record: null,
        identity: null,
      };
    }
    return {
      pending: true,
      valid: true,
      kind,
      record: parsed,
      identity: { dev: before.dev, ino: before.ino },
    };
  } catch {
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  } finally {
    closeSync(fd);
  }
}

/**
 * @param {string} contextName
 * @param {{ stateRoot?: string }} [deps]
 * @returns {{ pending: boolean, valid: boolean }}
 */
export function readPending(contextName, deps = {}) {
  assertProfileContext(contextName);
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const { pendingPath } = custodyPaths(stateRoot, contextName);
  const inspected = inspectPending(pendingPath, contextName);
  return { pending: inspected.pending, valid: inspected.valid };
}

/**
 * @param {number} fd
 * @param {string} lockPath
 */
function assertLockIdentity(fd, lockPath) {
  const opened = fstatSync(fd);
  assertOwnerOnly(opened, false);
  const pathStat = lstatSync(lockPath);
  if (pathStat.isSymbolicLink()) {
    throw new Error('refused: observability lock path is a symlink');
  }
  if (
    opened.dev !== pathStat.dev ||
    opened.ino !== pathStat.ino ||
    pathStat.nlink !== 1 ||
    opened.nlink !== 1
  ) {
    throw new Error(
      'refused: observability lock file identity mismatch or replacement detected',
    );
  }
}

/**
 * @param {string} directory
 * @param {{ dev: number, ino: number }} identity
 */
function assertDirectoryIdentity(directory, identity) {
  const stat = lstatSync(directory);
  if (stat.isSymbolicLink()) {
    throw new Error('refused: observability lock directory is a symlink');
  }
  assertOwnerOnly(stat, true);
  if (stat.dev !== identity.dev || stat.ino !== identity.ino) {
    throw new Error('refused: observability lock directory identity changed');
  }
}

/**
 * @param {string} directory
 * @param {{ fault?: string | null }} [deps]
 */
function syncDirectory(directory, deps = {}) {
  if (deps.fault === 'fsync') {
    deps.fault = null;
    throw new Error('refused: observability directory fsync failed');
  }
  const fd = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * @param {number} fd
 * @param {{ fault?: string | null }} [deps]
 */
function syncFile(fd, deps = {}) {
  if (deps.fault === 'fsync') {
    deps.fault = null;
    throw new Error('refused: observability file fsync failed');
  }
  fsyncSync(fd);
}

/**
 * @param {string} pendingPath
 * @param {Record<string, unknown>} record
 * @param {{ fault?: string | null }} deps
 */
function createPending(pendingPath, record, deps) {
  const body = Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
  const fd = openSync(
    pendingPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeSync(fd, body);
    syncFile(fd, deps);
  } finally {
    closeSync(fd);
  }
  syncDirectory(dirname(pendingPath), deps);
}

/**
 * @param {string} pendingPath
 * @param {Record<string, unknown>} record
 * @param {{ dev: number, ino: number }} owned
 * @param {string} contextName
 * @param {{ fault?: string | null }} deps
 */
function replacePending(
  pendingPath,
  previous,
  replacement,
  owned,
  contextName,
  deps,
) {
  const current = inspectPending(pendingPath, contextName);
  if (
    !isDurableKind(current.kind) ||
    current.identity?.dev !== owned.dev ||
    current.identity?.ino !== owned.ino ||
    stable(current.record) !== stable(previous)
  ) {
    throw new Error('refused: observability pending record changed');
  }
  const tempPath = join(
    dirname(pendingPath),
    `.${OBSERVABILITY_SERVICE}-${randomUUID()}.tmp`,
  );
  const body = Buffer.from(`${JSON.stringify(replacement)}\n`, 'utf8');
  let tempIdentity = null;
  const fd = openSync(
    tempPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeSync(fd, body);
    syncFile(fd, deps);
    tempIdentity = { dev: fstatSync(fd).dev, ino: fstatSync(fd).ino };
  } catch (error) {
    closeSync(fd);
    removeUnusedTemp(tempPath, tempIdentity);
    throw error;
  }
  closeSync(fd);
  const again = inspectPending(pendingPath, contextName);
  if (
    !isDurableKind(again.kind) ||
    again.identity?.dev !== owned.dev ||
    again.identity?.ino !== owned.ino ||
    stable(again.record) !== stable(previous)
  ) {
    removeUnusedTemp(tempPath, tempIdentity);
    throw new Error('refused: observability pending record changed');
  }
  if (deps.fault === 'rename') {
    deps.fault = null;
    removeUnusedTemp(tempPath, tempIdentity);
    throw new Error('refused: observability pending rename failed');
  }
  try {
    renameSync(tempPath, pendingPath);
  } catch (error) {
    removeUnusedTemp(tempPath, tempIdentity);
    throw error;
  }
  syncDirectory(dirname(pendingPath), deps);
  const verified = inspectPending(pendingPath, contextName);
  if (
    !isDurableKind(verified.kind) ||
    stable(verified.record) !== stable(replacement)
  ) {
    throw new Error('refused: observability pending record changed');
  }
  return verified.identity;
}

/**
 * @param {string} tempPath
 * @param {{ dev: number, ino: number } | null} identity
 */
function removeUnusedTemp(tempPath, identity) {
  if (identity == null) {
    return;
  }
  try {
    const stat = lstatSync(tempPath);
    if (
      stat.isSymbolicLink() ||
      stat.dev !== identity.dev ||
      stat.ino !== identity.ino
    ) {
      return;
    }
    unlinkSync(tempPath);
  } catch {
    // An ambiguous temp name is left in place rather than deleting a replacement.
  }
}

/**
 * @param {number} lockDeadline
 * @param {() => number} now
 * @param {number} killGraceMs
 * @param {number} lockWaitSec
 */
function flockWaitSeconds(lockDeadline, now, killGraceMs, lockWaitSec) {
  const availableMs = Math.floor(lockDeadline - now() - killGraceMs);
  if (availableMs <= 0) {
    return null;
  }
  const clamped = Math.min(availableMs, Math.floor(lockWaitSec * 1000));
  if (clamped <= 0) {
    return null;
  }
  return (clamped / 1000).toFixed(3);
}

/**
 * @param {string} contextName
 * @param {string} lockPath
 * @param {string} mode
 * @param {{
 *   now?: () => number,
 *   deadline?: number,
 *   signal?: AbortSignal,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 * }} deps
 */
async function acquireLockFd(contextName, lockPath, mode, deps) {
  const lockDirectory = dirname(lockPath);
  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const directoryStat = lstatSync(lockDirectory);
  if (directoryStat.isSymbolicLink()) {
    throw new Error('refused: observability lock directory is a symlink');
  }
  assertOwnerOnly(directoryStat, true);
  const directoryIdentity = { dev: directoryStat.dev, ino: directoryStat.ino };
  let fd;
  try {
    fd = openSync(
      lockPath,
      constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
      0o600,
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'ELOOP' || error.code === 'EOPNOTSUPP')
    ) {
      throw new Error('refused: observability lock path is a symlink', {
        cause: error,
      });
    }
    throw error;
  }
  const now = deps.now ?? (() => performance.now());
  const killGraceMs = deps.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const lockWaitSec = deps.lockWaitSec ?? DEFAULT_LOCK_WAIT_SEC;
  const phaseStart = now();
  const lockDeadline = Math.min(
    deps.deadline ?? phaseStart + LOCK_PHASE_MS,
    phaseStart + LOCK_PHASE_MS,
  );
  try {
    assertLockIdentity(fd, lockPath);
    assertDirectoryIdentity(lockDirectory, directoryIdentity);
    const seconds = flockWaitSeconds(
      lockDeadline,
      now,
      killGraceMs,
      lockWaitSec,
    );
    if (seconds == null) {
      throw new Error('refused: observability lock wait is exhausted');
    }
    const held = startOwnedChild(
      'flock',
      [mode === 'shared' ? '--shared' : '--exclusive', '--wait', seconds, '3'],
      {
        fds: [fd],
        deadline: lockDeadline,
        now,
        signal: deps.signal,
        killGraceMs,
      },
    );
    const outcome = await held.outcome;
    if (outcome.closeUnconfirmed) {
      throw Object.assign(
        new Error('refused: observability lock close unconfirmed'),
        { retainFd: true },
      );
    }
    await held.closed;
    if (!outcome.ok) {
      throw new Error(
        'refused: observability lock unavailable after waiting for exclusive flock',
      );
    }
    assertLockIdentity(fd, lockPath);
    assertDirectoryIdentity(lockDirectory, directoryIdentity);
    return { fd, directoryIdentity };
  } catch (error) {
    if (!(
      error &&
      typeof error === 'object' &&
      'retainFd' in error &&
      error.retainFd
    )) {
      closeSync(fd);
    }
    throw error;
  }
}

/**
 * @param {string} contextName
 * @param {{
 *   mode?: 'exclusive' | 'shared',
 *   now?: () => number,
 *   deadline?: number,
 *   stateRoot?: string,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 *   signal?: AbortSignal,
 *   fault?: string | null,
 * }} [deps]
 */
export async function acquireCustody(contextName, deps = {}) {
  assertProfileContext(contextName);
  const mode = deps.mode ?? 'exclusive';
  if (mode !== 'exclusive' && mode !== 'shared') {
    throw new Error('refused: observability lock mode is invalid');
  }
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const paths = custodyPaths(stateRoot, contextName);
  const before = readPending(contextName, { stateRoot });
  if (before.pending && !before.valid) {
    throw new Error(
      'refused: stale observability pending blocks mutations (invalid receipt)',
    );
  }
  if (before.pending && before.valid) {
    throw new Error(
      'refused: observability pending receipt already exists for this context',
    );
  }
  const locked = await acquireLockFd(contextName, paths.lockPath, mode, deps);
  try {
    const after = readPending(contextName, { stateRoot });
    if (after.pending && !after.valid) {
      throw new Error(
        'refused: stale observability pending blocks mutations (invalid receipt)',
      );
    }
    if (after.pending && after.valid) {
      throw new Error(
        'refused: observability pending receipt already exists for this context',
      );
    }
    return createHandle({
      contextName,
      mode,
      fd: locked.fd,
      pendingPath: paths.pendingPath,
      lockDirectory: paths.lockDirectory,
      directoryIdentity: locked.directoryIdentity,
      deps,
    });
  } catch (error) {
    closeSync(locked.fd);
    throw error;
  }
}

/**
 * @param {string} contextName
 * @param {{
 *   now?: () => number,
 *   deadline?: number,
 *   stateRoot?: string,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 *   signal?: AbortSignal,
 * }} [deps]
 */
export async function acquireProofCustody(contextName, deps = {}) {
  assertProfileContext(contextName);
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const { lockDirectory } = custodyPaths(stateRoot, contextName);
  const lockPath = join(
    lockDirectory,
    `${contextName}-${OBSERVABILITY_SERVICE}-proof.lock`,
  );
  const locked = await acquireLockFd(contextName, lockPath, 'exclusive', deps);
  return createHandle({
    contextName,
    mode: 'proof',
    fd: locked.fd,
    pendingPath: null,
    lockDirectory,
    directoryIdentity: locked.directoryIdentity,
    deps,
  });
}

/**
 * @param {{
 *   contextName: string,
 *   mode: 'exclusive' | 'shared' | 'proof',
 *   fd: number,
 *   pendingPath: string | null,
 *   lockDirectory: string,
 *   directoryIdentity: { dev: number, ino: number },
 *   deps: {
 *     fault?: string | null,
 *     startOwnedChild?: typeof startOwnedChild,
 *   },
 * }} input
 */
function createHandle(input) {
  let cancellationLatch = false;
  let authorityFailed = false;
  let closed = false;
  let closeUnconfirmed = false;
  /** @type {Record<string, unknown> | null} */
  let ownedRecord = null;
  /** @type {{ dev: number, ino: number } | null} */
  let ownedIdentity = null;
  /** @type {{ closed: Promise<unknown> } | null} */
  let activeChild = null;
  let activeSettled = true;
  const spawnOwnedChild = input.deps.startOwnedChild ?? startOwnedChild;

  const refuseClosed = () => {
    if (closed) {
      throw new Error('refused: observability custody is closed');
    }
  };
  const latch = (error) => {
    authorityFailed = true;
    throw error;
  };
  const requireMutable = () => {
    refuseClosed();
    if (input.mode !== 'exclusive' || input.pendingPath == null) {
      throw new Error('refused: shared observability custody cannot mutate');
    }
    if (cancellationLatch) {
      throw new Error('refused: observability custody is cancelled');
    }
    if (authorityFailed || closeUnconfirmed) {
      throw new Error('refused: observability custody authority failed');
    }
    assertLockIdentity(input.fd, lockPathFor(input));
    assertDirectoryIdentity(input.lockDirectory, input.directoryIdentity);
  };

  const requireLiveOwnOutage = () => {
    refuseClosed();
    if (input.mode !== 'exclusive' || input.pendingPath == null) {
      throw new Error('refused: shared observability custody cannot mutate');
    }
    if (authorityFailed || closeUnconfirmed) {
      throw new Error('refused: observability custody authority failed');
    }
    if (activeChild && !activeSettled) {
      throw new Error('refused: observability owned child is still active');
    }
    assertLockIdentity(input.fd, lockPathFor(input));
    assertDirectoryIdentity(input.lockDirectory, input.directoryIdentity);
    if (
      ownedRecord == null ||
      ownedIdentity == null ||
      ownedRecord.operation !== 'outage'
    ) {
      throw new Error('refused: observability outage pending is not owned');
    }
    const inspected = inspectPending(input.pendingPath, input.contextName);
    if (
      inspected.kind !== 'outage' ||
      inspected.identity?.dev !== ownedIdentity.dev ||
      inspected.identity?.ino !== ownedIdentity.ino ||
      stable(inspected.record) !== stable(ownedRecord)
    ) {
      authorityFailed = true;
      throw new Error('refused: observability pending record changed');
    }
  };

  const writeOwnedRecord = (next) => {
    const identity = replacePending(
      input.pendingPath,
      ownedRecord,
      next,
      ownedIdentity,
      input.contextName,
      input.deps,
    );
    ownedRecord = globalThis.structuredClone(next);
    ownedIdentity = identity;
  };

  const assertTupleImmutable = (tuple, phase) => {
    const previous = /** @type {Record<string, unknown>} */ (ownedRecord.tuple);
    const validated = validateTuple(tuple, input.contextName, phase);
    for (const key of TUPLE_FIELDS) {
      if (key === 'targetNamespaceUid') {
        continue;
      }
      if (stable(previous[key]) !== stable(validated[key])) {
        return latch(new Error('refused: observability tuple identity changed'));
      }
    }
    if (
      stable(previous.targetNamespaceUid) !== stable(validated.targetNamespaceUid)
    ) {
      const binding =
        previous.targetNamespaceUid == null &&
        typeof validated.targetNamespaceUid === 'string' &&
        phase === 'namespace';
      if (!binding) {
        return latch(
          new Error('refused: observability namespace binding changed'),
        );
      }
    }
    return validated;
  };

  /**
   * @param {{ tuple: Record<string, unknown> }} identity
   */
  const assertIdentityMatchesRecord = (identity) => {
    const recordTuple = /** @type {Record<string, unknown>} */ (
      ownedRecord.tuple
    );
    for (const key of TUPLE_FIELDS) {
      if (
        stable(identity.tuple[key]) !== stable(recordTuple[key])
      ) {
        throw new Error('refused: observability identity tuple mismatch');
      }
    }
  };

  const handle = {
    fd: input.fd,
    mode: input.mode,
    pendingPath: input.pendingPath,
    lockDirectory: input.lockDirectory,
    get cancelled() {
      return cancellationLatch;
    },
    cancel() {
      cancellationLatch = true;
      if (activeChild && !activeSettled) {
        activeChild.stop();
      }
    },
    trackChild(child) {
      refuseClosed();
      activeChild = child;
      activeSettled = false;
      child.closed.then(() => {
        if (activeChild === child) {
          activeSettled = true;
        }
      });
    },
    noteCloseUnconfirmed() {
      closeUnconfirmed = true;
      authorityFailed = true;
    },
    close() {
      if (closed) {
        return;
      }
      if (activeChild && !activeSettled) {
        throw new Error('refused: observability owned child is still active');
      }
      closeSync(input.fd);
      closed = true;
    },
  };

  if (input.mode !== 'exclusive') {
    return handle;
  }

  Object.assign(handle, {
    assertOwnPending() {
      requireMutable();
      if (
        ownedRecord == null ||
        ownedIdentity == null ||
        input.pendingPath == null
      ) {
        return latch(
          new Error('refused: observability pending record is not owned'),
        );
      }
      const inspected = inspectPending(input.pendingPath, input.contextName);
      if (
        !isDurableKind(inspected.kind) ||
        inspected.identity?.dev !== ownedIdentity.dev ||
        inspected.identity?.ino !== ownedIdentity.ino ||
        stable(inspected.record) !== stable(ownedRecord)
      ) {
        return latch(
          new Error('refused: observability pending record changed'),
        );
      }
      return globalThis.structuredClone(ownedRecord);
    },
    begin(request) {
      requireMutable();
      if (ownedRecord != null) {
        throw new Error(
          'refused: observability pending receipt already established',
        );
      }
      const existing = inspectPending(input.pendingPath, input.contextName);
      if (existing.pending) {
        throw new Error('refused: pending path already exists');
      }
      if (request.operation === 'upgrade') {
        if (request.phase !== 'collector-upgrade') {
          throw new Error('refused: observability upgrade phase is invalid');
        }
        const details = validateUpgradeDetails(request.details);
        const tuple = validateTuple(
          request.tuple,
          input.contextName,
          request.phase,
        );
        const record = {
          schema: 2,
          operationId: randomUUID(),
          service: OBSERVABILITY_SERVICE,
          context: input.contextName,
          start: new Date().toISOString(),
          operation: 'upgrade',
          phase: 'collector-upgrade',
          tuple,
          details,
        };
        try {
          createPending(input.pendingPath, record, input.deps);
          const inspected = inspectPending(input.pendingPath, input.contextName);
          if (
            inspected.kind !== 'upgrade' ||
            stable(inspected.record) !== stable(record)
          ) {
            throw new Error('refused: observability pending record changed');
          }
          ownedRecord = globalThis.structuredClone(record);
          ownedIdentity = inspected.identity;
        } catch (error) {
          authorityFailed = true;
          throw error;
        }
        return;
      }
      if (request.operation === 'persistence') {
        const details = validatePersistenceDetails(request.details, request.phase);
        if (details.step !== 0) {
          throw new Error('refused: observability persistence must begin at step 0');
        }
        const tuple = validateTuple(
          request.tuple,
          input.contextName,
          request.phase,
        );
        const record = {
          schema: 2,
          operationId: randomUUID(),
          service: OBSERVABILITY_SERVICE,
          context: input.contextName,
          start: new Date().toISOString(),
          operation: 'persistence',
          phase: request.phase,
          tuple,
          details,
        };
        try {
          createPending(input.pendingPath, record, input.deps);
          const inspected = inspectPending(input.pendingPath, input.contextName);
          if (
            inspected.kind !== 'persistence' ||
            stable(inspected.record) !== stable(record)
          ) {
            throw new Error('refused: observability pending record changed');
          }
          ownedRecord = globalThis.structuredClone(record);
          ownedIdentity = inspected.identity;
        } catch (error) {
          authorityFailed = true;
          throw error;
        }
        return;
      }
      if (request.operation === 'outage') {
        if (request.phase !== 'outage-down') {
          throw new Error('refused: observability outage must begin at outage-down');
        }
        const details = validateOutageDetails(request.details, request.phase);
        const down = /** @type {Record<string, unknown>} */ (details.down);
        if (down.outcome !== 'planned') {
          throw new Error('refused: observability outage down must begin planned');
        }
        const tuple = validateTuple(
          request.tuple,
          input.contextName,
          request.phase,
        );
        const record = {
          schema: 2,
          operationId: randomUUID(),
          service: OBSERVABILITY_SERVICE,
          context: input.contextName,
          start: new Date().toISOString(),
          operation: 'outage',
          phase: 'outage-down',
          tuple,
          details,
        };
        try {
          createPending(input.pendingPath, record, input.deps);
          const inspected = inspectPending(input.pendingPath, input.contextName);
          if (
            inspected.kind !== 'outage' ||
            stable(inspected.record) !== stable(record)
          ) {
            throw new Error('refused: observability pending record changed');
          }
          ownedRecord = globalThis.structuredClone(record);
          ownedIdentity = inspected.identity;
        } catch (error) {
          authorityFailed = true;
          throw error;
        }
        return;
      }
      assertEmptyDetails(request.details);
      if (request.operation != null && request.operation !== 'ensure') {
        throw new Error('refused: observability operation is not implemented');
      }
      assertPhase(request.phase);
      const tuple = validateTuple(
        request.tuple,
        input.contextName,
        request.phase,
      );
      const record = {
        schema: 2,
        operationId: randomUUID(),
        service: OBSERVABILITY_SERVICE,
        context: input.contextName,
        start: new Date().toISOString(),
        operation: 'ensure',
        phase: request.phase,
        tuple,
        details: {},
      };
      try {
        createPending(input.pendingPath, record, input.deps);
        const inspected = inspectPending(input.pendingPath, input.contextName);
        if (
          inspected.kind !== 'ensure' ||
          stable(inspected.record) !== stable(record)
        ) {
          throw new Error('refused: observability pending record changed');
        }
        ownedRecord = globalThis.structuredClone(record);
        ownedIdentity = inspected.identity;
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
    advance(request) {
      requireMutable();
      if (ownedRecord == null || ownedIdentity == null) {
        return latch(
          new Error(
            'refused: observability pending advance before durable receipt exists',
          ),
        );
      }
      const operation = ownedRecord.operation;
      if (operation === 'outage') {
        throw new Error('refused: observability outage cannot use public advance');
      }
      if (operation === 'persistence') {
        const current = validatePersistenceDetails(
          ownedRecord.details,
          ownedRecord.phase,
        );
        const tuple = assertTupleImmutable(request.tuple, request.phase);
        const details = validatePersistenceDetails(request.details, request.phase);
        if (details.step !== current.step + 1) {
          throw new Error('refused: observability persistence step must advance');
        }
        if (stable(details.baseline) !== stable(current.baseline)) {
          throw new Error('refused: observability persistence baseline changed');
        }
        const next = {
          ...ownedRecord,
          phase: request.phase,
          tuple,
          details,
        };
        try {
          writeOwnedRecord(next);
        } catch (error) {
          authorityFailed = true;
          throw error;
        }
        return;
      }
      assertEmptyDetails(request.details);
      assertPhase(request.phase);
      const tuple = assertTupleImmutable(request.tuple, request.phase);
      const next = {
        ...ownedRecord,
        phase: request.phase,
        tuple,
        details: {},
      };
      try {
        writeOwnedRecord(next);
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
    confirmOutageDown({ observed, notAttempted = false } = {}) {
      requireMutable();
      if (ownedRecord == null || ownedIdentity == null) {
        return latch(
          new Error('refused: observability pending record is not owned'),
        );
      }
      if (ownedRecord.operation !== 'outage' || ownedRecord.phase !== 'outage-down') {
        throw new Error('refused: observability outage down phase required');
      }
      const details = validateOutageDetails(ownedRecord.details, 'outage-down');
      const down = /** @type {Record<string, unknown>} */ (details.down);
      if (down.outcome !== 'planned') {
        throw new Error('refused: observability outage down is not planned');
      }
      const tempo = details.tempo;
      let nextDown = { ...down };
      if (
        observed != null &&
        observed.uid === tempo.uid &&
        observed.replicas === 0 &&
        observed.generation === down.generation + 1 &&
        boundedText(observed.resourceVersion, 128)
      ) {
        nextDown = {
          resourceVersion: observed.resourceVersion,
          generation: observed.generation,
          outcome: 'confirmed',
        };
      } else if (notAttempted === true) {
        nextDown = { ...down, outcome: 'not-attempted' };
      } else {
        nextDown = { ...down, outcome: 'unknown' };
      }
      const next = {
        ...ownedRecord,
        details: {
          ...details,
          down: nextDown,
          restore: null,
        },
      };
      try {
        writeOwnedRecord(next);
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
      return globalThis.structuredClone(nextDown);
    },
    async restoreTempoOnce(identity, options = {}) {
      requireLiveOwnOutage();
      if (ownedRecord.phase !== 'outage-down') {
        throw new Error('refused: observability restore requires outage-down');
      }
      assertIdentityMatchesRecord(identity);
      const details = validateOutageDetails(ownedRecord.details, 'outage-down');
      if (details.restore != null) {
        throw new Error('refused: observability restore already attempted');
      }
      const down = /** @type {Record<string, unknown>} */ (details.down);
      const downConfirmed = down.outcome === 'confirmed';
      const downUncertain =
        down.outcome === 'unknown' || down.outcome === 'planned';
      if (!downConfirmed && !downUncertain) {
        throw new Error('refused: observability outage down is not restorable');
      }
      const fresh = options.fresh;
      if (
        fresh == null ||
        typeof fresh !== 'object' ||
        Array.isArray(fresh)
      ) {
        throw new Error('refused: observability restore fresh state is invalid');
      }
      const freshRecord = /** @type {Record<string, unknown>} */ (fresh);
      const expectedGeneration =
        down.outcome === 'confirmed' ? down.generation : down.generation + 1;
      if (
        freshRecord.uid !== details.tempo.uid ||
        freshRecord.replicas !== 0 ||
        freshRecord.generation !== expectedGeneration ||
        !boundedText(freshRecord.resourceVersion, 128) ||
        freshRecord.resourceVersion === down.resourceVersion ||
        freshRecord.collectorPodUid !== details.baseline.collectorPodUid ||
        stable(freshRecord.claims) !== stable(details.baseline.claims)
      ) {
        throw new Error('refused: observability restore fresh state is invalid');
      }
      const now = options.now ?? (() => performance.now());
      const started = now();
      const deadline = options.deadline ?? started + 30_000;
      if (deadline <= started) {
        return ownedChildResult(false, { attempted: false, timedOut: true });
      }
      if (freshRecord.replicas === 1) {
        return ownedChildResult(true, { attempted: false });
      }
      if (freshRecord.replicas !== 0) {
        throw new Error('refused: observability tempo replicas are invalid');
      }
      const restoreRestoreSignal = new AbortController();
      const plannedRestore = {
        resourceVersion: freshRecord.resourceVersion,
        generation: freshRecord.generation,
        outcome: 'planned',
      };
      const intentRecord = {
        ...ownedRecord,
        phase: 'outage-restore',
        details: {
          ...details,
          restore: plannedRestore,
        },
      };
      try {
        writeOwnedRecord(intentRecord);
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
      const args = tempoRestoreArgv(identity, {
        uid: freshRecord.uid,
        resourceVersion: freshRecord.resourceVersion,
        generation: freshRecord.generation,
        replicas: 0,
      });
      const child = spawnOwnedChild('kubectl', args, {
        fds: [input.fd],
        deadline,
        now,
        signal: restoreRestoreSignal.signal,
        killGraceMs: DEFAULT_KILL_GRACE_MS,
      });
      activeChild = child;
      activeSettled = false;
      child.closed
        .then(() => {
          if (activeChild === child) {
            activeSettled = true;
          }
        })
        .catch(() => {
          if (activeChild === child) {
            activeSettled = true;
          }
        });
      const outcome = await child.outcome;
      if (outcome.closeUnconfirmed) {
        closeUnconfirmed = true;
        authorityFailed = true;
      }
      await child.closed;
      let restoreOutcome = 'unknown';
      if (outcome.ok) {
        try {
          const parsed = JSON.parse(outcome.stdout ?? '');
          if (
            parsed?.metadata?.uid === details.tempo.uid &&
            parsed?.spec?.replicas === 1 &&
            parsed?.metadata?.generation === freshRecord.generation + 1
          ) {
            restoreOutcome = 'confirmed';
          }
        } catch {
          restoreOutcome = 'unknown';
        }
      } else if (outcome.attempted === false) {
        restoreOutcome = 'not-attempted';
      }
      const settledDetails = validateOutageDetails(
        ownedRecord.details,
        'outage-restore',
      );
      const next = {
        ...ownedRecord,
        details: {
          ...settledDetails,
          restore: {
            resourceVersion: freshRecord.resourceVersion,
            generation: freshRecord.generation,
            outcome: restoreOutcome,
          },
        },
      };
      try {
        writeOwnedRecord(next);
      } catch {
        authorityFailed = true;
      }
      return {
        ...outcome,
        argv: args,
        restorationFailed: restoreOutcome !== 'confirmed',
        restorationAttempted: outcome.attempted === true,
      };
    },
    finishCancelledOutage(identity, options = {}) {
      refuseClosed();
      if (input.mode !== 'exclusive' || input.pendingPath == null) {
        throw new Error('refused: shared observability custody cannot mutate');
      }
      if (authorityFailed || closeUnconfirmed) {
        throw new Error('refused: observability custody authority failed');
      }
      if (activeChild && !activeSettled) {
        throw new Error('refused: observability owned child is still active');
      }
      if (ownedRecord == null || ownedIdentity == null) {
        throw new Error('refused: observability pending record is not owned');
      }
      assertIdentityMatchesRecord(identity);
      if (ownedRecord.operation !== 'outage' || ownedRecord.phase !== 'outage-restore') {
        throw new Error('refused: observability outage restore phase required');
      }
      const details = validateOutageDetails(ownedRecord.details, 'outage-restore');
      const down = /** @type {Record<string, unknown>} */ (details.down);
      const restore = /** @type {Record<string, unknown>} */ (details.restore);
      if (down.outcome !== 'confirmed' || restore.outcome !== 'confirmed') {
        throw new Error('refused: observability outage restore is uncertain');
      }
      const verified = options.verified;
      if (verified == null || typeof verified !== 'object' || Array.isArray(verified)) {
        throw new Error('refused: observability outage verified projection invalid');
      }
      const projection = /** @type {Record<string, unknown>} */ (verified);
      const tempo = projection.tempo;
      if (
        tempo == null ||
        typeof tempo !== 'object' ||
        Array.isArray(tempo) ||
        tempo.uid !== details.tempo.uid ||
        tempo.replicas !== 1 ||
        tempo.generation !== restore.generation + 1
      ) {
        throw new Error('refused: observability outage verified tempo invalid');
      }
      if (
        projection.collectorPodUid !== details.baseline.collectorPodUid ||
        stable(projection.claims) !== stable(details.baseline.claims) ||
        stable(projection.workloadUids) !== stable(details.baseline.workloadUids)
      ) {
        throw new Error('refused: observability outage verified baseline invalid');
      }
      const inspected = inspectPending(input.pendingPath, input.contextName);
      if (
        inspected.kind !== 'outage' ||
        inspected.identity?.dev !== ownedIdentity.dev ||
        inspected.identity?.ino !== ownedIdentity.ino ||
        stable(inspected.record) !== stable(ownedRecord)
      ) {
        authorityFailed = true;
        throw new Error('refused: observability pending record changed');
      }
      try {
        unlinkSync(input.pendingPath);
        syncDirectory(input.lockDirectory, input.deps);
        const after = inspectPending(input.pendingPath, input.contextName);
        if (after.pending || !after.valid) {
          throw new Error('refused: observability pending record remained');
        }
        ownedRecord = null;
        ownedIdentity = null;
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
    clear() {
      requireMutable();
      if (
        ownedRecord == null ||
        ownedIdentity == null ||
        input.pendingPath == null
      ) {
        return latch(
          new Error('refused: observability pending record is not owned'),
        );
      }
      if (ownedRecord.operation === 'outage') {
        const details = validateOutageDetails(
          ownedRecord.details,
          ownedRecord.phase,
        );
        const restore = details.restore;
        if (
          ownedRecord.phase !== 'outage-restore' ||
          restore == null ||
          restore.outcome !== 'confirmed'
        ) {
          throw new Error('refused: observability outage restore is uncertain');
        }
      }
      const inspected = inspectPending(input.pendingPath, input.contextName);
      if (
        !isDurableKind(inspected.kind) ||
        inspected.identity?.dev !== ownedIdentity.dev ||
        inspected.identity?.ino !== ownedIdentity.ino ||
        stable(inspected.record) !== stable(ownedRecord)
      ) {
        return latch(
          new Error('refused: observability pending record changed'),
        );
      }
      try {
        unlinkSync(input.pendingPath);
        syncDirectory(input.lockDirectory, input.deps);
        const after = inspectPending(input.pendingPath, input.contextName);
        if (after.pending || !after.valid) {
          throw new Error('refused: observability pending record remained');
        }
        ownedRecord = null;
        ownedIdentity = null;
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
  });
  return handle;
}

/**
 * @param {{ mode: string, lockDirectory: string, contextName: string }} input
 */
function lockPathFor(input) {
  const suffix = input.mode === 'proof' ? '-proof' : '';
  return join(
    input.lockDirectory,
    `${input.contextName}-${OBSERVABILITY_SERVICE}${suffix}.lock`,
  );
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{
 *   custody: ReturnType<Awaited<typeof acquireCustody>> & {
 *     trackChild?: (child: ReturnType<typeof startOwnedChild>) => void,
 *     noteCloseUnconfirmed?: () => void,
 *     assertOwnPending?: () => unknown,
 *   },
 *   now?: () => number,
 *   deadline?: number,
 *   timeoutMs?: number,
 *   signal?: AbortSignal,
 *   killGraceMs?: number,
 * }} deps
 */
export async function runMutation(command, args, deps) {
  const { custody } = deps;
  if (
    custody.mode !== 'exclusive' ||
    typeof custody.assertOwnPending !== 'function'
  ) {
    throw new Error(
      'refused: mutation requires exclusive observability custody',
    );
  }
  const now = deps.now ?? (() => performance.now());
  const killGraceMs = deps.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const timeoutMs = deps.timeoutMs ?? 60_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    return ownedChildResult(false, { attempted: false, timedOut: true });
  }
  if (custody.cancelled) {
    return ownedChildResult(false, { cancelled: true, attempted: false });
  }
  const started = now();
  const allocationEnd = started + timeoutMs;
  const workerDeadline = deps.deadline ?? allocationEnd;
  if (allocationEnd > workerDeadline) {
    return ownedChildResult(false, { timedOut: true, attempted: false });
  }
  custody.assertOwnPending();
  if (deps.signal?.aborted) {
    custody.cancel();
    return ownedChildResult(false, { cancelled: true, attempted: false });
  }
  const onAbort = () => {
    custody.cancel();
  };
  deps.signal?.addEventListener('abort', onAbort, { once: true });
  const child = startOwnedChild(command, args, {
    fds: [custody.fd],
    deadline: Math.min(workerDeadline, allocationEnd),
    now,
    signal: deps.signal,
    killGraceMs,
  });
  custody.trackChild?.(child);
  try {
    const outcome = await child.outcome;
    if (outcome.closeUnconfirmed) {
      custody.noteCloseUnconfirmed?.();
      return outcome;
    }
    await child.closed;
    return outcome;
  } finally {
    deps.signal?.removeEventListener('abort', onAbort);
  }
}
