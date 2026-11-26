import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, parseAllDocuments } from 'yaml';
import {
  assertPlatformTarget,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../../../common/commands.mjs';
import { readPlatformProfile } from '../../../common/profile.mjs';
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
  const chartPath = resolvePlatformChartPath('object-storage');
  const base =
    parse(readFileSync(join(chartPath, 'values.yaml'), 'utf8')) ?? {};
  const overlay =
    parse(
      readFileSync(
        resolvePlatformProfilePath('object-storage', profileId),
        'utf8',
      ),
    ) ?? {};
  return { ...base, ...overlay };
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
    if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
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
  const names = Array.isArray(body?.items)
    ? body.items
        .map((item) => item?.metadata?.name)
        .filter((name) => typeof name === 'string')
    : [];
  return { state: 'ok', names };
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
export function observeObjectStorageHistory(profileId, deps = {}) {
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
  };
}
