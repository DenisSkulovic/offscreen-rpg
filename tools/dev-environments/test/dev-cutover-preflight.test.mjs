import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { preflightLiveCutover } from '../src/application/dev-cutover-preflight.mjs';
import { isAllocatorRefusal } from '../src/domain/dev-worktree-registry.mjs';

const ROLES = ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay'];

function stat(pid, ticks) {
  return `${pid} (tilt) S 1 ${pid} ${pid} 0 -1 0 0 0 0 0 0 0 0 0 0 0 1 0 ${ticks} 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n`;
}

function owner(slot, checkout, port, lease = null) {
  return {
    slotId: slot,
    worktreePath: checkout,
    cluster: 'kind-offscreen-dev',
    namespace: `offscreen-${slot}`,
    ports: { game: port, control: port + 1, tilt: port + 2, spare: port + 3 },
    processIdentity: null,
    resourceUids: {},
    lease,
  };
}

function live(slot, desired, uid = `uid-${slot}`) {
  return {
    namespace: { uid, labels: { 'offscreen.dev/slot': slot } },
    deployments: ROLES.map((name) => ({
      name,
      uid: `${uid}-${name}`,
      desired,
      labels: { 'offscreen.dev/slot': slot },
    })),
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cutover-preflight-'));
  const registryRoot = join(root, 'registry');
  const checkouts = {
    'dev-1': join(root, 'dxk09'),
    'dev-2': join(root, 'dxk09-b'),
    'dev-3': join(root, 'dxk09-c'),
    'dev-4': join(root, 'dxk09-d'),
  };
  for (const checkout of Object.values(checkouts)) mkdirSync(checkout, { recursive: true });
  mkdirSync(registryRoot, { recursive: true });
  const owners = {
    [checkouts['dev-1']]: owner('dev-1', checkouts['dev-1'], 13100, { pid: 201268, startTimeJiffies: 1684727, acquiredAt: '2026-11-22T00:00:00.000Z' }),
    [checkouts['dev-2']]: owner('dev-2', checkouts['dev-2'], 13104),
    [checkouts['dev-3']]: owner('dev-3', checkouts['dev-3'], 13108),
    [checkouts['dev-4']]: owner('dev-4', checkouts['dev-4'], 13112),
  };
  const registry = { version: 1, nextSequence: 5, ownersByWorktree: owners };
  const file = join(registryRoot, 'owners.json');
  writeFileSync(file, `${JSON.stringify(registry)}\n`);
  for (const slot of ['dev-3', 'dev-4']) {
    const pid = slot === 'dev-3' ? 441971 : 646970;
    const ticks = slot === 'dev-3' ? '2095190' : '2158365';
    mkdirSync(join(checkouts[slot], '.offscreen'), { recursive: true });
    writeFileSync(join(checkouts[slot], '.offscreen', 'dev-session.json'), `${JSON.stringify({
      slotId: slot,
      namespace: `offscreen-${slot}`,
      worktreePath: checkouts[slot],
      gamePort: owners[checkouts[slot]].ports.game,
      tiltPort: owners[checkouts[slot]].ports.tilt,
      pid,
      processStartTicks: ticks,
    })}\n`);
  }
  const procs = new Map([
    [441971, stat(441971, '2095190')],
    [646970, stat(646970, '2158365')],
  ]);
  return { registryRoot, file, checkouts, procs };
}

test('the four observed environments keep legacy identity and do not adopt orphans', () => {
  const { registryRoot, file, procs } = fixture();
  const before = readFileSync(file, 'utf8');
  const calls = { signals: 0, scales: 0 };
  const report = preflightLiveCutover({
    registryRoot,
    observe: (record) => live(record.slotId, 1),
    readProcStat: (pid) => procs.get(pid) ?? null,
    signal: () => { calls.signals += 1; },
    scale: () => { calls.scales += 1; },
  });
  const byId = Object.fromEntries(report.environments.map((item) => [item.slotId, item]));
  assert.equal(byId['dev-1'].state, 'orphaned_running');
  assert.equal(byId['dev-2'].state, 'orphaned_running');
  assert.equal(byId['dev-3'].state, 'active_verified');
  assert.equal(byId['dev-4'].state, 'active_verified');
  assert.equal(byId['dev-3'].processIdentity, null);
  assert.equal(byId['dev-1'].lease.pid, 201268);
  assert.equal(byId['dev-1'].adopted, false);
  assert.equal(byId['dev-2'].adopted, false);
  assert.deepEqual(report.reusableSlotIds, []);
  assert.equal(byId['dev-3'].discoveredResourceUids.namespace, 'uid-dev-3');
  assert.equal(report.ok, false);
  assert.equal(report.sessionsVerified, false);
  assert.equal(report.signals, 0);
  assert.equal(report.scales, 0);
  assert.equal(report.registryWrites, 0);
  assert.equal(calls.signals, 0);
  assert.equal(calls.scales, 0);
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('a parked owned environment is distinct from a running orphan', () => {
  const { registryRoot, procs } = fixture();
  const report = preflightLiveCutover({
    registryRoot,
    observe: (record) => live(record.slotId, record.slotId === 'dev-2' ? 0 : 1),
    readProcStat: (pid) => procs.get(pid) ?? null,
  });
  const dev2 = report.environments.find((item) => item.slotId === 'dev-2');
  assert.equal(dev2.state, 'parked_verified');
  assert.equal(dev2.reusable, false);
});

test('conflicting live UIDs or labels refuse without writing the registry', () => {
  const { registryRoot, file, procs } = fixture();
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  raw.ownersByWorktree[Object.keys(raw.ownersByWorktree)[0]].resourceUids = { namespace: 'recorded-other' };
  writeFileSync(file, JSON.stringify(raw));
  const before = readFileSync(file, 'utf8');
  const mismatch = preflightLiveCutover({
    registryRoot,
    observe: (record) => live(record.slotId, 1),
    readProcStat: (pid) => procs.get(pid) ?? null,
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.environments.find((item) => item.slotId === 'dev-1').reason, 'uid-mismatch');
  const foreign = preflightLiveCutover({
    registryRoot,
    observe: (record) => ({
      ...live(record.slotId, 1),
      namespace: { uid: `uid-${record.slotId}`, labels: { 'offscreen.dev/slot': 'dev-9' } },
    }),
    readProcStat: (pid) => procs.get(pid) ?? null,
  });
  assert.equal(foreign.environments.every((item) => item.reason === 'foreign-ownership-label'), true);
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('corrupt registry or legacy session refuses before classification writes', () => {
  const { registryRoot, file, checkouts } = fixture();
  writeFileSync(join(checkouts['dev-3'], '.offscreen', 'dev-session.json'), '{');
  assert.throws(
    () => preflightLiveCutover({ registryRoot, observe: (record) => live(record.slotId, 1), readProcStat: () => null }),
    (error) => isAllocatorRefusal(error) && error.id === 'corrupt-session',
  );
  writeFileSync(file, '{');
  assert.throws(
    () => preflightLiveCutover({ registryRoot, observe: () => { throw new Error('observe must not run'); } }),
    (error) => isAllocatorRefusal(error) && error.id === 'registry-corrupt',
  );
});
