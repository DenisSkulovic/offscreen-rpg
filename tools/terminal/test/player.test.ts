import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeStoredAuth } from '../src/auth-store.js';
import { createTerminalHttpClient, TerminalHttpError } from '../src/http.js';
import { loadBearerToken, whoami } from '../src/player.js';

test('loadBearerToken rejects expired local credentials', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-expired-'));
  const path = join(dir, 'auth.json');
  await writeStoredAuth(path, {
    apiOrigin: 'http://127.0.0.1:3000',
    token: 'expired-token',
    expiresAt: new Date(Date.now() - 1000).toISOString(),
    scope: 'player-story',
  });
  await assert.rejects(
    () => loadBearerToken(path),
    (error: unknown) => {
      assert.ok(error instanceof TerminalHttpError);
      assert.equal(error.code, 'token_expired');
      return true;
    },
  );
});

test('whoami fails on invalid bearer from API', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-invalid-'));
  const path = join(dir, 'auth.json');
  await writeStoredAuth(path, {
    apiOrigin: 'http://127.0.0.1:3000',
    token: 'invalid-bearer',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    scope: 'player-story',
  });
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ code: 'unauthorized' }), { status: 401 });
  const client = createTerminalHttpClient('http://127.0.0.1:3000', {
    fetchImpl,
  });
  await assert.rejects(
    () => whoami(client, path),
    (error: unknown) => error instanceof TerminalHttpError,
  );
});
