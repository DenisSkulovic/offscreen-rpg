import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const references = Object.freeze({
  dev: JSON.parse(readFileSync(new URL('./reference/dev.json', import.meta.url), 'utf8')),
  release: JSON.parse(readFileSync(new URL('./reference/release.json', import.meta.url), 'utf8')),
});

const quantityPaths = new Set([
  '/resources/requests/cpu',
  '/resources/requests/memory',
  '/resources/limits/cpu',
  '/resources/limits/memory',
  '/storage/size',
]);

/** Compare Kubernetes quantities exactly, without rounding through Number. */
export function parseQuantity(value) {
  if (typeof value !== 'string' || value.length > 128) return null;
  const match = /^([0-9]+)(?:\.([0-9]+))?(n|u|m|k|M|G|T|P|E|Ki|Mi|Gi|Ti|Pi|Ei)?$/.exec(value);
  if (!match) return null;
  const [, whole, fraction = '', suffix = ''] = match;
  const decimal = { n: -9, u: -6, m: -3, '': 0, k: 3, M: 6, G: 9, T: 12, P: 15, E: 18 };
  const binary = { Ki: 10, Mi: 20, Gi: 30, Ti: 40, Pi: 50, Ei: 60 };
  let numerator = BigInt(whole + fraction);
  let denominator = 10n ** BigInt(fraction.length);
  if (Object.hasOwn(binary, suffix)) numerator *= 2n ** BigInt(binary[suffix]);
  else if (decimal[suffix] < 0) denominator *= 10n ** BigInt(-decimal[suffix]);
  else numerator *= 10n ** BigInt(decimal[suffix]);
  return { numerator, denominator };
}

function equalQuantity(left, right) {
  const a = parseQuantity(left);
  const b = parseQuantity(right);
  return a !== null && b !== null &&
    a.numerator * b.denominator === b.numerator * a.denominator;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapePointer(key) {
  return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

/** First typed mismatch, expressed as a JSON pointer, never a raw value. */
export function firstMismatch(expected, actual, path = '', quantities = new Set()) {
  if (quantities.has(path)) return equalQuantity(expected, actual) ? null : path;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) return path || '/';
    for (let i = 0; i < expected.length; i++) {
      const mismatch = firstMismatch(expected[i], actual[i], path + '/' + i, quantities);
      if (mismatch !== null) return mismatch;
    }
    return null;
  }
  if (isRecord(expected)) {
    if (!isRecord(actual)) return path || '/';
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      const child = path + '/' + escapePointer(key);
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) return child;
      const mismatch = firstMismatch(expected[key], actual[key], child, quantities);
      if (mismatch !== null) return mismatch;
    }
    return null;
  }
  return isDeepStrictEqual(expected, actual) ? null : path || '/';
}

export function expectedClusterSpec(profileId, { historical = false } = {}) {
  if (!Object.hasOwn(references, profileId)) throw new Error('Unknown PostgreSQL profile');
  const spec = structuredClone(references[profileId]);
  if (!historical) {
    const initdb = spec.bootstrap.initdb;
    initdb.postInitSQL = ['REVOKE CONNECT, TEMPORARY ON DATABASE "postgres" FROM PUBLIC;'];
    initdb.postInitApplicationSQL = [profileId === 'dev'
      ? 'REVOKE CONNECT, TEMPORARY ON DATABASE "dev" FROM PUBLIC;'
      : 'REVOKE CONNECT, TEMPORARY ON DATABASE "lab" FROM PUBLIC;'];
  }
  return spec;
}

/** Ordinary ensure preserves any positive compatible live topology. */
export function assessClusterSpec(profileId, actual, { exactInstances = false, freshAdmission = false } = {}) {
  const expected = expectedClusterSpec(profileId);
  if (!isRecord(actual)) return { ok: false, path: '/spec' };
  const instances = actual.instances;
  if (!Number.isSafeInteger(instances) || instances < 1)
    return { ok: false, path: '/spec/instances' };
  if (!exactInstances) expected.instances = instances;
  const mismatch = firstMismatch(expected, actual, '', quantityPaths);
  if (mismatch !== null && !freshAdmission) {
    const historical = expectedClusterSpec(profileId, { historical: true });
    if (!exactInstances) historical.instances = instances;
    if (firstMismatch(historical, actual, '', quantityPaths) === null)
      return { ok: true, instances };
  }
  return mismatch === null
    ? { ok: true, instances }
    : { ok: false, path: '/spec' + mismatch };
}
