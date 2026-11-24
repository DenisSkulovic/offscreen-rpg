/**
 * SA04: root-keyed reuse of rebuildable lexical indexes.
 * Never story canon; validate story/root/schema before every hit.
 */
import type { DocumentStore } from '@offscreen/documents';
import { createWeightedLru } from '@offscreen/cache/memory';
import { createSingleFlight } from '@offscreen/cache/strategies';
import {
  buildLexicalStoryIndex,
  LEXICAL_STORY_INDEX_SCHEMA_VERSION,
  lexicalStoryIndexMatchesIdentity,
  restoreLexicalStoryIndex,
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

const LEXICAL_INDEX_MEMORY_MAX_BYTES = 32 * 1024 * 1024;

function cacheKey(identity: LexicalStoryIndexIdentity) {
  return `${identity.storyId}:${identity.rootHash}:${identity.rootRevision}:${LEXICAL_STORY_INDEX_SCHEMA_VERSION}`;
}

function lexicalIndexWeight(index: LexicalStoryIndex): number {
  const snapshot = index.snapshot();
  return Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
}

function copyLexicalStoryIndex(index: LexicalStoryIndex): LexicalStoryIndex {
  return restoreLexicalStoryIndex(index.snapshot());
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
    throw new Error(
      'Lexical index cache maxEntries must be a positive integer',
    );
  }
  const durable = options?.durable ?? null;
  const build = options?.build ?? buildLexicalStoryIndex;
  const memory = createWeightedLru({
    maxBytes: LEXICAL_INDEX_MEMORY_MAX_BYTES,
    maxEntries,
    weight: lexicalIndexWeight,
    copy: copyLexicalStoryIndex,
  });
  const flight = createSingleFlight<LexicalStoryIndexResolveResult>({
    maxActiveKeys: 128,
    maxWaitersPerKey: 8,
  });
  const counters = {
    memoryHits: 0,
    durableHits: 0,
    misses: 0,
    builds: 0,
    coalescedWaits: 0,
  };

  function remember(
    key: string,
    index: LexicalStoryIndex,
    canPublish: () => boolean,
  ) {
    if (!canPublish()) {
      return;
    }
    memory.set(key, index);
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

    const { value: result, coalesced } = await flight.run(
      key,
      async (canPublish) => {
        if (durable) {
          try {
            const loaded = await durable.load(identity.storyId);
            if (
              loaded &&
              lexicalStoryIndexMatchesIdentity(loaded, identity) &&
              loaded.snapshot().format === LEXICAL_STORY_INDEX_SCHEMA_VERSION
            ) {
              counters.durableHits += 1;
              remember(key, loaded, canPublish);
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
        let index: LexicalStoryIndex;
        try {
          index = await build(storage, identity);
        } catch (error) {
          memory.delete(key);
          throw error;
        }
        const buildMs = performance.now() - started;
        if (!lexicalStoryIndexMatchesIdentity(index, identity)) {
          memory.delete(key);
          throw new Error('Built lexical index root mismatch');
        }
        remember(key, index, canPublish);
        if (durable) {
          try {
            await durable.replace(index);
          } catch {
            // Durable persistence is best-effort; the validated build still returns.
          }
        }
        return {
          index,
          hit: 'miss' as const,
          coalesced: false,
          schemaVersion: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
          buildMs,
        };
      },
    );

    if (coalesced) {
      counters.coalescedWaits += 1;
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

    return result;
  }

  return {
    resolve,
    peek,
    invalidate(identity) {
      const key = cacheKey(identity);
      memory.delete(key);
      flight.invalidate(key);
    },
    clear() {
      memory.clear();
      flight.clear();
    },
    stats() {
      return { ...counters };
    },
  };
}
