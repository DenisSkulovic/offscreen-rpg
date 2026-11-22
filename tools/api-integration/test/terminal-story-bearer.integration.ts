import assert from 'node:assert/strict';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
} from 'node:crypto';
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
import { createChamber } from '@offscreen/lab-support';
import { requireCookie } from './helpers/require.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

const pairingSecret = 'integration-only-not-a-runtime-secret-1234';
const origin = 'http://127.0.0.1:3199';
const clientIp = `198.51.100.${randomInt(1, 250)}`;

function sourceIpHash(ip: string): string {
  return createHmac('sha256', pairingSecret).update(ip, 'utf8').digest('hex');
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

type AppContext = {
  database: Database;
  cookie: string;
  otherCookie: string;
  user: { id: string; name: string; email: string };
  otherUser: { id: string; name: string; email: string };
  apiOrigin: string;
};

async function purgeOwnedStories(
  database: Database,
  ownerIds: readonly string[],
) {
  for (const ownerId of ownerIds) {
    await database.db.$client.query(
      'DELETE FROM story_scene_checkpoint WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
      [ownerId],
    );
    await database.db.$client.query(
      'DELETE FROM story_passage WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
      [ownerId],
    );
    await database.db.$client.query(
      'DELETE FROM story_item WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
      [ownerId],
    );
    await database.db.$client.query('DELETE FROM story WHERE owner_id = $1', [
      ownerId,
    ]);
  }
}

async function withStoryBearerApp(run: (context: AppContext) => Promise<void>) {
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
  const helpers = (await auth.$context).test as Awaited<
    ReturnType<typeof utilities.init>
  >['context']['test'];
  const user = await helpers.saveUser(
    helpers.createUser({ name: 'Bearer Owner' }),
  );
  const otherUser = await helpers.saveUser(
    helpers.createUser({ name: 'Other Owner' }),
  );
  try {
    await database.db.$client.query(
      'DELETE FROM terminal_access_token WHERE user_id = ANY($1::text[])',
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      'DELETE FROM terminal_device_pairing WHERE owner_id = ANY($1::text[]) OR source_ip_hash = $2',
      [[user.id, otherUser.id], sourceIpHash(clientIp)],
    );
    await app.listen(3199, '127.0.0.1');
    const login = await helpers.login({ userId: user.id });
    const otherLogin = await helpers.login({ userId: otherUser.id });
    await run({
      database,
      cookie: requireCookie(login.headers),
      otherCookie: requireCookie(otherLogin.headers),
      user,
      otherUser,
      apiOrigin: origin,
    });
  } finally {
    await purgeOwnedStories(database, [user.id, otherUser.id]);
    await database.db.$client.query(
      'DELETE FROM terminal_access_token WHERE user_id = ANY($1::text[])',
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      'DELETE FROM terminal_device_pairing WHERE owner_id = ANY($1::text[]) OR source_ip_hash = $2',
      [[user.id, otherUser.id], sourceIpHash(clientIp)],
    );
    await helpers.deleteUser(user.id);
    await helpers.deleteUser(otherUser.id);
    await app.close();
    await database.close();
  }
}

async function mintBearerToken(apiOrigin: string, cookie: string) {
  const verifier = randomBytes(32);
  const challengeSha256 = sha256Hex(verifier);
  const create = await fetch(`${apiOrigin}/api/terminal-auth/pairings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: apiOrigin,
      'x-offscreen-client-ip': clientIp,
    },
    body: JSON.stringify({ challengeSha256, label: 'bearer-proof-cli' }),
  });
  assert.equal(create.status, 201);
  const created = (await create.json()) as { pairingId: string; code: string };
  const consent = await fetch(
    `${apiOrigin}/api/terminal-auth/pairings/${created.pairingId}/consent`,
    { headers: { cookie } },
  );
  assert.equal(consent.status, 200);
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
  const exchange = await fetch(
    `${apiOrigin}/api/terminal-auth/pairings/${created.pairingId}/exchange`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: apiOrigin,
      },
      body: JSON.stringify({ verifier: verifier.toString('base64url') }),
    },
  );
  assert.equal(exchange.status, 201);
  const body = (await exchange.json()) as { token: string };
  return body.token;
}

test(
  'CL01 T02: story-only terminal bearer',
  { concurrency: false },
  async (t) => {
    await withStoryBearerApp(
      async ({ apiOrigin, cookie, otherCookie, user, otherUser, database }) => {
        const token = await mintBearerToken(apiOrigin, cookie);
        const bearer = { authorization: `Bearer ${token}` };

        await t.test('browser consent lists pairing metadata', async () => {
          const verifier = randomBytes(32);
          const create = await fetch(
            `${apiOrigin}/api/terminal-auth/pairings`,
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                origin: apiOrigin,
                'x-offscreen-client-ip': clientIp,
              },
              body: JSON.stringify({
                challengeSha256: sha256Hex(verifier),
                label: 'consent-surface',
              }),
            },
          );
          const created = (await create.json()) as { pairingId: string };
          const consent = await fetch(
            `${apiOrigin}/api/terminal-auth/pairings/${created.pairingId}/consent`,
            { headers: { cookie } },
          );
          assert.equal(consent.status, 200);
          const consentBody = (await consent.json()) as {
            pairingId: string;
            clientLabel: string;
            pairingExpiresAt: string;
            accessDurationDays: number;
            scope: string;
          };
          assert.deepEqual(consentBody, {
            pairingId: created.pairingId,
            clientLabel: 'consent-surface',
            pairingExpiresAt: consentBody.pairingExpiresAt,
            accessDurationDays: 7,
            scope: 'player-story',
          });
        });

        await t.test('bearer reads own stories', async () => {
          const list = await fetch(`${apiOrigin}/api/stories`, {
            headers: bearer,
          });
          assert.equal(list.status, 200);
          const body = (await list.json()) as { items?: unknown };
          assert.ok(Array.isArray(body.items));
        });

        await t.test('Admin and Drafts refuse terminal bearer', async () => {
          const admin = await fetch(`${apiOrigin}/api/admin/me`, {
            headers: bearer,
          });
          assert.equal(admin.status, 401);
          const drafts = await fetch(`${apiOrigin}/api/drafts`, {
            headers: bearer,
          });
          assert.equal(drafts.status, 401);
        });

        await t.test('cookie and bearer together are ambiguous', async () => {
          const ambiguous = await fetch(`${apiOrigin}/api/stories`, {
            headers: { ...bearer, cookie },
          });
          assert.equal(ambiguous.status, 401);
          const body = (await ambiguous.json()) as { code?: string };
          assert.equal(body.code, 'ambiguous_credentials');
        });

        await t.test('wrong Origin on writes is rejected', async () => {
          const operationId = randomUUID();
          const launch = await fetch(
            `${apiOrigin}/api/stories/launch/${operationId}`,
            {
              method: 'PUT',
              headers: {
                ...bearer,
                origin: 'https://evil.example',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                operationId,
                prompt: 'Should not launch',
              }),
            },
          );
          assert.equal(launch.status, 403);
          assert.deepEqual(await launch.json(), { code: 'invalid_origin' });
        });

        await t.test('cross-owner story reads are denied', async () => {
          const chamber = createChamber(database);
          const storyId = randomUUID();
          await chamber.start({
            ownerId: otherUser.id,
            storyId,
            scenario: 'chamber.v5',
          });
          const denied = await fetch(`${apiOrigin}/api/stories/${storyId}`, {
            headers: bearer,
          });
          assert.equal(denied.status, 404);
        });

        await t.test(
          'revoked bearer is refused on stories (SSE recheck uses the same resolver)',
          async () => {
            const revoke = await fetch(
              `${apiOrigin}/api/terminal-auth/tokens/current`,
              {
                method: 'DELETE',
                headers: { ...bearer, origin: apiOrigin },
              },
            );
            assert.equal(revoke.status, 204);
            const denied = await fetch(`${apiOrigin}/api/stories`, {
              headers: bearer,
            });
            assert.equal(denied.status, 401);
          },
        );

        void user;
        void otherCookie;
      },
    );
  },
);
