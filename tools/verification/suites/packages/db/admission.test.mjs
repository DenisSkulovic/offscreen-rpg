import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runAdmissionScenario,
  runDbA01AdmissionSteps,
  runDbA02StampedeSteps,
  runDbA03FifoCancelSteps,
  runDbA04QueueDeadlineSteps,
  runDbP01StressSteps,
  runDbR01ShutdownSteps,
} from './scenarios/admission.mjs';
import { spawnAdmissionWorker } from './scenarios/admission-multiprocess-ipc.mjs';
import { buildPrivateChildEnv } from './scenarios/admission-helpers.mjs';
import {
  createImmediateAdmissionSubject,
} from './scenarios/admission-fixture.mjs';
import {
  STAMPEDE_ENQUEUE_COUNT,
  STAMPEDE_SATURATED_MIN,
  STAMPEDE_SATURATED_MAX,
} from './scenarios/admission-helpers.mjs';

class MockAdmissionClosedError extends Error {
  constructor(category) {
    super(`admission-${category}`);
    this.name = 'DatabaseAdmissionError';
    this.category = category;
  }
}

/**
 * @returns {import('./scenarios/admission.mjs').DbSubjectPort & { closeCalls: number }}
 */
function createMockSubjectPort() {
  let closed = false;
  let closeCalls = 0;
  const port = {
    async checkConnection() {
      if (closed) {
        throw new MockAdmissionClosedError('closed');
      }
    },
    async withClient(_options, run) {
      if (closed) {
        throw new MockAdmissionClosedError('closed');
      }
      const client = {
        query: async () => ({ rows: [{ value: 1 }] }),
      };
      return run(client);
    },
    async close() {
      closeCalls += 1;
      closed = true;
    },
    get closeCalls() {
      return closeCalls;
    },
  };
  return port;
}

test('runDbA01AdmissionSteps covers double close and post-close refusal', async () => {
  const subject = createMockSubjectPort();
  const outcome = await runDbA01AdmissionSteps(subject, {
    observerQuery: async () => ({ rows: [{ value: 1 }] }),
  });
  assert.equal(outcome.status, 'PASS');
  assert.equal(subject.closeCalls, 2);
  assert.equal(outcome.measurements?.postCloseRefusalCategory, 'closed');
  assert.equal(outcome.measurements?.legacyDirectExecute?.status, 'NOT-RUN');
});

test('runAdmissionScenario returns NOT-RUN without live authorization', async () => {
  const outcome = await runAdmissionScenario({
    scenarioId: 'DB-A01',
    live: false,
    subjectPort: createMockSubjectPort(),
  });
  assert.equal(outcome.status, 'NOT-RUN');
  assert.equal(outcome.reasonCode, 'live-not-authorized');
});

test('runAdmissionScenario fixture stampede accounting', async () => {
  const subject = await createImmediateAdmissionSubject({
    maxActive: 5,
    maxQueued: 20,
    acquireTimeoutMs: 5_000,
  });
  try {
    const outcome = await runDbA02StampedeSteps(subject);
    assert.equal(outcome.status, 'PASS');
    const saturated = outcome.measurements?.accounting?.saturated;
    assert.ok(saturated >= STAMPEDE_SATURATED_MIN);
    assert.ok(saturated <= STAMPEDE_SATURATED_MAX);
    assert.equal(
      outcome.measurements?.accounting?.accepted,
      STAMPEDE_ENQUEUE_COUNT - saturated,
    );
    assert.equal(outcome.measurements?.accounting?.prematureCallbacks, 0);
  } finally {
    await subject.close();
  }
});

test('runAdmissionScenario fixture FIFO cancel order', async () => {
  const subject = await createImmediateAdmissionSubject({
    maxActive: 1,
    maxQueued: 4,
    acquireTimeoutMs: 5_000,
  });
  try {
    const outcome = await runDbA03FifoCancelSteps(subject);
    assert.equal(outcome.status, 'PASS');
    assert.deepEqual(outcome.measurements?.callbackOrder, [0, 1, 3, 4]);
    assert.equal(outcome.measurements?.callbackOrder?.includes(2), false);
  } finally {
    await subject.close();
  }
});

test('runAdmissionScenario fixture queue deadline drain', async () => {
  const subject = await createImmediateAdmissionSubject({
    maxActive: 1,
    maxQueued: 4,
    acquireTimeoutMs: 100,
  });
  try {
    const outcome = await runDbA04QueueDeadlineSteps(subject);
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.measurements?.timedOutCallbacks, 0);
    assert.equal(outcome.measurements?.freshSuccess, true);
    assert.equal(outcome.measurements?.rejectionCategory, 'timeout');
  } finally {
    await subject.close();
  }
});

test('runAdmissionScenario fixture stress wave accounting', async () => {
  const subject = await createImmediateAdmissionSubject({
    maxActive: 5,
    maxQueued: 20,
    acquireTimeoutMs: 5_000,
  });
  try {
    const outcome = await runDbP01StressSteps(
      subject,
      {
        configuredPoolMax: 5,
        observerReserve: 0,
      },
      { waveCount: 3, opsPerWave: 40 },
    );
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.measurements?.waveCount, 3);
    assert.equal(outcome.measurements?.opsPerWave, 40);
    assert.equal(outcome.measurements?.waveDurationsMs?.length, 3);
  } finally {
    await subject.close();
  }
});

test('runAdmissionScenario routes fixture ports for stampede scenarios', async () => {
  for (const scenarioId of ['DB-A02', 'DB-A03', 'DB-A04']) {
    const subject = await createImmediateAdmissionSubject({
      maxActive: scenarioId === 'DB-A02' ? 5 : 1,
      maxQueued: scenarioId === 'DB-A02' ? 20 : 4,
      acquireTimeoutMs: scenarioId === 'DB-A04' ? 100 : 5_000,
    });
    try {
      const outcome = await runAdmissionScenario({
        scenarioId,
        live: false,
        subjectPort: subject,
      });
      assert.equal(outcome.status, 'PASS', scenarioId);
    } finally {
      await subject.close();
    }
  }
});

test('stampede negative unknown scenario stays NOT-RUN', async () => {
  const outcome = await runAdmissionScenario({
    scenarioId: 'DB-A99',
    live: true,
    subjectPort: createMockSubjectPort(),
  });
  assert.equal(outcome.status, 'NOT-RUN');
  assert.equal(outcome.reasonCode, 'unknown-scenario');
});

test('runDbR01ShutdownSteps closes while queued and drains', async () => {
  const subject = await createImmediateAdmissionSubject({
    maxActive: 1,
    maxQueued: 4,
    acquireTimeoutMs: 5_000,
  });
  try {
    const outcome = await runDbR01ShutdownSteps(subject);
    assert.equal(outcome.status, 'PASS');
    assert.equal(outcome.measurements?.queuedClosed, 2);
    assert.equal(outcome.measurements?.closePendingBeforeRelease, true);
    assert.equal(outcome.measurements?.doubleCloseInvoked, true);
  } finally {
    await subject.close();
  }
});

test('runAdmissionScenario DB-P02 fixture multiprocess child accounting', async () => {
  const outcome = await runAdmissionScenario({
    scenarioId: 'DB-P02',
    live: false,
    fixtureMultiprocess: true,
  });
  assert.equal(outcome.status, 'PASS');
  assert.equal(
    outcome.measurements?.results?.length,
    3,
  );
  for (const row of outcome.measurements?.results ?? []) {
    assert.ok((row?.steadySaturated ?? 0) >= 21);
  }
});

test('multiprocess worker malformed message returns child error', async () => {
  const handle = await spawnAdmissionWorker({
    childIndex: 0,
    subjectEnv: buildPrivateChildEnv({ DB_POOL_MAX: '3' }),
    mode: 'fixture',
  });
  handle.proc.send?.({ type: 'barrier' });
  handle.proc.send?.({ type: 'ping-malformed' });
  const message = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 5_000);
    handle.proc.on('message', (row) => {
      if (row?.type === 'error') {
        clearTimeout(timer);
        resolve(row);
      }
    });
  });
  assert.equal(message.reason, 'malformed-request');
  await handle.close();
});

test('multiprocess group refuses credentials in argv', async () => {
  await assert.rejects(
    () =>
      spawnAdmissionWorker({
        childIndex: 0,
        subjectEnv: {},
        workerPath: 'postgresql://user:pass@localhost/db',
      }),
    /credentials-in-argv-refused/,
  );
});

test('runAdmissionScenario DB-P03 DB-P04 stay NOT-RUN without live', async () => {
  for (const scenarioId of ['DB-P03', 'DB-P04']) {
    const outcome = await runAdmissionScenario({ scenarioId, live: false });
    assert.equal(outcome.status, 'NOT-RUN', scenarioId);
    assert.equal(outcome.reasonCode, 'live-not-authorized', scenarioId);
  }
});

test('runAdmissionScenario DB-P01 fixture without live flag via subjectPort', async () => {
  const subject = await createImmediateAdmissionSubject({
    maxActive: 5,
    maxQueued: 20,
    acquireTimeoutMs: 5_000,
  });
  try {
    const outcome = await runAdmissionScenario({
      scenarioId: 'DB-P01',
      live: false,
      subjectPort: subject,
      fixtureOptions: { waveCount: 2, opsPerWave: 30 },
    });
    assert.equal(outcome.status, 'PASS');
  } finally {
    await subject.close();
  }
});