import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/story-interface/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { hashCanonicalJson, LocalDocumentStore } from '@offscreen/documents';
import { storyLaunch } from '@offscreen/story-persistence/launch';
import { story, storyPassage } from '@offscreen/story-persistence/stories';
import { generation } from '@offscreen/story-persistence/generations';
import { outbox } from '@offscreen/outbox/schema';
import { storytellerWriterMission } from '@offscreen/story-persistence/storyteller';
import { createPinnedLibraryNavigation } from '@offscreen/story-engine/storyteller/library-navigation';
import {
  WRITER_MANDATORY_TOOL_NAMES,
  writerMissionCaptureV2OpeningSchema,
  writerOpeningSceneProposalV2Schema,
} from '@offscreen/storyteller/tasks';
import { StoryError } from '@offscreen/story-engine/stories';
import { createGameAuthoritySeam } from '../../../apps/game-authority/dist/src/application.js';
import {
  acceptWriterSceneProposal,
  admitLaunchWriterMission,
  LAUNCH_WAKE_TOPIC,
  stageLaunchPromptLibrary,
  WriterSceneProposalError,
} from '../../../packages/story-engine/dist/storyteller/index.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';

const LAUNCH_SCRIPTED_PROFILE_HASH = createHash('sha256')
  .update('launch-scripted-profile.v1', 'utf8')
  .digest('hex');

// choice.v1 opening rejection is covered by
// packages/application/test/wr07b-launch-publication.integration.test.mjs
// ("WR07B T04: choice.v1 opening interaction fails closed before story insert").

function entitlementProfile(revision) {
  return {
    schemaVersion: 1,
    id: 'wr07b-launch-entitlement.v1',
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
        values (${userId}, ${'WR07B-T06'}, ${`${userId}@example.test`}, true, now(), now())`,
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
      'op-wr07b-t06',
      'approval-wr07b-t06',
    ],
  );
}

async function countStories(database, ownerId) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.ownerId, ownerId));
  return rows.length;
}

function storageLibraryReader(storage) {
  return {
    readManifest: async () => {
      throw new Error('v1 manifest not supported for launch library');
    },
    readDocument: async (objectHash) => {
      const document = await storage.readDocument(objectHash);
      return { envelope: document.envelope, body: document.body };
    },
    readSourcePassage: async (objectHash) => {
      const passage = await storage.readSourcePassage(objectHash);
      return { envelope: passage.envelope, content: passage.content };
    },
    readLibraryRoot: (rootHash) => storage.readLibraryRoot(rootHash),
    readLibraryNode: (hash) => storage.readLibraryNode(hash),
  };
}

async function readStagedPromptBody(storage, storyId, libraryRootHash, libraryRootRevision) {
  const navigation = createPinnedLibraryNavigation({
    reader: storageLibraryReader(storage),
    storyId,
    rootHash: libraryRootHash,
    rootRevision: libraryRootRevision,
    authorize: async () => ({ privateDocuments: true }),
  });
  const page = await navigation.browse({ prefix: '', pageSize: 32 });
  const entry = page.entries.find((row) => row.path === 'STORY_PROMPT.md');
  assert.ok(entry, 'STORY_PROMPT.md must be staged in the launch library');
  const document = await storage.readDocument(entry.objectHash);
  return document.body;
}

function buildLaunchWriterCapture(input) {
  const captureBody = {
    version: 'writer-mission.v2',
    generationId: input.generationId,
    operationId: input.generationId,
    ownerId: input.ownerId,
    storyId: input.reservedStoryId,
    libraryRootHash: input.libraryRootHash,
    libraryRootRevision: input.libraryRootRevision,
    profileObjectHash: LAUNCH_SCRIPTED_PROFILE_HASH,
    skillObjectHashes: [],
    toolsAllowlist: [...WRITER_MANDATORY_TOOL_NAMES],
    sceneScope: {
      kind: 'opening',
      reservedStoryId: input.reservedStoryId,
      reservedFirstPassageId: input.reservedFirstPassageId,
    },
    modelSelection: {
      provider: 'openrouter',
      model: 'scripted-offline',
    },
    budgets: {
      maxModelRounds: 4,
      maxInputTokens: 8000,
      maxGeneratedTokens: 2000,
      maxMicrousd: '250000',
      deadlineMs: 120_000,
    },
  };
  const capturedRequestHash = hashCanonicalJson(captureBody);
  return writerMissionCaptureV2OpeningSchema.parse({
    ...captureBody,
    capturedRequestHash,
  });
}

function bahLaunchRequest(operationId) {
  return storyLaunchRequestSchema.parse({
    operationId,
    source: { kind: 'prompt', prompt: 'BAH' },
  });
}

test('WR07B T06: BAH putLaunch joins library, mission, wake, and scene 1', async () => {
  await withDisposable(async (database) => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'wr07b-t06-joined-'));
    const storage = new LocalDocumentStore(storageRoot);
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const operationId = randomUUID();
    const request = bahLaunchRequest(operationId);
    assert.equal(request.source.prompt, 'BAH');
    assert.equal('interaction' in request, false);

    const first = await seam.putLaunch({
      ownerId: userId,
      operationId,
      body: request,
    });
    assert.equal(first.state, 'ready');
    assert.equal(first.sceneSequence, 1);
    assert.ok(first.storyId);

    const [launch] = await database.db
      .select()
      .from(storyLaunch)
      .where(
        and(eq(storyLaunch.ownerId, userId), eq(storyLaunch.operationId, operationId)),
      );
    assert.ok(launch);
    assert.equal(first.storyId, launch.reservedStoryId);

    assert.equal(await countStories(database, userId), 1);

    const [passage] = await database.db
      .select()
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, first.storyId), eq(storyPassage.sequence, 1)),
      );
    assert.ok(passage);
    assert.equal(passage.interaction, null);
    assert.ok(passage.contentDocumentHash);
    const storedPassage = await storage.readSourcePassage(passage.contentDocumentHash);
    const passageText = storedPassage.content.paragraphs.join(' ');
    assert.match(passageText, /BAH/);

    const [gen] = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, userId));
    assert.ok(gen?.id);
    const missions = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.generationId, gen.id));
    assert.equal(missions.length, 1);
    const mission = missions[0];
    assert.ok(mission);

    const wakeRows = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, LAUNCH_WAKE_TOPIC));
    assert.equal(wakeRows.length, 1);
    assert.equal(LAUNCH_WAKE_TOPIC, 'story.launch.v1');
    assert.equal(wakeRows[0]?.operationId, launch.reservedStoryId);

    const stagedBody = await readStagedPromptBody(
      storage,
      launch.reservedStoryId,
      mission.libraryRootHash,
      mission.libraryRootRevision,
    );
    assert.equal(stagedBody, 'BAH');

    const second = await seam.putLaunch({
      ownerId: userId,
      operationId,
      body: request,
    });
    assert.equal(second.storyId, first.storyId);
    assert.equal(await countStories(database, userId), 1);

    await seam.putLaunch({ ownerId: userId, operationId, body: request });
    const recovered = await seam.getLaunch({ ownerId: userId, operationId });
    assert.equal(recovered.state, 'ready');
    assert.equal(recovered.storyId, first.storyId);
    assert.equal(recovered.sceneSequence, 1);
  });
});

test('WR07B T06: same owner and operationId with different prompt conflicts', async () => {
  await withDisposable(async (database) => {
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr07b-t06-conflict-')),
    );
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const ownerId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    await seedLaunchGrant(database, ownerId);
    const operationId = randomUUID();
    await seam.putLaunch({
      ownerId,
      operationId,
      body: bahLaunchRequest(operationId),
    });

    const conflicting = storyLaunchRequestSchema.parse({
      operationId,
      source: { kind: 'prompt', prompt: 'Not BAH anymore.' },
    });
    await assert.rejects(
      () => seam.putLaunch({ ownerId, operationId, body: conflicting }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
    assert.equal(await countStories(database, ownerId), 1);
  });
});

test('WR07B T06: second owner with same operationId gets not_found', async () => {
  await withDisposable(async (database) => {
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr07b-t06-owner-')),
    );
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const ownerId = `user_${randomUUID()}`;
    const otherId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    await insertUser(database, otherId);
    await seedLaunchGrant(database, ownerId);
    const operationId = randomUUID();
    await seam.putLaunch({
      ownerId,
      operationId,
      body: bahLaunchRequest(operationId),
    });

    await assert.rejects(
      () =>
        seam.putLaunch({
          ownerId: otherId,
          operationId,
          body: bahLaunchRequest(operationId),
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    assert.equal(await countStories(database, ownerId), 1);
    assert.equal(await countStories(database, otherId), 0);
  });
});

test('WR07B T06: owner without grant is not admitted with zero stories', async () => {
  await withDisposable(async (database) => {
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr07b-t06-grant-')),
    );
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const deniedId = `user_${randomUUID()}`;
    await insertUser(database, deniedId);
    const operationId = randomUUID();

    await assert.rejects(
      () =>
        seam.putLaunch({
          ownerId: deniedId,
          operationId,
          body: bahLaunchRequest(operationId),
        }),
      (error) => {
        if (!(error instanceof StoryError)) return false;
        if (error.code === 'invalid' && error.reason === 'not-admitted') {
          return true;
        }
        return (
          error instanceof Error && error.message === 'launch_not_admitted'
        );
      },
    );
    assert.equal(await countStories(database, deniedId), 0);
  });
});

test('WR07B T06: wrong owner getLaunch is not_found', async () => {
  await withDisposable(async (database) => {
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr07b-t06-get-')),
    );
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const ownerId = `user_${randomUUID()}`;
    const otherId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    await insertUser(database, otherId);
    await seedLaunchGrant(database, ownerId);
    const operationId = randomUUID();
    await seam.putLaunch({
      ownerId,
      operationId,
      body: bahLaunchRequest(operationId),
    });

    await assert.rejects(
      () => seam.getLaunch({ ownerId: otherId, operationId }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    assert.equal(await countStories(database, ownerId), 1);
  });
});

test('WR07B T06: forged prompt citation does not create a story', async () => {
  await withDisposable(async (database) => {
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr07b-t06-forge-')),
    );
    const ownerId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    await seedLaunchGrant(database, ownerId);
    const operationId = randomUUID();
    const request = bahLaunchRequest(operationId);
    const staging = await stageLaunchPromptLibrary(storage, {
      ownerId,
      prompt: request.source.prompt,
    });
    const reservedStoryId = randomUUID();
    const reservedFirstPassageId = randomUUID();
    await database.db.insert(storyLaunch).values({
      ownerId,
      operationId,
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

    const admitted = await admitLaunchWriterMission(database, {
      ownerId,
      operationId,
      libraryRootHash: staging.libraryRootHash,
      libraryRootRevision: staging.libraryRootRevision,
    });

    const missions = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.generationId, admitted.generationId));
    assert.equal(missions.length, 1);
    const mission = missions[0];
    assert.ok(mission);

    const capture = buildLaunchWriterCapture({
      generationId: admitted.generationId,
      ownerId,
      reservedStoryId,
      reservedFirstPassageId,
      libraryRootHash: staging.libraryRootHash,
      libraryRootRevision: staging.libraryRootRevision,
    });

    const proposal = writerOpeningSceneProposalV2Schema.parse({
      version: 2,
      summary: 'Forged launch probe.',
      stagedObjectHashes: [],
      sourceEvidence: [
        {
          rootHash: staging.libraryRootHash,
          objectHash: 'f'.repeat(64),
          section: 'STORY_PROMPT.md',
          assertedAsFact: false,
        },
      ],
      scene: {
        content: { version: 1, title: 'Opening', paragraphs: ['BAH'] },
        interaction: null,
      },
    });

    await assert.rejects(
      () =>
        acceptWriterSceneProposal(database, storage, {
          missionId: mission.id,
          capture,
          access: { privateDocuments: true },
          reader: storageLibraryReader(storage),
          proposal,
        }),
      (error) => {
        assert.ok(error instanceof WriterSceneProposalError);
        assert.equal(error.code, 'forged-citation');
        return true;
      },
    );
    assert.equal(await countStories(database, ownerId), 0);
  });
});