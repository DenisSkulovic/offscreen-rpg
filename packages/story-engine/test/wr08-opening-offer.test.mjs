import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/story-interface/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, gameOffer } from '@offscreen/db/campaign-schema';
import { hashCanonicalJson, LocalDocumentStore, stableNamespacedDocumentId } from '@offscreen/documents';
import { storyLaunch } from '@offscreen/db/launch-schema';
import {
  story,
  storyDocumentCommit,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import { offerSchema } from '@offscreen/game/offers';
import {
  admitLaunchWriterMission,
  publishLaunchOpeningScene,
} from '../dist/storyteller/index.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../application/dist/developer-tools/index.js';

const LIBRARY_ROOT_HASH = 'c'.repeat(64);
const SCRIPTED_OPENING_SCENE_CAS = hashCanonicalJson({ kind: 'scripted-opening-scene' });

const BAH_PASSAGE = {
  version: 1,
  title: 'BAH',
  paragraphs: ['A bashful moon watches.'],
};

function entitlementProfile(revision) {
  return {
    schemaVersion: 1,
    id: 'wr08-opening-entitlement.v1',
    revision,
    enabled: true,
    allowedRoutes: ['writer:launch'],
    defaultRoute: 'writer:launch',
    fundingModes: ['prepaid'],
    recovery: 'explicit-resume',
    limits: {
      maxInputTokensPerRequest: 8_000,
      maxSerializedBytesPerRequest: 65_536,
      maxGeneratedTokensPerRequest: 2_000,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 8_000,
      maxGeneratedTokensPerOperation: 2_000,
      maxModelRoundsPerOperation: 4,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '250000',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
}

async function withDisposable(run) {
  const runId = randomUUID();
  let provisioned;
  try {
    provisioned = await provisionDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
      applyFullMigrations: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'unknown');
    test.diagnostic(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: provisioned.connectionString,
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

async function insertUser(database, userId) {
  await database.db.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${userId}, ${'WR08-T03a'}, ${`${userId}@example.test`}, true, now(), now())`,
  );
}

async function seedLaunchGrant(database, userId) {
  const client = database.db.$client;
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 250000, false, now())`,
    [accountId],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 250000, 4, true)`,
    [runRowId, accountId],
  );
  await client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, '[]'::jsonb, true, null, true, null, $7, 'prepaid', $8, $9)`,
    [
      grantId,
      1,
      userId,
      accountId,
      runRowId,
      JSON.stringify(entitlementProfile(1)),
      'writer:launch',
      'op-wr08-t03a',
      'approval-wr08-t03a',
    ],
  );
}

async function insertPendingLaunch(database, userId) {
  const browserOperationId = randomUUID();
  const request = storyLaunchRequestSchema.parse({
    operationId: browserOperationId,
    source: { kind: 'prompt', prompt: 'WR08 T03a opening offer.' },
  });
  const reservedStoryId = randomUUID();
  const reservedFirstPassageId = randomUUID();
  await database.db.insert(storyLaunch).values({
    ownerId: userId,
    operationId: browserOperationId,
    requestHash: hashCanonicalJson(request),
    request,
    reservedStoryId,
    reservedFirstPassageId,
    state: 'pending',
    generationId: null,
    sceneSequence: null,
    publicReason: null,
    uncertainExplanation: null,
  });
  return { browserOperationId, reservedStoryId, reservedFirstPassageId };
}

async function driveLaunchComposing(database, generationId) {
  const missions = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.generationId, generationId));
  const mission = missions[0];
  assert.ok(mission);
  await database.db
    .update(storytellerWriterStep)
    .set({
      state: 'result-settled',
      resultCasHash: SCRIPTED_OPENING_SCENE_CAS,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storytellerWriterStep.missionId, mission.id),
        eq(storytellerWriterStep.contextId, mission.id),
        eq(storytellerWriterStep.ordinal, 1),
      ),
    );
  await database.db
    .update(storytellerWriterMission)
    .set({ state: 'proposal-ready', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, mission.id));
  await database.db
    .update(storyLaunch)
    .set({ state: 'composing', updatedAt: sql`clock_timestamp()` })
    .where(eq(storyLaunch.generationId, generationId));
}

function openingProposalV2(overrides = {}) {
  return {
    version: 2,
    summary: 'This summary must not become passage content.',
    stagedObjectHashes: [],
    sourceEvidence: [],
    scene: {
      content: BAH_PASSAGE,
      interaction: null,
    },
    ...overrides,
  };
}

function expectedOfferId(reservedStoryId) {
  return stableNamespacedDocumentId('launch-choice', reservedStoryId, 'offer');
}

async function countStories(database, ownerId) {
  const result = await database.db.execute(
    sql`select count(*)::text as count from story where owner_id = ${ownerId}`,
  );
  const row = result.rows[0];
  return Number(row?.count ?? '0');
}

test('WR08 T03a: launch opening publishes one scripted observe offer', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'wr08-t03a-pub-'));
    const storage = new LocalDocumentStore(root);
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId, reservedFirstPassageId } =
      await insertPendingLaunch(database, userId);
    const admitted = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    await driveLaunchComposing(database, admitted.generationId);

    const offerId = expectedOfferId(reservedStoryId);
    const first = await publishLaunchOpeningScene(database, storage, {
      ownerId: userId,
      operationId: browserOperationId,
      proposal: openingProposalV2(),
    });
    assert.equal(first.replayed, false);
    assert.equal(first.storyId, reservedStoryId);
    assert.equal(first.passageId, reservedFirstPassageId);
    assert.match(first.checkpointHash, /^[0-9a-f]{64}$/);

    const [campaignRow] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, reservedStoryId));
    assert.equal(campaignRow?.character, null);
    const parsedOffer = offerSchema.parse({
      id: campaignRow?.offer?.id,
      nodes: campaignRow?.offer?.nodes,
    });
    assert.equal(parsedOffer.id, offerId);
    assert.equal(parsedOffer.nodes.length, 1);
    assert.equal(parsedOffer.nodes[0]?.id, 'observe');
    assert.equal(
      campaignRow?.situationAuthorization?.activityAccess?.actionKeys?.[0],
      'observe',
    );

    const [storyRow] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, reservedStoryId));
    const [commit] = await database.db
      .select()
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, reservedStoryId));
    assert.equal(storyRow?.documentRootHash, commit?.rootHash);
    assert.ok(commit?.rootHash);
    const [passage] = await database.db
      .select()
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, reservedStoryId),
          eq(storyPassage.sequence, 1),
        ),
      );
    assert.ok(passage?.contentDocumentHash);
    const stored = await storage.readSourcePassage(passage.contentDocumentHash);
    assert.equal(stored.content.paragraphs[0], BAH_PASSAGE.paragraphs[0]);

    const checkpoints = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, reservedStoryId));
    assert.equal(checkpoints.length, 1);
    assert.equal(checkpoints[0]?.stateSchemaVersion, 2);

    const offers = await database.db
      .select()
      .from(gameOffer)
      .where(eq(gameOffer.storyId, reservedStoryId));
    assert.equal(offers.length, 1);
    assert.equal(offers[0]?.id, offerId);

    const second = await publishLaunchOpeningScene(database, storage, {
      ownerId: userId,
      operationId: browserOperationId,
      proposal: openingProposalV2(),
    });
    assert.equal(second.replayed, true);
    assert.equal(second.checkpointHash, first.checkpointHash);
    assert.equal(
      (
        await database.db
          .select()
          .from(gameOffer)
          .where(eq(gameOffer.storyId, reservedStoryId))
      ).length,
      1,
    );
  });
});

test('WR08 T03a negative: v2 choice interaction rejected before insert', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'wr08-t03a-choice-'));
    const storage = new LocalDocumentStore(root);
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId } = await insertPendingLaunch(database, userId);
    const admitted = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    await driveLaunchComposing(database, admitted.generationId);

    await assert.rejects(
      () =>
        publishLaunchOpeningScene(database, storage, {
          ownerId: userId,
          operationId: browserOperationId,
          proposal: openingProposalV2({
            scene: {
              content: BAH_PASSAGE,
              interaction: {
                kind: 'choice.v1',
                prompt: 'Where?',
                options: [{ id: 'stay', label: 'Stay' }],
              },
            },
          }),
        }),
      /launch_interaction_unsupported/,
    );

    assert.equal(await countStories(database, userId), 0);
    const offers = await database.db.select().from(gameOffer);
    assert.equal(offers.length, 0);
    const checkpoints = await database.db.select().from(storySceneCheckpoint);
    assert.equal(checkpoints.length, 0);
  });
});

test('WR08 T03a negative: stale source leaves no partial offer or selector', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'wr08-t03a-stale-'));
    const storage = new LocalDocumentStore(root);
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId } = await insertPendingLaunch(
      database,
      userId,
    );
    const admitted = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    await driveLaunchComposing(database, admitted.generationId);

    await database.db
      .update(storytellerWriterMission)
      .set({ libraryRootHash: 'd'.repeat(64) })
      .where(eq(storytellerWriterMission.generationId, admitted.generationId));

    await assert.rejects(
      () =>
        publishLaunchOpeningScene(database, storage, {
          ownerId: userId,
          operationId: browserOperationId,
          proposal: openingProposalV2(),
        }),
      /launch_source_mismatch/,
    );

    assert.equal(await countStories(database, userId), 0);
    assert.equal(
      (
        await database.db
          .select()
          .from(gameOffer)
          .where(eq(gameOffer.storyId, reservedStoryId))
      ).length,
      0,
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(storySceneCheckpoint)
          .where(eq(storySceneCheckpoint.storyId, reservedStoryId))
      ).length,
      0,
    );
  });
});