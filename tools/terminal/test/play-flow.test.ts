import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { writeStoredAuth } from '../src/auth-store.js';
import { pendingResolutionFilePath } from '../src/config.js';
import { createTerminalHttpClient } from '../src/http.js';
import {
  forkStoryAtSequence,
  submitStoryChoice,
  TerminalPlayerError,
} from '../src/player.js';
import {
  savePendingResolution,
  type FrozenResolutionEnvelope,
} from '../src/pending-intent.js';
import { historicalForkStoryId } from '../src/historical-fork-story-id.js';
import { digestResolutionRequest } from '../src/digest.js';
import { fixtureIds, makeStorySnapshot } from './fixtures.js';

const apiOrigin = 'http://127.0.0.1:3000';

async function authSetup(dir: string) {
  const authPath = join(dir, 'auth.json');
  await writeStoredAuth(authPath, {
    apiOrigin,
    token: fixtureIds.token,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    scope: 'player-story',
  });
  return authPath;
}

test('two scripted turns reuse one operation id after interrupted PUT', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-play-'));
  const authFilePath = await authSetup(dir);
  const storyId = fixtureIds.storyId;
  const turnOne = makeStorySnapshot({ revision: 3 });
  const turnTwo = makeStorySnapshot({
    revision: 4,
    interaction: {
      id: fixtureIds.interactionId,
      specification: {
        kind: 'choice.v1',
        prompt: 'Now what?',
        options: [{ id: 'leave', label: 'Leave' }],
      },
    },
  });
  const turnThree = makeStorySnapshot({
    revision: 5,
    interaction: null,
  });

  const putUrls: string[] = [];
  let putCalls = 0;
  let current = turnOne;

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/api/terminal-auth/tokens/current')) {
      return new Response(
        JSON.stringify({
          userId: fixtureIds.ownerId,
          displayName: 'Player',
          scope: 'player-story',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        { status: 200 },
      );
    }
    if (
      url.includes(`/api/stories/${storyId}`) &&
      !url.includes('/resolutions/')
    ) {
      if (init?.method === 'PUT') {
        return new Response('{}', { status: 404 });
      }
      return new Response(JSON.stringify(current), { status: 200 });
    }
    if (url.includes('/resolutions/') && init?.method === 'PUT') {
      putCalls += 1;
      putUrls.push(url);
      if (putCalls === 1) {
        return new Response('', { status: 503 });
      }
      if (putCalls === 2) {
        current = turnTwo;
        return new Response(JSON.stringify(turnTwo), { status: 200 });
      }
      current = turnThree;
      return new Response(JSON.stringify(turnThree), { status: 200 });
    }
    if (url.includes('/receipt')) {
      return new Response('', { status: 404 });
    }
    return new Response(JSON.stringify({ code: 'not_found' }), { status: 404 });
  };

  const client = createTerminalHttpClient(apiOrigin, { fetchImpl });

  await assert.rejects(
    () =>
      submitStoryChoice({
        client,
        authFilePath,
        apiOrigin,
        storyId,
        optionId: 'walk',
      }),
    (error: unknown) => error instanceof TerminalPlayerError,
  );

  const first = await submitStoryChoice({
    client,
    authFilePath,
    apiOrigin,
    storyId,
    optionId: 'walk',
  });
  assert.equal(first.snapshot.revision, 4);
  assert.equal(putUrls.length, 2);
  assert.equal(putUrls[0], putUrls[1]);

  const second = await submitStoryChoice({
    client,
    authFilePath,
    apiOrigin,
    storyId,
    optionId: 'leave',
  });
  assert.equal(second.snapshot.revision, 5);
});

test('wrong digest is refused when receipt disagrees with frozen request', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-digest-'));
  const authFilePath = await authSetup(dir);
  const storyId = fixtureIds.storyId;
  const operationId = randomUUID();
  const pendingPath = pendingResolutionFilePath(
    apiOrigin,
    fixtureIds.ownerId,
    storyId,
  );
  const body = {
    expectedRevision: 3,
    submission: {
      interactionId: fixtureIds.interactionId,
      answer: { kind: 'choice.v1', optionId: 'walk' },
    },
  };
  const envelope: FrozenResolutionEnvelope = {
    version: 1,
    kind: 'resolution',
    ownerId: fixtureIds.ownerId,
    storyId,
    operationId,
    endpoint: `/api/stories/${storyId}/resolutions/${operationId}`,
    body,
    requestDigest: digestResolutionRequest(body),
    createdAt: Date.now(),
  };
  await savePendingResolution(pendingPath, envelope);

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/tokens/current')) {
      return new Response(
        JSON.stringify({
          userId: fixtureIds.ownerId,
          displayName: 'Player',
          scope: 'player-story',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        { status: 200 },
      );
    }
    if (url.endsWith(`/api/stories/${storyId}`)) {
      return new Response(JSON.stringify(makeStorySnapshot()), { status: 200 });
    }
    if (url.includes('/receipt')) {
      return new Response(
        JSON.stringify({
          operationId,
          storyId,
          state: 'processing',
          viewVersion: 3,
          resolutionVersion: 1,
          reason: null,
          recovery: null,
          requestDigest: 'a'.repeat(64),
        }),
        { status: 200 },
      );
    }
    return new Response('{}', { status: 404 });
  };

  const client = createTerminalHttpClient(apiOrigin, { fetchImpl });
  await assert.rejects(
    () =>
      submitStoryChoice({
        client,
        authFilePath,
        apiOrigin,
        storyId,
        optionId: 'walk',
      }),
    (error: unknown) => {
      assert.ok(error instanceof TerminalPlayerError);
      assert.equal(error.code, 'digest_mismatch');
      return true;
    },
  );
});

test('stale revision returns explicit refusal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-stale-'));
  const authFilePath = await authSetup(dir);
  const storyId = fixtureIds.storyId;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/tokens/current')) {
      return new Response(
        JSON.stringify({
          userId: fixtureIds.ownerId,
          displayName: 'Player',
          scope: 'player-story',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        { status: 200 },
      );
    }
    if (url.endsWith(`/api/stories/${storyId}`)) {
      return new Response(JSON.stringify(makeStorySnapshot()), { status: 200 });
    }
    if (url.includes('/resolutions/') && init?.method === 'PUT') {
      return new Response('{}', { status: 409 });
    }
    if (url.includes('/receipt')) {
      return new Response('', { status: 404 });
    }
    return new Response('{}', { status: 404 });
  };
  const client = createTerminalHttpClient(apiOrigin, { fetchImpl });
  await assert.rejects(
    () =>
      submitStoryChoice({
        client,
        authFilePath,
        apiOrigin,
        storyId,
        optionId: 'walk',
      }),
    (error: unknown) => {
      assert.ok(error instanceof TerminalPlayerError);
      assert.equal(error.code, 'stale_revision');
      return true;
    },
  );
});

test('fork uses stable derived story id', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-fork-'));
  const authFilePath = await authSetup(dir);
  const sourceStoryId = fixtureIds.storyId;
  const sequence = 2;
  const forkStoryId = historicalForkStoryId(sourceStoryId, sequence);
  const forkSnapshot = makeStorySnapshot({ id: forkStoryId, revision: 1 });

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/tokens/current')) {
      return new Response(
        JSON.stringify({
          userId: fixtureIds.ownerId,
          displayName: 'Player',
          scope: 'player-story',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        { status: 200 },
      );
    }
    if (url.includes(`/scenes/${sequence}`)) {
      return new Response(
        JSON.stringify({
          ...makeStorySnapshot(),
          asOfSequence: sequence,
          checkpointHash: 'a'.repeat(64),
          canon: { rootHash: null, rootRevision: 0 },
          canRespond: false,
        }),
        { status: 200 },
      );
    }
    if (url.includes(`/forks/${forkStoryId}`) && init?.method === 'PUT') {
      return new Response(JSON.stringify(forkSnapshot), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };

  const client = createTerminalHttpClient(apiOrigin, { fetchImpl });
  const result = await forkStoryAtSequence({
    client,
    authFilePath,
    sourceStoryId,
    sequence,
  });
  assert.equal(result.forkStoryId, forkStoryId);
  assert.equal(result.snapshot.id, forkStoryId);
});
