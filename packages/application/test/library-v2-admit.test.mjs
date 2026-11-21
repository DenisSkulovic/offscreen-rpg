import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { story } from '@offscreen/db/story-schema';
import {
  LocalDocumentStore,
  canonicalDocumentSchema,
  documentManifestSchema,
  hashCanonicalJson,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import { StoryError, createStories } from '../dist/stories/index.js';

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
      DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS,
      DB_IDLE_TRANSACTION_TIMEOUT_MS:
        process.env.DB_IDLE_TRANSACTION_TIMEOUT_MS,
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

async function seedV1TwoEntryStory(database, store) {
  const ownerId = `wr02-${randomUUID()}`;
  const storyId = randomUUID();
  const docA = randomUUID();
  const docB = randomUUID();
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'WR02', `${ownerId}@example.test`],
  );

  const documentA = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: docA,
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Gate',
    body: 'Iron gate closed.',
  });
  const documentB = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: docB,
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Quay',
    body: 'Salt on the planks.',
  });
  const hashA = await store.putDocument(documentA);
  const hashB = await store.putDocument(documentB);
  const v1RootHash = await store.putManifest(
    documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: storyId,
      revision: 1,
      previousRootHash: null,
      authorOperationId: randomUUID(),
      entries: [
        {
          documentId: docA,
          revision: 1,
          path: 'world/places/gate.md',
          objectHash: hashA,
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
        },
        {
          documentId: docB,
          revision: 1,
          path: 'world/places/quay.md',
          objectHash: hashB,
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
        },
      ],
    }),
  );

  await database.db.insert(story).values({
    id: storyId,
    ownerId,
    source: 'test.opening.v1',
    premise: null,
    storyteller: null,
    execution: null,
    usagePolicy: null,
    continuityNotes: [],
    activeSceneScope: {
      version: 'active-scene-anchor.v1',
      fromSequence: 1,
      requiredPassageIds: [],
      recallCues: [],
    },
    documentRootHash: v1RootHash,
    documentRootRevision: 1,
    revision: 1,
    viewVersion: 1,
  });

  return { ownerId, storyId, docA, docB, v1RootHash };
}

test('library v2 adopt and admit', async () => {
  await withDisposable(async (database) => {
    const store = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'offscreen-library-v2-admit-')),
    );
    const documents = createStories(database, { documentStore: store }).documents;
    assert.ok(documents);

    const seeded = await seedV1TwoEntryStory(database, store);
    const adoptOperation = randomUUID();
    const adopted = await documents.adoptLibraryV2({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      operationId: adoptOperation,
      body: {
        expectedRootHash: seeded.v1RootHash,
        expectedRootRevision: 1,
      },
    });
    assert.equal(adopted.replayed, false);
    assert.equal(adopted.rootRevision, 2);

    const v2Root = await store.readLibraryRoot(adopted.rootHash);
    assert.equal(v2Root.format, 'offscreen.library-root.v2');
    await store.readManifest(seeded.v1RootHash);

    const readRoot = await documents.readRoot({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
    });
    assert.equal(readRoot.format, 'offscreen.library-root.v2');
    assert.equal(readRoot.rootHash, adopted.rootHash);
    assert.equal(readRoot.rootRevision, 2);

    const gate = await documents.readDocument({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      documentId: seeded.docA,
    });
    assert.equal(gate.document.body, 'Iron gate closed.');
    const quay = await documents.readDocument({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      documentId: seeded.docB,
    });
    assert.equal(quay.document.body, 'Salt on the planks.');

    const admitOperation = randomUUID();
    const admitBody = {
      expectedRootHash: adopted.rootHash,
      expectedRootRevision: 2,
      changes: [
        {
          documentId: seeded.docA,
          expectedRevision: 1,
          path: 'world/places/gate.md',
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
          title: 'Gate',
          body: 'Iron gate now open.',
          sources: [],
        },
      ],
    };
    const admitted = await documents.admit({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      operationId: admitOperation,
      body: admitBody,
    });
    assert.equal(admitted.rootRevision, 3);
    assert.equal(admitted.replayed, false);

    const updated = await documents.readDocument({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      documentId: seeded.docA,
    });
    assert.equal(updated.document.body, 'Iron gate now open.');

    await assert.rejects(
      documents.readDocument({
        ownerId: seeded.ownerId,
        storyId: seeded.storyId,
        documentId: seeded.docA,
        revision: 1,
      }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );

    const differentBody = {
      expectedRootHash: seeded.v1RootHash,
      expectedRootRevision: 1,
    };
    const conflictOperation = randomUUID();
    await assert.rejects(
      documents.adoptLibraryV2({
        ownerId: seeded.ownerId,
        storyId: seeded.storyId,
        operationId: conflictOperation,
        body: differentBody,
      }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'document_root',
    );

    const [rowAfterConflict] = await database.db
      .select({
        documentRootHash: story.documentRootHash,
        documentRootRevision: story.documentRootRevision,
      })
      .from(story)
      .where(eq(story.id, seeded.storyId));
    assert.equal(rowAfterConflict.documentRootHash, admitted.rootHash);
    assert.equal(rowAfterConflict.documentRootRevision, 3);

    const replayAdopt = await documents.adoptLibraryV2({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      operationId: adoptOperation,
      body: {
        expectedRootHash: seeded.v1RootHash,
        expectedRootRevision: 1,
      },
    });
    assert.equal(replayAdopt.replayed, true);
    assert.equal(replayAdopt.rootHash, adopted.rootHash);

    const differentAdmit = {
      ...admitBody,
      changes: [
        {
          ...admitBody.changes[0],
          body: 'Another body.',
        },
      ],
    };
    await assert.rejects(
      documents.adoptLibraryV2({
        ownerId: seeded.ownerId,
        storyId: seeded.storyId,
        operationId: adoptOperation,
        body: {
          expectedRootHash: seeded.v1RootHash,
          expectedRootRevision: 2,
        },
      }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'operation_identity',
    );

    await assert.rejects(
      documents.admit({
        ownerId: seeded.ownerId,
        storyId: seeded.storyId,
        operationId: admitOperation,
        body: differentAdmit,
      }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'operation_identity',
    );

    const staleV1Admit = {
      expectedRootHash: seeded.v1RootHash,
      expectedRootRevision: 1,
      changes: admitBody.changes,
    };
    await assert.rejects(
      documents.admit({
        ownerId: seeded.ownerId,
        storyId: seeded.storyId,
        operationId: randomUUID(),
        body: staleV1Admit,
      }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'document_root',
    );

    const [finalRow] = await database.db
      .select({ documentRootHash: story.documentRootHash })
      .from(story)
      .where(eq(story.id, seeded.storyId));
    assert.equal(finalRow.documentRootHash, admitted.rootHash);
    assert.notEqual(
      finalRow.documentRootHash,
      hashCanonicalJson({
        format: 'offscreen.manifest.v1',
        campaignId: seeded.storyId,
        revision: 99,
        previousRootHash: seeded.v1RootHash,
        authorOperationId: randomUUID(),
        entries: [],
      }),
    );
  });
});