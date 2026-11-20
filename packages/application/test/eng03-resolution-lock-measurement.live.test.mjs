/**
 * ENG03 T03: resolution admits without stretching story lock across DocumentStore I/O.
 * Probes readPassageDocument → DocumentStore.readSourcePassage and loadStorytellerContext
 * under lockOwnedStory; not pending consequence narration (T01/C1).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  playablePresentation,
  preparePlayableOpening,
  offlineExecution,
} from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { createDrafts } from '../dist/drafts/index.js';
import { createScriptedOpenings } from '../dist/generations/scripted-openings.js';
import { scriptedPlayableOpening } from '../dist/generations/scripted-openings.js';
import { createStories, playableOpeningStorySource } from '../dist/stories/index.js';
import { createStoryResolution } from '../dist/stories/resolution.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { lockOwnedStory } from '../dist/stories/persistence.js';
import { stageStoryBootstrapDocuments } from '../dist/stories/passage-documents.js';
import { createStorytellerRuntime } from '../dist/storyteller/runtime.js';
import {
  createEng03DelayedDocumentStore,
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const campaignPace = {
  mechanics: false,
  locked: false,
  pace: { kind: 'instant' },
  time: {
    kind: 'elapsed',
    id: 'simulation-game-seconds',
    revision: 1,
    unit: {
      id: 'game-second',
      label: 'game-second',
      pluralLabel: 'game-seconds',
      gameSecondsPerUnit: 1,
    },
    epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
  },
  worldObligations: [],
  worlds: [],
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function withDisposable(run) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: provisioned.connectionString,
      DB_STATEMENT_TIMEOUT_MS: '120000',
      DB_IDLE_TRANSACTION_TIMEOUT_MS: '120000',
    }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'ENG03-T02', `${ownerId}@example.test`],
  );
}

async function seedStorytellerChoiceStory(database, storage) {
  const ownerId = `eng03t02-st-${randomUUID()}`;
  const draftId = randomUUID();
  const generationId = randomUUID();
  const storyId = randomUUID();
  await insertUser(database, ownerId);
  const drafts = createDrafts(database);
  const openings = createScriptedOpenings(database, offlineExecution, null, {
    documentStore: storage,
  });
  const runtime = createStorytellerRuntime(database, { documentStore: storage });
  await drafts.save(ownerId, draftId, {
    title: 'ENG03 T02 storyteller',
    premise: 'A traveler at a locked gate.',
    storytellingDirection: 'Keep probes factual.',
    storyteller: { id: profile.id, revision: profile.revision },
    expectedRevision: 0,
  });
  await openings.request(ownerId, draftId, generationId, 1);
  await runtime.complete(generationId);
  const stories = createStories(database, { documentStore: storage });
  await stories.startFromCandidate({
    ownerId,
    storyId,
    candidateId: generationId,
    expectedDraftRevision: 1,
    campaign: campaignPace,
  });
  const before = await stories.read({ ownerId, storyId });
  assert.ok(before.current.interaction);
  assert.equal(before.current.interaction.specification.kind, 'choice.v1');
  assert.ok(before.campaign?.character == null);
  return { ownerId, storyId, before, branch: 'storyteller-resolution' };
}

async function seedScriptedLegacyChoiceStory(database, storage) {
  const ownerId = `eng03t02-legacy-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  const generationId = randomUUID();
  const draftId = randomUUID();
  const interactionId = randomUUID();
  await insertUser(database, ownerId);

  const presentation = playablePresentation(scriptedPlayableOpening);
  const content = presentation.content;
  const interaction = presentation.interaction;
  assert.ok(interaction);

  const premise = {
    title: 'A fork in the path',
    premise: 'Legacy scripted opening at a weathered post.',
    storytellingDirection: 'Probe only.',
  };
  const staged = await stageStoryBootstrapDocuments({
    storage,
    storyId,
    passageId,
    sequence: 1,
    operationId: storyId,
    rootHash: null,
    rootRevision: 0,
    content,
    premise,
    items: [],
  });
  const openingArtifact = preparePlayableOpening({
    id: draftId,
    revision: 1,
    title: premise.title,
    premise: premise.premise,
    storytellingDirection: premise.storytellingDirection,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await database.db.insert(generation).values({
    id: generationId,
    ownerId,
    kind: 'opening.playable.scripted.v1',
    state: 'succeeded',
    attemptId: generationId,
    input: openingArtifact,
    output: scriptedPlayableOpening,
  });
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: playableOpeningStorySource,
        sourceGenerationId: generationId,
        sourceGenerationPart: 'current',
        premise,
        storyteller: null,
        execution: null,
        usagePolicy: null,
        items: [],
        content,
        interaction,
      },
      stagedPassage: staged,
      interactionId,
    });
  });

  const stories = createStories(database, { documentStore: storage });
  const before = await stories.read({ ownerId, storyId });
  assert.ok(before.current.interaction);
  return { ownerId, storyId, before, branch: 'scripted-resolution' };
}

async function seedUnrelatedStory(database, storage) {
  const ownerId = `eng03t02-other-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const premise = {
    title: 'Unrelated control',
    premise: 'Unrelated story for lock control.',
    storytellingDirection: '',
  };
  const content = {
    version: 1,
    title: 'Unrelated control',
    paragraphs: ['No resolution probe here.'],
  };
  const staged = await stageStoryBootstrapDocuments({
    storage,
    storyId,
    passageId,
    sequence: 1,
    operationId: storyId,
    rootHash: null,
    rootRevision: 0,
    content,
    premise,
    items: [],
  });
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: playableOpeningStorySource,
        premise,
        storyteller: null,
        execution: null,
        usagePolicy: null,
        items: [],
        content,
        interaction: null,
      },
      stagedPassage: staged,
    });
  });
  return { ownerId, storyId };
}

async function measureResolutionTrial(database, storage, delayMs, seed) {
  const readSpans = [];
  let readStarted = false;
  const delayed = createEng03DelayedDocumentStore(storage, {
    delayMs,
    onBeforeRead: () => {
      readStarted = true;
    },
    onRead: (span) => readSpans.push(span),
  });
  const { ownerId, storyId, before, branch } = await seed(database, storage);
  const resolution = createStoryResolution(database, delayed);
  const operationId = randomUUID();
  const optionId = before.current.interaction.specification.options[0].id;

  const actionStarted = performance.now();
  const actionPromise = resolution.admit({
    ownerId,
    storyId,
    operationId,
    expectedRevision: before.revision,
    submission: {
      interactionId: before.current.interaction.id,
      answer: { kind: 'choice.v1', optionId },
    },
  });

  const waitDeadline = Date.now() + 20000;
  while (!readStarted && Date.now() < waitDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(
    readStarted,
    true,
  `${branch} resolution should await DocumentStore while holding story lock`,
  );

  const waitStart = performance.now();
  await database.db.transaction(async (tx) => {
    await lockOwnedStory(tx, { ownerId, storyId });
  });
  const competitorWaitMs = performance.now() - waitStart;
  await actionPromise;
  const actionHoldMs = performance.now() - actionStarted;
  const documentReadMs = readSpans.reduce(
    (sum, span) => sum + (span.endedAt - span.startedAt),
    0,
  );
  const readMethods = [...new Set(readSpans.map((span) => span.method))];

  const other = await seedUnrelatedStory(database, storage);
  const unrelatedStart = performance.now();
  await database.db.transaction(async (tx) => {
    await lockOwnedStory(tx, {
      ownerId: other.ownerId,
      storyId: other.storyId,
    });
  });
  const unrelatedLockMs = performance.now() - unrelatedStart;

  return {
    branch,
    delayMs,
    actionHoldMs,
    competitorWaitMs,
    documentReadMs,
    documentReadCount: readSpans.length,
    readMethods,
    unrelatedLockMs,
  };
}

function summarizeBranch(observations, branch) {
  const matrix = [0, 250, 2000];
  const rows = observations.filter((row) => row.branch === branch);
  const byDelay = Object.fromEntries(
    matrix.map((delayMs) => {
      const bucket = rows.filter((row) => row.delayMs === delayMs);
      return [
        delayMs,
        {
          actionHoldMedian: median(bucket.map((row) => row.actionHoldMs)),
          competitorWaitMedian: median(
            bucket.map((row) => row.competitorWaitMs),
          ),
          documentReadMedian: median(bucket.map((row) => row.documentReadMs)),
          unrelatedLockMedian: median(
            bucket.map((row) => row.unrelatedLockMs),
          ),
          readMethods: bucket[0]?.readMethods ?? [],
        },
      ];
    }),
  );
  const baseline = byDelay[0];
  const delayed2s = byDelay[2000];
  return {
    branch,
    holdDeltaMs: delayed2s.actionHoldMedian - baseline.actionHoldMedian,
    waitDeltaMs: delayed2s.competitorWaitMedian - baseline.competitorWaitMedian,
    byDelay,
    attributedMethods: delayed2s.readMethods,
  };
}

test('ENG03 T03: resolution lock does not propagate DocumentStore delay (storyteller + scripted)', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t02-docs-'));
    const storage = new LocalDocumentStore(root);
    const matrix = [0, 250, 2000];
    const repeats = 2;
    const observations = [];

    for (const seed of [seedStorytellerChoiceStory, seedScriptedLegacyChoiceStory]) {
      for (const delayMs of matrix) {
        await measureResolutionTrial(database, storage, delayMs, seed);
        for (let i = 0; i < repeats; i += 1) {
          observations.push(
            await measureResolutionTrial(database, storage, delayMs, seed),
          );
        }
      }
    }

    const summaries = [
      summarizeBranch(observations, 'storyteller-resolution'),
      summarizeBranch(observations, 'scripted-resolution'),
    ];
    console.log(
      JSON.stringify(
        {
          summaries,
          followOnTests: {
            activityWorldNarration:
              'campaign/narration.ts admitConsequenceNarration | admitWorldObligationNarration under lock (ENG03 T04)',
            historicalReport:
              'campaign/reports.ts requestHistoricalReport in mechanical TX (ENG03 T05)',
          },
          underLockAwaits:
            'readPassageDocument → DocumentStore.readSourcePassage; storyteller branch also loadStorytellerContext → further readSourcePassage/readManifest reads when canonical pins exist',
        },
        null,
        2,
      ),
    );

    for (const summary of summaries) {
      const baseline = summary.byDelay[0];
      const delayed2s = summary.byDelay[2000];
      assert.ok(
        delayed2s.documentReadMedian > baseline.documentReadMedian + 1000,
        `${summary.branch}: injected delay must appear in DocumentStore read spans`,
      );
      assert.ok(
        summary.waitDeltaMs < 500,
        `${summary.branch}: story FOR UPDATE hold must stay short while CAS reads run off-lock`,
      );
      assert.ok(
        delayed2s.unrelatedLockMedian < 500,
        `${summary.branch}: unrelated story lock must not inherit delay`,
      );
      assert.ok(
        summary.attributedMethods.includes('readSourcePassage'),
        `${summary.branch}: lock-held external await is readSourcePassage`,
      );
    }
  });
});