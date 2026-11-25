#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearDevLoadedRuntimeReceipt,
  devRuntimeReceiptRoot,
  fingerprintCompiledTree,
  markDevWatchedCompilation,
  resolveCompiledDistRoot,
} from './generation.mjs';

const LAUNCH_LOADED_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'launch-loaded.mjs',
);

const TSC_WATCH_STAMP = /^(?:\d{1,2}:\d{2}:\d{2} [AP]M - )?/;
const COMPILER_START_RE = new RegExp(
  TSC_WATCH_STAMP.source + 'Starting compilation in watch mode',
);
const COMPILER_INCREMENTAL_RE = new RegExp(
  TSC_WATCH_STAMP.source +
    'File change detected\\. Starting incremental compilation',
);
const COMPILER_COMPLETE_RE = new RegExp(
  TSC_WATCH_STAMP.source +
    'Found (\\d+) errors?\\. Watching for file changes\\.',
);

const CHILD_STOP_TIMEOUT_MS = 10_000;

const COMPILE_WATCH_MODULE_PATH = fileURLToPath(import.meta.url);
const COMPILE_WATCH_INVOKED_AS_MAIN =
  process.argv[1] && resolve(process.argv[1]) === COMPILE_WATCH_MODULE_PATH;

/**
 * @param {(line: string) => void} onLine
 */
export function createLineBuffer(onLine) {
  /** @type {string} */
  let pending = '';

  return {
    /**
     * @param {Buffer | string} chunk
     */
    push(chunk) {
      pending += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      let newlineAt = pending.indexOf('\n');
      while (newlineAt !== -1) {
        let line = pending.slice(0, newlineAt);
        pending = pending.slice(newlineAt + 1);
        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }
        onLine(line);
        newlineAt = pending.indexOf('\n');
      }
    },
    flush() {
      if (pending.length > 0) {
        let line = pending;
        pending = '';
        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }
        onLine(line);
      }
    },
  };
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} timeoutMs
 */
export function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(child.exitCode ?? 1);
  }
  return new Promise((resolvePromise, rejectPromise) => {
    /** @type {NodeJS.Timeout | undefined} */
    let timer;
    const finish = (code) => {
      if (timer) clearTimeout(timer);
      resolvePromise(code ?? 1);
    };
    child.once('exit', (code) => finish(code));
    timer = setTimeout(() => {
      rejectPromise(new Error('child_stop_timeout'));
    }, timeoutMs);
  });
}

/**
 * @param {import('node:child_process').ChildProcess | null | undefined} child
 * @param {{ timeoutMs?: number, kill?: (signal: string) => void }} [options]
 */
export async function stopChildBounded(child, options = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const timeoutMs = options.timeoutMs ?? CHILD_STOP_TIMEOUT_MS;
  const kill =
    options.kill ??
    ((signal) => {
      child.kill(signal);
    });
  kill('SIGTERM');
  try {
    await waitForChildExit(child, timeoutMs);
  } catch {
    kill('SIGKILL');
    await waitForChildExit(child, timeoutMs);
  }
}

/**
 * @typedef {{
 *   role: string,
 *   entry: string,
 *   project?: string,
 *   cwd?: string,
 *   environmentId?: string,
 *   launchLoadedPath?: string,
 *   spawnCompiler?: (args: string[]) => import('node:child_process').ChildProcessWithoutNullStreams,
 *   spawnRuntime?: (argv: string[]) => import('node:child_process').ChildProcess,
 *   childStopTimeoutMs?: number,
 *   onStdout?: (chunk: Buffer | string) => void,
 *   onSupervisorExit?: (code: number) => void,
 * }} CompileWatchOptions
 */

/**
 * @param {CompileWatchOptions} options
 */
export function createCompileWatchSupervisor(options) {
  const cwd = options.cwd ?? process.cwd();
  const environmentId =
    options.environmentId ??
    process.env.OFFSCREEN_DEV_SLOT?.trim() ??
    undefined;
  const receiptRoot = devRuntimeReceiptRoot(cwd);
  const launchLoadedPath = options.launchLoadedPath ?? LAUNCH_LOADED_PATH;
  const childStopTimeoutMs =
    options.childStopTimeoutMs ?? CHILD_STOP_TIMEOUT_MS;

  const tscArgs = ['exec', 'tsc', '--pretty', 'false', '--noEmitOnError'];
  if (options.project) {
    tscArgs.push('-p', options.project);
  }
  tscArgs.push('--watch', '--preserveWatchOutput');

  /** @type {import('node:child_process').ChildProcess | null} */
  let compilerChild = null;
  /** @type {import('node:child_process').ChildProcess | null} */
  let runtimeChild = null;
  let compileToken = 0;
  /** @type {Promise<void>} */
  let transitionQueue = Promise.resolve();
  let disposed = false;
  let transitionFailureHandled = false;
  let supervisorExitCode = 0;
  let intentionalRuntimeStop = false;

  const spawnCompiler =
    options.spawnCompiler ??
    (() =>
      spawn(process.execPath, [createRequire(join(cwd, 'package.json')).resolve('typescript/bin/tsc'), ...tscArgs.slice(2)], {
        cwd,
        stdio: ['ignore', 'pipe', 'inherit'],
        env: process.env,
      }));

  const spawnRuntime =
    options.spawnRuntime ??
    ((argv) =>
      spawn(process.execPath, argv, {
        cwd,
        stdio: 'inherit',
        env: process.env,
      }));

  function markCompiling() {
    markDevWatchedCompilation({
      phase: 'compiling',
      role: options.role,
      cwd,
      environmentId,
    });
  }

  function markCompileError() {
    markDevWatchedCompilation({
      phase: 'failure',
      role: options.role,
      compiledEntryPath: options.entry,
      cwd,
      environmentId,
    });
  }

  function desiredReceiptPath() {
    return join(receiptRoot, `${options.role}.desired.json`);
  }

  function readDesiredSuccess() {
    const raw = readFileSync(desiredReceiptPath(), 'utf8');
    const record = JSON.parse(raw);
    return /** @type {{ generationId: string, compiledModuleIdentity: string }} */ (
      record
    );
  }

  /**
   * @param {number} [code]
   * @param {{ markCompilerFailure?: boolean }} [shutdownOptions]
   */
  async function shutdownSupervisor(code, shutdownOptions = {}) {
    if (disposed) {
      return;
    }
    disposed = true;
    compileToken += 1;
    if (shutdownOptions.markCompilerFailure) {
      markDevWatchedCompilation({
        phase: 'failure',
        role: options.role,
        compiledEntryPath: options.entry,
        cwd,
        environmentId,
      });
    }
    await Promise.allSettled([
      stopChildBounded(compilerChild, { timeoutMs: childStopTimeoutMs }),
      stopChildBounded(runtimeChild, { timeoutMs: childStopTimeoutMs }),
    ]);
    compilerChild = null;
    runtimeChild = null;
    const exitCode = code ?? supervisorExitCode;
    if (options.onSupervisorExit) {
      options.onSupervisorExit(exitCode);
      return;
    }
    if (exitCode !== 0 && COMPILE_WATCH_INVOKED_AS_MAIN) {
      process.exit(exitCode);
    }
  }

  async function handleTransitionFailure() {
    if (transitionFailureHandled || disposed) {
      return;
    }
    transitionFailureHandled = true;
    markCompileError();
    clearDevLoadedRuntimeReceipt({ role: options.role, cwd });
    supervisorExitCode = 1;
    await shutdownSupervisor(1);
  }

  /**
   * @param {number} token
   */
  function enqueueSuccessTransition(token) {
    transitionQueue = transitionQueue
      .then(async () => {
        if (token !== compileToken || disposed) {
          return;
        }
        const distRoot = resolveCompiledDistRoot(cwd, options.entry);
        fingerprintCompiledTree(distRoot);

        const stopping = runtimeChild;
        intentionalRuntimeStop = true;
        try {
          await stopChildBounded(stopping, { timeoutMs: childStopTimeoutMs });
        } finally {
          intentionalRuntimeStop = false;
        }
        if (token !== compileToken || disposed) {
          return;
        }
        if (runtimeChild === stopping) {
          runtimeChild = null;
        }

        markDevWatchedCompilation({
          phase: 'success',
          role: options.role,
          compiledEntryPath: options.entry,
          cwd,
          environmentId,
          compiledDistRoot: distRoot,
        });

        if (token !== compileToken || disposed) {
          return;
        }

        const desired = readDesiredSuccess();
        const runtimeArgv = [
          launchLoadedPath,
          options.role,
          options.entry,
          desired.generationId,
          desired.compiledModuleIdentity,
        ];
        const child = spawnRuntime(runtimeArgv);
        runtimeChild = child;
        child.on('exit', () => {
          if (intentionalRuntimeStop || disposed || runtimeChild !== child) {
            return;
          }
          runtimeChild = null;
          clearDevLoadedRuntimeReceipt({ role: options.role, cwd });
          supervisorExitCode = 1;
          void shutdownSupervisor(1);
        });
      })
      .catch((error) => handleTransitionFailure(error));
  }

  /**
   * @param {string} line
   */
  function handleCompilerLine(line) {
    if (COMPILER_START_RE.test(line) || COMPILER_INCREMENTAL_RE.test(line)) {
      compileToken += 1;
      markCompiling();
      return;
    }
    const complete = COMPILER_COMPLETE_RE.exec(line);
    if (!complete) {
      return;
    }
    const errorCount = Number(complete[1]);
    const token = compileToken;
    if (errorCount > 0) {
      markCompileError();
      return;
    }
    enqueueSuccessTransition(token);
  }

  const lineBuffer = createLineBuffer(handleCompilerLine);

  /**
   * @param {number} [code]
   */
  async function dispose(code) {
    await shutdownSupervisor(code);
  }

  function start() {
    compilerChild = spawnCompiler(tscArgs);
    compilerChild.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      options.onStdout?.(chunk);
      lineBuffer.push(chunk);
    });
    compilerChild.on('exit', (code) => {
      if (disposed) {
        return;
      }
      void shutdownSupervisor(code ?? 1, { markCompilerFailure: true });
    });
  }

  function handleSignal() {
    void shutdownSupervisor(supervisorExitCode);
  }

  return {
    start,
    dispose,
    handleCompilerLine,
    get compileToken() {
      return compileToken;
    },
    get runtimeChild() {
      return runtimeChild;
    },
    get compilerChild() {
      return compilerChild;
    },
    registerSignalHandlers() {
      process.once('SIGINT', handleSignal);
      process.once('SIGTERM', handleSignal);
    },
  };
}

if (COMPILE_WATCH_INVOKED_AS_MAIN) {
  const [role, entry, project] = process.argv.slice(2);
  if (!role || !entry) {
    process.stderr.write(
      'usage: compile-watch.mjs <role> <entry> [tsconfig]\n',
    );
    process.exit(1);
  }
  const supervisor = createCompileWatchSupervisor({ role, entry, project });
  supervisor.registerSignalHandlers();
  supervisor.start();
}
