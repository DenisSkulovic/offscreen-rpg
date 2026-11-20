import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '@offscreen/api/app';
import { betterAuth } from 'better-auth';
import { authOptions } from '@offscreen/api/auth';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';

test('email sign-in stays unavailable when local demo auth is disabled', async () => {
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: 'postgresql://localhost/auth_email_disabled_unused',
    }),
    () => {},
  );
  const origin = 'http://localhost:3000';
  const auth = betterAuth({
    ...authOptions(database, {
      origin,
      secret: 'integration-only-not-a-runtime-secret-1234',
      githubClientId: 'client',
      githubClientSecret: 'secret',
      pocOpenAccess: false,
      localDemoAuth: false,
    }),
    rateLimit: { enabled: false },
  });
  const app = await createApp(database, auth, origin);
  try {
    await app.listen(0, '127.0.0.1');
    const bound = await app.getUrl();
    const rejected = await fetch(`${bound}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'wrong-password-value',
      }),
    });
    assert.notEqual(rejected.status, 200);
    const csrf = await fetch(`${bound}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'wrong-password-value',
      }),
    });
    assert.equal(csrf.status, 403);
    const anonymous = await fetch(`${bound}/api/me`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});