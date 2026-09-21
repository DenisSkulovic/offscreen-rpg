import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDocumentStore } from '../../packages/documents/dist/index.js';
import {
  buildLongStoryMemoryCorpus,
  materializeLongStoryMemoryCorpus,
} from '../../packages/application/dist/developer-tools/long-story-memory-corpus.js';
import { evaluateIndexedMemoryRetrieval } from '../../packages/application/dist/developer-tools/memory-evaluator.js';
import { buildLexicalStoryIndex } from '../../packages/application/dist/storyteller/lexical-story-index.js';

const requested = process.argv.slice(2).map(Number);
const sceneCounts = requested.length ? requested : [200, 2000];
if (
  sceneCounts.some(
    (count) => !Number.isInteger(count) || count < 1 || count > 2000,
  )
) {
  throw new Error('Scene counts must be integers from 1 through 2000');
}

const reports = [];
for (const sceneCount of sceneCounts) {
  const directory = await mkdtemp(
    join(tmpdir(), `offscreen-memory-index-${sceneCount}-`),
  );
  try {
    const corpus = buildLongStoryMemoryCorpus('greywake', sceneCount);
    const storage = new LocalDocumentStore(directory);
    const materialized = await materializeLongStoryMemoryCorpus(
      storage,
      corpus,
    );
    const buildStarted = performance.now();
    const index = await buildLexicalStoryIndex(storage, {
      storyId: materialized.storyId,
      rootHash: materialized.rootHash,
      rootRevision: materialized.rootRevision,
    });
    const buildMs = performance.now() - buildStarted;
    const queryStarted = performance.now();
    const evaluation = await evaluateIndexedMemoryRetrieval({ index, corpus });
    reports.push({
      sceneCount,
      indexedUnits: index.snapshot().units.length,
      buildMs,
      querySuiteMs: performance.now() - queryStarted,
      summary: evaluation.summary,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

console.log(
  JSON.stringify(
    {
      format: 'offscreen.memory-index-benchmark.v1',
      providerCalls: 0,
      reports,
    },
    null,
    2,
  ),
);
