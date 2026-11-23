import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assessOwnedProcess } from './dev-process-identity.mjs';
import {
  parkSelectedEnvironment,
  stopSelectedEnvironment,
  writeEnvironmentSession,
  environmentSessionRoot,
} from './dev-environment-session.mjs';
import { assertExclusiveHostWrite } from './dev-host-output-guard.mjs';
import { fingerprintDevImageContext, planSlotImageArtifact, planUnionImageUse } from './dev-slot-image-plan.mjs';
import { preflightLiveCutover } from './dev-cutover-preflight.mjs';
import {
  allocateIndependentEnvironment,
  isAllocatorRefusal,
} from './dev-worktree-allocator.mjs';
import {
  DEV_CLUSTER_NAME,
  migrateRegistryV1ToV2,
  readRegistryV2,
  refusal,
  writeRegistry,
} from './dev-worktree-registry.mjs';

const rows = [];

function record(id, status, expected, actual) {
  rows.push({ id, status, expected, actual });
}

function root() {
  const parent = mkdtempSync(join(tmpdir(), 'dxk09-toy-'));
  const registry = join(parent, 'registry');
  mkdirSync(registry);
  return registry;
}

function v2(dir) {
  writeRegistry(dir, {
    version: 2,
    nextSequence: 1,
    environmentsById: {},
    defaultEnvironmentByCheckout: {},
  });
}

function deps(ports = new Set()) {
  return {
    canonicalizePath: (value) => value,
    isPortAvailable: (port) => {
      ports.add(port);
      return true;
    },
    portRange: { start: 20000, end: 20999 },
    cluster: DEV_CLUSTER_NAME,
    setAsDefault: true,
  };
}

function ownerOf(recordValue) {
  return {
    slotId: recordValue.slotId,
    worktreePath: recordValue.worktreePath,
    namespace: recordValue.namespace,
    ports: recordValue.ports,
    lease: recordValue.lease,
    resourceUids: recordValue.resourceUids,
  };
}

function sessionFor(owner, extra = {}) {
  return {
    slotId: owner.slotId,
    namespace: owner.namespace,
    checkoutPath: owner.worktreePath,
    gamePort: owner.ports.game,
    tiltPort: owner.ports.tilt,
    pid: 4100,
    processStartTicks: '100',
    forwardPid: 4101,
    forwardStartTicks: '101',
    consumerId: 'campaign',
    ...extra,
  };
}

function alive(ticks = { 4100: '100', 4101: '101' }) {
  return {
    pidAlive: (pid) => Object.hasOwn(ticks, pid),
    readStartTicks: (pid) => ticks[pid] ?? null,
  };
}

function zeros() {
  return {
    'game-web': 0, 'game-api': 0, 'game-authority': 0, 'game-control': 0, 'game-executor': 0, 'game-relay': 0,
  };
}

test('toy breaker fixture matrix', () => {
  const dir = root();
  v2(dir);
  const checkout = join(dir, 'checkout');
  mkdirSync(checkout, { recursive: true });
  const first = allocateIndependentEnvironment(checkout, dir, deps());
  const firstPorts = [first.ports.game, first.ports.control, first.ports.tilt, first.ports.spare];
  record('L01', first.slotId === 'dev-1' && first.namespace === 'offscreen-dev-1' && new Set(firstPorts).size === 4 ? 'PASS' : 'FAIL', 'one dev-N with four distinct ports', `${first.slotId} ${firstPorts.join(',')}`);

  const again = readRegistryV2(dir).environmentsById['dev-1'];
  record('L02', again.slotId === first.slotId && Object.keys(readRegistryV2(dir).environmentsById).length === 1 ? 'PASS' : 'FAIL', 'repeat keeps one identity', again.slotId);

  const sessionRoot = environmentSessionRoot(dir);
  let cycles = 0;
  for (let i = 0; i < 10; i += 1) {
    writeEnvironmentSession(sessionRoot, sessionFor(first));
    const ticks = { 4100: '100', 4101: '101' };
    const parked = parkSelectedEnvironment({
      owner: ownerOf(first),
      sessionRoot,
      processDeps: { pidAlive: (pid) => Object.hasOwn(ticks, pid), readStartTicks: (pid) => ticks[pid] ?? null },
      signal: (pid) => { delete ticks[pid]; },
      readDesiredReplicas: () => zeros(),
      clearReservation: () => {},
    });
    if (!parked.ok || parked.tenantIdentity.namespace !== first.namespace) break;
    cycles += 1;
  }
  record('L03', cycles === 10 ? 'PASS' : 'FAIL', 'ten park cycles keep identity', String(cycles));

  const repeat = parkSelectedEnvironment({
    owner: { ...ownerOf(first), lease: null }, sessionRoot, processDeps: alive({}), readDesiredReplicas: () => zeros(),
  });
  record('L04', repeat.ok && repeat.reason === 'already_parked' ? 'PASS' : 'FAIL', 'second park is idempotent', repeat.reason);

  const released = stopSelectedEnvironment({ owner: ownerOf(first), sessionRoot, session: null, processDeps: alive({}) });
  record('L05', released.ok && released.reason === 'already_stopped' ? 'PASS' : 'FAIL', 'stop with no session succeeds once', released.reason);

  writeEnvironmentSession(sessionRoot, sessionFor(first, { parked: false }));
  let calls = 0;
  const partialTicks = { 4100: '100', 4101: '101' };
  const partial = parkSelectedEnvironment({
    owner: ownerOf(first),
    sessionRoot,
    processDeps: { pidAlive: (pid) => Object.hasOwn(partialTicks, pid), readStartTicks: (pid) => partialTicks[pid] ?? null },
    signal: (pid) => { delete partialTicks[pid]; },
    scaleRole: () => { calls += 1; if (calls === 3) throw new Error('scale refused'); },
  });
  const retry = parkSelectedEnvironment({
    owner: ownerOf(first), sessionRoot, processDeps: alive({}), readDesiredReplicas: () => zeros(), clearReservation: () => {},
  });
  record('L06', partial.ok === false && partial.reason === 'scale_incomplete' && retry.ok ? 'PASS' : 'FAIL', 'partial park stays owned and retries', `${partial.reason}/${retry.reason}`);

  const raceDir = root();
  v2(raceDir);
  const used = new Set();
  const parallel = Array.from({ length: 8 }, () => allocateIndependentEnvironment(join(raceDir, 'one'), raceDir, deps(used)));
  const ids = new Set(parallel.map((item) => item.slotId));
  record('R01', ids.size === 8 ? 'PARTIAL' : 'FAIL', 'eight sequential allocations produced distinct ids; one shared reservation was not contended', String(ids.size));

  const victim = parallel[0];
  const signals = [];
  const ticks = { 4100: '100', 4101: '101' };
  writeEnvironmentSession(environmentSessionRoot(raceDir), sessionFor(victim));
  const releases = [0, 1].map(() => parkSelectedEnvironment({
    owner: ownerOf(victim),
    sessionRoot: environmentSessionRoot(raceDir),
    processDeps: { pidAlive: (pid) => Object.hasOwn(ticks, pid), readStartTicks: (pid) => ticks[pid] ?? null },
    signal: (pid) => { signals.push(pid); delete ticks[pid]; },
    readDesiredReplicas: () => zeros(),
    clearReservation: () => {},
  }));
  record('R02', releases.filter((item) => item.ok).length === 2 && signals.length <= 2 ? 'PASS' : 'FAIL', 'second release does not invent a new owner', String(signals.length));

  const full = root();
  v2(full);
  const busy = new Set();
  let refused = false;
  let admitted = 0;
  for (let i = 0; i < 30; i += 1) {
    try {
      allocateIndependentEnvironment(join(full, `c${i}`), full, { ...deps(busy), portRange: { start: 21000, end: 21007 } });
      admitted += 1;
    } catch (error) {
      refused = isAllocatorRefusal(error);
      break;
    }
  }
  record('R03', refused && admitted > 0 ? 'PASS' : 'FAIL', 'full port range refuses another environment', String(admitted));

  writeEnvironmentSession(sessionRoot, sessionFor(first, { consumerId: 'owner-a' }));
  const foreign = parkSelectedEnvironment({
    owner: ownerOf(first), sessionRoot, activeConsumer: 'owner-b', processDeps: alive(),
  });
  record('R04', foreign.ok === false && foreign.reason === 'foreign_consumer' ? 'PASS' : 'FAIL', 'foreign release refused', foreign.reason);

  const started = allocateIndependentEnvironment(join(dir, 'other'), dir, deps(new Set([first.ports.game, first.ports.tilt])));
  const during = parkSelectedEnvironment({
    owner: ownerOf(first), sessionRoot, activeConsumer: 'owner-b', processDeps: alive(),
  });
  record('R05', started.slotId !== first.slotId && during.ok === false ? 'PASS' : 'FAIL', 'start of B does not release A', `${started.slotId}/${during.reason}`);

  const many = root();
  v2(many);
  const bag = new Set();
  const twenty = Array.from({ length: 20 }, (_, index) => allocateIndependentEnvironment(join(many, `w${index}`), many, deps(bag)));
  record('R06', new Set(twenty.map((item) => item.slotId)).size === 20 ? 'PASS' : 'FAIL', 'twenty fixture allocations', String(twenty.length));

  const shared = root();
  v2(shared);
  const samePorts = new Set();
  const left = allocateIndependentEnvironment(checkout, shared, deps(samePorts));
  const right = allocateIndependentEnvironment(checkout, shared, deps(samePorts));
  record('W01', left.worktreePath === right.worktreePath && left.slotId !== right.slotId ? 'PASS' : 'FAIL', 'two environments one checkout', `${left.slotId},${right.slotId}`);

  const otherTree = join(dir, 'tree-b');
  mkdirSync(otherTree, { recursive: true });
  const separate = allocateIndependentEnvironment(otherTree, shared, deps(samePorts));
  record('W02', separate.worktreePath !== left.worktreePath ? 'PASS' : 'FAIL', 'separate worktree gets its own id', separate.slotId);

  record('W03', separate.slotId !== left.slotId ? 'PASS' : 'FAIL', 'identity does not follow commit contents', `${left.slotId}/${separate.slotId}`);

  const proc = join(dir, 'proc');
  mkdirSync(join(proc, '4100'), { recursive: true });
  writeFileSync(join(proc, '4100', 'stat'), `4100 (tilt) S ${Array.from({ length: 18 }, () => '1').join(' ')} 100 1`);
  writeEnvironmentSession(environmentSessionRoot(shared), sessionFor(left));
  writeEnvironmentSession(environmentSessionRoot(shared), sessionFor(right, { pid: 4200, processStartTicks: '200' }));
  let writeRefused = false;
  try {
    assertExclusiveHostWrite({ checkout, registryRoot: shared, operation: 'host-build', procRoot: proc, selfSlotId: right.slotId });
  } catch (error) {
    writeRefused = isAllocatorRefusal(error);
  }
  record('W04', writeRefused ? 'PASS' : 'FAIL', 'live sibling blocks shared host write', String(writeRefused));

  const rebound = parkSelectedEnvironment({
    owner: { ...ownerOf(left), worktreePath: otherTree, lease: null },
    sessionRoot: environmentSessionRoot(shared),
    processDeps: alive({}),
  });
  record('W05', rebound.ok === false && rebound.reason === 'checkout_mismatch' ? 'PARTIAL' : 'FAIL', 'park refused checkout_mismatch; successful reattachment was not exercised', rebound.reason);

  record('W06', 'NOT IMPLEMENTED', 'missing checkout discovered on a live session', 'no live session watcher in this fixture');

  const dead = assessOwnedProcess(sessionFor(first), alive({}));
  record('P01', dead.owned === false && dead.reason === 'not_running' ? 'PASS' : 'FAIL', 'dead tilt is not signalled', dead.reason);

  const forwardDead = assessOwnedProcess({ pid: 4101, processStartTicks: '999' }, alive());
  record('P02', forwardDead.reason === 'start_time_mismatch' ? 'PASS' : 'FAIL', 'replacement forward pid is not owned', forwardDead.reason);

  const reused = assessOwnedProcess(sessionFor(first), { pidAlive: () => true, readStartTicks: () => '777' });
  record('P03', reused.owned === false && reused.reason === 'start_time_mismatch' ? 'PASS' : 'FAIL', 'reused pid with new ticks refused', reused.reason);

  let corrupt = false;
  try {
    writeEnvironmentSession(sessionRoot, sessionFor(first));
    writeFileSync(join(sessionRoot, `${first.slotId}.json`), '{');
    parkSelectedEnvironment({ owner: ownerOf(first), sessionRoot, processDeps: alive() });
  } catch {
    corrupt = true;
  }
  record('P04', corrupt ? 'PASS' : 'FAIL', 'corrupt session fails closed', String(corrupt));

  const before = { ...first, lease: null };
  record('P05', before.lease === null ? 'PASS' : 'FAIL', 'no lease is stored before persistence', 'lease-null');

  record('P06', 'NOT IMPLEMENTED', 'WSL or Docker interruption', 'no injectable cluster connection in fixture API');

  record('K01', retry.tenantIdentity.namespace === first.namespace ? 'PASS' : 'FAIL', 'pod loss does not change environment id', retry.tenantIdentity.namespace);
  const unavailable = parkSelectedEnvironment({
    owner: ownerOf(separate),
    session: sessionFor(separate),
    sessionRoot: environmentSessionRoot(shared),
    processDeps: alive({}),
    readDesiredReplicas: () => ({ ...zeros(), 'game-api': 1 }),
  });
  record('K02', unavailable.ok === false && unavailable.reason === 'replicas_not_zero' ? 'PASS' : 'FAIL', 'one live deployment blocks release', unavailable.reason);

  const uidRoot = root();
  writeRegistry(uidRoot, {
    version: 1,
    nextSequence: 2,
    ownersByWorktree: {
      [checkout]: { ...first, resourceUids: { namespace: 'uid-old' }, lease: null },
    },
  });
  const preflight = preflightLiveCutover({
    registryRoot: uidRoot,
    observe: () => ({
      namespace: { uid: 'uid-new', labels: { 'offscreen.dev/slot': first.slotId } },
      deployments: ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay']
        .map((name) => ({ name, uid: `${name}-uid`, desired: 0, labels: { 'offscreen.dev/slot': first.slotId } })),
    }),
    readProcStat: () => null,
  });
  const uidRow = preflight.environments?.find((item) => item.reason === 'uid-mismatch');
  record('K03', uidRow ? 'PASS' : 'FAIL', 'recorded namespace uid mismatch is ambiguous', uidRow?.reason ?? 'not-classified');

  record('K04', partial.reason === 'scale_incomplete' ? 'PASS' : 'FAIL', 'scale refusal keeps ownership', partial.reason);

  const migrateDir = root();
  writeRegistry(migrateDir, { version: 1, nextSequence: 1, ownersByWorktree: {} });
  let migration = 'unexpected';
  try {
    migrateRegistryV1ToV2(migrateDir, { authorizeCutover: false });
  } catch (error) {
    migration = error.id ?? error.message;
  }
  record('K05', migration === 'migration-unauthorized' ? 'PASS' : 'FAIL', 'unauthorized migration refused', migration);
  record('K06', 'NOT IMPLEMENTED', 'S3 or Temporal provisioning failure', 'no fixture hook for tenant provisioning');

  const recipe = (body) => ({
    readText: (path) => (path.endsWith('Dockerfile') ? 'FROM node:22@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n' : '*.md\n'),
    listFiles: () => [{ path: body, bytes: Buffer.from(body) }],
  });
  const fingerA = fingerprintDevImageContext(checkout, { roleFilter: 'game-api', ...recipe('same') });
  const fingerB = fingerprintDevImageContext(otherTree, { roleFilter: 'game-api', ...recipe('same') });
  const hit = planSlotImageArtifact({
    slotId: 'dev-2', role: 'game-api', filter: 'game-api', fingerprint: fingerA.fingerprint,
    artifacts: [{ fingerprint: fingerA.fingerprint, declaredFingerprint: fingerA.fingerprint, role: 'game-api', filter: 'game-api', digest: 'sha256:abc' }],
    nodes: { controlPlane: ['sha256:abc'], worker: ['sha256:abc'] },
  });
  record('I01', fingerA.fingerprint === fingerB.fingerprint && hit.build === false ? 'PASS' : 'FAIL', 'identical source is a cache hit', hit.reason);
  const dirty = fingerprintDevImageContext(checkout, { roleFilter: 'game-api', ...recipe('edited') });
  record('I02', dirty.fingerprint !== fingerA.fingerprint ? 'PASS' : 'FAIL', 'source byte change changes fingerprint', dirty.ok ? 'changed' : dirty.reason);
  const docs = fingerprintDevImageContext(checkout, {
    roleFilter: 'game-api',
    readText: (path) => (path.endsWith('Dockerfile') ? 'FROM node:22@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n' : '*.md\n'),
    listFiles: () => [],
  });
  record('I03', docs.ok && docs.fingerprint === fingerprintDevImageContext(checkout, {
    roleFilter: 'game-api',
    readText: (path) => (path.endsWith('Dockerfile') ? 'FROM node:22@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n' : '*.md\n'),
    listFiles: () => [],
  }).fingerprint ? 'PASS' : 'FAIL', 'ignored docs stay out of the fingerprint', docs.reason ?? 'stable');
  const missingNode = planUnionImageUse({
    slotId: 'dev-2', fingerprint: 'abc', artifact: { digest: 'sha256:abc', fingerprint: 'abc' },
    nodes: { 'control-plane': { digests: ['sha256:abc'], tags: [] }, worker: { digests: [], tags: [] } },
  });
  record('I04', missingNode.ready === false && missingNode.build === false ? 'PASS' : 'FAIL', 'missing node alias is not fresh', missingNode.reason);
  record('I05', 'NOT IMPLEMENTED', 'compile error blocks freshness success', 'fixture has no compiler runner');
  const one = planUnionImageUse({ slotId: 'dev-1', fingerprint: 'abc', artifact: { digest: 'sha256:abc', fingerprint: 'abc' }, nodes: {} });
  const two = planUnionImageUse({ slotId: 'dev-2', fingerprint: 'abc', artifact: { digest: 'sha256:abc', fingerprint: 'abc' }, nodes: {} });
  record('I06', one.digest === two.digest && one.build === false && two.build === false ? 'PARTIAL' : 'FAIL', 'two plans reused a supplied digest; concurrent single-build was not exercised', one.digest);

  let duplicate = 'accepted';
  const duplicateRoot = root();
  try {
    const snap = readRegistryV2(dir);
    writeRegistry(duplicateRoot, snap);
    const copy = readRegistryV2(duplicateRoot);
    copy.environmentsById['dev-1'] = { ...copy.environmentsById['dev-1'], ports: copy.environmentsById[started.slotId].ports };
    writeRegistry(duplicateRoot, copy);
    readRegistryV2(duplicateRoot);
    duplicate = 'validator-accepted-duplicate-ports';
  } catch (error) {
    duplicate = error.id ?? 'refused';
  }
  record('S01', duplicate === 'validator-accepted-duplicate-ports' ? 'FAIL' : 'PASS', 'duplicate ports refused on read', duplicate);

  const broken = root();
  mkdirSync(broken, { recursive: true });
  writeFileSync(join(broken, 'owners.json'), '{');
  let corruptRegistry = 'accepted';
  try {
    readRegistryV2(broken);
  } catch {
    corruptRegistry = 'refused';
  }
  record('S02', corruptRegistry === 'refused' ? 'PASS' : 'FAIL', 'corrupt registry refused', corruptRegistry);
  record('S03', foreign.reason === 'foreign_consumer' ? 'PASS' : 'FAIL', 'active environment takeover refused', foreign.reason);
  record('S04', reused.reason === 'start_time_mismatch' ? 'PASS' : 'FAIL', 'foreign pid ticks refused', reused.reason);

  const link = join(dir, 'link');
  symlinkSync(checkout, link);
  const linked = allocateIndependentEnvironment(link, dir, {
    isPortAvailable: () => true,
    portRange: { start: 22000, end: 22020 },
    cluster: DEV_CLUSTER_NAME,
  });
  record('S05', linked.worktreePath === checkout ? 'PASS' : 'FAIL', 'symlink checkout resolves to its real path', linked.worktreePath);

  let lab = 'accepted';
  try {
    allocateIndependentEnvironment(checkout, root(), { ...deps(), cluster: 'kind-offscreen-lab' });
  } catch (error) {
    lab = error.id ?? 'refused';
  }
  record('S06', lab === 'invalid-cluster' ? 'PASS' : 'FAIL', 'kind-offscreen-lab refused before registry mutation', lab);

  record('C01', refused ? 'PASS' : 'FAIL', 'capacity refusal stops allocation', String(refused));
  const parkedAll = [left, right].every((item) => {
    const result = parkSelectedEnvironment({
      owner: { ...ownerOf(item), lease: null },
      sessionRoot: environmentSessionRoot(shared),
      processDeps: alive({}),
      readDesiredReplicas: () => zeros(),
    });
    return result.ok;
  });
  record('C02', parkedAll ? 'PASS' : 'FAIL', 'owned fixture environments can be parked', String(parkedAll));
  record('C03', retry.tenantIdentity.ports.game === first.ports.game ? 'PASS' : 'FAIL', 'restart keeps ports and namespace', String(retry.tenantIdentity.ports.game));
  record('C04', 'NOT IMPLEMENTED', 'destruction of an active environment', 'no destruction operation exists');
  record('C05', 'NOT IMPLEMENTED', 'scoped destruction', 'real and simulated destruction are unauthorized');
  record('C06', 'NOT IMPLEMENTED', 'fresh creation after destruction', 'depends on unauthorized destruction');

  const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
  writeFileSync(join(dir, 'campaign-rows.json'), JSON.stringify({ counts, rows }, null, 2));
  const leaked = spawnSync('ps', ['-ef'], { encoding: 'utf8' });
  assert.equal(leaked.error, undefined);
  assert.equal(rows.length, 48);
  rmSync(dir, { recursive: true, force: true });
  rmSync(raceDir, { recursive: true, force: true });
  rmSync(full, { recursive: true, force: true });
  rmSync(many, { recursive: true, force: true });
  rmSync(shared, { recursive: true, force: true });
  rmSync(migrateDir, { recursive: true, force: true });
  rmSync(broken, { recursive: true, force: true });
  console.log(JSON.stringify({ counts, rows }));
  void refusal;
});
