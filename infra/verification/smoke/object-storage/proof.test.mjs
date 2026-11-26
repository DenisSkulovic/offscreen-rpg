import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PROOF_NAMESPACE_PATTERN, runObjectStorageProof } from './proof.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROOF_SCRIPT = join(HERE, 'proof.mjs');

/**
 * @returns {{ plan: string[], ensure: { profile: string, namespace: string }[], cleanup: string[], deps: object }}
 */
function trackDeps(overrides = {}) {
  const plan = [];
  const ensure = [];
  const cleanup = [];
  const deps = {
    plan: (profile) => {
      plan.push(profile);
    },
    ensure: async (ctx) => {
      ensure.push(ctx);
    },
    cleanup: async (namespace) => {
      cleanup.push(namespace);
    },
    ...overrides,
  };
  return { plan, ensure, cleanup, deps };
}

function spawnProof(argv) {
  return spawnSync(process.execPath, [PROOF_SCRIPT, ...argv], {
    encoding: 'utf8',
  });
}

test('no args: exit 2 and no dependency callbacks', async () => {
  const { deps, plan, ensure, cleanup } = trackDeps();
  const result = await runObjectStorageProof([], deps);
  assert.equal(result.exitCode, 2);
  assert.equal(result.wrote, false);
  assert.equal(plan.length, 0);
  assert.equal(ensure.length, 0);
  assert.equal(cleanup.length, 0);
});

test('--profile dev --plan: plan called once, ensure not called', async () => {
  const { deps, plan, ensure } = trackDeps();
  const result = await runObjectStorageProof(
    ['--profile', 'dev', '--plan'],
    deps,
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.wrote, false);
  assert.deepEqual(plan, ['dev']);
  assert.equal(ensure.length, 0);
});

test('--profile release --live without confirm: exit 2 and ensure not called', async () => {
  const { deps, ensure } = trackDeps();
  const result = await runObjectStorageProof(
    ['--profile', 'release', '--live'],
    deps,
  );
  assert.equal(result.exitCode, 2);
  assert.equal(result.wrote, false);
  assert.match(result.stderr, /refusing object-storage proof mutation/);
  assert.equal(ensure.length, 0);
});

test('--profile dev --live --confirm-disposable: ensure once, cleanup not called', async () => {
  const { deps, ensure, cleanup } = trackDeps();
  const result = await runObjectStorageProof(
    ['--profile', 'dev', '--live', '--confirm-disposable'],
    deps,
  );
  assert.equal(result.exitCode, 0);
  assert.equal(ensure.length, 1);
  assert.match(ensure[0].namespace, PROOF_NAMESPACE_PATTERN);
  assert.equal(ensure[0].profile, 'dev');
  assert.equal(cleanup.length, 0);
});

test('--profile dev --live --confirm-disposable --cleanup: cleanup receives namespace', async () => {
  const { deps, ensure, cleanup } = trackDeps();
  const result = await runObjectStorageProof(
    ['--profile', 'dev', '--live', '--confirm-disposable', '--cleanup'],
    deps,
  );
  assert.equal(result.exitCode, 0);
  assert.equal(ensure.length, 1);
  assert.equal(cleanup.length, 1);
  assert.equal(cleanup[0], ensure[0].namespace);
});

test('ensure throw: cleanup not called, exitCode 1, wrote true', async () => {
  const cleanup = [];
  const result = await runObjectStorageProof(
    ['--profile', 'dev', '--live', '--confirm-disposable', '--cleanup'],
    {
      ensure: async () => {
        throw new Error('ensure failed');
      },
      cleanup: async (namespace) => {
        cleanup.push(namespace);
      },
    },
  );
  assert.equal(result.exitCode, 1);
  assert.equal(result.wrote, true);
  assert.equal(cleanup.length, 0);
});

test('two successful live calls generate different namespaces', async () => {
  const namespaces = [];
  const deps = {
    ensure: async ({ namespace }) => {
      namespaces.push(namespace);
    },
  };
  const flags = ['--profile', 'dev', '--live', '--confirm-disposable'];
  assert.equal((await runObjectStorageProof(flags, deps)).exitCode, 0);
  assert.equal((await runObjectStorageProof(flags, deps)).exitCode, 0);
  assert.equal(namespaces.length, 2);
  assert.notEqual(namespaces[0], namespaces[1]);
  for (const namespace of namespaces) {
    assert.match(namespace, PROOF_NAMESPACE_PATTERN);
  }
});

test('--profile staging --plan: exit 2 and plan not called', async () => {
  const { deps, plan } = trackDeps();
  const result = await runObjectStorageProof(
    ['--profile', 'staging', '--plan'],
    deps,
  );
  assert.equal(result.exitCode, 2);
  assert.equal(plan.length, 0);
});

test('spawned proof.mjs with no args exits 2 with empty stdout', () => {
  const result = spawnProof([]);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
});

test('spawned proof.mjs with --profile release --live exits 2 with empty stdout', () => {
  const result = spawnProof(['--profile', 'release', '--live']);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
});
