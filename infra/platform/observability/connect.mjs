import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { acquireCustody, readPending } from './custody.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { captureIdentity, recheckIdentity, PREFLIGHT_BUDGET_MS } from './identity.mjs';
import { loadObservabilityVariants } from './artifacts.mjs';
import { collectInventory, GRAFANA_ADMIN_SECRET } from './inventory.mjs';
import { runPlatformCommand } from '../common/commands.mjs';
import { classifyInventory } from './readiness.mjs';
import {
  connectLoopback,
  openForwards,
  probeForwardTransport,
  readGrafanaAdmin,
} from './forward.mjs';

const PUBLIC_KEYS = ['developerHttp', 'developerGrpc', 'grafana'];
const QUERY_KEYS = ['prometheus', 'loki', 'tempo'];

/**
 * @param {string[]} argv
 */
export function parseConnectArgs(argv) {
  if (argv.length === 0) {
    return { queries: false };
  }
  if (argv.length === 1 && argv[0] === '--queries') {
    return { queries: true };
  }
  const error = new Error('refused: observability connect arguments are invalid');
  error.reasonCode = 'invalid-args';
  error.exitCode = 2;
  throw error;
}

/**
 * @param {object} identity
 * @param {object} variants
 * @param {object} deps
 */
function collectObserved(identity, variants, deps) {
  if (deps.collectInventory) {
    return deps.collectInventory(identity);
  }
  const now = deps.now ?? (() => Date.now());
  const snapshot = collectInventory(identity, variants.desired, {
    run: deps.run ?? runPlatformCommand,
    now,
    deadline: deps.deadline ?? now() + 120_000,
    stateRoot: deps.stateRoot,
    readPending:
      deps.readPending ??
      ((contextName) => readPending(contextName, { stateRoot: deps.stateRoot })),
  });
  snapshot.profileId = 'dev';
  return snapshot;
}

/**
 * @param {{
 *   argv?: string[],
 *   signal?: AbortSignal,
 *   readPlatformProfile?: typeof readPlatformProfile,
 *   acquireCustody?: typeof acquireCustody,
 *   captureIdentity?: typeof captureIdentity,
 *   recheckIdentity?: typeof recheckIdentity,
 *   loadObservabilityVariants?: typeof loadObservabilityVariants,
 *   classifyInventory?: typeof classifyInventory,
 *   readPending?: typeof readPending,
 *   collectInventory?: (identity: object) => Promise<object>,
 *   openForwards?: typeof openForwards,
 *   probeForwardTransport?: typeof probeForwardTransport,
 *   readGrafanaAdmin?: typeof readGrafanaAdmin,
 *   now?: () => number,
 *   intervalMs?: number,
 * }} [deps]
 */
export async function runObservabilityConnect(deps = {}) {
  let args;
  try {
    args = parseConnectArgs(deps.argv ?? []);
  } catch (error) {
    return { ok: false, reasonCode: error.reasonCode ?? 'invalid-args', ports: null, cleanup: null, exitCode: 2 };
  }
  const profile = (deps.readPlatformProfile ?? readPlatformProfile)('dev');
  const acquire = deps.acquireCustody ?? acquireCustody;
  const held = await acquire(profile.contextName, {
    mode: 'shared',
    signal: deps.signal,
    stateRoot: deps.stateRoot,
  });
  let identity;
  /** @type {{ close?: () => Promise<{ ok?: boolean }> } | null} */
  let opened = null;
  const releaseAttempt = async () => {
    let cleanup = { ok: true };
    if (opened?.close) {
      try {
        cleanup = (await opened.close()) ?? { ok: true };
      } catch {
        cleanup = { ok: false };
      }
      opened = null;
    }
    if (cleanup.ok === true && identity?.cleanup) {
      try {
        const cleaned = identity.cleanup();
        if (cleaned?.ok === false) {
          cleanup = { ok: false };
        }
      } catch {
        cleanup = { ok: false };
      }
    }
    if (cleanup.ok === true) {
      try {
        await held.close?.();
      } catch {
        cleanup = { ok: false };
      }
    }
    return cleanup;
  };
  try {
    identity = (deps.captureIdentity ?? captureIdentity)('dev', profile.contextName, {
      run: deps.run ?? runPlatformCommand,
      now: deps.now,
      deadline: deps.deadline,
    });
    const variants = (deps.loadObservabilityVariants ?? loadObservabilityVariants)('dev', deps);
    const snapshot = await collectObserved(identity, variants, deps);
    const classified = (deps.classifyInventory ?? classifyInventory)(snapshot, variants.desired, {
      predecessorArtifacts: variants.predecessor ?? null,
    });
    if (classified.reasonCode !== 'ready' || classified.pending === true || classified.state !== 'ready') {
      await releaseAttempt();
      return {
        ok: false,
        reasonCode: classified.reasonCode ?? 'not-ready',
        ports: null,
        cleanup: null,
        exitCode: 1,
      };
    }
    const checked = (deps.recheckIdentity ?? recheckIdentity)(identity, {
      run: deps.run ?? runPlatformCommand,
      now: deps.now,
      deadline: deps.deadline,
      expectedNamespaceUid: identity.tuple?.targetNamespaceUid,
    });
    if (!checked.ok) {
      await releaseAttempt();
      return { ok: false, reasonCode: 'identity', ports: null, cleanup: null, exitCode: 1 };
    }
    const bindings = [...PUBLIC_KEYS, ...(args.queries ? QUERY_KEYS : [])].map((key) => ({ key }));
    opened = await (deps.openForwards ?? openForwards)(
      identity,
      { ...held, mode: held.mode ?? 'shared', pending: false },
      {
        bindings,
        signal: deps.signal,
        now: deps.now,
        deadline: deps.deadline,
        artifacts: variants.desired,
      },
    );
    let grafanaAuth = null;
    if (opened.ports.grafana != null) {
      const expectedSecretUid =
        snapshot.objects?.[`Secret/${GRAFANA_ADMIN_SECRET}`]?.metadata?.uid ??
        snapshot.grafanaAdminUid;
      const readAdmin = deps.readGrafanaAdmin ?? readGrafanaAdmin;
      grafanaAuth = await readAdmin(identity, expectedSecretUid, deps);
    }
    const transport = await (deps.probeForwardTransport ?? probeForwardTransport)(opened.ports, {
      signal: deps.signal,
      now: deps.now,
      grafanaAuth,
      connect: deps.connect ?? connectLoopback,
    });
    if (!transport.ok) {
      const ports = opened.ports;
      const cleanup = await releaseAttempt();
      return { ok: false, reasonCode: transport.reasonCode, ports, cleanup, exitCode: 1 };
    }
    const connected = opened;
    opened = null;
    return {
      ok: true,
      reasonCode: 'connected',
      ports: connected.ports,
      cleanup: connected.close,
      exitCode: 0,
      held,
      identity,
      profileContext: profile.contextName,
      failure: connected.failure,
      endpoint: connected.detail?.endpoint ?? null,
      failureReason: connected.detail ?? null,
    };
  } catch (error) {
    await releaseAttempt();
    return {
      ok: false,
      reasonCode: error.reasonCode ?? 'connect',
      endpoint: error.endpoint ?? null,
      ports: null,
      cleanup: null,
      exitCode: error.exitCode ?? 1,
    };
  }
}

/**
 * @param {number} ms
 * @param {AbortSignal | undefined} signal
 */
const SAFE_REASON = /^[a-z][a-z0-9-]{0,40}$/;
const SAFE_ENDPOINT = /^[A-Za-z][A-Za-z0-9]{0,40}$/;

/**
 * One stderr line. Drops paths, credentials and free-form child output.
 *
 * @param {{ reasonCode?: string, endpoint?: string | null }} result
 */
export function formatConnectFailure(result) {
  const raw = String(result?.reasonCode ?? 'connect');
  const reason = SAFE_REASON.test(raw) ? raw : 'connect';
  const endpoint =
    typeof result?.endpoint === 'string' && SAFE_ENDPOINT.test(result.endpoint)
      ? result.endpoint
      : null;
  return endpoint == null ? `refused: ${reason}` : `refused: ${endpoint} ${reason}`;
}

function writeConnectFailure(result) {
  process.stderr.write(`${formatConnectFailure(result)}\n`);
}

/**
 * @param {Awaited<ReturnType<typeof runObservabilityConnect>>} session
 * @param {object} deps
 */
async function checkSession(session, deps) {
  const read = deps.readPending ?? ((contextName) => readPending(contextName, deps));
  const before = read(session.profileContext);
  if (before?.pending === true || before?.valid === false) {
    return { ok: false, reasonCode: 'pending' };
  }
  const now = deps.now ?? (() => Date.now());
  const recheck = (deps.recheckIdentity ?? recheckIdentity)(session.identity, {
    run: deps.run ?? runPlatformCommand,
    now,
    deadline: now() + PREFLIGHT_BUDGET_MS,
    expectedNamespaceUid: session.identity?.tuple?.targetNamespaceUid,
  });
  if (!recheck?.ok) {
    return { ok: false, reasonCode: 'identity' };
  }
  const after = read(session.profileContext);
  if (after?.pending === true || after?.valid === false) {
    return { ok: false, reasonCode: 'pending' };
  }
  return { ok: true };
}

/**
 * Foreground supervision. SIGINT with confirmed cleanup is exit 0.
 * SIGTERM, unexpected child exit, identity or pending change, and failed cleanup are exit 1.
 *
 * @param {Awaited<ReturnType<typeof runObservabilityConnect>>} session
 * @param {{
 *   signal?: AbortSignal,
 *   stopReason?: string | (() => string | null),
 *   intervalMs?: number,
 *   readPending?: typeof readPending,
 *   recheckIdentity?: typeof recheckIdentity,
 * }} [deps]
 */
export async function superviseObservabilityConnect(session, deps = {}) {
  if (!session?.ok) {
    return session?.exitCode ?? 1;
  }
  const intervalMs = deps.intervalMs ?? 30_000;
  const signal = deps.signal;
  /** @type {string | null} */
  let reason = null;
  /** @type {{ reasonCode: string, endpoint?: string | null }} */
  let reported = { reasonCode: 'connect' };
  while (reason == null) {
    /** @type {(() => void) | undefined} */
    let onAbort;
    const stop = new Promise((resolve) => {
      if (signal?.aborted) {
        resolve('stop');
        return;
      }
      onAbort = () => resolve('stop');
      signal?.addEventListener('abort', onAbort);
    });
    /** @type {ReturnType<typeof globalThis.setTimeout> | undefined} */
    let timer;
    const tick = new Promise((resolve) => {
      timer = globalThis.setTimeout(() => resolve('tick'), intervalMs);
    });
    const winner = await Promise.race([
      Promise.resolve(session.failure).then((value) => ({ kind: 'child', value })),
      stop.then(() => ({ kind: 'stop' })),
      tick.then(() => ({ kind: 'tick' })),
    ]);
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
    }
    if (onAbort) {
      signal?.removeEventListener('abort', onAbort);
    }
    if (winner.kind === 'child') {
      reason = 'child';
      const detail = session.failureReason;
      reported = {
        reasonCode: detail?.reason ?? 'child-exit',
        endpoint: detail?.endpoint ?? session.endpoint ?? null,
      };
      break;
    }
    if (winner.kind === 'stop' || signal?.aborted) {
      const named = typeof deps.stopReason === 'function' ? deps.stopReason() : deps.stopReason;
      reason = named === 'SIGTERM' ? 'SIGTERM' : 'SIGINT';
      reported = { reasonCode: reason === 'SIGTERM' ? 'sigterm' : 'sigint' };
      break;
    }
    const checked = await checkSession(session, deps);
    if (!checked.ok) {
      reason = checked.reasonCode ?? 'identity';
      reported = { reasonCode: reason };
      break;
    }
  }
  let cleanup = { ok: true };
  try {
    cleanup = (await session.cleanup?.()) ?? { ok: true };
  } catch {
    cleanup = { ok: false };
  }
  if (cleanup?.ok === true && typeof session.identity?.cleanup === 'function') {
    try {
      const cleaned = session.identity.cleanup();
      if (cleaned?.ok === false) {
        cleanup = { ok: false };
      }
    } catch {
      cleanup = { ok: false };
    }
  }
  if (cleanup?.ok === true) {
    try {
      await session.held?.close?.();
    } catch {
      cleanup = { ok: false };
    }
  }
  if (cleanup?.ok === false) {
    writeConnectFailure({ reasonCode: 'cleanup', endpoint: reported.endpoint });
    return 1;
  }
  if (reason !== 'SIGINT') {
    writeConnectFailure(reported);
    return 1;
  }
  return 0;
}

/**
 * @param {string[]} argv
 * @param {object} [deps]
 */
export async function main(argv = process.argv.slice(2), deps = {}) {
  const controller = new AbortController();
  const signal = deps.signal ?? controller.signal;
  const stop = { current: deps.stopReason ?? null };
  /** @type {[string, () => void][]} */
  const listeners = [];
  if (deps.bindProcessSignals !== false && deps.signal == null) {
    for (const name of ['SIGINT', 'SIGTERM']) {
      const handler = () => {
        stop.current = name;
        controller.abort();
      };
      process.on(name, handler);
      listeners.push([name, handler]);
    }
  }
  try {
    const result = await runObservabilityConnect({ ...deps, argv, signal });
    if (result.ok && result.ports) {
      for (const [key, port] of Object.entries(result.ports)) {
        process.stdout.write(`${key} 127.0.0.1:${port}\n`);
      }
    }
    if (!result.ok) {
      writeConnectFailure(result);
      return result.exitCode ?? 1;
    }
    return superviseObservabilityConnect(result, {
      ...deps,
      signal,
      stopReason: () => stop.current,
    });
  } finally {
    for (const [name, handler] of listeners) {
      process.off(name, handler);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => {
    process.exitCode = code;
  });
}
