import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertMetricsQuiescence,
  parseMarkerDescriptor,
  readMarkerDescriptorFile,
  upgradeObjectStorageMetrics,
} from '../providers/seaweedfs/install.mjs';
import {
  assertOwnedMetricsIntent,
  readObjectStoragePendingState,
  resolveObjectStorageLockPaths,
} from '../providers/seaweedfs/mutation-guard.mjs';
import { parseMetricFamilies } from '../providers/seaweedfs/live-sdk.mjs';

const CONTEXT = 'kind-offscreen-dev';
const INSTALL = join(dirname(fileURLToPath(import.meta.url)), '../providers/seaweedfs/install.mjs');
const MARKER = {
  schema: 1,
  bucket: `offscreen-e2-marker-${'a'.repeat(32)}`,
  key: 'retained-marker.bin',
  sha256: 'b'.repeat(64),
  size: 64,
};
const ENV = {
  OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE: 'authorized',
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
const NEW_CHAIN = {
  ...BASE_CHAIN,
  historyId: 'dev-metrics-r1-r2',
  replicaSetUid: 'rs-new',
  predecessorReplicaSetUid: 'rs-old',
  podUid: 'pod-new',
  helmStorageUids: { 1: 'h1', 2: 'h2' },
};
const DIGESTS = { predecessorManifestSha256: 'c'.repeat(64), targetManifestSha256: 'd'.repeat(64) };
const FAMILIES = [{ name: 'SeaweedFS_s3_request_total', type: 'counter', labelKeys: ['code'] }];

function fakeChild({ status = 0, signal = null }) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.kill = () => {};
  setImmediate(() => child.emit('close', status, signal));
  return child;
}

/** Fixture world: phase flips to `upgraded` only on a successful fake Helm. */
function world(options = {}) {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-mt-'));
  const { pending } = resolveObjectStorageLockPaths(stateRoot, CONTEXT);
  const w = {
    stateRoot,
    pending,
    phase: options.phase ?? 'base',
    spawns: [],
    pendingAtSpawn: null,
    beforeCalls: 0,
    ownedCalls: 0,
    markerReads: 0,
    scrapes: 0,
    quiescenceCalls: 0,
    memoryText: 'MemAvailable: 8388608 kB\nMemTotal: 16777216 kB\n',
  };
  const helmOutcome = options.helm ?? { status: 0 };
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
    computeDigests: () => DIGESTS,
    operationId: () => 'op-1',
    spawnChild: (command, argv) => {
      w.spawns.push({ command, argv });
      w.pendingAtSpawn = readObjectStoragePendingState(stateRoot, CONTEXT).kind;
      if (helmOutcome.status === 0 && !helmOutcome.signal) w.phase = 'upgraded';
      return fakeChild(helmOutcome);
    },
    readMarker: async (descriptor, secret, opts) => {
      w.markerReads += 1;
      (w.markerBudgets ??= []).push(opts?.budgetMs);
      options.markerRead?.(w, secret);
      return { sha256: MARKER.sha256, size: MARKER.size, ...options.markerResult };
    },
    scrapeMetrics: async () => {
      w.scrapes += 1;
      if (options.scrapeFails) throw new Error('boom secret-ish');
      return options.families ?? FAMILIES;
    },
    observers: {
      history: () =>
        w.phase === 'base'
          ? { state: 'native-compatible', historyId: 'dev-base-r1' }
          : { state: 'native-compatible', historyId: 'dev-metrics-r1-r2' },
      chain: () => ({ state: 'native-compatible', historyId: 'dev-metrics-r1-r2' }),
      before: () => {
        w.beforeCalls += 1;
        return options.before ?? { ok: true, chain: structuredClone(BASE_CHAIN) };
      },
      owned: (handle, id) => {
        assertOwnedMetricsIntent(handle);
        w.ownedCalls += 1;
        options.owned?.(w, id);
        if (id === 'dev-base-r1') return { ok: true, chain: structuredClone(BASE_CHAIN) };
        return {
          ok: true,
          chain: structuredClone(options.successor ?? NEW_CHAIN),
        };
      },
    },
    ...options.deps,
  };
  w.deps = deps;
  w.run = (request = {}) =>
    upgradeObjectStorageMetrics(
      { confirmContext: CONTEXT, markerDescriptor: MARKER, ...request },
      deps,
    );
  w.pendingKind = () => readObjectStoragePendingState(stateRoot, CONTEXT).kind;
  return w;
}

const EXPECTED_ARGV_TAIL = [
  '--kube-context', CONTEXT, '--namespace', 'offscreen-dev-objects',
  '--reset-values', '-f',
];

test('predecessor to target: one exact Helm argv, durable intent first, cleared on proof', async () => {
  const w = world();
  const result = await w.run();
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'transition-proven');
  assert.equal(result.mutated, true);
  assert.equal(result.intentRetained, false);
  assert.equal(w.spawns.length, 1);
  const { command, argv } = w.spawns[0];
  assert.equal(command, 'helm');
  assert.deepEqual(argv.slice(0, 2), ['upgrade', 'object-store']);
  assert.deepEqual(argv.slice(3, 9), EXPECTED_ARGV_TAIL);
  assert.deepEqual(argv.slice(10), ['--wait', '--timeout', '180s']);
  assert.ok(argv[2].endsWith('providers/seaweedfs/chart'));
  assert.ok(argv[9].endsWith('profiles/development.yaml'));
  for (const banned of ['--force', '--atomic', '--reuse-values', 'rollback', 'uninstall']) {
    assert.ok(!argv.includes(banned));
  }
  assert.equal(w.pendingAtSpawn, 'metrics', 'intent is durable before dispatch');
  assert.equal(w.pendingKind(), 'absent');
  assert.equal(w.markerReads, 2);
  assert.equal(w.scrapes, 1);
  assert.deepEqual(result.retainedMarker, { sha256: MARKER.sha256, size: MARKER.size });
  assert.deepEqual(result.metricFamilies, FAMILIES);
  assert.deepEqual(result.pods, { old: 'pod-old', new: 'pod-new' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes(MARKER.bucket), 'receipt carries no bucket or key');
});

test('exact target repeat is a zero-write no-op without intent', async () => {
  const w = world({ phase: 'upgraded' });
  const result = await w.run();
  assert.equal(result.ok, true);
  assert.equal(result.state, 'native-noop');
  assert.equal(result.mutated, false);
  assert.equal(w.spawns.length, 0);
  assert.equal(w.beforeCalls, 0);
  assert.equal(w.pendingKind(), 'absent');
  assert.equal(existsSync(w.pending), false);
});

test('target no-op refuses when the chain is not the exact target', async () => {
  const w = world({ phase: 'upgraded', deps: { observers: { chain: () => ({ state: 'refused', reason: 'x' }) } } });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(w.spawns.length, 0);
});

const REFUSALS = [
  ['wrong context', {}, { confirmContext: 'kind-other' }],
  ['missing upgrade authorization', { env: { OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE: undefined } }],
  ['missing quiescence variable', { env: { OFFSCREEN_OBJECT_STORAGE_MAINTENANCE: 'no' } }],
  ['active consumer/lease', { quiescence: () => { throw Object.assign(new Error('dev registry has an active lease or process'), { name: 'OwnerRefusal' }); } }],
  ['insufficient memory', { memory: 'MemAvailable: 1024 kB\n' }],
  ['unreadable memory', { memory: '' }],
  ['malformed descriptor', {}, { markerDescriptor: { ...MARKER, extra: 1 } }],
  ['bad marker bucket', {}, { markerDescriptor: { ...MARKER, bucket: 'x' } }],
  ['marker size out of range', {}, { markerDescriptor: { ...MARKER, size: 31 } }],
  ['wrong UID / history / RS (predecessor refused)', { before: { ok: false, reason: 'owner chain identity is incomplete' } }],
  ['Secret mismatch (marker admin Secret changed)', { markerRead: () => { throw new Error('credential observation changed'); } }],
  ['marker hash mismatch', { markerResult: { sha256: 'e'.repeat(64) } }],
  ['marker size mismatch', { markerResult: { size: 65 } }],
];
for (const [label, options, request] of REFUSALS) {
  test(`refuses ${label} with zero writes and no intent`, async () => {
    const w = world(options);
    if (options.memory !== undefined) w.memoryText = options.memory;
    const result = await w.run(request);
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
    assert.equal(result.intentRetained, false);
    assert.equal(w.spawns.length, 0);
    assert.equal(w.pendingKind(), 'absent');
  });
}

test('non-predecessor history refuses', async () => {
  const w = world({ deps: { observers: { history: () => ({ state: 'refused', reason: 'legacy' }) } } });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(w.spawns.length, 0);
});

test('quiescence is repeated immediately before the write', async () => {
  const w = world();
  await w.run();
  assert.equal(w.quiescenceCalls, 2);
});

test('quiescence appearing on the second check refuses before any intent', async () => {
  const w = world({
    quiescence: (state) => {
      if (state.quiescenceCalls === 2) throw Object.assign(new Error('late consumer'), { name: 'OwnerRefusal' });
    },
  });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(w.spawns.length, 0);
  assert.equal(w.pendingKind(), 'absent');
});

for (const [label, content] of [
  ['unowned legacy pending', { profileId: 'dev', contextName: CONTEXT, startedAt: 'x', identity: {} }],
  ['unknown schema pending', { schema: 3 }],
  ['malformed metrics pending', { schema: 2, operation: 'upgrade-metrics' }],
]) {
  test(`existing ${label} refuses without writes or change`, async () => {
    const w = world();
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dirname(w.pending), { recursive: true, mode: 0o700 });
    const body = JSON.stringify(content);
    writeFileSync(w.pending, body, { mode: 0o600 });
    const result = await w.run();
    assert.equal(result.ok, false);
    assert.equal(result.intentRetained, false);
    assert.equal(w.spawns.length, 0);
    assert.equal(readFileSync(w.pending, 'utf8'), body);
  });
}

test('changed pending before dispatch refuses the dispatch', async () => {
  const w = world({
    owned: (state, id) => {
      if (id === 'dev-base-r1') writeFileSync(state.pending, '{"tampered":true}');
    },
  });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(w.spawns.length, 0);
  assert.equal(readFileSync(w.pending, 'utf8'), '{"tampered":true}');
});

for (const [label, helm] of [
  ['failed Helm', { status: 1 }],
  ['lost/unknown Helm (signal)', { status: null, signal: 'SIGKILL' }],
]) {
  test(`${label} retains the fence and issues zero further writes`, async () => {
    const w = world({ helm });
    const result = await w.run();
    assert.equal(result.ok, false);
    assert.equal(result.mutated, true);
    assert.equal(result.intentRetained, true);
    assert.equal(w.spawns.length, 1);
    assert.equal(w.pendingKind(), 'metrics');
    assert.equal(w.markerReads, 1, 'no post-write verification calls');
    assert.equal(w.scrapes, 0);
    // A repeat is refused by the retained fence and writes nothing.
    const again = await w.run();
    assert.equal(again.ok, false);
    assert.equal(w.spawns.length, 1);
    assert.equal(w.pendingKind(), 'metrics');
  });
}

const POST_FAILURES = [
  ['marker failure after write', { markerRead: (state) => { if (state.markerReads === 2) throw new Error('x'); } }],
  ['marker mismatch after write', { markerRead: () => {}, deps: null, second: true }],
  ['endpoint failure', { scrapeFails: true }],
  ['empty endpoint families', { families: [] }],
  ['successor Pod unchanged', { successor: { ...NEW_CHAIN, podUid: 'pod-old' } }],
  ['successor Secret changed', { successor: { ...NEW_CHAIN, secretUid: 'other' } }],
  ['successor PV directory changed', { successor: { ...NEW_CHAIN, dataDirectoryIdentity: '64:99' } }],
  ['successor retained storage UID changed', { successor: { ...NEW_CHAIN, helmStorageUids: { 1: 'zz', 2: 'h2' } } }],
  ['successor predecessor RS wrong', { successor: { ...NEW_CHAIN, predecessorReplicaSetUid: 'rs-x' } }],
  ['successor observation refused', { owned: (state, id) => { if (id === 'dev-metrics-r1-r2') throw new Error('Object storage observation changed'); } }],
  ['cleanup failure (record changed before clear)', {
    owned: (state, id) => {
      if (id === 'dev-metrics-r1-r2' && state.ownedCalls === 3) writeFileSync(state.pending, '{"changed":1}');
    },
  }],
];
for (const [label, options] of POST_FAILURES) {
  test(`${label} retains the fence with exactly one write`, async () => {
    const opts = { ...options };
    if (opts.second) {
      opts.markerResult = undefined;
      opts.markerRead = undefined;
    }
    const w = world(opts);
    if (options.second) {
      let reads = 0;
      w.deps.readMarker = async () => {
        reads += 1;
        return { sha256: reads === 1 ? MARKER.sha256 : 'f'.repeat(64), size: MARKER.size };
      };
    }
    const result = await w.run();
    assert.equal(result.ok, false, label);
    assert.equal(result.intentRetained, true);
    assert.equal(w.spawns.length, 1);
    assert.notEqual(w.pendingKind(), 'absent');
    assert.ok(!JSON.stringify(result).includes('secret-ish'), 'raw error text is withheld');
  });
}

test('quiescence rejects leases, process identity, active slot workload and bad registry', () => {
  const registry = (overrides = {}) => ({
    version: 2,
    environmentsById: {
      s1: { namespace: 'offscreen-dev-1', lease: null, processIdentity: null, ...overrides },
    },
  });
  const cluster = (items = {}) => (command, args) => {
    const key = args.slice(2, args.indexOf('-o')).join(' ');
    const reply = items[key] ?? [];
    return { ok: true, stdout: JSON.stringify({ items: reply }) };
  };
  const quiet = { 'get namespaces': [{ metadata: { name: 'offscreen-dev-1' } }, { metadata: { name: 'offscreen-dev-objects' } }] };
  const check = (reg, run) =>
    assertMetricsQuiescence({ run, contextName: CONTEXT, registryRoot: '/r', readRegistry: () => reg });
  check(registry(), cluster(quiet));
  assert.throws(() => check(registry({ lease: { x: 1 } }), cluster(quiet)), /lease/);
  assert.throws(() => check(registry({ processIdentity: { pid: 1 } }), cluster(quiet)), /lease or process/);
  assert.throws(() => assertMetricsQuiescence({ run: cluster(quiet), contextName: CONTEXT, registryRoot: '/r', readRegistry: () => { throw new Error('missing'); } }), /registry/);
  assert.throws(() => check(registry(), cluster({ ...quiet, 'get pods -n offscreen-dev-1': [{ status: { phase: 'Running' } }] })), /Pod/);
  assert.throws(() => check(registry(), cluster({ ...quiet, 'get pods -n offscreen-dev-1': [{ metadata: { deletionTimestamp: 'x' }, status: { phase: 'Succeeded' } }] })), /Pod/);
  assert.throws(() => check(registry(), cluster({ ...quiet, 'get jobs -n offscreen-dev-1': [{ status: { active: 1 } }] })), /Job/);
  assert.throws(() => check(registry(), cluster({ ...quiet, 'get deployments -n offscreen-dev-1': [{ spec: { replicas: 1 } }] })), /controller/);
  assert.throws(() => check(registry(), cluster({ ...quiet, 'get statefulsets -n offscreen-dev-1': [{ spec: {} }] })), /controller/);
  assert.throws(() => check(registry(), () => ({ ok: false })), /inventory/);
  // An unregistered numbered slot namespace is inspected too.
  assert.throws(() => check({ version: 2, environmentsById: {} }, cluster({ ...quiet, 'get pods -n offscreen-dev-1': [{ status: { phase: 'Pending' } }] })), /Pod/);
});

test('marker descriptor file requires a private regular file with the exact shape', () => {
  const dir = mkdtempSync(join(tmpdir(), 'os-marker-'));
  const file = join(dir, 'm.json');
  writeFileSync(file, JSON.stringify(MARKER), { mode: 0o600 });
  assert.deepEqual(readMarkerDescriptorFile(file), MARKER);
  chmodSync(file, 0o644);
  assert.throws(() => readMarkerDescriptorFile(file), /private/);
  chmodSync(file, 0o600);
  const link = join(dir, 'l.json');
  symlinkSync(file, link);
  assert.throws(() => readMarkerDescriptorFile(link), /unreadable/);
  const big = join(dir, 'b.json');
  writeFileSync(big, ' '.repeat(5000), { mode: 0o600 });
  assert.throws(() => readMarkerDescriptorFile(big), /private/);
  const extra = join(dir, 'e.json');
  writeFileSync(extra, JSON.stringify({ ...MARKER, accessKey: 'x' }), { mode: 0o600 });
  assert.throws(() => readMarkerDescriptorFile(extra), /malformed/);
  assert.throws(() => parseMarkerDescriptor({ ...MARKER, key: 'other' }), /malformed/);
  assert.throws(() => parseMarkerDescriptor({ ...MARKER, sha256: 'A'.repeat(64) }), /malformed/);
});

test('metric parser keeps names, types and label keys only', () => {
  const families = parseMetricFamilies('# TYPE a counter\na{x="1"} 5\n');
  assert.deepEqual(families, [{ name: 'a', type: 'counter', labelKeys: ['x'] }]);
  assert.throws(() => parseMetricFamilies('# TYPE a counter\n'), /empty/);
  assert.throws(() => parseMetricFamilies('not a sample line here !\n'), /malformed/);
});

test('fixed CLI refuses any other shape before touching the cluster', () => {
  const run = (...args) =>
    spawnSync(process.execPath, [INSTALL, ...args], {
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
  for (const args of [
    ['upgrade-metrics'],
    ['upgrade-metrics', 'release', '--confirm-context', CONTEXT, '--marker-file', '/x'],
    ['upgrade-metrics', 'dev', '--confirm-context', CONTEXT],
    ['upgrade-metrics', 'dev', '--marker-file', '/x', '--confirm-context', CONTEXT],
    ['upgrade-metrics', 'dev', '--confirm-context', CONTEXT, '--marker-file', '/x', 'extra'],
  ]) {
    assert.equal(run(...args).status, 2, args.join(' '));
  }
  const missing = run('upgrade-metrics', 'dev', '--confirm-context', CONTEXT, '--marker-file', '/nonexistent/marker.json');
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /marker file is unreadable/);
});

test('remaining custody budget is propagated to each marker read', async () => {
  const w = world();
  const result = await w.run();
  assert.equal(result.ok, true, result.reason);
  assert.equal(w.markerBudgets.length, 2);
  for (const budget of w.markerBudgets) assert.ok(Number.isFinite(budget) && budget > 0 && budget <= 600_000);
  assert.ok(w.markerBudgets[0] >= w.markerBudgets[1]);
});

test('insufficient custody budget refuses before the marker read, intent or any write', async () => {
  const w = world({ deps: { budgetMs: 100_000 } });
  const result = await w.run();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'custody budget is insufficient');
  assert.equal(result.mutated, false);
  assert.equal(result.intentRetained, false);
  assert.equal(w.markerReads, 0);
  assert.equal(w.spawns.length, 0);
  assert.equal(w.pendingKind(), 'absent');
});
