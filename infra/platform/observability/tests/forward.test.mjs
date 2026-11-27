import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

import { createServer } from 'node:net';

import { parseConnectArgs, runObservabilityConnect } from '../connect.mjs';
import {
  FORWARD_ALLOWLIST,
  ownedChildEnv,
  openForwards,
  probeForwardTransport,
  startOwnedChild,
} from '../forward.mjs';

const WRAPPER = fileURLToPath(new URL('../exec-owned.py', import.meta.url));

test('owned child env strips target overrides and keeps PATH', () => {
  const env = ownedChildEnv({
    KUBECONFIG: '/tmp/kubeconfig',
    HELM_KUBEAPISERVER: 'https://example.invalid',
    HELM_DRIVER: 'configmap',
    PATH: process.env.PATH,
  });
  assert.equal(env.KUBECONFIG, undefined);
  assert.equal(env.HELM_KUBEAPISERVER, undefined);
  assert.equal(env.HELM_DRIVER, undefined);
  assert.equal(env.PATH, process.env.PATH);
});

test('pre-abort and oversized stdin do not launch a child', async () => {
  const marker = join(
    mkdtempSync(join(tmpdir(), 'obs-forward-pre-')),
    'marker',
  );
  const aborted = startOwnedChild(
    process.execPath,
    ['-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x')`],
    {
      signal: globalThis.AbortSignal.abort(),
      deadline: performance.now() + 10_000,
      now: () => performance.now(),
    },
  );
  const abortedResult = await aborted.outcome;
  assert.equal(aborted.pid, null);
  assert.equal(abortedResult.attempted, false);
  assert.equal(abortedResult.cancelled, true);
  await aborted.closed;
  await delay(50);
  assert.equal(
    (() => {
      try {
        return readFileSync(marker, 'utf8');
      } catch {
        return '';
      }
    })(),
    '',
  );
  assert.throws(
    () =>
      startOwnedChild(process.execPath, ['-e', '0'], {
        input: globalThis.Buffer.alloc(1_048_577, 1),
        deadline: performance.now() + 10_000,
        now: () => performance.now(),
      }),
    /1MiB/,
  );
  rmSync(join(marker, '..'), { recursive: true, force: true });
});

test('handshake inherits the lock descriptor and a wrong parent does not exec', async () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-forward-hand-'));
  const lockPath = join(root, 'lock');
  const fd = openSync(lockPath, constants.O_CREAT | constants.O_RDWR, 0o600);
  const expected = fstatSync(fd);
  const script = `
    const fs = require('fs');
    const st = fs.fstatSync(3);
    process.stdout.write(JSON.stringify({ pid: process.pid, ppid: process.ppid, ino: st.ino, dev: st.dev }));
  `;
  const child = startOwnedChild(process.execPath, ['-e', script], {
    fds: [fd],
    deadline: performance.now() + 5_000,
    now: () => performance.now(),
    killGraceMs: 1_000,
  });
  const result = await child.outcome;
  assert.equal(result.ok, true, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.pid, child.pid);
  assert.equal(body.ppid, process.pid);
  assert.equal(body.ino, expected.ino);
  assert.equal(body.dev, expected.dev);
  await child.closed;
  closeSync(fd);

  const marker = join(root, 'should-not-exist');
  const wrong = spawn(
    '/usr/bin/python3',
    [
      WRAPPER,
      '1',
      '0',
      process.execPath,
      '-e',
      `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x')`,
    ],
    { stdio: 'ignore' },
  );
  const status = await new Promise((resolve) => {
    wrong.once('exit', (code) => resolve(code));
  });
  assert.notEqual(status, 0);
  assert.equal(
    (() => {
      try {
        return readFileSync(marker, 'utf8');
      } catch {
        return '';
      }
    })(),
    '',
  );
  rmSync(root, { recursive: true, force: true });
});

test('ignored TERM is killed, cancel of exit 0 is not success, and overflow stops', async () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-forward-term-'));
  const ignorePath = join(root, 'ignore.mjs');
  writeFileSync(
    ignorePath,
    "process.on('SIGTERM', () => {});\nsetTimeout(() => {}, 60_000);\n",
  );
  const started = performance.now();
  const ignored = startOwnedChild(process.execPath, [ignorePath], {
    deadline: started + 1_200,
    now: () => performance.now(),
    killGraceMs: 400,
  });
  const ignoredResult = await ignored.outcome;
  assert.equal(ignoredResult.ok, false);
  assert.equal(ignoredResult.timedOut, true);
  assert.equal(ignoredResult.signal, 'SIGKILL');
  await ignored.closed;

  const exitPath = join(root, 'exit.mjs');
  writeFileSync(
    exitPath,
    "process.on('SIGTERM', () => process.exit(0));\nsetTimeout(() => {}, 60_000);\n",
  );
  const cancellable = startOwnedChild(process.execPath, [exitPath], {
    deadline: performance.now() + 10_000,
    now: () => performance.now(),
    killGraceMs: 1_000,
  });
  await delay(150);
  const cancelled = await cancellable.stop();
  assert.equal(cancelled.ok, false);
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.exitCode, 0);
  await cancellable.closed;

  const noisy = startOwnedChild(
    process.execPath,
    ['-e', "process.stdout.write('x'.repeat(50_000))"],
    {
      deadline: performance.now() + 5_000,
      now: () => performance.now(),
      killGraceMs: 500,
      stdoutLimit: 128,
    },
  );
  const overflow = await noisy.outcome;
  assert.equal(overflow.ok, false);
  assert.ok(overflow.stdout.length <= 128);
  await noisy.closed;
  rmSync(root, { recursive: true, force: true });
});

test('stdin EPIPE is a failed attempt and parent death kills the direct child', async () => {
  const closed = startOwnedChild('/bin/true', [], {
    input: globalThis.Buffer.alloc(1_048_575, 7),
    deadline: performance.now() + 5_000,
    now: () => performance.now(),
    killGraceMs: 500,
  });
  const pipe = await closed.outcome;
  assert.equal(pipe.attempted, true);
  assert.equal(pipe.ok, false);
  assert.equal(pipe.stdout.includes('payload-not-logged'), false);
  await closed.closed;

  const root = mkdtempSync(join(tmpdir(), 'obs-forward-death-'));
  const pidPath = join(root, 'pid');
  const helper = `
    import { spawn } from 'node:child_process';
    import { writeFileSync } from 'node:fs';
    const child = spawn(process.argv[2], [process.argv[3], String(process.pid), '0', process.execPath, '-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    writeFileSync(process.argv[4], String(child.pid));
    setTimeout(() => process.kill(process.pid, 'SIGKILL'), 300);
  `;
  const helperPath = join(root, 'helper.mjs');
  writeFileSync(helperPath, helper);
  const parent = spawn(
    process.execPath,
    [helperPath, '/usr/bin/python3', WRAPPER, pidPath],
    {
      stdio: 'ignore',
    },
  );
  await new Promise((resolve) => parent.once('exit', resolve));
  await delay(200);
  const pid = Number(readFileSync(pidPath, 'utf8'));
  let alive = true;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(pid, 0);
      await delay(100);
    } catch {
      alive = false;
      break;
    }
  }
  assert.equal(alive, false);
  rmSync(root, { recursive: true, force: true });
});

test('inherited descriptor keeps the lock until the owned child closes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-forward-flock-'));
  const lockPath = join(root, 'service.lock');
  const fd = openSync(lockPath, constants.O_CREAT | constants.O_RDWR, 0o600);
  const holder = startOwnedChild(
    'flock',
    ['--exclusive', '--wait', '2.000', '3'],
    {
      fds: [fd],
      deadline: performance.now() + 8_000,
      now: () => performance.now(),
      killGraceMs: 1_000,
    },
  );
  const held = await holder.outcome;
  assert.equal(held.ok, true, held.stderr);
  const sleeper = startOwnedChild(
    process.execPath,
    ['-e', 'setTimeout(() => {}, 800)'],
    {
      fds: [fd],
      deadline: performance.now() + 5_000,
      now: () => performance.now(),
      killGraceMs: 500,
    },
  );
  closeSync(fd);
  const blocked = spawn('flock', [
    '--exclusive',
    '-n',
    lockPath,
    process.execPath,
    '-e',
    '0',
  ]);
  const blockedStatus = await new Promise((resolve) => {
    blocked.once('exit', (code) => resolve(code));
  });
  assert.equal(blockedStatus, 1);
  await sleeper.closed;
  const stat = lstatSync(lockPath);
  assert.equal(stat.isSymbolicLink(), false);
  const free = spawn('flock', [
    '--exclusive',
    '-n',
    lockPath,
    process.execPath,
    '-e',
    '0',
  ]);
  const freeStatus = await new Promise((resolve) => {
    free.once('exit', (code) => resolve(code));
  });
  assert.equal(freeStatus, 0);
  rmSync(root, { recursive: true, force: true });
});

const identity = {
  snapshotPath: '/tmp/kubeconfig',
  tuple: { contextName: 'dev', targetNamespace: 'offscreen-dev-observability' },
};

function fakeChild(lines, { exit = { ok: true, closeUnconfirmed: false } } = {}) {
  const listeners = [];
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });
  return {
    pid: 1,
    closed,
    outcome: Promise.resolve(exit),
    stop() {
      resolveClosed(exit);
      return Promise.resolve(exit);
    },
    onOutput(listener) {
      listeners.push(listener);
    },
    emit() {
      for (const line of lines) {
        for (const listener of listeners) {
          listener(`${line}\n`);
        }
      }
    },
  };
}

test('openForwards accepts the fixed loopback lines and refuses a foreign port', async () => {
  assert.equal(FORWARD_ALLOWLIST.grafana.remote, 80);
  assert.equal(FORWARD_ALLOWLIST.grafana.targetPort, 3000);
  const occupied = createServer();
  await new Promise((resolve) => occupied.listen(14318, '127.0.0.1', resolve));
  await assert.rejects(
    () =>
      openForwards(identity, { fd: 3, mode: 'shared', pending: false }, {
        bindings: [{ key: 'developerHttp' }],
        deadline: performance.now() + 1000,
        now: () => performance.now(),
        startChild() {
          throw new Error('kubectl must not start when the port is taken');
        },
      }),
    /not free/,
  );
  occupied.close();

  const child = fakeChild(['Forwarding from 127.0.0.1:14318 -> 4328']);
  const opened = openForwards(identity, { fd: 3, mode: 'shared', pending: false }, {
    bindings: [{ key: 'developerHttp' }],
    deadline: performance.now() + 1000,
    now: () => performance.now(),
    startChild() {
      queueMicrotask(() => child.emit());
      return child;
    },
  });
  const session = await opened;
  assert.equal(session.ports.developerHttp, 14318);
  const closed = await session.close();
  assert.equal(closed.ok, true);
});

test('openForwards rejects a bad line, a second exit and a diagnostic bind without a proof lock', async () => {
  const bad = fakeChild(['Forwarding from 0.0.0.0:14318 -> 4328']);
  await assert.rejects(
    () =>
      openForwards(identity, { fd: 3, mode: 'shared', pending: false }, {
        bindings: [{ key: 'developerHttp' }],
        deadline: performance.now() + 1000,
        now: () => performance.now(),
        startChild() {
          queueMicrotask(() => bad.emit());
          return bad;
        },
      }),
    /invalid/,
  );
  await assert.rejects(
    () =>
      openForwards(identity, { fd: 3, mode: 'shared', pending: false }, {
        bindings: [{ key: 'diagnosticHttp', localPort: 0 }],
        startChild() {
          throw new Error('must not spawn');
        },
      }),
    /proof lock/,
  );
});

test('probeForwardTransport checks loopback HTTP and refuses a failed Grafana health', async () => {
  const ok = await probeForwardTransport(
    { developerHttp: 9 },
    {
      fetch: async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from('{}'),
      }),
      connect: async () => {},
    },
  );
  assert.equal(ok.ok, true);
  const grafana = await probeForwardTransport(
    { grafana: 9 },
    {
      grafanaAuth: { user: 'admin', password: 'secret' },
      fetch: async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from('{"database":"failing"}'),
      }),
    },
  );
  assert.equal(grafana.reasonCode, 'grafana');
});

test('connect accepts only empty argv or --queries and refuses a predecessor', async () => {
  assert.deepEqual(parseConnectArgs([]), { queries: false });
  assert.deepEqual(parseConnectArgs(['--queries']), { queries: true });
  assert.throws(() => parseConnectArgs(['--queries', '--queries']), /invalid/);
  const refused = await runObservabilityConnect({
    argv: [],
    readPlatformProfile: () => ({ contextName: 'dev' }),
    acquireCustody: async () => ({ fd: 3, close() {} }),
    captureIdentity: () => identity,
    loadObservabilityVariants: () => ({ desired: {}, predecessor: {} }),
    collectInventory: async () => ({ pending: false }),
    classifyInventory: () => ({ state: 'not-ready', reasonCode: 'upgrade-required', pending: false }),
  });
  assert.equal(refused.reasonCode, 'upgrade-required');
  assert.equal(refused.exitCode, 1);
});
