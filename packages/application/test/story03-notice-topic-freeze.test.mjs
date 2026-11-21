import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { outbox } from '@offscreen/db/outbox-schema';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { enqueue } from '../dist/outbox/index.js';
import {
  insertStorytellerTask,
  readFrozenStorytellerNoticeTopic,
  storytellerDistributedTopic,
  storytellerNoticeTopicForWake,
  storytellerTopic,
} from '../dist/storyteller/records.js';
import { isProvisionalContextCapture } from '../dist/storyteller/capture-materialization.js';
import { isProvisionalContextCapture as wakeIsProvisionalContextCapture } from '../dist/campaign/storyteller-wake.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';

const root = 'cd'.repeat(32);
const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '..', 'src');

function openingTask(rootHash) {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: '',
        premise: 'A traveler wakes beside an unfamiliar companion.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
      canonicalKnowledge: {
        rootHash,
        rootRevision: 1,
        catalogue: [],
        catalogueTruncated: false,
        documents: [],
        documentSelection: {
          cueResolution: {
            requested: [],
            resolvedDocumentIds: [],
            unavailable: [],
            excludedDocumentIds: [],
            maxCandidates: 0,
          },
          requestedDocumentIds: [],
          loadedHandles: [],
          omitted: [],
          maxReads: 4,
          maxBytes: 12 * 1024,
          usedReads: 0,
          usedBytes: 0,
        },
        libraries: [],
        librarySelection: {
          requestedTopics: [],
          unmatchedTopics: [],
          requestedHandles: [],
          loadedHandles: [],
          omitted: [],
          maxReads: 0,
          maxBytes: 0,
          usedReads: 0,
          usedBytes: 0,
        },
      },
    },
  });
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
    [ownerId, 'STORY03', `${ownerId}@example.test`],
  );
}

test('STORY03: distributed admission freezes topic across flag flip and re-wakes', async () => {
  const priorFlag = process.env.STORYTELLER_DISTRIBUTED_V1;
  process.env.STORYTELLER_DISTRIBUTED_V1 = 'true';
  await withDisposable(async (database) => {
    const ownerId = `story03-${randomUUID()}`;
    const generationId = randomUUID();
    await insertUser(database, ownerId);
    await database.db.transaction(async (tx) => {
      await insertStorytellerTask(tx, {
        id: generationId,
        ownerId,
        task: openingTask(root),
      });
    });
    delete process.env.STORYTELLER_DISTRIBUTED_V1;
    await database.db.transaction(async (tx) => {
      const wakeTopic = await storytellerNoticeTopicForWake(tx, generationId);
      assert.equal(wakeTopic, storytellerDistributedTopic);
      await enqueue(tx, {
        id: randomUUID(),
        operationId: generationId,
        topic: wakeTopic,
      });
    });
    const rows = await database.db
      .select({ topic: outbox.topic })
      .from(outbox)
      .where(eq(outbox.operationId, generationId));
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.topic === storytellerDistributedTopic));
  });
  if (priorFlag === undefined) delete process.env.STORYTELLER_DISTRIBUTED_V1;
  else process.env.STORYTELLER_DISTRIBUTED_V1 = priorFlag;
});

test('STORY03 negative: legacy admission stays legacy after distributed flag is set', async () => {
  const priorFlag = process.env.STORYTELLER_DISTRIBUTED_V1;
  delete process.env.STORYTELLER_DISTRIBUTED_V1;
  await withDisposable(async (database) => {
    const ownerId = `story03-${randomUUID()}`;
    const generationId = randomUUID();
    await insertUser(database, ownerId);
    await database.db.transaction(async (tx) => {
      await insertStorytellerTask(tx, {
        id: generationId,
        ownerId,
        task: openingTask(root),
      });
    });
    process.env.STORYTELLER_DISTRIBUTED_V1 = 'true';
    await database.db.transaction(async (tx) => {
      const wakeTopic = await storytellerNoticeTopicForWake(tx, generationId);
      assert.equal(wakeTopic, storytellerTopic);
      assert.notEqual(wakeTopic, storytellerDistributedTopic);
    });
  });
  if (priorFlag === undefined) delete process.env.STORYTELLER_DISTRIBUTED_V1;
  else process.env.STORYTELLER_DISTRIBUTED_V1 = priorFlag;
});

test('STORY03 negative: wake helper throws when generation has no storyteller notice', async () => {
  const priorFlag = process.env.STORYTELLER_DISTRIBUTED_V1;
  process.env.STORYTELLER_DISTRIBUTED_V1 = 'true';
  await withDisposable(async (database) => {
    const operationId = randomUUID();
    await database.db.transaction(async (tx) => {
      await enqueue(tx, {
        id: randomUUID(),
        operationId,
        topic: 'campaign.consequence.v1',
      });
      await assert.rejects(
        () => storytellerNoticeTopicForWake(tx, operationId),
        /Missing frozen Storyteller notice topic/,
      );
      assert.equal(
        await readFrozenStorytellerNoticeTopic(tx, operationId),
        null,
      );
    });
  });
  if (priorFlag === undefined) delete process.env.STORYTELLER_DISTRIBUTED_V1;
  else process.env.STORYTELLER_DISTRIBUTED_V1 = priorFlag;
});

test('STORY03 negative: inconsistent storyteller topics for one operation throw', async () => {
  await withDisposable(async (database) => {
    const operationId = randomUUID();
    await database.db.transaction(async (tx) => {
      await tx.insert(outbox).values({
        id: randomUUID(),
        operationId,
        topic: storytellerTopic,
      });
      await tx.insert(outbox).values({
        id: randomUUID(),
        operationId,
        topic: storytellerDistributedTopic,
      });
      await assert.rejects(
        () => readFrozenStorytellerNoticeTopic(tx, operationId),
        /history is inconsistent/,
      );
      await assert.rejects(
        () => storytellerNoticeTopicForWake(tx, operationId),
        /history is inconsistent/,
      );
    });
    const rows = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.operationId, operationId));
    assert.equal(rows.length, 2);
    const topics = rows.map((row) => row.topic).sort();
    assert.deepEqual(topics, [storytellerDistributedTopic, storytellerTopic]);
  });
});

test('STORY03: non-storyteller outbox topics do not select workflow', async () => {
  await withDisposable(async (database) => {
    const operationId = randomUUID();
    await database.db.transaction(async (tx) => {
      await tx.insert(outbox).values({
        id: randomUUID(),
        operationId,
        topic: 'campaign.consequence.v1',
      });
      await tx.insert(outbox).values({
        id: randomUUID(),
        operationId,
        topic: storytellerTopic,
      });
      assert.equal(
        await readFrozenStorytellerNoticeTopic(tx, operationId),
        storytellerTopic,
      );
    });
  });
});

test('STORY03 negative: outbox identity conflict rolls back enqueue', async () => {
  await withDisposable(async (database) => {
    const noticeId = randomUUID();
    await assert.rejects(
      () =>
        database.db.transaction(async (tx) => {
          await enqueue(tx, {
            id: noticeId,
            operationId: randomUUID(),
            topic: 'campaign.consequence.v1',
          });
          await enqueue(tx, {
            id: noticeId,
            operationId: randomUUID(),
            topic: storytellerTopic,
          });
        }),
      /Outbox identity conflict/,
    );
    const rows = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.id, noticeId));
    assert.equal(rows.length, 0);
  });
});

const wakeSources = [
  'storyteller/admission.ts',
  'storyteller/recovery.ts',
  'storyteller/openings.ts',
  'storyteller/dispatch-review.ts',
  'campaign/follow-up-intents.ts',
];

test('STORY03: wake enqueue sites do not call admission topic selector', () => {
  const forbidden = 'selectStorytellerNoticeTopicAtAdmission';
  for (const rel of wakeSources) {
    const body = readFileSync(join(srcRoot, rel), 'utf8');
    assert.ok(!body.includes(forbidden), `${rel} must not call ${forbidden}`);
  }
});

test('STORY03 MA05D: provisional context capture kind classifier parity', async () => {
  assert.equal(isProvisionalContextCapture, wakeIsProvisionalContextCapture);
  await withDisposable(async (database) => {
    const ownerId = `story03-${randomUUID()}`;
    const captureId = randomUUID();
    const profiledId = randomUUID();
    const missingId = randomUUID();
    await insertUser(database, ownerId);
    await database.db.transaction(async (tx) => {
      await tx.insert(generation).values([
        {
          id: captureId,
          ownerId,
          kind: 'storyteller.context-capture.v1',
          input: {},
        },
        {
          id: profiledId,
          ownerId,
          kind: 'storyteller.profiled.v1',
          input: {},
        },
      ]);
      assert.equal(await isProvisionalContextCapture(tx, captureId), true);
      assert.equal(await isProvisionalContextCapture(tx, profiledId), false);
      assert.equal(await isProvisionalContextCapture(tx, missingId), false);
      assert.equal(await wakeIsProvisionalContextCapture(tx, captureId), true);
      assert.equal(
        await wakeIsProvisionalContextCapture(tx, profiledId),
        false,
      );
      assert.equal(await wakeIsProvisionalContextCapture(tx, missingId), false);
    });
  });
});
