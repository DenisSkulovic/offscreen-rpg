import { createHash } from 'node:crypto';

import type { CacheIdentity } from './cache-store.js';

const ENVIRONMENT_TOKEN = /^[a-z0-9][a-z0-9:_-]{0,49}$/;
const NAMESPACE_TOKEN = /^[a-z0-9][a-z0-9:_-]{0,63}$/;

const MIN_IDENTITY_COMPONENTS = 1;
const MAX_IDENTITY_COMPONENTS = 16;
const MAX_COMPONENT_UTF8_BYTES = 1_024;
const MAX_IDENTITY_TOTAL_UTF8_BYTES = 4_096;

const textEncoder = new TextEncoder();

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function assertEnvironmentToken(environment: string): void {
  if (!ENVIRONMENT_TOKEN.test(environment)) {
    throw new Error(
      'Cache environment must be a lowercase ASCII token (max 50 characters)',
    );
  }
}

function assertNamespaceToken(namespace: string): void {
  if (!NAMESPACE_TOKEN.test(namespace)) {
    throw new Error(
      'Cache namespace must be a lowercase ASCII token (max 64 characters)',
    );
  }
}

function hasUnpairedSurrogates(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= value.length) {
        return true;
      }
      const next = value.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function assertWellFormedUtf8(component: string, index: number): Uint8Array {
  if (hasUnpairedSurrogates(component)) {
    throw new Error(
      `Cache identity component ${index} contains unpaired UTF-16 surrogates`,
    );
  }
  const utf8 = textEncoder.encode(component);
  if (utf8.length < 1 || utf8.length > MAX_COMPONENT_UTF8_BYTES) {
    throw new Error(
      `Cache identity component ${index} must be 1–1024 UTF-8 bytes (got ${utf8.length})`,
    );
  }
  return utf8;
}

export function validateCacheIdentity(
  identity: CacheIdentity,
): readonly Uint8Array[] {
  if (identity.length < MIN_IDENTITY_COMPONENTS) {
    throw new Error('Cache identity must have at least one component');
  }
  if (identity.length > MAX_IDENTITY_COMPONENTS) {
    throw new Error('Cache identity must have at most 16 components');
  }

  const encoded: Uint8Array[] = [];
  let totalBytes = 0;
  for (let index = 0; index < identity.length; index++) {
    const component = identity[index];
    if (component === undefined) {
      throw new Error(`Cache identity component ${index} is missing`);
    }
    const utf8 = assertWellFormedUtf8(component, index);
    totalBytes += utf8.length;
    if (totalBytes > MAX_IDENTITY_TOTAL_UTF8_BYTES) {
      throw new Error(
        'Cache identity total UTF-8 size must not exceed 4096 bytes',
      );
    }
    encoded.push(utf8);
  }
  return encoded;
}

function hashIdentityComponents(encoded: readonly Uint8Array[]): string {
  const count = encoded.length;
  const payload = new Uint8Array(
    4 + encoded.reduce((sum, part) => sum + 4 + part.length, 0),
  );
  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  );
  view.setUint32(0, count, false);
  let offset = 4;
  for (const part of encoded) {
    view.setUint32(offset, part.length, false);
    offset += 4;
    payload.set(part, offset);
    offset += part.length;
  }
  return createHash('sha256').update(payload).digest('hex');
}

export function makeCacheKey(
  environment: string,
  namespace: string,
  version: number,
  identity: CacheIdentity,
): string {
  assertEnvironmentToken(environment);
  assertNamespaceToken(namespace);
  if (!isPositiveSafeInteger(version)) {
    throw new Error('Cache version must be a positive safe integer');
  }
  const encoded = validateCacheIdentity(identity);
  const digest = hashIdentityComponents(encoded);
  return `${environment}:${namespace}:v${version}:${digest}`;
}
