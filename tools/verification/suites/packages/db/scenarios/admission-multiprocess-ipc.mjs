import { fork } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import {
  clearInterval,
  clearTimeout,
  setInterval,
  setTimeout,
} from 'node:timers';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildPrivateChildEnv,
  MULTIPROCESS_CHILD_COUNT,
  SCENARIO_BUDGET_TIMEOUT_MS,
} from './admission-helpers.mjs';

const WORKER_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'admission-multiprocess-worker.mjs',
);

/**
 * @typedef {{
 *   childIndex: number,
 *   proc: import('node:child_process').ChildProcess,
 *   close: () => Promise<{ code: number | null, signal: NodeJS.Signals | null }>,
 * }} AdmissionChildHandle
 */

/**
 * @param {string} text
 */
export function stdoutLooksSafe(text) {
  const sample = String(text ?? '');
  return !/postgresql:\/\/[^@\s]+:[^@\s]+@/i.test(sample);
}

/**
 * @param {{
 *   childIndex: number,
 *   subjectEnv: Record<string, string>,
 *   workerPath?: string,
 *   mode?: 'live' | 'fixture',
 *   spawnChild?: typeof fork,
 * }} options
 * @returns {Promise<AdmissionChildHandle>}
 */
export async function spawnAdmissionWorker(options) {
  const spawnChild = options.spawnChild ?? fork;
  const workerPath = options.workerPath ?? WORKER_PATH;
  const childEnv = {
    ...buildPrivateChildEnv(options.subjectEnv),
    VERIFY_CHILD_INDEX: String(options.childIndex),
    VERIFY_WORKER_MODE: options.mode ?? 'live',
  };

  const argv = [workerPath];
  if (argv.some((part) => /postgresql:\/\/|password=/i.test(part))) {
    throw new Error('credentials-in-argv-refused');
  }

  const proc = spawnChild(workerPath, [], {
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    execArgv: [],
  });

  let stdout = '';
  let stderr = '';
  if (proc.stdout) {
    proc.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
  }
  if (proc.stderr) {
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
  }

  await waitForMessage(proc, (message) => message?.type === 'ready', 15_000);

  return {
    childIndex: options.childIndex,
    proc,
    stdout: () => stdout,
    stderr: () => stderr,
    close: () =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          proc.kill('SIGKILL');
        }, 10_000);
        proc.on('exit', (code, signal) => {
          clearTimeout(timer);
          resolve({ code, signal, stdout, stderr });
        });
        proc.kill('SIGTERM');
      }),
  };
}

/**
 * @param {import('node:child_process').ChildProcess} proc
 * @param {(message: unknown) => boolean} predicate
 * @param {number} timeoutMs
 */
function waitForMessage(proc, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + timeoutMs;
    /** @type {(message: unknown) => void} */
    const handler = (message) => {
      if (predicate(message)) {
        proc.off('message', handler);
        resolve(message);
      } else if (performance.now() > deadline) {
        proc.off('message', handler);
        reject(new Error('ipc-timeout'));
      }
    };
    proc.on('message', handler);
    const timer = setInterval(() => {
      if (performance.now() > deadline) {
        clearInterval(timer);
        proc.off('message', handler);
        reject(new Error('ipc-timeout'));
      }
    }, 25);
    proc.on('exit', (code) => {
      clearInterval(timer);
      proc.off('message', handler);
      reject(new Error(`child-exit-early:${code}`));
    });
  });
}

/**
 * @param {AdmissionChildHandle} handle
 */
async function awaitChildWorkloadResult(handle) {
  return waitForMessage(
    handle.proc,
    (message) => message?.type === 'result' || message?.type === 'error',
    SCENARIO_BUDGET_TIMEOUT_MS,
  );
}

/**
 * @param {{
 *   subjectEnv: Record<string, string>,
 *   childCount?: number,
 *   mode?: 'live' | 'fixture',
 *   spawnChild?: typeof fork,
 *   workerPath?: string,
 * }} options
 */
export async function runMultiprocessChildGroup(options) {
  const childCount = options.childCount ?? MULTIPROCESS_CHILD_COUNT;
  const started = performance.now();
  /** @type {AdmissionChildHandle[]} */
  const handles = [];
  /** @type {unknown[]} */
  const results = [];

  try {
    for (let index = 0; index < childCount; index += 1) {
      handles.push(
        await spawnAdmissionWorker({
          childIndex: index,
          subjectEnv: options.subjectEnv,
          mode: options.mode,
          spawnChild: options.spawnChild,
          workerPath: options.workerPath,
        }),
      );
    }

    for (const handle of handles) {
      handle.proc.send?.({ type: 'barrier' });
    }

    const workloadWaits = handles.map(async (handle) => {
      handle.proc.send?.({ type: 'init' });
      const message = await awaitChildWorkloadResult(handle);
      return message;
    });
    results.push(...(await Promise.all(workloadWaits)));

    const stdoutSafe = handles.every((handle) =>
      stdoutLooksSafe(handle.stdout?.() ?? ''),
    );
    const errors = results.filter((row) => row?.type === 'error');
    const resultRows = results.filter((row) => row?.type === 'result');

    return {
      status:
        errors.length === 0 &&
        resultRows.length === childCount &&
        resultRows.every((row) => row.status === 'PASS') &&
        stdoutSafe
          ? 'PASS'
          : 'FAIL',
      reason:
        errors.length || !stdoutSafe ? 'multiprocess-child-failure' : null,
      reasonCode: errors.length
        ? 'child-error'
        : stdoutSafe
          ? null
          : 'unsafe-stdout',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        childCount,
        results: resultRows,
        errors,
        stdoutSafe,
        noGlobalCapGuarantee: true,
      },
    };
  } finally {
    await Promise.all(handles.map((handle) => handle.close()));
  }
}

export { WORKER_PATH };
