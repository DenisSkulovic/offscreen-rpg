import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import {
  HELM_WAIT_SECONDS,
  INSTALL_BUDGET_MS,
  LOCK_WAIT_SECONDS,
  buildDisposableNamespaceDeleteInvocation,
  resolveObjectStorageLockPaths,
  withObjectStorageMutation,
} from '../providers/seaweedfs/mutation-guard.mjs';

const TEST_MUTATION_COMMANDS = ['node', 'kubectl', 'helm'];

const modulePath = fileURLToPath(
  import.meta.url.replace(
    '/tests/mutation-guard.test.mjs',
    '/providers/seaweedfs/mutation-guard.mjs',
  ),
);

/** @returns {object} */
function sampleIdentity(overrides = {}) {
  return {
    contextName: 'kind-offscreen-dev',
    loopbackEndpoint: '127.0.0.1:6443',
    kubeSystemUid: 'kube-1111',
    baselineNamespaceUid: 'base-1111',
    targetNamespaceName: 'offscreen-dev-objects',
    targetNamespaceUid: 'target-1111',
    targetNamespaceNonce: null,
    podName: 'object-store-abc',
    podUid: 'pod-1111',
    pvcName: 'object-store-data',
    pvcUid: 'pvc-1111',
    pvName: 'pv-1111',
    pvUid: 'pvuid-1111',
    ...overrides,
  };
}

/**
 * @param {string} stateRoot
 * @param {string} contextName
 */
function acquireLockFd(stateRoot, contextName) {
  const { lock } = resolveObjectStorageLockPaths(stateRoot, contextName);
  const dir = dirname(lock);
  spawnSync('mkdir', ['-p', '-m', '700', dir]);
  const opened = openSync(
    lock,
    constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW,
    0o600,
  );
  const flock = spawnSync(
    'flock',
    ['--exclusive', '--wait', String(LOCK_WAIT_SECONDS), '3'],
    { stdio: ['ignore', 'ignore', 'ignore', opened] },
  );
  if (flock.status !== 0) {
    closeSync(opened);
    throw new Error('test lock acquisition failed');
  }
  return opened;
}

test('short fake writer succeeds and pending is cleared', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const identity = sampleIdentity();
  let calls = 0;
  await withObjectStorageMutation(
    'dev',
    async ({ runWrite }) => {
      const result = await runWrite('node', ['-e', 'process.exit(0)'], {
        timeoutMs: 5000,
      });
      assert.equal(result.stdout, '');
      calls++;
      return { ok: true };
    },
    {
      stateRoot,
      mutationCommands: TEST_MUTATION_COMMANDS,
      readIdentity: async () => ({
        state: 'known',
        identity: sampleIdentity(),
      }),
    },
  );
  assert.equal(calls, 1);
  const { pending } = resolveObjectStorageLockPaths(
    stateRoot,
    identity.contextName,
  );
  assert.equal(existsSync(pending), false);
});

test('second writer times out while the first holds the lock', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  const lockFd = acquireLockFd(stateRoot, contextName);
  const holder = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    {
      stdio: ['ignore', 'ignore', 'ignore', lockFd],
      detached: true,
    },
  );
  closeSync(lockFd);
  holder.unref();
  try {
    await assert.rejects(
      () =>
        withObjectStorageMutation('dev', async () => ({ ok: true }), {
          stateRoot,
          budgetMs: 5_000,
          readIdentity: async () => ({
            state: 'known',
            identity: sampleIdentity(),
          }),
        }),
      /lock wait timed out/,
    );
  } finally {
    holder.kill('SIGKILL');
  }
});

test('parent killed child retains lock until exit then acquire fails until child exits', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  const lockFd = acquireLockFd(stateRoot, contextName);
  const child = spawn('sleep', ['30'], {
    stdio: ['ignore', 'ignore', 'ignore', lockFd],
    detached: true,
  });
  closeSync(lockFd);
  const parent = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    {
      stdio: 'ignore',
      detached: true,
    },
  );
  parent.kill('SIGKILL');
  await new Promise((resolve) => setTimeout(resolve, 200));
  await assert.rejects(
    () =>
      withObjectStorageMutation('dev', async () => ({ ok: true }), {
        stateRoot,
        budgetMs: 3_000,
        readIdentity: async () => ({
          state: 'known',
          identity: sampleIdentity(),
        }),
      }),
    /lock wait timed out/,
  );
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    child.on('exit', resolve);
  });
  const lockFdAfter = acquireLockFd(stateRoot, contextName);
  closeSync(lockFdAfter);
});

test('lock wait timeout when exclusive lock already held', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const lockFd = acquireLockFd(stateRoot, 'kind-offscreen-dev');
  try {
    await assert.rejects(
      () =>
        withObjectStorageMutation('dev', async () => ({ ok: true }), {
          stateRoot,
          budgetMs: 4_000,
          readIdentity: async () => ({
            state: 'known',
            identity: sampleIdentity(),
          }),
        }),
      /lock wait timed out/,
    );
  } finally {
    closeSync(lockFd);
  }
});

test('durable pending after failed write makes the next call refuse', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  await assert.rejects(
    () =>
      withObjectStorageMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('node', ['-e', 'process.exit(2)'], {
            timeoutMs: 5000,
          });
          return { ok: true };
        },
        {
          stateRoot,
          mutationCommands: TEST_MUTATION_COMMANDS,
          readIdentity: async () => ({
            state: 'known',
            identity: sampleIdentity(),
          }),
        },
      ),
    /incomplete or unknown/,
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  assert.equal(existsSync(pending), true);
  await assert.rejects(
    () =>
      withObjectStorageMutation('dev', async () => ({ ok: true }), {
        stateRoot,
        mutationCommands: TEST_MUTATION_COMMANDS,
        readIdentity: async () => ({
          state: 'known',
          identity: sampleIdentity(),
        }),
      }),
    /pending receipt exists/,
  );
});

test('successful completion clears pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  await withObjectStorageMutation(
    'dev',
    async ({ runWrite }) => {
      await runWrite('node', ['-e', 'process.exit(0)'], { timeoutMs: 5000 });
      return { ok: true };
    },
    {
      stateRoot,
      mutationCommands: TEST_MUTATION_COMMANDS,
      readIdentity: async () => ({
        state: 'known',
        identity: sampleIdentity(),
      }),
    },
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  assert.equal(existsSync(pending), false);
});

test('changed pod identity after write is rejected and pending remains', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  let reads = 0;
  await assert.rejects(
    () =>
      withObjectStorageMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('node', ['-e', 'process.exit(0)'], {
            timeoutMs: 5000,
          });
          return { ok: true };
        },
        {
          stateRoot,
          mutationCommands: TEST_MUTATION_COMMANDS,
          readIdentity: async () => {
            reads++;
            if (reads <= 3) {
              return { state: 'known', identity: sampleIdentity() };
            }
            return {
              state: 'known',
              identity: sampleIdentity({ podUid: 'pod-replaced' }),
            };
          },
        },
      ),
    /identity changed after write/,
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  assert.equal(existsSync(pending), true);
});

test('changed namespace identity after write is rejected and pending remains', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  let reads = 0;
  await assert.rejects(
    () =>
      withObjectStorageMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('node', ['-e', 'process.exit(0)'], {
            timeoutMs: 5000,
          });
          return { ok: true };
        },
        {
          stateRoot,
          mutationCommands: TEST_MUTATION_COMMANDS,
          readIdentity: async () => {
            reads++;
            if (reads <= 3) {
              return { state: 'known', identity: sampleIdentity() };
            }
            return {
              state: 'known',
              identity: sampleIdentity({
                targetNamespaceUid: 'target-replaced',
              }),
            };
          },
        },
      ),
    /identity changed after write/,
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  assert.equal(existsSync(pending), true);
});

test('changed cluster identity after write is rejected and pending remains', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  let reads = 0;
  await assert.rejects(
    () =>
      withObjectStorageMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('node', ['-e', 'process.exit(0)'], {
            timeoutMs: 5000,
          });
          return { ok: true };
        },
        {
          stateRoot,
          mutationCommands: TEST_MUTATION_COMMANDS,
          readIdentity: async () => {
            reads++;
            if (reads <= 3) {
              return { state: 'known', identity: sampleIdentity() };
            }
            return {
              state: 'known',
              identity: sampleIdentity({ kubeSystemUid: 'kube-replaced' }),
            };
          },
        },
      ),
    /identity changed after write/,
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  assert.equal(existsSync(pending), true);
});

test('no exported function performs a mutation without the lock', async () => {
  const guard = await import(pathToFileURL(modulePath).href);
  for (const name of [
    'runWrite',
    'runPlatformObjectStorageWrite',
    'spawnMutationChild',
  ]) {
    assert.equal(name in guard, false);
  }
  assert.equal(typeof guard.withObjectStorageMutation, 'function');
});

test('disposable cleanup helper emits uid-preconditioned raw delete only', () => {
  const invocation = buildDisposableNamespaceDeleteInvocation(
    'kind-offscreen-dev',
    'offscreen-s3-proof-deadbeef',
    'uid-captured',
  );
  assert.deepEqual(invocation.argv, [
    'kubectl',
    '--context',
    'kind-offscreen-dev',
    'delete',
    '--raw',
    '/api/v1/namespaces/offscreen-s3-proof-deadbeef',
    '-f',
    '-',
  ]);
  const body = JSON.parse(invocation.body);
  assert.equal(body.preconditions.uid, 'uid-captured');
  assert.equal(body.propagationPolicy, 'Foreground');
  assert.doesNotMatch(JSON.stringify(invocation), /force/i);
});

test('exported timing constants match contract', () => {
  assert.equal(LOCK_WAIT_SECONDS, 30);
  assert.equal(INSTALL_BUDGET_MS, 600_000);
  assert.equal(HELM_WAIT_SECONDS, 180);
});

test('pending receipt records captured identity before first write', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  const identity = sampleIdentity();
  await assert.rejects(
    () =>
      withObjectStorageMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('node', ['-e', 'process.exit(3)'], {
            timeoutMs: 5000,
          });
          return { ok: true };
        },
        {
          stateRoot,
          mutationCommands: TEST_MUTATION_COMMANDS,
          readIdentity: async () => ({ state: 'known', identity }),
        },
      ),
    /incomplete or unknown/,
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  const receipt = JSON.parse(readFileSync(pending, 'utf8'));
  assert.equal(receipt.contextName, contextName);
  assert.equal(receipt.identity.podUid, identity.podUid);
});

test('waiter refused by pending after the holder fails', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  const { lock, pending } = resolveObjectStorageLockPaths(
    stateRoot,
    contextName,
  );
  const lockFd = acquireLockFd(stateRoot, contextName);
  const waiter = withObjectStorageMutation('dev', async () => ({ ok: true }), {
    stateRoot,
    budgetMs: 8_000,
    readIdentity: async () => ({
      state: 'known',
      identity: sampleIdentity(),
    }),
  });
  let waiterBlocked = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    const contended = spawnSync('flock', ['-n', lock]);
    if (contended.status !== 0) {
      waiterBlocked = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(waiterBlocked, true);
  writeFileSync(
    pending,
    JSON.stringify({
      profileId: 'dev',
      contextName,
      startedAt: new Date().toISOString(),
      identity: sampleIdentity(),
    }),
    { mode: 0o600 },
  );
  closeSync(lockFd);
  await assert.rejects(() => waiter, /pending receipt exists/);
});

test('pre-write target namespace uid appearing refuses without pending or spawn', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const contextName = 'kind-offscreen-dev';
  const withoutUid = sampleIdentity({
    targetNamespaceUid: null,
    podName: null,
    podUid: null,
    pvcName: null,
    pvcUid: null,
    pvName: null,
    pvUid: null,
  });
  let reads = 0;
  await assert.rejects(
    () =>
      withObjectStorageMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('node', ['-e', 'process.exit(0)'], {
            timeoutMs: 5000,
          });
          return { ok: true };
        },
        {
          stateRoot,
          mutationCommands: TEST_MUTATION_COMMANDS,
          readIdentity: async () => {
            reads++;
            if (reads <= 2) {
              return { state: 'known', identity: structuredClone(withoutUid) };
            }
            return { state: 'known', identity: sampleIdentity() };
          },
        },
      ),
    /identity changed before write/,
  );
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  assert.equal(existsSync(pending), false);
});

test('post-write null target namespace uid adoption is kept on captured identity', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  const initial = sampleIdentity({
    targetNamespaceUid: null,
    podName: null,
    podUid: null,
    pvcName: null,
    pvcUid: null,
    pvName: null,
    pvUid: null,
  });
  let reads = 0;
  await withObjectStorageMutation(
    'dev',
    async ({ runWrite, identity }) => {
      const adopted = sampleIdentity();
      await runWrite('node', ['-e', 'process.exit(0)'], { timeoutMs: 5000 });
      assert.equal(identity.targetNamespaceUid, adopted.targetNamespaceUid);
      assert.equal(identity.podUid, adopted.podUid);
      return { ok: true };
    },
    {
      stateRoot,
      mutationCommands: TEST_MUTATION_COMMANDS,
      readIdentity: async () => {
        reads++;
        if (reads <= 3) {
          return { state: 'known', identity: structuredClone(initial) };
        }
        return { state: 'known', identity: sampleIdentity() };
      },
    },
  );
});

test('runWrite returns child stdout without losing inherited lock fd', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  await withObjectStorageMutation(
    'dev',
    async ({ runWrite }) => {
      const result = await runWrite(
        'node',
        ['-e', 'process.stdout.write("object-store-stdout")'],
        { timeoutMs: 5000 },
      );
      assert.equal(result.stdout, 'object-store-stdout');
      return { ok: true };
    },
    {
      stateRoot,
      mutationCommands: TEST_MUTATION_COMMANDS,
      readIdentity: async () => ({
        state: 'known',
        identity: sampleIdentity(),
      }),
    },
  );
});
