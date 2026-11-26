import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAllDocuments } from 'yaml';
import { verifyManifestBytes } from '../common/pins.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const CERT_MANAGER_SHA256 =
  'c04a51295adda2b1a775146751f973e787190778c7f35180861d9678876e5c74';
export const CLUSTER_OPERATOR_SHA256 =
  '3ccd8a7c8a7f319ff21c444f3599829242f3cc1c18ae2dedea170cfcefeb8681';

export const BROKER_IMAGE_PIN =
  'docker.io/library/rabbitmq:4.3.4-management@sha256:eb5295d083325da5929a5ade766684d4019ffd2bce8bc7e43d6f9a05cafc8646';

export const DEPLOYMENT_IMAGE_PINS = Object.freeze({
  'ghcr.io/rabbitmq/cluster-operator:2.23.3':
    'ghcr.io/rabbitmq/cluster-operator:2.23.3@sha256:487c7566e5341f00d17e5c2fd079b76a49869dd6d51081371c396f32dbbf5c6a',
  'quay.io/jetstack/cert-manager-controller:v1.21.3':
    'quay.io/jetstack/cert-manager-controller:v1.21.3@sha256:9f4f96a33c7774cef24466fcd85031997531a03a8d117f151126baa8d1290dcc',
  'quay.io/jetstack/cert-manager-cainjector:v1.21.3':
    'quay.io/jetstack/cert-manager-cainjector:v1.21.3@sha256:083d0e906f8eb44e255fe4ff817ae54e49f9ed82e22f1011bb4e9e4f4b8a641f',
  'quay.io/jetstack/cert-manager-webhook:v1.21.3':
    'quay.io/jetstack/cert-manager-webhook:v1.21.3@sha256:055ac8e9de6a0ba6763794838fe38944acc650f68ebe1b01dd8be079e580f458',
});

export const NATIVE_DESIGN_LABEL = 'offscreen.rpg/rabbitmq-design';
export const NATIVE_DESIGN_VALUE = 'native-v1';

export const CERT_MANAGER_RESOURCE_COUNT = 47;
export const CLUSTER_OPERATOR_RESOURCE_COUNT = 16;

const CERT_MANAGER_PATH = join(moduleDir, 'vendor/cert-manager-v1.21.3.yaml');
const CLUSTER_OPERATOR_PATH = join(
  moduleDir,
  'vendor/cluster-operator-v2.23.3.yml',
);

/** @type {Record<'cert-manager' | 'cluster-operator', { resourceCount: number, deploymentImageCount: number, designNamespace: string, sha256: string, path: string }>} */
const BUNDLE_CONFIG = Object.freeze({
  'cert-manager': Object.freeze({
    resourceCount: CERT_MANAGER_RESOURCE_COUNT,
    deploymentImageCount: 3,
    designNamespace: 'cert-manager',
    sha256: CERT_MANAGER_SHA256,
    path: CERT_MANAGER_PATH,
  }),
  'cluster-operator': Object.freeze({
    resourceCount: CLUSTER_OPERATOR_RESOURCE_COUNT,
    deploymentImageCount: 1,
    designNamespace: 'rabbitmq-system',
    sha256: CLUSTER_OPERATOR_SHA256,
    path: CLUSTER_OPERATOR_PATH,
  }),
});

/** @type {Map<'cert-manager' | 'cluster-operator', Set<string>>} */
const canonicalIdentityCache = new Map();

/**
 * @param {object} object
 */
export function bundleDocumentIdentity(object) {
  const ns = object?.metadata?.namespace ?? '-';
  const name = object?.metadata?.name ?? '-';
  const kind = object?.kind ?? '-';
  return `${kind}/${ns}/${name}`;
}

/**
 * @param {string} text
 * @param {number} expectedCount
 * @param {string} bundleLabel
 */
function parseBundleObjects(text, expectedCount, bundleLabel) {
  let documents;
  try {
    documents = parseAllDocuments(text);
  } catch {
    throw new Error(`malformed ${bundleLabel} document`);
  }
  if (documents.length !== expectedCount) {
    throw new Error(
      `${bundleLabel} inventory count mismatch: expected ${expectedCount}, got ${documents.length}`,
    );
  }
  const seen = new Set();
  /** @type {object[]} */
  const objects = [];
  for (const doc of documents) {
    if (doc.errors?.length) {
      throw new Error(
        `malformed ${bundleLabel} document: ${doc.errors[0]?.message ?? 'yaml error'}`,
      );
    }
    const object = doc.toJS({ maxAliasCount: 0 });
    if (!object || typeof object !== 'object' || Array.isArray(object)) {
      throw new Error(`malformed ${bundleLabel} document`);
    }
    if (
      typeof object.kind !== 'string' ||
      typeof object.metadata?.name !== 'string'
    ) {
      throw new Error(
        `malformed ${bundleLabel} document: missing kind or name`,
      );
    }
    const id = bundleDocumentIdentity(object);
    if (seen.has(id)) {
      throw new Error(`duplicate platform identity: ${id}`);
    }
    seen.add(id);
    objects.push(object);
  }
  return objects;
}

/**
 * @param {'cert-manager' | 'cluster-operator'} bundle
 */
function canonicalIdentitiesForBundle(bundle) {
  if (canonicalIdentityCache.has(bundle)) {
    return canonicalIdentityCache.get(bundle);
  }
  const config = BUNDLE_CONFIG[bundle];
  const text = readFileSync(config.path, 'utf8');
  const objects = parseBundleObjects(text, config.resourceCount, bundle);
  const identities = new Set(
    objects.map((object) => bundleDocumentIdentity(object)),
  );
  canonicalIdentityCache.set(bundle, identities);
  return identities;
}

/**
 * @param {string} text
 * @param {{
 *   bundle: 'cert-manager' | 'cluster-operator',
 *   enforceCanonicalIdentities?: boolean,
 * }} options
 */
export function parseVendorBundle(text, options) {
  const config = BUNDLE_CONFIG[options.bundle];
  const objects = parseBundleObjects(
    text,
    config.resourceCount,
    options.bundle,
  );
  if (options.enforceCanonicalIdentities !== false) {
    const canonical = canonicalIdentitiesForBundle(options.bundle);
    for (const object of objects) {
      const id = bundleDocumentIdentity(object);
      if (!canonical.has(id)) {
        throw new Error(`unknown vendor identity: ${id}`);
      }
    }
  }

  const imagesFound = [];
  for (const object of objects) {
    if (object.kind === 'Deployment') {
      const image = object.spec?.template?.spec?.containers?.[0]?.image;
      if (typeof image !== 'string') {
        throw new Error('deployment image missing');
      }
      if (!Object.hasOwn(DEPLOYMENT_IMAGE_PINS, image)) {
        throw new Error(`unexpected deployment image: ${image}`);
      }
      imagesFound.push(image);
      object.spec.template.spec.containers[0].image =
        DEPLOYMENT_IMAGE_PINS[image];
    }
    if (
      object.kind === 'Namespace' &&
      object.metadata?.name === config.designNamespace
    ) {
      object.metadata.labels ??= {};
      object.metadata.labels[NATIVE_DESIGN_LABEL] = NATIVE_DESIGN_VALUE;
    }
  }

  if (imagesFound.length !== config.deploymentImageCount) {
    throw new Error(
      `unexpected deployment image count: expected ${config.deploymentImageCount}, got ${imagesFound.length}`,
    );
  }

  return {
    objects,
    identities: objects.map((object) => bundleDocumentIdentity(object)),
  };
}

/**
 * @param {string} filePath
 */
export function vendorFileSha256Hex(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * @param {'cert-manager' | 'cluster-operator'} bundle
 * @param {{ path?: string, bytes?: Buffer, enforceCanonicalIdentities?: boolean }} [deps]
 */
export function loadVendorBundle(bundle, deps = {}) {
  const config = BUNDLE_CONFIG[bundle];
  const path = deps.path ?? config.path;
  const bytes = deps.bytes ?? readFileSync(path);
  verifyManifestBytes(bytes, config.sha256);
  return parseVendorBundle(bytes.toString('utf8'), {
    bundle,
    enforceCanonicalIdentities: deps.enforceCanonicalIdentities,
  });
}

export function certManagerVendorPath() {
  return CERT_MANAGER_PATH;
}

export function clusterOperatorVendorPath() {
  return CLUSTER_OPERATOR_PATH;
}
