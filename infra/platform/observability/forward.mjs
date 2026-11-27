import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
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

/** Public and internal port-forward allowlist. Grafana container port is 3000. */
export const FORWARD_ALLOWLIST = {
  developerHttp: {
    service: 'obs-collector',
    remote: 4328,
    local: 14318,
    targetPort: 4328,
    public: true,
  },
  developerGrpc: {
    service: 'obs-collector',
    remote: 4327,
    local: 14317,
    targetPort: 4327,
    public: true,
  },
  grafana: {
    service: 'obs-grafana',
    remote: 80,
    local: 13000,
    targetPort: 3000,
    public: true,
  },
  prometheus: {
    service: 'obs-prometheus',
    remote: 9090,
    local: 19090,
    targetPort: 9090,
    query: true,
  },
  loki: { service: 'obs-loki', remote: 3100, local: 13100, targetPort: 3100, query: true },
  tempo: { service: 'obs-tempo', remote: 3200, local: 13200, targetPort: 3200, query: true },
  diagnosticHttp: {
    service: 'obs-collector',
    remote: 4318,
    local: 0,
    targetPort: 4318,
    diagnostic: true,
  },
};

const FORWARD_LINE = /^Forwarding from 127\.0\.0\.1:(\d+) -> (\d+)$/;

function refuse(message) {
  const error = new Error(message);
  error.reasonCode = message;
  throw error;
}

/**
 * @param {number} port
 */
function precheckLoopback(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => {
      reject(error);
    });
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve());
    });
  });
}

/**
 * @param {object} identity
 * @param {{ fd?: number, fds?: number[], mode?: string, pending?: boolean }} held
 * @param {{
 *   bindings: { key: string, localPort?: number }[],
 *   deadline?: number | null,
 *   now?: () => number,
 *   signal?: AbortSignal,
 *   artifacts?: { targetPorts?: Record<string, number> },
 *   startChild?: typeof startOwnedChild,
 * }} options
 */
export async function openForwards(identity, held, options) {
  if (identity == null || typeof identity !== 'object') {
    refuse('refused: forward identity is missing');
  }
  if (held == null || !Number.isInteger(held.fd)) {
    refuse('refused: forward custody is missing');
  }
  const bindings = options.bindings;
  if (!Array.isArray(bindings) || bindings.length === 0) {
    refuse('refused: forward bindings are missing');
  }
  const seen = new Set();
  const locals = new Set();
  const planned = [];
  for (const binding of bindings) {
    const spec = FORWARD_ALLOWLIST[binding.key];
    if (!spec || seen.has(binding.key)) {
      refuse('refused: forward binding is not allowed');
    }
    seen.add(binding.key);
    if (spec.diagnostic && held.mode !== 'proof') {
      refuse('refused: diagnostic forward requires a proof lock');
    }
    if (!spec.diagnostic && held.mode === 'shared' && held.pending === true) {
      refuse('refused: shared forward requires a clear pending receipt');
    }
    const localPort = binding.localPort ?? spec.local;
    if (spec.diagnostic) {
      if (localPort !== 0) {
        refuse('refused: diagnostic forward must use an ephemeral port');
      }
    } else if (localPort !== spec.local) {
      refuse('refused: forward local port is fixed');
    }
    if (localPort !== 0) {
      if (locals.has(localPort)) {
        refuse('refused: forward local ports must be unique');
      }
      locals.add(localPort);
    }
    const authored = options.artifacts?.targetPorts?.[binding.key] ?? spec.targetPort;
    if (!Number.isInteger(authored) || authored < 1 || authored > 65535) {
      refuse('refused: forward target port is invalid');
    }
    planned.push({ key: binding.key, spec, localPort, targetPort: authored });
  }

  for (const item of planned) {
    if (item.localPort === 0) {
      continue;
    }
    try {
      await precheckLoopback(item.localPort);
    } catch {
      refuse('refused: forward local port is not free');
    }
  }

  const kubeconfig = identity.snapshotPath;
  const context = identity.tuple?.contextName ?? identity.contextName;
  const namespace = identity.tuple?.targetNamespace ?? identity.namespace;
  if (
    typeof kubeconfig !== 'string' ||
    typeof context !== 'string' ||
    typeof namespace !== 'string'
  ) {
    refuse('refused: forward identity is incomplete');
  }

  const startChild = options.startChild ?? startOwnedChild;
  const now = options.now ?? (() => performance.now());
  const deadline = options.deadline ?? now() + 90_000;
  /** @type {{ key: string, child: ReturnType<typeof startOwnedChild>, targetPort: number, localPort: number, ready: Promise<number> }[]} */
  const children = [];
  /** @type {(reason: string) => void} */
  let latchFailure = () => {};
  let latched = false;
  const failure = new Promise((resolve) => {
    latchFailure = (reason) => {
      if (latched) {
        return;
      }
      latched = true;
      resolve(reason);
    };
  });
  let closing = false;

  const stopAll = async () => {
    closing = true;
    return Promise.all(
      children.map(async (entry) => {
        entry.child.stop();
        return entry.child.closed;
      }),
    );
  };

  try {
    for (const item of planned) {
      const localArg =
        item.localPort === 0
          ? `:${item.spec.remote}`
          : `${item.localPort}:${item.spec.remote}`;
      const child = startChild(
        'kubectl',
        [
          '--kubeconfig',
          kubeconfig,
          '--context',
          context,
          '-n',
          namespace,
          'port-forward',
          '--address',
          '127.0.0.1',
          `service/${item.spec.service}`,
          localArg,
        ],
        {
          fds: [held.fd],
          deadline: null,
          foreground: true,
          now,
          signal: options.signal,
        },
      );
      let resolveReady = (_port) => {};
      let rejectReady = (_error) => {};
      const ready = new Promise((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      let announced = false;
      child.onOutput((text) => {
        const line = text.replace(/\r?\n$/, '');
        const match = FORWARD_LINE.exec(line);
        if (!match) {
          latchFailure('invalid-output');
          rejectReady(new Error('refused: forward output is invalid'));
          return;
        }
        const local = Number(match[1]);
        const remote = Number(match[2]);
        if (remote !== item.targetPort) {
          latchFailure('target-port');
          rejectReady(new Error('refused: forward target port mismatch'));
          return;
        }
        if (item.localPort !== 0 && local !== item.localPort) {
          latchFailure('local-port');
          rejectReady(new Error('refused: forward local port mismatch'));
          return;
        }
        if (announced) {
          latchFailure('duplicate-output');
          return;
        }
        announced = true;
        resolveReady(local);
      });
      child.outcome.then((result) => {
        if (closing) {
          return;
        }
        if (!announced || result.ok !== true) {
          latchFailure(result.cancelled ? 'cancelled' : 'child-exit');
          if (!announced) {
            rejectReady(new Error('refused: forward child closed before ready'));
          }
        }
      });
      children.push({ ...item, child, ready });
    }

    const ports = {};
    const readyAll = Promise.all(children.map((entry) => entry.ready));
    const expired = new Promise((_resolve, reject) => {
      const wait = Math.max(0, deadline - now());
      globalThis.setTimeout(() => reject(new Error('refused: forward startup expired')), wait);
    });
    const values = await Promise.race([
      readyAll,
      failure.then((reason) => Promise.reject(new Error(reason))),
      expired,
    ]);
    children.forEach((entry, index) => {
      ports[entry.key] = values[index];
    });
    return {
      ports,
      failure,
      async close() {
        const closed = await stopAll();
        const ok = closed.every(
          (result) => result?.closeUnconfirmed !== true && result?.timedOut !== true,
        );
        return { ok };
      },
    };
  } catch (error) {
    await stopAll();
    throw error;
  }
}

const RESPONSE_LIMIT = 64 * 1024;

/**
 * Transport-only probes. Does not claim a signal was accepted.
 *
 * @param {Record<string, number>} ports
 * @param {{
 *   deadline?: number,
 *   now?: () => number,
 *   signal?: AbortSignal,
 *   fetch?: typeof fetch,
 *   connect?: (port: number) => Promise<void>,
 *   grafanaAuth?: { user: string, password: string } | null,
 * }} options
 */
export async function probeForwardTransport(ports, options = {}) {
  const now = options.now ?? (() => Date.now());
  const deadline = options.deadline ?? now() + 10_000;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const remaining = () => Math.min(10_000, Math.max(0, deadline - now()));
  const read = async (url, init = {}) => {
    const budget = remaining();
    if (budget <= 0) {
      return { ok: false, reasonCode: 'deadline' };
    }
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), budget);
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    try {
      const response = await fetchImpl(url, {
        ...init,
        redirect: 'error',
        signal: controller.signal,
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > RESPONSE_LIMIT) {
        return { ok: false, reasonCode: 'response-limit' };
      }
      return { ok: response.ok, status: response.status, body: bytes.toString('utf8') };
    } catch {
      return { ok: false, reasonCode: 'transport' };
    } finally {
      globalThis.clearTimeout(timer);
    }
  };

  if (ports.developerHttp != null) {
    const traces = await read(`http://127.0.0.1:${ports.developerHttp}/v1/traces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"resourceSpans":[]}',
    });
    if (!traces.ok) {
      return { ok: false, reasonCode: 'developer-http' };
    }
  }
  if (ports.developerGrpc != null) {
    const connect = options.connect;
    if (typeof connect !== 'function') {
      return { ok: false, reasonCode: 'developer-grpc' };
    }
    try {
      await connect(ports.developerGrpc);
    } catch {
      return { ok: false, reasonCode: 'developer-grpc' };
    }
  }
  if (ports.grafana != null) {
    if (options.grafanaAuth == null) {
      return { ok: false, reasonCode: 'grafana-auth' };
    }
    const token = Buffer.from(
      `${options.grafanaAuth.user}:${options.grafanaAuth.password}`,
    ).toString('base64');
    const health = await read(`http://127.0.0.1:${ports.grafana}/api/health`, {
      headers: { authorization: `Basic ${token}` },
    });
    if (!health.ok) {
      return { ok: false, reasonCode: 'grafana' };
    }
    let parsed;
    try {
      parsed = JSON.parse(health.body);
    } catch {
      return { ok: false, reasonCode: 'grafana' };
    }
    if (parsed.database !== 'ok') {
      return { ok: false, reasonCode: 'grafana' };
    }
  }
  const queries = [
    ['prometheus', '/-/ready'],
    ['loki', '/ready'],
    ['tempo', '/ready'],
  ];
  for (const [key, path] of queries) {
    if (ports[key] == null) {
      continue;
    }
    const result = await read(`http://127.0.0.1:${ports[key]}${path}`);
    if (!result.ok || result.status !== 200) {
      return { ok: false, reasonCode: key };
    }
  }
  return { ok: true, reasonCode: 'transport' };
}
