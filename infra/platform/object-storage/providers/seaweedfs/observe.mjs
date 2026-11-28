import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { parse, parseAllDocuments } from 'yaml';
import {
  assertPlatformTarget,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../../../common/commands.mjs';
import { readPlatformProfile } from '../../../common/profile.mjs';
import {
  assertOwnedMetricsIntent,
  defaultObjectStorageStateRoot,
  readObjectStoragePendingState,
} from './mutation-guard.mjs';
import {
  documentIdentity,
  renderPlatformDocuments,
  resolvePlatformChartPath,
  resolvePlatformProfilePath,
} from '../../../common/render.mjs';

export const OBJECT_STORE_RELEASE_NAME = 'object-store';
const HELM_STORAGE_PREFIX = 'sh.helm.release.v1.object-store';
const MUTATION_PATTERN = /\b(apply|create|delete|patch|replace)\b/i;
const HELM_MUTATION = new Set([
  'install',
  'upgrade',
  'uninstall',
  'rollback',
  'delete',
]);

/**
 * @param {typeof runPlatformCommand} run
 */
function guardReadOnlyRun(run) {
  return (command, args, options = {}) => {
    const joined = [command, ...args].join(' ');
    if (MUTATION_PATTERN.test(joined)) {
      throw new Error(
        'read-only object storage observer refused mutation command',
      );
    }
    if (command === 'helm') {
      const subcommand = args[0];
      if (typeof subcommand === 'string' && HELM_MUTATION.has(subcommand)) {
        throw new Error(
          'read-only object storage observer refused mutation command',
        );
      }
    }
    return run(command, args, options);
  };
}

/**
 * @param {string} name
 */
export function isObjectStoreHelmStorageName(name) {
  return (
    typeof name === 'string' &&
    (name.startsWith(`${HELM_STORAGE_PREFIX}.`) || name === HELM_STORAGE_PREFIX)
  );
}

/**
 * @param {'dev' | 'release'} profileId
 */
function loadNativeProfileValues(profileId) {
  const overlay =
    parse(
      readFileSync(
        resolvePlatformProfilePath('object-storage', profileId),
        'utf8',
      ),
    ) ?? {};
  return overlay;
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 */
function valuesExactlyEqual(actual, expected) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    return false;
  }
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    return false;
  }
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.join('\0') !== expectedKeys.join('\0')) {
    return false;
  }
  for (const key of expectedKeys) {
    if (!isDeepStrictEqual(actual[key], expected[key])) {
      return false;
    }
  }
  return true;
}

/**
 * @param {object} doc
 */
function normalizeWorkloadForCompare(doc) {
  const copy = structuredClone(doc);
  const labels = copy.metadata?.labels;
  if (labels && typeof labels === 'object') {
    delete labels['app.kubernetes.io/managed-by'];
  }
  const annotations = copy.metadata?.annotations;
  if (annotations && typeof annotations === 'object') {
    for (const key of Object.keys(annotations)) {
      if (
        key.startsWith('meta.helm.sh/') ||
        key.startsWith('helm.sh/') ||
        key === 'kubectl.kubernetes.io/last-applied-configuration'
      ) {
        delete annotations[key];
      }
    }
    if (Object.keys(annotations).length === 0) {
      delete copy.metadata.annotations;
    }
  }
  delete copy.metadata?.creationTimestamp;
  delete copy.metadata?.generation;
  delete copy.metadata?.resourceVersion;
  delete copy.metadata?.uid;
  delete copy.status;
  return copy;
}

/**
 * @param {object[]} installed
 * @param {object[]} expected
 */
function workloadsMatch(installed, expected) {
  if (installed.length !== expected.length) {
    return false;
  }
  const installedByIdentity = new Map(
    installed.map((doc) => [
      documentIdentity(doc),
      normalizeWorkloadForCompare(doc),
    ]),
  );
  for (const expectedDoc of expected) {
    const key = documentIdentity(expectedDoc);
    const actual = installedByIdentity.get(key);
    if (!actual) {
      return false;
    }
    const want = normalizeWorkloadForCompare(expectedDoc);
    if (JSON.stringify(actual) !== JSON.stringify(want)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {string} output
 */
function parseHelmManifestDocuments(output) {
  const docs = [];
  for (const doc of parseAllDocuments(output)) {
    if (doc.errors.length > 0) {
      throw new Error('malformed helm manifest document');
    }
    const js = doc.toJS();
    if (js == null) continue;
    if (!js || typeof js !== 'object' || Array.isArray(js)) {
      throw new Error('malformed helm manifest document');
    }
    if (js.kind === 'Secret') {
      throw new Error('helm manifest must not include Secret data');
    }
    docs.push(js);
  }
  return docs;
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function commandUnreadable(result) {
  return result.missing || result.timedOut || !result.ok || result.status !== 0;
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function parseJsonList(result) {
  if (commandUnreadable(result)) {
    return { state: 'unknown', reason: 'command failed' };
  }
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return { state: 'ok', items: [] };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return { state: 'unknown', reason: 'response is not a list' };
    }
    return { state: 'ok', items: parsed };
  } catch {
    return { state: 'unknown', reason: 'malformed json' };
  }
}

/**
 * @param {{
 *   profileId: 'dev' | 'release',
 *   contextName: string,
 *   namespace: string,
 *   run: typeof runPlatformCommand,
 * }} spec
 */
function listSecretNames({ profileId, contextName, namespace, run }) {
  const result = run('kubectl', [
    '--context',
    contextName,
    '-n',
    namespace,
    'get',
    'secrets',
    '-o',
    'json',
  ]);
  if (commandUnreadable(result)) {
    return { state: 'unknown', reason: 'secret name inventory failed' };
  }
  let body;
  try {
    body = JSON.parse(result.stdout ?? '');
  } catch {
    return { state: 'unknown', reason: 'secret name inventory malformed' };
  }
  const items = Array.isArray(body?.items) ? body.items : [];
  const names = items
    .map((item) => item?.metadata?.name)
    .filter((name) => typeof name === 'string');
  // Metadata and type only; Helm Secret data is never read or decoded.
  const records = items
    .filter((item) => typeof item?.metadata?.name === 'string')
    .map((item) => ({
      name: item.metadata.name,
      type: item.type,
      uid: item.metadata.uid,
      labels: item.metadata.labels,
      terminating: item.metadata.deletionTimestamp != null,
    }));
  return { state: 'ok', names, records };
}

/**
 * @param {{
 *   profileId: 'dev' | 'release',
 *   contextName: string,
 *   namespace: string,
 *   run: typeof runPlatformCommand,
 * }} spec
 */
function listConfigMapNames({ contextName, namespace, run }) {
  const result = run('kubectl', [
    '--context',
    contextName,
    '-n',
    namespace,
    'get',
    'configmaps',
    '-o',
    'json',
  ]);
  if (commandUnreadable(result)) {
    return { state: 'unknown', reason: 'configmap name inventory failed' };
  }
  let body;
  try {
    body = JSON.parse(result.stdout ?? '');
  } catch {
    return { state: 'unknown', reason: 'configmap name inventory malformed' };
  }
  const names = Array.isArray(body?.items)
    ? body.items
        .map((item) => item?.metadata?.name)
        .filter((name) => typeof name === 'string')
    : [];
  return { state: 'ok', names };
}

/**
 * @param {{
 *   contextName: string,
 *   namespace: string,
 *   run: typeof runPlatformCommand,
 * }} spec
 */
function readTargetNamespace({ contextName, namespace, run }) {
  const result = run('kubectl', [
    '--context',
    contextName,
    'get',
    'namespace',
    namespace,
    '--ignore-not-found',
    '-o',
    'json',
  ]);
  if (commandUnreadable(result)) {
    return { state: 'unknown', reason: 'namespace read failed' };
  }
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return { state: 'absent' };
  }
  try {
    const body = JSON.parse(trimmed);
    if (body?.metadata?.name !== namespace) {
      return { state: 'unknown', reason: 'namespace name mismatch' };
    }
    return { state: 'present' };
  } catch {
    return { state: 'unknown', reason: 'namespace response malformed' };
  }
}

/**
 * @param {string[]} names
 */
function helmStoragePresent(names) {
  return names.some((name) => isObjectStoreHelmStorageName(name));
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 * @returns {{
 *   state: 'absent' | 'unknown' | 'native-compatible' | 'refused',
 *   reason: string,
 *   releaseName: string,
 *   namespace: string,
 * }}
 */
function observeHistoryCore(profileId, deps = {}) {
  const run = guardReadOnlyRun(deps.run ?? runPlatformCommand);
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.objectStorage;
  const releaseName = OBJECT_STORE_RELEASE_NAME;

  try {
    assertPlatformTarget(profileId, { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      state: 'unknown',
      reason: message,
      releaseName,
      namespace,
    };
  }

  const helmList = run(
    'helm',
    [
      'list',
      '--all',
      '--kube-context',
      profile.contextName,
      '--namespace',
      namespace,
      '-o',
      'json',
    ],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  const helmParsed = parseJsonList(helmList);
  const secrets = listSecretNames({
    profileId,
    contextName: profile.contextName,
    namespace,
    run,
  });
  const configMaps = listConfigMapNames({
    contextName: profile.contextName,
    namespace,
    run,
  });
  const targetNamespace = readTargetNamespace({
    contextName: profile.contextName,
    namespace,
    run,
  });

  if (
    helmParsed.state === 'unknown' ||
    secrets.state === 'unknown' ||
    configMaps.state === 'unknown' ||
    targetNamespace.state === 'unknown'
  ) {
    return {
      state: 'unknown',
      reason:
        helmParsed.reason ??
        secrets.reason ??
        configMaps.reason ??
        targetNamespace.reason ??
        'object store history inventory unreadable',
      releaseName,
      namespace,
    };
  }

  const inventoryNames = [...secrets.names, ...configMaps.names];
  const hasHelmStorage = helmStoragePresent(inventoryNames);
  const helmReleases = helmParsed.items;

  if (
    helmReleases.length === 0 &&
    !hasHelmStorage &&
    targetNamespace.state === 'absent'
  ) {
    return {
      state: 'absent',
      reason: 'object-store Helm history and storage records are absent',
      releaseName,
      namespace,
    };
  }

  // A live namespace with no Helm history is occupied or foreign. Fresh install
  // requires the namespace itself to be absent; a ready Pod is not absence.
  if (helmReleases.length === 0 && !hasHelmStorage) {
    return {
      state: 'refused',
      reason:
        'object-storage namespace exists without an object-store Helm release',
      releaseName,
      namespace,
    };
  }

  const objectStoreReleases = helmReleases.filter(
    (entry) => entry?.name === releaseName,
  );
  if (objectStoreReleases.length !== 1) {
    return {
      state: 'refused',
      reason: 'object-store Helm release count is not exactly one',
      releaseName,
      namespace,
    };
  }

  if (profileId === 'dev') {
    return observeDevNativeHistory({
      profileId,
      profile,
      namespace,
      releaseName,
      release: objectStoreReleases[0],
      secrets,
      configMaps,
      run,
    });
  }

  const release = objectStoreReleases[0];
  const revision = Number(release.revision);
  const status = String(release.status ?? '');
  if (revision !== 1) {
    return {
      state: 'refused',
      reason: `object-store Helm revision is ${String(release.revision)}`,
      releaseName,
      namespace,
    };
  }
  if (status !== 'deployed') {
    return {
      state: 'refused',
      reason: `object-store Helm status is ${status || 'missing'}`,
      releaseName,
      namespace,
    };
  }

  const valuesResult = run(
    'helm',
    [
      'get',
      'values',
      releaseName,
      '--kube-context',
      profile.contextName,
      '--namespace',
      namespace,
      '-o',
      'yaml',
    ],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  if (commandUnreadable(valuesResult)) {
    return {
      state: 'unknown',
      reason: 'helm get values failed',
      releaseName,
      namespace,
    };
  }
  let installedValues;
  try {
    installedValues = parse(valuesResult.stdout ?? '');
  } catch {
    return {
      state: 'unknown',
      reason: 'helm values response malformed',
      releaseName,
      namespace,
    };
  }
  const expectedValues = loadNativeProfileValues(profileId);
  if (!valuesExactlyEqual(installedValues, expectedValues)) {
    return {
      state: 'refused',
      reason: 'installed Helm values differ from native profile',
      releaseName,
      namespace,
    };
  }

  const manifestResult = run(
    'helm',
    [
      'get',
      'manifest',
      releaseName,
      '--kube-context',
      profile.contextName,
      '--namespace',
      namespace,
    ],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  if (commandUnreadable(manifestResult)) {
    return {
      state: 'unknown',
      reason: 'helm get manifest failed',
      releaseName,
      namespace,
    };
  }
  let installedWorkloads;
  try {
    installedWorkloads = parseHelmManifestDocuments(
      manifestResult.stdout ?? '',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      state: 'unknown',
      reason: message,
      releaseName,
      namespace,
    };
  }

  let expectedWorkloads;
  try {
    expectedWorkloads = renderPlatformDocuments(
      {
        service: 'object-storage',
        profile: profileId,
        section: 'workloads',
      },
      { run },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      state: 'unknown',
      reason: message,
      releaseName,
      namespace,
    };
  }

  if (!workloadsMatch(installedWorkloads, expectedWorkloads)) {
    return {
      state: 'refused',
      reason: 'installed Helm manifest differs from native chart workloads',
      releaseName,
      namespace,
    };
  }

  return {
    state: 'native-compatible',
    reason: 'object-store revision 1 matches native Helm history',
    releaseName,
    namespace,
    artifactId: 'release-s3-base',
    historyId: 'release-base-r1',
    metricsEnabled: false,
  };
}

/** @type {WeakMap<object, Record<number, string>>} */
const HISTORY_STORAGE_UIDS = new WeakMap();

const NATIVE_CHART_ID = 'platform-object-storage-seaweedfs-0.1.0';
const HELM_STORAGE_TYPE = 'helm.sh/release.v1';

/** @type {Record<'base' | 'metrics', { artifactId: string, metricsEnabled: boolean }>} */
const DEV_VARIANTS = {
  base: { artifactId: 'dev-s3-base', metricsEnabled: false },
  metrics: { artifactId: 'dev-s3-metrics', metricsEnabled: true },
};

/**
 * Exact user values for a dev variant. The base variant is the current dev
 * profile with the single added key removed, never a loosened comparison.
 * @param {'base' | 'metrics'} variant
 */
function devVariantValues(variant) {
  const values = { ...loadNativeProfileValues('dev') };
  if (variant === 'base') {
    delete values.metricsEnabled;
  }
  return values;
}

/**
 * @param {string} reason
 * @param {'unknown' | 'refused'} state
 * @param {{ releaseName: string, namespace: string }} base
 */
function historyFailure(state, reason, base) {
  return {
    state,
    reason,
    releaseName: base.releaseName,
    namespace: base.namespace,
  };
}

/**
 * Verify that one retained dev revision exactly matches one variant. Returns
 * `{ match: true }`, `{ match: false, state, reason }`.
 * @param {{
 *   revision: number,
 *   variant: 'base' | 'metrics',
 *   profile: ReturnType<typeof readPlatformProfile>,
 *   namespace: string,
 *   releaseName: string,
 *   run: typeof runPlatformCommand,
 *   expected: Map<string, object[]>,
 * }} spec
 */
function matchDevRevision(spec) {
  const { revision, variant, profile, namespace, releaseName, run } = spec;
  const common = [
    '--revision',
    String(revision),
    '--kube-context',
    profile.contextName,
    '--namespace',
    namespace,
  ];
  const valuesResult = run(
    'helm',
    ['get', 'values', releaseName, ...common, '-o', 'yaml'],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  if (commandUnreadable(valuesResult)) {
    return { match: false, state: 'unknown', reason: 'helm get values failed' };
  }
  let installedValues;
  try {
    installedValues = parse(valuesResult.stdout ?? '');
  } catch {
    return {
      match: false,
      state: 'unknown',
      reason: 'helm values response malformed',
    };
  }
  if (!valuesExactlyEqual(installedValues, devVariantValues(variant))) {
    return {
      match: false,
      state: 'refused',
      reason: 'installed Helm values differ from native profile',
    };
  }
  const manifestResult = run(
    'helm',
    ['get', 'manifest', releaseName, ...common],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  if (commandUnreadable(manifestResult)) {
    return {
      match: false,
      state: 'unknown',
      reason: 'helm get manifest failed',
    };
  }
  let installedWorkloads;
  try {
    installedWorkloads = parseHelmManifestDocuments(
      manifestResult.stdout ?? '',
    );
  } catch (error) {
    return {
      match: false,
      state: 'unknown',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  let expectedWorkloads = spec.expected.get(variant);
  if (!expectedWorkloads) {
    try {
      // Base is the explicit fixed-false overlay; metrics is the profile as is.
      expectedWorkloads = renderPlatformDocuments(
        { service: 'object-storage', profile: 'dev', section: 'workloads' },
        variant === 'base'
          ? { run, stdinOverlay: { metricsEnabled: false } }
          : { run },
      );
    } catch (error) {
      return {
        match: false,
        state: 'unknown',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    spec.expected.set(variant, expectedWorkloads);
  }
  if (!workloadsMatch(installedWorkloads, expectedWorkloads)) {
    return {
      match: false,
      state: 'refused',
      reason: 'installed Helm manifest differs from native chart workloads',
    };
  }
  return { match: true };
}

/**
 * Exact Helm revision Secret evidence for revisions 1..N: names, type, labels,
 * distinct nonterminating UIDs, status equal to the history row, and no
 * ConfigMap or extra matching record. Metadata only.
 * @param {{ revision: number, status: string }[]} rows
 * @param {{ records: object[], names: string[] }} secrets
 * @param {{ names: string[] }} configMaps
 * @returns {string | null} refusal reason, or null when exact
 */
function devStorageRefusal(rows, secrets, configMaps, uidSink) {
  if (configMaps.names.some((name) => isObjectStoreHelmStorageName(name))) {
    return 'object-store Helm storage includes a ConfigMap record';
  }
  const matching = secrets.records.filter((record) =>
    isObjectStoreHelmStorageName(record.name),
  );
  if (matching.length !== rows.length) {
    return 'object-store Helm storage records do not match history';
  }
  const uids = new Set();
  for (const row of rows) {
    const name = `${HELM_STORAGE_PREFIX}.v${row.revision}`;
    const found = matching.filter((record) => record.name === name);
    if (found.length !== 1) {
      return 'object-store Helm storage record is missing or duplicated';
    }
    const record = found[0];
    if (record.type !== HELM_STORAGE_TYPE) {
      return 'object-store Helm storage record type is not helm.sh/release.v1';
    }
    if (typeof record.uid !== 'string' || record.uid.length === 0) {
      return 'object-store Helm storage record has no UID';
    }
    uids.add(record.uid);
    if (uidSink) {
      uidSink[row.revision] = record.uid;
    }
    if (record.terminating) {
      return 'object-store Helm storage record is terminating';
    }
    const labels = record.labels ?? {};
    if (
      labels.owner !== 'helm' ||
      labels.name !== OBJECT_STORE_RELEASE_NAME ||
      labels.version !== String(row.revision) ||
      labels.status !== row.status
    ) {
      return 'object-store Helm storage record labels differ from history';
    }
  }
  if (uids.size !== rows.length) {
    return 'object-store Helm storage record UIDs are not distinct';
  }
  return null;
}

/**
 * Dev native history: fresh base, fresh metrics, or upgraded base -> metrics.
 * @param {{
 *   profileId: 'dev',
 *   profile: ReturnType<typeof readPlatformProfile>,
 *   namespace: string,
 *   releaseName: string,
 *   release: Record<string, unknown>,
 *   secrets: { records: object[], names: string[] },
 *   configMaps: { names: string[] },
 *   run: typeof runPlatformCommand,
 * }} spec
 */
function observeDevNativeHistory(spec) {
  const { profile, namespace, releaseName, release, run } = spec;
  const base = { releaseName, namespace };
  const revision = Number(release.revision);
  const status = String(release.status ?? '');
  if (revision !== 1 && revision !== 2) {
    return historyFailure(
      'refused',
      `object-store Helm revision is ${String(release.revision)}`,
      base,
    );
  }
  if (status !== 'deployed') {
    return historyFailure(
      'refused',
      `object-store Helm status is ${status || 'missing'}`,
      base,
    );
  }
  if (release.chart !== NATIVE_CHART_ID) {
    return historyFailure(
      'refused',
      'object-store Helm chart is not the native chart',
      base,
    );
  }

  const historyResult = run(
    'helm',
    [
      'history',
      releaseName,
      '--kube-context',
      profile.contextName,
      '--namespace',
      namespace,
      '-o',
      'json',
    ],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
  const history = parseJsonList(historyResult);
  if (history.state === 'unknown') {
    return historyFailure('unknown', `helm history ${history.reason}`, base);
  }
  const rows = history.items.map((row) => ({
    revision: Number(row?.revision),
    status: String(row?.status ?? ''),
    chart: row?.chart,
  }));
  rows.sort((a, b) => a.revision - b.revision);
  const wantStatuses =
    revision === 1 ? ['deployed'] : ['superseded', 'deployed'];
  if (
    rows.length !== revision ||
    rows.some(
      (row, index) =>
        row.revision !== index + 1 ||
        row.status !== wantStatuses[index] ||
        row.chart !== NATIVE_CHART_ID,
    )
  ) {
    return historyFailure(
      'refused',
      'object-store Helm history rows are not exact native history',
      base,
    );
  }

  const storageUids = {};
  const storageRefusal = devStorageRefusal(
    rows,
    spec.secrets,
    spec.configMaps,
    storageUids,
  );
  if (storageRefusal) {
    return historyFailure('refused', storageRefusal, base);
  }

  const expected = new Map();
  const common = { profile, namespace, releaseName, run, expected };
  /** @type {'base' | 'metrics'} */
  let finalVariant = 'metrics';
  let historyId;
  if (revision === 1) {
    let first = matchDevRevision({ ...common, revision: 1, variant: 'base' });
    finalVariant = 'base';
    historyId = 'dev-base-r1';
    if (!first.match && first.state === 'refused') {
      const second = matchDevRevision({
        ...common,
        revision: 1,
        variant: 'metrics',
      });
      if (second.match || second.state !== 'refused') {
        first = second;
        finalVariant = 'metrics';
        historyId = 'dev-metrics-r1';
      } else if (/values/.test(second.reason ?? '') === false) {
        // Values matched the metrics variant but the manifest did not.
        first = second;
      }
    }
    if (!first.match) {
      return historyFailure(first.state, first.reason, base);
    }
  } else {
    const predecessor = matchDevRevision({
      ...common,
      revision: 1,
      variant: 'base',
    });
    if (!predecessor.match) {
      return historyFailure(predecessor.state, predecessor.reason, base);
    }
    const successor = matchDevRevision({
      ...common,
      revision: 2,
      variant: 'metrics',
    });
    if (!successor.match) {
      return historyFailure(successor.state, successor.reason, base);
    }
    historyId = 'dev-metrics-r1-r2';
  }
  const matched = {
    state: 'native-compatible',
    reason:
      revision === 1
        ? 'object-store revision 1 matches native Helm history'
        : 'object-store revisions 1 and 2 match native Helm history',
    releaseName,
    namespace,
    artifactId: DEV_VARIANTS[finalVariant].artifactId,
    historyId,
    metricsEnabled: DEV_VARIANTS[finalVariant].metricsEnabled,
  };
  // Retained Helm storage UIDs stay out of the public result shape.
  HISTORY_STORAGE_UIDS.set(matched, storageUids);
  return matched;
}

const LEGACY_OCCUPIED_HISTORY_REASON =
  'object-storage namespace exists without an object-store Helm release';

const PRIOR_RECEIPT_FIELDS = [
  'contextName',
  'kubeSystemUid',
  'namespaceUid',
  'deploymentUid',
  'replicaSetUid',
  'podUid',
  'pvcUid',
  'pvUid',
];

const CHAIN_IMAGE = 'docker.io/chrislusf/seaweedfs:4.54';
const CHAIN_ARGS = ['mini', '-dir=/data'];
const CHAIN_METRICS_ARGS = ['mini', '-dir=/data', '-metricsPort=9327'];
const BASE_CONTAINER_PORTS = [{ name: 's3', containerPort: 8333 }];
const METRICS_CONTAINER_PORTS = [
  ...BASE_CONTAINER_PORTS,
  { name: 'metrics', containerPort: 9327 },
];

const NATIVE_ENV = [
  {
    name: 'AWS_ACCESS_KEY_ID',
    valueFrom: {
      secretKeyRef: { name: 'object-store-s3', key: 'access-key-id' },
    },
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    valueFrom: {
      secretKeyRef: { name: 'object-store-s3', key: 'secret-access-key' },
    },
  },
];

const LEGACY_RELEASE_EXTRA_ENV = {
  name: 'S3_BUCKET',
  value: 'lab-objects',
};

/**
 * @param {Record<string, unknown>} partial
 */
function makeChainResult(partial) {
  return {
    admits: false,
    releaseName: OBJECT_STORE_RELEASE_NAME,
    ...partial,
  };
}

/**
 * @param {unknown} receipt
 */
function priorReceiptContinuity(receipt) {
  if (receipt == null) {
    return { ok: true, continuity: /** @type {const} */ ('unclaimed') };
  }
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { ok: false };
  }
  for (const field of PRIOR_RECEIPT_FIELDS) {
    const value = /** @type {Record<string, unknown>} */ (receipt)[field];
    if (typeof value !== 'string' || value.length === 0) {
      return { ok: false };
    }
  }
  return { ok: true, continuity: /** @type {const} */ ('pending') };
}

/**
 * @param {string} text
 */
function decodeMountinfoEscapes(text) {
  return text
    .replace(/\\040/g, ' ')
    .replace(/\\011/g, '\t')
    .replace(/\\012/g, '\n')
    .replace(/\\134/g, '\\');
}

/**
 * @param {string} mountinfoText
 */
function parseMountinfoEntries(mountinfoText) {
  const entries = [];
  for (const line of mountinfoText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const sep = trimmed.indexOf(' - ');
    if (sep < 0) continue;
    const head = trimmed.slice(0, sep);
    const parts = head.split(/\s+/);
    if (parts.length < 5) continue;
    const root = decodeMountinfoEscapes(parts[3]);
    const mountPoint = decodeMountinfoEscapes(parts[4]);
    const options = parts[5] ?? '';
    entries.push({ root, mountPoint, options });
  }
  return entries;
}

/**
 * @param {string} mountRoot
 * @param {string} hostPath
 */
/**
 * True when both absolute paths are equal, or one is a slash-bounded
 * suffix of the other. A shared final directory name is not enough.
 *
 * @param {string} mountRoot
 * @param {string} hostPath
 */
function mountRootMatchesHostPath(mountRoot, hostPath) {
  if (typeof mountRoot !== 'string' || typeof hostPath !== 'string') {
    return false;
  }
  const normalizedRoot = mountRoot.replace(/\/+$/, '');
  const normalizedHost = hostPath.replace(/\/+$/, '');
  if (
    !normalizedRoot.startsWith('/') ||
    !normalizedHost.startsWith('/') ||
    normalizedRoot === '/' ||
    normalizedHost === '/'
  ) {
    return false;
  }
  return (
    pathIsComponentSuffix(normalizedRoot, normalizedHost) ||
    pathIsComponentSuffix(normalizedHost, normalizedRoot)
  );
}

/**
 * @param {string} path
 * @param {string} suffix
 */
function pathIsComponentSuffix(path, suffix) {
  if (path === suffix) {
    return true;
  }
  return path.endsWith(suffix) && path[path.length - suffix.length] === '/';
}

/**
 * The single controller ownerReference, or undefined when the chain is ambiguous.
 *
 * @param {unknown} ownerReferences
 */
function controllerOwner(ownerReferences) {
  if (!Array.isArray(ownerReferences)) {
    return undefined;
  }
  const controllers = ownerReferences.filter(
    (ref) => ref && typeof ref === 'object' && ref.controller === true,
  );
  return controllers.length === 1 ? controllers[0] : undefined;
}

/**
 * @param {string} mountinfoText
 * @param {string} hostPath
 */
function validateDataMountinfo(mountinfoText, hostPath, directoryIdentity) {
  const entries = parseMountinfoEntries(mountinfoText);
  const dataMounts = entries.filter((entry) => entry.mountPoint === '/data');
  if (dataMounts.length !== 1) {
    return {
      ok: false,
      reason: '/data mountinfo entry count is not exactly one',
    };
  }
  const mount = dataMounts[0];
  const opts = mount.options.split(',');
  if (!opts.includes('rw') || opts.includes('ro')) {
    return { ok: false, reason: '/data mount is not read-write' };
  }
  if (
    !mountRootMatchesHostPath(mount.root, hostPath) &&
    !(
      directoryIdentity &&
      /^[0-9]+:[0-9]+$/.test(directoryIdentity.node) &&
      directoryIdentity.node === directoryIdentity.pod
    )
  ) {
    return {
      ok: false,
      reason: '/data mount root does not match bound PV hostPath',
    };
  }
  return { ok: true, reason: '/data mount matches bound PV hostPath' };
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 */
function jsonExact(actual, expected) {
  return isDeepStrictEqual(actual, expected);
}

/**
 * @param {unknown[]} env
 * @param {'native' | 'legacy-dev' | 'legacy-release'} mode
 */
function validateContainerEnv(env, mode) {
  if (!Array.isArray(env)) {
    return false;
  }
  let expected = NATIVE_ENV;
  if (mode === 'legacy-release') {
    expected = [...NATIVE_ENV, LEGACY_RELEASE_EXTRA_ENV];
  }
  return jsonExact(env, expected);
}

/**
 * Container ports with only the API-defaulted TCP protocol normalized.
 * @param {unknown} ports
 */
function normalizedContainerPorts(ports) {
  if (!Array.isArray(ports)) {
    return undefined;
  }
  return ports.map((port) => {
    if (!port || typeof port !== 'object') {
      return port;
    }
    const { protocol, ...rest } = port;
    return protocol === undefined || protocol === 'TCP'
      ? { ...rest }
      : { ...rest, protocol };
  });
}

/**
 * @param {object} container
 * @param {'native' | 'legacy-dev' | 'legacy-release'} mode
 * @param {boolean} [metrics] exact native metrics variant
 */
function validateWorkloadContainer(container, mode, metrics = false) {
  if (!container || typeof container !== 'object') {
    return false;
  }
  if (container.name !== 'seaweedfs') {
    return false;
  }
  if (container.image !== CHAIN_IMAGE) {
    return false;
  }
  if (container.command !== undefined) {
    return false;
  }
  if (
    !jsonExact(container.args, metrics ? CHAIN_METRICS_ARGS : CHAIN_ARGS)
  ) {
    return false;
  }
  if (
    mode === 'native' &&
    !jsonExact(
      normalizedContainerPorts(container.ports),
      metrics ? METRICS_CONTAINER_PORTS : BASE_CONTAINER_PORTS,
    )
  ) {
    return false;
  }
  if (container.envFrom !== undefined) {
    return false;
  }
  if (!validateContainerEnv(container.env, mode)) {
    return false;
  }
  const sc = container.securityContext;
  if (
    !sc ||
    sc.allowPrivilegeEscalation !== false ||
    !jsonExact(sc.capabilities?.drop, ['ALL'])
  ) {
    return false;
  }
  const resources = container.resources;
  if (
    !resources ||
    resources.requests?.cpu !== '50m' ||
    resources.requests?.memory !== '128Mi' ||
    resources.limits?.cpu !== '500m' ||
    resources.limits?.memory !== '768Mi'
  ) {
    return false;
  }
  const mounts = container.volumeMounts;
  if (
    !Array.isArray(mounts) ||
    mounts.length !== 1 ||
    mounts[0]?.name !== 'data' ||
    mounts[0]?.mountPath !== '/data' ||
    mounts[0]?.subPath !== undefined ||
    mounts[0]?.readOnly === true
  ) {
    return false;
  }
  return true;
}

/**
 * @param {object} podSpec
 * @param {'native' | 'legacy-dev' | 'legacy-release'} mode
 * @param {boolean} [metrics]
 */
function validateWorkloadPodSpec(podSpec, mode, metrics = false) {
  if (!podSpec || typeof podSpec !== 'object') {
    return false;
  }
  if (podSpec.automountServiceAccountToken !== false) {
    return false;
  }
  if (podSpec.enableServiceLinks !== false) {
    return false;
  }
  if (podSpec.envFrom !== undefined) {
    return false;
  }
  const psc = podSpec.securityContext;
  if (
    !psc ||
    psc.runAsNonRoot !== true ||
    psc.runAsUser !== 1000 ||
    psc.runAsGroup !== 1000 ||
    psc.fsGroup !== 1000 ||
    psc.seccompProfile?.type !== 'RuntimeDefault'
  ) {
    return false;
  }
  const init = podSpec.initContainers;
  if (init !== undefined && (!Array.isArray(init) || init.length > 0)) {
    return false;
  }
  const containers = podSpec.containers;
  if (!Array.isArray(containers) || containers.length !== 1) {
    return false;
  }
  if (!validateWorkloadContainer(containers[0], mode, metrics)) {
    return false;
  }
  const volumes = podSpec.volumes;
  if (
    !Array.isArray(volumes) ||
    volumes.length !== 1 ||
    Object.keys(volumes[0]).sort().join('\0') !==
      ['name', 'persistentVolumeClaim'].sort().join('\0') ||
    volumes[0].name !== 'data' ||
    volumes[0].persistentVolumeClaim?.claimName !== 'object-store-data'
  ) {
    return false;
  }
  return true;
}

/**
 * @param {object} labels
 * @param {'dev' | 'release'} profileId
 * @param {'deployment' | 'podTemplate'} layer
 */
function validateOwnerLabels(labels, profileId, layer) {
  if (!labels || typeof labels !== 'object') {
    return false;
  }
  if (profileId === 'dev') {
    if (labels['offscreen.dev/owner'] !== 'offscreen-dev') {
      return false;
    }
    if (layer === 'podTemplate' && labels.app !== 'object-store') {
      return false;
    }
    return true;
  }
  if (
    labels.app !== 'object-store' ||
    labels['offscreen.rpg/lab'] !== 'disposable'
  ) {
    return false;
  }
  return true;
}

/**
 * Narrow upgraded topology: the current ReplicaSet carries the exact target
 * template, one retained predecessor ReplicaSet is owned and scaled to zero,
 * and exactly one Pod exists (no old or terminating Pod, no extra ReplicaSet).
 * @param {object} chain
 * @param {object} deployment
 * @param {object} replicaSet
 */
function validateUpgradedTopology(chain, deployment, replicaSet) {
  const old = chain.predecessorReplicaSet;
  if (chain.replicaSetCount !== 2 || !old?.metadata) {
    return {
      ok: false,
      reason: 'object-store upgraded ReplicaSet topology mismatch',
    };
  }
  if (chain.podCount !== 1 || chain.pod?.metadata?.deletionTimestamp != null) {
    return { ok: false, reason: 'object-store upgraded Pod topology mismatch' };
  }
  const owner = controllerOwner(old.metadata.ownerReferences);
  if (
    old.metadata.uid === replicaSet.metadata.uid ||
    old.metadata.labels?.app !== 'object-store' ||
    !owner ||
    owner.kind !== 'Deployment' ||
    owner.name !== OBJECT_STORE_RELEASE_NAME ||
    owner.uid !== deployment.metadata.uid ||
    old.metadata.deletionTimestamp != null
  ) {
    return {
      ok: false,
      reason: 'object-store predecessor ReplicaSet ownership mismatch',
    };
  }
  const zero = (value) => value === undefined || value === 0;
  if (
    !zero(old.spec?.replicas) ||
    !zero(old.status?.replicas) ||
    !zero(old.status?.readyReplicas) ||
    !zero(old.status?.availableReplicas) ||
    !zero(old.status?.fullyLabeledReplicas)
  ) {
    return {
      ok: false,
      reason: 'object-store predecessor ReplicaSet is not scaled to zero',
    };
  }
  const { 'pod-template-hash': _hash, ...oldLabels } =
    old.spec?.template?.metadata?.labels ?? {};
  if (
    !jsonExact(oldLabels, deployment.spec.template.metadata.labels) ||
    !validateWorkloadPodSpec(old.spec?.template?.spec, 'native', false)
  ) {
    return {
      ok: false,
      reason: 'object-store predecessor ReplicaSet template mismatch',
    };
  }
  if (!validateWorkloadPodSpec(replicaSet.spec?.template?.spec, 'native', true)) {
    return {
      ok: false,
      reason: 'object-store current ReplicaSet template mismatch',
    };
  }
  return { ok: true };
}

/**
 * @param {{
 *   profileId: 'dev' | 'release',
 *   mode: 'native' | 'legacy-dev' | 'legacy-release',
 *   deployment?: object,
 *   replicaSet?: object,
 *   pod?: object,
 *   service?: object,
 *   endpointSlice?: object,
 *   pvc?: object,
 *   pv?: object,
 *   secretDataKeys?: string[],
 *   secretLabels?: Record<string, string>,
 *   mountinfo?: string,
 *   namespace: string,
 * }} chain
 */
function validateLiveStructuralChain(chain) {
  const { profileId, mode, namespace } = chain;
  const metrics = mode === 'native' && chain.metricsEnabled === true;
  const upgraded = mode === 'native' && chain.upgraded === true;
  const deployment = chain.deployment;
  const replicaSet = chain.replicaSet;
  const pod = chain.pod;
  const service = chain.service;
  const endpointSlice = chain.endpointSlice;
  const pvc = chain.pvc;
  const pv = chain.pv;

  if (!deployment?.metadata || !deployment?.spec || !deployment?.status) {
    return {
      ok: false,
      reason: 'object-store Deployment is missing or unreadable',
    };
  }
  if (deployment.metadata.name !== OBJECT_STORE_RELEASE_NAME) {
    return { ok: false, reason: 'object-store Deployment name mismatch' };
  }
  if (
    !validateOwnerLabels(deployment.metadata.labels, profileId, 'deployment')
  ) {
    return {
      ok: false,
      reason: 'object-store Deployment owner labels mismatch',
    };
  }
  if (
    deployment.spec.replicas !== 1 ||
    deployment.spec.strategy?.type !== 'Recreate' ||
    deployment.spec.selector?.matchLabels?.app !== 'object-store'
  ) {
    return { ok: false, reason: 'object-store Deployment spec mismatch' };
  }
  if (
    deployment.status.readyReplicas !== 1 ||
    deployment.status.availableReplicas !== 1 ||
    deployment.metadata.generation !== deployment.status.observedGeneration
  ) {
    return { ok: false, reason: 'object-store Deployment status mismatch' };
  }
  const deployTemplate = deployment.spec.template;
  if (
    !deployTemplate?.metadata?.labels ||
    !validateOwnerLabels(
      deployTemplate.metadata.labels,
      profileId,
      'podTemplate',
    )
  ) {
    return { ok: false, reason: 'object-store pod template labels mismatch' };
  }
  if (!validateWorkloadPodSpec(deployTemplate.spec, mode, metrics)) {
    return { ok: false, reason: 'object-store pod template spec mismatch' };
  }

  if (!replicaSet?.metadata || !replicaSet?.status) {
    return { ok: false, reason: 'object-store ReplicaSet chain mismatch' };
  }
  if (replicaSet.metadata.labels?.app !== 'object-store') {
    return { ok: false, reason: 'object-store ReplicaSet labels mismatch' };
  }
  const rsOwner = controllerOwner(replicaSet.metadata.ownerReferences);
  if (
    !rsOwner ||
    rsOwner.kind !== 'Deployment' ||
    rsOwner.name !== OBJECT_STORE_RELEASE_NAME ||
    rsOwner.uid !== deployment.metadata.uid
  ) {
    return { ok: false, reason: 'object-store ReplicaSet controller mismatch' };
  }
  if (replicaSet.status.readyReplicas !== 1) {
    return {
      ok: false,
      reason: 'object-store ReplicaSet ready count mismatch',
    };
  }
  if (upgraded) {
    const topology = validateUpgradedTopology(chain, deployment, replicaSet);
    if (!topology.ok) {
      return topology;
    }
  }

  if (!pod?.metadata || !pod?.spec || !pod?.status) {
    return { ok: false, reason: 'object-store Pod chain mismatch' };
  }
  const podOwner = controllerOwner(pod.metadata.ownerReferences);
  if (
    !podOwner ||
    podOwner.kind !== 'ReplicaSet' ||
    podOwner.uid !== replicaSet.metadata.uid
  ) {
    return { ok: false, reason: 'object-store Pod controller mismatch' };
  }
  if (pod.status.phase !== 'Running') {
    return { ok: false, reason: 'object-store Pod is not Running' };
  }
  const readyCond = Array.isArray(pod.status.conditions)
    ? pod.status.conditions.find((c) => c?.type === 'Ready')
    : undefined;
  if (readyCond?.status !== 'True') {
    return { ok: false, reason: 'object-store Pod is not Ready' };
  }
  if (typeof pod.status.podIP !== 'string' || pod.status.podIP.length === 0) {
    return { ok: false, reason: 'object-store Pod IP missing' };
  }
  if (!validateWorkloadPodSpec(pod.spec, mode, metrics)) {
    return { ok: false, reason: 'object-store Pod spec mismatch' };
  }

  if (!service?.spec || service.spec.type !== 'ClusterIP') {
    return { ok: false, reason: 'object-store Service type mismatch' };
  }
  if (service.spec.selector?.app !== 'object-store') {
    return { ok: false, reason: 'object-store Service selector mismatch' };
  }
  const ports = service.spec.ports;
  if (
    !Array.isArray(ports) ||
    ports.length !== (metrics ? 2 : 1) ||
    ports[0]?.name !== 's3' ||
    ports[0]?.port !== 8333 ||
    (ports[0]?.targetPort !== 's3' && ports[0]?.targetPort !== 8333) ||
    (metrics &&
      (ports[1]?.name !== 'metrics' ||
        ports[1]?.port !== 9327 ||
        (ports[1]?.targetPort !== 'metrics' &&
          ports[1]?.targetPort !== 9327))) ||
    ports.some((port) => port?.protocol !== undefined && port.protocol !== 'TCP')
  ) {
    return { ok: false, reason: 'object-store Service port mismatch' };
  }

  if (!endpointSlice?.endpoints || !endpointSlice?.metadata) {
    return { ok: false, reason: 'object-store EndpointSlice mismatch' };
  }
  if (
    endpointSlice.metadata.labels?.['kubernetes.io/service-name'] !==
    'object-store'
  ) {
    return { ok: false, reason: 'object-store EndpointSlice label mismatch' };
  }
  if (metrics) {
    const slicePorts = Array.isArray(endpointSlice.ports)
      ? endpointSlice.ports.map((port) => ({
          name: port?.name,
          port: port?.port,
          protocol: port?.protocol,
        }))
      : undefined;
    const sorted = slicePorts?.sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    );
    if (
      !jsonExact(sorted, [
        { name: 'metrics', port: 9327, protocol: 'TCP' },
        { name: 's3', port: 8333, protocol: 'TCP' },
      ])
    ) {
      return { ok: false, reason: 'object-store EndpointSlice port mismatch' };
    }
  }
  const endpoints = endpointSlice.endpoints;
  if (!Array.isArray(endpoints) || endpoints.length !== 1) {
    return {
      ok: false,
      reason: 'object-store EndpointSlice endpoint count mismatch',
    };
  }
  const endpoint = endpoints[0];
  if (
    endpoint.conditions?.ready !== true ||
    endpoint.conditions?.serving !== true ||
    endpoint.conditions?.terminating === true
  ) {
    return { ok: false, reason: 'object-store endpoint readiness mismatch' };
  }
  const targetRef = endpoint.targetRef;
  if (
    !targetRef ||
    targetRef.kind !== 'Pod' ||
    targetRef.name !== pod.metadata.name ||
    targetRef.uid !== pod.metadata.uid
  ) {
    return { ok: false, reason: 'object-store endpoint targetRef mismatch' };
  }
  if (
    !Array.isArray(endpoint.addresses) ||
    !endpoint.addresses.includes(pod.status.podIP)
  ) {
    return { ok: false, reason: 'object-store endpoint address mismatch' };
  }

  if (!pvc?.metadata || !pvc?.spec || !pvc?.status) {
    return { ok: false, reason: 'object-store PVC mismatch' };
  }
  if (pvc.metadata.name !== 'object-store-data') {
    return { ok: false, reason: 'object-store PVC name mismatch' };
  }
  if (pvc.status.phase !== 'Bound') {
    return { ok: false, reason: 'object-store PVC is not Bound' };
  }
  const expectedClass = profileId === 'dev' ? 'standard' : 'local-path';
  if (
    !jsonExact(pvc.spec.accessModes, ['ReadWriteOnce']) ||
    pvc.spec.volumeMode !== 'Filesystem' ||
    pvc.spec.storageClassName !== expectedClass ||
    pvc.spec.resources?.requests?.storage !== '2Gi' ||
    typeof pvc.spec.volumeName !== 'string' ||
    pvc.spec.volumeName.length === 0 ||
    typeof pvc.metadata.uid !== 'string' ||
    pvc.metadata.uid.length === 0
  ) {
    return { ok: false, reason: 'object-store PVC spec mismatch' };
  }
  if (!validateOwnerLabels(pvc.metadata.labels, profileId, 'deployment')) {
    return { ok: false, reason: 'object-store PVC owner labels mismatch' };
  }

  if (!pv?.metadata || !pv?.spec || !pv?.status) {
    return { ok: false, reason: 'object-store PV mismatch' };
  }
  if (pv.metadata.name !== pvc.spec.volumeName) {
    return {
      ok: false,
      reason: 'object-store PV name does not match PVC volumeName',
    };
  }
  if (pv.status.phase !== 'Bound') {
    return { ok: false, reason: 'object-store PV is not Bound' };
  }
  const claimRef = pv.spec.claimRef;
  if (
    !claimRef ||
    claimRef.namespace !== namespace ||
    claimRef.name !== 'object-store-data' ||
    claimRef.uid !== pvc.metadata.uid
  ) {
    return { ok: false, reason: 'object-store PV claimRef mismatch' };
  }
  if (
    pv.spec.capacity?.storage !== '2Gi' ||
    !jsonExact(pv.spec.accessModes, ['ReadWriteOnce']) ||
    pv.spec.volumeMode !== 'Filesystem' ||
    typeof pv.spec.hostPath?.path !== 'string' ||
    pv.spec.hostPath.path.length === 0 ||
    !pv.spec.hostPath.path.startsWith('/')
  ) {
    return { ok: false, reason: 'object-store PV spec mismatch' };
  }
  if (Object.keys(pv.spec).some((key) => key === 'nfs' || key === 'csi')) {
    return { ok: false, reason: 'object-store PV uses non-hostPath volume' };
  }

  const secretKeys = chain.secretDataKeys;
  if (
    !Array.isArray(secretKeys) ||
    !secretKeys.includes('access-key-id') ||
    !secretKeys.includes('secret-access-key') ||
    secretKeys.length !== 2
  ) {
    return { ok: false, reason: 'object-store Secret keys mismatch' };
  }
  if (!validateOwnerLabels(chain.secretLabels, profileId, 'deployment')) {
    return { ok: false, reason: 'object-store Secret owner labels mismatch' };
  }

  if (typeof chain.mountinfo !== 'string') {
    return { ok: false, reason: 'object-store mountinfo missing' };
  }
  const mountinfo = validateDataMountinfo(
    chain.mountinfo,
    pv.spec.hostPath.path,
    chain.directoryIdentity,
  );
  if (!mountinfo.ok) {
    return mountinfo;
  }

  const successReason =
    mode === 'native'
      ? 'live object-store chain matches native specimen'
      : 'live object-store chain matches legacy structural specimen';
  return { ok: true, reason: successReason };
}

/**
 * @param {object} observation
 */
function comparePriorReceiptIdentity(observation) {
  const receipt = observation.priorReceipt;
  if (!receipt) {
    return { ok: true, continuity: /** @type {const} */ ('unclaimed') };
  }
  const checks = [
    [receipt.contextName, observation.contextName],
    [receipt.kubeSystemUid, observation.kubeSystemUid],
    [receipt.namespaceUid, observation.namespaceUid],
    [receipt.deploymentUid, observation.deployment?.metadata?.uid],
    [receipt.replicaSetUid, observation.replicaSet?.metadata?.uid],
    [receipt.podUid, observation.pod?.metadata?.uid],
    [receipt.pvcUid, observation.pvc?.metadata?.uid],
    [receipt.pvUid, observation.pv?.metadata?.uid],
  ];
  for (const [expected, actual] of checks) {
    if (expected !== actual) {
      return { ok: false, continuity: /** @type {const} */ ('mismatched') };
    }
  }
  return { ok: true, continuity: /** @type {const} */ ('matched') };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {object} observation
 */
export function classifyObjectStorageObservation(profileId, observation) {
  const profile = readPlatformProfile(profileId);
  const namespace =
    observation.namespace ??
    profile.namespaces.objectStorage ??
    profile.namespaces.objectStorage;
  const history = observation.history ?? {
    state: 'unknown',
    reason: 'missing history',
    releaseName: OBJECT_STORE_RELEASE_NAME,
    namespace,
  };

  const prior = priorReceiptContinuity(observation.priorReceipt);
  if (!prior.ok) {
    return makeChainResult({
      state: 'unknown',
      reason: 'prior receipt fields are incomplete',
      continuity: 'unclaimed',
      namespace,
    });
  }

  if (history.state === 'unknown') {
    return makeChainResult({
      state: 'unknown',
      reason: history.reason,
      continuity: 'unclaimed',
      namespace,
    });
  }

  if (history.state === 'absent') {
    return makeChainResult({
      state: 'refused',
      reason:
        'live chain observation does not classify absent object-store history',
      continuity: 'unclaimed',
      namespace,
    });
  }

  if (
    history.state === 'refused' &&
    history.reason !== LEGACY_OCCUPIED_HISTORY_REASON
  ) {
    return makeChainResult({
      state: 'refused',
      reason: history.reason,
      continuity: 'unclaimed',
      namespace,
    });
  }

  /** @type {'native' | 'legacy-dev' | 'legacy-release'} */
  let mode;
  /** @type {'native-compatible' | 'legacy-structural'} */
  let successState;
  if (history.state === 'native-compatible') {
    mode = 'native';
    successState = 'native-compatible';
  } else {
    mode = profileId === 'release' ? 'legacy-release' : 'legacy-dev';
    successState = 'legacy-structural';
  }

  const metricsEnabled = mode === 'native' && history.metricsEnabled === true;
  const upgraded =
    mode === 'native' && history.historyId === 'dev-metrics-r1-r2';
  const structural = validateLiveStructuralChain({
    profileId,
    mode,
    metricsEnabled,
    upgraded,
    predecessorReplicaSet: observation.predecessorReplicaSet,
    replicaSetCount: observation.replicaSetCount,
    podCount: observation.podCount,
    namespace,
    deployment: observation.deployment,
    replicaSet: observation.replicaSet,
    pod: observation.pod,
    service: observation.service,
    endpointSlice: observation.endpointSlice,
    pvc: observation.pvc,
    pv: observation.pv,
    secretDataKeys: observation.secretDataKeys,
    secretLabels: observation.secretLabels,
    mountinfo: observation.mountinfo,
    directoryIdentity: observation.directoryIdentity,
  });
  if (!structural.ok) {
    const identity =
      observation.priorReceipt != null
        ? comparePriorReceiptIdentity(observation)
        : { ok: true, continuity: /** @type {const} */ ('unclaimed') };
    const continuity =
      identity.ok === false
        ? /** @type {const} */ ('mismatched')
        : /** @type {const} */ ('unclaimed');
    const reason =
      identity.ok === false ? 'prior identity mismatch' : structural.reason;
    return makeChainResult({
      state: 'refused',
      reason,
      continuity,
      namespace,
    });
  }

  const identity = comparePriorReceiptIdentity(observation);
  if (!identity.ok) {
    return makeChainResult({
      state: 'refused',
      reason: 'prior identity mismatch',
      continuity: 'mismatched',
      namespace,
    });
  }

  return makeChainResult({
    state: successState,
    reason: structural.reason,
    continuity: identity.continuity,
    namespace,
    ...(mode === 'native' &&
    typeof history.historyId === 'string' &&
    typeof history.artifactId === 'string'
      ? {
          artifactId: history.artifactId,
          historyId: history.historyId,
          metricsEnabled: history.metricsEnabled === true,
        }
      : {}),
  });
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function parseKubectlObject(result) {
  if (commandUnreadable(result)) {
    return { state: 'unknown', reason: 'kubectl read failed' };
  }
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return { state: 'missing' };
  }
  try {
    return { state: 'ok', body: JSON.parse(trimmed) };
  } catch {
    return { state: 'unknown', reason: 'kubectl response malformed' };
  }
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function parseKubectlItems(result) {
  const parsed = parseKubectlObject(result);
  if (parsed.state !== 'ok') {
    return parsed;
  }
  const items = parsed.body?.items;
  if (!Array.isArray(items)) {
    return { state: 'unknown', reason: 'kubectl list response malformed' };
  }
  return { state: 'ok', items };
}

/**
 * @param {object[]} items
 * @param {(item: object) => boolean} predicate
 */
function exactlyOne(items, predicate) {
  const matches = items.filter((item) => predicate(item));
  if (matches.length !== 1) {
    return { ok: false };
  }
  return { ok: true, item: matches[0] };
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {ReturnType<typeof readPlatformProfile>} profile
 * @param {string} namespace
 * @param {unknown} priorReceipt
 */
function readLiveChainObservation(
  run,
  profile,
  namespace,
  priorReceipt,
  options = {},
) {
  const contextName = profile.contextName;
  const owner = options.owner === true;
  const upgraded = options.historyId === 'dev-metrics-r1-r2';
  const kubeSystem =
    priorReceipt != null || owner
      ? parseKubectlObject(
          run('kubectl', [
            '--context',
            contextName,
            'get',
            'namespace',
            'kube-system',
            '-o',
            'json',
          ]),
        )
      : { state: 'skipped' };

  if (kubeSystem.state === 'unknown') {
    return { state: 'unknown', reason: kubeSystem.reason };
  }

  let namespaceUid;
  if (priorReceipt != null || owner) {
    const nsRead = parseKubectlObject(
      run('kubectl', [
        '--context',
        contextName,
        'get',
        'namespace',
        namespace,
        '-o',
        'json',
      ]),
    );
    if (nsRead.state === 'unknown') {
      return { state: 'unknown', reason: nsRead.reason };
    }
    if (nsRead.state === 'missing') {
      return { state: 'unknown', reason: 'object-store namespace missing' };
    }
    namespaceUid = nsRead.body?.metadata?.uid;
  }

  const deploymentRead = parseKubectlObject(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'deployment',
      OBJECT_STORE_RELEASE_NAME,
      '-n',
      namespace,
      '-o',
      'json',
    ]),
  );
  if (deploymentRead.state === 'unknown') {
    return { state: 'unknown', reason: deploymentRead.reason };
  }

  const replicaSetRead = parseKubectlItems(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'replicaset',
      '-n',
      namespace,
      '-l',
      'app=object-store',
      '-o',
      'json',
    ]),
  );
  if (replicaSetRead.state === 'unknown') {
    return { state: 'unknown', reason: replicaSetRead.reason };
  }

  const podsRead = parseKubectlItems(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'pods',
      '-n',
      namespace,
      '-l',
      'app=object-store',
      '-o',
      'json',
    ]),
  );
  if (podsRead.state === 'unknown') {
    return { state: 'unknown', reason: podsRead.reason };
  }

  const serviceRead = parseKubectlObject(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'service',
      OBJECT_STORE_RELEASE_NAME,
      '-n',
      namespace,
      '-o',
      'json',
    ]),
  );
  if (serviceRead.state === 'unknown') {
    return { state: 'unknown', reason: serviceRead.reason };
  }

  const endpointSlicesRead = parseKubectlItems(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'endpointslices.discovery.k8s.io',
      '-n',
      namespace,
      '-l',
      'kubernetes.io/service-name=object-store',
      '-o',
      'json',
    ]),
  );
  if (endpointSlicesRead.state === 'unknown') {
    return { state: 'unknown', reason: endpointSlicesRead.reason };
  }

  const pvcRead = parseKubectlObject(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'pvc',
      'object-store-data',
      '-n',
      namespace,
      '-o',
      'json',
    ]),
  );
  if (pvcRead.state === 'unknown') {
    return { state: 'unknown', reason: pvcRead.reason };
  }

  const pvcBody = pvcRead.state === 'ok' ? pvcRead.body : undefined;
  const volumeName = pvcBody?.spec?.volumeName;
  let pvRead = { state: 'missing' };
  if (typeof volumeName === 'string' && volumeName.length > 0) {
    pvRead = parseKubectlObject(
      run('kubectl', [
        '--context',
        contextName,
        'get',
        'pv',
        volumeName,
        '-o',
        'json',
      ]),
    );
    if (pvRead.state === 'unknown') {
      return { state: 'unknown', reason: pvRead.reason };
    }
  }

  const secretRead = parseKubectlObject(
    run('kubectl', [
      '--context',
      contextName,
      'get',
      'secret',
      'object-store-s3',
      '-n',
      namespace,
      '-o',
      'json',
    ]),
  );
  if (secretRead.state === 'unknown') {
    return { state: 'unknown', reason: secretRead.reason };
  }

  /** @type {string[]} */
  let secretDataKeys = [];
  /** @type {Record<string, string> | undefined} */
  let secretLabels;
  let secretUid;
  let secretResourceVersion;
  if (secretRead.state === 'ok') {
    secretLabels = secretRead.body?.metadata?.labels;
    secretUid = secretRead.body?.metadata?.uid;
    secretResourceVersion = secretRead.body?.metadata?.resourceVersion;
    if (secretRead.body?.data && typeof secretRead.body.data === 'object') {
      secretDataKeys = Object.keys(secretRead.body.data).sort();
      for (const key of Object.keys(secretRead.body.data)) {
        delete secretRead.body.data[key];
      }
    }
  }

  const readyPods = (podsRead.items ?? []).filter((pod) => {
    const readyCond = Array.isArray(pod?.status?.conditions)
      ? pod.status.conditions.find((c) => c?.type === 'Ready')
      : undefined;
    return (
      pod?.status?.phase === 'Running' &&
      readyCond?.status === 'True' &&
      typeof pod?.status?.podIP === 'string' &&
      pod.status.podIP.length > 0
    );
  });
  const podPick =
    readyPods.length === 1
      ? { ok: true, item: readyPods[0] }
      : { ok: false, item: undefined };

  const replicaSets = (replicaSetRead.items ?? []).filter(
    (item) => item?.metadata?.labels?.app === 'object-store',
  );
  let replicaSetPick = exactlyOne(replicaSets, () => true);
  let predecessorReplicaSet;
  if (upgraded) {
    // The ready Pod's controlling ReplicaSet is current; the one other owned
    // ReplicaSet is the retained predecessor. Any further one is unknown topology.
    const podOwner = controllerOwner(podPick.item?.metadata?.ownerReferences);
    const currents = replicaSets.filter(
      (item) => podOwner && item?.metadata?.uid === podOwner.uid,
    );
    const others = replicaSets.filter((item) => !currents.includes(item));
    replicaSetPick =
      currents.length === 1 ? { ok: true, item: currents[0] } : { ok: false };
    if (others.length === 1) {
      predecessorReplicaSet = others[0];
    }
  }

  let mountinfo;
  let directoryIdentity;
  if (podPick.ok && podPick.item?.metadata?.name) {
    const execResult = run('kubectl', [
      '--context',
      contextName,
      'exec',
      '-n',
      namespace,
      podPick.item.metadata.name,
      '--',
      'cat',
      '/proc/self/mountinfo',
    ]);
    if (commandUnreadable(execResult)) {
      return { state: 'unknown', reason: 'object-store mountinfo exec failed' };
    }
    mountinfo = execResult.stdout ?? '';
    // Kind's /var volume can translate the underlying mount root. In that
    // case verify directory identity on the exact local node and selected pod.
    const hostPath = pvRead.body?.spec?.hostPath?.path;
    const nodeName = podPick.item.spec?.nodeName;
    const dataMount = parseMountinfoEntries(mountinfo).find(
      (entry) => entry.mountPoint === '/data',
    );
    if (
      dataMount &&
      typeof hostPath === 'string' &&
      (owner || !mountRootMatchesHostPath(dataMount.root, hostPath))
    ) {
      const allowedNodes = [
        profile.clusterName + '-control-plane',
        profile.clusterName + '-worker',
      ];
      const expectedPath =
        '/var/local-path-provisioner/' +
        'pvc-' +
        pvcBody?.metadata?.uid +
        '_' +
        namespace +
        '_object-store-data';
      if (
        !allowedNodes.includes(nodeName) ||
        hostPath !== expectedPath ||
        process.env.DOCKER_HOST ||
        process.env.DOCKER_CONTEXT ||
        process.env.DOCKER_TLS_VERIFY
      ) {
        return {
          state: 'unknown',
          reason: 'untrusted Kind mount translation target',
        };
      }
      const context = run('docker', ['context', 'show']);
      if (
        !context.ok ||
        !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(context.stdout.trim())
      ) {
        return { state: 'unknown', reason: 'Docker context unreadable' };
      }
      const endpoint = run('docker', [
        'context',
        'inspect',
        context.stdout.trim(),
        '--format',
        '{{.Endpoints.docker.Host}}',
      ]);
      const transport = endpoint.stdout?.trim();
      if (
        !endpoint.ok ||
        !(
          transport?.startsWith('unix:///') ||
          transport === 'npipe:////./pipe/dockerDesktopLinuxEngine'
        )
      ) {
        return { state: 'unknown', reason: 'nonlocal Docker endpoint' };
      }
      const node = run('docker', [
        'inspect',
        '--format',
        '{{ index .Config.Labels "io.x-k8s.kind.cluster" }}',
        nodeName,
      ]);
      if (!node.ok || node.stdout.trim() !== profile.clusterName) {
        return { state: 'unknown', reason: 'Kind node ownership mismatch' };
      }
      const nodeStat = run('docker', [
        'exec',
        nodeName,
        'stat',
        '-Lc',
        '%d:%i',
        hostPath,
      ]);
      const podStat = run('kubectl', [
        '--context',
        contextName,
        'exec',
        '-n',
        namespace,
        podPick.item.metadata.name,
        '--',
        'stat',
        '-Lc',
        '%d:%i',
        '/data',
      ]);
      if (!nodeStat.ok || !podStat.ok) {
        return {
          state: 'unknown',
          reason: 'storage directory identity unreadable',
        };
      }
      directoryIdentity = {
        node: nodeStat.stdout.trim(),
        pod: podStat.stdout.trim(),
      };
    }
  }

  const endpointSlicePick = exactlyOne(
    endpointSlicesRead.items ?? [],
    (item) =>
      item?.metadata?.labels?.['kubernetes.io/service-name'] === 'object-store',
  );

  return {
    state: 'ok',
    data: {
      kubeSystemUid:
        kubeSystem.state === 'ok' ? kubeSystem.body?.metadata?.uid : undefined,
      namespaceUid,
      deployment:
        deploymentRead.state === 'ok' ? deploymentRead.body : undefined,
      replicaSet: replicaSetPick.ok ? replicaSetPick.item : undefined,
      predecessorReplicaSet,
      replicaSetCount: replicaSets.length,
      podCount: (podsRead.items ?? []).length,
      secretUid,
      secretResourceVersion,
      pod: podPick.ok ? podPick.item : undefined,
      service: serviceRead.state === 'ok' ? serviceRead.body : undefined,
      endpointSlice: endpointSlicePick.ok ? endpointSlicePick.item : undefined,
      pvc: pvcBody,
      pv: pvRead.state === 'ok' ? pvRead.body : undefined,
      secretDataKeys,
      secretLabels,
      mountinfo,
      directoryIdentity,
    },
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand, priorReceipt?: object | null }} [deps]
 */
function observeChainCore(profileId, deps = {}) {
  const run = guardReadOnlyRun(deps.run ?? runPlatformCommand);
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.objectStorage;
  const priorReceipt = deps.priorReceipt ?? null;

  let history;
  try {
    history = observeHistoryCore(profileId, { ...deps, run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = makeChainResult({
      state: 'unknown',
      reason: message,
      continuity: 'unclaimed',
      namespace,
    });
    return deps.owner === true
      ? { chain: failed, history: undefined, live: undefined }
      : failed;
  }

  const baseObservation = {
    history,
    profileId,
    contextName: profile.contextName,
    namespace,
    priorReceipt,
  };

  const needsLiveChain =
    history.state === 'native-compatible' ||
    (history.state === 'refused' &&
      history.reason === LEGACY_OCCUPIED_HISTORY_REASON);

  if (!needsLiveChain) {
    const chain = classifyObjectStorageObservation(profileId, baseObservation);
    return deps.owner === true ? { chain, history, live: undefined } : chain;
  }

  const live = readLiveChainObservation(run, profile, namespace, priorReceipt, {
    owner: deps.owner === true,
    historyId: history.historyId,
  });
  if (live.state === 'unknown') {
    const unreadable = makeChainResult({
      state: 'unknown',
      reason: live.reason ?? 'live chain observation unreadable',
      continuity: 'unclaimed',
      namespace,
    });
    return deps.owner === true
      ? { chain: unreadable, history, live: undefined }
      : unreadable;
  }

  const chain = classifyObjectStorageObservation(profileId, {
    ...baseObservation,
    ...live.data,
  });
  return deps.owner === true ? { chain, history, live: live.data } : chain;
}

/**
 * Ordinary public observers refuse any pending record other than the exact
 * legacy unversioned one (fresh install reads that internally). A metrics
 * transition, marker intent or unknown record is refused even if the live
 * chain already has the final shape.
 * @param {ReturnType<typeof readPlatformProfile>} profile
 * @param {{ stateRoot?: string, readPendingState?: Function }} deps
 */
function pendingRefusal(profile, deps) {
  let pending;
  try {
    pending = (deps.readPendingState ?? readObjectStoragePendingState)(
      deps.stateRoot ?? defaultObjectStorageStateRoot(),
      profile.contextName,
    );
  } catch {
    pending = { kind: 'unknown' };
  }
  if (pending?.kind === 'absent' || pending?.kind === 'legacy') {
    return null;
  }
  return pending?.kind === 'metrics'
    ? {
        state: /** @type {const} */ ('refused'),
        reason: 'object-store metrics transition is pending',
      }
    : {
        state: /** @type {const} */ ('unknown'),
        reason: 'object-store pending record is unrecognized',
      };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand, stateRoot?: string }} [deps]
 */
export function observeObjectStorageHistory(profileId, deps = {}) {
  const profile = readPlatformProfile(profileId);
  const refusal = pendingRefusal(profile, deps);
  if (refusal) {
    return {
      ...refusal,
      releaseName: OBJECT_STORE_RELEASE_NAME,
      namespace: profile.namespaces.objectStorage,
    };
  }
  return observeHistoryCore(profileId, deps);
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand, priorReceipt?: object | null, stateRoot?: string }} [deps]
 */
export function observeObjectStorageChain(profileId, deps = {}) {
  const profile = readPlatformProfile(profileId);
  const refusal = pendingRefusal(profile, deps);
  if (refusal) {
    return makeChainResult({
      ...refusal,
      continuity: 'unclaimed',
      namespace: profile.namespaces.objectStorage,
    });
  }
  const { owner: _ignored, ...ordinary } = deps;
  return observeChainCore(profileId, ordinary);
}

const OWNER_HISTORY_IDS = new Set([
  'dev-base-r1',
  'dev-metrics-r1',
  'dev-metrics-r1-r2',
]);

/**
 * Dedicated internal observation for the owner metrics transition. It only
 * runs while the active owned intent capability verifies, before and after
 * its reads. Never accepts a bypass flag from public observers.
 * Returns a sanitized private projection: UIDs, versions and stat identity,
 * never Secret data, and never a fabricated prior receipt.
 * @param {object} handle opaque capability from the metrics transition guard
 * @param {'dev-base-r1' | 'dev-metrics-r1' | 'dev-metrics-r1-r2'} expectedHistoryId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeOwnedMetricsTransition(
  handle,
  expectedHistoryId,
  deps = {},
) {
  assertOwnedMetricsIntent(handle);
  const result = observeOwnerProjection(expectedHistoryId, deps);
  assertOwnedMetricsIntent(handle);
  return result;
}

/**
 * Read-only owner projection BEFORE the intent exists (the intent embeds this
 * identity). Only available while no pending record of any kind exists, so it
 * can never be used to look through a retained transition.
 * @param {'dev-base-r1' | 'dev-metrics-r1' | 'dev-metrics-r1-r2'} expectedHistoryId
 * @param {{ run?: typeof runPlatformCommand, stateRoot?: string }} [deps]
 */
export function observeOwnerPredecessorBeforeIntent(expectedHistoryId, deps = {}) {
  const profile = readPlatformProfile('dev');
  let pending;
  try {
    pending = readObjectStoragePendingState(
      deps.stateRoot ?? defaultObjectStorageStateRoot(),
      profile.contextName,
    );
  } catch {
    pending = { kind: 'unknown' };
  }
  if (pending.kind !== 'absent') {
    return { ok: false, reason: 'object-store pending record exists' };
  }
  return observeOwnerProjection(expectedHistoryId, deps);
}

/**
 * Exact manifest digests of the predecessor (fixed-false overlay) and target
 * dev workload documents: SHA256 of UTF-8 JSON of the parsed documents sorted
 * by document identity with recursively sorted object keys.
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function computeMetricsManifestDigests(deps = {}) {
  const run = guardReadOnlyRun(deps.run ?? runPlatformCommand);
  const digest = (documents) =>
    createHash('sha256')
      .update(
        JSON.stringify(
          [...documents]
            .sort((a, b) => {
              const x = documentIdentity(a);
              const y = documentIdentity(b);
              return x < y ? -1 : x > y ? 1 : 0;
            })
            .map(sortKeysDeep),
        ),
        'utf8',
      )
      .digest('hex');
  const render = (stdinOverlay) =>
    renderPlatformDocuments(
      { service: 'object-storage', profile: 'dev', section: 'workloads' },
      stdinOverlay ? { run, stdinOverlay } : { run },
    );
  return {
    predecessorManifestSha256: digest(render({ metricsEnabled: false })),
    targetManifestSha256: digest(render(undefined)),
  };
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep(value[key])]),
    );
  }
  return value;
}

function observeOwnerProjection(expectedHistoryId, deps = {}) {
  if (!OWNER_HISTORY_IDS.has(expectedHistoryId)) {
    return { ok: false, reason: 'expected object-store history is not selected' };
  }
  const profile = readPlatformProfile('dev');
  const observed = observeChainCore('dev', {
    run: deps.run,
    owner: true,
    priorReceipt: null,
  });
  const { chain, history, live } = observed;
  if (chain.state !== 'native-compatible') {
    return { ok: false, reason: chain.reason ?? 'object-store chain refused' };
  }
  if (history?.historyId !== expectedHistoryId) {
    return { ok: false, reason: 'object-store history does not match expected' };
  }
  const storage = HISTORY_STORAGE_UIDS.get(history) ?? {};
  const upgraded = history.historyId === 'dev-metrics-r1-r2';
  const projection = {
    contextName: profile.contextName,
    historyId: history.historyId,
    artifactId: history.artifactId,
    metricsEnabled: history.metricsEnabled,
    kubeSystemUid: live.kubeSystemUid,
    namespaceUid: live.namespaceUid,
    deploymentUid: live.deployment.metadata.uid,
    serviceUid: live.service.metadata?.uid,
    serviceClusterIP: live.service.spec?.clusterIP,
    secretUid: live.secretUid,
    secretResourceVersion: live.secretResourceVersion,
    pvcUid: live.pvc.metadata.uid,
    pvUid: live.pv.metadata.uid,
    pvHostPath: live.pv.spec.hostPath.path,
    replicaSetUid: live.replicaSet.metadata.uid,
    predecessorReplicaSetUid: upgraded
      ? live.predecessorReplicaSet.metadata.uid
      : null,
    podUid: live.pod.metadata.uid,
    nodeName: live.pod.spec?.nodeName,
    dataDirectoryIdentity: live.directoryIdentity?.node,
    helmStorageUids: { ...storage },
  };
  const complete = [
    'kubeSystemUid',
    'namespaceUid',
    'deploymentUid',
    'serviceUid',
    'serviceClusterIP',
    'secretUid',
    'secretResourceVersion',
    'pvcUid',
    'pvUid',
    'pvHostPath',
    'replicaSetUid',
    'podUid',
    'nodeName',
    'dataDirectoryIdentity',
  ].every(
    (key) => typeof projection[key] === 'string' && projection[key].length > 0,
  );
  const storageComplete = [1, 2]
    .slice(0, upgraded ? 2 : 1)
    .every((rev) => typeof storage[rev] === 'string');
  if (
    !complete ||
    !storageComplete ||
    live.directoryIdentity?.node !== live.directoryIdentity?.pod
  ) {
    return { ok: false, reason: 'owner chain identity is incomplete' };
  }
  return { ok: true, chain: projection };
}
