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
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  acquireCustody,
  custodyPaths,
  readPending,
  resolveProductionStateRoot,
  runMutation,
} from '../custody.mjs';

const devKind = readKindProfile('dev');
const workerPath = fileURLToPath(
  new URL('./custody-worker.mjs', import.meta.url),
);

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

/** @param {string} directory @param {string} name @param {string} body */
function makeStubCommand(directory, name, body) {
  const command = join(directory, name);
  writeFileSync(command, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o700 });
  return command;
}

/** @param {string} stateRoot */
function prepareState(stateRoot, contextName = devKind.contextName) {
  const paths = custodyPaths(stateRoot, contextName);
  mkdirSync(paths.lockDirectory, { recursive: true, mode: 0o700 });
  return paths;
}

test('readPending missing file is absent and valid without creating paths', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-read-'));
  const paths = custodyPaths(stateRoot, devKind.contextName);
  assert.equal(existsSync(paths.lockDirectory), false);
  const observation = readPending(devKind.contextName, { stateRoot });
  assert.equal(observation.pending, false);
  assert.equal(observation.valid, true);
  assert.equal(existsSync(paths.lockDirectory), false);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('readPending malformed and symlink pending fail closed', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-invalid-'));
  const paths = prepareState(stateRoot);
  writeFileSync(paths.pendingPath, '{ not-json', { mode: 0o600 });
  assert.deepEqual(readPending(devKind.contextName, { stateRoot }), {
    pending: true,
    valid: false,
  });
  rmSync(paths.pendingPath);
  symlinkSync('/etc/hosts', paths.pendingPath);
  assert.deepEqual(readPending(devKind.contextName, { stateRoot }), {
    pending: true,
    valid: false,
  });
  rmSync(stateRoot, { recursive: true, force: true });
});

test('lock path stays distinct from Redis filenames', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-paths-'));
  const obsPaths = custodyPaths(stateRoot, devKind.contextName);
  const redisLock = join(
    stateRoot,
    'platform-locks',
    `${devKind.contextName}-redis.lock`,
  );
  const redisPending = join(
    stateRoot,
    'platform-locks',
    `${devKind.contextName}-redis.pending`,
  );
  assert.match(obsPaths.lockPath, /-observability\.lock$/);
  assert.match(obsPaths.pendingPath, /-observability\.pending$/);
  assert.notEqual(obsPaths.lockPath, redisLock);
  assert.notEqual(obsPaths.pendingPath, redisPending);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('concurrent holders contend on the same context lock', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-contend-'));
  const paths = prepareState(stateRoot);
  const first = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  const blocked = flockContender(paths.lockPath);
  assert.equal(blocked.status, 1);
  first.begin({ phase: 'namespace', tuple: { port: 24443 } });
  first.close();
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('acquireCustody refuses stale valid pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-stale-'));
  const paths = prepareState(stateRoot);
  const record = {
    operationId: '00000000-0000-4000-8000-000000000001',
    service: 'observability',
    context: devKind.contextName,
    phase: 'helm',
    tuple: { port: 24443 },
    start: new Date().toISOString(),
  };
  writeFileSync(paths.pendingPath, `${JSON.stringify(record)}\n`, {
    mode: 0o600,
  });
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /pending receipt already exists/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('parent death leaves inherited lock until child exits', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-parent-'));
  const paths = prepareState(stateRoot);
  const helper = spawn(
    process.execPath,
    [workerPath, stateRoot, devKind.contextName, '1200'],
    { stdio: 'ignore' },
  );
  await new Promise((resolve) => {
    helper.once('exit', resolve);
  });
  assert.equal(helper.exitCode, 0);
  const blocked = flockContender(paths.lockPath);
  assert.equal(blocked.status, 1);
  await new Promise((resolve) => setTimeout(resolve, 1_300));
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('runMutation TERM then KILL for ignore-TERM child and keeps pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-kill-'));
  const paths = prepareState(stateRoot);
  const script = mkdtempSync(join(tmpdir(), 'obs-term-ignore-'));
  const slowPath = join(script, 'slow.mjs');
  writeFileSync(
    slowPath,
    `process.on('SIGTERM', () => {});\nsetTimeout(() => {}, 60_000);\n`,
    { mode: 0o700 },
  );
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({ phase: 'namespace', tuple: { port: 24443 } });
  const now = (() => {
    let clock = 0;
    return () => {
      clock += 40;
      return clock;
    };
  })();
  const result = await runMutation(process.execPath, [slowPath], {
    custody,
    now,
    deadline: 10_000,
    timeoutMs: 80,
    killGraceMs: 120,
  });
  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
  assert.ok(result.signal === 'SIGKILL' || result.signal === 'SIGTERM');
  assert.equal(existsSync(paths.pendingPath), true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(script, { recursive: true, force: true });
});

test('cancellation latch prevents any later spawn', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-cancel-'));
  prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({ phase: 'secret', tuple: { port: 24443 } });
  custody.cancel();
  const result = await runMutation(process.execPath, ['-e', '0'], {
    custody,
    timeoutMs: 5_000,
  });
  assert.equal(result.ok, false);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('close alone retains pending and blocks later acquisition', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-retain-'));
  const paths = prepareState(stateRoot);
  const retained = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  retained.begin({ phase: 'obs-prometheus', tuple: { port: 24443 } });
  retained.close();
  assert.equal(existsSync(paths.pendingPath), true);
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /pending receipt already exists/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('held custody clear removes durable pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-clear-'));
  const paths = prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({ phase: 'namespace', tuple: { port: 24443 } });
  custody.clear();
  assert.equal(existsSync(paths.pendingPath), false);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('acquireCustody refuses symlink lock path', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-symlink-'));
  const paths = prepareState(stateRoot);
  rmSync(paths.lockPath, { force: true });
  symlinkSync('/etc/hosts', paths.lockPath);
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /lock path is a symlink/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('production state root remains owner-local', () => {
  assert.equal(
    resolveProductionStateRoot(),
    join(homedir(), '.local', 'state', 'offscreen-rpg'),
  );
});

test('release profile uses the same service-specific lock basename', () => {
  const release = readPlatformProfile('release');
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-release-'));
  const paths = custodyPaths(stateRoot, release.contextName);
  assert.match(paths.lockPath, /-observability\.lock$/);
  rmSync(stateRoot, { recursive: true, force: true });
});
