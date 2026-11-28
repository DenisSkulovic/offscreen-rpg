import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, parseAllDocuments } from 'yaml';
import { readPlatformProfile } from '../common/profile.mjs';
import { runObservabilityReadCommand } from './identity.mjs';

const observabilityRoot = dirname(fileURLToPath(import.meta.url));
const valuesRoot = join(observabilityRoot, 'values');
const locksRoot = join(observabilityRoot, 'locks');
const vendorRoot = join(observabilityRoot, 'vendor');
const DEV_COLLECTOR_OVERLAY = join(
  valuesRoot,
  'profiles',
  'dev',
  'collector.yaml',
);

const HELM_TIMEOUT_MS = 60_000;

const LOCK_HEADER = 'role\timmutable-reference';
const LOCK_ROLES = Object.freeze([
  'collector',
  'prometheus',
  'loki',
  'tempo',
  'grafana',
]);

/** @type {Readonly<Record<string, string>>} */
const FROZEN_ROLE_REPOSITORY = Object.freeze({
  collector:
    'ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib',
  prometheus: 'quay.io/prometheus/prometheus',
  loki: 'docker.io/grafana/loki',
  tempo: 'docker.io/grafana/tempo',
  grafana: 'docker.io/grafana/grafana',
});

const PRIMARY_CONTAINER_NAME = Object.freeze({
  collector: 'opentelemetry-collector',
  prometheus: 'prometheus-server',
  loki: 'loki',
  tempo: 'tempo',
  grafana: 'grafana',
});

const GRAFANA_DISTROLESS_TAG = '13.3.2-distroless';
const TEMPO_PINNED_APP_VERSION = '3.1.1';

/** @typedef {'dev' | 'release'} ObservabilityProfileId */

/** @typedef {(command: string, args: string[], options?: { timeoutMs?: number }) => { ok: boolean, status: number, stdout: string, stderr: string, timedOut: boolean, missing: boolean }} PlatformRun */

/** @type {readonly { name: string, role: string, valuesFile: string }[]} */
export const OBSERVABILITY_RELEASE_ORDER = Object.freeze([
  { name: 'obs-prometheus', role: 'prometheus', valuesFile: 'prometheus.yaml' },
  { name: 'obs-loki', role: 'loki', valuesFile: 'loki.yaml' },
  { name: 'obs-tempo', role: 'tempo', valuesFile: 'tempo.yaml' },
  { name: 'obs-collector', role: 'collector', valuesFile: 'collector.yaml' },
  { name: 'obs-grafana', role: 'grafana', valuesFile: 'grafana.yaml' },
]);

const PRIMARY_WORKLOAD = Object.freeze({
  collector: { kind: 'Deployment', name: 'obs-collector' },
  prometheus: { kind: 'Deployment', name: 'obs-prometheus' },
  loki: { kind: 'StatefulSet', name: 'obs-loki' },
  tempo: { kind: 'StatefulSet', name: 'obs-tempo' },
  grafana: { kind: 'Deployment', name: 'obs-grafana' },
});

const ALLOWED_INVENTORY_KINDS = new Set([
  'ServiceAccount',
  'ConfigMap',
  'Service',
  'Deployment',
  'StatefulSet',
  'PersistentVolumeClaim',
]);

const GRAFANA_ADMIN_SECRET = 'obs-grafana-admin';

/**
 * @param {string} message
 */
function throwArtifactInvalid(message) {
  throw new Error(`artifact-invalid: ${message}`);
}

/**
 * @param {string} filePath
 */
function fileSha256Hex(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * @param {string} reference
 */
function parseCanonicalReference(reference) {
  const digestIndex = reference.indexOf('@sha256:');
  if (digestIndex < 1) throwArtifactInvalid('image lock missing digest');
  const repository = reference.slice(0, digestIndex);
  const hex = reference.slice(digestIndex + '@sha256:'.length);
  if (repository.length === 0 || repository.includes('@')) {
    throwArtifactInvalid('malformed image lock');
  }
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throwArtifactInvalid('image lock digest malformed');
  }
  const digest = `sha256:${hex}`;
  return { repository, hex, digest, canonicalReference: reference };
}

/**
 * @param {string} role
 * @param {string} reference
 */
function assertFrozenRepository(role, reference) {
  const { repository } = parseCanonicalReference(reference);
  const expected = FROZEN_ROLE_REPOSITORY[role];
  if (repository !== expected) {
    throwArtifactInvalid('image lock repository mismatch');
  }
}

/**
 * @param {string} tsvText
 */
function parseImageLock(tsvText) {
  const normalized = tsvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length === 0 || lines[0].trim() !== LOCK_HEADER) {
    throwArtifactInvalid('malformed image lock header');
  }
  /** @type {Record<string, string>} */
  const locks = {};
  let dataRows = 0;
  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    dataRows += 1;
    const tab = trimmed.indexOf('\t');
    if (tab < 1) throwArtifactInvalid('malformed image lock');
    const role = trimmed.slice(0, tab);
    const reference = trimmed.slice(tab + 1);
    if (!LOCK_ROLES.includes(role))
      throwArtifactInvalid('unknown image lock role');
    if (locks[role]) throwArtifactInvalid('duplicate image lock role');
    assertFrozenRepository(role, reference);
    locks[role] = reference;
  }
  if (dataRows !== LOCK_ROLES.length) {
    throwArtifactInvalid('image lock row count mismatch');
  }
  for (const role of LOCK_ROLES) {
    if (!locks[role]) throwArtifactInvalid('missing image lock role');
  }
  return locks;
}

/**
 * @param {Record<string, string>} locks
 */
function validateImageLockRecord(locks) {
  const keys = Object.keys(locks);
  for (const role of keys) {
    if (!LOCK_ROLES.includes(role))
      throwArtifactInvalid('unknown image lock role');
  }
  if (keys.length !== LOCK_ROLES.length) {
    throwArtifactInvalid('image lock row count mismatch');
  }
  for (const role of LOCK_ROLES) {
    const reference = locks[role];
    if (typeof reference !== 'string' || reference.length === 0) {
      throwArtifactInvalid('missing image lock role');
    }
    assertFrozenRepository(role, reference);
  }
}

function loadPins() {
  const text = readFileSync(join(locksRoot, 'charts.yaml'), 'utf8');
  /** @type {unknown} */
  let parsed;
  try {
    parsed = parseYaml(text);
  } catch {
    throwArtifactInvalid('malformed pins yaml');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('charts' in parsed) ||
    typeof (/** @type {{ charts?: unknown }} */ (parsed).charts) !== 'object'
  ) {
    throwArtifactInvalid('malformed pins document');
  }
  const charts =
    /** @type {Record<string, { name: string, version: string, sha256: string, appVersion?: string }>} */ (
      /** @type {{ charts: Record<string, unknown> }} */ (parsed).charts
    );
  return charts;
}

/**
 * @param {string} role
 * @param {Record<string, { name: string, version: string, sha256: string, appVersion?: string }>} pins
 * @param {string} canonicalReference
 */
function buildExpectedImage(role, pins, canonicalReference) {
  const { repository, hex, digest } =
    parseCanonicalReference(canonicalReference);
  const containerName =
    PRIMARY_CONTAINER_NAME[
      /** @type {keyof typeof PRIMARY_CONTAINER_NAME} */ (role)
    ];
  /** @type {string} */
  let renderedReference;
  /** @type {string[]} */
  const imageArgs = [];
  switch (role) {
    case 'collector':
      renderedReference = `${repository}@${digest}`;
      imageArgs.push('--set-string', `image.digest=${digest}`);
      break;
    case 'prometheus':
      renderedReference = `${repository}@${digest}`;
      imageArgs.push('--set-string', `server.image.digest=${digest}`);
      break;
    case 'loki':
      renderedReference = `${repository}@${digest}`;
      imageArgs.push('--set-string', `singleBinary.image.digest=${digest}`);
      break;
    case 'tempo': {
      const appVersion = pins.tempo?.appVersion;
      if (appVersion !== TEMPO_PINNED_APP_VERSION) {
        throwArtifactInvalid('tempo appVersion pin mismatch');
      }
      const tag = `${TEMPO_PINNED_APP_VERSION}@${digest}`;
      renderedReference = `${repository}:${TEMPO_PINNED_APP_VERSION}@${digest}`;
      imageArgs.push('--set-string', `tempo.tag=${tag}`);
      break;
    }
    case 'grafana':
      renderedReference = `${repository}:${GRAFANA_DISTROLESS_TAG}@${digest}`;
      imageArgs.push(
        '--set-string',
        `image.tag=${GRAFANA_DISTROLESS_TAG}`,
        '--set-string',
        `image.sha=${hex}`,
      );
      break;
    default:
      throwArtifactInvalid('unknown observability role');
  }
  return {
    containerName,
    renderedReference,
    canonicalReference,
    imageArgs,
  };
}

/**
 * @param {string} role
 * @param {string} storageClass
 */
function storageSubstitutionArgs(role, storageClass) {
  if (role === 'prometheus') {
    return [
      '--set-string',
      `server.persistentVolume.storageClass=${storageClass}`,
    ];
  }
  if (role === 'loki') {
    return [
      '--set-string',
      `singleBinary.persistence.storageClass=${storageClass}`,
    ];
  }
  if (role === 'tempo') {
    return ['--set-string', `persistence.storageClassName=${storageClass}`];
  }
  return [];
}

/**
 * @param {string} output
 */
function parseHelmDocuments(output) {
  if (!output.trim()) throwArtifactInvalid('empty helm render');
  /** @type {Record<string, unknown>[]} */
  const documents = [];
  try {
    for (const document of parseAllDocuments(output)) {
      if (document.errors.length > 0)
        throwArtifactInvalid('malformed helm render');
      const value = document.toJS();
      if (value != null) documents.push(value);
    }
  } catch {
    throwArtifactInvalid('malformed helm render');
  }
  return documents;
}

/**
 * @param {Record<string, unknown>[]} documents
 * @param {string} namespace
 */
function rejectForbiddenDocuments(documents, namespace) {
  for (const doc of documents) {
    const kind = doc.kind;
    const meta =
      /** @type {{ metadata?: { namespace?: string, name?: string, annotations?: Record<string, string> } }} */ (
        doc
      ).metadata;
    if (typeof kind !== 'string' || !meta)
      throwArtifactInvalid('malformed manifest');
    if (meta.namespace && meta.namespace !== namespace) {
      throwArtifactInvalid('unexpected manifest namespace');
    }
    const hook = meta.annotations?.['helm.sh/hook'];
    if (hook) throwArtifactInvalid('unexpected helm hook');
    if (kind === 'Secret' && meta.name === GRAFANA_ADMIN_SECRET) {
      throwArtifactInvalid('grafana admin secret in render output');
    }
  }
}

/**
 * @param {Record<string, unknown>[]} documents
 * @param {string} role
 * @param {{ containerName: string, renderedReference: string, canonicalReference: string }} expectedImage
 */
function assertPrimaryWorkloadImage(documents, role, expectedImage) {
  const spec =
    PRIMARY_WORKLOAD[/** @type {keyof typeof PRIMARY_WORKLOAD} */ (role)];
  const workload = documents.find(
    (doc) => doc.kind === spec.kind && doc.metadata?.name === spec.name,
  );
  if (!workload) throwArtifactInvalid('missing primary workload');
  const podSpec =
    /** @type {{ spec?: { template?: { spec?: { containers?: { name?: string, image?: string }[], initContainers?: unknown[], ephemeralContainers?: unknown[] } } } }} */ (
      workload
    ).spec?.template?.spec;
  if (!podSpec) throwArtifactInvalid('missing primary workload pod spec');
  const initContainers = podSpec.initContainers ?? [];
  const ephemeralContainers = podSpec.ephemeralContainers ?? [];
  if (initContainers.length > 0) {
    throwArtifactInvalid('unexpected init container');
  }
  if (ephemeralContainers.length > 0) {
    throwArtifactInvalid('unexpected ephemeral container');
  }
  const containers = podSpec.containers ?? [];
  if (containers.length !== 1) {
    throwArtifactInvalid('unexpected regular container count');
  }
  const container = containers[0];
  if (container?.name !== expectedImage.containerName) {
    throwArtifactInvalid('primary workload container name mismatch');
  }
  const image = container?.image;
  if (typeof image !== 'string' || image.length === 0) {
    throwArtifactInvalid('missing primary workload image');
  }
  if (image !== expectedImage.renderedReference) {
    throwArtifactInvalid('primary workload image reference mismatch');
  }
}

/**
 * @param {Record<string, unknown>[]} documents
 * @param {string} role
 * @param {string} releaseName
 * @param {string} namespace
 */
function collectReleaseInventoryRows(documents, role, releaseName, namespace) {
  /** @type {[string, string, string, string, string][]} */
  const direct = [];
  /** @type {[string, string, string, string, string][]} */
  const generated = [];
  const seen = new Set();
  for (const doc of documents) {
    const kind = doc.kind;
    const meta =
      /** @type {{ apiVersion?: string, metadata?: { namespace?: string, name?: string } }} */ (
        doc
      );
    const apiVersion = meta.apiVersion;
    const name = meta.metadata?.name;
    const docNs = meta.metadata?.namespace;
    if (
      typeof kind !== 'string' ||
      typeof apiVersion !== 'string' ||
      typeof name !== 'string'
    ) {
      throwArtifactInvalid('malformed manifest identity');
    }
    if (docNs !== namespace)
      throwArtifactInvalid('manifest namespace mismatch');
    if (!ALLOWED_INVENTORY_KINDS.has(kind)) {
      throwArtifactInvalid('unexpected manifest kind');
    }
    const key = `${kind}/${name}`;
    if (seen.has(key)) throwArtifactInvalid('duplicate manifest identity');
    seen.add(key);
    direct.push([apiVersion, kind, namespace, name, releaseName]);
    if (kind === 'StatefulSet') {
      const claims =
        /** @type {{ spec?: { volumeClaimTemplates?: { metadata?: { name?: string } }[] } }} */ (
          doc
        ).spec?.volumeClaimTemplates ?? [];
      const stsName = name;
      for (const claim of claims) {
        const claimName = claim.metadata?.name;
        if (typeof claimName !== 'string' || claimName.length === 0) {
          throwArtifactInvalid('malformed volume claim template');
        }
        generated.push([
          'v1',
          'PersistentVolumeClaim',
          namespace,
          `${claimName}-${stsName}-0`,
          releaseName,
        ]);
      }
    }
  }
  return { direct, generated };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ direct: [string, string, string, string, string][], generatedClaims: [string, string, string, string, string][] }} expected
 * @param {[string, string, string, string, string][]} direct
 * @param {[string, string, string, string, string][]} generated
 */
function assertInventoryMatch(profileId, expected, direct, generated) {
  const sortRows = (rows) =>
    rows
      .map((row) => JSON.stringify(row))
      .sort()
      .map(
        (text) =>
          /** @type {[string, string, string, string, string]} */ (
            JSON.parse(text)
          ),
      );
  const actualDirect = sortRows(direct);
  const actualGenerated = sortRows(generated);
  const expectedDirect = sortRows(expected.direct);
  const expectedGenerated = sortRows(expected.generatedClaims);
  if (
    JSON.stringify(actualDirect) !== JSON.stringify(expectedDirect) ||
    JSON.stringify(actualGenerated) !== JSON.stringify(expectedGenerated)
  ) {
    throwArtifactInvalid(`inventory mismatch for profile ${profileId}`);
  }
}

/**
 * @param {PlatformRun} run
 */
function defaultHelmRun(command, args, options = {}) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  const explicit =
    typeof options.timeoutMs === 'number' ? options.timeoutMs : HELM_TIMEOUT_MS;
  const remaining =
    typeof options.remainingMs === 'number'
      ? Math.max(0, Math.floor(options.remainingMs))
      : HELM_TIMEOUT_MS;
  const timeoutMs = Math.min(HELM_TIMEOUT_MS, explicit, remaining);
  return runObservabilityReadCommand(command, args, {
    input: options.input,
    timeoutMs,
  });
}

/**
 * Ordered `-f` values paths followed by storage and image arguments.
 * @param {{ valuesPaths: readonly string[], helmValueArgs: readonly string[] }} release
 */
export function helmValuesArgv(release) {
  return release.valuesPaths
    .flatMap((path) => ['-f', path])
    .concat(release.helmValueArgs);
}

/** @typedef {'desired' | 'predecessor'} ObservabilityArtifactVariant */
/** @typedef {'dev-e1-base' | 'dev-e1-developer' | 'release-e1'} ObservabilityArtifactId */

/** Internal immutable E1 artifact IDs and the profile each belongs to. */
const E1_ARTIFACT_IDS = Object.freeze({
  'dev-e1-base': { profileId: 'dev', variant: 'predecessor' },
  'dev-e1-developer': { profileId: 'dev', variant: 'desired' },
  'release-e1': { profileId: 'release', variant: 'desired' },
});

/** Reserved; refuses until a later Change adds a validated E2 bundle. */
const RESERVED_E2_ARTIFACT_ID = 'dev-e2';

/**
 * Resolve a historical alias or a named artifact ID to the internal variant
 * and artifact ID.
 * @param {ObservabilityProfileId} profileId
 * @param {ObservabilityArtifactVariant | ObservabilityArtifactId | string | undefined} selector
 * @returns {{ artifactId: ObservabilityArtifactId, variant: ObservabilityArtifactVariant }}
 */
function assertArtifactVariantAllowed(profileId, selector) {
  const selected = selector ?? 'desired';
  if (selected === 'desired' || selected === 'predecessor') {
    if (profileId === 'release' && selected === 'predecessor') {
      throwArtifactInvalid('release predecessor refused');
    }
    const artifactId =
      profileId === 'release'
        ? 'release-e1'
        : selected === 'desired'
          ? 'dev-e1-developer'
          : 'dev-e1-base';
    return { artifactId, variant: selected };
  }
  if (selected === RESERVED_E2_ARTIFACT_ID) {
    throwArtifactInvalid('artifact dev-e2 is not available');
  }
  if (
    typeof selected !== 'string' ||
    !Object.hasOwn(E1_ARTIFACT_IDS, selected)
  ) {
    throwArtifactInvalid('unknown artifact variant');
  }
  const entry = E1_ARTIFACT_IDS[/** @type {ObservabilityArtifactId} */ (selected)];
  if (entry.profileId !== profileId) {
    throwArtifactInvalid('artifact id does not belong to profile');
  }
  return {
    artifactId: /** @type {ObservabilityArtifactId} */ (selected),
    variant: entry.variant,
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {ObservabilityArtifactVariant} variant
 * @param {string} role
 * @param {string} valuesFile
 */
function resolveValuesPaths(profileId, variant, role, valuesFile) {
  if (role !== 'collector') {
    return [join(valuesRoot, valuesFile)];
  }
  const base = join(valuesRoot, 'collector.yaml');
  if (profileId === 'release' || variant === 'predecessor') {
    return [base];
  }
  return [base, DEV_COLLECTOR_OVERLAY];
}

/**
 * @param {readonly string[]} valuesPaths
 */
function readAndValidateValues(valuesPaths) {
  for (const valuesPath of valuesPaths) {
    let valuesText;
    try {
      valuesText = readFileSync(valuesPath, 'utf8');
    } catch {
      throwArtifactInvalid('missing values yaml');
    }
    try {
      parseYaml(valuesText);
    } catch {
      throwArtifactInvalid('malformed values yaml');
    }
  }
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {ObservabilityArtifactVariant} variant
 * @param {{ verifyArchive: boolean, pins: ReturnType<typeof loadPins>, imageLocks: Record<string, string> }} context
 * @param {ReturnType<typeof readPlatformProfile>} profile
 */
function buildValidatedReleasePlans(profileId, variant, context, profile) {
  /** @type {{ release: (typeof OBSERVABILITY_RELEASE_ORDER)[number], pin: { name: string, version: string, sha256: string, appVersion: string }, chartPath: string, valuesPaths: string[], helmValueArgs: string[], expectedImage: { containerName: string, renderedReference: string, canonicalReference: string } }[]} */
  const releasePlans = [];

  for (const release of OBSERVABILITY_RELEASE_ORDER) {
    const pin = context.pins[release.role];
    if (
      typeof pin?.name !== 'string' ||
      pin.name.length === 0 ||
      typeof pin.version !== 'string' ||
      pin.version.length === 0 ||
      typeof pin.appVersion !== 'string' ||
      pin.appVersion.length === 0 ||
      typeof pin.sha256 !== 'string' ||
      pin.sha256.length === 0
    ) {
      throwArtifactInvalid(`missing pin for ${release.role}`);
    }
    const archiveName = `${pin.name}-${pin.version}.tgz`;
    const chartPath = join(vendorRoot, archiveName);
    if (context.verifyArchive) {
      const actualHex = fileSha256Hex(chartPath);
      if (actualHex.toLowerCase() !== pin.sha256.toLowerCase()) {
        throwArtifactInvalid(`archive sha256 mismatch for ${archiveName}`);
      }
    }
    const valuesPaths = resolveValuesPaths(
      profileId,
      variant,
      release.role,
      release.valuesFile,
    );
    readAndValidateValues(valuesPaths);
    const canonicalReference = context.imageLocks[release.role];
    if (!canonicalReference) {
      throwArtifactInvalid('missing image lock role');
    }
    const expectedImage = buildExpectedImage(
      release.role,
      context.pins,
      canonicalReference,
    );
    const helmValueArgs = [
      ...storageSubstitutionArgs(release.role, profile.storageClass),
      ...expectedImage.imageArgs,
    ];
    releasePlans.push({
      release,
      pin,
      chartPath,
      valuesPaths,
      helmValueArgs,
      expectedImage: {
        containerName: expectedImage.containerName,
        renderedReference: expectedImage.renderedReference,
        canonicalReference: expectedImage.canonicalReference,
      },
    });
  }
  return releasePlans;
}

/**
 * @param {ReturnType<typeof buildValidatedReleasePlans>[number]} plan
 * @param {PlatformRun} run
 * @param {string} namespace
 */
function renderValidatedPlan(plan, run, namespace) {
  const helmArgs = [
    'template',
    plan.release.name,
    plan.chartPath,
    '--namespace',
    namespace,
    ...helmValuesArgv(plan),
  ];
  const rendered = run('helm', helmArgs, { timeoutMs: HELM_TIMEOUT_MS });
  if (!rendered.ok || rendered.timedOut || rendered.missing) {
    throwArtifactInvalid(`helm render failed for ${plan.release.name}`);
  }
  const releaseDocs = parseHelmDocuments(rendered.stdout);
  rejectForbiddenDocuments(releaseDocs, namespace);
  assertPrimaryWorkloadImage(
    releaseDocs,
    plan.release.role,
    plan.expectedImage,
  );
  const { direct, generated } = collectReleaseInventoryRows(
    releaseDocs,
    plan.release.role,
    plan.release.name,
    namespace,
  );
  return {
    name: plan.release.name,
    role: plan.release.role,
    chartPath: plan.chartPath,
    chartName: plan.pin.name,
    chartVersion: plan.pin.version,
    appVersion: plan.pin.appVersion,
    sha256: plan.pin.sha256,
    valuesPaths: plan.valuesPaths,
    helmValueArgs: plan.helmValueArgs,
    expectedImage: plan.expectedImage,
    documents: releaseDocs,
    inventory: { direct, generated },
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {ReturnType<typeof renderValidatedPlan>[]} renderedReleases
 * @param {ReturnType<typeof readPlatformProfile>} profile
 * @param {Record<string, unknown>} expected
 * @param {Record<string, string>} imageLocks
 * @param {ObservabilityArtifactId} artifactId
 */
function finalizeArtifactBundle(
  profileId,
  renderedReleases,
  profile,
  expected,
  imageLocks,
  artifactId,
) {
  /** @type {Record<string, unknown>[]} */
  const documents = [];
  /** @type {[string, string, string, string, string][]} */
  const allDirect = [];
  /** @type {[string, string, string, string, string][]} */
  const allGenerated = [];
  for (const row of renderedReleases) {
    documents.push(...row.documents);
    allDirect.push(...row.inventory.direct);
    allGenerated.push(...row.inventory.generated);
  }
  assertInventoryMatch(profileId, expected, allDirect, allGenerated);

  return {
    artifactId,
    profile,
    releases: renderedReleases.map((row) => {
      const { inventory, ...rest } = row;
      void inventory;
      return rest;
    }),
    documents,
    expectedInventory: expected,
    imageLocks,
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun, verifyArchive?: boolean, imageLocks?: Record<string, string>, pins?: ReturnType<typeof loadPins>, variant?: ObservabilityArtifactVariant | ObservabilityArtifactId }} [deps]
 */
export function loadArtifacts(profileId, deps = {}) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const run = deps.run ?? defaultHelmRun;
  const verifyArchive = deps.verifyArchive !== false;
  const { artifactId, variant } = assertArtifactVariantAllowed(
    profileId,
    deps.variant,
  );
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.observability;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throwArtifactInvalid('observability namespace missing from profile');
  }

  const pins = deps.pins ?? loadPins();
  const canonicalImageLocks = parseImageLock(
    readFileSync(join(locksRoot, 'images.tsv'), 'utf8'),
  );
  const imageLocks = deps.imageLocks ?? canonicalImageLocks;
  if (deps.imageLocks) {
    validateImageLockRecord(imageLocks);
  }
  const expectedInventory = JSON.parse(
    readFileSync(join(observabilityRoot, 'expected-inventory.json'), 'utf8'),
  );
  const expected = expectedInventory[profileId];
  if (!expected?.direct || !expected?.generatedClaims) {
    throwArtifactInvalid('missing expected inventory profile');
  }

  const context = { verifyArchive, pins, imageLocks };
  const releasePlans = buildValidatedReleasePlans(
    profileId,
    variant,
    context,
    profile,
  );
  const renderedReleases = releasePlans.map((plan) =>
    renderValidatedPlan(plan, run, namespace),
  );
  return finalizeArtifactBundle(
    profileId,
    renderedReleases,
    profile,
    expected,
    imageLocks,
    artifactId,
  );
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun, verifyArchive?: boolean, imageLocks?: Record<string, string>, pins?: ReturnType<typeof loadPins> }} [deps]
 */
export function loadObservabilityVariants(profileId, deps = {}) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const run = deps.run ?? defaultHelmRun;
  const verifyArchive = deps.verifyArchive !== false;
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.observability;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throwArtifactInvalid('observability namespace missing from profile');
  }

  const pins = deps.pins ?? loadPins();
  const canonicalImageLocks = parseImageLock(
    readFileSync(join(locksRoot, 'images.tsv'), 'utf8'),
  );
  const imageLocks = deps.imageLocks ?? canonicalImageLocks;
  if (deps.imageLocks) {
    validateImageLockRecord(imageLocks);
  }
  const expectedInventory = JSON.parse(
    readFileSync(join(observabilityRoot, 'expected-inventory.json'), 'utf8'),
  );
  const expected = expectedInventory[profileId];
  if (!expected?.direct || !expected?.generatedClaims) {
    throwArtifactInvalid('missing expected inventory profile');
  }

  const context = { verifyArchive, pins, imageLocks };
  const desiredPlans = buildValidatedReleasePlans(
    profileId,
    'desired',
    context,
    profile,
  );
  const desiredRendered = desiredPlans.map((plan) =>
    renderValidatedPlan(plan, run, namespace),
  );
  const desired = finalizeArtifactBundle(
    profileId,
    desiredRendered,
    profile,
    expected,
    imageLocks,
    profileId === 'release' ? 'release-e1' : 'dev-e1-developer',
  );

  if (profileId === 'release') {
    return { desired, predecessor: null };
  }

  const collectorPlan = desiredPlans.find(
    (plan) => plan.release.role === 'collector',
  );
  if (!collectorPlan) {
    throwArtifactInvalid('missing collector release plan');
  }
  const baseCollectorPlan = {
    ...collectorPlan,
    valuesPaths: [join(valuesRoot, 'collector.yaml')],
  };
  const baseCollectorRendered = renderValidatedPlan(
    baseCollectorPlan,
    run,
    namespace,
  );
  const predecessorRendered = desiredRendered.map((row) =>
    row.role === 'collector' ? baseCollectorRendered : row,
  );
  const predecessor = finalizeArtifactBundle(
    profileId,
    predecessorRendered,
    profile,
    expected,
    imageLocks,
    'dev-e1-base',
  );
  return { desired, predecessor };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun }} [deps]
 */
export function renderObservabilityDocuments(profileId, deps = {}) {
  return loadArtifacts(profileId, deps).documents;
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun }} [deps]
 */
export function lintObservability(profileId, deps = {}) {
  loadArtifacts(profileId, deps);
}
