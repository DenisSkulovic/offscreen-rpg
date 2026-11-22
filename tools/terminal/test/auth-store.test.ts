import assert from 'node:assert/strict';
import { chmod, symlink } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  AuthStoreError,
  readStoredAuth,
  writeStoredAuth,
  type StoredTerminalAuth,
} from '../src/auth-store.js';

const sampleAuth = (): StoredTerminalAuth => ({
  apiOrigin: 'http://127.0.0.1:3000',
  token: 'unit-test-token-not-real',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  scope: 'player-story',
});

test('writeStoredAuth persists owner-only mode 0600', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-auth-'));
  const path = join(dir, 'auth.json');
  await writeStoredAuth(path, sampleAuth());
  const stored = await readStoredAuth(path);
  assert.deepEqual(stored?.scope, 'player-story');
  const reopened = await import('node:fs/promises').then((fs) => fs.stat(path));
  assert.equal(reopened.mode & 0o777, 0o600);
});

test('readStoredAuth refuses symlinked credential files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-symlink-'));
  const real = join(dir, 'real.json');
  const link = join(dir, 'link.json');
  await writeStoredAuth(real, sampleAuth());
  await symlink(real, link);
  await assert.rejects(
    () => readStoredAuth(link),
    (error: unknown) => {
      assert.ok(error instanceof AuthStoreError);
      assert.match(error.message, /symlink/i);
      return true;
    },
  );
});

test('readStoredAuth refuses loose file permissions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-mode-'));
  const path = join(dir, 'auth.json');
  await writeStoredAuth(path, sampleAuth());
  await chmod(path, 0o644);
  await assert.rejects(
    () => readStoredAuth(path),
    (error: unknown) => {
      assert.ok(error instanceof AuthStoreError);
      assert.match(error.message, /0600/);
      return true;
    },
  );
});
