import { URL } from 'node:url';

const ALLOWED_KEYS = new Set([
  'bucket',
  'region',
  'endpoint',
  'prefix',
  'forcePathStyle',
  'credentials',
]);

const CREDENTIAL_ALLOWED_KEYS = new Set(['mode', 'secretName']);

const SECRET_VALUE_KEYS = new Set([
  'accessKeyId',
  'access_key_id',
  'secretAccessKey',
  'secret_access_key',
]);

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

const AWS_ACCESS_KEY_ID = /^AKIA[0-9A-Z]{16}$/;

const FORBIDDEN_OVERLAY_KEYS = ['s3Bucket', 's3Endpoint', 's3Secret'];

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {string} value
 */
function looksLikeSecretKeyMaterial(value) {
  const trimmed = value.trim();
  if (AWS_ACCESS_KEY_ID.test(trimmed)) return true;
  if (trimmed.length >= 32 && /^[A-Za-z0-9+/=_-]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * @param {unknown} value
 * @param {string} path
 */
function rejectSecretLikeStrings(value, path) {
  if (typeof value === 'string' && looksLikeSecretKeyMaterial(value)) {
    throw new Error(`${path} must not contain secret key material`);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_VALUE_KEYS.has(key)) {
        throw new Error(`${path}.${key} is not permitted in values`);
      }
      rejectSecretLikeStrings(child, `${path}.${key}`);
    }
  }
}

/**
 * @param {unknown} endpoint
 */
function validateEndpoint(endpoint) {
  if (endpoint === undefined) return;
  if (!isNonEmptyString(endpoint)) {
    throw new Error('objectStorage.endpoint must be a non-empty string');
  }
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error(
      'objectStorage.endpoint must be an absolute http or https URL',
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      'objectStorage.endpoint must be an absolute http or https URL',
    );
  }
}

/**
 * @param {unknown} prefix
 */
function validatePrefix(prefix) {
  if (prefix === undefined) return;
  if (!isNonEmptyString(prefix)) {
    throw new Error('objectStorage.prefix must be a non-empty string');
  }
  if (prefix.startsWith('/')) {
    throw new Error('objectStorage.prefix must not start with /');
  }
}

/**
 * @param {unknown} credentials
 */
function validateCredentials(credentials) {
  if (
    !credentials ||
    typeof credentials !== 'object' ||
    Array.isArray(credentials)
  ) {
    throw new Error('objectStorage.credentials is required');
  }
  for (const key of Object.keys(credentials)) {
    if (!CREDENTIAL_ALLOWED_KEYS.has(key)) {
      throw new Error(`unknown objectStorage.credentials key: ${key}`);
    }
  }
  const { mode, secretName } = credentials;
  if (mode !== 'secret' && mode !== 'default-chain') {
    throw new Error(
      'objectStorage.credentials.mode must be secret or default-chain',
    );
  }
  if (mode === 'secret') {
    if (!isNonEmptyString(secretName)) {
      throw new Error(
        'objectStorage.credentials.secretName is required for secret mode',
      );
    }
    if (!DNS_LABEL.test(secretName)) {
      throw new Error(
        'objectStorage.credentials.secretName must be a DNS label',
      );
    }
  } else if (secretName !== undefined) {
    throw new Error(
      'objectStorage.credentials.secretName is not valid for default-chain mode',
    );
  }
}

/**
 * @param {unknown} value
 */
export function validateObjectStorageBinding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('objectStorage must be an object');
  }
  for (const key of Object.keys(value)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`unknown objectStorage key: ${key}`);
    }
  }
  rejectSecretLikeStrings(value, 'objectStorage');

  const { bucket, region, forcePathStyle, credentials } = value;
  if (!isNonEmptyString(bucket)) {
    throw new Error('objectStorage.bucket is required');
  }
  if (!isNonEmptyString(region)) {
    throw new Error('objectStorage.region is required');
  }
  if (typeof forcePathStyle !== 'boolean') {
    throw new Error('objectStorage.forcePathStyle must be a boolean');
  }
  validateEndpoint(value.endpoint);
  validatePrefix(value.prefix);
  validateCredentials(credentials);

  return Object.freeze(globalThis.structuredClone(value));
}

/**
 * @param {{ bucket: string, endpoint: string, secretName: string }} input
 */
export function localObjectStorageBinding({ bucket, endpoint, secretName }) {
  return validateObjectStorageBinding({
    bucket,
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: { mode: 'secret', secretName },
  });
}

/**
 * @param {Record<string, unknown>} bindings
 */
export function assertBindingsOverlayPermitted(bindings) {
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
    throw new Error('development bindings are required');
  }
  for (const key of FORBIDDEN_OVERLAY_KEYS) {
    if (key in bindings) {
      throw new Error(`bindings override not permitted: ${key}`);
    }
  }
  if (!bindings.objectStorage) {
    throw new Error('bindings.objectStorage is required');
  }
  validateObjectStorageBinding(bindings.objectStorage);
}
