import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { accessSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

const PYTHON = '/usr/bin/python3';
const WRAPPER = fileURLToPath(new URL('./exec-owned.py', import.meta.url));
const OUTPUT_LIMIT = 1_048_576;
const STDIN_LIMIT = 1_048_576;

const STRIPPED_ENV = [
  'KUBECONFIG',
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
  'DOCKER_TLS',
  'HELM_KUBEAPISERVER',
  'HELM_KUBETOKEN',
  'HELM_BEARER_TOKEN',
];

/**
 * @param {Record<string, string | undefined>} [overrides]
 */
export function ownedChildEnv(overrides = {}) {
  /** @type {Record<string, string>} */
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }
  for (const key of STRIPPED_ENV) {
    delete env[key];
  }
  for (const key of Object.keys(env)) {
    if (key.startsWith('HELM_KUBE')) {
      delete env[key];
    }
  }
  if (env.HELM_DRIVER != null && env.HELM_DRIVER !== 'secret') {
    delete env.HELM_DRIVER;
  }
  return env;
}

/**
 * @param {boolean} ok
 * @param {{
 *   stdout?: string,
 *   stderr?: string,
 *   stdoutBytes?: Buffer,
 *   stderrBytes?: Buffer,
 *   exitCode?: number | null,
 *   signal?: NodeJS.Signals | null,
 *   timedOut?: boolean,
 *   cancelled?: boolean,
 *   attempted?: boolean,
 *   closeUnconfirmed?: boolean,
 * }} [fields]
 */
export function ownedChildResult(ok, fields = {}) {
  return {
    ok,
    stdout: fields.stdout ?? '',
    stderr: fields.stderr ?? '',
    stdoutBytes: fields.stdoutBytes ?? Buffer.alloc(0),
    stderrBytes: fields.stderrBytes ?? Buffer.alloc(0),
    exitCode: fields.exitCode ?? null,
    signal: fields.signal ?? null,
    timedOut: fields.timedOut === true,
    cancelled: fields.cancelled === true,
    attempted: fields.attempted === true,
    closeUnconfirmed: fields.closeUnconfirmed === true,
  };
}

/**
 * @param {object} result
 */
function settledHandle(result) {
  const done = Promise.resolve(result);
  return {
    pid: null,
    closed: done,
    outcome: done,
    stop() {
      return done;
    },
    onOutput() {},
  };
}

/**
 * Direct owned child. Finite deadlines include termination grace.
 * `closed` resolves only after the process is observed gone; `outcome` can
 * become terminal earlier when close is not confirmed.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{
 *   fds?: number[],
 *   deadline?: number | null,
 *   now?: () => number,
 *   signal?: AbortSignal,
 *   stdoutLimit?: number,
 *   stderrLimit?: number,
 *   killGraceMs?: number,
 *   env?: Record<string, string | undefined>,
 *   input?: string | Buffer,
 *   foreground?: boolean,
 * }} options
 */
export function startOwnedChild(command, args, options = {}) {
  if (process.platform !== 'linux') {
    throw new Error(
      'refused: owned child requires Linux parent-death semantics',
    );
  }
  try {
    accessSync(PYTHON, constants.X_OK);
    accessSync(WRAPPER, constants.R_OK);
  } catch {
    throw new Error('refused: owned child wrapper is unavailable');
  }
  if (
    typeof command !== 'string' ||
    command.length === 0 ||
    command.includes('\0')
  ) {
    throw new Error('refused: owned child command is invalid');
  }
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
    throw new Error('refused: owned child arguments are invalid');
  }

  const now = options.now ?? (() => performance.now());
  const killGraceMs = options.killGraceMs ?? 5_000;
  if (!Number.isInteger(killGraceMs) || killGraceMs < 2) {
    throw new Error('refused: owned child kill grace is invalid');
  }
  const foreground = options.foreground === true;
  const deadline = options.deadline ?? null;
  if (deadline == null && !foreground) {
    throw new Error('refused: owned child deadline is required');
  }
  if (
    deadline != null &&
    (typeof deadline !== 'number' || !Number.isFinite(deadline))
  ) {
    throw new Error('refused: owned child deadline is invalid');
  }
  const stdoutLimit = options.stdoutLimit ?? OUTPUT_LIMIT;
  const stderrLimit = options.stderrLimit ?? OUTPUT_LIMIT;
  if (
    !Number.isInteger(stdoutLimit) ||
    !Number.isInteger(stderrLimit) ||
    stdoutLimit < 1 ||
    stderrLimit < 1
  ) {
    throw new Error('refused: owned child output limit is invalid');
  }

  const fds = options.fds ?? [];
  if (fds.some((fd) => !Number.isInteger(fd) || fd < 0)) {
    throw new Error('refused: owned child file descriptors are invalid');
  }

  /** @type {Buffer | undefined} */
  let input;
  if (options.input !== undefined) {
    if (typeof options.input === 'string') {
      input = Buffer.from(options.input, 'utf8');
    } else if (Buffer.isBuffer(options.input)) {
      input = options.input;
    } else {
      throw new Error('refused: owned child input must be a string or buffer');
    }
    if (input.length > STDIN_LIMIT) {
      throw new Error('refused: owned child input exceeds 1MiB');
    }
  }

  const started = now();
  if (
    options.signal?.aborted ||
    (deadline != null && deadline - started <= killGraceMs)
  ) {
    return settledHandle(
      ownedChildResult(false, {
        cancelled: options.signal?.aborted === true,
        timedOut: options.signal?.aborted !== true,
        attempted: false,
      }),
    );
  }

  const killLeadMs = Math.max(1, Math.floor(killGraceMs / 5));
  let cancelled = false;
  let timedOut = false;
  let overflow = false;
  let failed = false;
  let attempted = true;
  let stdinSettled = input === undefined;
  let processClosed = false;
  /** @type {{ code: number | null, signal: NodeJS.Signals | null } | null} */
  let pendingClose = null;
  /** @type {import('node:child_process').ChildProcess | null} */
  let child = null;
  let sawClose = false;
  /** @type {object | null} */
  let terminal = null;
  /** @type {ReturnType<typeof globalThis.setTimeout> | undefined} */
  let termTimer;
  /** @type {ReturnType<typeof globalThis.setTimeout> | undefined} */
  let killTimer;
  /** @type {ReturnType<typeof globalThis.setTimeout> | undefined} */
  let deadlineTimer;
  let deadlineAt = deadline;
  let stdoutBuf = Buffer.alloc(0);
  let stderrBuf = Buffer.alloc(0);
  let replay = '';
  let partial = '';
  /** @type {((line: string) => void)[]} */
  const listeners = [];

  /** @type {(value: object) => void} */
  let resolveOutcome = () => {};
  /** @type {(value: object) => void} */
  let resolveClosed = () => {};
  const outcome = new Promise((resolve) => {
    resolveOutcome = resolve;
  });
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });

  const publish = (result) => {
    if (terminal) {
      return;
    }
    terminal = result;
    resolveOutcome(result);
  };

  const clearTimers = () => {
    if (termTimer !== undefined) {
      globalThis.clearTimeout(termTimer);
    }
    if (killTimer !== undefined) {
      globalThis.clearTimeout(killTimer);
    }
    if (deadlineTimer !== undefined) {
      globalThis.clearTimeout(deadlineTimer);
    }
  };

  const safeKill = (signal) => {
    if (child == null || child.exitCode != null || processClosed || sawClose) {
      return;
    }
    try {
      child.kill(signal);
    } catch {
      // The process can exit between the check and the signal.
    }
  };

  const arm = (at) => {
    clearTimers();
    const current = now();
    termTimer = globalThis.setTimeout(
      () => {
        timedOut = timedOut || !cancelled;
        safeKill('SIGTERM');
      },
      Math.max(0, at - killGraceMs - current),
    );
    killTimer = globalThis.setTimeout(
      () => {
        safeKill('SIGKILL');
      },
      Math.max(0, at - killLeadMs - current),
    );
    deadlineTimer = globalThis.setTimeout(
      () => {
        if (processClosed || sawClose) {
          return;
        }
        publish(
          ownedChildResult(false, {
            stdout: stdoutBuf.toString('utf8'),
            stderr: stderrBuf.toString('utf8'),
            stdoutBytes: stdoutBuf,
            stderrBytes: stderrBuf,
            timedOut: !cancelled,
            cancelled,
            attempted: true,
            closeUnconfirmed: true,
          }),
        );
      },
      Math.max(0, at - current),
    );
  };

  const stop = () => {
    cancelled = true;
    const shortened = now() + killGraceMs;
    deadlineAt =
      deadlineAt == null ? shortened : Math.min(deadlineAt, shortened);
    arm(deadlineAt);
    safeKill('SIGTERM');
    return outcome;
  };

  const failAndStop = () => {
    failed = true;
    return stop();
  };

  const deliver = (listener, text) => {
    try {
      listener(text);
    } catch {
      failAndStop();
    }
  };

  const onOutput = (listener) => {
    listeners.push(listener);
    if (replay.length > 0) {
      deliver(listener, replay);
    }
  };

  const takeOutput = (chunk, which) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const limit = which === 'stdout' ? stdoutLimit : stderrLimit;
    const current = which === 'stdout' ? stdoutBuf : stderrBuf;
    const room = Math.max(0, limit - current.length);
    const next = Buffer.concat([current, bytes.subarray(0, room)]);
    if (which === 'stdout') {
      stdoutBuf = next;
      partial += bytes.subarray(0, room).toString('utf8');
      const lines = partial.split('\n');
      partial = lines.pop() ?? '';
      for (const line of lines) {
        const text = `${line}\n`;
        replay += text;
        for (const listener of listeners) {
          deliver(listener, text);
        }
      }
    } else {
      stderrBuf = next;
    }
    if (current.length + bytes.length > limit) {
      overflow = true;
      failAndStop();
    }
  };

  const stdio = /** @type {import('node:child_process').StdioOptions} */ ([
    input === undefined ? 'ignore' : 'pipe',
    'pipe',
    'pipe',
    ...fds,
  ]);

  try {
    child = spawn(
      PYTHON,
      [WRAPPER, String(process.pid), String(fds.length), command, ...args],
      {
        stdio,
        env: ownedChildEnv(options.env),
        shell: false,
        detached: false,
        windowsHide: true,
      },
    );
  } catch {
    const result = ownedChildResult(false, { attempted: true });
    resolveOutcome(result);
    resolveClosed(result);
    return {
      pid: null,
      closed,
      outcome,
      stop() {
        return outcome;
      },
      onOutput() {},
    };
  }

  if (deadlineAt != null) {
    arm(deadlineAt);
  }
  child.stdout?.on('data', (chunk) => {
    takeOutput(chunk, 'stdout');
  });
  child.stderr?.on('data', (chunk) => {
    takeOutput(chunk, 'stderr');
  });
  child.on('error', () => {
    failed = true;
  });
  const publishClose = () => {
    if (!pendingClose || !stdinSettled || sawClose) {
      return;
    }
    sawClose = true;
    clearTimers();
    const { code, signal } = pendingClose;
    const result =
      terminal ??
      ownedChildResult(
        code === 0 && !failed && !cancelled && !timedOut && !overflow,
        {
          stdout: stdoutBuf.toString('utf8'),
          stderr: stderrBuf.toString('utf8'),
          stdoutBytes: stdoutBuf,
          stderrBytes: stderrBuf,
          exitCode: code,
          signal,
          timedOut,
          cancelled,
          attempted,
          closeUnconfirmed: false,
        },
      );
    publish(result);
    resolveClosed(terminal ?? result);
  };
  if (input !== undefined && child.stdin) {
    child.stdin.on('error', () => {
      failed = true;
      stdinSettled = true;
      publishClose();
      if (!processClosed) {
        stop();
      }
    });
    child.stdin.on('finish', () => {
      stdinSettled = true;
      publishClose();
    });
    child.stdin.end(input);
  }
  if (options.signal) {
    if (options.signal.aborted) {
      stop();
    } else {
      options.signal.addEventListener(
        'abort',
        () => {
          stop();
        },
        { once: true },
      );
    }
  }
  child.on('close', (code, signal) => {
    processClosed = true;
    pendingClose = { code, signal: signal ?? null };
    publishClose();
  });

  return {
    pid: child.pid ?? null,
    closed,
    outcome,
    stop,
    onOutput,
  };
}
