import process from 'node:process';
import { URL } from 'node:url';
import {
  admissionErrorCategory,
  createHoldGate,
  MULTIPROCESS_OPS_PER_CHILD,
  MULTIPROCESS_POOL_MAX,
  MULTIPROCESS_QUEUED_PER_CHILD,
  MULTIPROCESS_REFUSALS_PER_CHILD,
  waitUntil,
} from './admission-helpers.mjs';

const childIndex = Number(process.env.VERIFY_CHILD_INDEX ?? '0');

/**
 * @param {import('node:child_process').ChildProcess} proc
 * @param {unknown} message
 */
function sendIpc(proc, message) {
  if (typeof proc.send === 'function') {
    proc.send(message);
  }
}

if (process.send) {
  let barrierOpen = false;

  process.on('message', async (message) => {
    if (!message || typeof message !== 'object') {
      process.send?.({ type: 'error', reason: 'malformed-parent-message' });
      return;
    }
    const typed = /** @type {{ type?: string }} */ (message);
    if (typed.type === 'barrier') {
      barrierOpen = true;
      return;
    }
    if (typed.type === 'init') {
      if (!barrierOpen) {
        process.send?.({
          type: 'error',
          childIndex,
          reason: 'barrier-missing',
        });
        return;
      }
      try {
        const result = await runChildWorkload();
        process.send?.({ type: 'result', childIndex, ...result });
      } catch (error) {
        process.send?.({
          type: 'error',
          childIndex,
          reason: 'worker-threw',
          category: admissionErrorCategory(error),
        });
      }
    }
    if (typed.type === 'ping-malformed') {
      process.send?.({
        type: 'error',
        childIndex,
        reason: 'malformed-request',
      });
    }
  });

  process.send?.({ type: 'ready', childIndex });
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
async function runChildWorkload() {
  const mode = process.env.VERIFY_WORKER_MODE ?? 'live';
  if (mode === 'fixture') {
    return runFixtureWorkload();
  }
  const dbApi = await import('@offscreen/db');
  const config = dbApi.readDatabaseConfig(
    /** @type {Record<string, string>} */ (process.env),
  );
  const database = dbApi.createDatabase(config, () => {}, undefined);
  try {
    return await runWorkloadOnSubject(database);
  } finally {
    await database.close();
  }
}

/**
 * Deterministic in-worker simulation for fixture-tier orchestration tests.
 */
async function runFixtureWorkload() {
  const runtimeModule = await import(
    new URL(
      '../../../../../../packages/db/dist/src/connection/managed-client.js',
      import.meta.url,
    ).href
  );
  const { createManagedClientRuntime } = runtimeModule;
  let clientId = 0;
  const runtime = createManagedClientRuntime({
    maxActive: MULTIPROCESS_POOL_MAX,
    maxQueued: MULTIPROCESS_QUEUED_PER_CHILD,
    acquireTimeoutMs: 5_000,
    connect: async () => ({
      id: ++clientId,
      release() {},
    }),
    end: async () => {},
  });
  try {
    return await runWorkloadOnSubject(runtime);
  } finally {
    await runtime.close();
  }
}

/**
 * @param {{ withClient: Function, close?: Function }} subject
 */
async function runWorkloadOnSubject(subject) {
  const gates = [];
  const holders = [];
  for (let index = 0; index < MULTIPROCESS_POOL_MAX; index += 1) {
    const gate = createHoldGate();
    gates.push(gate);
    holders.push(
      subject.withClient(
        {
          timeoutMs: 60_000,
          operationName: `verify.db-p02.holder-${childIndex}-${index}`,
          workload: 'interactive',
        },
        async () => {
          gate.signalAcquired();
          await gate.hold;
          return 'holder';
        },
      ),
    );
  }

  await Promise.all(gates.map((gate) => gate.acquired));

  const accounting = { saturated: 0, accepted: 0, queued: 0, unexpected: 0 };

  const tasks = [];
  for (let op = 0; op < MULTIPROCESS_OPS_PER_CHILD; op += 1) {
    tasks.push(
      subject
        .withClient(
          {
            timeoutMs: 30_000,
            operationName: `verify.db-p02.op-${childIndex}-${op}`,
            workload: 'interactive',
          },
          async () => {
            accounting.accepted += 1;
            return 'ok';
          },
        )
        .catch((error) => {
          const category = admissionErrorCategory(error);
          if (category === 'saturated') {
            accounting.saturated += 1;
          } else if (category === 'closed') {
            accounting.unexpected += 1;
          } else {
            accounting.unexpected += 1;
          }
        }),
    );
  }

  await waitUntil(
    () => accounting.saturated >= MULTIPROCESS_REFUSALS_PER_CHILD,
    { timeoutMs: 15_000 },
  );

  const steadySaturated = accounting.saturated;
  const steadyAccepted = accounting.accepted;

  for (const gate of gates) {
    gate.release();
  }
  await Promise.allSettled([...holders, ...tasks]);

  const pass =
    steadySaturated >= MULTIPROCESS_REFUSALS_PER_CHILD &&
    steadyAccepted === 0 &&
    accounting.unexpected === 0 &&
    accounting.accepted >= 1;

  return {
    status: pass ? 'PASS' : 'FAIL',
    accounting,
    steadySaturated,
    steadyAccepted,
    expectedRefusals: MULTIPROCESS_REFUSALS_PER_CHILD,
    childIndex,
  };
}

export { sendIpc, runChildWorkload, runWorkloadOnSubject };
