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

const config = {
  origin: 'http://127.0.0.1:3000',
  secret: 'integration-only-not-a-runtime-secret-1234',
  githubClientId: 'client',
  githubClientSecret: 'secret',
};

test('auth options use GitHub and omit email/password', () => {
  const options = authOptions(database, config);
  assert.equal(options.socialProviders.github.clientId, 'client');
  assert.deepEqual(options.socialProviders.github.scope, ['user:email']);
  assert.equal(options.baseURL, 'http://127.0.0.1:3000');
  assert.equal(
    'emailAndPassword' in options && options.emailAndPassword !== undefined,
    false,
  );
  const serialized = JSON.stringify(options);
  assert.equal(serialized.includes('demo-password'), false);
  assert.equal(serialized.includes('poc-local-player'), false);
});
