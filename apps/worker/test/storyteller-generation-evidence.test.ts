import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { StoryError } from '@offscreen/application/stories';
import {
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyEvidencePath,
} from '@offscreen/contracts/storyteller-task-custody';
import { startGameAuthorityServer } from '@offscreen/game-authority/server';
import type { DocumentStore } from '@offscreen/documents';
import type { StorytellerTaskCustodySeam } from '@offscreen/game-authority/application';
import { createStorytellerTaskCustodyClient } from '../src/custody/storyteller-task-custody-client.js';

const storyToken = 'test-story-service-credential';
const executorToken = 'test-executor-only-credential';
const childStory = '11111111-1111-4111-8111-111111111111';
const parentStory = '22222222-2222-4222-8222-222222222222';
const childRoot = 'ab'.repeat(32);
const parentRoot = 'cd'.repeat(32);
const scene1Doc = '33333333-3333-4333-8333-333333333333';
const privateDoc = '44444444-4444-4444-8444-444444444444';
const scene1ObjectHash = '11'.repeat(32);
const privateObjectHash = '22'.repeat(32);
const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerId = 'owner-fork';
const authorOperationId = randomUUID();

const frozenTask = {
  source: { storyId: childStory },
  context: {
    canonicalKnowledge: {
      rootHash: childRoot,
      rootRevision: 1,
    },
  },
};

function childManifest(campaignId: string) {
  return {
    format: 'offscreen.manifest.v1' as const,
    campaignId,
    revision: 1,
    previousRootHash: null,
    authorOperationId,
    entries: [
      {
        documentId: scene1Doc,
        revision: 1,
        path: 'characters/king.md',
        objectHash: scene1ObjectHash,
        kind: 'identity' as const,
        authority: 'canon' as const,
        visibility: 'player-known' as const,
      },
      {
        documentId: privateDoc,
        revision: 1,
        path: 'private/future.md',
        objectHash: privateObjectHash,
        kind: 'private-possibility' as const,
        authority: 'canon' as const,
        visibility: 'storyteller-private' as const,
      },
    ],
  };
}

function noopSeam() {
  return {
    async read() {
      return { storyId: childStory, view: 'snapshot' };
    },
    async startFromCandidate() {
      throw new Error('unexpected start');
    },
    async admitResolution() {
      return { receiptId: 'receipt-1' };
    },
    async fork() {
      throw new StoryError('not_found');
    },
  };
}

function makeCustody(overrides?: {
  fetch?: StorytellerTaskCustodySeam['fetchCommittedGeneration'];
}): StorytellerTaskCustodySeam & { fetchCalls: number } {
  let fetchCalls = 0;
  return {
    get fetchCalls() {
      return fetchCalls;
    },
    async fetchCommittedGeneration(id) {
      fetchCalls += 1;
      if (overrides?.fetch) {
        return overrides.fetch(id);
      }
      if (id !== generationId) {
        return {
          status: 'refused' as const,
          reason: 'unknown-generation' as const,
        };
      }
      return {
        status: 'ready' as const,
        generationId: id,
        ownerId,
        pinnedRoot: childRoot,
        task: frozenTask,
      };
    },
    async claimGeneration() {
      throw new Error('unexpected claim');
    },
    async saveValidatedResult() {
      throw new Error('unexpected save');
    },
    async readValidatedResult() {
      throw new Error('unexpected read-saved');
    },
  };
}

function fakeDocumentStore(manifestForChild: typeof childManifest) {
  let readManifestCalls = 0;
  const store: DocumentStore = {
    async readManifest(hash: string) {
      readManifestCalls += 1;
      if (hash === childRoot) {
        return manifestForChild(childStory);
      }
      if (hash === parentRoot) {
        return childManifest(parentStory);
      }
      throw new Error(`unexpected manifest hash ${hash}`);
    },
  } as DocumentStore;
  return {
    store,
    get readManifestCalls() {
      return readManifestCalls;
    },
  };
}

async function startFixture(
  custody: ReturnType<typeof makeCustody>,
  documentStore?: DocumentStore,
) {
  return startGameAuthorityServer({
    seam: noopSeam(),
    custody,
    ...(documentStore === undefined ? {} : { documentStore }),
    token: storyToken,
    executorToken,
    timeoutMs: 2000,
  });
}

test('readEvidence returns ready objectHash for a pinned scene handle', async () => {
  const custody = makeCustody();
  const { store } = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const outcome = await client.readEvidence(generationId, {
      storyId: childStory,
      rootHash: childRoot,
      rootRevision: 1,
      handles: [scene1Doc],
    });
    assert.equal(outcome.status, 'ready');
    if (outcome.status !== 'ready') return;
    assert.equal(outcome.partial, false);
    assert.equal(outcome.ownerId, ownerId);
    assert.equal(outcome.generationId, generationId);
    assert.equal(outcome.evidence.length, 1);
    assert.equal(outcome.evidence[0]?.objectHash, scene1ObjectHash);
    assert.equal(outcome.evidence[0]?.documentId, scene1Doc);
  } finally {
    await server.close();
  }
});

test('parent root while generation pinned to child root refuses without reading manifest', async () => {
  const custody = makeCustody();
  const docs = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, docs.store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const before = docs.readManifestCalls;
    const outcome = await client.readEvidence(generationId, {
      storyId: childStory,
      rootHash: parentRoot,
      rootRevision: 1,
      handles: [scene1Doc],
    });
    assert.equal(outcome.status, 'refused');
    if (outcome.status === 'refused') {
      assert.equal(outcome.reason, 'root-mismatch');
    }
    assert.equal(docs.readManifestCalls, before);
  } finally {
    await server.close();
  }
});

test('story mismatch refuses without reading manifest', async () => {
  const custody = makeCustody();
  const docs = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, docs.store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const before = docs.readManifestCalls;
    const outcome = await client.readEvidence(generationId, {
      storyId: parentStory,
      rootHash: childRoot,
      rootRevision: 1,
      handles: [scene1Doc],
    });
    assert.equal(outcome.status, 'refused');
    if (outcome.status === 'refused') {
      assert.equal(outcome.reason, 'story-mismatch');
    }
    assert.equal(docs.readManifestCalls, before);
  } finally {
    await server.close();
  }
});

test('unknown generation id returns refused unknown-generation', async () => {
  const custody = makeCustody();
  const { store } = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const unknownId = '99999999-9999-4999-8999-999999999999';
    const outcome = await client.readEvidence(unknownId, {
      storyId: childStory,
      rootHash: childRoot,
      rootRevision: 1,
      handles: [scene1Doc],
    });
    assert.equal(outcome.status, 'refused');
    if (outcome.status === 'refused') {
      assert.equal(outcome.reason, 'unknown-generation');
    }
  } finally {
    await server.close();
  }
});

test('private handle refuses unknown-handle without leaking private path', async () => {
  const custody = makeCustody();
  const { store } = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const outcome = await client.readEvidence(generationId, {
      storyId: childStory,
      rootHash: childRoot,
      rootRevision: 1,
      handles: [privateDoc],
    });
    assert.equal(outcome.status, 'refused');
    if (outcome.status === 'refused') {
      assert.equal(outcome.reason, 'unknown-handle');
    }
    const serialized = JSON.stringify(outcome);
    assert.ok(!serialized.includes('private/future.md'));
  } finally {
    await server.close();
  }
});

test('stale manifest campaignId refuses root-mismatch after readManifest', async () => {
  const custody = makeCustody();
  let readManifestCalls = 0;
  const store: DocumentStore = {
    async readManifest(hash: string) {
      readManifestCalls += 1;
      assert.equal(hash, childRoot);
      return childManifest(parentStory);
    },
  } as DocumentStore;
  const server = await startFixture(custody, store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const before = readManifestCalls;
    const outcome = await client.readEvidence(generationId, {
      storyId: childStory,
      rootHash: childRoot,
      rootRevision: 1,
      handles: [scene1Doc],
    });
    assert.equal(readManifestCalls, before + 1);
    assert.equal(outcome.status, 'refused');
    if (outcome.status === 'refused') {
      assert.equal(outcome.reason, 'root-mismatch');
    }
  } finally {
    await server.close();
  }
});

test('more than eight handles fails client parse before custody fetch', async () => {
  const custody = makeCustody();
  const { store } = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, store);
  try {
    const client = createStorytellerTaskCustodyClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 2000,
    });
    const handles = Array.from({ length: 9 }, () => randomUUID());
    const before = custody.fetchCalls;
    await assert.rejects(
      async () => {
        await client.readEvidence(generationId, {
          storyId: childStory,
          rootHash: childRoot,
          rootRevision: 1,
          handles,
        });
      },
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.name, 'ZodError');
        return true;
      },
    );
    assert.equal(custody.fetchCalls, before);
  } finally {
    await server.close();
  }
});

test('story bearer token cannot call evidence', async () => {
  const custody = makeCustody();
  const { store } = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, store);
  try {
    const path = storytellerTaskCustodyEvidencePath(generationId);
    const response = await fetch(new URL(path, server.origin), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${storyToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        schemaVersion: storytellerTaskCustodyContractVersion,
        storyId: childStory,
        rootHash: childRoot,
        rootRevision: 1,
        handles: [scene1Doc],
      }),
    });
    assert.equal(response.status, 401);
  } finally {
    await server.close();
  }
});

test('request body with ownerId is rejected as invalid', async () => {
  const custody = makeCustody();
  const { store } = fakeDocumentStore(childManifest);
  const server = await startFixture(custody, store);
  try {
    const before = custody.fetchCalls;
    const path = storytellerTaskCustodyEvidencePath(generationId);
    const response = await fetch(new URL(path, server.origin), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${executorToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        schemaVersion: storytellerTaskCustodyContractVersion,
        ownerId: 'forged-owner',
        storyId: childStory,
        rootHash: childRoot,
        rootRevision: 1,
        handles: [scene1Doc],
      }),
    });
    assert.equal(response.status, 400);
    assert.equal(custody.fetchCalls, before);
    const body = (await response.json()) as { code?: string };
    assert.equal(body.code, 'invalid');
  } finally {
    await server.close();
  }
});