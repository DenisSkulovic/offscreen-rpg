import type { z } from 'zod';
import { bindCache } from '@offscreen/cache/strategies';
import {
  defineCache,
  makeCacheKey,
  type CacheCodec,
  type CacheDefinition,
  type CacheStore,
} from '@offscreen/cache/core';
import { createMemoryStore } from '@offscreen/cache/memory';
import { canonicalJson, sha256 } from './canonical-json.js';
import {
  canonicalDocumentSchema,
  canonicalSourcePassageSchema,
  canonicalStructuredDocumentSchema,
  documentManifestSchema,
  rulePackageManifestSchema,
  sceneCheckpointSchema,
  startPackageManifestSchema,
  worldPackageManifestSchema,
  libraryNodeV2Schema,
  libraryRootV2Schema,
} from './schema.js';
import {
  DocumentStorageError,
  maximumStoredObjectBytes,
} from './local-store.js';

const CACHE_NAMESPACE = 'documents';
const CACHE_VERSION = 1;
const DEFAULT_ENVIRONMENT = 'documents';
const DEFAULT_MAX_ENTRY_BYTES = 256 * 1024;
const DEFAULT_STORE_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_STORE_MAX_ENTRIES = 512;
const IMMUTABLE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Stable schema kind tokens for cache identity scoping (hash + kind). */
export const documentReadKind = {
  canonicalDocument: 'canonical-document',
  canonicalSourcePassage: 'canonical-source-passage',
  canonicalStructuredDocument: 'canonical-structured-document',
  documentManifest: 'document-manifest',
  worldPackageManifest: 'world-package-manifest',
  rulePackageManifest: 'rule-package-manifest',
  startPackageManifest: 'start-package-manifest',
  sceneCheckpoint: 'scene-checkpoint',
  libraryNodeV2: 'library-node-v2',
  libraryRootV2: 'library-root-v2',
} as const;

export type DocumentReadKind =
  (typeof documentReadKind)[keyof typeof documentReadKind];

const schemaByKind: Readonly<Record<DocumentReadKind, z.ZodType<unknown>>> = {
  [documentReadKind.canonicalDocument]: canonicalDocumentSchema,
  [documentReadKind.canonicalSourcePassage]: canonicalSourcePassageSchema,
  [documentReadKind.canonicalStructuredDocument]:
    canonicalStructuredDocumentSchema,
  [documentReadKind.documentManifest]: documentManifestSchema,
  [documentReadKind.worldPackageManifest]: worldPackageManifestSchema,
  [documentReadKind.rulePackageManifest]: rulePackageManifestSchema,
  [documentReadKind.startPackageManifest]: startPackageManifestSchema,
  [documentReadKind.sceneCheckpoint]: sceneCheckpointSchema,
  [documentReadKind.libraryNodeV2]: libraryNodeV2Schema,
  [documentReadKind.libraryRootV2]: libraryRootV2Schema,
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function isDocumentReadKind(kind: string): kind is DocumentReadKind {
  return Object.prototype.hasOwnProperty.call(schemaByKind, kind);
}

function packEnvelope(
  hash: string,
  kind: string,
  payloadUtf8: string,
): Uint8Array {
  const header = `${hash}\n${kind}\n`;
  const headerBytes = textEncoder.encode(header);
  const bodyBytes = textEncoder.encode(payloadUtf8);
  const packed = new Uint8Array(headerBytes.length + bodyBytes.length);
  packed.set(headerBytes);
  packed.set(bodyBytes, headerBytes.length);
  return packed;
}

function unpackEnvelope(envelope: Uint8Array): {
  hash: string;
  kind: string;
  payloadUtf8: string;
} {
  const text = textDecoder.decode(envelope);
  const firstNl = text.indexOf('\n');
  const secondNl = text.indexOf('\n', firstNl + 1);
  if (firstNl !== 64 || secondNl < 65) {
    throw new Error('document-read-cache:corrupt-envelope');
  }
  const hash = text.slice(0, 64);
  const kind = text.slice(firstNl + 1, secondNl);
  const payloadUtf8 = text.slice(secondNl + 1);
  return { hash, kind, payloadUtf8 };
}

function createEnvelopeCodec(): CacheCodec<Uint8Array> {
  return {
    encode(value: Uint8Array): Uint8Array {
      return new Uint8Array(value);
    },
    decode(bytes: Uint8Array): Uint8Array {
      const { hash, kind, payloadUtf8 } = unpackEnvelope(bytes);
      if (Buffer.byteLength(payloadUtf8, 'utf8') > maximumStoredObjectBytes) {
        throw new Error('document-read-cache:too-large');
      }
      if (sha256(payloadUtf8) !== hash) {
        throw new Error('document-read-cache:hash-mismatch');
      }
      if (!isDocumentReadKind(kind)) {
        throw new Error('document-read-cache:unknown-kind');
      }
      const schema = schemaByKind[kind];
      try {
        schema.parse(JSON.parse(payloadUtf8));
      } catch {
        throw new Error('document-read-cache:schema-mismatch');
      }
      return new Uint8Array(bytes);
    },
  };
}

function basePolicy(maxEntryBytes: number) {
  return {
    ttlMs: IMMUTABLE_TTL_MS,
    maxEntryBytes,
    jitterRatio: 0,
    maxActiveKeys: 256,
    maxWaitersPerKey: 16,
    originConcurrency: 8,
    originQueueLimit: 64,
    originQueueTimeoutMs: 30_000,
  } as const;
}

function createDefinition(maxEntryBytes: number): CacheDefinition<Uint8Array> {
  return defineCache({
    namespace: CACHE_NAMESPACE,
    version: CACHE_VERSION,
    consistency: 'immutable',
    codec: createEnvelopeCodec(),
    policy: basePolicy(maxEntryBytes),
  });
}

export type DocumentImmutableReadCacheOptions = Readonly<{
  store?: CacheStore;
  environment?: string;
  maxEntryBytes?: number;
  clock?: () => number;
}>;

export type DocumentImmutableReadCache = Readonly<{
  readValidated<T>(
    hash: string,
    kind: DocumentReadKind,
    schema: z.ZodType<T>,
    loadOriginUtf8: () => Promise<string>,
  ): Promise<T>;
  /** @internal Tests may inspect the backing store for cache key injection. */
  readonly cacheStore: CacheStore;
  readonly environment: string;
}>;

export function createDocumentImmutableReadCache(
  options: DocumentImmutableReadCacheOptions = {},
): DocumentImmutableReadCache {
  const environment = options.environment ?? DEFAULT_ENVIRONMENT;
  const clock = options.clock ?? (() => Date.now());
  const maxEntryBytes = options.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES;
  const store =
    options.store ??
    createMemoryStore({
      maxBytes: DEFAULT_STORE_MAX_BYTES,
      maxEntries: DEFAULT_STORE_MAX_ENTRIES,
      clock,
    });

  const bound = bindCache(createDefinition(maxEntryBytes), {
    store,
    environment,
    clock,
  });

  function validateBeforePopulate<T>(
    hash: string,
    schema: z.ZodType<T>,
    payloadUtf8: string,
  ): T {
    if (Buffer.byteLength(payloadUtf8, 'utf8') > maximumStoredObjectBytes) {
      throw new DocumentStorageError('too-large');
    }
    if (sha256(payloadUtf8) !== hash) {
      throw new DocumentStorageError('corrupt');
    }
    try {
      return schema.parse(JSON.parse(payloadUtf8));
    } catch (error) {
      throw new DocumentStorageError('corrupt', { cause: error });
    }
  }

  function parseFromEnvelope<T>(
    hash: string,
    schema: z.ZodType<T>,
    envelope: Uint8Array,
  ): T {
    const { hash: storedHash, payloadUtf8 } = unpackEnvelope(envelope);
    if (storedHash !== hash) {
      throw new DocumentStorageError('corrupt');
    }
    return validateBeforePopulate(hash, schema, payloadUtf8);
  }

  return {
    cacheStore: store,
    environment,

    async readValidated(hash, kind, schema, loadOriginUtf8) {
      const identity = [hash, kind] as const;
      const envelope = await bound.getOrLoad(identity, async () => {
        const payloadUtf8 = await loadOriginUtf8();
        validateBeforePopulate(hash, schema, payloadUtf8);
        return {
          value: packEnvelope(hash, kind, payloadUtf8),
          identity,
          observedAtMs: clock(),
        };
      });
      return parseFromEnvelope(hash, schema, envelope);
    },
  };
}

/** Map a read method to its stable kind for callers wiring readValidated. */
export function documentReadKindForSchema(
  schema: z.ZodType<unknown>,
): DocumentReadKind {
  for (const [kind, registered] of Object.entries(schemaByKind)) {
    if (registered === schema) {
      return kind as DocumentReadKind;
    }
  }
  throw new Error('Unsupported document read schema for cache kind');
}

/** @internal Test helper to build canonical bytes for a value. */
export function canonicalBytesForValue(value: unknown): string {
  return canonicalJson(value);
}

export { makeCacheKey, CACHE_NAMESPACE, CACHE_VERSION, packEnvelope };
