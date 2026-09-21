import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  buildLongStoryMemoryCorpus,
  materializeLongStoryMemoryCorpus,
} from '../dist/developer-tools/long-story-memory-corpus.js';
import { searchCanonicalKnowledge } from '../dist/storyteller/canonical-search.js';

test('builds reproducible conventional and abstract 200-scene memory corpora', async () => {
  const greywake = buildLongStoryMemoryCorpus('greywake');
  const repeated = buildLongStoryMemoryCorpus('greywake');
  const destroyedFork = buildLongStoryMemoryCorpus('greywake-destroyed-fork');
  const gradient = buildLongStoryMemoryCorpus('gradient-life');

  assert.deepEqual(repeated, greywake);
  assert.equal(greywake.scenes.length, 200);
  assert.equal(gradient.scenes.length, 200);
  assert.equal(destroyedFork.branch.parentKey, 'main');
  assert.equal(destroyedFork.branch.forkSequence, 120);
  assert.notEqual(destroyedFork.campaignId, greywake.campaignId);
  assert.match(
    destroyedFork.evidence.find((entry) => entry.key === 'place.greywake')
      ?.body ?? '',
    /destroyed Greywake/,
  );
  assert.equal(
    new Set([...greywake.queries, ...gradient.queries].map((entry) => entry.queryClass)).size,
    13,
  );

  const storage = new LocalDocumentStore(
    await mkdtemp(join(tmpdir(), 'offscreen-memory-corpus-')),
  );
  const materialized = await materializeLongStoryMemoryCorpus(storage, greywake);
  assert.deepEqual(
    {
      scenes: materialized.scenes,
      evidence: materialized.evidence,
      queries: materialized.queries,
    },
    { scenes: 200, evidence: 10, queries: 12 },
  );

  const current = await searchCanonicalKnowledge(storage, {
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
    query: 'patient tide road',
    maxResults: 6,
    maxScanDocuments: 256,
    maxScanBytes: 128 * 1024,
  });
  assert.equal(current.results[0]?.path, 'threads/patient-tide-return.md');
  assert.ok(
    current.results.every(
      (entry) =>
        entry.path !== 'developer/false-tide-road.md' &&
        entry.path !== 'developer/fork-destroyed-greywake.md',
    ),
  );

  const abstractStorage = new LocalDocumentStore(
    await mkdtemp(join(tmpdir(), 'offscreen-memory-abstract-')),
  );
  const abstract = await materializeLongStoryMemoryCorpus(
    abstractStorage,
    gradient,
  );
  const humanDefaults = await searchCanonicalKnowledge(abstractStorage, {
    storyId: abstract.storyId,
    rootHash: abstract.rootHash,
    rootRevision: abstract.rootRevision,
    query: 'tavern wage humanoid',
  });
  assert.deepEqual(humanDefaults.results, []);
  assert.equal(humanDefaults.trace.coverageComplete, true);
});
