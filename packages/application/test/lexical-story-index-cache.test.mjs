import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createLexicalStoryIndexCache } from '../dist/storyteller/lexical-story-index-cache.js';
import { LocalLexicalStoryIndexStore } from '../dist/storyteller/local-lexical-story-index-store.js';
import {
  LEXICAL_STORY_INDEX_SCHEMA_VERSION,
  restoreLexicalStoryIndex,
} from '../dist/storyteller/lexical-story-index.js';

const rootA = 'a'.repeat(64);
const rootB = 'b'.repeat(64);
const storyA = '00000000-0000-4000-8000-0000000000a1';
const storyB = '00000000-0000-4000-8000-0000000000b2';

function makeIndex(identity) {
  return restoreLexicalStoryIndex({
    format: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
    storyId: identity.storyId,
    rootHash: identity.rootHash,
    rootRevision: identity.rootRevision,
    units: [],
  });
}

test('lexical index cache reuses same root and isolates forks/stale roots', async () => {
  const durableRoot = await mkdtemp(join(tmpdir(), 'offscreen-sa04-durable-'));
  try {
    const identity = {
      storyId: storyA,
      rootHash: rootA,
      rootRevision: 1,
    };
    let builds = 0;
    const durable = new LocalLexicalStoryIndexStore(durableRoot);
    const cache = createLexicalStoryIndexCache({
      maxEntries: 4,
      durable,
      build: async (_store, id) => {
        builds += 1;
        return makeIndex(id);
      },
    });
    const storage = /** @type {any} */ ({});

    const cold = await cache.resolve(storage, identity);
    assert.equal(cold.hit, 'miss');
    assert.ok(cold.buildMs !== null);
    assert.equal(cold.schemaVersion, LEXICAL_STORY_INDEX_SCHEMA_VERSION);
    assert.equal(builds, 1);

    const warm = await cache.resolve(storage, identity);
    assert.equal(warm.hit, 'memory');
    assert.equal(warm.buildMs, null);
    assert.equal(builds, 1);

    cache.clear();
    await durable.delete(identity.storyId);
    let releaseBuild = () => {};
    const gate = new Promise((resolve) => {
      releaseBuild = resolve;
    });
    let slowBuilds = 0;
    const slowCache = createLexicalStoryIndexCache({
      maxEntries: 4,
      durable,
      build: async (_store, id) => {
        slowBuilds += 1;
        await gate;
        return makeIndex(id);
      },
    });
    const first = slowCache.resolve(storage, identity);
    await Promise.resolve();
    const second = slowCache.resolve(storage, identity);
    releaseBuild();
    const coalesced = await Promise.all([first, second]);
    assert.equal(slowBuilds, 1);
    assert.ok(slowCache.stats().coalescedWaits >= 1);
    assert.equal(coalesced[0].index.rootHash, coalesced[1].index.rootHash);
    assert.equal(coalesced[1].coalesced, true);

    cache.clear();
    const fromDurable = await cache.resolve(storage, identity);
    assert.equal(fromDurable.hit, 'durable');
    assert.equal(builds, 1);

    const forkResolve = await cache.resolve(storage, {
      storyId: storyB,
      rootHash: rootA,
      rootRevision: 1,
    });
    assert.equal(forkResolve.hit, 'miss');
    assert.equal(builds, 2);
    assert.throws(
      () =>
        forkResolve.index.search({
          storyId: identity.storyId,
          rootHash: identity.rootHash,
          rootRevision: identity.rootRevision,
          query: 'patient tide road',
        }),
      /does not match the captured story root/,
    );

    const revised = {
      storyId: storyA,
      rootHash: rootB,
      rootRevision: 2,
    };
    cache.invalidate(identity);
    const revisedResolve = await cache.resolve(storage, revised);
    assert.equal(revisedResolve.hit, 'miss');
    assert.equal(builds, 3);
    assert.equal(revisedResolve.index.rootHash, rootB);

    cache.clear();
    await durable.replace(makeIndex(identity));
    const refuseStale = await cache.resolve(storage, revised);
    assert.equal(refuseStale.hit, 'miss');
    assert.equal(builds, 4);
    assert.equal(refuseStale.index.rootRevision, 2);

    cache.clear();
    await writeFile(
      join(durableRoot, `${identity.storyId}.json`),
      '{not-valid-index',
      'utf8',
    );
    const afterCorrupt = await cache.resolve(storage, identity);
    assert.equal(afterCorrupt.hit, 'miss');
    assert.equal(builds, 5);

    const stats = cache.stats();
    assert.ok(stats.memoryHits >= 1);
    assert.ok(stats.durableHits >= 1);
    assert.ok(stats.misses >= 4);
    assert.equal(stats.builds, builds);
  } finally {
    await rm(durableRoot, { recursive: true, force: true });
  }
});
