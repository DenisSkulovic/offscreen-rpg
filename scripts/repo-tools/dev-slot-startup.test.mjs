import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { allocateDevWorktreeOwner } from './dev-worktree-allocator.mjs';
import { reconcileDevSlot, planSlotImageBuilds, describeImageLoadFailure } from './dev-slot-startup.mjs';

const record = {
  slotId: 'dev-3',
  cluster: 'kind-offscreen-dev',
  namespace: 'offscreen-dev-3',
  ports: { game: 13108, control: 13109, tilt: 13110, spare: 13111 },
};

function healthy() {
  return { ok: true, cluster: 'kind-offscreen-dev', memoryMiB: 4096 };
}

function deps(overrides = {}) {
  const calls = [];
  const base = {
    calls,
    allocate: () => record,
    probeCluster: async () => healthy(),
    ensureSql: async () => {
      calls.push('sql');
      return { ok: true, retained: [{ name: 'dev-3-run-auth', uid: 'sql-uid' }] };
    },
    ensureMigration: async () => {
      calls.push('migration');
      return { ok: true, appliedMigrations: 25 };
    },
    ensureS3: async () => {
      calls.push('s3');
      return { ok: true, retained: [{ name: 'dev-3-s3', uid: 's3-uid' }] };
    },
    ensureTemporal: async () => {
      calls.push('temporal');
      return { ok: true, namespace: 'offscreen-dev-3', id: 'temporal-id' };
    },
    project: async () => {
      calls.push('project');
      return { ok: true, dbUid: 'db', s3Uid: 's3', appUid: 'app', images: { api: 'offscreen-dev-workspace:dev-3-api' } };
    },
    ensureImages: async () => {
      calls.push('images');
      return { ok: true, refs: { api: 'offscreen-dev-workspace:dev-3-api' }, rebuilt: false };
    },
  };
  return { ...base, ...overrides, calls };
}

test('a new slot runs sql, migration, s3, temporal, project, then images', async () => {
  const used = deps();
  const result = await reconcileDevSlot({ worktree: '/tmp/new', registryRoot: '/tmp/reg' }, used);
  assert.equal(result.ok, true);
  assert.equal(result.readyForWorkloads, true);
  assert.deepEqual(used.calls, ['sql', 'migration', 's3', 'temporal', 'project', 'images']);
  assert.equal(result.identities.secretUids.db, 'db');
});

test('an existing slot reuses the same identities without a rebuild flag', async () => {
  const used = deps({
    ensureImages: async () => ({ ok: true, refs: { api: 'offscreen-dev-workspace:dev-3-api' }, rebuilt: false }),
  });
  const first = await reconcileDevSlot({ worktree: '/tmp/same', registryRoot: '/tmp/reg' }, used);
  const second = await reconcileDevSlot({ worktree: '/tmp/same', registryRoot: '/tmp/reg' }, used);
  assert.equal(first.identities.secretUids.app, second.identities.secretUids.app);
  assert.equal(second.ok, true);
});

test('sql, s3, and temporal failures stop before workloads and keep retained ids', async () => {
  for (const [phase, key] of [['sql', 'ensureSql'], ['s3', 'ensureS3'], ['temporal', 'ensureTemporal']]) {
    const used = deps({
      [key]: async () => ({ ok: false, refusals: [{ id: 'partial', detail: `${phase} partial` }], retained: [{ uid: `${phase}-kept` }] }),
    });
    const result = await reconcileDevSlot({ worktree: '/tmp/partial', registryRoot: '/tmp/reg' }, used);
    assert.equal(result.ok, false);
    assert.equal(result.phase, phase);
    assert.equal(result.readyForWorkloads, false);
    assert.equal(used.calls.includes('images'), false);
  }
});

test('a foreign cluster, secret uid, occupied port, stale process, and low memory refuse', async () => {
  const foreign = await reconcileDevSlot({ worktree: '/tmp/a', registryRoot: '/tmp/reg' }, deps({
    allocate: () => ({ ...record, cluster: 'kind-offscreen-lab' }),
  }));
  assert.equal(foreign.phase, 'cluster');

  const secret = await reconcileDevSlot({ worktree: '/tmp/a', registryRoot: '/tmp/reg' }, deps({
    ensureS3: async () => ({ ok: false, refusals: [{ id: 'foreign-secret', detail: 'secret uid mismatch' }], retained: [] }),
  }));
  assert.equal(secret.phase, 's3');

  const port = await reconcileDevSlot({ worktree: '/tmp/a', registryRoot: '/tmp/reg', portOccupied: true }, deps());
  assert.equal(port.phase, 'port');

  const stale = await reconcileDevSlot({ worktree: '/tmp/a', registryRoot: '/tmp/reg', processOwned: false }, deps());
  assert.equal(stale.phase, 'process');

  const memory = await reconcileDevSlot({ worktree: '/tmp/a', registryRoot: '/tmp/reg', memoryMiB: 256 }, deps());
  assert.equal(memory.phase, 'capacity');
});

test('two concurrent startups of one worktree keep a single slot', async () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-reg-'));
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-'));
  const allocate = (path, registry) => allocateDevWorktreeOwner(path, registry, { isPortAvailable: () => true });
  const [left, right] = await Promise.all([
    reconcileDevSlot({ worktree, registryRoot: root }, deps({ allocate })),
    reconcileDevSlot({ worktree, registryRoot: root }, deps({ allocate })),
  ]);
  assert.equal(left.identities.slotId, right.identities.slotId);
});

test('missing slot images are rebuilt and present images are skipped', () => {
  const plan = planSlotImageBuilds('dev-4', (ref) => ref.endsWith('-web'));
  assert.equal(plan.missing.some((image) => image.role === 'web'), false);
  assert.deepEqual(plan.missing.map((image) => image.role), ['api', 'authority', 'worker']);
});

test('reports omit credential material and local registry files stay untracked', async () => {
  const used = deps({
    project: async () => ({
      ok: true,
      dbUid: 'db',
      s3Uid: 's3',
      appUid: 'app',
      password: 'should-not-be-copied',
    }),
  });
  const result = await reconcileDevSlot({ worktree: '/tmp/new', registryRoot: '/tmp/reg' }, used);
  assert.equal(JSON.stringify(result.identities).includes('should-not-be-copied'), false);
  const ignored = spawnSync('git', ['check-ignore', '-q', '.offscreen/dev-session.json'], { encoding: 'utf8' });
  assert.equal(ignored.status, 0);
});

test('image load failure names role, phase, node, exit and redacts secrets', () => {
  const secret = 'super-secret-value';
  const failure = describeImageLoadFailure({ role: 'authority' }, {
    status: 1,
    stderr: [
      'phase=docker-build role=authority',
      'phase=kind-load role=authority node=offscreen-dev-control-plane',
      `postgres://dev_3_run:${secret}@postgres/dev_3 password=${secret}`,
      'AKIAIOSFODNN7EXAMPLE',
      'accept4 failed 110',
    ].join('\n'),
  });
  assert.match(failure.detail, /role=authority/);
  assert.match(failure.detail, /phase=kind-load/);
  assert.match(failure.detail, /node=offscreen-dev-control-plane/);
  assert.match(failure.detail, /exit=1/);
  assert.match(failure.detail, /accept4 failed 110/);
  assert.equal(failure.detail.includes(secret), false);
  assert.equal(failure.detail.includes('AKIAIOSFODNN7EXAMPLE'), false);
});

test('slot image script reports build, control-plane and worker failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'img-load-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const script = '/home/dskul/projects/offscreen-rpg-dxk09-t05/infra/kubernetes/lab/dev/load-dev-slot-image.sh';
  const run = (mode) => spawnSync('bash', [script, 'dev-3', 'authority', '@offscreen/game-authority'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, IMG_MODE: mode },
  });
  writeFileSync(join(bin, 'docker'), `#!/bin/bash
if [[ "$1" == "image" ]]; then echo sha256:ok; exit 0; fi
if [[ "$IMG_MODE" == "build-fail" ]]; then echo "build exploded password=hidden-secret" >&2; exit 7; fi
exit 0
`);
  writeFileSync(join(bin, 'kind'), `#!/bin/bash
node=""; while [[ $# -gt 0 ]]; do [[ "$1" == "--nodes" ]] && node="$2"; shift; done
if [[ "$IMG_MODE" == "control-fail" && "$node" == *control-plane ]]; then echo "control load failed" >&2; exit 8; fi
if [[ "$IMG_MODE" == "worker-fail" && "$node" == *worker ]]; then echo "worker load failed" >&2; exit 9; fi
exit 0
`);
  chmodSync(join(bin, 'docker'), 0o755);
  chmodSync(join(bin, 'kind'), 0o755);
  const ok = run('ok');
  assert.equal(ok.status, 0, ok.stderr);
  const build = describeImageLoadFailure({ role: 'authority' }, run('build-fail'));
  assert.match(build.detail, /phase=docker-build/);
  assert.match(build.detail, /exit=7/);
  assert.equal(build.detail.includes('hidden-secret'), false);
  const control = describeImageLoadFailure({ role: 'authority' }, run('control-fail'));
  assert.match(control.detail, /phase=kind-load/);
  assert.match(control.detail, /node=offscreen-dev-control-plane/);
  assert.match(control.detail, /exit=8/);
  const worker = describeImageLoadFailure({ role: 'authority' }, run('worker-fail'));
  assert.match(worker.detail, /node=offscreen-dev-worker/);
  assert.match(worker.detail, /exit=9/);
});
