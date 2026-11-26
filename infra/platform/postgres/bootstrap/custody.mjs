import { spawnSync } from 'node:child_process';
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

export const BASELINE_DEADLINE_MS = 1_800_000;
export const BASELINE_OUTER_TIMEOUT_MS = 1_830_000;

function assertPrivate(stat, directory) {
  if ((directory ? !stat.isDirectory() : !stat.isFile()) ||
      stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0)
    throw new Error('Unsafe PostgreSQL lock location');
}

export function createBaselineCustody({ now = () => performance.now(), budgetMs = BASELINE_DEADLINE_MS } = {}) {
  const deadline = now() + budgetMs;
  let fd;
  const remaining = () => Math.max(0, Math.floor(deadline - now()));
  function run(command, args, { input, timeoutMs = 15000, mutation = false } = {}) {
    const timeout = Math.min(remaining(), timeoutMs);
    if (timeout < 1) return { ok: false, timedOut: true, status: null, stdout: '', stderr: '' };
    if (mutation && (fd === undefined || command !== 'kubectl')) throw new Error('Mutation requires direct kubectl lock custody');
    const argv = command === 'kubectl' && args[0] === '--context'
      ? [...args.slice(0, 2), '--request-timeout=' + timeout + 'ms', ...args.slice(2)] : args;
    const result = spawnSync(command, argv, {
      input, encoding: 'utf8', timeout, killSignal: 'SIGKILL',
      stdio: mutation ? ['pipe', 'pipe', 'pipe', fd] : ['pipe', 'pipe', 'pipe'],
      maxBuffer: 8 * 1024 * 1024,
    });
    const timedOut = result.error?.code === 'ETIMEDOUT';
    return { ok: !result.error && result.status === 0, status: result.status,
      stdout: result.stdout ?? '', stderr: result.stderr ?? '', timedOut,
      missing: result.error?.code === 'ENOENT', signal: result.signal };
  }
  function acquire() {
    if (fd !== undefined) throw new Error('Nested PostgreSQL lock acquisition');
    if (remaining() < 1000) throw new Error('PostgreSQL deadline exhausted');
    const dir = join(homedir(), '.local/state/offscreen-rpg/platform-locks');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    assertPrivate(lstatSync(dir), true);
    const path = join(dir, 'postgres.lock');
    const opened = openSync(path, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    try {
      const stat = fstatSync(opened);
      assertPrivate(stat, false);
      const named = lstatSync(path);
      if (stat.ino !== named.ino || stat.dev !== named.dev || stat.nlink !== 1)
        throw new Error('PostgreSQL lock identity mismatch');
      const timeout = Math.min(31000, remaining());
      const result = spawnSync('flock', ['-x', '-w', String(Math.min(30, Math.max(0, (timeout - 500) / 1000))), '3'], {
        stdio: ['ignore', 'ignore', 'ignore', opened], timeout, killSignal: 'SIGKILL',
      });
      if (result.error || result.status !== 0) throw new Error('PostgreSQL lock unavailable');
      fd = opened;
    } catch (error) { closeSync(opened); throw error; }
  }
  function sleep(ms) {
    const duration = Math.min(ms, remaining());
    if (duration > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, duration);
  }
  function close() {
    if (fd !== undefined) { closeSync(fd); fd = undefined; }
  }
  return { remaining, run, acquire, sleep, close };
}
