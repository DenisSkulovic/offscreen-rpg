import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createCompileWatchSupervisor,
  createLineBuffer,
  stopChildBounded,
  waitForChildExit,
} from '../runtime/compile-watch.mjs';
import { runLaunchLoaded } from '../runtime/launch-loaded.mjs';
import {
  DEV_WATCHED_COMPILATION_SCHEMA,
  evaluateDevLoadedRuntimeReadiness,
  fingerprintCompiledTree,
  markDevWatchedCompilation,
  resolveCompiledDistRoot,
} from '../runtime/generation.mjs';

const LAUNCH_LOADED_PATH = fileURLToPath(
  new URL('../runtime/launch-loaded.mjs', import.meta.url),
);
const ENTRY_FIXTURE = fileURLToPath(
  new URL('./fixtures/dev-compiled-entry.mjs', import.meta.url),
);

function seedWorkspace(root, entryRel, extra = {}) {
  const entryAbs = join(root, entryRel);
  mkdirSync(dirname(entryAbs), { recursive: true });
  writeFileSync(
    entryAbs,
    `import './dep.js';\nimport { setInterval } from 'node:timers';\nsetInterval(() => {}, 2147483647);\n`,
    'utf8',
  );
  const distRoot = resolveCompiledDistRoot(root, entryRel);
  writeFileSync(join(distRoot, 'dep.js'), 'export const v = 1;\n', 'utf8');
  for (const [rel, content] of Object.entries(extra)) {
    const abs = join(distRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return { entryAbs, distRoot, digest: fingerprintCompiledTree(distRoot) };
}

/**
 * @returns {{ child: import('node:child_process').ChildProcessWithoutNullStreams, pushStdout: (chunk: string) => void, end: (code?: number) => void }}
 */
function createFakeCompilerProcess() {
  const stdout = new Readable({ read() {} });
  const child = new EventEmitter();
  Object.assign(child, {
    stdout,
    stderr: null,
    stdin: null,
    stdio: [null, stdout, null],
    exitCode: null,
    signalCode: null,
    pid: 900_001,
    kill(signal) {
      queueMicrotask(() => {
        child.exitCode = signal === 'SIGKILL' ? null : 0;
        child.signalCode = signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM';
        child.emit('exit', child.exitCode, child.signalCode);
      });
    },
  });
  return {
    child:
      /** @type {import('node:child_process').ChildProcessWithoutNullStreams} */ (
        child
      ),
    pushStdout(chunk) {
      stdout.push(chunk);
    },
    end(code = 0) {
      child.exitCode = code;
      child.emit('exit', code, null);
    },
  };
}

/**
 * @returns {{ child: import('node:child_process').ChildProcess, kills: string[] }}
 */
function createStubbornRuntimeProcess() {
  const kills = [];
  const child = new EventEmitter();
  Object.assign(child, {
    exitCode: null,
    signalCode: null,
    pid: 900_003,
    kill(signal) {
      kills.push(signal);
    },
  });
  return {
    child: /** @type {import('node:child_process').ChildProcess} */ (child),
    kills,
  };
}

/**
 * @returns {{ child: import('node:child_process').ChildProcess, kills: string[], exit: (code?: number) => void, delayedExit: () => void }}
 */
function createFakeRuntimeProcess() {
  const kills = [];
  const child = new EventEmitter();
  Object.assign(child, {
    exitCode: null,
    signalCode: null,
    pid: 900_002,
    kill(signal) {
      kills.push(signal);
      queueMicrotask(() => {
        child.exitCode = signal === 'SIGKILL' ? null : 0;
        child.signalCode = signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM';
        child.emit('exit', child.exitCode, child.signalCode);
      });
    },
  });
  return {
    child: /** @type {import('node:child_process').ChildProcess} */ (child),
    kills,
    exit(code = 0) {
      child.exitCode = code;
      child.emit('exit', code, null);
    },
    delayedExit() {
      /* no automatic exit after SIGTERM */
    },
  };
}

function compileSuccessLine() {
  return 'Found 0 errors. Watching for file changes.\n';
}

function compileSuccessLineWithTscStamp() {
  return '8:00:05 PM - Found 0 errors. Watching for file changes.\n';
}

test('line buffer handles CRLF and split compiler completion chunks', () => {
  const lines = [];
  const buffer = createLineBuffer((line) => lines.push(line));
  buffer.push('Starting compilation in watch mo');
  buffer.push('de\r\n');
  buffer.push('Found 0 errors. Watching for file chan');
  buffer.push('ges.\n');
  assert.deepEqual(lines, [
    'Starting compilation in watch mode',
    'Found 0 errors. Watching for file changes.',
  ]);
});

test('launch-loaded publishes loaded after import and digest verification', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-launch-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs } = seedWorkspace(root, entryRel);
  writeFileSync(entryAbs, 'export const fixtureLoaded = true;\n', 'utf8');

  markDevWatchedCompilation({
    phase: 'success',
    role: 'fixture',
    compiledEntryPath: entryRel,
    cwd: root,
    environmentId: 'dev-1',
  });
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'fixture.desired.json'), 'utf8'),
  );

  const code = await runLaunchLoaded(
    ['fixture', entryRel, desired.generationId, desired.compiledModuleIdentity],
    { cwd: root },
  );
  assert.equal(code, 0);
  const loaded = JSON.parse(
    readFileSync(join(receiptRoot, 'fixture.loaded.json'), 'utf8'),
  );
  assert.equal(loaded.compiledModuleIdentity, desired.compiledModuleIdentity);
  assert.equal(loaded.generationId, desired.generationId);
  assert.ok(loaded.pid > 0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('supervisor does not start runtime on compile error', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-err-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  seedWorkspace(root, entryRel);

  const fake = createFakeCompilerProcess();
  let runtimeStarts = 0;
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-2',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    spawnCompiler: () => fake.child,
    spawnRuntime: () => {
      runtimeStarts += 1;
      return createFakeRuntimeProcess().child;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout('Found 2 errors. Watching for file changes.\n');

  await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  assert.equal(runtimeStarts, 0);
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.equal(desired.phase, 'compile_error');
  assert.equal(desired.ready, false);
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('supervisor starts runtime once after successful compile', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-ok-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs, distRoot } = seedWorkspace(root, entryRel);
  writeFileSync(
    entryAbs,
    `import { pathToFileURL } from 'node:url';\nawait import(pathToFileURL(${JSON.stringify(ENTRY_FIXTURE)}).href);\n`,
    'utf8',
  );

  const fake = createFakeCompilerProcess();
  const runtimeStarts = [];
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-3',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    spawnCompiler: () => fake.child,
    spawnRuntime: (argv) => {
      runtimeStarts.push(argv);
      return createFakeRuntimeProcess().child;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLine());

  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  assert.equal(runtimeStarts.length, 1);
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.equal(desired.schema, DEV_WATCHED_COMPILATION_SCHEMA);
  assert.equal(desired.ready, true);
  assert.equal(runtimeStarts[0][3], desired.generationId);
  assert.equal(runtimeStarts[0][4], desired.compiledModuleIdentity);
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
    environmentId: 'dev-3',
  });
  if (existsSync(join(receiptRoot, 'api.loaded.json'))) {
    assert.equal(status.ready, true);
  }
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('supervisor accepts tsc watch timestamp prefix', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-stamp-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  seedWorkspace(root, entryRel);
  const fake = createFakeCompilerProcess();
  const runtimeStarts = [];
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-3',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    spawnCompiler: () => fake.child,
    spawnRuntime: (argv) => {
      runtimeStarts.push(argv);
      return createFakeRuntimeProcess().child;
    },
  });
  supervisor.start();
  fake.pushStdout('8:00:03 PM - Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLineWithTscStamp());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  assert.equal(runtimeStarts.length, 1);
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('changed dependency with same entry promotes a new generation', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-dep-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs, distRoot } = seedWorkspace(root, entryRel);
  writeFileSync(
    entryAbs,
    `import { pathToFileURL } from 'node:url';\nawait import(pathToFileURL(${JSON.stringify(ENTRY_FIXTURE)}).href);\n`,
    'utf8',
  );

  const fake = createFakeCompilerProcess();
  const runtimeStarts = [];
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-4',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    childStopTimeoutMs: 50,
    spawnCompiler: () => fake.child,
    spawnRuntime: (argv) => {
      runtimeStarts.push(argv);
      return createFakeRuntimeProcess().child;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));

  const firstDesired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  writeFileSync(join(distRoot, 'dep.js'), 'export const v = 2;\n', 'utf8');

  fake.pushStdout('File change detected. Starting incremental compilation.\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));

  const secondDesired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.notEqual(firstDesired.generationId, secondDesired.generationId);
  assert.notEqual(
    firstDesired.compiledModuleIdentity,
    secondDesired.compiledModuleIdentity,
  );
  assert.equal(runtimeStarts.length, 2);
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('overlapping compile discards superseded runtime start', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-overlap-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  seedWorkspace(root, entryRel);

  const fake = createFakeCompilerProcess();
  const generationIds = [];
  let delayedStop = true;
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-5',
    childStopTimeoutMs: 200,
    spawnCompiler: () => fake.child,
    spawnRuntime: (argv) => {
      generationIds.push(argv[3]);
      const runtime = createFakeRuntimeProcess();
      const originalKill = runtime.child.kill.bind(runtime.child);
      runtime.child.kill = (signal) => {
        if (signal === 'SIGTERM' && delayedStop) {
          setTimeout(() => originalKill('SIGKILL'), 40);
          return;
        }
        originalKill(signal);
      };
      return runtime.child;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 30));
  fake.pushStdout('File change detected. Starting incremental compilation.\n');
  fake.pushStdout(compileSuccessLine());
  delayedStop = false;
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 400));

  assert.equal(generationIds.length, 2);
  assert.notEqual(generationIds[0], generationIds[1]);
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('stopChildBounded stops after successful SIGTERM', async () => {
  const runtime = createFakeRuntimeProcess();
  const killCalls = [];
  runtime.child.kill = (signal) => {
    killCalls.push(signal);
    if (signal === 'SIGTERM') {
      runtime.exit(0);
    }
  };

  await stopChildBounded(runtime.child, {
    timeoutMs: 30,
    kill: (signal) => runtime.child.kill(signal),
  });
  assert.deepEqual(killCalls, ['SIGTERM']);
});

test('stop timeout escalates to SIGKILL for stubborn runtime child', async () => {
  const runtime = createFakeRuntimeProcess();
  const killCalls = [];
  runtime.child.kill = (signal) => {
    killCalls.push(signal);
    if (signal === 'SIGKILL') {
      runtime.exit(0);
    }
  };

  await stopChildBounded(runtime.child, {
    timeoutMs: 30,
    kill: (signal) => runtime.child.kill(signal),
  });
  assert.deepEqual(killCalls, ['SIGTERM', 'SIGKILL']);
});

test('stopChildBounded rejects when SIGKILL does not end the child', async () => {
  const stubborn = createStubbornRuntimeProcess();
  await assert.rejects(
    () =>
      stopChildBounded(stubborn.child, {
        timeoutMs: 20,
        kill: (signal) => stubborn.child.kill(signal),
      }),
    /child_stop_timeout/,
  );
  assert.deepEqual(stubborn.kills, ['SIGTERM', 'SIGKILL']);
});

test('supervisor fails closed when old runtime ignores stop signals', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-stubborn-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs } = seedWorkspace(root, entryRel);
  writeFileSync(
    entryAbs,
    `import { pathToFileURL } from 'node:url';\nawait import(pathToFileURL(${JSON.stringify(ENTRY_FIXTURE)}).href);\n`,
    'utf8',
  );

  let supervisorExitCode = 0;
  const fake = createFakeCompilerProcess();
  let runtimeSpawns = 0;
  const stubborn = createStubbornRuntimeProcess();
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-10',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    childStopTimeoutMs: 25,
    spawnCompiler: () => fake.child,
    spawnRuntime: () => {
      runtimeSpawns += 1;
      return runtimeSpawns === 1
        ? stubborn.child
        : createFakeRuntimeProcess().child;
    },
    onSupervisorExit: (code) => {
      supervisorExitCode = code;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  assert.equal(runtimeSpawns, 1);

  fake.pushStdout('File change detected. Starting incremental compilation.\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));

  assert.equal(runtimeSpawns, 1);
  assert.equal(supervisorExitCode, 1);
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.equal(desired.ready, false);
  assert.equal(desired.phase, 'compile_error');
  assert.equal(existsSync(join(receiptRoot, 'api.loaded.json')), false);
  assert.deepEqual(stubborn.kills.slice(0, 2), ['SIGTERM', 'SIGKILL']);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('runtime process death clears loaded and exits supervisor', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-death-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs } = seedWorkspace(root, entryRel);
  writeFileSync(
    entryAbs,
    `import { pathToFileURL } from 'node:url';\nawait import(pathToFileURL(${JSON.stringify(ENTRY_FIXTURE)}).href);\n`,
    'utf8',
  );

  let supervisorExitCode = 0;
  const fake = createFakeCompilerProcess();
  const runtime = createFakeRuntimeProcess();
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-6',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    spawnCompiler: () => fake.child,
    spawnRuntime: () => runtime.child,
    onSupervisorExit: (code) => {
      supervisorExitCode = code;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: 'offscreen.dev-loaded-runtime.v2',
      role: 'api',
      pid: 4242,
      startedAt: new Date().toISOString(),
      generationId: '11111111-1111-4111-8111-111111111111',
      compiledModulePath: entryAbs,
      compiledModuleIdentity: 'abc',
      environmentId: 'dev-6',
    })}\n`,
  );
  runtime.exit(1);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  assert.equal(supervisorExitCode, 1);
  assert.equal(existsSync(join(receiptRoot, 'api.loaded.json')), false);
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('recovery after compile error starts runtime on next success while keeping prior child', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-recover-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs } = seedWorkspace(root, entryRel);
  writeFileSync(
    entryAbs,
    `import { pathToFileURL } from 'node:url';\nawait import(pathToFileURL(${JSON.stringify(ENTRY_FIXTURE)}).href);\n`,
    'utf8',
  );

  const fake = createFakeCompilerProcess();
  const runtimeStarts = [];
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-7',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    spawnCompiler: () => fake.child,
    spawnRuntime: (argv) => {
      runtimeStarts.push(argv);
      return createFakeRuntimeProcess().child;
    },
  });

  supervisor.start();
  fake.pushStdout('Starting compilation in watch mode...\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  const firstRuntime = supervisor.runtimeChild;
  assert.ok(firstRuntime);

  fake.pushStdout('File change detected. Starting incremental compilation.\n');
  fake.pushStdout('Found 1 error. Watching for file changes.\n');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  assert.equal(supervisor.runtimeChild, firstRuntime);

  fake.pushStdout('File change detected. Starting incremental compilation.\n');
  fake.pushStdout(compileSuccessLine());
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  assert.equal(runtimeStarts.length, 2);
  assert.notEqual(supervisor.runtimeChild, firstRuntime);
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('only one runtime child is active across successive successes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-single-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs } = seedWorkspace(root, entryRel);
  writeFileSync(
    entryAbs,
    `import { pathToFileURL } from 'node:url';\nawait import(pathToFileURL(${JSON.stringify(ENTRY_FIXTURE)}).href);\n`,
    'utf8',
  );

  const fake = createFakeCompilerProcess();
  const active = new Set();
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-8',
    launchLoadedPath: LAUNCH_LOADED_PATH,
    childStopTimeoutMs: 50,
    spawnCompiler: () => fake.child,
    spawnRuntime: () => {
      const child = createFakeRuntimeProcess().child;
      active.add(child);
      child.on('exit', () => active.delete(child));
      return child;
    },
  });

  supervisor.start();
  for (let i = 0; i < 3; i += 1) {
    fake.pushStdout(
      'File change detected. Starting incremental compilation.\n',
    );
    fake.pushStdout(compileSuccessLine());
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
    assert.equal(active.size <= 1, true);
  }
  await supervisor.dispose(0);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('compiler exit marks desired not ready and stops runtime child', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-compile-compiler-exit-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  seedWorkspace(root, entryRel);

  const fake = createFakeCompilerProcess();
  const runtime = createFakeRuntimeProcess();
  let supervisorExitCode = 0;
  const supervisor = createCompileWatchSupervisor({
    role: 'api',
    entry: entryRel,
    cwd: root,
    environmentId: 'dev-9',
    spawnCompiler: () => fake.child,
    spawnRuntime: () => runtime.child,
    onSupervisorExit: (code) => {
      supervisorExitCode = code;
    },
  });

  supervisor.start();
  fake.end(1);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  assert.equal(supervisorExitCode, 1);
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.equal(desired.ready, false);
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('waitForChildExit resolves immediately for already-exited child', async () => {
  const child = createFakeRuntimeProcess();
  child.exit(0);
  const code = await waitForChildExit(child.child, 10);
  assert.equal(code, 0);
});
