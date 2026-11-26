import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers';
import { URL, fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEV_API_PORT_RANGE,
  readKindProfile,
} from '../../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  DEFAULT_BUDGET_MS,
  assertRedisRunnerEnv,
  resolveProductionStateRoot,
  withRedisMutation,
} from '../custody.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';

const devKind = readKindProfile('dev');
const devPort = DEV_API_PORT_RANGE.start;

/**
 * @param {string} command
 * @param {string[]} args
 */
function stubPlatformTargetRun(command, args) {
  if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
    return {
      ok: true,
      status: 0,
      stdout: `${devKind.clusterName}\n`,
      stderr: '',
      timedOut: false,
      missing: false,
    };
  }
  if (
    command === 'kubectl' &&
    args.includes('config') &&
    args.includes('view') &&
    args.includes('json')
  ) {
    const kubeconfigCluster = `kind-${devKind.clusterName}`;
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        clusters: [
          {
            name: kubeconfigCluster,
            cluster: { server: `https://127.0.0.1:${devPort}` },
          },
        ],
        contexts: [
          {
            name: devKind.contextName,
            context: { cluster: kubeconfigCluster, user: kubeconfigCluster },
          },
        ],
        users: [{ name: kubeconfigCluster, user: {} }],
      }),
      stderr: '',
      timedOut: false,
      missing: false,
    };
  }
  if (
    command === 'kubectl' &&
    args.includes('namespace') &&
    args.includes(DEV_BASELINE_NAMESPACE) &&
    args.includes('json')
  ) {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: DEV_BASELINE_NAMESPACE,
          uid: 'dev-baseline-uid',
          labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
        },
      }),
      stderr: '',
      timedOut: false,
      missing: false,
    };
  }
  throw new Error(
    `unstubbed platform target call: ${command} ${args.join(' ')}`,
  );
}

/** @param {Record<string, unknown>} [extra] */
function custodyDeps(extra = {}) {
  return { run: stubPlatformTargetRun, ...extra };
}

const workerPath = fileURLToPath(
  new URL('./custody-worker.mjs', import.meta.url),
);

/** @param {string} stateRoot @param {'dev' | 'release'} profileId */
function redisPaths(stateRoot, profileId) {
  const profile = readPlatformProfile(profileId);
  const lockDirectory = join(stateRoot, 'platform-locks');
  return {
    profile,
    lockDirectory,
    lockPath: join(lockDirectory, `${profile.contextName}-redis.lock`),
    pendingPath: join(lockDirectory, `${profile.contextName}-redis.pending`),
  };
}

/**
 * @param {string} lockPath
 * @param {{ waitSec?: number }} [options]
 */
function flockContender(lockPath, options = {}) {
  const args = ['--exclusive'];
  if (options.waitSec === undefined) {
    args.push('-n');
  } else {
    args.push('--wait', String(options.waitSec));
  }
  args.push(lockPath, process.execPath, '-e', '0');
  return spawnSync('flock', args, { encoding: 'utf8' });
}

/** @param {string} stateRoot */
function prepareLocks(stateRoot, profileId = 'dev') {
  const paths = redisPaths(stateRoot, profileId);
  mkdirSync(paths.lockDirectory, { recursive: true, mode: 0o700 });
  return paths;
}

/** @param {string} directory */
function makeStubCommand(directory, name, body) {
  const command = join(directory, name);
  writeFileSync(command, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o700 });
  return command;
}

test('flock status semantics: held blocks -n, release succeeds', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const fd = openSync(
    paths.lockPath,
    constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
    0o600,
  );
  try {
    const hold = spawnSync('flock', ['--exclusive', '--wait', '5', '3'], {
      stdio: ['ignore', 'ignore', 'ignore', fd],
    });
    assert.equal(hold.status, 0, 'exclusive acquire should return status 0');

    const blocked = flockContender(paths.lockPath);
    assert.equal(
      blocked.status,
      1,
      'contender should return status 1 while held',
    );

    const release = spawnSync('flock', ['-u', '3'], {
      stdio: ['ignore', 'ignore', 'ignore', fd],
    });
    assert.equal(release.status, 0);
    closeSync(fd);

    const after = flockContender(paths.lockPath);
    assert.equal(
      after.status,
      0,
      'contender should return status 0 after lock release',
    );
  } finally {
    if (typeof fd === 'number') {
      try {
        closeSync(fd);
      } catch {
        // ignore double close in failure paths
      }
    }
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('contention: holder keeps lock until release', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const holder = withRedisMutation(
    'dev',
    async () => {
      const blocked = flockContender(paths.lockPath);
      assert.equal(blocked.status, 1);
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { ok: true };
    },
    custodyDeps({
      stateRoot,
      budgetMs: 5_000,
      writeReserveMs: 100,
      lockWaitSec: 5,
    }),
  );
  await holder;
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('parent death: inherited lock survives helper exit', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const helper = spawn(
    process.execPath,
    [workerPath, 'sleep', stateRoot, paths.profile.contextName, '1500'],
    {
      stdio: 'ignore',
    },
  );

  await new Promise((resolve) => {
    helper.once('exit', resolve);
  });
  assert.equal(helper.exitCode, 0);

  const blocked = flockContender(paths.lockPath);
  assert.equal(
    blocked.status,
    1,
    'sleeper should retain the inherited flock lease',
  );

  await new Promise((resolve) => setTimeout(resolve, 1_700));
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('pending remains after failing mutation child', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const bin = mkdtempSync(join(tmpdir(), 'offscreen-redis-bin-'));
  makeStubCommand(bin, 'kubectl', 'exit 17');
  const envPath = `${bin}:${process.env.PATH ?? ''}`;

  const result = await withRedisMutation(
    'dev',
    async ({ runWrite }) => {
      const priorPath = process.env.PATH;
      process.env.PATH = envPath;
      try {
        const wrote = await runWrite('kubectl', ['version']);
        assert.equal(wrote.ok, false);
      } finally {
        process.env.PATH = priorPath;
      }
      return { ok: false };
    },
    custodyDeps({ stateRoot, budgetMs: 5_000, writeReserveMs: 100 }),
  );

  assert.equal(result.ok, false);
  assert.equal(existsSync(paths.pendingPath), true);
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(bin, { recursive: true, force: true });
});

test('TERM then KILL awaits direct child and leaves pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const script = mkdtempSync(join(tmpdir(), 'offscreen-redis-term-'));
  makeStubCommand(script, 'kubectl', 'sleep 60');

  const priorPath = process.env.PATH;
  process.env.PATH = `${script}:${priorPath ?? ''}`;
  try {
    await withRedisMutation(
      'dev',
      async ({ runWrite }) => {
        const write = runWrite('kubectl', ['ignored'], { timeoutMs: 60_000 });
        setTimeout(() => process.kill(process.pid, 'SIGTERM'), 50);
        const result = await write;
        assert.equal(result.ok, false);
        return { ok: false };
      },
      custodyDeps({
        stateRoot,
        budgetMs: 10_000,
        writeReserveMs: 100,
        killGraceMs: 150,
      }),
    );
  } finally {
    process.env.PATH = priorPath;
  }

  assert.equal(existsSync(paths.pendingPath), true);
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(script, { recursive: true, force: true });
});

test('receipt creation failure performs no write and leaves no pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const lockFd = openSync(
    paths.lockPath,
    constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
    0o600,
  );
  closeSync(lockFd);
  chmodSync(paths.lockDirectory, 0o500);

  await assert.rejects(
    () =>
      withRedisMutation(
        'dev',
        async ({ runWrite }) => {
          await runWrite('kubectl', ['version']);
          return { ok: true };
        },
        custodyDeps({ stateRoot, budgetMs: 5_000, writeReserveMs: 100 }),
      ),
    /pending receipt creation failed/,
  );
  assert.equal(existsSync(paths.pendingPath), false);

  chmodSync(paths.lockDirectory, 0o700);
  mkdirSync(paths.pendingPath);
  await assert.rejects(
    () =>
      withRedisMutation(
        'dev',
        async () => ({ ok: true }),
        custodyDeps({ stateRoot, budgetMs: 5_000, writeReserveMs: 100 }),
      ),
    /stale redis pending/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('unknown success result leaves pending in place', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  await withRedisMutation(
    'dev',
    async () => ({ ok: false, detail: 'uncertain' }),
    custodyDeps({ stateRoot, budgetMs: 5_000, writeReserveMs: 100 }),
  );
  assert.equal(existsSync(paths.pendingPath), true);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('successful operation clears pending and releases lock', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const result = await withRedisMutation(
    'dev',
    async () => ({ ok: true, detail: 'complete' }),
    custodyDeps({ stateRoot, budgetMs: 5_000, writeReserveMs: 100 }),
  );
  assert.equal(result.ok, true);
  assert.equal(existsSync(paths.pendingPath), false);
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('environment variables do not relocate the production state root', () => {
  const prior = process.env.OFFSCREEN_STATE_ROOT;
  process.env.OFFSCREEN_STATE_ROOT = join(tmpdir(), 'must-not-be-used');
  try {
    assert.equal(
      resolveProductionStateRoot(),
      join(homedir(), '.local', 'state', 'offscreen-rpg'),
    );
    assert.equal(DEFAULT_BUDGET_MS, 600_000);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_STATE_ROOT;
    } else {
      process.env.OFFSCREEN_STATE_ROOT = prior;
    }
  }
});

test('runWrite refuses when remaining budget is below the write reserve', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  prepareLocks(stateRoot);
  let clock = 0;
  await assert.rejects(
    () =>
      withRedisMutation(
        'dev',
        async ({ runWrite }) => {
          clock = 300;
          await runWrite('kubectl', ['version']);
          return { ok: true };
        },
        custodyDeps({
          stateRoot,
          now: () => clock,
          budgetMs: 1_000,
          writeReserveMs: 800,
        }),
      ),
    /budget reserve/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('second write allowed once initial admission is consumed', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  prepareLocks(stateRoot);
  const bin = mkdtempSync(join(tmpdir(), 'offscreen-redis-bin-'));
  makeStubCommand(bin, 'kubectl', 'exit 0');
  const envPath = `${bin}:${process.env.PATH ?? ''}`;
  let clock = 0;
  await withRedisMutation(
    'dev',
    async ({ runWrite }) => {
      clock = 100;
      const prior = process.env.PATH;
      process.env.PATH = envPath;
      try {
        const first = await runWrite('kubectl', ['one']);
        assert.equal(first.ok, true);
        clock = 950;
        const second = await runWrite('kubectl', ['two']);
        assert.equal(second.ok, true);
      } finally {
        process.env.PATH = prior;
      }
      return { ok: true };
    },
    custodyDeps({
      stateRoot,
      now: () => clock,
      budgetMs: 1_000,
      writeReserveMs: 800,
    }),
  );
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(bin, { recursive: true, force: true });
});

test('stubborn child receives SIGKILL after SIGTERM grace', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  const script = mkdtempSync(join(tmpdir(), 'offscreen-redis-stubborn-'));
  makeStubCommand(
    script,
    'kubectl',
    'trap "" TERM\nwhile true; do sleep 1; done',
  );
  const priorPath = process.env.PATH;
  process.env.PATH = `${script}:${priorPath ?? ''}`;
  const started = performance.now();
  try {
    await withRedisMutation(
      'dev',
      async ({ runWrite }) => {
        const write = runWrite('kubectl', ['hold'], { timeoutMs: 60_000 });
        setTimeout(() => process.kill(process.pid, 'SIGTERM'), 40);
        const result = await write;
        assert.equal(result.ok, false);
        return { ok: false };
      },
      custodyDeps({
        stateRoot,
        budgetMs: 20_000,
        writeReserveMs: 100,
        killGraceMs: 150,
      }),
    );
  } finally {
    process.env.PATH = priorPath;
  }
  assert.ok(performance.now() - started >= 150);
  assert.equal(existsSync(paths.pendingPath), true);
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(script, { recursive: true, force: true });
});

test('signal between writes blocks the later write', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const bin = mkdtempSync(join(tmpdir(), 'offscreen-redis-bin-'));
  makeStubCommand(bin, 'kubectl', 'sleep 2');
  const priorPath = process.env.PATH;
  process.env.PATH = `${bin}:${priorPath ?? ''}`;
  try {
    await withRedisMutation(
      'dev',
      async ({ runWrite }) => {
        const first = runWrite('kubectl', ['slow'], { timeoutMs: 10_000 });
        setTimeout(() => process.kill(process.pid, 'SIGTERM'), 60);
        const firstResult = await first;
        assert.equal(firstResult.ok, false);
        await assert.rejects(
          () => runWrite('kubectl', ['blocked']),
          /cancelled after termination signal/,
        );
        return { ok: false };
      },
      custodyDeps({
        stateRoot,
        budgetMs: 15_000,
        writeReserveMs: 100,
        killGraceMs: 80,
      }),
    );
  } finally {
    process.env.PATH = priorPath;
  }
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(bin, { recursive: true, force: true });
});

test('pending receipt update failure leaves pending in place', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  await withRedisMutation(
    'dev',
    async ({ updatePending }) => {
      chmodSync(paths.pendingPath, 0o444);
      assert.throws(
        () => updatePending({ originalUid: 'uid-1' }),
        /pending receipt update failed/,
      );
      return { ok: false };
    },
    custodyDeps({ stateRoot, budgetMs: 5_000, writeReserveMs: 100 }),
  );
  assert.equal(existsSync(paths.pendingPath), true);
  chmodSync(paths.pendingPath, 0o600);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('helm runner env override refuses before write', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  prepareLocks(stateRoot);
  const prior = process.env.HELM_DRIVER;
  process.env.HELM_DRIVER = 'config';
  try {
    await assert.rejects(
      () =>
        withRedisMutation('dev', async () => ({ ok: true }), {
          stateRoot,
          budgetMs: 5_000,
          writeReserveMs: 100,
        }),
      /redis runner env refused: HELM_DRIVER/,
    );
    assert.throws(() => assertRedisRunnerEnv(), /HELM_DRIVER/);
  } finally {
    if (prior === undefined) {
      delete process.env.HELM_DRIVER;
    } else {
      process.env.HELM_DRIVER = prior;
    }
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('existing pending receipt blocks a second contender', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-custody-'));
  const paths = prepareLocks(stateRoot);
  writeFileSync(
    paths.pendingPath,
    `${JSON.stringify({
      operationId: 'prior',
      profile: 'dev',
      context: paths.profile.contextName,
      phase: 'mutation',
      start: new Date().toISOString(),
      target: 'offscreen-dev-redis',
    })}\n`,
    { mode: 0o600 },
  );
  await assert.rejects(
    () =>
      withRedisMutation('dev', async () => ({ ok: true }), {
        stateRoot,
        budgetMs: 5_000,
        writeReserveMs: 100,
      }),
    /pending receipt already exists/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});
