import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { gameActionExecution } from '@offscreen/db/campaign-schema';
import {
  storytellerContextCapture,
  storytellerContextCaptureRearm,
} from '@offscreen/db/storyteller-schema';
import { LocalDocumentStore } from '@offscreen/documents';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { stageStoryBootstrapDocuments } from '../../../packages/story-engine/dist/stories/passage-documents.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import {
  contextCaptureV1Schema,
  hashContextCapture,
  storytellerContextCaptureKind,
} from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import { rearmContextCapture } from '../../../packages/story-engine/dist/storyteller/capture-rearm.js';
import { storytellerKind } from '../../../packages/story-engine/dist/storyteller/records.js';
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
    [ownerId, 'ENG03-C1-R', `${ownerId}@example.test`],
  );
}

async function seedDocumentedStory(database, storage) {
  const ownerId = `eng03c1r-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor recovery probe',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor recovery probe',
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

async function acceptPendingAction(database, storage) {
  const { ownerId, storyId } = await seedDocumentedStory(database, storage);
  const stories = createStories(database, { documentStore: storage });
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

async function exhaustCaptureWithMissingCas(database, accepted) {
  const [capture] = await database.db
    .select()
    .from(storytellerContextCapture)
    .where(eq(storytellerContextCapture.captureId, accepted.generationId));
  const originalCapture = structuredClone(capture.capture);
  const originalSha = capture.captureSha256;
  const frozen = structuredClone(capture.capture);
  const casPassage = frozen.sourcePassages.find((p) => p.storage === 'cas');
  assert.ok(casPassage);
  casPassage.contentHash = 'b'.repeat(64);
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
  assert.equal(after.state, 'held');
  assert.equal(after.materializationAttempts, 3);
  return { held: after, originalCapture, originalSha };
}

test('ENG03-C1-R live: held provisional snapshot canRetry=false and operator blocker', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1r-read-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);
    await exhaustCaptureWithMissingCas(database, accepted);

    const snapshot = await accepted.stories.read({
      ownerId: accepted.ownerId,
      storyId: accepted.storyId,
    });
    assert.ok(snapshot.resolution);
    assert.equal(snapshot.resolution.canRetry, false);
    assert.deepEqual(snapshot.resolution.blocker, {
      kind: 'generation',
      recovery: 'operator',
    });
    assert.equal(snapshot.resolution.reason, null);

    const [gen] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(gen.kind, storytellerContextCaptureKind);
  });
});

test('ENG03-C1-R live: rearm same G once; duplicate rearmId idempotent; second epoch denied', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1r-rearm-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);
    const { originalCapture, originalSha } = await exhaustCaptureWithMissingCas(
      database,
      accepted,
    );

    // Restore frozen CAS frontier so post-rearm materialization can promote.
    const restored = contextCaptureV1Schema.parse(originalCapture);
    assert.equal(hashContextCapture(restored), originalSha);
    await database.db
      .update(storytellerContextCapture)
      .set({
        capture: restored,
        captureSha256: originalSha,
      })
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));

    const rearmId = randomUUID();
    const operatorId = `repair-operator:${randomUUID()}`;
    const first = await rearmContextCapture(database, {
      operatorId,
      storyId: accepted.storyId,
      captureId: accepted.generationId,
      rearmId,
      reasonCode: 'storage-restored',
    });
    assert.equal(first.outcome, 'rearmed');
    assert.equal(first.operationId, accepted.operationId);

    const [afterRearm] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));
    assert.equal(afterRearm.state, 'captured');
    assert.equal(afterRearm.materializationAttempts, 0);
    assert.equal(afterRearm.rearmEpoch, 1);
    assert.equal(afterRearm.captureSha256, originalSha);

    const duplicate = await rearmContextCapture(database, {
      operatorId,
      storyId: accepted.storyId,
      captureId: accepted.generationId,
      rearmId,
      reasonCode: 'storage-restored',
    });
    assert.equal(duplicate.outcome, 'idempotent');

    const rearms = await database.db
      .select()
      .from(storytellerContextCaptureRearm)
      .where(eq(storytellerContextCaptureRearm.captureId, accepted.generationId));
    assert.equal(rearms.length, 1);

    await accepted.stories.prepareCampaignConsequence(accepted.operationId);
    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, accepted.generationId));
    assert.equal(promoted.kind, storytellerKind);

    await assert.rejects(
      () =>
        rearmContextCapture(database, {
          operatorId,
          storyId: accepted.storyId,
          captureId: accepted.generationId,
          rearmId: randomUUID(),
          reasonCode: 'transient-infra-recovered',
        }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
  });
});

test('ENG03-C1-R live: live lease and non-exhausted capture deny rearm', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1r-deny-'));
    const storage = new LocalDocumentStore(root);
    const accepted = await acceptPendingAction(database, storage);

    await assert.rejects(
      () =>
        rearmContextCapture(database, {
          operatorId: 'repair-operator:deny',
          storyId: accepted.storyId,
          captureId: accepted.generationId,
          rearmId: randomUUID(),
          reasonCode: 'storage-restored',
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'rearm_ineligible_state',
    );

    await database.db
      .update(storytellerContextCapture)
      .set({
        state: 'materializing',
        materializationAttempts: 3,
        leaseId: randomUUID(),
        leaseExpiresAt: new Date(Date.now() + 60_000),
      })
      .where(eq(storytellerContextCapture.captureId, accepted.generationId));

    await assert.rejects(
      () =>
        rearmContextCapture(database, {
          operatorId: 'repair-operator:deny',
          storyId: accepted.storyId,
          captureId: accepted.generationId,
          rearmId: randomUUID(),
          reasonCode: 'storage-restored',
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'lease_live',
    );
  });
});
