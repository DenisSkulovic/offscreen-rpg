import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalDocumentStore } from '@offscreen/documents';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
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
import { LocalLexicalStoryIndexStore } from '../dist/storyteller/local-lexical-story-index-store.js';
import { resolveStoryRetrievalRecipe } from '../dist/storyteller/retrieval-recipes.js';
import { createCanonicalMemoryExplorer } from '../dist/storyteller/memory-exploration.js';
import { packStoryEvidence } from '../dist/storyteller/evidence-packing.js';
import {
  buildPackableMemoryEvidence,
  packMemoryExplorationEvidence,
} from '../dist/storyteller/memory-evidence-packing.js';
import { inspectMemoryExplorationProviderRequest } from '../dist/storyteller/memory-provider-preview.js';
import {
  buildEvidencePackingPressureFixture,
  evaluateEvidencePackingPressure,
} from '../dist/developer-tools/evidence-packing-evaluator.js';

test('packs required evidence, group breadth and shared content deterministically', () => {
  const representation = (level, content, utility) => ({
    level,
    content,
    utility,
    sourceKeys: [`source:${content.slice(0, 8)}`],
  });
  const items = [
    {
      id: 'mira-current',
      group: { kind: 'identity', key: 'mira' },
      required: true,
      minimumLevel: 'card',
      relevance: 100,
      representations: [
        representation('lead', 'Mira', 5),
        representation('card', 'Mira still holds the repaired quay charter.', 40),
        representation('exact', 'Mira still holds the repaired quay charter. It was returned at tick 880.', 70),
      ],
    },
    {
      id: 'favor-thread',
      group: { kind: 'thread', key: 'mira-favor' },
      required: false,
      minimumLevel: 'lead',
      relevance: 90,
      representations: [representation('lead', 'The old favor remains open.', 20)],
    },
    {
      id: 'favor-thread-source-alias',
      group: { kind: 'thread', key: 'mira-favor' },
      required: false,
      minimumLevel: 'lead',
      relevance: 80,
      representations: [representation('lead', 'The old favor remains open.', 20)],
    },
    {
      id: 'greywake-place',
      group: { kind: 'place', key: 'greywake' },
      required: false,
      minimumLevel: 'lead',
      relevance: 70,
      representations: [representation('lead', 'Greywake quay is repaired.', 20)],
    },
  ];
  const packed = packStoryEvidence(items, {
    maxBytes: 4096,
    maxItems: 3,
    maxItemsPerGroup: 2,
  });
  assert.equal(packed.status, 'packed');
  assert.deepEqual(
    packed.selected.map((entry) => entry.itemId),
    ['mira-current', 'favor-thread', 'greywake-place'],
  );
  assert.equal(packed.selected[0].level, 'exact');
  assert.ok(packed.bytes <= 4096);

  const deduplicated = packStoryEvidence(items.slice(1, 3), {
    maxBytes: 4096,
    maxItems: 2,
    maxItemsPerGroup: 2,
  });
  assert.equal(deduplicated.packet.contents.length, 1);
  assert.equal(deduplicated.packet.sources.length, 1);
  assert.ok(deduplicated.duplicateContentBytesRemoved > 0);

  const overflow = packStoryEvidence(items.slice(0, 1), {
    maxBytes: 64,
    maxItems: 1,
    maxItemsPerGroup: 1,
  });
  assert.equal(overflow.status, 'mandatory-overflow');
});

test('measures evidence density and breadth across fixed cost postures', () => {
  const fixture = buildEvidencePackingPressureFixture();
  const repeated = buildEvidencePackingPressureFixture();
  const report = evaluateEvidencePackingPressure(fixture);
  const repeatedReport = evaluateEvidencePackingPressure(repeated);

  assert.deepEqual(repeated, fixture);
  assert.deepEqual(repeatedReport, report);
  assert.deepEqual(report.fixture, {
    items: 40,
    identities: 20,
    places: 5,
    plotNodes: 15,
    required: 6,
    groups: 40,
  });
  assert.deepEqual(
    report.postures.map((posture) => posture.posture),
    ['minimal', 'balanced', 'rich'],
  );

  for (const posture of report.postures) {
    assert.equal(posture.status, 'packed');
    assert.equal(posture.requiredRecall, 1);
    assert.equal(posture.requiredSourceRecall, 1);
    assert.ok(posture.bytes <= posture.policy.maxBytes);
    assert.ok(posture.usefulDensity > 0);
    assert.ok(posture.duplicateBytesRemoved > 0);
    assert.equal(posture.fidelity.exact >= 1, true);
    assert.ok(posture.groupCoverageByKind.identity.selected > 0);
    assert.ok(posture.groupCoverageByKind.place.selected > 0);
    assert.ok(posture.groupCoverageByKind.event.selected > 0);
  }

  const [minimal, balanced, rich] = report.postures;
  assert.ok(minimal.groupCoverage < balanced.groupCoverage);
  assert.ok(balanced.groupCoverage < rich.groupCoverage);
  assert.ok(minimal.selectedItems < balanced.selectedItems);
  assert.ok(balanced.selectedItems < rich.selectedItems);
  assert.equal(rich.selectedItems, 40);
  assert.equal(rich.groupCoverage, 1);
  assert.deepEqual(rich.groupCoverageByKind, {
    event: { eligible: 15, selected: 15, coverage: 1 },
    identity: { eligible: 20, selected: 20, coverage: 1 },
    place: { eligible: 5, selected: 5, coverage: 1 },
  });
  assert.equal(minimal.fidelity.exact, 1);
  assert.equal(balanced.fidelity.exact, 1);
  assert.equal(rich.fidelity.exact, 1);
  assert.equal(rich.fidelity.card, 39);
  assert.equal(rich.fidelity.lead, 0);
  assert.equal(
    rich.selected.find((selection) => selection.itemId === 'node-01')?.level,
    'exact',
  );
});

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
    new Set(
      [...greywake.queries, ...gradient.queries].map(
        (entry) => entry.queryClass,
      ),
    ).size,
    13,
  );

  const storage = new LocalDocumentStore(
    await mkdtemp(join(tmpdir(), 'offscreen-memory-corpus-')),
  );
  const materialized = await materializeLongStoryMemoryCorpus(
    storage,
    greywake,
  );
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
  assert.equal(
    current.candidates[0]?.unit.path,
    'threads/patient-tide-return.md',
  );
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
  const profileReports = {};
  for (const posture of ['minimal', 'balanced', 'rich']) {
    const recipe = resolveStoryRetrievalRecipe({ posture });
    profileReports[posture] = await evaluateIndexedMemoryRetrieval({
      index,
      corpus: greywake,
      recipe,
    });
  }
  assert.equal(profileReports.minimal.summary.queries, 12);
  assert.equal(profileReports.balanced.summary.queries, 12);
  assert.equal(profileReports.rich.summary.queries, 12);
  assert.ok(
    profileReports.balanced.summary.meanExpectedRecall >=
      profileReports.minimal.summary.meanExpectedRecall,
  );
  const noReadRecipe = resolveStoryRetrievalRecipe({
    posture: 'rich',
    operationLimits: { maxReads: 0, maxRetainedBytes: 0 },
  });
  assert.deepEqual(noReadRecipe.assembly, { maxReads: 0, maxBytes: 0 });
  const minimalSearch = index.search({
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
    query: 'patient tide road',
    ...resolveStoryRetrievalRecipe({ posture: 'minimal' }).query,
  });
  assert.equal(minimalSearch.diagnostics.tuning.id, 'minimal-lexical');
  assert.equal(minimalSearch.coverage.eligibleUnits, 8);

  const explorationRecipe = resolveStoryRetrievalRecipe({ posture: 'rich' });
  const explorer = createCanonicalMemoryExplorer({
    storage,
    index,
    recipe: explorationRecipe,
  });
  const discovery = await explorer.execute({
    kind: 'needs_context',
    version: 1,
    purpose: 'Recover the old favor and identify Mira before the return.',
    requests: [
      { requestId: 'r1', operation: 'search_memory', query: 'quiet favor' },
      { requestId: 'r2', operation: 'query_registry', query: 'Mira Vale' },
    ],
  });
  const favorCandidate = discovery.results[0].candidates.find(
    (candidate) => candidate.path === 'relationships/mira-vale-favor.md',
  );
  assert.ok(favorCandidate);
  const sourceHandle = favorCandidate.linkedSources[0]?.handle;
  assert.ok(sourceHandle);
  const resumedExplorer = createCanonicalMemoryExplorer({
    storage,
    index,
    recipe: explorationRecipe,
    snapshot: explorer.snapshot(),
  });
  const evidenceRound = await resumedExplorer.execute({
    kind: 'needs_context',
    version: 1,
    purpose: 'Inspect the exact current favor and its original source.',
    requests: [
      {
        requestId: 'r3',
        operation: 'inspect_memory',
        handle: favorCandidate.handle,
      },
      { requestId: 'r4', operation: 'read_source', handle: sourceHandle },
    ],
  });
  assert.match(evidenceRound.results[0].body, /still owes Mira Vale/);
  assert.match(
    evidenceRound.results[1].body,
    /promised Mira Vale a quiet favor/,
  );
  assert.equal(resumedExplorer.snapshot().readsUsed, 4);
  assert.equal(resumedExplorer.snapshot().rounds.length, 2);
  const packableEvidence = buildPackableMemoryEvidence(
    resumedExplorer.snapshot(),
  );
  const requiredEvidence = packableEvidence.filter((item) => item.required);
  assert.equal(requiredEvidence.length, 2);
  assert.deepEqual(
    requiredEvidence.map((item) => item.minimumLevel).sort(),
    ['card', 'exact'],
  );
  assert.ok(
    requiredEvidence.every((item) =>
      item.representations.every((representation) =>
        representation.sourceKeys.every((source) =>
          /^canonical:[0-9a-f-]+@[1-9][0-9]*#sha256:[0-9a-f]{64}$/.test(
            source,
          ),
        ),
      ),
    ),
  );
  const greywakePack = packMemoryExplorationEvidence(
    resumedExplorer.snapshot(),
    { maxBytes: 12 * 1024, maxItems: 12, maxItemsPerGroup: 4 },
  );
  assert.equal(greywakePack.status, 'packed');
  assert.match(
    greywakePack.packet.contents.map((content) => content.text).join('\n'),
    /still owes Mira Vale/,
  );
  assert.match(
    greywakePack.packet.contents.map((content) => content.text).join('\n'),
    /promised Mira Vale a quiet favor/,
  );
  assert.doesNotMatch(
    JSON.stringify(greywakePack.packet),
    /Destroyed Greywake|False tide road/,
  );
  assert.throws(
    () =>
      buildPackableMemoryEvidence({
        ...resumedExplorer.snapshot(),
        rounds: [{ malformed: true }],
      }),
    /round cannot be packed/,
  );
  const providerBase = createRequestAuditFixtureCases({
    caseIds: ['scene-continuation'],
  })[0].task;
  const providerTask = storytellerTaskSchema.parse({
    ...providerBase,
    resources: {
      ...providerBase.resources,
      recipe: {
        version: 'memory-exploration.v1',
        maxModelRounds: 2,
        maxReads: 4,
        maxRetainedReadBytes: 12 * 1024,
        tools: 'memory-read.v1',
        automaticEscalation: false,
        finalAnswerReserveRounds: 1,
      },
      authority: {
        ...providerBase.resources.authority,
        policy: {
          ...providerBase.resources.authority.policy,
          limits: {
            ...providerBase.resources.authority.policy.limits,
            maxModelRoundsPerOperation: 2,
            maxReadsPerOperation: 4,
            maxRetainedReadBytes: 12 * 1024,
          },
        },
      },
    },
  });
  const providerPreview = inspectMemoryExplorationProviderRequest(
    providerTask,
    resumedExplorer.snapshot(),
    2,
  );
  assert.equal(providerPreview.transportPerformed, false);
  assert.equal(providerPreview.providerChargeMicrousd, '0');
  assert.equal(providerPreview.canRequestContext, false);
  assert.ok(providerPreview.evidence.selected.length >= 2);
  assert.ok(
    providerPreview.boundedRequestBytes <=
      providerTask.resources.envelope.maxSerializedRequestBytes,
  );
  assert.equal(
    providerPreview.inspection.userSections.at(-1)?.key,
    'memoryExploration',
  );
  assert.match(
    JSON.stringify(providerPreview.inspection.body.messages),
    /still owes Mira Vale/,
  );

  const indexStore = new LocalLexicalStoryIndexStore(
    await mkdtemp(join(tmpdir(), 'offscreen-memory-index-')),
  );
  await indexStore.replace(index);
  const restartedIndex = await indexStore.load(materialized.storyId);
  assert.ok(restartedIndex);
  assert.deepEqual(
    restartedIndex.search({
      storyId: materialized.storyId,
      rootHash: materialized.rootHash,
      rootRevision: materialized.rootRevision,
      query: 'patient tide road',
      maxResults: 6,
      maxExaminedUnits: 256,
      maxExaminedBytes: 128 * 1024,
    }),
    indexed,
  );
  const rebuiltIndex = await buildLexicalStoryIndex(storage, {
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
  });
  assert.deepEqual(rebuiltIndex.snapshot(), index.snapshot());
  await indexStore.replace(rebuiltIndex);

  const manifest = await storage.readManifest(materialized.rootHash);
  const favorEntry = manifest.entries.find(
    (entry) => entry.path === 'relationships/mira-vale-favor.md',
  );
  assert.ok(favorEntry);
  const favor = await storage.readDocument(favorEntry.objectHash);
  const revisedFavorHash = await storage.putDocument({
    ...favor,
    envelope: { ...favor.envelope, revision: 2 },
    body: 'The quiet favor owed to Mira Vale was settled.',
  });
  const revisedRootHash = await storage.putManifest({
    ...manifest,
    revision: 2,
    previousRootHash: materialized.rootHash,
    authorOperationId: '00000000-0000-5000-8000-000000000002',
    entries: manifest.entries.map((entry) =>
      entry.documentId === favorEntry.documentId
        ? { ...entry, revision: 2, objectHash: revisedFavorHash }
        : entry,
    ),
  });
  const revisedIndex = await buildLexicalStoryIndex(storage, {
    storyId: materialized.storyId,
    rootHash: revisedRootHash,
    rootRevision: 2,
  });
  await indexStore.replace(revisedIndex);
  const reloadedRevision = await indexStore.load(materialized.storyId);
  assert.equal(reloadedRevision?.rootRevision, 2);
  assert.equal(
    reloadedRevision?.search({
      storyId: materialized.storyId,
      rootHash: revisedRootHash,
      rootRevision: 2,
      query: 'favor settled',
    }).candidates[0]?.unit.revision,
    2,
  );
  await indexStore.delete(materialized.storyId);
  assert.equal(await indexStore.load(materialized.storyId), null);

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
  assert.deepEqual(indexedHumanDefaults.candidates[0]?.matchedTerms, [
    'humanoid',
  ]);
  assert.match(
    indexedHumanDefaults.candidates[0]?.snippet ?? '',
    /without humanoid/,
  );
  const abstractSuite = await evaluateLinearMemoryBaseline({
    storage: abstractStorage,
    corpus: gradient,
    rootHash: abstract.rootHash,
    rootRevision: abstract.rootRevision,
  });
  assert.equal(abstractSuite.summary.queries, 1);
  assert.equal(abstractSuite.summary.generationNotRun, 1);
});
