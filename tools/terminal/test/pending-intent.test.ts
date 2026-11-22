import assert from 'node:assert/strict';
import { chmod, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  PendingIntentError,
  loadPendingResolution,
  savePendingResolution,
} from '../src/pending-intent.js';

test('pending resolution state file uses mode 0600', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-pending-'));
  const path = join(dir, 'pending-resolution.json');
  const operationId = randomUUID();
  const storyId = randomUUID();
  await savePendingResolution(path, {
    version: 1,
    kind: 'resolution',
    ownerId: 'owner-1',
    storyId,
    operationId,
    endpoint: '/api/stories/x/resolutions/y',
    body: {
      expectedRevision: 1,
      submission: {
        interactionId: randomUUID(),
        answer: { kind: 'choice.v1', optionId: 'walk' },
      },
    },
    requestDigest: 'a'.repeat(64),
    createdAt: Date.now(),
  });
  const loaded = await loadPendingResolution(path, 'owner-1', storyId);
  assert.ok(loaded);
  assert.equal(loaded.operationId, operationId);
});

test('loadPendingResolution rejects symlinked state path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-symlink-'));
  const real = join(dir, 'real.json');
  const link = join(dir, 'pending-resolution.json');
  await writeFile(real, '{}', 'utf8');
  await chmod(real, 0o600);
  await symlink(real, link);
  await assert.rejects(
    () => loadPendingResolution(link, 'owner-1', randomUUID()),
    (error: unknown) => error instanceof PendingIntentError,
  );
});
