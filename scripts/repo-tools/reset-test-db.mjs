import { dockerExecutable, fail, run, runPnpm } from './process.mjs';

export const testDatabaseUrl =
  'postgresql://offscreen:local-development-only@localhost:5432/offscreen_auth_test';

export function resetTestDatabase({ build = true } = {}) {
  const docker = dockerExecutable();
  run(docker, [
    'compose',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'offscreen',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    'DROP DATABASE IF EXISTS offscreen_auth_test WITH (FORCE);',
  ]);
  run(docker, [
    'compose',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'offscreen',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    'CREATE DATABASE offscreen_auth_test;',
  ]);
  if (build) {
    runPnpm(['--filter', '@offscreen/db', 'build']);
  }
  runPnpm(['--filter', '@offscreen/db', 'migrate'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  try {
    resetTestDatabase();
  } catch (error) {
    fail(error);
  }
}
