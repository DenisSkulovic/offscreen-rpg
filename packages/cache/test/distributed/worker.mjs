import process from 'node:process';
import { setImmediate } from 'node:timers';
import { setTimeout } from 'node:timers/promises';

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

/**
 * @param {ReturnType<typeof snapshotStats>} before
 */
function diffStats(before) {
  const after = snapshotStats();
  /** @type {Record<string, number>} */
  const telemetry = {};
  for (const key of new Set([
    ...Object.keys(before.telemetry),
    ...Object.keys(after.telemetry),
  ])) {
    const delta = (after.telemetry[key] ?? 0) - (before.telemetry[key] ?? 0);
    if (delta !== 0) {
      telemetry[key] = delta;
    }
  }
  return {
    originLoads: after.originLoads - before.originLoads,
    activeOrigin: after.activeOrigin - before.activeOrigin,
    peakOrigin: after.peakOrigin - before.peakOrigin,
    telemetry,
    final: after,
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
 * @param {{ delayMs?: number; failWith?: string }} opts
 */
async function runOrigin(identity, opts = {}) {
  activeOrigin += 1;
  peakOrigin = Math.max(peakOrigin, activeOrigin);
  originLoads += 1;
  const delayMs = opts.delayMs ?? 0;
  if (delayMs > 0) {
    await setTimeout(delayMs);
  }
  if (opts.failWith) {
    activeOrigin -= 1;
    const error = new Error(opts.failWith);
    error.name = opts.failWith;
    throw error;
  }
  const [id, revision] = identity;
  activeOrigin -= 1;
  return {
    value: { id, revision },
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

/** @typedef {'ok' | 'worker-not-initialized' | 'unknown-command' | 'origin-failed' | 'internal'} WorkerOutcome */

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
        const stats = snapshotStats();
        return {
          requestId,
          ok: true,
          outcome: /** @type {WorkerOutcome} */ ('ok'),
          enabled: adapter?.enabled ?? false,
          stats,
          statsDelta: stats,
        };
      }
      case 'read': {
        if (!bound) {
          return {
            requestId,
            ok: false,
            outcome: /** @type {WorkerOutcome} */ ('worker-not-initialized'),
          };
        }
        const identity = /** @type {readonly string[]} */ (msg.identity ?? []);
        const before = snapshotStats();
        const start = Date.now();
        const value = await bound.getOrLoad(identity, () =>
          runOrigin(identity, {
            delayMs: Number(msg.delayMs ?? 0),
            failWith:
              typeof msg.failWith === 'string' ? msg.failWith : undefined,
          }),
        );
        const delta = diffStats(before);
        return {
          requestId,
          ok: true,
          outcome: /** @type {WorkerOutcome} */ ('ok'),
          value,
          durationMs: Math.max(0, Date.now() - start),
          ...delta.final,
          stats: delta.final,
          statsDelta: {
            originLoads: delta.originLoads,
            activeOrigin: delta.activeOrigin,
            peakOrigin: delta.peakOrigin,
            telemetry: delta.telemetry,
          },
        };
      }
      case 'burst': {
        if (!bound) {
          return {
            requestId,
            ok: false,
            outcome: /** @type {WorkerOutcome} */ ('worker-not-initialized'),
          };
        }
        const count = Math.min(64, Math.max(1, Number(msg.count ?? 1)));
        const sameKey = Boolean(msg.sameKey);
        const baseIdentity = /** @type {readonly string[]} */ (
          msg.identity ?? ['burst', '1']
        );
        const before = snapshotStats();
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
        const delta = diffStats(before);
        return {
          requestId,
          ok: true,
          outcome: /** @type {WorkerOutcome} */ ('ok'),
          values,
          durationMs: Math.max(0, Date.now() - start),
          ...delta.final,
          stats: delta.final,
          statsDelta: {
            originLoads: delta.originLoads,
            activeOrigin: delta.activeOrigin,
            peakOrigin: delta.peakOrigin,
            telemetry: delta.telemetry,
          },
        };
      }
      case 'reset-stats': {
        resetOriginStats();
        const stats = snapshotStats();
        return {
          requestId,
          ok: true,
          outcome: /** @type {WorkerOutcome} */ ('ok'),
          stats,
          statsDelta: stats,
        };
      }
      case 'close': {
        if (adapter) {
          await adapter.close();
        }
        adapter = null;
        bound = null;
        definition = null;
        const stats = snapshotStats();
        setImmediate(() => {
          process.exit(0);
        });
        return {
          requestId,
          ok: true,
          outcome: /** @type {WorkerOutcome} */ ('ok'),
          closed: true,
          stats,
          statsDelta: stats,
        };
      }
      default:
        return {
          requestId,
          ok: false,
          outcome: /** @type {WorkerOutcome} */ ('unknown-command'),
        };
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const outcome =
      name === 'SyntheticOriginFailure'
        ? /** @type {WorkerOutcome} */ ('origin-failed')
        : /** @type {WorkerOutcome} */ ('internal');
    return {
      requestId,
      ok: false,
      outcome,
      stats: snapshotStats(),
    };
  }
}

if (process.send) {
  let chain = Promise.resolve();
  process.on('message', (msg) => {
    chain = chain
      .then(() => dispatch(/** @type {Record<string, unknown>} */ (msg)))
      .then((response) => {
        if (process.connected) {
          process.send?.(response);
        }
      })
      .catch(() => {
        if (process.connected) {
          process.send?.({
            requestId: String(
              /** @type {Record<string, unknown>} */ (msg).requestId ?? '',
            ),
            ok: false,
            outcome: 'internal',
          });
        }
      });
  });
}
