import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { SIGNAL_PROBE_PATH } from '../../../verification/smoke/observability/signals.mjs';
import { acquireCustody, custodyPaths } from '../custody.mjs';
import {
  buildMarkerReceipt,
  compareE2Preservation,
  parseIdentityBytes,
  projectE2Preservation,
  replayArgument,
  runMarkerProbe,
} from '../e2-preservation.mjs';
import { ownedChildResult, openE2UpgradeMarkerForwards, openForwards } from '../forward.mjs';
import { GRAFANA_ADMIN_SECRET } from '../inventory.mjs';

const devKind = readKindProfile('dev');
const NOW = '1788000000123456789';
const IDENTITY_TEXT = `{
  "run": "0123456789abcdef",
  "trace": "0123456789abcdef0123456789abcdef",
  "parent": "1111111111111111",
  "child": "2222222222222222",
  "marker": "obs-e04-0123456789abcdef",
  "now": ${NOW}
}`;
const PREDECESSOR = { artifactId: 'dev-e1-developer', historyId: 'developer-fresh' };

function tuple() {
  return {
    profileId: 'dev',
    contextName: devKind.contextName,
    clusterName: devKind.clusterName,
    port: 24443,
    dockerContext: 'default',
    dockerControlPlaneId: '0123456789abcdef',
    dockerEndpointHost: 'unix:///var/run/docker.sock',
    caSha256: 'ab'.repeat(32),
    kubeSystemUid: 'kube-system-uid',
    baselineUid: 'baseline-uid',
    targetNamespaceUid: 'namespace-uid',
  };
}

function e2Begin(markerIds) {
  return {
    phase: 'prometheus-intent',
    operation: 'upgrade-e2',
    tuple: tuple(),
    details: {
      predecessorId: 'dev-e1-developer',
      predecessorHistoryId: 'developer-fresh',
      targetId: 'dev-e2',
      predecessorManifestSetSha256: 'aa'.repeat(32),
      targetManifestSetSha256: 'bb'.repeat(32),
      kubeletTrustBindingSha256: 'cc'.repeat(32),
      originalCollectorRevision: 1,
      originalPrometheusRevision: 1,
      originalGrafanaRevision: 1,
      targetPrometheusRevision: 2,
      targetGrafanaRevision: 2,
      preservedUids: { namespace: 'namespace-uid' },
      markerIds,
    },
  };
}

async function fixture() {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-e2-up-'));
  mkdirSync(custodyPaths(stateRoot, devKind.contextName).lockDirectory, {
    recursive: true,
    mode: 0o700,
  });
  const custody = await acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 5 });
  return {
    stateRoot,
    custody,
    done() {
      custody.close();
      rmSync(stateRoot, { recursive: true, force: true });
    },
  };
}

function fakeChildFactory(calls) {
  return (command, args, options) => {
    calls.push({ command, args, options });
    const spec = args.at(-1);
    const [localText, remote] = spec.split(':');
    const local = localText === '' ? 45000 + calls.length : Number(localText);
    const done = Promise.resolve(ownedChildResult(true));
    return {
      pid: null,
      closed: done,
      outcome: new Promise(() => {}),
      stop() {},
      onOutput(callback) {
        callback(`Forwarding from 127.0.0.1:${local} -> ${remote}\n`);
      },
    };
  };
}

const identity = {
  snapshotPath: '/nonexistent/kubeconfig',
  tuple: { contextName: devKind.contextName, targetNamespace: 'offscreen-dev-observability' },
};

function adapterOptions(calls, extra = {}) {
  return {
    authorized: true,
    stage: 'pre-intent',
    verifyIdentity: () => true,
    predecessor: PREDECESSOR,
    startChild: fakeChildFactory(calls),
    ...extra,
  };
}

test('identity bytes keep exact nanoseconds and replay never loses precision', () => {
  const parsed = parseIdentityBytes(IDENTITY_TEXT);
  assert.equal(parsed.now, NOW);
  assert.notEqual(String(Number(NOW)), NOW);
  const arg = replayArgument(parsed);
  assert.ok(arg.endsWith(`"now":${NOW}}`));
  assert.equal(parseIdentityBytes(arg).now, NOW);
  for (const bad of [
    IDENTITY_TEXT.replace('"now": ', '"now": 0'),
    IDENTITY_TEXT.replace('obs-e04-0123456789abcdef', 'other'),
    IDENTITY_TEXT.replace('"run": "0123456789abcdef"', '"run": "xyz"'),
    IDENTITY_TEXT.replace('"now"', '"extra": 1, "now"'),
    IDENTITY_TEXT.replace(NOW, `"${NOW}"`),
    '{}',
  ]) {
    assert.throws(() => parseIdentityBytes(bad), /invalid/);
  }
  assert.throws(() => replayArgument({ ...parsed, now: 1788000000123456800 }), /invalid/);
});

function snapshot(overrides = {}) {
  const meta = (uid, rv = '1') => ({ metadata: { uid, resourceVersion: rv } });
  return {
    namespace: { uid: 'ns-uid' },
    persistentVolumes: [
      { metadata: { name: 'pv-a', uid: 'pv-a-uid' } },
      { metadata: { name: 'pv-b', uid: 'pv-b-uid' } },
    ],
    objects: {
      [`Secret/${GRAFANA_ADMIN_SECRET}`]: meta('admin-uid'),
      'Secret/sh.helm.release.v1.obs-prometheus.v1': meta('helm-p1'),
      'PersistentVolumeClaim/obs-loki': { ...meta('pvc-a'), spec: { volumeName: 'pv-a' } },
      'PersistentVolumeClaim/obs-tempo': { ...meta('pvc-b'), spec: { volumeName: 'pv-b' } },
      'StatefulSet/obs-loki': meta('loki-uid', '7'),
      'Service/obs-loki': meta('loki-svc', '8'),
      'Pod/obs-loki-0': meta('loki-pod'),
      'Deployment/obs-prometheus-server': meta('prom-uid', '3'),
      'Pod/obs-prometheus-server-abc': meta('prom-pod'),
      ...overrides,
    },
  };
}

test('preservation allows P/G roll and new objects but refuses identity loss', () => {
  const before = projectE2Preservation(snapshot());
  assert.ok(before);
  assert.equal(before.preservedUids['pv/obs-loki'], 'pv-a-uid');
  assert.equal(before.preservedUids['pod/obs-loki-0'], 'loki-pod');
  assert.equal(before.preservedUids['pod/obs-prometheus-server-abc'], undefined);
  assert.equal(before.versions['Deployment/obs-prometheus-server'], undefined);
  const good = snapshot({
    'Deployment/obs-prometheus-server': { metadata: { uid: 'prom-uid', resourceVersion: '99' } },
    'Pod/obs-prometheus-server-new': { metadata: { uid: 'new-pod', resourceVersion: '1' } },
    'Secret/sh.helm.release.v1.obs-prometheus.v2': { metadata: { uid: 'helm-p2', resourceVersion: '1' } },
    'ServiceAccount/e2-helper': { metadata: { uid: 'helper', resourceVersion: '1' } },
  });
  assert.deepEqual(compareE2Preservation(before, projectE2Preservation(good)), {
    ok: true,
    detail: 'preserved',
  });
  const refusals = {
    'missing PVC': { 'PersistentVolumeClaim/obs-loki': undefined },
    'changed PVC uid': {
      'PersistentVolumeClaim/obs-tempo': { metadata: { uid: 'x' }, spec: { volumeName: 'pv-b' } },
    },
    'changed admin Secret': { [`Secret/${GRAFANA_ADMIN_SECRET}`]: { metadata: { uid: 'x' } } },
    'missing Helm storage': { 'Secret/sh.helm.release.v1.obs-prometheus.v1': undefined },
    'changed backend pod': { 'Pod/obs-loki-0': { metadata: { uid: 'rolled' } } },
    'changed backend version': { 'StatefulSet/obs-loki': { metadata: { uid: 'loki-uid', resourceVersion: '8' } } },
  };
  for (const [name, change] of Object.entries(refusals)) {
    const after = projectE2Preservation(snapshot(change));
    assert.equal(compareE2Preservation(before, after).ok, false, name);
  }
  assert.equal(projectE2Preservation({ namespace: { uid: 'u' }, objects: {} }), null);
});

test('marker adapter: pre-intent opens loopback diagnostic plus query forwards only', async () => {
  const f = await fixture();
  const calls = [];
  const forwards = await openE2UpgradeMarkerForwards(identity, f.custody, {
    ...adapterOptions(calls),
    stateRoot: f.stateRoot,
  });
  assert.deepEqual(Object.keys(forwards.ports).sort(), ['diagnosticHttp', 'loki', 'prometheus', 'tempo']);
  assert.ok(calls.every((call) => call.args.includes('127.0.0.1')));
  assert.ok(calls.some((call) => call.args.at(-1) === ':4318'));
  assert.ok(calls.every((call) => call.options.fds[0] === f.custody.fd));
  await forwards.close();
  f.done();
});

test('marker adapter refuses unauthorized, nonexclusive, wrong predecessor and changed identity', async () => {
  const f = await fixture();
  const calls = [];
  const base = { ...adapterOptions(calls), stateRoot: f.stateRoot };
  const refusals = [
    [identity, f.custody, { ...base, authorized: false }, /not authorized/],
    [identity, { ...f.custody, mode: 'shared', assertOwnPending: f.custody.assertOwnPending }, base, /exclusive custody/],
    [identity, { mode: 'proof', fd: f.custody.fd }, base, /exclusive custody/],
    [identity, f.custody, { ...base, verifyIdentity: () => false }, /identity changed/],
    [identity, f.custody, { ...base, predecessor: { artifactId: 'dev-e1-base', historyId: 'base' } }, /E1 developer/],
    [identity, f.custody, { ...base, predecessor: { artifactId: 'dev-e2', historyId: 'e2-fresh' } }, /E1 developer/],
    [identity, f.custody, { ...base, stage: 'other' }, /stage is invalid/],
  ];
  for (const [id, custody, options, pattern] of refusals) {
    await assert.rejects(() => openE2UpgradeMarkerForwards(id, custody, options), pattern);
  }
  assert.equal(calls.length, 0);
  f.done();
});

test('public openForwards still refuses diagnostic for exclusive mode and recursion is refused', async () => {
  const f = await fixture();
  await assert.rejects(
    () =>
      openForwards(
        identity,
        { fd: f.custody.fd, mode: 'exclusive', pending: false },
        { bindings: [{ key: 'diagnosticHttp', localPort: 0 }], startChild: fakeChildFactory([]) },
      ),
    /requires a proof lock/,
  );
  // recursive/pending custody: a pending record forbids the pre-intent adapter
  f.custody.begin(e2Begin({ run: 'r' }));
  await assert.rejects(
    () => openE2UpgradeMarkerForwards(identity, f.custody, { ...adapterOptions([]), stateRoot: f.stateRoot }),
    /no pending receipt/,
  );
  f.done();
});

test('marker adapter: replay needs the owned record and opens query forwards only', async () => {
  const f = await fixture();
  await assert.rejects(
    () =>
      openE2UpgradeMarkerForwards(identity, f.custody, {
        ...adapterOptions([], { stage: 'replay' }),
        stateRoot: f.stateRoot,
      }),
    /owned upgrade record/,
  );
  f.done();
  const g = await fixture();
  g.custody.begin(e2Begin({ run: 'r' }));
  const calls = [];
  const forwards = await openE2UpgradeMarkerForwards(identity, g.custody, {
    ...adapterOptions(calls, { stage: 'replay' }),
    stateRoot: g.stateRoot,
  });
  assert.deepEqual(Object.keys(forwards.ports).sort(), ['loki', 'prometheus', 'tempo']);
  assert.ok(calls.every((call) => !call.args.at(-1).endsWith(':4318')));
  await forwards.close();
  g.done();
});

test('marker adapter refuses a foreign or replaced pending record in replay', async () => {
  const f = await fixture();
  f.custody.begin(e2Begin({ run: 'r' }));
  writeFileSync(custodyPaths(f.stateRoot, devKind.contextName).pendingPath, '{', { mode: 0o600 });
  await assert.rejects(
    () =>
      openE2UpgradeMarkerForwards(identity, f.custody, {
        ...adapterOptions([], { stage: 'replay' }),
        stateRoot: f.stateRoot,
      }),
    /owned upgrade record/,
  );
  f.done();
});

function probeChild(written, stdout, ok = true) {
  return (command, args, options) => {
    written.args = args;
    written.options = options;
    const out = args[1];
    mkdirSync(out, { recursive: true, mode: 0o700 });
    writeFileSync(join(out, 'identity.json'), IDENTITY_TEXT);
    writeFileSync(join(out, 'trace.query.json'), '{"secret":"payload-body"}');
    const result = ownedChildResult(ok, { stdout, exitCode: ok ? 0 : 1 });
    return { closed: Promise.resolve(result), outcome: Promise.resolve(result), stop() {}, onOutput() {} };
  };
}

test('marker probe runs under the inherited lock fd and keeps only sanitized evidence', async () => {
  const f = await fixture();
  const seen = {};
  const result = await runMarkerProbe({
    custody: f.custody,
    stage: 'pre-intent',
    ports: { diagnosticHttp: 4000, prometheus: 19090, loki: 13100, tempo: 13200 },
    startChild: probeChild(seen, 'OTLP accepted traces\nPASS trace\nPASS log\nPASS metric\nSIGNAL PASS\n'),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(seen.options.fds, [f.custody.fd]);
  assert.equal(seen.args.length, 6);
  assert.equal(seen.args[0], SIGNAL_PROBE_PATH);
  assert.equal(seen.args[2], 'http://127.0.0.1:4000');
  assert.equal(result.receipt.markerIds.now, NOW);
  assert.deepEqual(Object.keys(result.receipt).sort(), ['markerIds', 'positives', 'stage']);
  assert.ok(!JSON.stringify(result).includes('payload-body'));
  assert.equal(existsSync(seen.args[1]), false);
  f.done();
});

test('marker probe: missing positive after POST fences; replay is query-only', async () => {
  const f = await fixture();
  const pre = await runMarkerProbe({
    custody: f.custody,
    stage: 'pre-intent',
    ports: { diagnosticHttp: 4000, prometheus: 1, loki: 2, tempo: 3 },
    startChild: probeChild({}, 'PASS trace\nPASS log\n', false),
  });
  assert.equal(pre.ok, false);
  assert.equal(pre.fence, true);
  const identityValue = parseIdentityBytes(IDENTITY_TEXT);
  await assert.rejects(
    () =>
      runMarkerProbe({
        custody: f.custody,
        stage: 'replay',
        identity: identityValue,
        ports: { diagnosticHttp: 4000, prometheus: 1, loki: 2, tempo: 3 },
        startChild: probeChild({}, ''),
      }),
    /query-only/,
  );
  const seen = {};
  const replay = await runMarkerProbe({
    custody: f.custody,
    stage: 'replay',
    identity: identityValue,
    ports: { prometheus: 19090, loki: 13100, tempo: 13200 },
    startChild: probeChild(seen, 'PASS trace\nPASS log\nPASS metric\n'),
  });
  assert.equal(replay.ok, true);
  assert.equal(seen.args.length, 7);
  assert.ok(seen.args[6].endsWith(`"now":${NOW}}`));
  assert.equal(seen.args[2], 'http://127.0.0.1:1');
  const failed = await runMarkerProbe({
    custody: f.custody,
    stage: 'replay',
    identity: { ...identityValue, run: 'ffffffffffffffff', marker: 'obs-e04-ffffffffffffffff' },
    ports: { prometheus: 1, loki: 2, tempo: 3 },
    startChild: probeChild({}, 'PASS trace\nPASS log\nPASS metric\n'),
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.reasonCode, 'identity-changed');
  await assert.rejects(
    () => runMarkerProbe({ custody: { mode: 'shared', fd: 1 }, stage: 'pre-intent', ports: {} }),
    /exclusive custody/,
  );
  f.done();
});

test('receipt is a closed whitelist without payload or credentials', () => {
  const receipt = buildMarkerReceipt('replay', parseIdentityBytes(IDENTITY_TEXT), {
    trace: true,
    log: 'yes',
    metric: true,
    token: 'secret',
  });
  assert.deepEqual(receipt.positives, { trace: true, log: false, metric: true });
  assert.ok(!JSON.stringify(receipt).includes('secret'));
});

test('existing signal-probe replay mode never POSTs', () => {
  const script = `
import importlib.util, json, pathlib, sys, tempfile
spec = importlib.util.spec_from_file_location('sp', sys.argv[1])
sp = importlib.util.module_from_spec(spec); spec.loader.exec_module(sp)
posts = []
ticks = iter(range(0, 10_000_000, 30))
def http_call(base, path, params=None, data=None, *, timeout_s):
    if data is not None:
        posts.append(path)
    raise RuntimeError('stub')
replay = dict(run='0123456789abcdef', trace='0'*32, parent='1'*16, child='2'*16, marker='obs-e04-0123456789abcdef', now=${NOW})
with tempfile.TemporaryDirectory() as d:
    rc = sp.run_probe(pathlib.Path(d) / 'o', 'http://c', 'http://p', 'http://l', 'http://t', replay=replay, http_call=http_call, monotonic=lambda: next(ticks), sleep=lambda s: None)
    ident = (pathlib.Path(d) / 'o' / 'identity.json').read_text()
print(json.dumps({'rc': rc, 'posts': posts, 'now': str(replay['now']) in ident}))
`;
  const run = spawnSync('/usr/bin/python3', ['-I', '-c', script, SIGNAL_PROBE_PATH], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout.trim().split('\n').at(-1));
  assert.deepEqual(out.posts, []);
  assert.equal(out.rc, 1);
  assert.equal(out.now, true);
});

// ---------------------------------------------------------------- T03: ordered upgrade
import { readPlatformProfile } from '../../common/profile.mjs';
import { exitCodeForUpgrade, runObservabilityUpgrade } from '../upgrade.mjs';
import { helmE2UpgradeArgv } from '../upgrade-e2.mjs';
import { readPending } from '../custody.mjs';

const BINDING = 'dd'.repeat(32);
const profile = readPlatformProfile('dev');
const memoryOk = { ok: true, stdout: 'MemAvailable: 8388608 kB\n' };

function releaseOf(role) {
  return {
    role,
    name: `obs-${role}`,
    chartPath: `/charts/${role}`,
    valuesPaths: [`/values/${role}.yaml`],
    helmValueArgs: ['--set', `${role}=1`],
    documents: [{ kind: 'ConfigMap', metadata: { name: role } }],
  };
}
const predecessorBundle = {
  artifactId: 'dev-e1-developer',
  releases: [releaseOf('prometheus'), releaseOf('grafana')],
};
const desiredBundle = {
  artifactId: 'dev-e2',
  kubeletTrustBindingSha256: BINDING,
  releases: [releaseOf('prometheus'), releaseOf('grafana')],
};
const artifactSet = {
  desired: desiredBundle,
  admissible: [predecessorBundle, desiredBundle],
  staticInventory: null,
};

/** @param {{ [key: string]: any }} [opt] */
async function e2Harness(opt = {}) {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-e2-flow-'));
  mkdirSync(custodyPaths(stateRoot, devKind.contextName).lockDirectory, {
    recursive: true,
    mode: 0o700,
  });
  const trace = [];
  const verifierCalls = [];
  const helmArgv = [];
  let binding = BINDING;
  let classification = opt.classification ?? {
    state: 'not-ready',
    reasonCode: 'upgrade-required',
    artifactId: 'dev-e1-developer',
    historyId: 'developer-fresh',
    pending: false,
  };
  const pendingFile = custodyPaths(stateRoot, devKind.contextName).pendingPath;
  let snap = snapshot();
  const idObject = {
    snapshotPath: '/tmp/kubeconfig',
    contextName: profile.contextName,
    namespace: profile.namespaces.observability,
    tuple: { ...tuple(), targetNamespaceUid: 'ns-uid' },
    cleanup() {},
  };
  const markerIds = parseIdentityBytes(IDENTITY_TEXT);
  const deps = {
    argv: ['--evolution', 'e2'],
    run: async () => memoryOk,
    stateRoot,
    readPlatformProfile: () => profile,
    captureIdentity: async () => idObject,
    readKubeletTrust: () => ({ bindingSha256: binding }),
    loadOperationalArtifactSet: () => artifactSet,
    acquireCustody: (contextName, d) => acquireCustody(contextName, { ...d, stateRoot }),
    recheckIdentity: () => ({ ok: opt.identityOk?.() ?? true }),
    collectInventory: async () => {
      trace.push('collect');
      return snap;
    },
    classifyOperationalInventory: () => classification,
    readPending: (contextName) => readPending(contextName, { stateRoot }),
    openMarkerForwards: async (_id, custody, o) => {
      trace.push(`forwards:${o.stage}`);
      assert.equal(custody.mode, 'exclusive');
      assert.equal(o.authorized, true);
      return { ports: { prometheus: 1, loki: 2, tempo: 3, diagnosticHttp: 4 }, close: async () => ({ ok: opt.closeOk?.(o.stage) ?? true }) };
    },
    runMarkerProbe: async (input) => {
      trace.push(`marker:${input.stage}`);
      if (opt.markerFail?.(input.stage)) return { ok: false, receipt: null };
      return { ok: true, receipt: { stage: input.stage, markerIds, positives: {} } };
    },
    runMutation: async (command, args, o) => {
      assert.equal(command, 'helm');
      assert.ok(o.custody);
      helmArgv.push(args);
      trace.push(`helm:${args[1]}`);
      opt.afterHelm?.(args[1], { pendingFile });
      return opt.helmFail?.(args[1]) ? { ok: false } : { ok: true };
    },
    verifyOwnedHistoryShape: (snapshotArg, set, params) => {
      assert.equal(set, artifactSet);
      const record = params.custody.assertOwnPending();
      assert.equal(record.operationId, params.operationId);
      assert.equal(record.operation, 'upgrade-e2');
      assert.equal(params.expectedOperation, 'upgrade-e2');
      assert.equal(params.namespaceUid, 'ns-uid');
      assert.equal(record.phase, params.pendingPhase);
      verifierCalls.push([params.historyId, params.phase, params.pendingPhase]);
      trace.push(`verify:${params.historyId}:${params.phase}:${params.pendingPhase}`);
      if (opt.verifyFail?.(params)) return { ok: false, detail: 'shape-refused' };
      return { ok: true, detail: 'owned-history-shape', artifactId: 'x', historyId: params.historyId, phase: params.phase };
    },
    openForwards: async (_i, held) => {
      trace.push('forwards:transport');
      assert.equal(held.mode, 'exclusive');
      return { ports: { developerHttp: 5 }, close: async () => ({ ok: true }) };
    },
    probeForwardTransport: async () => {
      trace.push('transport');
      return { ok: opt.transportOk?.() ?? true };
    },
    ...opt.deps,
  };
  return {
    deps,
    trace,
    verifierCalls,
    helmArgv,
    pendingFile,
    stateRoot,
    setBinding: (value) => {
      binding = value;
    },
    setClassification: (value) => {
      classification = value;
    },
    setSnapshot: (value) => {
      snap = value;
    },
    async run() {
      const previous = process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
      process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = 'authorized';
      try {
        return await runObservabilityUpgrade(deps);
      } finally {
        if (previous == null) delete process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
        else process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = previous;
      }
    },
    cleanup() {
      rmSync(stateRoot, { recursive: true, force: true });
    },
  };
}

const HELM_ORDER = (trace) => trace.filter((t) => t.startsWith('helm:'));

test('E2 upgrade runs the ordered two-phase path and clears only at the end', async () => {
  for (const history of ['developer-fresh', 'developer-upgraded']) {
    const h = await e2Harness({
      classification: {
        state: 'not-ready',
        reasonCode: 'upgrade-required',
        artifactId: 'dev-e1-developer',
        historyId: history,
        pending: false,
      },
    });
    const receipt = await h.run();
    assert.equal(receipt.ok, true, JSON.stringify(receipt));
    assert.equal(receipt.mutation, 'confirmed');
    assert.equal(receipt.pending, false);
    assert.equal(existsSync(h.pendingFile), false);
    assert.deepEqual(HELM_ORDER(h.trace), ['helm:obs-prometheus', 'helm:obs-grafana']);
    const e2 = `e2-from-${history}`;
    assert.deepEqual(h.verifierCalls, [
      [history, null, 'prometheus-intent'],
      [history, 'prometheus-intent', 'prometheus-intent'],
      [history, 'grafana-intent', 'grafana-intent'],
      [e2, null, 'grafana-intent'],
      [e2, null, 'final-verification'],
      [e2, null, 'final-verification'],
    ]);
    const order = h.trace.filter((t) => /^(marker|helm|transport)/.test(t));
    assert.deepEqual(order, [
      'marker:pre-intent',
      'helm:obs-prometheus',
      'marker:replay',
      'helm:obs-grafana',
      'marker:replay',
      'marker:replay',
      'transport',
    ]);
    for (const argv of h.helmArgv) {
      for (const flag of ['--force', '--reuse-values', '--atomic', 'rollback']) {
        assert.ok(!argv.includes(flag));
      }
      assert.ok(argv.includes('--reset-values'));
    }
    assert.deepEqual(h.helmArgv[0], helmE2UpgradeArgv(
      { snapshotPath: '/tmp/kubeconfig', contextName: profile.contextName, namespace: profile.namespaces.observability },
      desiredBundle.releases[0],
    ));
    h.cleanup();
  }
});

test('E2 CLI refuses invalid invocation and missing authorization before any access', async () => {
  let touched = false;
  const deps = { run: async () => { touched = true; return memoryOk; } };
  for (const argv of [['--evolution'], ['--evolution', 'e1'], ['--evolution', 'e2', 'x'], ['e2'], ['--force']]) {
    const r = await runObservabilityUpgrade({ ...deps, argv });
    assert.equal(r.reasonCode, 'invalid-invocation');
    assert.equal(exitCodeForUpgrade(r), 2);
  }
  const previous = process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
  delete process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
  const denied = await runObservabilityUpgrade({ ...deps, argv: ['--evolution', 'e2'] });
  assert.equal(denied.reasonCode, 'ensure-not-authorized');
  if (previous != null) process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = previous;
  assert.equal(touched, false);
});

test('E2 refuses base, unknown, foreign, pending and absent shapes without writes', async () => {
  const shapes = [
    { state: 'not-ready', reasonCode: 'upgrade-required', artifactId: 'dev-e1-base', historyId: 'base-fresh' },
    { state: 'not-ready', reasonCode: 'not-ready', artifactId: null, historyId: null },
    { state: 'foreign', reasonCode: 'foreign', artifactId: null, historyId: null },
    { state: 'absent', reasonCode: 'absent', artifactId: null, historyId: null },
    { state: 'not-ready', reasonCode: 'pending', artifactId: null, historyId: null, pending: true },
    { state: 'ready', reasonCode: 'ready', artifactId: 'dev-e1-developer', historyId: 'developer-fresh', desiredConverged: false },
  ];
  for (const classification of shapes) {
    const h = await e2Harness({ classification });
    const receipt = await h.run();
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutation, 'none');
    assert.deepEqual(h.trace.filter((t) => /^(helm|marker)/.test(t)), []);
    assert.equal(existsSync(h.pendingFile), false);
    h.cleanup();
  }
});

test('E2 existing pending record is refused and never adopted', async () => {
  const h = await e2Harness();
  const seed = await acquireCustody(devKind.contextName, { stateRoot: h.stateRoot, lockWaitSec: 5 });
  seed.begin(e2Begin({ run: 'r' }));
  seed.close();
  const receipt = await h.run();
  assert.equal(receipt.reasonCode, 'pending');
  assert.equal(receipt.pending, true);
  assert.deepEqual(h.trace, []);
  assert.equal(existsSync(h.pendingFile), true);
  h.cleanup();
});

test('exact final E2 repeat is nonmutating and E2-on-E2 never begins custody', async () => {
  const h = await e2Harness({
    classification: { state: 'ready', reasonCode: 'ready', artifactId: 'dev-e2', historyId: 'e2-fresh', desiredConverged: true, pending: false },
  });
  const receipt = await h.run();
  assert.equal(receipt.ok, true);
  assert.equal(receipt.mutation, 'none');
  assert.deepEqual(h.trace.filter((t) => /^(helm|marker|verify)/.test(t)), []);
  assert.equal(existsSync(h.pendingFile), false);
  h.cleanup();
});

test('missing or drifting G2 trust binding refuses before writes and retains owned pending after intent', async () => {
  const unavailable = await e2Harness({ deps: { readKubeletTrust: () => { throw new Error('x'); } } });
  assert.equal((await unavailable.run()).reasonCode, 'kubelet-trust-unavailable');
  assert.deepEqual(unavailable.trace, []);
  unavailable.cleanup();

  const mismatch = await e2Harness({ deps: { readKubeletTrust: () => ({ bindingSha256: 'ee'.repeat(32) }) } });
  assert.equal((await mismatch.run()).reasonCode, 'kubelet-trust-unavailable');
  mismatch.cleanup();

  // drift before the first write (after pre-intent markers, before intent)
  let reads = 0;
  const pre = await e2Harness({
    deps: {
      readKubeletTrust: () => {
        reads += 1;
        return { bindingSha256: reads > 2 ? 'ee'.repeat(32) : BINDING };
      },
    },
  });
  const r = await pre.run();
  assert.equal(r.ok, false);
  assert.equal(HELM_ORDER(pre.trace).length, 0);
  pre.cleanup();

  // drift after the P write: owned pending stays, no G write, no clear
  const mid = await e2Harness({
    afterHelm: () => mid.setBinding('ee'.repeat(32)),
  });
  const receipt = await mid.run();
  assert.equal(receipt.ok, false);
  assert.equal(receipt.reasonCode, 'kubelet-trust-changed');
  assert.equal(receipt.pending, true);
  assert.deepEqual(HELM_ORDER(mid.trace), ['helm:obs-prometheus']);
  assert.equal(existsSync(mid.pendingFile), true);
  mid.cleanup();

  // drift before the final clear
  let sawTransport = false;
  const late = await e2Harness({ transportOk: () => { sawTransport = true; late.setBinding('ee'.repeat(32)); return true; } });
  const lateReceipt = await late.run();
  assert.equal(sawTransport, true);
  assert.equal(lateReceipt.reasonCode, 'kubelet-trust-changed');
  assert.equal(existsSync(late.pendingFile), true);
  assert.equal(JSON.parse(readFileSync(late.pendingFile, 'utf8')).phase, 'final-verification');
  late.cleanup();
});

test('each failure boundary retains pending at the exact phase and stops later writes', async () => {
  const cases = [
    ['pre-intent marker', { markerFail: (s) => s === 'pre-intent' }, null, []],
    ['pre-intent forward close', { closeOk: (s) => s !== 'pre-intent' }, null, []],
    ['P helm', { helmFail: (n) => n === 'obs-prometheus' }, 'prometheus-intent', ['helm:obs-prometheus']],
    ['predecessor verify', { verifyFail: (p) => p.phase === null && p.pendingPhase === 'prometheus-intent' }, 'prometheus-intent', []],
    ['P2/G1 verify', { verifyFail: (p) => p.phase === 'prometheus-intent' }, 'prometheus-intent', ['helm:obs-prometheus']],
    ['P replay marker', { markerFail: (s) => s === 'replay' }, 'prometheus-intent', ['helm:obs-prometheus']],
    ['G helm', { helmFail: (n) => n === 'obs-grafana' }, 'grafana-intent', ['helm:obs-prometheus', 'helm:obs-grafana']],
    ['P2/G2 verify', { verifyFail: (p) => p.historyId.startsWith('e2-from') && p.pendingPhase === 'grafana-intent' }, 'grafana-intent', ['helm:obs-prometheus', 'helm:obs-grafana']],
    ['final verify', { verifyFail: (p) => p.pendingPhase === 'final-verification' }, 'final-verification', ['helm:obs-prometheus', 'helm:obs-grafana']],
    ['transport', { transportOk: () => false }, 'final-verification', ['helm:obs-prometheus', 'helm:obs-grafana']],
  ];
  for (const [name, opt, phase, helms] of cases) {
    const h = await e2Harness(opt);
    const receipt = await h.run();
    assert.equal(receipt.ok, false, name);
    assert.deepEqual(HELM_ORDER(h.trace), helms, name);
    if (phase == null) {
      assert.equal(existsSync(h.pendingFile), false, name);
      assert.equal(receipt.pending, false, name);
    } else {
      assert.equal(receipt.pending, true, name);
      assert.equal(JSON.parse(readFileSync(h.pendingFile, 'utf8')).phase, phase, name);
      assert.equal(receipt.phase, phase, name);
    }
    h.cleanup();
  }
});

test('a replaced or foreign pending record stops advance, later Helm writes and clear', async () => {
  const h = await e2Harness({
    afterHelm: (name, { pendingFile }) => {
      if (name === 'obs-prometheus') {
        const body = readFileSync(pendingFile);
        writeFileSync(`${pendingFile}.copy`, body, { mode: 0o600 });
        renameSync(`${pendingFile}.copy`, pendingFile);
      }
    },
  });
  const receipt = await h.run();
  assert.equal(receipt.ok, false);
  assert.deepEqual(HELM_ORDER(h.trace), ['helm:obs-prometheus']);
  assert.equal(existsSync(h.pendingFile), true);
  h.cleanup();
});

test('historical no-arg upgrade refuses an E2-shaped observation before any write', async () => {
  const mutations = [];
  const h = await e2Harness({ deps: { argv: [] } });
  const receipt = await h.run();
  assert.equal(receipt.ok, false);
  assert.deepEqual(mutations, []);
  assert.deepEqual(HELM_ORDER(h.trace), []);
  h.cleanup();
});
