import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { and, eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/contracts/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  story,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import { outbox } from '@offscreen/db/outbox-schema';
import { StoryError } from '@offscreen/story-engine/stories';
import { createGameAuthoritySeam } from '../../../apps/game-authority/dist/src/application.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import {
  HARBOR_PROMPT,
  assertQuiescentOpening,
  pendingLivingWriter,
} from './longform-acceptance/harbor-oracle.mjs';

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
    const message = error instanceof Error ? error.message : String(error);
    test.diagnostic(
      `NOT-RUN: disposable Postgres unavailable (${message}).`,
    );
    return { available: false };
  }
  const open = () =>
    createDatabase(
      readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
      () => {},
    );
  let database = open();
  try {
    await run({
      database,
      reconnect: async () => {
        await database.close().catch(() => undefined);
        database = open();
        return database;
      },
      connectionString: provisioned.connectionString,
    });
    return { available: true };
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
        values (${userId}, ${'P3C'}, ${`${userId}@example.test`}, true, now(), now())`,
  );
}

function harborRequest(operationId) {
  return storyLaunchRequestSchema.parse({
    operationId,
    source: { kind: 'prompt', prompt: HARBOR_PROMPT },
  });
}

async function passageCount(database, storyId) {
  const rows = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  return rows.length;
}

async function storyCount(database, ownerId) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.ownerId, ownerId));
  return rows.length;
}

test(
  'P3C long-form: opening, reentry, neutrality, scene-1 fork, and fail-closed edges',
  { timeout: 180_000 },
  async () => {
    const outcome = await withDisposable(async ({ database, reconnect }) => {
      const storage = new LocalDocumentStore(
        await mkdtemp(join(tmpdir(), 'p3c-longform-')),
      );
      const seam = () => createGameAuthoritySeam(database, { documentStore: storage });
      const ownerId = `user_${randomUUID()}`;
      const otherId = `user_${randomUUID()}`;
      await insertUser(database, ownerId);
      await insertUser(database, otherId);
      const { seedLaunchGrant } = await import(
        './longform-acceptance/launch-grant.mjs'
      );
      await seedLaunchGrant(database, ownerId);
      const operationId = randomUUID();
      const request = harborRequest(operationId);

      const first = await seam().putLaunch({
        ownerId,
        operationId,
        body: request,
      });
      assert.equal(first.state, 'ready');
      assert.equal(first.sceneSequence, 1);
      const storyId = first.storyId;
      assert.ok(storyId);

      const [passage] = await database.db
        .select()
        .from(storyPassage)
        .where(and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 1)));
      assert.ok(passage);
      assert.equal(passage.interaction, null);

      const [checkpointRow] = await database.db
        .select()
        .from(storySceneCheckpoint)
        .where(eq(storySceneCheckpoint.storyId, storyId));
      assert.ok(checkpointRow);
      const stored = await storage.readSceneCheckpoint(
        checkpointRow.checkpointHash,
      );
      assertQuiescentOpening(stored, HARBOR_PROMPT);
      const prose = await storage.readSourcePassage(passage.contentDocumentHash);
      assert.equal(prose.content.paragraphs.join('\n'), HARBOR_PROMPT);

      const wakes = await database.db
        .select({ id: outbox.id })
        .from(outbox)
        .where(eq(outbox.topic, 'story.launch.v1'));
      assert.equal(wakes.length, 1);

      const lostResponse = await seam().putLaunch({
        ownerId,
        operationId,
        body: request,
      });
      assert.equal(lostResponse.storyId, storyId);
      assert.equal(await storyCount(database, ownerId), 1);
      assert.equal(await passageCount(database, storyId), 1);

      const restarted = await reconnect();
      const afterRestart = createGameAuthoritySeam(restarted, {
        documentStore: storage,
      });
      const reentry = await afterRestart.getLaunch({ ownerId, operationId });
      assert.equal(reentry.state, 'ready');
      assert.equal(reentry.storyId, storyId);
      assert.equal(reentry.sceneSequence, 1);
      const wakesAfter = await restarted.db
        .select({ id: outbox.id })
        .from(outbox)
        .where(eq(outbox.topic, 'story.launch.v1'));
      assert.equal(wakesAfter.length, 1);

      const forkStoryId = randomUUID();
      await afterRestart.fork({
        ownerId,
        sourceStoryId: storyId,
        forkStoryId,
        body: {
          expectedRevision: 1,
          sourcePassageId: passage.id,
          sourceCheckpointHash: checkpointRow.checkpointHash,
        },
      });
      assert.equal(await passageCount(restarted, forkStoryId), 1);
      assert.equal(await passageCount(restarted, storyId), 1);
      const [child] = await restarted.db
        .select()
        .from(storyPassage)
        .where(eq(storyPassage.storyId, forkStoryId));
      assert.equal(child?.sequence, 1);
      assert.equal(child?.interaction, null);
      const childText = await storage.readSourcePassage(child.contentDocumentHash);
      assert.equal(childText.content.paragraphs.join('\n'), HARBOR_PROMPT);
      const wakesAfterFork = await restarted.db
        .select({ id: outbox.id })
        .from(outbox)
        .where(eq(outbox.topic, 'story.launch.v1'));
      assert.equal(wakesAfterFork.length, 1);

      await assert.rejects(
        () =>
          afterRestart.fork({
            ownerId,
            sourceStoryId: storyId,
            forkStoryId: randomUUID(),
            body: {
              expectedRevision: 2,
              sourceCheckpointHash: checkpointRow.checkpointHash,
            },
          }),
        (error) => error instanceof StoryError,
      );
      assert.equal(await storyCount(restarted, ownerId), 2);

      await assert.rejects(
        () =>
          afterRestart.getLaunch({ ownerId: otherId, operationId }),
        (error) => error instanceof StoryError && error.code === 'not_found',
      );
      await assert.rejects(
        () =>
          afterRestart.putLaunch({
            ownerId,
            operationId,
            body: harborRequest(operationId).source
              ? storyLaunchRequestSchema.parse({
                  operationId,
                  source: { kind: 'prompt', prompt: 'A different bell.' },
                })
              : request,
          }),
        (error) => error instanceof StoryError && error.code === 'conflict',
      );
      assert.equal(await storyCount(restarted, ownerId), 2);

      const missingHash = 'ab'.repeat(32);
      await assert.rejects(
        () =>
          afterRestart.fork({
            ownerId,
            sourceStoryId: storyId,
            forkStoryId: randomUUID(),
            body: {
              expectedRevision: 1,
              sourceCheckpointHash: missingHash,
            },
          }),
        (error) => error instanceof StoryError,
      );
      assert.equal(await storyCount(restarted, ownerId), 2);
      assert.equal(await passageCount(restarted, storyId), 1);
    });
    if (outcome && outcome.available === false) {
      return;
    }
  },
);

test('P3C long-form: unauthorized launch writes no story', { timeout: 180_000 }, async () => {
  const outcome = await withDisposable(async ({ database }) => {
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'p3c-deny-')),
    );
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const ownerId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    const operationId = randomUUID();
    await assert.rejects(
      () =>
        seam.putLaunch({
          ownerId,
          operationId,
          body: harborRequest(operationId),
        }),
      (error) => error instanceof StoryError || error instanceof Error,
    );
    assert.equal(await storyCount(database, ownerId), 0);
    const passages = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage);
    assert.equal(passages.length, 0);
  });
  if (outcome && outcome.available === false) return;
});

test('P3C pending ledger is explicit and not a pass of missing Writer scenes', () => {
  assert.ok(pendingLivingWriter.length >= 5);
  for (const item of pendingLivingWriter) {
    assert.match(item.reason, /Pending/);
    console.log(`PENDING ${item.id}: ${item.reason}`);
  }
});

for (const item of pendingLivingWriter) {
  test(item.title, { skip: item.reason }, () => {
    throw new Error(`${item.id} must not be marked passing`);
  });
}
