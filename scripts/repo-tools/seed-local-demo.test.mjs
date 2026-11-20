import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertLocalDemoSeedEnvironment } from './seed-local-demo.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, 'scripts', 'repo-tools', 'seed-local-demo.mjs');
const jobYaml = join(
  repo,
  'infra/kubernetes/lab/dev/local-demo-seed-job.yaml',
);

function runScript(args, env = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repo,
      env: { ...process.env, ...env },
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      resolveRun({ code, stderr });
    });
  });
}

test('refuses to run without LOCAL_DEMO_SEED=1', async () => {
  const env = { ...process.env, NODE_ENV: 'development' };
  delete env.LOCAL_DEMO_SEED;
  const result = await runScript(
    [
      '--auth-user-id',
      '00000000-0000-4000-8000-000000000001',
      '--environment',
      'local',
      '--actor-label',
      'test',
      '--s3',
    ],
    env,
  );
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /LOCAL_DEMO_SEED/);
});

test('NODE_ENV=production exits non-zero', async () => {
  const result = await runScript([], {
    LOCAL_DEMO_SEED: '1',
    NODE_ENV: 'production',
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /NODE_ENV=production/);
});

test('missing --auth-user-id exits non-zero', async () => {
  const result = await runScript(
    ['--environment', 'local', '--actor-label', 'test', '--s3'],
    { LOCAL_DEMO_SEED: '1', NODE_ENV: 'development' },
  );
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /--auth-user-id/);
});

test('local demo job manifest names the seed script and uses secret refs only', async () => {
  const yaml = await readFile(jobYaml, 'utf8');
  assert.match(yaml, /seed-local-demo\.mjs/);
  assert.match(yaml, /secretKeyRef/);
  assert.doesNotMatch(yaml, /password:\s*[^\s\n]+/i);
  assert.doesNotMatch(yaml, /postgres:\/\/[^\s"']+/i);
  assert.doesNotMatch(
    yaml,
    /auth-user-id:\s*[0-9a-f-]{36}/i,
  );
});

test('assertLocalDemoSeedEnvironment rejects non-loopback APP_ORIGIN', () => {
  const previous = process.env.APP_ORIGIN;
  process.env.LOCAL_DEMO_SEED = '1';
  process.env.NODE_ENV = 'development';
  process.env.APP_ORIGIN = 'https://example.test';
  try {
    assert.throws(() => assertLocalDemoSeedEnvironment(), /APP_ORIGIN/);
  } finally {
    process.env.APP_ORIGIN = previous;
  }
});