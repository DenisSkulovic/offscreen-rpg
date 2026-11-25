import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, gameActionExecution } from '@offscreen/story-persistence/campaign';
import { generation } from '@offscreen/story-persistence/generations';
import { outbox } from '@offscreen/db/outbox-schema';
import { storyPassage, storySceneCheckpoint } from '@offscreen/story-persistence/stories';
import {
  storytellerWriterMission,
} from '@offscreen/story-persistence/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { offerSchema } from '@offscreen/game/offers';
import { writerSceneProposalV3Schema } from '@offscreen/storyteller/tasks';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { admitCampaignActionInTransaction } from '../dist/campaign/actions.js';
import {
  createCampaignActionExecutions,
  settleActionExecution,
} from '../dist/campaign/action-executions.js';
import { campaignOffer, saveOfferPlans } from '../dist/campaign/persistence.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { createStoryInitialization } from '../dist/stories/initialization.js';
import { lockStoryById } from '../dist/stories/persistence.js';
import { StoryError } from '../dist/stories/errors.js';
import {
  WRITER_SCENE_WAKE_TOPIC,
  publishAcceptedWriterScene,
  scheduleWriterContinuation,
} from '../dist/storyteller/index.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../lab-support/dist/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const planA = narrativeIntentPlanSchema.parse({
  kind: 'narrative-intent.v1',
  key: 'option-a',
  label: 'Watch the road',
  intention: 'Study who passes on the road.',
  risk: 'You may be seen watching.',
  fictionalDurationSeconds: 1,
  effects: [],
});

const planB = narrativeIntentPlanSchema.parse({
  kind: 'narrative-intent.v1',
  key: 'option-b',
  label: 'Check the pack',
  intention: 'Rummage through the pack again.',
  risk: 'Something might be missing.',
  fictionalDurationSeconds: 1,
  effects: [],
});

function openingOffer(offerId) {
  return offerSchema.parse({
    id: offerId,
    nodes: [
      {
        id: planA.key,
        parent: null,
        label: planA.label,
        description: planA.intention,
        action: {
          kind: 'attempt',
          timing: { kind: 'finite', fictionalSeconds: planA.fictionalDurationSeconds },
        },
      },
    ],
  });
}

function choiceInteraction(optionIds) {
  return {
    kind: 'choice.v1',
    prompt: 'What next?',
    options: optionIds.map((id) => ({
      id,
      label: id === planA.key ? planA.label : planB.label,
    })),
  };
}

function sceneProposal(sequence, optionIds, overrides = {}) {
  return writerSceneProposalV3Schema.parse({
    version: 3,
    summary: `Scene ${sequence} after the pause.`,
    stagedObjectHashes: [],
    sourceEvidence: overrides.sourceEvidence ?? [],
    scene: {
      content: {
        version: 1,
        title: `Scene ${sequence}`,
        paragraphs: [`Scene ${sequence} unfolds.`],
      },
      interaction: choiceInteraction(optionIds),
      authoredIntents: optionIds.map((id) =>
        id === planA.key ? planA : planB,
      ),
    },
    documentChanges: overrides.documentChanges ?? [],
  });
}

const SHA_PLACEHOLDER = 'a'.repeat(64);
const SHA_WRONG_ROOT = 'f'.repeat(64);

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
    [ownerId, 'WriterScene', `${ownerId}@example.test`],
  );
}

async function seedWriterGrant(database, ownerId) {
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  await database.db.$client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 250000, false, now())`,
    [accountId],
  );
  await database.db.$client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 250000, 4, true)`,
    [runRowId, accountId],
  );
  await database.db.$client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1, 1, $2, $3, $4, $5::jsonb, '[]'::jsonb, true, null, true, null, $6, 'prepaid', $7, $8)`,
    [
      grantId,
      ownerId,
      accountId,
      runRowId,
      JSON.stringify({
        schemaVersion: 1,
        id: 'writer-scene-entitlement.v1',
        revision: 1,
        enabled: true,
        allowedRoutes: ['writer:scene'],
        defaultRoute: 'writer:scene',
        fundingModes: ['prepaid'],
        recovery: 'explicit-resume',
        limits: {
          maxInputTokensPerRequest: 8000,
          maxSerializedBytesPerRequest: 65536,
          maxGeneratedTokensPerRequest: 2000,
          maxReasoningTokensPerRequest: 0,
          maxInputTokensPerOperation: 8000,
          maxGeneratedTokensPerOperation: 2000,
          maxModelRoundsPerOperation: 4,
          maxReadsPerOperation: 0,
          maxRetainedReadBytes: 0,
          maxMicrousdPerOperation: '250000',
          maxInFlightDispatches: 1,
          maxBackgroundJobsPerWindow: 0,
        },
        windows: [],
      }),
      'writer:scene',
      'op-writer-scene',
      'approval-writer-scene',
    ],
  );
}

async function seedDocumentStory(database, store, ownerId) {
  const storyId = randomUUID();
  const offerId = randomUUID();
  const initializeStory = createStoryInitialization(database, store);
  await initializeStory({
    ownerId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      premise: {
        title: 'Writer continuation',
        premise: 'A road near Seyda Neen.',
        storytellingDirection: 'Keep it grounded.',
      },
      storyteller: profile,
      execution: offlineExecution,
      usagePolicy: null,
      items: [],
      content: {
        version: 1,
        title: 'Scene 1',
        paragraphs: ['Dust hangs over the road.'],
      },
      interaction: choiceInteraction([planA.key]),
    },
  });
  await database.db.transaction(async (tx) => {
    await initializeCampaign(tx, storyId, profile, {
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
    });
    const current = await lockStoryById(tx, storyId);
    const offer = openingOffer(offerId);
    await saveOfferPlans(tx, storyId, current.revision, offerId, [planA]);
    await tx
      .update(campaign)
      .set({
        offer,
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: { kind: 'selected', actionKeys: [planA.key] },
          preparedPlans: [],
        },
      })
      .where(eq(campaign.storyId, storyId));
  });
  return { ownerId, storyId, offerId };
}

async function admitChoice(
  database,
  storyId,
  offerId,
  actionKey,
  operationId = randomUUID(),
) {
  await database.db.transaction(async (tx) => {
    const current = await lockStoryById(tx, storyId);
    await admitCampaignActionInTransaction(
      tx,
      current,
      {
        operationId,
        expectedRevision: current.revision,
        offerId,
        path: [actionKey],
      },
      { kind: 'player' },
    );
  });
  return operationId;
}

async function executionCount(database, storyId) {
  const rows = await database.db
    .select()
    .from(gameActionExecution)
    .where(eq(gameActionExecution.storyId, storyId));
  return rows.length;
}

async function passageSequences(database, storyId) {
  const rows = await database.db
    .select({ sequence: storyPassage.sequence })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  return rows.map((row) => row.sequence).sort((a, b) => a - b);
}

async function missionCaptureBaseRootHash(database, missionId) {
  const [mission] = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId));
  assert.ok(mission);
  const [generationRow] = await database.db
    .select()
    .from(generation)
    .where(eq(generation.id, mission.generationId));
  assert.ok(generationRow?.input?.writerMissionCapture?.sceneScope?.baseRootHash);
  return generationRow.input.writerMissionCapture.sceneScope.baseRootHash;
}

async function settleExecution(database, storyId, operationId, admission) {
  await database.db.transaction(async (tx) => {
    const current = await lockStoryById(tx, storyId);
    const [execution] = await tx
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.operationId, operationId));
    assert.ok(execution);
    const [state] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    assert.ok(state);
    const now = Date.now() + 60_000;
    await settleActionExecution(tx, current, state, execution, now, undefined, admission);
  });
}

async function advanceExecution(database, operationId, admission) {
  const executions = createCampaignActionExecutions(database, undefined, {
    writerContinuationAdmission: admission,
  });
  await executions.advance(operationId);
}

async function markMissionReady(database, storyId) {
  const missions = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.storyId, storyId));
  const mission = missions.at(-1);
  assert.ok(mission);
  await database.db
    .update(storytellerWriterMission)
    .set({ state: 'proposal-ready' })
    .where(eq(storytellerWriterMission.id, mission.id));
  return mission.id;
}

test('writer continuation schedules once and publishes scenes 2 and 3', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);

    const operationA = await admitChoice(database, storyId, offerId, planA.key);
    await settleExecution(database, storyId, operationA);

    const missionsAfterA = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.storyId, storyId));
    assert.equal(missionsAfterA.length, 1);
    const notices = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, WRITER_SCENE_WAKE_TOPIC));
    assert.equal(notices.length, 1);

    const missionId2 = await markMissionReady(database, storyId);
    await database.db.transaction(async (tx) => {
      await publishAcceptedWriterScene(
        tx,
        store,
        {
          missionId: missionId2,
          proposal: sceneProposal(2, [planA.key, planB.key]),
        },
      );
    });

    const current = await database.db
      .select()
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    assert.deepEqual(
      current.map((row) => row.sequence).sort((a, b) => a - b),
      [1, 2],
    );

    const [campaignRow] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    const publishedOffer = campaignOffer(campaignRow);
    const operationB = await admitChoice(
      database,
      storyId,
      publishedOffer.id,
      planB.key,
    );
    await settleExecution(database, storyId, operationB);
    const missionsAfterB = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.storyId, storyId));
    assert.equal(missionsAfterB.length, 2);

    const missionId3 = await markMissionReady(database, storyId);
    await database.db.transaction(async (tx) => {
      await publishAcceptedWriterScene(tx, store, {
        missionId: missionId3,
        proposal: sceneProposal(3, [planA.key]),
      });
    });

    const sequences = await database.db
      .select({ sequence: storyPassage.sequence })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    assert.deepEqual(
      sequences.map((row) => row.sequence).sort((a, b) => a - b),
      [1, 2, 3],
    );

    await database.db.transaction(async (tx) => {
      const currentStory = await lockStoryById(tx, storyId);
      const [state] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, storyId));
      const [checkpoint] = await tx
        .select()
        .from(storySceneCheckpoint)
        .where(
          and(
            eq(storySceneCheckpoint.storyId, storyId),
            eq(storySceneCheckpoint.sceneSequence, currentStory.revision),
          ),
        );
      const second = await scheduleWriterContinuation(tx, {
        storyId,
        operationId: operationA,
        ownerId,
        basePassageId: checkpoint.passageId,
        baseSceneSequence: checkpoint.sceneSequence,
        baseCheckpointHash: checkpoint.checkpointHash,
        baseRootHash: currentStory.documentRootHash,
        baseRootRevision: currentStory.documentRootRevision,
        baseNarrativeRevision: currentStory.revision,
        baseCampaignStateRevision: state.settingsRevision,
        controllingIntentOrReceiptId: operationA,
      });
      assert.equal(second.replayed, true);
    });

    const missionCount = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.storyId, storyId));
    assert.equal(missionCount.length, 2);
  });
});

test('writer scene publication rejects stale base checkpoint hash', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-stale-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const operationA = await admitChoice(database, storyId, offerId, planA.key);
    await settleExecution(database, storyId, operationA);
    const missionId = await markMissionReady(database, storyId);
  const [mission] = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.id, missionId));
    const [generationRow] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, mission.generationId));
    const input = { ...(generationRow.input ?? {}) };
    input.writerMissionCapture = {
      ...input.writerMissionCapture,
      sceneScope: {
        ...input.writerMissionCapture.sceneScope,
        baseCheckpointHash: '0'.repeat(64),
      },
    };
    await database.db
      .update(generation)
      .set({ input })
      .where(eq(generation.id, mission.generationId));
    await assert.rejects(
      database.db.transaction((tx) =>
        publishAcceptedWriterScene(tx, store, {
          missionId,
          proposal: sceneProposal(2, [planA.key, planB.key]),
        }),
      ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'writer_scene_base_stale',
    );
  });
});

test('writer continuation admit replays duplicate operationId once', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-dup-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const operationId = randomUUID();
    await admitChoice(database, storyId, offerId, planA.key, operationId);
    await admitChoice(database, storyId, offerId, planA.key, operationId);
    const rows = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].operationId, operationId);
  });
});

test('writer continuation admit rejects stale offer id', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-offer-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const before = await executionCount(database, storyId);
    await assert.rejects(
      admitChoice(database, storyId, randomUUID(), planA.key),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
    assert.equal(await executionCount(database, storyId), before);
  });
});

test('writer scene publication rejects forged asserted source evidence', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-forged-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const operationA = await admitChoice(database, storyId, offerId, planA.key);
    await settleExecution(database, storyId, operationA);
    const missionId = await markMissionReady(database, storyId);
    await missionCaptureBaseRootHash(database, missionId);
    await assert.rejects(
      database.db.transaction((tx) =>
        publishAcceptedWriterScene(tx, store, {
          missionId,
          proposal: sceneProposal(2, [planA.key, planB.key], {
            sourceEvidence: [
              {
                rootHash: SHA_WRONG_ROOT,
                objectHash: SHA_PLACEHOLDER,
                section: 'Forged ledger',
                assertedAsFact: true,
              },
            ],
          }),
        }),
      ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'writer_scene_source_forged',
    );
    assert.deepEqual(await passageSequences(database, storyId), [1]);
  });
});

test('writer scene publication rolls back passage on stale canon adopt', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-rollback-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const operationA = await admitChoice(database, storyId, offerId, planA.key);
    await settleExecution(database, storyId, operationA);
    const missionId = await markMissionReady(database, storyId);
    const sequencesBefore = await passageSequences(database, storyId);
    assert.deepEqual(sequencesBefore, [1]);
    await assert.rejects(
      database.db.transaction((tx) =>
        publishAcceptedWriterScene(tx, store, {
          missionId,
          proposal: sceneProposal(2, [planA.key, planB.key], {
            documentChanges: [
              {
                documentId: randomUUID(),
                path: 'world/lore/forged',
                stagedObjectHash: SHA_PLACEHOLDER,
                changeKind: 'adopt',
                expectedBaseObjectHash: 'c'.repeat(64),
                visibility: 'public',
                authority: 'canon',
                sourceEvidenceRefs: [],
              },
            ],
          }),
        }),
      ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'writer_scene_document_base_stale',
    );
    assert.deepEqual(await passageSequences(database, storyId), sequencesBefore);
  });
});

test('provider continuation admission persists writer.scene.v1 and policy pin', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-provider-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const operationA = await admitChoice(database, storyId, offerId, planA.key);
    const providerAdmission = {
      mode: 'provider',
      model: 'test/wr11-model',
      policyVersion: 'writer-round-lab.v2',
    };
    await advanceExecution(database, operationA, providerAdmission);

    const [mission] = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.storyId, storyId));
    assert.ok(mission);
    const [notice] = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.id, mission.id));
    assert.equal(notice?.topic, WRITER_SCENE_WAKE_TOPIC);
    const [generationRow] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, mission.generationId));
    const capture = generationRow?.input?.writerMissionCapture;
    assert.equal(capture?.modelSelection?.model, 'test/wr11-model');
    assert.deepEqual(capture?.providerPolicy, {
      version: 'writer-round-lab.v2',
      model: 'test/wr11-model',
    });
  });
});

test('writer continuation replay keeps persisted capture after admission change', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'writer-scene-replay-admission-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedDocumentStory(database, store, ownerId);
    const operationA = await admitChoice(database, storyId, offerId, planA.key);
    await advanceExecution(database, operationA, {
      mode: 'provider',
      model: 'test/wr11-original',
      policyVersion: 'writer-round-lab.v2',
    });

    const [mission] = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.storyId, storyId));
    const [generationBefore] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, mission.generationId));
    const originalCapture = generationBefore?.input?.writerMissionCapture;

    await database.db.transaction(async (tx) => {
      const currentStory = await lockStoryById(tx, storyId);
      const [state] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, storyId));
      const [checkpoint] = await tx
        .select()
        .from(storySceneCheckpoint)
        .where(
          and(
            eq(storySceneCheckpoint.storyId, storyId),
            eq(storySceneCheckpoint.sceneSequence, currentStory.revision),
          ),
        );
      const replayed = await scheduleWriterContinuation(tx, {
        storyId,
        operationId: operationA,
        ownerId,
        basePassageId: checkpoint.passageId,
        baseSceneSequence: checkpoint.sceneSequence,
        baseCheckpointHash: checkpoint.checkpointHash,
        baseRootHash: currentStory.documentRootHash,
        baseRootRevision: currentStory.documentRootRevision,
        baseNarrativeRevision: currentStory.revision,
        baseCampaignStateRevision: state.settingsRevision,
        controllingIntentOrReceiptId: operationA,
        admission: {
          mode: 'provider',
          model: 'test/wr11-replacement',
          policyVersion: 'writer-round-lab.v99',
        },
      });
      assert.equal(replayed.replayed, true);
      assert.equal(replayed.generationId, mission.generationId);
    });

    const [generationAfter] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, mission.generationId));
    assert.deepEqual(
      generationAfter?.input?.writerMissionCapture,
      originalCapture,
    );
    assert.equal(
      generationAfter?.input?.writerMissionCapture?.modelSelection?.model,
      'test/wr11-original',
    );
  });
});

test('v3 proposal with choice and zero intents fails schema validation', () => {
  const result = writerSceneProposalV3Schema.safeParse({
    version: 3,
    summary: 'Invalid continuation.',
    stagedObjectHashes: [],
    sourceEvidence: [],
    scene: {
      content: {
        version: 1,
        title: 'Broken',
        paragraphs: ['No intents.'],
      },
      interaction: choiceInteraction([planA.key]),
      authoredIntents: [],
    },
    documentChanges: [],
  });
  assert.equal(result.success, false);
});