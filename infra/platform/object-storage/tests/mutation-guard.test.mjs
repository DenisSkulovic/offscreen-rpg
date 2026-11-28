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
  assertOwnedMetricsIntent,
  parseMetricsIntent,
  readObjectStoragePendingState,
  withObjectStorageMetricsTransition,
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


test('caught native failure cannot clear durable pending evidence', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  await assert.rejects(() => withObjectStorageMutation('dev', async ({ runWrite }) => {
    await assert.rejects(() => runWrite('node', ['-e', 'process.exit(7)']));
    return { ok: true };
  }, {
    stateRoot, mutationCommands: TEST_MUTATION_COMMANDS,
    readIdentity: async () => ({ state: 'known', identity: sampleIdentity() }),
  }), /reported incomplete/);
  assert.equal(existsSync(resolveObjectStorageLockPaths(stateRoot, 'kind-offscreen-dev').pending), true);
});

test('escaped write capability cannot run after custody returns', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  let escaped;
  await withObjectStorageMutation('dev', async ({ runWrite }) => {
    escaped = runWrite;
    return { ok: true };
  }, {
    stateRoot, mutationCommands: TEST_MUTATION_COMMANDS,
    readIdentity: async () => ({ state: 'known', identity: sampleIdentity() }),
  });
  assert.throws(() => escaped('node', ['-e', 'process.exit(0)']), /outside active/);
  assert.equal(existsSync(resolveObjectStorageLockPaths(stateRoot, 'kind-offscreen-dev').pending), false);
});

test('oversized child output refuses and retains evidence', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-guard-'));
  await assert.rejects(() => withObjectStorageMutation('dev', async ({ runWrite }) => {
    await runWrite('node', ['-e', 'process.stdout.write(Buffer.alloc(5 * 1024 * 1024))'], { timeoutMs: 5000 });
    return { ok: true };
  }, {
    stateRoot, mutationCommands: TEST_MUTATION_COMMANDS,
    readIdentity: async () => ({ state: 'known', identity: sampleIdentity() }),
  }), /incomplete or unknown/);
  assert.equal(existsSync(resolveObjectStorageLockPaths(stateRoot, 'kind-offscreen-dev').pending), true);
});


// --- T02: typed pending state and owned metrics capability ---

const SHA = 'a'.repeat(64);
function metricsIntent(overrides = {}) {
  return {
    schema: 2,
    operation: 'upgrade-metrics',
    profileId: 'dev',
    contextName: 'kind-offscreen-dev',
    startedAt: '2026-11-28T00:00:00.000Z',
    operationId: 'op-1',
    identity: { contextName: 'kind-offscreen-dev' },
    details: {
      predecessorRevision: 1,
      targetRevision: 2,
      predecessorManifestSha256: SHA,
      targetManifestSha256: 'b'.repeat(64),
      namespaceUid: 'n',
      deploymentUid: 'd',
      serviceUid: 's',
      serviceClusterIP: '10.0.0.1',
      secretUid: 'x',
      secretResourceVersion: '7',
      pvcUid: 'c',
      pvUid: 'v',
      pvHostPath: '/var/p',
      oldReplicaSetUid: 'r',
      oldPodUid: 'p',
      oldHelmStorageUid: 'h',
      nodeName: 'node',
      dataDirectoryIdentity: '1:2',
      markerSha256: 'c'.repeat(64),
      markerSize: 64,
    },
    ...overrides,
  };
}

test('typed parser accepts the exact intent and rejects extra, missing or mistyped fields', () => {
  assert.ok(parseMetricsIntent(metricsIntent()));
  assert.equal(parseMetricsIntent(metricsIntent({ extra: 1 })), null);
  const missing = metricsIntent();
  delete missing.details.pvUid;
  assert.equal(parseMetricsIntent(missing), null);
  const bad = metricsIntent();
  bad.details.targetRevision = 3;
  assert.equal(parseMetricsIntent(bad), null);
  assert.equal(parseMetricsIntent(metricsIntent({ profileId: 'release' })), null);
});

test('metrics session records intent, issues a capability and rejects forged, changed or stale handles', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-metrics-'));
  const { pending } = resolveObjectStorageLockPaths(stateRoot, 'kind-offscreen-dev');
  let kept;
  await withObjectStorageMetricsTransition(
    async ({ recordIntent }) => {
      assert.throws(() => assertOwnedMetricsIntent({}), /not active/);
      assert.throws(() => recordIntent({ schema: 2 }), /malformed/);
      const handle = recordIntent(metricsIntent());
      kept = handle;
      assertOwnedMetricsIntent(handle);
      assert.equal(readObjectStoragePendingState(stateRoot, 'kind-offscreen-dev').kind, 'metrics');
      assert.throws(() => recordIntent(metricsIntent()), /already recorded/);
      writeFileSync(pending, JSON.stringify(metricsIntent({ operationId: 'op-2' })));
      assert.throws(() => assertOwnedMetricsIntent(handle), /changed or is not owned/);
    },
    { stateRoot },
  );
  assert.throws(() => assertOwnedMetricsIntent(kept), /not active/);
  // existing pending is never adopted, resumed or overwritten
  await assert.rejects(
    withObjectStorageMetricsTransition(async () => {}, { stateRoot }),
    /pending receipt exists/,
  );
});

test('old writers refuse a metrics pending and exact clear removes only the owned record', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-metrics-'));
  await withObjectStorageMetricsTransition(
    async ({ recordIntent, clearIntent }) => {
      const handle = recordIntent(metricsIntent());
      await assert.rejects(
        withObjectStorageMutation('dev', async () => ({ ok: true }), {
          stateRoot,
          readIdentity: async () => ({ state: 'known', identity: sampleIdentity() }),
          mutationCommands: TEST_MUTATION_COMMANDS,
        }),
        /pending receipt exists/,
      );
      clearIntent(handle);
      assert.equal(readObjectStoragePendingState(stateRoot, 'kind-offscreen-dev').kind, 'absent');
    },
    { stateRoot },
  );
});
