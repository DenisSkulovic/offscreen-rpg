import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyPassage, storyResolution } from '@offscreen/db/story-schema';
import { storytellerContextCapture } from '@offscreen/db/storyteller-schema';
import { createAdminDiagnosticsReads } from '../../../packages/admin/dist/diagnostics-reads.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { storytellerContextCaptureKind } from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { redactedOperationPageV1Schema } from '@offscreen/admin-interface/admin';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

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
    [ownerId, 'OBS01', `${ownerId}@example.test`],
  );
}

async function seedMinimalStory(database, ownerId) {
  const storyId = randomUUID();
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise: {
          title: 'OBS01',
          premise: 'A quay.',
          storytellingDirection: 'Keep it short.',
        },
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'OBS01 coverage',
          paragraphs: ['Fog on the quay.'],
        },
        interaction: null,
      },
    });
  });
  const [passage] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  return { storyId, passageId: passage.id };
}

test('OBS01 live: provisional capture G without attempt appears once', async () => {
  await withDisposable(async (database) => {
    const ownerId = `obs01-${randomUUID()}`;
    await insertUser(database, ownerId);
    const { storyId, passageId } = await seedMinimalStory(database, ownerId);
    const other = await seedMinimalStory(database, ownerId);

    const captureId = randomUUID();
    await database.db.insert(generation).values({
      id: captureId,
      ownerId,
      kind: storytellerContextCaptureKind,
      state: 'pending',
      input: {
        version: 1,
        captureId,
        purpose: 'consequence',
        sourceKind: 'action-interrupted',
      },
    });
    await database.db.insert(storytellerContextCapture).values({
      captureId,
      storyId,
      operationId: randomUUID(),
      capture: { version: 1, purpose: 'consequence' },
      captureSha256: 'a'.repeat(64),
      state: 'held',
      materializationAttempts: 3,
      failureCode: 'missing_source',
    });
    await database.db.insert(storyResolution).values({
      generationId: captureId,
      storyId,
      basePassageId: passageId,
      baseRevision: 1,
      operationId: captureId,
      submission: {
        kind: 'committed-consequence',
        operationId: randomUUID(),
      },
    });

    const foreignG = randomUUID();
    await database.db.insert(generation).values({
      id: foreignG,
      ownerId,
      kind: storytellerContextCaptureKind,
      state: 'pending',
      input: { version: 1, captureId: foreignG, purpose: 'pending-consequence' },
    });
    await database.db.insert(storyResolution).values({
      generationId: foreignG,
      storyId: other.storyId,
      basePassageId: other.passageId,
      baseRevision: 1,
      operationId: foreignG,
      submission: {
        kind: 'committed-consequence',
        operationId: randomUUID(),
      },
    });

    const reads = createAdminDiagnosticsReads(database);
    const page = redactedOperationPageV1Schema.parse(
      await reads.listCampaignOperations({ campaignId: storyId }),
    );
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].id, captureId);
    assert.equal(page.items[0].attemptCoverage, 'none-recorded');
    assert.equal(page.items[0].state, 'pending');
    assert.equal(page.items[0].safeFailureCode, 'missing_source');
    assert.equal('input' in page.items[0], false);

    const otherPage = await reads.listCampaignOperations({
      campaignId: other.storyId,
    });
    assert.equal(otherPage.items.length, 1);
    assert.equal(otherPage.items[0].id, foreignG);

    const campaigns = await reads.listPlayerCampaigns({ playerId: ownerId });
    const target = campaigns.items.find((item) => item.id === storyId);
    assert.ok(target);
    assert.equal(target.operationHealth, 'pending');
  });
});
