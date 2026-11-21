import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CanonicalMemoryExplorationError,
  createCanonicalMemoryExplorer,
} from '../../../packages/story-engine/dist/storyteller/memory-exploration.js';
import {
  LEXICAL_STORY_INDEX_SCHEMA_VERSION,
  restoreLexicalStoryIndex,
  suppressAmbiguousAliasIdentities,
} from '../../../packages/story-engine/dist/storyteller/lexical-story-index.js';
import { resolveStoryRetrievalRecipe } from '../../../packages/story-engine/dist/storyteller/retrieval-recipes.js';

const storyId = '00000000-0000-4000-8000-0000000000d4';
const otherStoryId = '00000000-0000-4000-8000-0000000000e5';
const rootHash = 'c'.repeat(64);
const rootRevision = 2;
const supersededBody = 'Mira Vale was banished from the quay.';

function frequency(value) {
  const frequencies = {};
  for (const term of value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)) {
    frequencies[term] = (frequencies[term] ?? 0) + 1;
  }
  return frequencies;
}

function indexed(input) {
  const contextualKey = `${input.kind} ${input.title} ${input.path}`;
  return {
    unit: {
      unitId: `${input.documentId}@${rootRevision}#root`,
      documentId: input.documentId,
      revision: rootRevision,
      sourceHash: input.sourceHash,
      path: input.path,
      kind: input.kind,
      authority: 'canon',
      visibility: 'player-known',
      branchKey: null,
      current: true,
      headingPath: [],
      linkedDocumentIds: [],
      effectiveFromGameSecond: null,
      effectiveThroughGameSecond: null,
      title: input.title,
      contextualKey,
      bodyBytes: Buffer.byteLength(input.body, 'utf8'),
    },
    title: frequency(input.title),
    path: frequency(input.path),
    context: frequency(contextualKey),
    body: frequency(input.body),
    bodyText: input.body,
  };
}

function greywakeIndex() {
  return restoreLexicalStoryIndex({
    format: LEXICAL_STORY_INDEX_SCHEMA_VERSION,
    storyId,
    rootHash,
    rootRevision,
    units: [
      indexed({
        documentId: '00000000-0000-4000-8000-0000000000a1',
        sourceHash: 'a'.repeat(64),
        path: 'identities/mira-vale.md',
        kind: 'identity',
        title: 'Mira Vale',
        body: 'Greywake innkeeper; keeper of the blue ledger and the brass key.',
      }),
      indexed({
        documentId: '00000000-0000-4000-8000-0000000000b2',
        sourceHash: 'b'.repeat(64),
        path: 'identities/mira-pell.md',
        kind: 'identity',
        title: 'Mira Pell',
        body: 'A visiting cartographer, distinct from Mira Vale.',
      }),
      indexed({
        documentId: '00000000-0000-4000-8000-0000000000c3',
        sourceHash: 'd'.repeat(64),
        path: 'relationships/mira-vale-favor.md',
        kind: 'relationship',
        title: 'A quiet favor',
        body: 'The player still owes Mira Vale one quiet favor; no deadline was established.',
      }),
    ],
  });
}

function search(index, query, story = storyId) {
  return index.search({
    storyId: story,
    rootHash,
    rootRevision,
    query,
    maxResults: 6,
    maxExaminedUnits: 16,
    maxExaminedBytes: 16 * 1024,
  });
}

test('the unfiltered Mira alias miss drops Pell once the blue-ledger cue matches Vale', () => {
  const miss = [
    {
      unit: { kind: 'identity', title: 'Mira Vale' },
      matchedTerms: ['mira', 'blue', 'ledger'],
    },
    {
      unit: { kind: 'identity', title: 'Mira Pell' },
      matchedTerms: ['mira'],
    },
    {
      unit: { kind: 'relationship', title: "The brass key's old hiding place" },
      matchedTerms: ['mira', 'blue', 'ledger'],
    },
  ];
  assert.equal(
    miss.some((candidate) => candidate.unit.title === 'Mira Pell'),
    true,
  );
  const hit = suppressAmbiguousAliasIdentities(miss);
  assert.deepEqual(
    hit.map((candidate) => candidate.unit.title),
    ['Mira Vale', "The brass key's old hiding place"],
  );
  const noCue = suppressAmbiguousAliasIdentities([
    {
      unit: { kind: 'identity', title: 'Mira Vale' },
      matchedTerms: ['mira'],
    },
    {
      unit: { kind: 'identity', title: 'Mira Pell' },
      matchedTerms: ['mira'],
    },
  ]);
  assert.deepEqual(
    noCue.map((candidate) => candidate.unit.title),
    ['Mira Vale', 'Mira Pell'],
  );
});

test('ask_memory returns Vale for the blue ledger and still refuses Pell, an empty result, a wrong root, and superseded wording', async () => {
  const index = greywakeIndex();
  assert.equal(index.snapshot().units[0]?.bodyText.includes('banished'), false);
  assert.equal(supersededBody.includes('banished'), true);

  const ambiguous = search(index, 'Mira');
  assert.deepEqual(
    ambiguous.candidates
      .filter((candidate) => candidate.unit.kind === 'identity')
      .map((candidate) => candidate.unit.title)
      .sort(),
    ['Mira Pell', 'Mira Vale'],
  );

  const hit = search(index, 'Which Mira keeps the blue ledger?');
  assert.equal(hit.candidates[0]?.unit.title, 'Mira Vale');
  assert.equal(hit.candidates[0]?.unit.revision, rootRevision);
  assert.equal(
    hit.candidates.some((candidate) => candidate.unit.title === 'Mira Pell'),
    false,
  );

  const bothNamed = search(index, 'How is Mira Pell distinct from Mira Vale?');
  assert.deepEqual(
    bothNamed.candidates
      .filter((candidate) => candidate.unit.kind === 'identity')
      .map((candidate) => candidate.unit.title)
      .sort(),
    ['Mira Pell', 'Mira Vale'],
  );

  const paraphrase = search(
    index,
    'What old obligation should shape this homecoming?',
  );
  assert.equal(paraphrase.candidates.length, 0);

  const reads = [];
  const storage = {
    async readManifest(hash) {
      reads.push(hash);
      return { campaignId: storyId, revision: rootRevision, entries: [] };
    },
  };
  const explorer = createCanonicalMemoryExplorer({
    storage,
    index,
    recipe: resolveStoryRetrievalRecipe({ posture: 'balanced' }),
  });
  const found = await explorer.execute({
    kind: 'needs_context',
    version: 1,
    purpose: 'Tell these two Miras apart.',
    requests: [
      {
        requestId: 'r1',
        operation: 'ask_memory',
        intent: 'evidence',
        question: 'Which Mira keeps the blue ledger?',
      },
    ],
  });
  assert.equal(found.results[0].state, 'ok');
  assert.equal(found.results[0].candidates[0].title, 'Mira Vale');
  assert.equal(
    found.results[0].candidates.some((candidate) => candidate.title === 'Mira Pell'),
    false,
  );

  const empty = await explorer.execute({
    kind: 'needs_context',
    version: 1,
    purpose: 'Ask for a fact that was never published.',
    requests: [
      {
        requestId: 'r2',
        operation: 'ask_memory',
        intent: 'evidence',
        question: 'banished volcano',
      },
    ],
  });
  assert.equal(empty.results[0].state, 'no-match');
  assert.deepEqual(empty.results[0].candidates, []);
  assert.deepEqual(reads, [rootHash, rootHash]);

  assert.throws(
    () => search(index, 'Which Mira keeps the blue ledger?', otherStoryId),
    /does not match the captured story root/,
  );
  const wrongStory = createCanonicalMemoryExplorer({
    storage: {
      async readManifest() {
        return {
          campaignId: otherStoryId,
          revision: rootRevision,
          entries: [],
        };
      },
    },
    index,
    recipe: resolveStoryRetrievalRecipe({ posture: 'balanced' }),
  });
  await assert.rejects(
    () =>
      wrongStory.execute({
        kind: 'needs_context',
        version: 1,
        purpose: 'Refuse a different story root.',
        requests: [
          {
            requestId: 'r1',
            operation: 'ask_memory',
            intent: 'evidence',
            question: 'Which Mira keeps the blue ledger?',
          },
        ],
      }),
    (error) =>
      error instanceof CanonicalMemoryExplorationError &&
      error.code === 'stale-root',
  );
});
