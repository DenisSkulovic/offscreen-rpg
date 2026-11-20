import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { betterAuth } from 'better-auth';
import { createApp } from '@offscreen/api/app';
import { authOptions } from '@offscreen/api/auth';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

function sessionCookieFrom(response: Response): string | null {
  const raw = response.headers.getSetCookie?.() ?? [];
  const line = raw.find((entry) => entry.includes('session_token='));
  if (!line) return null;
  return line.split(';', 1)[0] ?? null;
}

function randomPassword() {
  return randomBytes(18).toString('base64url');
}

async function deleteAuthRowsForEmail(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  email: string,
) {
  await client.query(
    `DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)`,
    [email],
  );
  await client.query(
    `DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)`,
    [email],
  );
  await client.query(`DELETE FROM "user" WHERE email = $1`, [email]);
}

test('local demo email/password sign-up and sign-in through HTTP', async () => {
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    fileURLToPath(
      new URL('../../../../packages/db/migrations', import.meta.url),
    ),
  );
  const database = createDatabase(config, () => {});
  const auth = betterAuth({
    ...authOptions(database, {
      origin: 'http://127.0.0.1',
      secret: 'integration-only-not-a-runtime-secret-1234',
      githubClientId: '',
      githubClientSecret: '',
      pocOpenAccess: false,
      localDemoAuth: true,
    }),
    rateLimit: { enabled: false },
  });
  const app = await createApp(database, auth, 'http://127.0.0.1');
  const email = `local-demo-${randomUUID()}@example.com`;
  const password = randomPassword();
  try {
    await app.listen(0, '127.0.0.1');
    const bound = await app.getUrl();
    const origin = 'http://127.0.0.1';

    const signUp = await fetch(`${bound}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({
        name: 'Local Demo User',
        email,
        password,
      }),
    });
    assert.equal(signUp.status, 200);
    const signUpCookie = sessionCookieFrom(signUp);
    assert.ok(signUpCookie, 'expected a session cookie after sign-up');

    const me = await fetch(`${bound}/api/me`, {
      headers: { cookie: signUpCookie },
    });
    assert.equal(me.status, 200);
    const identity = (await me.json()) as { email: string };
    assert.equal(identity.email, email);

    const wrongPassword = await fetch(`${bound}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({
        email,
        password: randomPassword(),
      }),
    });
    assert.notEqual(wrongPassword.status, 200);
    const badCookie = sessionCookieFrom(wrongPassword);
    if (badCookie) {
      assert.notEqual(
        (await fetch(`${bound}/api/me`, { headers: { cookie: badCookie } }))
          .status,
        200,
      );
    }

    const csrf = await fetch(`${bound}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(csrf.status, 403);
  } finally {
    await deleteAuthRowsForEmail(database.db.$client, email);
    await app.close();
    await database.close();
  }
});