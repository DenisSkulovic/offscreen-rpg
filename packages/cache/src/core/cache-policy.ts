import type { CacheCodec, CacheConsistency } from './cache-store.js';

const MAX_ENTRY_BYTES = 1_048_576;
const NAMESPACE_TOKEN = /^[a-z0-9][a-z0-9:_-]{0,63}$/;
const CONSISTENCY_VALUES: readonly CacheConsistency[] = [
  'immutable',
  'versioned',
  'expiring',
];

export type CacheDefinition<T> = Readonly<{
  namespace: string;
  version: number;
  consistency: CacheConsistency;
  codec: CacheCodec<T>;
  policy: Readonly<{
    ttlMs: number;
    maxEntryBytes: number;
    jitterRatio: number;
    maxActiveKeys: number;
    maxWaitersPerKey: number;
    originConcurrency: number;
    originQueueLimit: number;
    originQueueTimeoutMs: number;
  }>;
}>;

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function assertNamespaceToken(namespace: string): void {
  if (!NAMESPACE_TOKEN.test(namespace)) {
    throw new Error(
      'Cache namespace must be a lowercase ASCII token (max 64 characters)',
    );
  }
}

function assertConsistency(
  consistency: string,
): asserts consistency is CacheConsistency {
  if (!CONSISTENCY_VALUES.includes(consistency as CacheConsistency)) {
    throw new Error(
      'Cache consistency must be immutable, versioned, or expiring',
    );
  }
}

function assertPolicy(policy: CacheDefinition<unknown>['policy']): void {
  if (!isPositiveSafeInteger(policy.ttlMs)) {
    throw new Error('Cache policy ttlMs must be a positive safe integer');
  }
  if (
    !Number.isSafeInteger(policy.maxEntryBytes) ||
    policy.maxEntryBytes < 1 ||
    policy.maxEntryBytes > MAX_ENTRY_BYTES
  ) {
    throw new Error('Cache policy maxEntryBytes must be between 1 and 1048576');
  }
  if (
    typeof policy.jitterRatio !== 'number' ||
    !Number.isFinite(policy.jitterRatio) ||
    policy.jitterRatio < 0 ||
    policy.jitterRatio > 1
  ) {
    throw new Error('Cache policy jitterRatio must be in [0, 1]');
  }
  if (!isPositiveSafeInteger(policy.maxActiveKeys)) {
    throw new Error(
      'Cache policy maxActiveKeys must be a positive safe integer',
    );
  }
  if (!isPositiveSafeInteger(policy.maxWaitersPerKey)) {
    throw new Error(
      'Cache policy maxWaitersPerKey must be a positive safe integer',
    );
  }
  if (!isPositiveSafeInteger(policy.originConcurrency)) {
    throw new Error(
      'Cache policy originConcurrency must be a positive safe integer',
    );
  }
  if (!isPositiveSafeInteger(policy.originQueueLimit)) {
    throw new Error(
      'Cache policy originQueueLimit must be a positive safe integer',
    );
  }
  if (!isPositiveSafeInteger(policy.originQueueTimeoutMs)) {
    throw new Error(
      'Cache policy originQueueTimeoutMs must be a positive safe integer',
    );
  }
}

export function validateCacheDefinition<T>(
  definition: CacheDefinition<T>,
): void {
  assertNamespaceToken(definition.namespace);
  if (!isPositiveSafeInteger(definition.version)) {
    throw new Error('Cache version must be a positive safe integer');
  }
  assertConsistency(definition.consistency);
  if (!definition.codec || typeof definition.codec.encode !== 'function') {
    throw new Error('Cache definition requires a codec with encode');
  }
  if (typeof definition.codec.decode !== 'function') {
    throw new Error('Cache definition requires a codec with decode');
  }
  assertPolicy(definition.policy);
}

export function defineCache<T>(
  definition: CacheDefinition<T>,
): CacheDefinition<T> {
  validateCacheDefinition(definition);
  return definition;
}
