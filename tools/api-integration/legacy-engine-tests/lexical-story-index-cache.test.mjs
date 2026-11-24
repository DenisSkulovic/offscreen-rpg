import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createLexicalStoryIndexCache } from '../../../packages/story-engine/dist/storyteller/lexical-story-index-cache.js';
import { LocalLexicalStoryIndexStore } from '../../../packages/story-engine/dist/storyteller/local-lexical-story-index-store.js';
import {
  LEXICAL_STORY_INDEX_SCHEMA_VERSION,
  restoreLexicalStoryIndex,
} from '../../../packages/story-engine/dist/storyteller/lexical-story-index.js';

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

const heavyBody = 'z'.repeat(480 * 1024);

function makeHeavyIndex(identity, unitCount = 40) {
  const units = Array.from({ length: unitCount }, (_, index) => ({
    unit: {
      unitId: `heavy-${index}@1#root`,
      documentId: '10000000-0000-4000-8000-000000000001',
      revision: 1,
      sourceHash: index.toString(16).padStart(64, '0'),
      path: `world/lore/heavy-${index}.md`,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player',
      branchKey: null,
      current: true,
      headingPath: [],
      linkedDocumentIds: [],
      effectiveFromGameSecond: null,
      effectiveThroughGameSecond: null,
      title: `Heavy ${index}`,
      contextualKey: `lore Heavy ${index} world/lore/heavy-${index}.md`,
      bodyBytes: Buffer.byteLength(heavyBody, 'utf8'),
    },
    title: { heavy: 1 },
    path: { world: 1 },
    context: { lore: 1 },
    body: { z: 1 },
    bodyText: heavyBody,
  }));
  return restoreLexicalStoryIndex({
    format: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
    storyId: identity.storyId,
    rootHash: identity.rootHash,
    rootRevision: identity.rootRevision,
    units,
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

test('lexical index cache tolerates durable write failure and build failure cleanup', async () => {
  const durableRoot = await mkdtemp(join(tmpdir(), 'offscreen-sa04-write-fail-'));
  try {
    const identity = {
      storyId: storyA,
      rootHash: rootA,
      rootRevision: 1,
    };
    const storage = /** @type {any} */ ({});
    const backing = new LocalLexicalStoryIndexStore(durableRoot);
    const flakyDurable = {
      load: (storyId) => backing.load(storyId),
      replace: async () => {
        throw new Error('durable write rejected');
      },
    };
    let builds = 0;
    const cache = createLexicalStoryIndexCache({
      maxEntries: 4,
      durable: flakyDurable,
      build: async (_store, id) => {
        builds += 1;
        return makeIndex(id);
      },
    });

    const resolved = await cache.resolve(storage, identity);
    assert.equal(resolved.hit, 'miss');
    assert.equal(builds, 1);
    assert.ok(cache.peek(identity));

    const warm = await cache.resolve(storage, identity);
    assert.equal(warm.hit, 'memory');
    assert.equal(builds, 1);

    let failBuild = false;
    const failingCache = createLexicalStoryIndexCache({
      maxEntries: 4,
      build: async () => {
        if (failBuild) {
          throw new Error('build failed');
        }
        return makeIndex(identity);
      },
    });
    await failingCache.resolve(storage, identity);
    failingCache.clear();
    failBuild = true;
    await assert.rejects(
      () => failingCache.resolve(storage, identity),
      /build failed/,
    );
    assert.equal(failingCache.peek(identity), null);
    failBuild = false;
    const recovered = await failingCache.resolve(storage, identity);
    assert.equal(recovered.hit, 'miss');
  } finally {
    await rm(durableRoot, { recursive: true, force: true });
  }
});

test('lexical index cache fences invalidate and clear against late memory publish', async () => {
  const identity = {
    storyId: storyA,
    rootHash: rootA,
    rootRevision: 1,
  };
  const storage = /** @type {any} */ ({});
  let releaseBuild = () => {};
  const gate = new Promise((resolve) => {
    releaseBuild = resolve;
  });
  let builds = 0;
  const cache = createLexicalStoryIndexCache({
    maxEntries: 4,
    build: async (_store, id) => {
      builds += 1;
      await gate;
      return makeIndex(id);
    },
  });

  const inFlight = cache.resolve(storage, identity);
  await Promise.resolve();
  cache.invalidate(identity);
  releaseBuild();
  const completed = await inFlight;
  assert.equal(completed.index.rootHash, rootA);
  assert.equal(cache.peek(identity), null);

  builds = 0;
  releaseBuild = () => {};
  const gate2 = new Promise((resolve) => {
    releaseBuild = resolve;
  });
  const slowCache = createLexicalStoryIndexCache({
    maxEntries: 4,
    build: async (_store, id) => {
      builds += 1;
      await gate2;
      return makeIndex(id);
    },
  });
  const blocked = slowCache.resolve(storage, identity);
  await Promise.resolve();
  slowCache.clear();
  releaseBuild();
  await blocked;
  assert.equal(slowCache.peek(identity), null);
  const afterClearFence = await slowCache.resolve(storage, identity);
  assert.equal(afterClearFence.hit, 'miss');
  assert.equal(builds, 2);
});

test('lexical index cache evicts by byte budget and rejects stale durable schema', async () => {
  const durableRoot = await mkdtemp(join(tmpdir(), 'offscreen-sa04-byte-evict-'));
  try {
    const identityA = {
      storyId: storyA,
      rootHash: rootA,
      rootRevision: 1,
    };
    const identityB = {
      storyId: storyA,
      rootHash: rootB,
      rootRevision: 1,
    };
    const storage = /** @type {any} */ ({});
    let builds = 0;
    const cache = createLexicalStoryIndexCache({
      maxEntries: 8,
      build: async (_store, id) => {
        builds += 1;
        return makeHeavyIndex(id);
      },
    });

    const first = await cache.resolve(storage, identityA);
    assert.equal(first.hit, 'miss');
    assert.ok(cache.peek(identityA));

    const second = await cache.resolve(storage, identityB);
    assert.equal(second.hit, 'miss');
    assert.equal(builds, 2);
    assert.equal(cache.peek(identityA), null);
    assert.ok(cache.peek(identityB));

    builds = 0;
    const coldAgain = await cache.resolve(storage, identityA);
    assert.equal(coldAgain.hit, 'miss');
    assert.equal(builds, 1);

    const durable = new LocalLexicalStoryIndexStore(durableRoot);
    const schemaIdentity = {
      storyId: storyA,
      rootHash: 'c'.repeat(64),
      rootRevision: 3,
    };
    await writeFile(
      join(durableRoot, `${storyA}.json`),
      JSON.stringify({
        format: 'offscreen.lexical-story-index.v0',
        storyId: storyA,
        rootHash: schemaIdentity.rootHash,
        rootRevision: schemaIdentity.rootRevision,
        units: [],
      }),
      'utf8',
    );
    const schemaCache = createLexicalStoryIndexCache({
      maxEntries: 4,
      durable,
      build: async (_store, id) => {
        builds += 1;
        return makeIndex(id);
      },
    });
    const fromBadSchema = await schemaCache.resolve(storage, schemaIdentity);
    assert.equal(fromBadSchema.hit, 'miss');
    assert.equal(builds, 2);
  } finally {
    await rm(durableRoot, { recursive: true, force: true });
  }
});
