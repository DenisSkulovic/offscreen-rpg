import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  decideProofNamespaceCleanup,
  PROOF_NAMESPACE_PATTERN,
  runObjectStorageProof,
} from './proof.mjs';

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

const MUTATION_ARG_PATTERN =
  /\b(apply|create|delete|patch|replace|install|upgrade)\b/i;

const PROOF_NS = 'offscreen-s3-proof-0123456789abcdef0123456789abcdef';
const TEST_UID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

test('decideProofNamespaceCleanup: cleanup not requested refuses without request', () => {
  const result = decideProofNamespaceCleanup({
    cleanupRequested: false,
    namespace: PROOF_NS,
    expectedUid: TEST_UID,
    observedUid: TEST_UID,
    uncertainMutation: false,
  });
  assert.equal(result.action, 'refuse');
  assert.equal(result.reason, 'cleanup-not-requested');
  assert.ok(!('request' in result));
});

test('decideProofNamespaceCleanup: uncertainMutation refuses uncertain-mutation', () => {
  const result = decideProofNamespaceCleanup({
    cleanupRequested: true,
    namespace: PROOF_NS,
    expectedUid: TEST_UID,
    observedUid: TEST_UID,
    uncertainMutation: true,
  });
  assert.equal(result.action, 'refuse');
  assert.equal(result.reason, 'uncertain-mutation');
  assert.ok(!('request' in result));
});

test('decideProofNamespaceCleanup: non-proof namespace refuses namespace-not-proof', () => {
  const result = decideProofNamespaceCleanup({
    cleanupRequested: true,
    namespace: 'kube-system',
    expectedUid: TEST_UID,
    observedUid: TEST_UID,
    uncertainMutation: false,
  });
  assert.equal(result.action, 'refuse');
  assert.equal(result.reason, 'namespace-not-proof');
  assert.ok(!('request' in result));
});

test('decideProofNamespaceCleanup: differing uids refuses uid-mismatch', () => {
  const result = decideProofNamespaceCleanup({
    cleanupRequested: true,
    namespace: PROOF_NS,
    expectedUid: TEST_UID,
    observedUid: '00000000-0000-0000-0000-000000000000',
    uncertainMutation: false,
  });
  assert.equal(result.action, 'refuse');
  assert.equal(result.reason, 'uid-mismatch');
  assert.ok(!('request' in result));
});

test('decideProofNamespaceCleanup: missing observedUid refuses uid-mismatch', () => {
  const result = decideProofNamespaceCleanup({
    cleanupRequested: true,
    namespace: PROOF_NS,
    expectedUid: TEST_UID,
    observedUid: undefined,
    uncertainMutation: false,
  });
  assert.equal(result.action, 'refuse');
  assert.equal(result.reason, 'uid-mismatch');
  assert.ok(!('request' in result));
});

test('decideProofNamespaceCleanup: valid proof namespace and matching uids returns uid-preconditioned delete', () => {
  const result = decideProofNamespaceCleanup({
    cleanupRequested: true,
    namespace: PROOF_NS,
    expectedUid: TEST_UID,
    observedUid: TEST_UID,
    uncertainMutation: false,
  });
  assert.equal(result.action, 'delete');
  assert.equal(result.request.namespace, PROOF_NS);
  assert.equal(result.request.body.preconditions.uid, TEST_UID);
  assert.deepEqual(Object.keys(result.request.body).sort(), [
    'apiVersion',
    'kind',
    'preconditions',
  ]);
  assert.equal(result.request.body.apiVersion, 'v1');
  assert.equal(result.request.body.kind, 'DeleteOptions');
});

test('--profile dev --plan with platformRun: native plan JSON, no mutation verbs', async () => {
  /** @type {string[][]} */
  const recorded = [];
  const ensure = [];
  const result = await runObjectStorageProof(
    ['--profile', 'dev', '--plan'],
    {
      plan: undefined,
      platformRun: (command, ...args) => {
        recorded.push([command, ...args]);
        return { ok: false, status: 1, stdout: '', stderr: 'closed' };
      },
      ensure: async (ctx) => {
        ensure.push(ctx);
      },
    },
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.wrote, false);
  assert.equal(ensure.length, 0);
  const planPayload = JSON.parse(result.stdout.trim());
  assert.equal(planPayload.mode, 'plan');
  assert.deepEqual(planPayload.actions, []);
  assert.ok(recorded.length > 0, 'native plan did not ask the runner');
  for (const invocation of recorded) {
    const argText = invocation.slice(1).join(' ');
    assert.doesNotMatch(
      argText,
      MUTATION_ARG_PATTERN,
      `unexpected mutation verb in ${JSON.stringify(invocation)}`,
    );
  }
});
