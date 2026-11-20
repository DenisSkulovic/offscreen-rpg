import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { eq, sql } from 'drizzle-orm';
import { applyMigrations } from '@offscreen/db/migrate';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerAttempt, storytellerPublication } from '@offscreen/db/storyteller-schema';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  hashStorytellerTaskCustodyResult,
  storytellerTaskCustodyContractVersion,
} from '@offscreen/contracts/storyteller-task-custody';
import {
  createStorytellerPublicationSeam,
  createStorytellerTaskCustodySeam,
  type GameAuthoritySeam,
} from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const databaseURL = process.env['DATABASE_TEST_URL'];
const pgEnabled =
  !!databaseURL && new URL(databaseURL).pathname === '/offscreen_auth_test';

const root = 'ab'.repeat(32);
const otherRoot = 'cd'.repeat(32);
const storyToken = 'story02-story-service-credential';
const executorToken = 'story02-executor-only-credential';
const controlToken = 'story03-control-only-credential';
const storytellerKind = 'storyteller.profiled.v1';

function canonicalKnowledge(rootHash: string) {
  return {
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
      maxReads: 4 as const,
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
  };
}

function openingTask(rootHash: string) {
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
      canonicalKnowledge: canonicalKnowledge(rootHash),
    },
  });
}

function noopStorySeam(): GameAuthoritySeam {
  return {
    async read() {
      return { view: 'noop' };
    },
    async startFromCandidate() {
      throw new Error('unexpected start');
    },
    async admitResolution() {
      return { receiptId: randomUUID() };
    },
  };
}

async function call(
  origin: string,
  path: string,
  init: RequestInit & { token?: string; actor?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.token !== undefined) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  if (init.actor !== undefined) {
    headers.set('x-offscreen-actor-id', init.actor);
  }
  return fetch(new URL(path, origin), { ...init, headers });
}

async function insertUser(database: ReturnType<typeof createDatabase>, ownerId: string) {
  await database.db.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${ownerId}, ${'STORY02'}, ${`${ownerId}@example.test`}, true, now(), now())
        on conflict (id) do nothing`,
  );
}

async function seedGeneration(database: ReturnType<typeof createDatabase>) {
  const ownerId = `story02-${randomUUID()}`;
  const generationId = randomUUID();
  const task = openingTask(root);
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await tx.insert(generation).values({
      id: generationId,
      ownerId,
      kind: storytellerKind,
      input: task,
    });
    await tx.insert(storytellerPublication).values({ generationId });
  });
  return { ownerId, generationId, task };
}

async function withAuthTestDatabase(
  run: (database: ReturnType<typeof createDatabase>) => Promise<void>,
) {
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    resolve(process.cwd(), '../../packages/db/migrations'),
  );
  const database = createDatabase(config, () => {});
  try {
    await run(database);
  } finally {
    await database.close();
  }
}

async function startCustodyServer(database: ReturnType<typeof createDatabase>) {
  return startGameAuthorityServer({
    seam: noopStorySeam(),
    custody: createStorytellerTaskCustodySeam(database),
    publication: createStorytellerPublicationSeam(database),
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 10_000,
  });
}

test(
  'two HTTP clients share one PG attempt, idempotent save, and exact hash readback',
  { skip: !pgEnabled },
  async () => {
    await withAuthTestDatabase(async (database) => {
      const { ownerId, generationId, task } = await seedGeneration(database);
      const server = await startCustodyServer(database);
      try {
        const base = `/internal/v1/storyteller-generations/${generationId}`;
        const result = scriptedStorytellerResult(task);
        const resultHash = hashStorytellerTaskCustodyResult(result);

        const taskFetch = await call(server.origin, `${base}/task`, {
          token: executorToken,
        });
        assert.equal(taskFetch.status, 200);
        const taskBody = (await taskFetch.json()) as {
          status: string;
          ownerId?: string;
          pinnedRoot?: string;
        };
        assert.equal(taskBody.status, 'ready');
        assert.equal(taskBody.ownerId, ownerId);
        assert.equal(taskBody.pinnedRoot, root);

        const [claimLeft, claimRight] = await Promise.all([
          call(server.origin, `${base}/claim`, {
            method: 'PUT',
            token: executorToken,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              schemaVersion: storytellerTaskCustodyContractVersion,
              pinnedRoot: root,
            }),
          }),
          call(server.origin, `${base}/claim`, {
            method: 'PUT',
            token: executorToken,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              schemaVersion: storytellerTaskCustodyContractVersion,
              pinnedRoot: root,
            }),
          }),
        ]);
        assert.equal(claimLeft.status, 200);
        assert.equal(claimRight.status, 200);
        const leftBody = (await claimLeft.json()) as {
          status: string;
          attemptId?: string;
          created?: boolean;
        };
        const rightBody = (await claimRight.json()) as {
          status: string;
          attemptId?: string;
          created?: boolean;
        };
        assert.equal(leftBody.status, 'claimed');
        assert.equal(rightBody.status, 'claimed');
        assert.equal(leftBody.attemptId, rightBody.attemptId);
        assert.equal(
          Number(leftBody.created) + Number(rightBody.created),
          1,
        );

        const attempts = await database.db
          .select({ id: storytellerAttempt.id })
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.generationId, generationId));
        assert.equal(attempts.length, 1);

        const saveLeft = await call(server.origin, `${base}/result`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
            resultHash,
            result,
          }),
        });
        const saveRight = await call(server.origin, `${base}/result`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
            resultHash,
            result,
          }),
        });
        assert.equal(saveLeft.status, 200);
        assert.equal(saveRight.status, 200);
        const savedLeft = (await saveLeft.json()) as { status: string };
        const savedRight = (await saveRight.json()) as { status: string };
        assert.equal(savedLeft.status, 'saved');
        assert.equal(savedRight.status, 'saved');

        const readSaved = await call(server.origin, `${base}/saved-result`, {
          token: executorToken,
        });
        assert.equal(readSaved.status, 200);
        const readBody = (await readSaved.json()) as {
          status: string;
          resultHash?: string;
        };
        assert.equal(readBody.status, 'saved');
        assert.equal(readBody.resultHash, resultHash);

        const [row] = await database.db
          .select()
          .from(generation)
          .where(eq(generation.id, generationId));
        assert.ok(row);
        assert.equal(row.state, 'pending');
        assert.equal(row.attemptId, null);
        assert.equal(row.output, null);
      } finally {
        await server.close();
      }
    });
  },
);

test(
  'different hash conflicts; missing or story token cannot read the task',
  { skip: !pgEnabled },
  async () => {
    await withAuthTestDatabase(async (database) => {
      const { generationId, task } = await seedGeneration(database);
      const server = await startCustodyServer(database);
      try {
        const base = `/internal/v1/storyteller-generations/${generationId}`;
        const result = scriptedStorytellerResult(task);
        const resultHash = hashStorytellerTaskCustodyResult(result);
        const other = structuredClone(result) as {
          scene: { content: { paragraphs: string[] } };
        };
        other.scene.content.paragraphs[0] =
          `${other.scene.content.paragraphs[0]} The wind shifts.`;
        const otherHash = hashStorytellerTaskCustodyResult(other);
        assert.notEqual(resultHash, otherHash);

        const deniedTokens = await Promise.all([
          call(server.origin, `${base}/task`),
          call(server.origin, `${base}/task`, {
            token: storyToken,
            actor: 'wrong-actor',
          }),
        ]);
        for (const response of deniedTokens) {
          assert.equal(response.status, 401);
        }

        const wrongRootClaim = await call(server.origin, `${base}/claim`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: otherRoot,
          }),
        });
        assert.equal(wrongRootClaim.status, 200);
        const wrongRootBody = (await wrongRootClaim.json()) as {
          status: string;
          reason?: string;
        };
        assert.equal(wrongRootBody.status, 'refused');
        assert.equal(wrongRootBody.reason, 'root-mismatch');

        await call(server.origin, `${base}/claim`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
          }),
        });

        await call(server.origin, `${base}/result`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
            resultHash,
            result,
          }),
        });

        const conflict = await call(server.origin, `${base}/result`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
            resultHash: otherHash,
            result: other,
          }),
        });
        assert.equal(conflict.status, 200);
        const conflictBody = (await conflict.json()) as {
          status: string;
          reason?: string;
          resultHash?: string;
        };
        assert.equal(conflictBody.status, 'conflict');
        assert.equal(conflictBody.reason, 'result-hash');
        assert.equal(conflictBody.resultHash, resultHash);

        const readSaved = await call(server.origin, `${base}/saved-result`, {
          token: executorToken,
        });
        const readBody = (await readSaved.json()) as { resultHash?: string };
        assert.equal(readBody.resultHash, resultHash);
      } finally {
        await server.close();
      }
    });
  },
);

test(
  'control publish adopts saved opening result once then idempotently acks',
  { skip: !pgEnabled },
  async () => {
    await withAuthTestDatabase(async (database) => {
      const { generationId, task } = await seedGeneration(database);
      const server = await startCustodyServer(database);
      try {
        const base = `/internal/v1/storyteller-generations/${generationId}`;
        const result = scriptedStorytellerResult(task);
        const resultHash = hashStorytellerTaskCustodyResult(result);
        await call(server.origin, `${base}/claim`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
          }),
        });
        await call(server.origin, `${base}/result`, {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: storytellerTaskCustodyContractVersion,
            pinnedRoot: root,
            resultHash,
            result,
          }),
        });

        const [rowBefore] = await database.db
          .select()
          .from(generation)
          .where(eq(generation.id, generationId));
        assert.equal(rowBefore?.state, 'pending');
        assert.equal(rowBefore?.attemptId, null);

        const first = await call(server.origin, `${base}/publish`, {
          method: 'POST',
          token: controlToken,
        });
        assert.equal(first.status, 200);
        const firstBody = (await first.json()) as {
          status: string;
          passageId?: string;
          attemptId?: string;
          resultHash?: string;
        };
        assert.equal(firstBody.status, 'published');
        assert.match(firstBody.passageId ?? '', /^[0-9a-f-]{36}$/);
        const firstPassageId = firstBody.passageId;

        const [rowAfter] = await database.db
          .select()
          .from(generation)
          .where(eq(generation.id, generationId));
        assert.equal(rowAfter?.state, 'succeeded');
        assert.equal(rowAfter?.attemptId, firstBody.attemptId);
        assert.equal(firstBody.resultHash, resultHash);

        const [publication] = await database.db
          .select()
          .from(storytellerPublication)
          .where(eq(storytellerPublication.generationId, generationId));
        assert.equal(publication?.state, 'published');

        const second = await call(server.origin, `${base}/publish`, {
          method: 'POST',
          token: controlToken,
        });
        const secondBody = (await second.json()) as {
          status: string;
          passageId?: string;
        };
        assert.equal(secondBody.status, 'already_published');
        assert.equal(secondBody.passageId, firstPassageId);

        const blocked = await call(server.origin, `${base}/publish`, {
          method: 'POST',
          token: executorToken,
        });
        assert.equal(blocked.status, 401);
      } finally {
        await server.close();
      }
    });
  },
);
