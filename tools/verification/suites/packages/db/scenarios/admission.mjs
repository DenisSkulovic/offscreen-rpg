import { performance } from 'node:perf_hooks';
import {
  clearInterval,
  setInterval,
  setTimeout,
} from 'node:timers';

import {
  buildDatabaseSubjectEnv,
  LEGACY_DIRECT_EXECUTE_PROBE,
} from '../policy.mjs';
import {
  admissionErrorCategory,
  assertMonotonicDurations,
  classifyAdmissionOrServerRefusal,
  countRuntimeBackendSessions,
  createHoldGate,
  MULTIPROCESS_CHILD_COUNT,
  MULTIPROCESS_POOL_MAX,
  MULTIPROCESS_QUEUE_MAX,
  MULTIPROCESS_REFUSALS_PER_CHILD,
  MULTIPROCESS_SESSION_PEAK_BUDGET,
  STAMPEDE_ACTIVE_EXPECTED,
  STAMPEDE_ENQUEUE_COUNT,
  STAMPEDE_QUEUED_EXPECTED,
  STAMPEDE_SATURATED_MAX,
  STAMPEDE_SATURATED_MIN,
  STAMPEDE_SATURATED_TARGET,
  STRESS_OPS_PER_WAVE,
  STRESS_WAVE_COUNT,
  waitUntil,
} from './admission-helpers.mjs';
import { runLegacyDirectExecuteProbe } from './admission-fixture.mjs';
import { runMultiprocessChildGroup } from './admission-multiprocess-ipc.mjs';

/**
 * @typedef {{
 *   checkConnection?: () => Promise<void>,
 *   withClient: Function,
 *   close: () => Promise<void>,
 *   db?: { execute: Function },
 *   telemetrySnapshot?: () => { gauges?: { admissionActive?: number, admissionQueued?: number } },
 * }} DbSubjectPort
 */

/**
 * @typedef {() => Promise<{ rows: Array<{ value: number }> }>} ObserverQuery
 */

/**
 * @typedef {{
 *   countRuntimeSessions?: () => Promise<number>,
 *   configuredPoolMax?: number,
 *   observerReserve?: number,
 * }} AdmissionObserverPort
 */

/**
 * @param {DbSubjectPort} subject
 */
function readAdmissionGauges(subject) {
  const snapshot = subject.telemetrySnapshot?.();
  return {
    active: Number(snapshot?.gauges?.admissionActive ?? 0),
    queued: Number(snapshot?.gauges?.admissionQueued ?? 0),
  };
}

/**
 * Exercise DB-A01 connect/withClient/close/post-close steps against an injected port.
 *
 * @param {DbSubjectPort} subject
 * @param {{ observerQuery?: ObserverQuery, legacyProbe?: object }} [options]
 */
export async function runDbA01AdmissionSteps(subject, options = {}) {
  const started = performance.now();
  if (subject.checkConnection) {
    await subject.checkConnection();
  }

  const selectValue = await subject.withClient(
    {
      timeoutMs: 5_000,
      operationName: 'verify.db-a01.select',
      workload: 'interactive',
    },
    async (client) => {
      const result = await client.query('SELECT $1::int AS value', [1]);
      return result.rows[0]?.value;
    },
  );

  if (selectValue !== 1) {
    return {
      status: 'FAIL',
      reason: 'unexpected-select-result',
      reasonCode: 'unexpected-select-result',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: { selectValue: selectValue ?? null },
    };
  }

  if (options.observerQuery) {
    const observed = await options.observerQuery();
    const oracleValue = observed.rows[0]?.value;
    if (oracleValue !== 1) {
      return {
        status: 'FAIL',
        reason: 'observer-oracle-mismatch',
        reasonCode: 'observer-oracle-mismatch',
        durationMs: Math.max(0, Math.floor(performance.now() - started)),
      };
    }
  }

  const legacyProbe = options.legacyProbe ?? { ...LEGACY_DIRECT_EXECUTE_PROBE };

  await subject.close();
  await subject.close();

  if (!subject.checkConnection) {
    return {
      status: 'PASS',
      reason: null,
      reasonCode: null,
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        postCloseRefusalCategory: null,
        legacyDirectExecute: legacyProbe,
      },
    };
  }

  try {
    await subject.checkConnection();
    return {
      status: 'FAIL',
      reason: 'post-close-not-refused',
      reasonCode: 'post-close-not-refused',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
    };
  } catch (error) {
    if (admissionErrorCategory(error) === 'closed') {
      return {
        status: 'PASS',
        reason: null,
        reasonCode: null,
        durationMs: Math.max(0, Math.floor(performance.now() - started)),
        measurements: {
          postCloseRefusalCategory: 'closed',
          legacyDirectExecute: legacyProbe,
        },
      };
    }
    return {
      status: 'FAIL',
      reason: 'post-close-wrong-error',
      reasonCode: 'post-close-wrong-error',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
    };
  }
}

/**
 * @param {DbSubjectPort} subject
 * @param {AdmissionObserverPort} [observer]
 */
export async function runDbA02StampedeSteps(subject, observer = {}) {
  const started = performance.now();
  const releaseGates = [];
  /** @type {Promise<unknown>[]} */
  const holderTasks = [];
  let holdersInCallback = 0;

  try {
    for (let index = 0; index < STAMPEDE_ACTIVE_EXPECTED; index += 1) {
      const gate = createHoldGate();
      releaseGates.push(gate);
      holderTasks.push(
        subject.withClient(
          {
            timeoutMs: 60_000,
            operationName: 'verify.db-a02.holder',
            workload: 'interactive',
          },
          async () => {
            holdersInCallback += 1;
            gate.signalAcquired();
            try {
              await gate.hold;
            } finally {
              holdersInCallback -= 1;
            }
            return `holder-${index}`;
          },
        ),
      );
    }

    await waitUntil(() => holdersInCallback === STAMPEDE_ACTIVE_EXPECTED, {
      timeoutMs: 15_000,
    });

    const preEnqueue = readAdmissionGauges(subject);
    let batchReleased = false;
    const accounting = {
      saturated: 0,
      accepted: 0,
      prematureCallbacks: 0,
      unexpected: 0,
    };

    /** @type {Promise<unknown>[]} */
    const queuedTasks = [];
    for (let index = 0; index < STAMPEDE_ENQUEUE_COUNT; index += 1) {
      const task = subject.withClient(
        {
          timeoutMs: 60_000,
          operationName: 'verify.db-a02.stampede',
          workload: 'interactive',
        },
        async () => {
          if (!batchReleased) {
            accounting.prematureCallbacks += 1;
          }
          return `accepted-${index}`;
        },
      );
      queuedTasks.push(
        task
          .then(() => {
            accounting.accepted += 1;
          })
          .catch((error) => {
            const category = admissionErrorCategory(error);
            if (category === 'saturated') {
              accounting.saturated += 1;
            } else {
              accounting.unexpected += 1;
            }
          }),
      );
    }

    let atSaturated = readAdmissionGauges(subject);
    let steadySaturated = 0;
    await waitUntil(() => {
      atSaturated = readAdmissionGauges(subject);
      steadySaturated = accounting.saturated;
      const gaugeReady =
        !subject.telemetrySnapshot ||
        (atSaturated.active >= STAMPEDE_ACTIVE_EXPECTED &&
          atSaturated.queued >= STAMPEDE_QUEUED_EXPECTED);
      return (
        accounting.saturated >= STAMPEDE_SATURATED_MIN &&
        accounting.saturated <= STAMPEDE_SATURATED_MAX &&
        accounting.saturated + STAMPEDE_QUEUED_EXPECTED ===
          STAMPEDE_ENQUEUE_COUNT &&
        accounting.accepted === 0 &&
        accounting.prematureCallbacks === 0 &&
        gaugeReady
      );
    });
    batchReleased = true;
    const expectedAcceptedAfterRelease =
      STAMPEDE_ENQUEUE_COUNT - steadySaturated;
    if (observer.countRuntimeSessions) {
      const sessions = await observer.countRuntimeSessions();
      const budget =
        (observer.configuredPoolMax ?? STAMPEDE_ACTIVE_EXPECTED) +
        (observer.observerReserve ?? 1);
      if (sessions > budget) {
        return {
          status: 'FAIL',
          reason: 'server-sessions-exceed-budget',
          reasonCode: 'session-budget-exceeded',
          durationMs: Math.max(0, Math.floor(performance.now() - started)),
          measurements: { sessions, budget, atSaturated, accounting },
        };
      }
    }

    const legacyDirectExecute = await runLegacyDirectExecuteProbe(subject, {
      managedCapacityActive: true,
    });

    for (const gate of releaseGates) {
      gate.release();
    }

    await Promise.allSettled([...holderTasks, ...queuedTasks]);

    const measurements = {
      preEnqueue,
      atSaturated,
      accounting,
      legacyDirectExecute,
      expected: {
        saturatedTarget: STAMPEDE_SATURATED_TARGET,
        saturatedSteady: steadySaturated,
        accepted: expectedAcceptedAfterRelease,
        active: STAMPEDE_ACTIVE_EXPECTED,
        queued: STAMPEDE_QUEUED_EXPECTED,
      },
    };

    const gaugesOk =
      !subject.telemetrySnapshot ||
      (atSaturated.active === STAMPEDE_ACTIVE_EXPECTED &&
        atSaturated.queued === STAMPEDE_QUEUED_EXPECTED);
    const pass =
      accounting.saturated === steadySaturated &&
      accounting.accepted === expectedAcceptedAfterRelease &&
      accounting.prematureCallbacks === 0 &&
      accounting.unexpected === 0 &&
      gaugesOk;

    return {
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? null : 'stampede-accounting-mismatch',
      reasonCode: pass ? null : 'stampede-accounting-mismatch',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements,
    };
  } finally {
    for (const gate of releaseGates) {
      try {
        gate.release();
      } catch {
        // already released
      }
    }
  }
}

/**
 * @param {DbSubjectPort} subject
 */
export async function runDbA03FifoCancelSteps(subject) {
  const started = performance.now();
  const holderGate = createHoldGate();
  /** @type {number[]} */
  const callbackOrder = [];
  /** @type {Promise<unknown>[]} */
  const pending = [];

  try {
    pending.push(
      subject.withClient(
        {
          timeoutMs: 30_000,
          operationName: 'verify.db-a03.holder',
          workload: 'interactive',
        },
        async () => {
          holderGate.signalAcquired();
          await holderGate.hold;
          return 'holder';
        },
      ),
    );

    await holderGate.acquired;

    let cancelReject = null;
    for (let index = 0; index < 5; index += 1) {
      const controller =
        index === 2 ? new globalThis.AbortController() : null;
      const options = {
        timeoutMs: 30_000,
        operationName: `verify.db-a03.waiter-${index}`,
        workload: 'interactive',
        ...(controller ? { signal: controller.signal } : {}),
      };
      const task = subject.withClient(options, async () => {
        callbackOrder.push(index);
        return index;
      });
      if (controller) {
        cancelReject = task.catch((error) => ({
          category: admissionErrorCategory(error),
        }));
        pending.push(
          cancelReject.then((row) => {
            if (row?.category !== 'cancelled') {
              throw new Error('expected-cancelled');
            }
            return row;
          }),
        );
        await Promise.resolve();
        controller.abort();
      } else {
        pending.push(task);
      }
    }

    holderGate.release();
    await Promise.allSettled(pending);

    const pass =
      !callbackOrder.includes(2) &&
      (callbackOrder.join(',') === '0,1,3,4' ||
        callbackOrder.join(',') === '0,1,3');

    return {
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? null : 'fifo-cancel-mismatch',
      reasonCode: pass ? null : 'fifo-cancel-mismatch',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        callbackOrder,
        cancelledIndex: 2,
        cancelCategory: cancelReject ? 'cancelled' : null,
      },
    };
  } finally {
    holderGate.release();
  }
}

/**
 * @param {DbSubjectPort} subject
 */
export async function runDbA04QueueDeadlineSteps(subject) {
  const started = performance.now();
  const holderGate = createHoldGate();
  let timedOutCallbacks = 0;
  /** @type {boolean} */
  let freshSuccess;

  try {
    const holder = subject.withClient(
      {
        timeoutMs: 30_000,
        operationName: 'verify.db-a04.holder',
        workload: 'interactive',
      },
      async () => {
        holderGate.signalAcquired();
        await holderGate.hold;
        return 'holder';
      },
    );

    await holderGate.acquired;

    const queued = subject
      .withClient(
        {
          timeoutMs: 100,
          operationName: 'verify.db-a04.queued',
          workload: 'interactive',
        },
        async () => {
          timedOutCallbacks += 1;
          return 'should-not-run';
        },
      )
      .catch((error) => {
        const category = admissionErrorCategory(error);
        if (category !== 'timeout') {
          throw error;
        }
        return { rejected: category };
      });

    const rejection = await queued;
    holderGate.release();
    await holder;

    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const result = await subject.withClient(
        {
          timeoutMs: 5_000,
          operationName: 'verify.db-a04.fresh',
          workload: 'interactive',
        },
        async (client) => {
          if (typeof client.query === 'function') {
            const row = await client.query('SELECT 1::int AS value');
            return row.rows[0]?.value;
          }
          return 1;
        },
      );
      freshSuccess = result === 1;
    } catch {
      freshSuccess = false;
    }

    const pass =
      rejection?.rejected === 'timeout' &&
      timedOutCallbacks === 0 &&
      freshSuccess;

    return {
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? null : 'queue-deadline-mismatch',
      reasonCode: pass ? null : 'queue-deadline-mismatch',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        timedOutCallbacks,
        freshSuccess,
        rejectionCategory: rejection?.rejected ?? null,
      },
    };
  } finally {
    holderGate.release();
  }
}

/**
 * @param {DbSubjectPort} subject
 * @param {AdmissionObserverPort} [observer]
 */
export async function runDbP01StressSteps(
  subject,
  observer = {},
  options = {},
) {
  const started = performance.now();
  const waveDurationsMs = [];
  /** @type {number[]} */
  const sessionPeaks = [];
  /** @type {number[]} */
  const waveSaturatedCounts = [];
  /** @type {number[]} */
  const waveAcceptedCounts = [];
  const poolMax = observer.configuredPoolMax ?? STAMPEDE_ACTIVE_EXPECTED;
  const sessionBudget = poolMax + (observer.observerReserve ?? 1);
  const waveCount = options.waveCount ?? STRESS_WAVE_COUNT;
  const opsPerWave = options.opsPerWave ?? STRESS_OPS_PER_WAVE;

  try {
    for (let wave = 0; wave < waveCount; wave += 1) {
      const waveStarted = performance.now();
      const gates = [];
      const holderPromises = [];
      const holdersToAcquire = Math.min(5, poolMax);

      for (let index = 0; index < holdersToAcquire; index += 1) {
        const gate = createHoldGate();
        gates.push(gate);
        holderPromises.push(
          subject.withClient(
            {
              timeoutMs: 60_000,
              operationName: `verify.db-p01.holder-${wave}-${index}`,
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

      let saturated = 0;
      let accepted = 0;
      const tasks = [];
      for (let op = 0; op < opsPerWave; op += 1) {
        tasks.push(
          subject
            .withClient(
              {
                timeoutMs: 30_000,
                operationName: `verify.db-p01.op-${wave}-${op}`,
                workload: 'interactive',
              },
              async () => 'ok',
            )
            .then(() => {
              accepted += 1;
            })
            .catch((error) => {
              if (admissionErrorCategory(error) === 'saturated') {
                saturated += 1;
              }
            }),
        );
      }

      await Promise.allSettled(tasks);
      waveSaturatedCounts.push(saturated);
      waveAcceptedCounts.push(accepted);

      if (observer.countRuntimeSessions) {
        const sessions = await observer.countRuntimeSessions();
        sessionPeaks.push(sessions);
        if (sessions > sessionBudget) {
          return {
            status: 'FAIL',
            reason: 'stress-session-budget-exceeded',
            reasonCode: 'session-budget-exceeded',
            durationMs: Math.max(0, Math.floor(performance.now() - started)),
            measurements: {
              wave,
              sessions,
              sessionBudget,
              waveDurationsMs,
              sessionPeaks,
            },
          };
        }
      }

      for (const gate of gates) {
        gate.release();
      }
      await Promise.allSettled([...holderPromises, ...tasks]);
      waveDurationsMs.push(
        Math.max(0, Math.floor(performance.now() - waveStarted)),
      );
    }

    const monotonic = assertMonotonicDurations(waveDurationsMs);
    const toleratesVariance =
      monotonic ||
      waveDurationsMs.every(
        (value) => value <= (waveDurationsMs[0] ?? 0) + 250,
      );
    return {
      status: toleratesVariance ? 'PASS' : 'FAIL',
      reason: toleratesVariance ? null : 'non-monotonic-wave-durations',
      reasonCode: toleratesVariance ? null : 'wave-duration-regression',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        waveCount,
        opsPerWave,
        waveDurationsMs,
        sessionPeaks,
        sessionBudget,
        waveSaturatedCounts,
        waveAcceptedCounts,
      },
    };
  } finally {
    // defensive; individual waves release in-loop
  }
}

/**
 * @param {DbSubjectPort} subject
 */
export async function runDbR01ShutdownSteps(subject) {
  const started = performance.now();
  const holderGate = createHoldGate();
  let closeCompleted = false;
  /** @type {boolean} */
  let closePendingBeforeRelease;
  let queuedClosed = 0;
  let postCloseRefused = false;
  /** @type {boolean} */
  let doubleCloseInvoked;
  /** @type {Promise<void>} */
  let closePromise;

  try {
    const holder = subject.withClient(
      {
        timeoutMs: 60_000,
        operationName: 'verify.db-r01.holder',
        workload: 'interactive',
      },
      async () => {
        holderGate.signalAcquired();
        await holderGate.hold;
        return 'holder';
      },
    );

    await holderGate.acquired;

    /** @type {Promise<unknown>[]} */
    const queuedTasks = [];
    for (let index = 0; index < 2; index += 1) {
      queuedTasks.push(
        subject
          .withClient(
            {
              timeoutMs: 60_000,
              operationName: `verify.db-r01.queued-${index}`,
              workload: 'interactive',
            },
            async () => `queued-${index}`,
          )
          .catch((error) => {
            if (admissionErrorCategory(error) === 'closed') {
              queuedClosed += 1;
            }
            return { rejected: admissionErrorCategory(error) };
          }),
      );
    }

    await waitUntil(
      () => {
        const gauges = readAdmissionGauges(subject);
        return gauges.queued >= 2 || queuedTasks.length === 2;
      },
      { timeoutMs: 5_000 },
    ).catch(() => {});

    closePromise = subject.close().then(() => {
      closeCompleted = true;
    });

    await waitUntil(() => queuedClosed >= 2, { timeoutMs: 10_000 });

    try {
      await subject.withClient(
        {
          timeoutMs: 1_000,
          operationName: 'verify.db-r01.after-close',
          workload: 'interactive',
        },
        async () => 'should-not-run',
      );
    } catch (error) {
      postCloseRefused = admissionErrorCategory(error) === 'closed';
    }

    closePendingBeforeRelease = !closeCompleted;

    holderGate.release();
    await holder;
    await closePromise;

    await subject.close();
    doubleCloseInvoked = true;

    const pass =
      queuedClosed === 2 &&
      postCloseRefused &&
      closePendingBeforeRelease &&
      closeCompleted &&
      doubleCloseInvoked;

    return {
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? null : 'shutdown-sequence-mismatch',
      reasonCode: pass ? null : 'shutdown-sequence-mismatch',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        queuedClosed,
        postCloseRefused,
        closePendingBeforeRelease,
        closeCompleted,
        doubleCloseInvoked,
      },
    };
  } finally {
    holderGate.release();
  }
}

/**
 * @param {AdmissionObserverPort} [observer]
 * @param {{
 *   subjectEnv?: Record<string, string>,
 *   childMode?: 'live' | 'fixture',
 *   spawnChild?: Function,
 * }} [options]
 */
export async function runDbP02MultiprocessSteps(observer = {}, options = {}) {
  const started = performance.now();
  if (!options.subjectEnv) {
    return {
      status: 'NOT-RUN',
      reason: 'live-not-authorized',
      reasonCode: 'live-not-authorized',
      durationMs: 0,
    };
  }

  /** @type {number[]} */
  const sessionPeaks = [];
  let peakPoller = null;
  if (observer.countRuntimeSessions) {
    peakPoller = setInterval(async () => {
      try {
        const count = await observer.countRuntimeSessions();
        sessionPeaks.push(count);
      } catch {
        // observer failures recorded via missing peaks
      }
    }, 50);
  }

  try {
    const group = await runMultiprocessChildGroup({
      subjectEnv: options.subjectEnv,
      childCount: MULTIPROCESS_CHILD_COUNT,
      mode: options.childMode ?? 'live',
      spawnChild: options.spawnChild,
    });

    const sessionPeak = sessionPeaks.length ? Math.max(...sessionPeaks) : null;
    const sessionBudget =
      MULTIPROCESS_SESSION_PEAK_BUDGET + (observer.observerReserve ?? 1);

    if (sessionPeak != null && sessionPeak > sessionBudget) {
      return {
        status: 'FAIL',
        reason: 'multiprocess-session-peak-exceeded',
        reasonCode: 'session-budget-exceeded',
        durationMs: Math.max(0, Math.floor(performance.now() - started)),
        measurements: {
          sessionPeak,
          sessionBudget,
          group,
          sessionPeaks,
        },
      };
    }

    const refusalsOk =
      group.measurements?.results?.every(
        (row) =>
          (row?.steadySaturated ?? row?.accounting?.saturated ?? 0) >=
          MULTIPROCESS_REFUSALS_PER_CHILD,
      ) ?? false;

    const pass = group.status === 'PASS' && refusalsOk;

    return {
      status: pass ? 'PASS' : 'FAIL',
      reason: pass
        ? null
        : (group.reason ?? 'multiprocess-accounting-mismatch'),
      reasonCode: pass ? null : (group.reasonCode ?? 'multiprocess-mismatch'),
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        ...group.measurements,
        sessionPeak,
        sessionBudget,
        sessionPeaks,
        refusalsPerChild: MULTIPROCESS_REFUSALS_PER_CHILD,
        childCount: MULTIPROCESS_CHILD_COUNT,
        noGlobalCapGuarantee: true,
      },
    };
  } finally {
    if (peakPoller) {
      clearInterval(peakPoller);
    }
  }
}

/**
 * @param {AdmissionObserverPort} [observer]
 * @param {{ subjectEnv?: Record<string, string>, childMode?: 'live' | 'fixture' }} [options]
 */
export async function runDbP03ConstrainedSteps(observer = {}, options = {}) {
  const started = performance.now();
  const outcome = await runDbP02MultiprocessSteps(observer, options);
  return {
    ...outcome,
    durationMs: Math.max(0, Math.floor(performance.now() - started)),
    measurements: {
      ...outcome.measurements,
      constrainedProfile: true,
      aggregateConnectionBudget: 20,
      noGlobalCapGuarantee: true,
      note: 'server max_connections profile does not cap cross-process totals',
    },
  };
}

/**
 * @param {DbSubjectPort & { checkConnection?: () => Promise<void> }} subject
 * @param {{
 *   adminObserver?: { connectClient: () => Promise<import('pg').Client> },
 *   runtimeRole?: string,
 *   readDatabaseConfig?: Function,
 *   createDatabase?: Function,
 *   scenarioEnv?: Record<string, string>,
 *   onRecreate?: () => Promise<DbSubjectPort>,
 * }} tools
 */
export async function runDbP04ConnectionLimitSteps(subject, tools = {}) {
  const started = performance.now();
  const role = tools.runtimeRole ?? 'verify_runtime';
  let limitApplied = false;
  /** @type {import('pg').Client | null} */
  let adminClient = null;
  /** @type {ReturnType<typeof createHoldGate>[]} */
  const gates = [];

  try {
    if (!tools.adminObserver?.connectClient) {
      return {
        status: 'NOT-RUN',
        reason: 'admin-observer-missing',
        reasonCode: 'admin-observer-missing',
        durationMs: 0,
      };
    }

    adminClient = await tools.adminObserver.connectClient();
    await adminClient.query(
      `ALTER ROLE ${quoteIdent(role)} CONNECTION LIMIT 2`,
    );
    limitApplied = true;

    const holders = [];
    for (let index = 0; index < 2; index += 1) {
      const gate = createHoldGate();
      gates.push(gate);
      holders.push(
        subject.withClient(
          {
            timeoutMs: 60_000,
            operationName: `verify.db-p04.holder-${index}`,
            workload: 'interactive',
          },
          async (client) => {
            gate.signalAcquired();
            await client.query('SELECT pg_backend_pid()');
            await gate.hold;
            return 'holder';
          },
        ),
      );
    }

    await Promise.all(gates.map((gate) => gate.acquired));

    let thirdRefusal = null;
    try {
      await subject.withClient(
        {
          timeoutMs: 5_000,
          operationName: 'verify.db-p04.third-lease',
          workload: 'interactive',
        },
        async (client) => client.query('SELECT 1'),
      );
    } catch (error) {
      thirdRefusal = classifyAdmissionOrServerRefusal(error);
    }

    const sqlStateObserved =
      thirdRefusal?.sqlState === '53300' ||
      String(
        /** @type {{ message?: string }} */ (thirdRefusal)?.message ?? '',
      ).includes('53300');

    for (const gate of gates) {
      gate.release();
    }
    await Promise.allSettled(holders);

    let recovery = false;
    if (typeof tools.onRecreate === 'function') {
      const fresh = await tools.onRecreate();
      try {
        const value = await fresh.withClient(
          {
            timeoutMs: 10_000,
            operationName: 'verify.db-p04.recovery',
            workload: 'interactive',
          },
          async (client) => {
            const row = await client.query('SELECT 1::int AS value');
            return row.rows[0]?.value;
          },
        );
        recovery = value === 1;
      } finally {
        await fresh.close();
      }
    } else if (subject.checkConnection) {
      try {
        await subject.checkConnection();
        recovery = true;
      } catch {
        recovery = false;
      }
    }

    const pass =
      thirdRefusal != null &&
      (thirdRefusal.sqlState === '53300' || sqlStateObserved) &&
      recovery;

    return {
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? null : 'connection-limit-recovery-mismatch',
      reasonCode: pass ? null : 'connection-limit-recovery-mismatch',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        thirdRefusalClassification: thirdRefusal,
        wrapperMayReportApplication:
          thirdRefusal?.layer === 'admission' &&
          thirdRefusal?.sqlState === '53300',
        recovery,
        poolMax: MULTIPROCESS_POOL_MAX,
        limitHeld: 2,
        noGlobalCapGuarantee: true,
      },
    };
  } finally {
    for (const gate of gates) {
      try {
        gate.release();
      } catch {
        // already released
      }
    }
    if (limitApplied && adminClient) {
      try {
        await adminClient.query(
          `ALTER ROLE ${quoteIdent(role)} CONNECTION LIMIT -1`,
        );
      } catch {
        // best-effort reset
      }
    }
    if (adminClient) {
      await adminClient.end();
    }
  }
}

/**
 * @param {string} ident
 */
function quoteIdent(ident) {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

/**
 * @param {{
 *   scenarioId: string,
 *   live: boolean,
 *   postgresResource?: object,
 *   loadDbModule?: () => Promise<Record<string, unknown>>,
 *   subjectPort?: DbSubjectPort,
 *   fixtureOptions?: object,
 * }} input
 */
export async function runAdmissionScenario(input) {
  const { scenarioId } = input;

  if (scenarioId === 'DB-R01') {
    if (input.subjectPort) {
      return runDbR01ShutdownSteps(input.subjectPort);
    }
    if (!input.live) {
      return {
        status: 'NOT-RUN',
        reason: 'live-not-authorized',
        reasonCode: 'live-not-authorized',
        durationMs: 0,
      };
    }
    return runLiveAdmissionScenario(input, 'DB-R01');
  }

  if (scenarioId === 'DB-P02') {
    if (!input.live && !input.fixtureMultiprocess) {
      return {
        status: 'NOT-RUN',
        reason: 'live-not-authorized',
        reasonCode: 'live-not-authorized',
        durationMs: 0,
      };
    }
    if (input.fixtureMultiprocess) {
      return runDbP02MultiprocessSteps(
        {},
        {
          subjectEnv: { DB_POOL_MAX: String(MULTIPROCESS_POOL_MAX) },
          childMode: 'fixture',
          ...input.fixtureOptions,
        },
      );
    }
    if (!input.live) {
      return {
        status: 'NOT-RUN',
        reason: 'live-not-authorized',
        reasonCode: 'live-not-authorized',
        durationMs: 0,
      };
    }
    return runLiveAdmissionScenario(input, 'DB-P02');
  }

  if (scenarioId === 'DB-P03' || scenarioId === 'DB-P04') {
    if (!input.live) {
      return {
        status: 'NOT-RUN',
        reason: 'live-not-authorized',
        reasonCode: 'live-not-authorized',
        durationMs: 0,
      };
    }
    return runLiveAdmissionScenario(input, scenarioId);
  }

  if (scenarioId === 'DB-P01') {
    if (input.subjectPort) {
      return runDbP01StressSteps(
        input.subjectPort,
        {
          configuredPoolMax: 5,
          observerReserve: 0,
        },
        input.fixtureOptions,
      );
    }
    if (!input.live) {
      return {
        status: 'NOT-RUN',
        reason: 'live-not-authorized',
        reasonCode: 'live-not-authorized',
        durationMs: 0,
      };
    }
    return runLiveAdmissionScenario(input, 'DB-P01');
  }

  if (
    scenarioId === 'DB-A02' ||
    scenarioId === 'DB-A03' ||
    scenarioId === 'DB-A04'
  ) {
    if (input.subjectPort) {
      if (scenarioId === 'DB-A02') {
        return runDbA02StampedeSteps(input.subjectPort);
      }
      if (scenarioId === 'DB-A03') {
        return runDbA03FifoCancelSteps(input.subjectPort);
      }
      return runDbA04QueueDeadlineSteps(input.subjectPort);
    }
    if (!input.live) {
      return {
        status: 'NOT-RUN',
        reason: 'live-not-authorized',
        reasonCode: 'live-not-authorized',
        durationMs: 0,
      };
    }
    return runLiveAdmissionScenario(input, scenarioId);
  }

  if (scenarioId !== 'DB-A01') {
    return {
      status: 'NOT-RUN',
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
    };
  }

  if (!input.live) {
    return {
      status: 'NOT-RUN',
      reason: 'live-not-authorized',
      reasonCode: 'live-not-authorized',
      durationMs: 0,
    };
  }

  if (input.subjectPort) {
    return runDbA01AdmissionSteps(input.subjectPort);
  }

  return runLiveAdmissionScenario(input, 'DB-A01');
}

/**
 * @param {object} input
 * @param {string} scenarioId
 */
async function runLiveAdmissionScenario(input, scenarioId) {
  const resource = input.postgresResource;
  if (!resource?.runtimeConnect) {
    return {
      status: 'FAIL',
      reason: 'missing-runtime-connect',
      reasonCode: 'missing-runtime-connect',
      durationMs: 0,
    };
  }

  const loadDbModule =
    input.loadDbModule ?? (async () => import('@offscreen/db'));
  const dbApi = await loadDbModule();
  const readDatabaseConfig = dbApi.readDatabaseConfig;
  const createDatabase = dbApi.createDatabase;
  if (
    typeof readDatabaseConfig !== 'function' ||
    typeof createDatabase !== 'function'
  ) {
    return {
      status: 'FAIL',
      reason: 'invalid-db-public-api',
      reasonCode: 'invalid-db-public-api',
      durationMs: 0,
    };
  }

  const scenarioEnv = envForScenario(scenarioId, resource.runtimeConnect);
  const config = readDatabaseConfig(scenarioEnv);
  const database = createDatabase(config, () => {}, undefined);

  const observerPort = await buildObserverPort(resource, scenarioEnv, config);

  const observerQuery = resource.adminObserver
    ? async () => {
        const client = await resource.adminObserver.connectClient();
        try {
          return await client.query('SELECT 1::int AS value');
        } finally {
          await client.end();
        }
      }
    : undefined;

  try {
    if (scenarioId === 'DB-A01') {
      return await runDbA01AdmissionSteps(database, { observerQuery });
    }
    if (scenarioId === 'DB-A02') {
      return await runDbA02StampedeSteps(database, observerPort);
    }
    if (scenarioId === 'DB-A03') {
      const fifoEnv = buildDatabaseSubjectEnv(resource.runtimeConnect, {
        DB_POOL_MAX: '1',
        DB_MANAGED_QUEUE_MAX: '4',
        DB_MANAGED_ACQUIRE_TIMEOUT_MS: '5000',
      });
      const fifoConfig = readDatabaseConfig(fifoEnv);
      const fifoDb = createDatabase(fifoConfig, () => {}, undefined);
      try {
        return await runDbA03FifoCancelSteps(fifoDb);
      } finally {
        await fifoDb.close();
      }
    }
    if (scenarioId === 'DB-A04') {
      const deadlineEnv = buildDatabaseSubjectEnv(resource.runtimeConnect, {
        DB_POOL_MAX: '1',
        DB_MANAGED_QUEUE_MAX: '4',
        DB_MANAGED_ACQUIRE_TIMEOUT_MS: '100',
      });
      const deadlineConfig = readDatabaseConfig(deadlineEnv);
      const deadlineDb = createDatabase(deadlineConfig, () => {}, undefined);
      try {
        return await runDbA04QueueDeadlineSteps(deadlineDb);
      } finally {
        await deadlineDb.close();
      }
    }
    if (scenarioId === 'DB-P01') {
      return await runDbP01StressSteps(database, observerPort);
    }
    if (scenarioId === 'DB-R01') {
      return await runDbR01ShutdownSteps(database);
    }
    if (scenarioId === 'DB-P02') {
      const mpEnv = buildDatabaseSubjectEnv(resource.runtimeConnect, {
        DB_POOL_MAX: String(MULTIPROCESS_POOL_MAX),
        DB_MANAGED_QUEUE_MAX: String(MULTIPROCESS_QUEUE_MAX),
        VERIFY_APPLICATION_NAME: 'offscreen-verify-db-p02',
      });
      await database.close();
      const mpConfig = readDatabaseConfig(mpEnv);
      const mpDb = createDatabase(mpConfig, () => {}, undefined);
      try {
        return await runDbP02MultiprocessSteps(observerPort, {
          subjectEnv: mpEnv,
          childMode: 'live',
        });
      } finally {
        await mpDb.close();
      }
    }
    if (scenarioId === 'DB-P03') {
      const constrainedEnv = buildDatabaseSubjectEnv(resource.runtimeConnect, {
        DB_POOL_MAX: String(MULTIPROCESS_POOL_MAX),
        DB_MANAGED_QUEUE_MAX: String(MULTIPROCESS_QUEUE_MAX),
        VERIFY_APPLICATION_NAME: 'offscreen-verify-db-p03',
      });
      await database.close();
      const constrainedConfig = readDatabaseConfig(constrainedEnv);
      const constrainedDb = createDatabase(
        constrainedConfig,
        () => {},
        undefined,
      );
      try {
        return await runDbP03ConstrainedSteps(observerPort, {
          subjectEnv: constrainedEnv,
          childMode: 'live',
        });
      } finally {
        await constrainedDb.close();
      }
    }
    if (scenarioId === 'DB-P04') {
      const limitEnv = buildDatabaseSubjectEnv(resource.runtimeConnect, {
        DB_POOL_MAX: String(MULTIPROCESS_POOL_MAX),
        DB_MANAGED_QUEUE_MAX: '4',
        VERIFY_APPLICATION_NAME: 'offscreen-verify-db-p04',
      });
      await database.close();
      const limitConfig = readDatabaseConfig(limitEnv);
      const limitDb = createDatabase(limitConfig, () => {}, undefined);
      try {
        return await runDbP04ConnectionLimitSteps(limitDb, {
          adminObserver: resource.adminObserver,
          runtimeRole: resource.runtimeRole,
          readDatabaseConfig,
          createDatabase,
          scenarioEnv: limitEnv,
          onRecreate: async () => {
            const freshConfig = readDatabaseConfig(limitEnv);
            return createDatabase(freshConfig, () => {}, undefined);
          },
        });
      } finally {
        await limitDb.close();
      }
    }
    return {
      status: 'NOT-RUN',
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
    };
  } finally {
    try {
      await database.close();
    } catch {
      // already closed in scenario steps
    }
  }
}

/**
 * @param {string} scenarioId
 * @param {object} connect
 */
function envForScenario(scenarioId, connect) {
  if (scenarioId === 'DB-A03') {
    return buildDatabaseSubjectEnv(connect, {
      DB_POOL_MAX: '1',
      DB_MANAGED_QUEUE_MAX: '4',
    });
  }
  if (scenarioId === 'DB-A04') {
    return buildDatabaseSubjectEnv(connect, {
      DB_POOL_MAX: '1',
      DB_MANAGED_QUEUE_MAX: '4',
      DB_MANAGED_ACQUIRE_TIMEOUT_MS: '100',
    });
  }
  if (scenarioId === 'DB-P01') {
    return buildDatabaseSubjectEnv(connect, {
      DB_POOL_MAX: '5',
      DB_MANAGED_QUEUE_MAX: '20',
      VERIFY_APPLICATION_NAME: 'offscreen-verify-db-p01',
    });
  }
  return buildDatabaseSubjectEnv(connect, {
    VERIFY_APPLICATION_NAME: `offscreen-verify-${scenarioId.toLowerCase()}`,
  });
}

/**
 * @param {object} resource
 * @param {Record<string, string>} env
 * @param {{ max: number }} config
 */
async function buildObserverPort(resource, env, config) {
  const applicationName = env.VERIFY_APPLICATION_NAME ?? null;
  const database =
    resource.runtimeConnect?.database?.replace(/^\//, '') ?? null;
  const role = resource.runtimeRole ?? resource.runtimeConnect?.user ?? null;
  if (!resource.adminObserver || !database || !role) {
    return {
      configuredPoolMax: config.max,
      observerReserve: 1,
    };
  }
  return {
    configuredPoolMax: config.max,
    observerReserve: 1,
    countRuntimeSessions: async () => {
      const client = await resource.adminObserver.connectClient();
      try {
        return countRuntimeBackendSessions(client, {
          database,
          role,
          applicationName,
        });
      } finally {
        await client.end();
      }
    },
  };
}
