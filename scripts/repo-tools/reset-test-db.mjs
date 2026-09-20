import { createRequire } from 'node:module';
import { fail, runPnpm } from './process.mjs';

const requireFromDatabasePackage = createRequire(
  new URL('../../packages/db/package.json', import.meta.url),
);
const { Client } = requireFromDatabasePackage('pg');

export const testDatabaseUrl =
  'postgresql://offscreen:local-development-only@localhost:5432/offscreen_auth_test';

export async function resetTestDatabase({ build = true } = {}) {
  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = '/postgres';
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    await client.query(
      'DROP DATABASE IF EXISTS offscreen_auth_test WITH (FORCE)',
    );
    await client.query('CREATE DATABASE offscreen_auth_test');
  } finally {
    await client.end();
  }
  if (build) {
    runPnpm(['--filter', '@offscreen/db', 'build']);
  }
  runPnpm(['--filter', '@offscreen/db', 'migrate'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  try {
    await resetTestDatabase();
  } catch (error) {
    fail(error);
  }
}
