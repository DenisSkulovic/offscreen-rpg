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
import {
  evaluateMemoryObservation,
  evaluateIndexedMemoryRetrieval,
  evaluateLinearMemoryBaseline,
  observeLinearMemoryBaseline,
} from '../dist/developer-tools/memory-evaluator.js';
import { searchCanonicalKnowledge } from '../dist/storyteller/canonical-search.js';
import { buildLexicalStoryIndex } from '../dist/storyteller/lexical-story-index.js';

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
    maxExaminedUnits: 256,
    maxExaminedBytes: 128 * 1024,
  });
  assert.equal(current.candidates[0]?.unit.path, 'threads/patient-tide-return.md');
  assert.match(current.candidates[0]?.unit.sourceHash ?? '', /^[0-9a-f]{64}$/);
  assert.equal(current.candidates[0]?.score.provider, 'linear-lexical.v1');
  assert.equal(current.coverage.indexedThroughRevision, 1);
  assert.ok(
    current.candidates.every(
      (entry) =>
        entry.unit.path !== 'developer/false-tide-road.md' &&
        entry.unit.path !== 'developer/fork-destroyed-greywake.md',
    ),
  );

  const baseline = await observeLinearMemoryBaseline({
    storage,
    corpus: greywake,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
    queryId: 'greywake.no-deadline',
  });
  const baselineReport = evaluateMemoryObservation(greywake, baseline);
  assert.equal(baselineReport.retrieval.status, 'passed');
  assert.equal(baselineReport.assembly.status, 'passed');
  assert.equal(baselineReport.generation.status, 'not-run');

  const emptyStages = {
    format: 'offscreen.memory-evaluation-observation.v1',
    corpusId: greywake.id,
    queryId: 'greywake.current-route',
    retrieval: {
      evidenceKeys: [],
      coverage: 'complete',
      candidatesExamined: 0,
      durationMs: 0,
    },
    assembly: { evidenceKeys: [], bytes: 0, duplicateBytes: 0 },
    generation: { disposition: 'not-run', usedEvidenceKeys: [] },
  };
  const brokenRetrieval = evaluateMemoryObservation(greywake, emptyStages);
  assert.equal(brokenRetrieval.retrieval.status, 'failed');
  assert.equal(brokenRetrieval.retrieval.expectedRecall, 0);

  const ignoredContext = evaluateMemoryObservation(greywake, {
    ...emptyStages,
    retrieval: {
      ...emptyStages.retrieval,
      evidenceKeys: ['thread.patient-tide-current'],
      candidatesExamined: 1,
    },
    assembly: {
      evidenceKeys: ['thread.patient-tide-current'],
      bytes: 96,
      duplicateBytes: 0,
    },
    generation: { disposition: 'answered', usedEvidenceKeys: [] },
  });
  assert.equal(ignoredContext.retrieval.status, 'passed');
  assert.equal(ignoredContext.assembly.status, 'passed');
  assert.equal(ignoredContext.generation.status, 'failed');

  const suite = await evaluateLinearMemoryBaseline({
    storage,
    corpus: greywake,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
  });
  assert.equal(suite.summary.queries, 12);
  assert.equal(suite.summary.generationNotRun, 12);
  assert.ok(suite.summary.retrievalPassed > 0);
  assert.ok(suite.summary.retrievalPassed < suite.summary.queries);

  const index = await buildLexicalStoryIndex(storage, {
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
  });
  const indexed = index.search({
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
    query: 'patient tide road',
    maxResults: 6,
    maxExaminedUnits: 256,
    maxExaminedBytes: 128 * 1024,
  });
  assert.equal(
    indexed.candidates[0]?.unit.path,
    'threads/patient-tide-return.md',
  );
  assert.equal(indexed.candidates[0]?.score.provider, 'field-lexical.v1');
  assert.ok(
    indexed.candidates.every(
      (entry) => entry.unit.visibility !== 'developer-private',
    ),
  );
  assert.throws(
    () =>
      index.search({
        storyId: materialized.storyId,
        rootHash: '0'.repeat(64),
        rootRevision: materialized.rootRevision,
        query: 'patient tide road',
      }),
    /does not match the captured story root/,
  );

  const indexedSuite = await evaluateIndexedMemoryRetrieval({
    index,
    corpus: greywake,
  });
  assert.equal(indexedSuite.summary.queries, suite.summary.queries);
  assert.ok(
    indexedSuite.summary.retrievalPassed > suite.summary.retrievalPassed,
  );
  assert.ok(
    indexedSuite.summary.meanExpectedRecall > suite.summary.meanExpectedRecall,
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
  assert.deepEqual(humanDefaults.candidates, []);
  assert.equal(humanDefaults.coverage.state, 'complete');
  const abstractIndex = await buildLexicalStoryIndex(abstractStorage, {
    storyId: abstract.storyId,
    rootHash: abstract.rootHash,
    rootRevision: abstract.rootRevision,
  });
  const indexedHumanDefaults = abstractIndex.search({
    storyId: abstract.storyId,
    rootHash: abstract.rootHash,
    rootRevision: abstract.rootRevision,
    query: 'tavern wage humanoid',
  });
  assert.equal(indexedHumanDefaults.candidates.length, 1);
  assert.deepEqual(indexedHumanDefaults.candidates[0]?.matchedTerms, ['humanoid']);
  assert.match(indexedHumanDefaults.candidates[0]?.snippet ?? '', /without humanoid/);
  const abstractSuite = await evaluateLinearMemoryBaseline({
    storage: abstractStorage,
    corpus: gradient,
    rootHash: abstract.rootHash,
    rootRevision: abstract.rootRevision,
  });
  assert.equal(abstractSuite.summary.queries, 1);
  assert.equal(abstractSuite.summary.generationNotRun, 1);
});
