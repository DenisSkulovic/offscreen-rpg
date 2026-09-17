import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { createAuth } from '../src/auth/auth.js';

test('API binds a real HTTP listener and closes cleanly', async () => {
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: 'postgresql://localhost/bootstrap_unused',
    }),
    () => {},
  );
  const auth = createAuth(database, {
    origin: 'http://localhost:3000',
    secret: 'bootstrap-only-placeholder-secret-1234',
    githubClientId: 'test',
    githubClientSecret: 'test',
  });
  const app = await createApp(database, auth);
  try {
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    const response = await fetch(`${origin}/api/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal((await fetch(`${origin}/health/live`)).status, 404);
  } finally {
    await app.close();
  }
});

test('configuration rejects invalid ports without echoing supplied values', () => {
  for (const port of ['', '0', '-1', '65536', '3.5', 'secret-value']) {
    assert.throws(() => readConfig({ API_PORT: port }), {
      message: 'Invalid API configuration: API_PORT',
    });
  }
  assert.deepEqual(readConfig({}), { host: '127.0.0.1', port: 3001 });
  assert.equal(readConfig({ API_PORT: '4000' }).port, 4000);
});
