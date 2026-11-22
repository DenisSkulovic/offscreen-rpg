import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { createApp } from '@offscreen/api/app';
import { authOptions } from '@offscreen/api/auth';
import { requireCookie } from './helpers/require.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

const pairingSecret = 'integration-only-not-a-runtime-secret-1234';
const origin = 'http://127.0.0.1:3198';
const clientIp = `203.0.113.${randomInt(1, 250)}`;

function sourceIpHash(ip: string): string {
  return createHmac('sha256', pairingSecret).update(ip).digest('hex');
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function withTerminalAuthApp(
  run: (context: {
    database: Database;
    cookie: string;
    user: { id: string; name: string; email: string };
    apiOrigin: string;
  }) => Promise<void>,
) {
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    fileURLToPath(
      new URL('../../../../packages/db/migrations', import.meta.url),
    ),
  );
  const database = createDatabase(config, () => {});
  const utilities = testUtils();
  const strictUtilities = {
    ...utilities,
    init(context: Parameters<typeof utilities.init>[0]) {
      const result = utilities.init(context);
      return { ...result, options: result.options ?? {} };
    },
  };
  const auth = betterAuth({
    ...authOptions(database, {
      origin,
      secret: pairingSecret,
      githubClientId: 'test-client',
      githubClientSecret: 'test-secret',
    }),
    plugins: [strictUtilities],
  });
  const app = await createApp(database, auth, origin, {
    terminalPairingHmacSecret: pairingSecret,
  });
  // Better Auth testUtils typing is looser than the plugin registry at compile time.
  const helpers = (await auth.$context).test as Awaited<
    ReturnType<typeof utilities.init>
  >['context']['test'];
  const user = await helpers.saveUser(
    helpers.createUser({ name: 'Terminal Player' }),
  );
  try {
    await app.listen(3198, '127.0.0.1');
    const login = await helpers.login({ userId: user.id });
    const cookie = requireCookie(login.headers);
    await run({ database, cookie, user, apiOrigin: origin });
  } finally {
    await database.db.$client.query(
      'DELETE FROM terminal_access_token WHERE user_id = $1',
      [user.id],
    );
    await database.db.$client.query(
      `DELETE FROM terminal_device_pairing WHERE owner_id = $1 OR source_ip_hash = $2`,
      [user.id, sourceIpHash(clientIp)],
    );
    await helpers.deleteUser(user.id);
    await app.close();
    await database.close();
  }
}

async function createApprovedPairing(
  apiOrigin: string,
  cookie: string,
  verifier: Buffer,
) {
  const challengeSha256 = sha256Hex(verifier);
  const create = await fetch(`${apiOrigin}/api/terminal-auth/pairings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: apiOrigin,
      'x-offscreen-client-ip': clientIp,
    },
    body: JSON.stringify({
      challengeSha256,
      label: 'integration-cli',
    }),
  });
  assert.equal(create.status, 201);
  const created = (await create.json()) as {
    pairingId: string;
    code: string;
  };
  const approve = await fetch(
    `${apiOrigin}/api/terminal-auth/pairings/${created.pairingId}/approve`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: apiOrigin,
        cookie,
      },
      body: JSON.stringify({ userCode: created.code }),
    },
  );
  assert.equal(approve.status, 204);
  return { ...created, verifierBase64url: verifier.toString('base64url') };
}

test(
  'CL01 T01: terminal device pairing and token exchange',
  { concurrency: false },
  async (t) => {
    await withTerminalAuthApp(async ({ database, cookie, user, apiOrigin }) => {
      const verifier = randomBytes(32);

      await t.test(
        'pairing creation fails closed without HMAC secret',
        async () => {
          const bareDatabase = createDatabase(
            readDatabaseConfig({ DATABASE_URL: databaseURL }),
            () => {},
          );
          const utilities = testUtils();
          const strictUtilities = {
            ...utilities,
            init(context: Parameters<typeof utilities.init>[0]) {
              const result = utilities.init(context);
              return { ...result, options: result.options ?? {} };
            },
          };
          const auth = betterAuth({
            ...authOptions(bareDatabase, {
              origin: apiOrigin,
              secret: pairingSecret,
              githubClientId: 'test-client',
              githubClientSecret: 'test-secret',
            }),
            plugins: [strictUtilities],
          });
          const noSecretOrigin = 'http://127.0.0.1:3197';
          const app = await createApp(bareDatabase, auth, noSecretOrigin);
          await app.listen(3197, '127.0.0.1');
          try {
            const response = await fetch(
              `${noSecretOrigin}/api/terminal-auth/pairings`,
              {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  origin: noSecretOrigin,
                },
                body: JSON.stringify({
                  challengeSha256: sha256Hex(randomBytes(32)),
                  label: 'denied',
                }),
              },
            );
            assert.equal(response.status, 503);
          } finally {
            await app.close();
            await bareDatabase.close();
          }
        },
      );

      await t.test('owner approval and one-time exchange', async () => {
        const pairing = await createApprovedPairing(
          apiOrigin,
          cookie,
          verifier,
        );
        const exchange = await fetch(
          `${apiOrigin}/api/terminal-auth/pairings/${pairing.pairingId}/exchange`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              origin: apiOrigin,
            },
            body: JSON.stringify({ verifier: pairing.verifierBase64url }),
          },
        );
        assert.equal(exchange.status, 201);
        const body = (await exchange.json()) as {
          token: string;
          scope: string;
          expiresAt: string;
        };
        assert.equal(body.scope, 'player-story');
        const whoami = await fetch(
          `${apiOrigin}/api/terminal-auth/tokens/current`,
          {
            headers: { authorization: `Bearer ${body.token}` },
          },
        );
        assert.equal(whoami.status, 200);
        assert.deepEqual(await whoami.json(), {
          userId: user.id,
          displayName: user.name,
          scope: 'player-story',
          expiresAt: body.expiresAt,
        });
      });

      await t.test('wrong pairing code is refused uniformly', async () => {
        const challengeSha256 = sha256Hex(randomBytes(32));
        const create = await fetch(`${apiOrigin}/api/terminal-auth/pairings`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: apiOrigin,
            'x-offscreen-client-ip': clientIp,
          },
          body: JSON.stringify({ challengeSha256, label: 'wrong-code' }),
        });
        const created = (await create.json()) as { pairingId: string };
        const approve = await fetch(
          `${apiOrigin}/api/terminal-auth/pairings/${created.pairingId}/approve`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              origin: apiOrigin,
              cookie,
            },
            body: JSON.stringify({ userCode: '0000000000' }),
          },
        );
        assert.equal(approve.status, 404);
      });

      await t.test(
        'ten concurrent exchanges yield exactly one token',
        async () => {
          await database.db.$client.query(
            'DELETE FROM terminal_access_token WHERE user_id = $1',
            [user.id],
          );
          const localVerifier = randomBytes(32);
          const pairing = await createApprovedPairing(
            apiOrigin,
            cookie,
            localVerifier,
          );
          const attempts = await Promise.all(
            Array.from({ length: 10 }, () =>
              fetch(
                `${apiOrigin}/api/terminal-auth/pairings/${pairing.pairingId}/exchange`,
                {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                    origin: apiOrigin,
                  },
                  body: JSON.stringify({
                    verifier: pairing.verifierBase64url,
                  }),
                },
              ),
            ),
          );
          const successes = attempts.filter(
            (response) => response.status === 201,
          );
          const conflicts = attempts.filter(
            (response) => response.status === 409,
          );
          assert.equal(successes.length, 1);
          assert.equal(conflicts.length, 9);
          const tokenRows = await database.db.$client.query<{ count: string }>(
            'SELECT count(*)::text AS count FROM terminal_access_token WHERE user_id = $1',
            [user.id],
          );
          assert.equal(Number(tokenRows.rows[0]?.count ?? '0'), 1);
        },
      );

      await t.test('expired pairing is refused', async () => {
        const expiredVerifier = randomBytes(32);
        const pairing = await createApprovedPairing(
          apiOrigin,
          cookie,
          expiredVerifier,
        );
        await database.db.$client.query(
          `UPDATE terminal_device_pairing SET expires_at = now() - interval '1 minute' WHERE id = $1`,
          [pairing.pairingId],
        );
        const exchange = await fetch(
          `${apiOrigin}/api/terminal-auth/pairings/${pairing.pairingId}/exchange`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              origin: apiOrigin,
            },
            body: JSON.stringify({ verifier: pairing.verifierBase64url }),
          },
        );
        assert.equal(exchange.status, 410);
      });

      await t.test('no raw token or pairing code is persisted', async () => {
        const rows = await database.db.$client.query<{
          code_hash: string;
          challenge_sha256: string;
          token_hash: string | null;
        }>(
          `SELECT p.code_hash, p.challenge_sha256, t.token_hash
         FROM terminal_device_pairing p
         LEFT JOIN terminal_access_token t ON t.user_id = p.owner_id`,
        );
        const hex = /^[0-9a-f]{64}$/;
        for (const row of rows.rows) {
          assert.match(row.code_hash, hex);
          assert.match(row.challenge_sha256, hex);
          if (row.token_hash) {assert.match(row.token_hash, hex);}
        }
      });
    });
  },
);
