import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createPairingVerifier,
  formatLoginSuccess,
  runLogin,
} from '../src/login.js';
import {
  createTerminalHttpClient,
  type TerminalHttpClient,
} from '../src/http.js';
import { readStoredAuth } from '../src/auth-store.js';

test('createPairingVerifier derives 32-byte challenge', () => {
  const verifier = createPairingVerifier();
  assert.match(verifier.challengeSha256, /^[0-9a-f]{64}$/);
  assert.match(verifier.verifierBase64url, /^[A-Za-z0-9_-]+$/);
});

test('approved pairing stores token without printing it', async () => {
  const apiOrigin = 'http://127.0.0.1:3999';
  const issuedToken = 'mock-issued-terminal-token-value';
  let exchangeCalls = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (
      url.endsWith('/api/terminal-auth/pairings') &&
      init?.method === 'POST'
    ) {
      return Response.json({
        pairingId: '00000000-0000-4000-8000-000000000001',
        code: 'ABCDEFGHJK',
        verificationUri: 'http://127.0.0.1:3999/terminal/connect?id=1',
        expiry: new Date(Date.now() + 60_000).toISOString(),
        pollAfterSeconds: 2,
      });
    }
    if (url.includes('/exchange')) {
      exchangeCalls += 1;
      if (exchangeCalls < 2) {
        return new Response(JSON.stringify({ code: 'pairing_pending' }), {
          status: 202,
        });
      }
      return Response.json({
        token: issuedToken,
        scope: 'player-story',
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
    }
    return new Response('not found', { status: 404 });
  };
  const client = createTerminalHttpClient(apiOrigin, { fetchImpl });
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-login-'));
  const authPath = join(dir, 'auth.json');
  const stdout: string[] = [];
  const result = await runLogin({
    client,
    label: 'Test CLI',
    authFilePath: authPath,
    sleep: async () => {},
    openVerificationUri: async () => {},
    onAwaitingApproval: (pairing) => {
      stdout.push(formatLoginSuccess({ pairing, displayCode: pairing.code }));
    },
  });
  const stored = await readStoredAuth(authPath);
  assert.equal(stored?.token, issuedToken);
  assert.equal(result.issued.token, issuedToken);
  const output = stdout.join('\n');
  assert.doesNotMatch(output, new RegExp(issuedToken));
  assert.match(output, /ABCDEFGHJK/);
});

function mockWhoamiClient(): TerminalHttpClient {
  const base = createTerminalHttpClient('http://127.0.0.1:3000');
  return {
    ...base,
    async readCurrentToken() {
      return {
        userId: 'user-1',
        displayName: 'Nerevarine',
        scope: 'player-story',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      };
    },
    async listStories() {
      return { items: [], nextBefore: null };
    },
  } as TerminalHttpClient;
}

test('whoami path is covered via player in integration-style mock', async () => {
  const { whoami } = await import('../src/player.js');
  const dir = await mkdtemp(join(tmpdir(), 'offscreen-terminal-whoami-'));
  const authPath = join(dir, 'auth.json');
  const { writeStoredAuth } = await import('../src/auth-store.js');
  await writeStoredAuth(authPath, {
    apiOrigin: 'http://127.0.0.1:3000',
    token: 'whoami-bearer',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    scope: 'player-story',
  });
  const client = mockWhoamiClient();
  const result = await whoami(client, authPath);
  assert.equal(result.profile.displayName, 'Nerevarine');
});
