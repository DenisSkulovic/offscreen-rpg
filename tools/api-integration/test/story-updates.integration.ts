import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { TestContext } from 'node:test';
import {
  storySnapshotSchema,
  storyUpdateHintSchema,
} from '@offscreen/contracts/stories';
import { incrementStoryViewVersion } from '@offscreen/application/stories';
import { registerStoryConcern } from './helpers/story-suite.js';
import { prepareCurrentCandidate } from './story-start.integration.js';

type Args = {
  t: TestContext;
  database: import('@offscreen/db').Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
};

async function readSseHint(
  response: Response,
  timeoutMs = 5000,
): Promise<unknown> {
  assert.ok(response.body, 'SSE response has a body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const result = await Promise.race([
        reader.read(),
        delay(remaining).then(() => ({
          done: true as const,
          value: undefined,
        })),
      ]);
      if (result.done) {
        break;
      }
      buffer += decoder.decode(result.value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const dataLine = block
          .split('\n')
          .find((line) => line.startsWith('data:'));
        const eventLine = block
          .split('\n')
          .find((line) => line.startsWith('event:'));
        if (!dataLine) {
          continue;
        }
        if (eventLine?.includes('heartbeat')) {
          continue;
        }
        return JSON.parse(dataLine.slice('data:'.length).trim());
      }
    }
    throw new Error('Timed out waiting for story-update SSE hint');
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function checkStoryUpdates(args: Args) {
  const { t, database, owner, origin, cookie, otherCookie } = args;

  await t.test(
    'owner SSE receives committed-view hint after viewVersion write',
    async () => {
      const prepared = await prepareCurrentCandidate(origin, cookie);
      const storyId = randomUUID();
      const started = await fetch(`${origin}/api/stories/${storyId}/start`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin,
        },
        body: JSON.stringify({
          candidateId: prepared.candidateId,
          expectedDraftRevision: 1,
        }),
      });
      assert.equal(started.status, 200);
      const snapshot = storySnapshotSchema.parse(await started.json());
      const nextVersion = snapshot.viewVersion + 1;

      const stream = await fetch(`${origin}/api/stories/${storyId}/updates`, {
        headers: {
          cookie,
          accept: 'text/event-stream',
        },
      });
      assert.equal(stream.status, 200);
      assert.match(
        stream.headers.get('content-type') ?? '',
        /text\/event-stream/i,
      );

      const hintPromise = readSseHint(stream);
      await database.db.transaction(async (tx) => {
        await incrementStoryViewVersion(tx, {
          storyId,
          viewVersion: nextVersion,
        });
      });
      const hint = storyUpdateHintSchema.parse(await hintPromise);
      assert.equal(hint.storyId, storyId);
      assert.equal(hint.viewVersion, nextVersion);
      assert.equal(hint.kind, 'committed-view');
      assert.equal(
        'paragraphs' in (hint as object) || 'candidate' in (hint as object),
        false,
      );
    },
  );

  await t.test(
    'anonymous and other owners cannot subscribe (negative)',
    async () => {
      const prepared = await prepareCurrentCandidate(origin, cookie);
      const storyId = randomUUID();
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/start`, {
            method: 'PUT',
            headers: {
              'content-type': 'application/json',
              cookie,
              origin,
            },
            body: JSON.stringify({
              candidateId: prepared.candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        200,
      );

      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/updates`, {
            headers: { accept: 'text/event-stream' },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/updates`, {
            headers: {
              cookie: otherCookie,
              accept: 'text/event-stream',
            },
          })
        ).status,
        404,
      );
      void owner;
    },
  );
}

registerStoryConcern(
  import.meta.url,
  'story SSE committed-view hints',
  (args) => checkStoryUpdates(args),
);
