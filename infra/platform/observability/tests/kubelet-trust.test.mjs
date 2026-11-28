import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { runObservabilityReadCommand } from '../identity.mjs';
import { readDevKubeletTrust } from '../kubelet-trust.mjs';

// All certificates are generated on the fly, test-only, public parts only
// leave this helper; private keys stay in a temp dir removed at exit.
const work = mkdtempSync(join(tmpdir(), 'kt-fixture-'));
test.after(() => rmSync(work, { recursive: true, force: true }));
let seq = 0;
function sh(args, opts = {}) {
  return execFileSync('openssl', args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}
function makeRoot(cn, { ca = true, days = 30 } = {}) {
  const id = `r${seq++}`;
  const key = join(work, `${id}.key`);
  const crt = join(work, `${id}.crt`);
  sh([
    'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
    '-nodes', '-keyout', key, '-out', crt, '-subj', `/CN=${cn}`, '-days', String(days),
    '-addext', `basicConstraints=critical,CA:${ca ? 'TRUE' : 'FALSE'}`,
    '-addext', 'keyUsage=critical,keyCertSign,digitalSignature',
  ]);
  return { key, crt, pem: readFileSync(crt, 'utf8') };
}
function makeLeaf(root, name, { san = name, eku = 'serverAuth' } = {}) {
  const id = `l${seq++}`;
  const key = join(work, `${id}.key`);
  const csr = join(work, `${id}.csr`);
  const ext = join(work, `${id}.ext`);
  const crt = join(work, `${id}.crt`);
  sh(['req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
    '-nodes', '-keyout', key, '-out', csr, '-subj', `/CN=${name}`]);
  const lines = ['basicConstraints=CA:FALSE'];
  if (san) lines.push(`subjectAltName=DNS:${san}`);
  if (eku) lines.push(`extendedKeyUsage=${eku}`);
  writeFileSync(ext, `${lines.join('\n')}\n`);
  sh(['x509', '-req', '-in', csr, '-CA', root.crt, '-CAkey', root.key,
    '-CAcreateserial', '-days', '30', '-extfile', ext, '-out', crt]);
  return readFileSync(crt, 'utf8');
}

const CP = 'offscreen-dev-control-plane';
const WK = 'offscreen-dev-worker';
const CP_ID = 'a'.repeat(64);
const WK_ID = 'b'.repeat(64);

function baseWorld() {
  const nodes = {};
  for (const [name, id, role, ip, uid] of [
    [CP, CP_ID, 'control-plane', '172.18.0.2', 'uid-cp'],
    [WK, WK_ID, 'worker', '172.18.0.3', 'uid-wk'],
  ]) {
    const root = makeRoot(`${name}-ca`);
    const leaf = makeLeaf(root, name);
    nodes[name] = { id, role, ip, uid, root, leaf, diskLeaf: leaf, labelCluster: 'offscreen-dev', running: true, kindIp: ip };
  }
  return { nodes };
}

function makeIdentity(overrides = {}) {
  return {
    profileId: 'dev',
    contextName: 'kind-offscreen-dev',
    clusterName: 'offscreen-dev',
    snapshotPath: '/nonexistent/snapshot',
    tuple: {
      profileId: 'dev',
      dockerControlPlaneId: CP_ID,
      dockerEndpointHost: 'unix:///var/run/docker.sock',
      kubeSystemUid: 'ks-uid',
      baselineUid: 'base-uid',
    },
    ...overrides,
  };
}

function makeRun(world, log = []) {
  const byId = (id) => Object.values(world.nodes).find((n) => n.id === id);
  return (command, args, options) => {
    log.push([command, ...args]);
    const ok = (stdout) => ({ ok: true, status: 0, stdout, stderr: '', timedOut: false, missing: false });
    const bad = { ok: false, status: 1, stdout: '', stderr: 'x', timedOut: false, missing: false };
    if (command === 'openssl') return runObservabilityReadCommand(command, args, options);
    if (command === 'kubectl' && args.includes('nodes')) {
      return ok(JSON.stringify({
        items: Object.entries(world.nodes).map(([name, n]) => ({
          metadata: { name, uid: n.uid },
          status: { addresses: [{ type: 'InternalIP', address: n.ip }, { type: 'Hostname', address: name }] },
        })),
      }));
    }
    if (command === 'docker' && args[0] === 'inspect') {
      const n = world.nodes[args[1]];
      if (!n) return bad;
      return ok(JSON.stringify([{
        Id: n.id,
        Name: `/${args[1]}`,
        State: { Running: n.running },
        Config: { Labels: { 'io.x-k8s.kind.cluster': n.labelCluster, 'io.x-k8s.kind.role': n.role } },
        NetworkSettings: { Networks: { kind: { IPAddress: n.kindIp } } },
      }]));
    }
    if (command === 'docker' && args[0] === 'exec') {
      const n = byId(args[1]);
      if (!n) return bad;
      if (args[2] === 'openssl' && args[3] === 's_client') {
        if (args[6] !== '-servername' || args[7] !== Object.keys(world.nodes).find((k) => world.nodes[k] === n)) return bad;
        return ok(`CONNECTED\n${n.presentedOverride ?? n.leaf + n.root.pem}\nDONE\n`);
      }
      if (args[2] === 'openssl' && args[3] === 'x509') {
        if (n.diskMissing) return bad;
        return ok(n.diskLeaf);
      }
    }
    return bad;
  };
}

const okRecheck = () => ({ ok: true });
// Fake clock safely after every freshly generated certificate's notBefore.
const NOW = Date.now() + 120_000;
function capture(world, extra = {}, identity = makeIdentity()) {
  const log = [];
  const result = readDevKubeletTrust(identity, {
    run: makeRun(world, log),
    recheck: okRecheck,
    now: () => NOW,
    deadline: NOW + 60_000,
    ...extra,
  });
  return { result, log };
}
function refused(world, extra, identity) {
  assert.throws(() => capture(world, extra, identity), (e) => {
    assert.equal(e.message, 'kubelet-trust-unavailable');
    assert.equal(e.code, 'kubelet-trust-unavailable');
    assert.ok(!/BEGIN|172\.18|uid-/.test(`${e.message} ${e.reason}`));
    return true;
  });
}
const leftoverTemp = () => readdirSync(tmpdir()).filter((n) => n.startsWith('kubelet-trust-'));

test('captures canonical two-node binding with stable digest', () => {
  const world = baseWorld();
  const { result, log } = capture(world);
  assert.deepEqual(Object.keys(result), ['schema', 'contextName', 'kubeSystemUid', 'baselineUid', 'nodes', 'bindingSha256']);
  assert.equal(result.schema, 1);
  assert.deepEqual(result.nodes.map((n) => n.name), [CP, WK]);
  assert.deepEqual(Object.keys(result.nodes[0]), ['name', 'nodeUid', 'dockerId', 'caSha256', 'caPem']);
  for (const n of result.nodes) {
    assert.match(n.caPem, /^-----BEGIN CERTIFICATE-----\n(.{64}\n)*.{1,64}\n-----END CERTIFICATE-----\n$/);
    assert.match(n.caSha256, /^[0-9a-f]{64}$/);
    assert.ok(!n.caPem.includes('\r'));
  }
  const { bindingSha256, ...body } = result;
  assert.equal(bindingSha256, createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  // read-only: only inspect/get/exec of openssl/verify; exec by full id
  for (const c of log) {
    assert.ok(['kubectl', 'docker', 'openssl'].includes(c[0]));
    if (c[0] === 'docker' && c[1] === 'exec') assert.match(c[2], /^[ab]{64}$/);
    assert.ok(!c.join(' ').toLowerCase().includes('token'));
  }
  assert.deepEqual(leftoverTemp(), []);
});

test('same-root leaf renewal keeps digest; no caching across calls', () => {
  const world = baseWorld();
  const a = capture(world).result;
  const n = world.nodes[WK];
  n.leaf = makeLeaf(n.root, WK);
  n.diskLeaf = n.leaf;
  const b = capture(world).result;
  assert.equal(a.bindingSha256, b.bindingSha256);
  // root replacement is a different binding (second call really re-reads)
  const root2 = makeRoot(`${WK}-ca2`);
  n.root = root2;
  n.leaf = makeLeaf(root2, WK);
  n.diskLeaf = n.leaf;
  const c = capture(world).result;
  assert.notEqual(a.bindingSha256, c.bindingSha256);
});

test('changed cluster/node/docker identity changes digest', () => {
  const world = baseWorld();
  const base = capture(world).result.bindingSha256;
  const other = (id) => capture(world, {}, id).result.bindingSha256;
  const id1 = makeIdentity();
  id1.tuple.kubeSystemUid = 'other';
  assert.notEqual(other(id1), base);
  world.nodes[WK].uid = 'uid-new';
  assert.notEqual(capture(world).result.bindingSha256, base);
});

test('refuses expired certificate', () => {
  const world = baseWorld();
  refused(world, { now: () => NOW + 400 * 86_400_000, deadline: NOW + 401 * 86_400_000 });
  assert.deepEqual(leftoverTemp(), []);
});

test('refuses CN-only, wrong SAN, wildcard SAN, wrong-purpose EKU', () => {
  for (const opts of [{ san: null }, { san: 'other-node' }, { san: '*.offscreen-dev-worker' }, { eku: 'clientAuth' }]) {
    const world = baseWorld();
    const n = world.nodes[WK];
    n.leaf = makeLeaf(n.root, WK, opts);
    n.diskLeaf = n.leaf;
    refused(world);
  }
  assert.deepEqual(leftoverTemp(), []);
});

test('refuses non-CA root, wrong chain, wrong cert count, disk mismatch/missing', () => {
  let world = baseWorld();
  let n = world.nodes[CP];
  n.root = makeRoot('nonca', { ca: false });
  n.leaf = makeLeaf(n.root, CP);
  n.diskLeaf = n.leaf;
  refused(world);

  world = baseWorld();
  n = world.nodes[CP];
  n.root = makeRoot('unrelated-ca'); // presented chain root did not sign leaf
  refused(world);

  world = baseWorld();
  n = world.nodes[CP];
  n.presentedOverride = n.leaf; // one cert only
  refused(world);
  n.presentedOverride = n.leaf + n.root.pem + n.root.pem; // three
  refused(world);
  n.presentedOverride = `${n.leaf}${n.root.pem}-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n`;
  refused(world);

  world = baseWorld();
  n = world.nodes[CP];
  n.diskLeaf = makeLeaf(n.root, CP); // different DER than presented
  refused(world);
  world = baseWorld();
  world.nodes[CP].diskMissing = true;
  refused(world);
  assert.deepEqual(leftoverTemp(), []);
});

test('refuses wrong node set, role, network, cluster label, running state, control-plane id', () => {
  const mutations = [
    (w) => { delete w.nodes[WK]; },
    (w) => { w.nodes['offscreen-dev-worker2'] = { ...w.nodes[WK], id: 'c'.repeat(64) }; },
    (w) => { w.nodes[WK].role = 'control-plane'; },
    (w) => { w.nodes[WK].kindIp = '172.18.0.99'; },
    (w) => { w.nodes[WK].labelCluster = 'other'; },
    (w) => { w.nodes[WK].running = false; },
    (w) => { w.nodes[WK].id = CP_ID; }, // not distinct
    (w) => { w.nodes[WK].uid = 'uid-cp'; }, // not distinct
    (w) => { w.nodes[CP].id = 'd'.repeat(64); }, // != frozen tuple
  ];
  for (const mutate of mutations) {
    const world = baseWorld();
    mutate(world);
    refused(world);
  }
});

test('refuses remote Docker endpoint, env override, bad identity, failed recheck', () => {
  const world = baseWorld();
  const remote = makeIdentity();
  remote.tuple.dockerEndpointHost = 'tcp://10.0.0.1:2375';
  refused(world, {}, remote);
  refused(world, {}, makeIdentity({ profileId: 'release' }));
  refused(world, { recheck: () => ({ ok: false, reason: 'docker-mismatch' }) });
  refused(world, { recheck: () => { throw new Error('boom'); } });
  const prev = process.env.DOCKER_HOST;
  process.env.DOCKER_HOST = 'tcp://10.0.0.1:2375';
  try {
    refused(world);
  } finally {
    if (prev === undefined) delete process.env.DOCKER_HOST;
    else process.env.DOCKER_HOST = prev;
  }
});

test('refuses identity drift between reads and expired deadline', () => {
  const world = baseWorld();
  const run = makeRun(world);
  let nodeReads = 0;
  const drifting = (command, args, options) => {
    if (command === 'kubectl' && args.includes('nodes')) {
      nodeReads += 1;
      if (nodeReads === 2) world.nodes[WK].uid = 'uid-swapped';
    }
    return run(command, args, options);
  };
  refused(world, { run: drifting });
  assert.equal(nodeReads, 2);
  refused(baseWorld(), { deadline: NOW });
  assert.deepEqual(leftoverTemp(), []);
});
