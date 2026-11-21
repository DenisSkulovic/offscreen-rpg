/**
 * SA04: root-keyed reuse of rebuildable lexical indexes.
 * Never story canon; validate story/root/schema before every hit.
 */
import type { DocumentStore } from '@offscreen/documents';
import {
  buildLexicalStoryIndex,
  LEXICAL_STORY_INDEX_SCHEMA_VERSION,
  lexicalStoryIndexMatchesIdentity,
  type LexicalStoryIndex,
  type LexicalStoryIndexIdentity,
} from './lexical-story-index';
import type { LocalLexicalStoryIndexStore } from './local-lexical-story-index-store';

export type LexicalStoryIndexCacheHit = 'memory' | 'durable' | 'miss';

export type LexicalStoryIndexResolveResult = Readonly<{
  index: LexicalStoryIndex;
  hit: LexicalStoryIndexCacheHit;
  coalesced: boolean;
  schemaVersion: typeof LEXICAL_STORY_INDEX_SCHEMA_VERSION;
  buildMs: number | null;
}>;

export type LexicalStoryIndexCacheStats = Readonly<{
  memoryHits: number;
  durableHits: number;
  misses: number;
  builds: number;
  coalescedWaits: number;
}>;

export type LexicalStoryIndexCache = Readonly<{
  resolve(
    storage: DocumentStore,
    identity: LexicalStoryIndexIdentity,
  ): Promise<LexicalStoryIndexResolveResult>;
  peek(identity: LexicalStoryIndexIdentity): LexicalStoryIndex | null;
  invalidate(identity: LexicalStoryIndexIdentity): void;
  clear(): void;
  stats(): LexicalStoryIndexCacheStats;
}>;

type InflightEntry = {
  promise: Promise<LexicalStoryIndexResolveResult>;
};

function cacheKey(identity: LexicalStoryIndexIdentity) {
  return `${identity.storyId}:${identity.rootHash}:${identity.rootRevision}:${LEXICAL_STORY_INDEX_SCHEMA_VERSION}`;
}

/**
 * Process-local LRU plus optional durable store. Concurrent resolves for the
 * same root coalesce onto one build. Forked stories never share keys.
 */
export function createLexicalStoryIndexCache(options?: {
  maxEntries?: number;
  durable?: LocalLexicalStoryIndexStore | null;
  build?: typeof buildLexicalStoryIndex;
}): LexicalStoryIndexCache {
  const maxEntries = options?.maxEntries ?? 8;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
    throw new Error('Lexical index cache maxEntries must be a positive integer');
  }
  const durable = options?.durable ?? null;
  const build = options?.build ?? buildLexicalStoryIndex;
  const memory = new Map<string, LexicalStoryIndex>();
  const inflight = new Map<string, InflightEntry>();
  const counters = {
    memoryHits: 0,
    durableHits: 0,
    misses: 0,
    builds: 0,
    coalescedWaits: 0,
  };

  function remember(key: string, index: LexicalStoryIndex) {
    memory.delete(key);
    memory.set(key, index);
    while (memory.size > maxEntries) {
      const oldest = memory.keys().next().value;
      if (oldest === undefined) break;
      memory.delete(oldest);
    }
  }

  function peek(identity: LexicalStoryIndexIdentity) {
    const key = cacheKey(identity);
    const cached = memory.get(key);
    if (!cached || !lexicalStoryIndexMatchesIdentity(cached, identity)) {
      return null;
    }
    if (cached.snapshot().format !== LEXICAL_STORY_INDEX_SCHEMA_VERSION) {
      memory.delete(key);
      return null;
    }
    remember(key, cached);
    return cached;
  }

  async function resolve(
    storage: DocumentStore,
    identity: LexicalStoryIndexIdentity,
  ): Promise<LexicalStoryIndexResolveResult> {
    const key = cacheKey(identity);
    const memoryHit = peek(identity);
    if (memoryHit) {
      counters.memoryHits += 1;
      return {
        index: memoryHit,
        hit: 'memory',
        coalesced: false,
        schemaVersion: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
        buildMs: null,
      };
    }

    const pending = inflight.get(key);
    if (pending) {
      counters.coalescedWaits += 1;
      const result = await pending.promise;
      if (!lexicalStoryIndexMatchesIdentity(result.index, identity)) {
        throw new Error('Coalesced lexical index root mismatch');
      }
      return {
        ...result,
        coalesced: true,
        // Followers observe a completed build through the shared promise; they
        // did not perform CAS work themselves.
        hit: result.hit === 'miss' ? 'memory' : result.hit,
        buildMs: null,
      };
    }

    const entry: InflightEntry = {
      promise: (async () => {
        if (durable) {
          try {
            const loaded = await durable.load(identity.storyId);
            if (
              loaded &&
              lexicalStoryIndexMatchesIdentity(loaded, identity) &&
              loaded.snapshot().format === LEXICAL_STORY_INDEX_SCHEMA_VERSION
            ) {
              counters.durableHits += 1;
              remember(key, loaded);
              return {
                index: loaded,
                hit: 'durable' as const,
                coalesced: false,
                schemaVersion: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
                buildMs: null,
              };
            }
          } catch {
            // Corrupt durable snapshots fall through to a validated rebuild.
          }
        }

        counters.misses += 1;
        counters.builds += 1;
        const started = performance.now();
        const index = await build(storage, identity);
        const buildMs = performance.now() - started;
        if (!lexicalStoryIndexMatchesIdentity(index, identity)) {
          throw new Error('Built lexical index root mismatch');
        }
        remember(key, index);
        if (durable) {
          await durable.replace(index);
        }
        return {
          index,
          hit: 'miss' as const,
          coalesced: false,
          schemaVersion: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
          buildMs,
        };
      })(),
    };
    inflight.set(key, entry);
    try {
      return await entry.promise;
    } finally {
      inflight.delete(key);
    }
  }

  return {
    resolve,
    peek,
    invalidate(identity) {
      memory.delete(cacheKey(identity));
    },
    clear() {
      memory.clear();
      inflight.clear();
    },
    stats() {
      return { ...counters };
    },
  };
}
