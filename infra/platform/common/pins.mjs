import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

const DIGEST_KEY = /(?:_DIGEST|_SHA256)$/;

/**
 * @param {string} key
 * @param {string} value
 */
function assertDigestValue(key, value) {
  if (!DIGEST_KEY.test(key)) return;
  const bare = value.startsWith('sha256:')
    ? value.slice('sha256:'.length)
    : value;
  if (!/^[0-9a-f]{64}$/i.test(bare)) {
    throw new Error(`invalid digest for ${key}`);
  }
}

/**
 * @param {string} text
 * @param {readonly string[]} requiredKeys
 */
export function parsePins(text, requiredKeys) {
  if (!Array.isArray(requiredKeys) || requiredKeys.length === 0) {
    throw new Error('requiredKeys must be a non-empty array');
  }
  const required = new Set(requiredKeys);
  /** @type {Record<string, string>} */
  const values = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const split = trimmed.indexOf('=');
    if (split < 1) {
      throw new Error('malformed pin line');
    }
    const key = trimmed.slice(0, split);
    const value = trimmed.slice(split + 1);
    if (!required.has(key)) {
      throw new Error(`unknown pin key: ${key}`);
    }
    if (values[key] !== undefined) {
      throw new Error(`duplicate pin key: ${key}`);
    }
    values[key] = value;
    assertDigestValue(key, value);
  }
  for (const key of requiredKeys) {
    if (!values[key]) {
      throw new Error(`missing pin key: ${key}`);
    }
  }
  return values;
}

/**
 * @param {Buffer | Uint8Array | string} bytes
 * @param {string} sha256
 */
export function verifyManifestBytes(bytes, sha256) {
  const expected = sha256.startsWith('sha256:')
    ? sha256.slice('sha256:'.length)
    : sha256;
  if (!/^[0-9a-f]{64}$/i.test(expected)) {
    throw new Error('expected sha256 is not 64 hex characters');
  }
  const buf =
    typeof bytes === 'string' ? Buffer.from(bytes) : Buffer.from(bytes);
  const actual = createHash('sha256').update(buf).digest('hex');
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error('manifest sha256 mismatch');
  }
  return true;
}

export const POSTGRES_OPERATOR_PIN_KEYS = [
  'CNPG_VERSION',
  'CNPG_URL',
  'CNPG_SHA256',
  'CNPG_IMAGE',
  'POSTGRES_IMAGE',
];

export const TEMPORAL_IMAGE_PIN_KEYS = [
  'SERVER_IMAGE',
  'SERVER_DIGEST',
  'ADMIN_IMAGE',
  'ADMIN_DIGEST',
  'POSTGRES_IMAGE',
  'POSTGRES_DIGEST',
  'WORKER_IMAGE',
];
