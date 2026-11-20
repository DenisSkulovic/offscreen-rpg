import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyVersionHeader,
} from '@offscreen/contracts/storyteller-task-custody';
import type { StorytellerTaskCustodySeam } from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const storyToken = 'test-story-service-credential';
const executorToken = 'test-executor-only-credential';
const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const root = 'ab'.repeat(32);
const storyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function noopSeam() {
  return {
    async read() {
      return { storyId, view: 'snapshot' };
    },
    async startFromCandidate() {
      throw new Error('unexpected start');
    },
    async admitResolution() {
      return { receiptId: 'receipt-1' };
    },
  };
}

function memoryCustody(): StorytellerTaskCustodySeam & {
  claimCalls: number;
  saveCalls: number;
} {
  let claimCalls = 0;
  let saveCalls = 0;
  let claimedRoot: string | null | undefined;
  const attemptId = randomUUID();
  return {
    get claimCalls() {
      return claimCalls;
    },
    get saveCalls() {
      return saveCalls;
    },
    async fetchCommittedGeneration(id: string) {
      if (id !== generationId) {
        return { status: 'refused' as const, reason: 'unknown-generation' as const };
      }
      return {
        status: 'ready' as const,
        generationId: id,
        ownerId: 'owner-trusted',
        pinnedRoot: root,
        task: { kind: 'opening' },
      };
    },
    async claimGeneration(input) {
      claimCalls += 1;
      if (input.generationId !== generationId) {
        return { status: 'refused' as const, reason: 'unknown-generation' as const };
      }
      if (input.pinnedRoot !== root) {
        return { status: 'refused' as const, reason: 'root-mismatch' as const };
      }
      claimedRoot = input.pinnedRoot;
      return {
        status: 'claimed' as const,
        generationId: input.generationId,
        attemptId,
        created: true,
      };
    },
    async saveValidatedResult(input) {
      saveCalls += 1;
      if (input.generationId !== generationId) {
        return { status: 'refused' as const, reason: 'unknown-generation' as const };
      }
      if (input.pinnedRoot !== root) {
        return { status: 'refused' as const, reason: 'root-mismatch' as const };
      }
      if (claimedRoot === undefined) {
        return { status: 'refused' as const, reason: 'unclaimed' as const };
      }
      return {
        status: 'saved' as const,
        generationId: input.generationId,
        attemptId,
        resultHash: input.resultHash,
        result: input.result,
      };
    },
    async readValidatedResult(id: string) {
      if (id !== generationId) {
        return { status: 'refused' as const, reason: 'unknown-generation' as const };
      }
      if (claimedRoot === undefined) {
        return { status: 'unclaimed' as const, generationId: id };
      }
      return {
        status: 'claimed' as const,
        generationId: id,
        attemptId,
      };
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

test('executor credential serves custody only and refuses story writes', async () => {
  const custody = memoryCustody();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody,
    token: storyToken,
    executorToken,
    timeoutMs: 1000,
  });
  try {
    const task = await call(
      server.origin,
      `/internal/v1/storyteller-generations/${generationId}/task`,
      { token: executorToken },
    );
    assert.equal(task.status, 200);
    const taskBody = (await task.json()) as {
      status: string;
      ownerId?: string;
    };
    assert.equal(taskBody.status, 'ready');
    assert.equal(taskBody.ownerId, 'owner-trusted');
    assert.equal(
      task.headers.get(storytellerTaskCustodyVersionHeader),
      storytellerTaskCustodyContractVersion,
    );

    const storyRead = await call(
      server.origin,
      `/internal/v1/stories/${storyId}`,
      { token: executorToken, actor: 'owner-trusted' },
    );
    assert.equal(storyRead.status, 401);

    const storyWrite = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${randomUUID()}`,
      {
        method: 'PUT',
        token: executorToken,
        actor: 'owner-trusted',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedRevision: 1 }),
      },
    );
    assert.equal(storyWrite.status, 401);
  } finally {
    await server.close();
  }
});

test('story credential cannot reach custody routes', async () => {
  const custody = memoryCustody();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody,
    token: storyToken,
    executorToken,
    timeoutMs: 1000,
  });
  try {
    const denied = await call(
      server.origin,
      `/internal/v1/storyteller-generations/${generationId}/task`,
      { token: storyToken, actor: 'owner-trusted' },
    );
    assert.equal(denied.status, 401);
  } finally {
    await server.close();
  }
});

test('wrong pinned root refuses claim without mutating custody state', async () => {
  const custody = memoryCustody();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody,
    token: storyToken,
    executorToken,
    timeoutMs: 1000,
  });
  try {
    const wrongRoot = 'cd'.repeat(32);
    const claim = await call(
      server.origin,
      `/internal/v1/storyteller-generations/${generationId}/claim`,
      {
        method: 'PUT',
        token: executorToken,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: storytellerTaskCustodyContractVersion,
          pinnedRoot: wrongRoot,
        }),
      },
    );
    assert.equal(claim.status, 200);
    const claimBody = (await claim.json()) as {
      status: string;
      reason?: string;
    };
    assert.equal(claimBody.status, 'refused');
    assert.equal(claimBody.reason, 'root-mismatch');
    assert.equal(custody.claimCalls, 1);
    assert.equal(custody.saveCalls, 0);

    const readSaved = await call(
      server.origin,
      `/internal/v1/storyteller-generations/${generationId}/saved-result`,
      { token: executorToken },
    );
    assert.equal(readSaved.status, 200);
    const readSavedBody = (await readSaved.json()) as { status: string };
    assert.equal(readSavedBody.status, 'unclaimed');
  } finally {
    await server.close();
  }
});