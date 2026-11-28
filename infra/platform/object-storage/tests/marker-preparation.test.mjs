import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarkerDescriptorFile } from '../providers/seaweedfs/install.mjs';
import {
  assertDescriptorDestination,
  prepareObjectStorageMarker,
  writeDescriptorFile,
} from '../providers/seaweedfs/prepare-marker.mjs';
import {
  assertOwnedMarkerIntent,
  assertOwnedMetricsIntent,
  parseMarkerIntent,
  readObjectStoragePendingState,
  resolveObjectStorageLockPaths,
  withObjectStorageMarkerPreparation,
  withObjectStorageMetricsTransition,
  withObjectStorageMutation,
} from '../providers/seaweedfs/mutation-guard.mjs';

const CONTEXT = 'kind-offscreen-dev';
const ENTRY = join(dirname(fileURLToPath(import.meta.url)), '../providers/seaweedfs/prepare-marker.mjs');
const ENV = {
  OFFSCREEN_OBJECT_STORAGE_MARKER_PREPARE: 'authorized',
  OFFSCREEN_OBJECT_STORAGE_MAINTENANCE: 'quiesced',
};
const BASE_CHAIN = {
  contextName: CONTEXT,
  historyId: 'dev-base-r1',
  kubeSystemUid: 'ks',
  namespaceUid: 'ns',
  deploymentUid: 'dep',
  serviceUid: 'svc',
  serviceClusterIP: '10.96.0.9',
  secretUid: 'sec',
  secretResourceVersion: '7',
  pvcUid: 'pvc',
  pvUid: 'pv',
  pvHostPath: '/data/pv',
  replicaSetUid: 'rs-old',
  predecessorReplicaSetUid: null,
  podUid: 'pod-old',
  nodeName: 'node',
  dataDirectoryIdentity: '64:12',
  helmStorageUids: { 1: 'h1' },
};
const FIXED_BYTES = Buffer.alloc(64, 7);
const FIXED_SHA = createHash('sha256').update(FIXED_BYTES).digest('hex');

function privateDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  chmodSync(dir, 0o700);
  return dir;
}

function world(options = {}) {
  const stateRoot = privateDir('os-mp-');
  const destDir = privateDir('os-md-');
  const descriptorPath = options.descriptorPath ?? join(destDir, 'marker.json');
  const { pending } = resolveObjectStorageLockPaths(stateRoot, CONTEXT);
  const w = {
    stateRoot,
    pending,
    descriptorPath,
    writes: [],
    reads: 0,
    absentChecks: [],
    intentAtWrite: null,
    ownedCalls: 0,
    quiescenceCalls: 0,
    memoryText: 'MemAvailable: 8388608 kB\nMemTotal: 16777216 kB\n',
  };
  let randomCall = 0;
  const deps = {
    env: { ...ENV, ...options.env },
    stateRoot,
    registryRoot: '/fixture/registry',
    run: () => {
      throw new Error('fixture: no native command may run');
    },
    readMeminfo: () => w.memoryText,
    assertQuiescence: () => {
      w.quiescenceCalls += 1;
      options.quiescence?.(w);
    },
    operationId: () => 'op-1',
    randomBytes: (n) => (++randomCall % 2 === 1 ? Buffer.alloc(n, 7) : Buffer.alloc(n, 0xab)),
    bucketAbsent: async (bucket, secret) => {
      w.absentChecks.push({ bucket, secret });
      if (options.absentThrows) throw new Error('secret-ish probe failure');
      return options.bucketExists ? false : true;
    },
    writeMarker: async (descriptor, bytes, secret) => {
      w.intentAtWrite = JSON.parse(readFileSync(w.pending, 'utf8'));
      w.writes.push({ descriptor, bytes: Buffer.from(bytes), secret });
      if (options.writeThrows) throw new Error('AKIA-secret-ish write failure');
    },
    readMarker: async () => {
      w.reads += 1;
      if (options.readThrows) throw new Error('secret-ish read failure');
      return { sha256: FIXED_SHA, size: 64, ...options.readResult };
    },
    observers: {
      history: () =>
        options.history ?? { state: 'native-compatible', historyId: 'dev-base-r1' },
      before: () => options.before ?? { ok: true, chain: structuredClone(BASE_CHAIN) },
      owned: (handle) => {
        assertOwnedMarkerIntent(handle);
        w.ownedCalls += 1;
        const changed = options.ownedChange?.(w);
        return { ok: true, chain: structuredClone(changed ?? BASE_CHAIN) };
      },
    },
    ...options.deps,
  };
  w.deps = deps;
  w.run = (request = {}) =>
    prepareObjectStorageMarker({ confirmContext: CONTEXT, descriptorPath, ...request }, deps);
  w.pendingText = () => (existsSync(pending) ? readFileSync(pending, 'utf8') : null);
  return w;
}

test('success: durable intent first, exact bucket+bytes, readback, private descriptor, intent cleared', async () => {
  const w = world();
  const result = await w.run();
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'marker-prepared');
  assert.equal(result.mutated, true);
  assert.equal(result.intentRetained, false);
  assert.equal(w.writes.length, 1);
  const { descriptor, bytes, secret } = w.writes[0];
  assert.match(descriptor.bucket, /^offscreen-e2-marker-[0-9a-f]{32}$/);
  assert.equal(descriptor.bucket, `offscreen-e2-marker-${'ab'.repeat(16)}`);
  assert.equal(descriptor.key, 'retained-marker.bin');
  assert.equal(bytes.length, 64);
  assert.deepEqual(secret, { uid: 'sec', resourceVersion: '7' });
  assert.equal(w.absentChecks.length, 1);
  assert.equal(w.absentChecks[0].bucket, descriptor.bucket);
  // Intent was durable and complete before the first write.
  const intent = parseMarkerIntent(w.intentAtWrite);
  assert.ok(intent, 'intent parses exactly');
  assert.deepEqual(intent.details.descriptor, {
    schema: 1, bucket: descriptor.bucket, key: 'retained-marker.bin', sha256: FIXED_SHA, size: 64,
  });
  assert.equal(intent.details.descriptorPath, w.descriptorPath);
  assert.deepEqual(intent.identity, BASE_CHAIN);
  assert.equal(w.pendingText(), null, 'owned intent cleared after proof');
  // Descriptor: private regular file, consumable by upgrade-metrics.
  const stat = statSync(w.descriptorPath);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(stat.nlink, 1);
  assert.deepEqual(readMarkerDescriptorFile(w.descriptorPath), {
    schema: 1, bucket: descriptor.bucket, key: 'retained-marker.bin', sha256: FIXED_SHA, size: 64,
  });
  assert.equal(w.quiescenceCalls, 2);
  assert.equal(w.reads, 1);
  // Raw bytes never appear in the receipt.
  assert.ok(!JSON.stringify(result).includes(FIXED_BYTES.toString('hex')));
});

for (const [label, content] of [
  ['legacy receipt', { profileId: 'dev', contextName: CONTEXT, startedAt: new Date().toISOString(), identity: {} }],
  ['metrics-looking record', { schema: 2, operation: 'upgrade-metrics' }],
  ['marker record', { schema: 2, operation: 'prepare-marker' }],
]) {
  test(`existing pending (${label}) refuses with zero writes and is untouched`, async () => {
    const w = world();
    const text = JSON.stringify(content);
    writeFileSync(w.pending, text, { mode: 0o600 });
    const result = await w.run();
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
    assert.equal(result.intentRetained, false);
    assert.equal(w.writes.length, 0);
    assert.equal(w.absentChecks.length, 0);
    assert.equal(w.pendingText(), text);
    assert.equal(existsSync(w.descriptorPath), false);
  });
}

test('malformed pending refuses', async () => {
  const w = world();
  writeFileSync(w.pending, '{not json', { mode: 0o600 });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(w.writes.length, 0);
  assert.equal(w.pendingText(), '{not json');
});

const REFUSALS = [
  ['wrong context', {}, { confirmContext: 'kind-other' }],
  ['missing marker authorization', { env: { OFFSCREEN_OBJECT_STORAGE_MARKER_PREPARE: undefined } }],
  ['metrics-upgrade authorization is not marker authorization', { env: { OFFSCREEN_OBJECT_STORAGE_MARKER_PREPARE: undefined, OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE: 'authorized' } }],
  ['missing quiescence attestation', { env: { OFFSCREEN_OBJECT_STORAGE_MAINTENANCE: 'no' } }],
  ['active consumers', { quiescence: () => { throw Object.assign(new Error('dev registry has an active lease or process'), { name: 'OwnerRefusal' }); } }],
  ['insufficient memory', { memory: 'MemAvailable: 1024 kB\n' }],
  ['unreadable memory', { memory: '' }],
  ['unexpected owner identity', { before: { ok: false, reason: 'owner chain identity is incomplete' } }],
  ['already-upgraded history', { history: { state: 'native-compatible', historyId: 'dev-metrics-r1-r2' } }],
  ['refused history', { history: { state: 'refused', reason: 'legacy' } }],
  ['bucket collision', { bucketExists: true }],
  ['unverifiable bucket absence', { absentThrows: true }],
  ['relative descriptor path', { descriptorPath: 'marker.json' }],
];
for (const [label, options, request] of REFUSALS) {
  test(`refuses ${label} with zero writes and no intent`, async () => {
    const w = world(options);
    if (options.memory !== undefined) w.memoryText = options.memory;
    const result = await w.run(request);
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
    assert.equal(result.intentRetained, false);
    assert.equal(w.writes.length, 0);
    assert.equal(w.pendingText(), null);
    assert.ok(!JSON.stringify(result).includes('secret-ish'));
  });
}

test('quiescence lost between the first check and the write refuses before any intent', async () => {
  const w = world({
    quiescence: (state) => {
      if (state.quiescenceCalls === 2) throw Object.assign(new Error('slot namespace has an active Pod'), { name: 'OwnerRefusal' });
    },
  });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(result.intentRetained, false);
  assert.equal(w.writes.length, 0);
  assert.equal(w.pendingText(), null);
});

test('predecessor drift after the intent retains it and issues no write', async () => {
  const w = world({ ownedChange: (state) => (state.ownedCalls === 1 ? { ...BASE_CHAIN, podUid: 'other' } : null) });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.intentRetained, true);
  assert.equal(w.writes.length, 0);
  assert.ok(parseMarkerIntent(JSON.parse(w.pendingText())));
});

test('ambiguous create/put retains the intent, no retry, no descriptor, later mutations refused', async () => {
  const w = world({ writeThrows: true });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.intentRetained, true);
  assert.equal(w.writes.length, 1, 'no automatic retry');
  assert.equal(w.reads, 0);
  assert.equal(existsSync(w.descriptorPath), false);
  assert.ok(!JSON.stringify(result).includes('AKIA'));
  const retained = w.pendingText();
  assert.ok(parseMarkerIntent(JSON.parse(retained)));
  // Subsequent marker preparation and any other mutation path refuse.
  const again = await w.run();
  assert.equal(again.ok, false);
  assert.equal(again.mutated, false);
  assert.equal(w.writes.length, 1);
  assert.equal(w.pendingText(), retained);
  await assert.rejects(withObjectStorageMetricsTransition(async () => 'x', { stateRoot: w.stateRoot }), /pending receipt exists/);
  await assert.rejects(withObjectStorageMutation('dev', async () => ({ ok: true }), { stateRoot: w.stateRoot }), /pending receipt/);
  assert.equal(w.pendingText(), retained);
  assert.equal(readObjectStoragePendingState(w.stateRoot, CONTEXT).kind, 'unknown');
});

for (const [label, options] of [
  ['hash mismatch', { readResult: { sha256: 'e'.repeat(64) } }],
  ['size mismatch', { readResult: { size: 65 } }],
  ['unreadable readback', { readThrows: true }],
]) {
  test(`readback ${label} retains the intent and writes no descriptor`, async () => {
    const w = world(options);
    const result = await w.run();
    assert.equal(result.ok, false);
    assert.equal(result.mutated, true);
    assert.equal(result.intentRetained, true);
    assert.equal(existsSync(w.descriptorPath), false);
    assert.ok(parseMarkerIntent(JSON.parse(w.pendingText())));
    assert.ok(!JSON.stringify(result).includes('secret-ish'));
  });
}

test('owner chain change after the write retains the intent and writes no descriptor', async () => {
  const w = world({ ownedChange: (state) => (state.ownedCalls === 2 ? { ...BASE_CHAIN, secretResourceVersion: '8' } : null) });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(result.intentRetained, true);
  assert.equal(existsSync(w.descriptorPath), false);
});

test('descriptor persistence failure retains the intent, which carries the full descriptor', async () => {
  const w = world({ deps: { persistDescriptor: () => { throw new Error('disk full /secret/path'); } } });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.intentRetained, true);
  assert.ok(!JSON.stringify(result).includes('/secret/path'));
  const intent = parseMarkerIntent(JSON.parse(w.pendingText()));
  assert.equal(intent.details.descriptor.sha256, FIXED_SHA);
  assert.equal(w.writes.length, 1);
});

test('credentials and raw bytes never reach the receipt, intent or descriptor', async () => {
  const w = world();
  const result = await w.run();
  const surfaces = [JSON.stringify(result), readFileSync(w.descriptorPath, 'utf8'), JSON.stringify(w.intentAtWrite)];
  for (const text of surfaces) {
    assert.ok(!text.includes(FIXED_BYTES.toString('base64')));
    assert.ok(!/secret-access-key|secretAccessKey|AKIA/.test(text));
  }
});

// --- descriptor destination ---

test('descriptor destination: existing file, symlink and non-private directory refuse before any intent', async () => {
  const existing = world();
  writeFileSync(existing.descriptorPath, 'x', { mode: 0o600 });
  assert.equal((await existing.run()).ok, false);
  assert.equal(existing.writes.length, 0);

  const linked = world();
  const target = join(privateDir('os-mt-'), 'elsewhere');
  symlinkSync(target, linked.descriptorPath);
  assert.equal((await linked.run()).ok, false);
  assert.equal(existsSync(target), false);
  assert.equal(linked.writes.length, 0);

  const open = privateDir('os-mo-');
  chmodSync(open, 0o755);
  const loose = world({ descriptorPath: join(open, 'marker.json') });
  const result = await loose.run();
  assert.equal(result.ok, false);
  assert.equal(loose.writes.length, 0);
  assert.equal(loose.pendingText(), null);
});

test('writeDescriptorFile is exclusive and no-follow', () => {
  const dir = privateDir('os-wd-');
  const path = join(dir, 'm.json');
  writeDescriptorFile(path, { schema: 1 });
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.throws(() => writeDescriptorFile(path, { schema: 1 }), /already exists/);
  const link = join(dir, 'l.json');
  symlinkSync(join(dir, 'nowhere'), link);
  assert.throws(() => assertDescriptorDestination(link), /already exists/);
  assert.throws(() => writeDescriptorFile(link, { schema: 1 }));
  assert.equal(existsSync(join(dir, 'nowhere')), false);
});

// --- custody boundary ---

function validIntent(contextName = CONTEXT) {
  return {
    schema: 2,
    operation: 'prepare-marker',
    profileId: 'dev',
    contextName,
    startedAt: new Date().toISOString(),
    operationId: 'op',
    identity: { ...BASE_CHAIN },
    details: {
      descriptor: { schema: 1, bucket: `offscreen-e2-marker-${'a'.repeat(32)}`, key: 'retained-marker.bin', sha256: 'b'.repeat(64), size: 64 },
      descriptorPath: '/private/marker.json',
    },
  };
}

test('intent parser is exact', () => {
  assert.ok(parseMarkerIntent(validIntent()));
  const mutations = [
    (i) => { i.extra = 1; },
    (i) => { i.operation = 'upgrade-metrics'; },
    (i) => { i.schema = 1; },
    (i) => { i.details.extra = 1; },
    (i) => { i.details.descriptor.key = 'other.bin'; },
    (i) => { i.details.descriptor.size = 10; },
    (i) => { i.details.descriptor.bucket = 'x'; },
    (i) => { i.details.descriptor.sha256 = 'XYZ'; },
    (i) => { i.details.descriptorPath = 'relative'; },
    (i) => { delete i.identity; },
  ];
  for (const mutate of mutations) {
    const intent = validIntent();
    mutate(intent);
    assert.equal(parseMarkerIntent(intent), null);
  }
});

test('capability is session-scoped: stale, foreign and metrics handles are rejected', async () => {
  const stateRoot = privateDir('os-cap-');
  let stale;
  await withObjectStorageMarkerPreparation(async (session) => {
    assert.throws(() => assertOwnedMarkerIntent({}), /not active/);
    assert.throws(() => session.authorizeWrite({}), /not active/);
    assert.throws(() => session.recordIntent({ ...validIntent(), operation: 'upgrade-metrics' }), /malformed/);
    assert.throws(() => session.recordIntent(validIntent('kind-other')), /malformed/);
    const handle = session.recordIntent(validIntent());
    assert.throws(() => session.recordIntent(validIntent()), /already recorded/);
    assert.doesNotThrow(() => assertOwnedMarkerIntent(handle));
    assert.throws(() => assertOwnedMetricsIntent(handle), /not active/);
    assert.throws(() => session.clearIntent(handle), /no authorized write/);
    session.authorizeWrite(handle);
    assert.throws(() => session.authorizeWrite(handle), /already authorized/);
    stale = handle;
  }, { stateRoot });
  assert.throws(() => assertOwnedMarkerIntent(stale), /not active/);
  const { pending } = resolveObjectStorageLockPaths(stateRoot, CONTEXT);
  assert.ok(existsSync(pending), 'record is retained when the session ends without clearing');
  assert.equal(readObjectStoragePendingState(stateRoot, CONTEXT).kind, 'unknown');
});

test('a replaced pending record invalidates the capability and is never cleared', async () => {
  const stateRoot = privateDir('os-rep-');
  const { pending } = resolveObjectStorageLockPaths(stateRoot, CONTEXT);
  await withObjectStorageMarkerPreparation(async (session) => {
    const handle = session.recordIntent(validIntent());
    session.authorizeWrite(handle);
    writeFileSync(`${pending}.new`, '{"replaced":true}', { mode: 0o600 });
    const { renameSync } = await import('node:fs');
    renameSync(`${pending}.new`, pending);
    assert.throws(() => session.clearIntent(handle), /changed or is not owned/);
  }, { stateRoot });
  assert.equal(readFileSync(pending, 'utf8'), '{"replaced":true}');
});

test('a clean session clears only its own intent', async () => {
  const stateRoot = privateDir('os-clr-');
  const { pending } = resolveObjectStorageLockPaths(stateRoot, CONTEXT);
  await withObjectStorageMarkerPreparation(async (session) => {
    const handle = session.recordIntent(validIntent());
    session.authorizeWrite(handle);
    session.clearIntent(handle);
    assert.throws(() => assertOwnedMarkerIntent(handle), /not active/);
  }, { stateRoot });
  assert.equal(existsSync(pending), false);
});

test('CLI shape: only the exact argument vector is accepted', () => {
  for (const args of [[], ['dev'], ['release', '--confirm-context', CONTEXT, '--descriptor-file', '/x'],
    ['dev', '--confirm-context', CONTEXT, '--descriptor-file'], ['dev', '--confirm-context', CONTEXT, '--descriptor-file', '/x', 'extra']]) {
    const r = spawnSync(process.execPath, [ENTRY, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.equal(r.status, 2, args.join(' '));
    assert.equal(r.stdout, '');
  }
  const unauthorized = spawnSync(process.execPath, [ENTRY, 'dev', '--confirm-context', CONTEXT, '--descriptor-file', '/nonexistent/x/m.json'],
    { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(unauthorized.status, 1);
  assert.equal(JSON.parse(unauthorized.stdout).mutated, false);
});
