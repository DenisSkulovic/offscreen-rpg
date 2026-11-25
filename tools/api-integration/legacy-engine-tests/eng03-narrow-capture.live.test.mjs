import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import {
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/story-persistence/campaign';
import { storyResolution } from '@offscreen/story-persistence/stories';
import {
  storytellerContextCapture,
  storytellerPublication,
} from '@offscreen/story-persistence/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { stageStoryBootstrapDocuments } from '../../../packages/story-engine/dist/stories/passage-documents.js';
import {
  createEng03DelayedDocumentStore,
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { createStorytellerRuntime } from '../../../packages/story-engine/dist/storyteller/runtime.js';
import { storytellerKind } from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  contextCaptureV1Schema,
  hashContextCapture,
  storytellerContextCaptureKind,
} from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import { lockOwnedStory } from '../../../packages/story-engine/dist/stories/persistence.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const persuadePlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'persuade-guard',
  label: 'Persuade the guard',
  intention: 'Talk past the harbor guard without drawing steel.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'check',
    fictionalDurationSeconds: 5,
    check: {
      rule: 'srd-5.2.1-subset.v1',
      purpose: 'Persuade a guard',
      skill: 'persuasion',
      ability: 'charisma',
      dc: 10,
      advantage: false,
      disadvantage: false,
      modifiers: [],
    },
    difficultyBasis: 'The guard is attentive but not hostile.',
    success: {
      text: 'The guard lets you pass.',
      effects: [],
    },
    failure: {
      text: 'The guard refuses.',
      effects: [],
    },
  },
});

function quayCharacter() {
  return {
    name: 'A quay runner',
    scores: {
      strength: 10,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 12,
      charisma: 14,
    },
    applicableAbilities: [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ],
    skills: [{ id: 'persuasion', label: 'Persuasion' }],
    proficientSkills: ['persuasion'],
    proficiencyBonus: 2,
    hp: 10,
    maxHp: 10,
    facts: [],
    quantities: [],
  };
}

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
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
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
    [ownerId, 'ENG03-narrow', `${ownerId}@example.test`],
  );
}

async function seedDocumentedStory(database, storage) {
  const ownerId = `eng03n-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor capture probe',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor capture probe',
    premise: 'A quay runner faces a harbor guard.',
    storytellingDirection: 'Keep probes factual.',
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
        source: 'playable.opening.v1',
        premise,
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content,
        interaction: null,
      },
      stagedPassage: staged,
    });
    await initializeCampaign(
      tx,
      storyId,
      profile,
      {
        mechanics: true,
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
      },
      {
        character: quayCharacter(),
        storyFacts: [],
        plans: [persuadePlan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  return { ownerId, storyId };
}

async function acceptPendingAction(database, storage, documentStore = storage) {
  const { ownerId, storyId } = await seedDocumentedStory(database, storage);
  const stories = createStories(database, { documentStore });
  const before = await stories.read({ ownerId, storyId });
  assert.ok(before.campaign?.offer);
  const operationId = randomUUID();
  await stories.campaignAction({
    ownerId,
    storyId,
    operationId,
    body: {
      expectedRevision: before.revision,
      offerId: before.campaign.offer.id,
      path: ['persuade-guard'],
    },
  });
  const [execution] = await database.db
    .select()
    .from(gameActionExecution)
    .where(eq(gameActionExecution.operationId, operationId));
  assert.ok(execution?.preparationGenerationId);
  return {
    ownerId,
    storyId,
    operationId,
    generationId: execution.preparationGenerationId,
    stories,
  };
}

test('ENG03-narrow: Stage1 freezes capture without DocumentStore under lock; Stage2 promotes same G', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-docs-'));
    const storage = new LocalDocumentStore(root);
    let readUnderAction = false;
    const delayed = createEng03DelayedDocumentStore(storage, {
      delayMs: 500,
      onBeforeRead: () => {
        readUnderAction = true;
      },
    });
    const { ownerId, storyId } = await seedDocumentedStory(database, storage);
    const stories = createStories(database, { documentStore: delayed });
    const before = await stories.read({ ownerId, storyId });
    assert.ok(before.campaign?.offer);
    readUnderAction = false;
    const operationId = randomUUID();

    const actionStarted = performance.now();
    const actionPromise = stories.campaignAction({
      ownerId,
      storyId,
      operationId,
      body: {
        expectedRevision: before.revision,
        offerId: before.campaign.offer.id,
        path: ['persuade-guard'],
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    const waitStart = performance.now();
    await database.db.transaction(async (tx) => {
      await lockOwnedStory(tx, { ownerId, storyId });
    });
    const competitorWaitMs = performance.now() - waitStart;
    await actionPromise;
    const actionHoldMs = performance.now() - actionStarted;

    assert.equal(readUnderAction, false);
    assert.ok(competitorWaitMs < 200, `competitor wait ${competitorWaitMs}ms`);
    assert.ok(actionHoldMs < 400, `action hold ${actionHoldMs}ms`);

    const [execution] = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.operationId, operationId));
    const generationId = execution.preparationGenerationId;
    assert.ok(generationId);

    const [capture] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, operationId));
    assert.equal(capture.captureId, generationId);
    assert.equal(capture.state, 'captured');

    const [provisional] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(provisional.kind, storytellerContextCaptureKind);

    await stories.prepareCampaignConsequence(operationId);

    const [ready] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(
      ready.state,
      'ready',
      `Stage 2 failed: state=${ready.state} failure=${ready.failureCode}`,
    );

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(promoted.kind, storytellerKind);
  });
});

test('ENG03-narrow: settle before Stage2 keeps same G and promotes via consequence wake', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-settle-before-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);

    const [beforeSettle] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(beforeSettle.kind, storytellerContextCaptureKind);

    assert.equal(
      await accepted.stories.advanceCampaignAction(accepted.operationId),
      null,
    );

    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, accepted.operationId));
    assert.equal(receipt.generationId, accepted.generationId);

    const [stillProvisional] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(stillProvisional.kind, storytellerContextCaptureKind);

    await accepted.stories.prepareCampaignConsequence(accepted.operationId);

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(promoted.kind, storytellerKind);

    const [capture] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));
    assert.equal(capture.state, 'ready');

    const resolutions = await database.db
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.storyId, accepted.storyId));
    assert.equal(resolutions.length, 1);
    assert.equal(resolutions[0].generationId, accepted.generationId);
  });
});

test('ENG03-narrow: settle during Stage2 CAS delay keeps same G; lock wait stays short', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-settle-during-'));
    const storage = new LocalDocumentStore(root);
    let readsStarted = 0;
    const delayed = createEng03DelayedDocumentStore(storage, {
      delayMs: 800,
      onBeforeRead: () => {
        readsStarted += 1;
      },
    });
    const accepted = await acceptPendingAction(database, storage, delayed);

    const materializePromise =
      accepted.stories.prepareCampaignConsequence(accepted.operationId);

    const waitDeadline = Date.now() + 5000;
    while (readsStarted < 1 && Date.now() < waitDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.ok(readsStarted >= 1, 'Stage2 CAS should start off-lock');

    const settleStart = performance.now();
    assert.equal(
      await accepted.stories.advanceCampaignAction(accepted.operationId),
      null,
    );
    const settleMs = performance.now() - settleStart;
    assert.ok(
      settleMs < 400,
      `settlement waited ${settleMs}ms; must not include CAS delay`,
    );

    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, accepted.operationId));
    assert.equal(receipt.generationId, accepted.generationId);

    await materializePromise;

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(promoted.kind, storytellerKind);
    const [capture] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));
    assert.equal(capture.state, 'ready');
  });
});

test('ENG03-narrow: promote then settle then scripted publish uses exact G; no pre-settlement publish', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-publish-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);
    await accepted.stories.prepareCampaignConsequence(accepted.operationId);

    const storyteller = createStorytellerRuntime(database, {
      documentStore: storage,
    });
    await assert.rejects(
      () => storyteller.complete(accepted.generationId),
      (error) => {
        assert.ok(error instanceof StoryError);
        assert.equal(error.code, 'unavailable');
        assert.equal(error.reason, 'pending-consequence-not-settled');
        return true;
      },
    );

    const [publicationBefore] = await database.db
      .select()
      .from(storytellerPublication)
      .where(
        eq(storytellerPublication.generationId, accepted.generationId),
      );
    assert.equal(
      publicationBefore.state,
      'pending',
      'must not publish before settlement receipt',
    );

    assert.equal(
      await accepted.stories.advanceCampaignAction(accepted.operationId),
      null,
    );
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, accepted.operationId));
    assert.equal(receipt.generationId, accepted.generationId);

    await storyteller.complete(accepted.generationId);
    const [publicationAfter] = await database.db
      .select()
      .from(storytellerPublication)
      .where(
        eq(storytellerPublication.generationId, accepted.generationId),
      );
    assert.equal(publicationAfter.state, 'published');

    const after = await accepted.stories.read({
      ownerId: accepted.ownerId,
      storyId: accepted.storyId,
    });
    assert.ok(after.campaign?.offer);
  });
});

test('ENG03-narrow: duplicate materialization wakes promote exactly once', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-dup-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);

    await Promise.all([
      accepted.stories.prepareCampaignConsequence(accepted.operationId),
      accepted.stories.prepareCampaignConsequence(accepted.operationId),
      accepted.stories.prepareCampaignConsequence(accepted.operationId),
    ]);

    const captures = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, accepted.operationId));
    assert.equal(captures.length, 1);
    assert.equal(captures[0].captureId, accepted.generationId);
    assert.equal(captures[0].state, 'ready');

    const generations = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(generations.length, 1);
    assert.equal(generations[0].kind, storytellerKind);

    const resolutions = await database.db
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.generationId, accepted.generationId));
    assert.equal(resolutions.length, 1);
  });
});

test('ENG03-narrow: missing CAS holds capture without fabricating a task', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-missing-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);

    const [capture] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));
    const frozen = structuredClone(capture.capture);
    const casPassage = frozen.sourcePassages.find((p) => p.storage === 'cas');
    assert.ok(casPassage, 'seeded story should have CAS passage evidence');
    casPassage.contentHash = 'a'.repeat(64);
    const parsed = contextCaptureV1Schema.parse(frozen);
    await database.db
      .update(storytellerContextCapture)
      .set({
        capture: parsed,
        captureSha256: hashContextCapture(parsed),
      })
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));

    await accepted.stories.prepareCampaignConsequence(accepted.operationId);
    await accepted.stories.prepareCampaignConsequence(accepted.operationId);
    await accepted.stories.prepareCampaignConsequence(accepted.operationId);

    const [after] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));
    assert.ok(
      after.state === 'held' || after.state === 'captured' || after.state === 'blocked',
      `unexpected state ${after.state}`,
    );
    assert.notEqual(after.state, 'ready');

    const [gen] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(gen.kind, storytellerContextCaptureKind);
  });
});

test('ENG03-narrow: CAS delay no longer scales action-lock hold (0/250/2000)', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03n-baseline-'));
    const storage = new LocalDocumentStore(root);
    const matrix = [0, 250, 2000];
    const observations = [];

    for (const delayMs of matrix) {
      for (let i = 0; i < 2; i += 1) {
        const delayed = createEng03DelayedDocumentStore(storage, { delayMs });
        const { ownerId, storyId } = await seedDocumentedStory(
          database,
          storage,
        );
        const stories = createStories(database, { documentStore: delayed });
        const before = await stories.read({ ownerId, storyId });
        const operationId = randomUUID();
        const started = performance.now();
        await stories.campaignAction({
          ownerId,
          storyId,
          operationId,
          body: {
            expectedRevision: before.revision,
            offerId: before.campaign.offer.id,
            path: ['persuade-guard'],
          },
        });
        const actionHoldMs = performance.now() - started;

        const other = await seedDocumentedStory(database, storage);
        const unrelatedStart = performance.now();
        await database.db.transaction(async (tx) => {
          await lockOwnedStory(tx, {
            ownerId: other.ownerId,
            storyId: other.storyId,
          });
        });
        const unrelatedLockMs = performance.now() - unrelatedStart;
        observations.push({ delayMs, actionHoldMs, unrelatedLockMs });
      }
    }

    const byDelay = Object.fromEntries(
      matrix.map((delayMs) => {
        const rows = observations.filter((row) => row.delayMs === delayMs);
        return [
          delayMs,
          {
            actionHoldMedian: median(rows.map((r) => r.actionHoldMs)),
            unrelatedMedian: median(rows.map((r) => r.unrelatedLockMs)),
          },
        ];
      }),
    );

    // New path: injected CAS delay must not appear in action hold.
    assert.ok(
      byDelay[2000].actionHoldMedian < 500,
      `2000ms inject still held action ${byDelay[2000].actionHoldMedian}ms`,
    );
    assert.ok(
      byDelay[2000].actionHoldMedian < byDelay[0].actionHoldMedian + 300,
      `action hold grew with CAS delay: 0=${byDelay[0].actionHoldMedian} 2000=${byDelay[2000].actionHoldMedian}`,
    );
    assert.ok(
      byDelay[2000].unrelatedMedian < 200,
      `unrelated lock ${byDelay[2000].unrelatedMedian}ms`,
    );

    // Keep raw traces for evidence.
    console.log(
      JSON.stringify({
        eng03NarrowLockBaseline: byDelay,
        observations,
      }),
    );
  });
});
