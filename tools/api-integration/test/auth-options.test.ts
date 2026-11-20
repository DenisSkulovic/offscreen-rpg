import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authOptions } from '@offscreen/api/auth';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';

const database = createDatabase(
  readDatabaseConfig({
    DATABASE_URL: 'postgresql://localhost/auth_options_unused',
  }),
  () => {},
);

test('non-demo auth options keep GitHub and omit email/password', () => {
  const options = authOptions(database, {
    origin: 'http://localhost:3000',
    secret: 'integration-only-not-a-runtime-secret-1234',
    githubClientId: 'client',
    githubClientSecret: 'secret',
    pocOpenAccess: false,
    localDemoAuth: false,
  });
  assert.ok(options.socialProviders?.github);
  assert.equal(options.emailAndPassword, undefined);
});

test('demo auth options enable email/password without embedded passwords', () => {
  const options = authOptions(database, {
    origin: 'http://localhost:3000',
    secret: 'integration-only-not-a-runtime-secret-1234',
    githubClientId: '',
    githubClientSecret: '',
    pocOpenAccess: false,
    localDemoAuth: true,
  });
  assert.equal(options.emailAndPassword?.enabled, true);
  assert.equal(options.emailAndPassword?.disableSignUp, false);
  assert.equal(options.socialProviders, undefined);
  const serialized = JSON.stringify(options);
  assert.ok(!serialized.includes('demo-password'));
  assert.ok(!serialized.match(/"password"\s*:\s*"/));
});

test('demo auth options keep github when both credentials are present', () => {
  const options = authOptions(database, {
    origin: 'http://localhost:3000',
    secret: 'integration-only-not-a-runtime-secret-1234',
    githubClientId: 'client',
    githubClientSecret: 'secret',
    pocOpenAccess: false,
    localDemoAuth: true,
  });
  assert.equal(options.emailAndPassword?.enabled, true);
  assert.ok(options.socialProviders?.github);
});