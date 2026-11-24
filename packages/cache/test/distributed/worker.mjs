import { createCacheAdapter } from '@offscreen/cache';
import { defineCache } from '@offscreen/cache/core';
import { jsonCodec } from '@offscreen/cache/codecs';
import { bindCache } from '@offscreen/cache/strategies';

/** @typedef {{ id: string; revision: string }} SyntheticValue */

/**
 * @param {unknown} raw
 * @returns {SyntheticValue}
 */
export function parseSyntheticValue(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('SyntheticValueInvalid');
  }
  const { id, revision } = /** @type {{ id?: unknown; revision?: unknown }} */ (
    raw
  );
  if (typeof id !== 'string' || typeof revision !== 'string') {
    throw new Error('SyntheticValueInvalid');
  }
  if (id.length === 0 || revision.length === 0) {
    throw new Error('SyntheticValueInvalid');
  }
  return { id, revision };
}

/** @type {ReturnType<typeof defineCache<SyntheticValue>> | null} */
let definition = null;

/** @type {ReturnType<typeof bindCache<SyntheticValue>> | null} */
let bound = null;

/** @type {import('@offscreen/cache').CacheAdapter | null} */
let adapter = null;

let environment = '';
let originLoads = 0;
let activeOrigin = 0;
let peakOrigin = 0;

/** @type {Record<string, number>} */
const telemetryCounts = {};

/**
 * @param {Parameters<import('@offscreen/cache/core').CacheTelemetry>[0]} event
 */
function telemetrySink(event) {
  const key = `${event.tier}:${event.operation}:${event.outcome}`;
  telemetryCounts[key] = (telemetryCounts[key] ?? 0) + 1;
}

function snapshotStats() {
  return {
    originLoads,
    activeOrigin,
    peakOrigin,
    telemetry: { ...telemetryCounts },
  };
}

function resetOriginStats() {
  originLoads = 0;
  activeOrigin = 0;
  peakOrigin = 0;
  for (const key of Object.keys(telemetryCounts)) {
    delete telemetryCounts[key];
  }
}

/**
 * @param {readonly string[]} identity
 * @param {{ delayMs?: number; failWith?: string; padBytes?: number }} opts
 */
async function runOrigin(identity, opts = {}) {
  activeOrigin += 1;
  peakOrigin = Math.max(peakOrigin, activeOrigin);
  originLoads += 1;
  const delayMs = opts.delayMs ?? 0;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (opts.failWith) {
    activeOrigin -= 1;
    const error = new Error(opts.failWith);
    error.name = opts.failWith;
    throw error;
  }
  const [id, revision] = identity;
  activeOrigin -= 1;
  const padBytes = Math.min(262_144, Math.max(0, opts.padBytes ?? 0));
  return {
    value: {
      id,
      revision,
      ...(padBytes > 0 ? { pad: 'x'.repeat(padBytes) } : {}),
    },
    identity,
    observedAtMs: Date.now(),
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} envName
 * @param {boolean} disabled
 */
async function handleInit(env, envName, disabled) {
  if (adapter) {
    await adapter.close();
  }
  adapter = null;
  bound = null;
  definition = null;
  resetOriginStats();

  environment = envName;
  definition = defineCache({
    namespace: 'cache07-proof',
    version: 1,
    consistency: 'immutable',
    codec: jsonCodec(parseSyntheticValue),
    policy: {
      ttlMs: 30_000,
      jitterRatio: 0,
      maxEntryBytes: 262_144,
      maxActiveKeys: 16,
      maxWaitersPerKey: 32,
      originConcurrency: 4,
      originQueueLimit: 16,
      originQueueTimeoutMs: 200,
    },
  });

  const redisEnv = disabled ? {} : env;
  adapter = await createCacheAdapter(redisEnv);
  const random = () => 0;
  bound = bindCache(definition, {
    store: adapter.store,
    environment,
    random,
    telemetry: telemetrySink,
  });
}

/**
 * One dispatcher per child. Pending RPCs share that listener so request
 * volume cannot accumulate process listeners.
 *
 * @typedef {{
 *   pending: Map<string, { timer: ReturnType<typeof setTimeout>, resolve: (value: Record<string, unknown>) => void, reject: (error: Error) => void }>,
 *   terminal: boolean,
 * }} WorkerSession
 */

/** @type {WeakMap<object, WorkerSession>} */
const workerSessions = new WeakMap();

/**
 * @param {import('node:child_process').ChildProcess} proc
 */
export function pendingRequestCount(proc) {
  return workerSessions.get(proc)?.pending.size ?? 0;
}

/**
 * @param {import('node:child_process').ChildProcess} proc
 * @param {WorkerSession} session
 * @param {string} requestId
 * @param {Error | null} error
 * @param {Record<string, unknown> | null} value
 */
function settleRequest(proc, session, requestId, error, value) {
  const entry = session.pending.get(requestId);
  if (!entry) {
    return false;
  }
  clearTimeout(entry.timer);
  session.pending.delete(requestId);
  if (error) {
    entry.reject(error);
  } else {
    entry.resolve(/** @type {Record<string, unknown>} */ (value));
  }
  return true;
}

/**
 * @param {WorkerSession} session
 * @param {Error} error
 */
function rejectOutstanding(session, error) {
  if (session.terminal) {
    return;
  }
  session.terminal = true;
  for (const requestId of [...session.pending.keys()]) {
    settleRequest(/** @type {import('node:child_process').ChildProcess} */ ({}), session, requestId, error, null);
  }
}

/**
 * @param {import('node:child_process').ChildProcess} proc
 * @returns {WorkerSession}
 */
function sessionFor(proc) {
  const existing = workerSessions.get(proc);
  if (existing) {
    return existing;
  }
  /** @type {WorkerSession} */
  const session = { pending: new Map(), terminal: false };
  proc.on('message', (raw) => {
    const response = /** @type {Record<string, unknown>} */ (raw);
    const requestId = response?.requestId;
    if (typeof requestId !== 'string') {
      return;
    }
    const entry = session.pending.get(requestId);
    if (!entry) {
      return;
    }
    if (response.ok === false) {
      settleRequest(
        proc,
        session,
        requestId,
        new Error(String(response.error ?? 'WorkerRequestFailed')),
        null,
      );
      return;
    }
    settleRequest(proc, session, requestId, null, response);
  });
  const fail = (code) => {
    rejectOutstanding(session, new Error(code));
  };
  proc.once('exit', () => fail('WorkerExited'));
  proc.once('disconnect', () => fail('WorkerDisconnected'));
  workerSessions.set(proc, session);
  return session;
}

/**
 * @param {import('node:child_process').ChildProcess} proc
 * @param {Record<string, unknown>} message
 * @returns {Promise<Record<string, unknown>>}
 */
export function rpc(proc, message, timeoutMs = 15_000) {
  const session = sessionFor(proc);
  const requestId =
    typeof message.requestId === 'string'
      ? message.requestId
      : crypto.randomUUID();
  if (session.terminal || proc.connected === false) {
    return Promise.reject(new Error('WorkerExited'));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      settleRequest(proc, session, requestId, new Error('WorkerRequestTimeout'), null);
    }, timeoutMs);
    session.pending.set(requestId, { timer, resolve, reject });
    try {
      proc.send({ ...message, requestId });
    } catch (error) {
      settleRequest(
        proc,
        session,
        requestId,
        error instanceof Error ? error : new Error(String(error)),
        null,
      );
    }
  });
}

/**
 * @param {Record<string, unknown>} msg
 */
async function dispatch(msg) {
  const requestId = String(msg.requestId ?? '');
  const type = String(msg.type ?? '');

  try {
    switch (type) {
      case 'init': {
        const env = /** @type {Record<string, string | undefined>} */ (
          msg.env ?? {}
        );
        const envName = String(msg.environment ?? '');
        const disabled = Boolean(msg.disabled);
        await handleInit(env, envName, disabled);
        return {
          requestId,
          ok: true,
          enabled: adapter?.enabled ?? false,
          ...snapshotStats(),
        };
      }
      case 'read': {
        if (!bound) {
          throw new Error('WorkerNotInitialized');
        }
        const identity = /** @type {readonly string[]} */ (msg.identity ?? []);
        const start = Date.now();
        const value = await bound.getOrLoad(identity, () =>
          runOrigin(identity, {
            delayMs: Number(msg.delayMs ?? 0),
            padBytes: Number(msg.padBytes ?? 0),
            failWith:
              typeof msg.failWith === 'string' ? msg.failWith : undefined,
          }),
        );
        return {
          requestId,
          ok: true,
          outcome: 'ok',
          value,
          durationMs: Date.now() - start,
          ...snapshotStats(),
        };
      }
      case 'burst': {
        if (!bound) {
          throw new Error('WorkerNotInitialized');
        }
        const count = Math.min(64, Math.max(1, Number(msg.count ?? 1)));
        const sameKey = Boolean(msg.sameKey);
        const baseIdentity = /** @type {readonly string[]} */ (
          msg.identity ?? ['burst', '1']
        );
        const start = Date.now();
        const tasks = [];
        for (let i = 0; i < count; i += 1) {
          const identity = sameKey
            ? baseIdentity
            : /** @type {readonly string[]} */ ([`burst-${i}`, '1']);
          tasks.push(
            bound.getOrLoad(identity, () =>
              runOrigin(identity, {
                delayMs: Number(msg.delayMs ?? 0),
                failWith:
                  typeof msg.failWith === 'string' ? msg.failWith : undefined,
              }),
            ),
          );
        }
        const values = await Promise.all(tasks);
        return {
          requestId,
          ok: true,
          outcome: 'ok',
          values,
          durationMs: Date.now() - start,
          ...snapshotStats(),
        };
      }
      case 'reset-stats': {
        resetOriginStats();
        return { requestId, ok: true, ...snapshotStats() };
      }
      case 'close': {
        if (adapter) {
          await adapter.close();
        }
        adapter = null;
        bound = null;
        definition = null;
        return { requestId, ok: true, closed: true, ...snapshotStats() };
      }
      default:
        throw new Error(`UnknownWorkerCommand:${type}`);
    }
  } catch (error) {
    return {
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ...snapshotStats(),
    };
  }
}

if (process.send) {
  process.on('message', async (msg) => {
    const response = await dispatch(
      /** @type {Record<string, unknown>} */ (msg),
    );
    process.send?.(response);
  });
}