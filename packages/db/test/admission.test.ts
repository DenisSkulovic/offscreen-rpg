import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAdmissionController,
  DatabaseAdmissionError,
  type AdmissionClock,
  type ReleasableClient,
} from '../src/connection/admission';

class FakeClock implements AdmissionClock {
  nowValue = 0;
  timers: Array<{ at: number; fn: () => void; handle: symbol }> = [];

  now = () => this.nowValue;

  setTimeout = (fn: () => void, delayMs: number) => {
    const handle = Symbol('timer');
    this.timers.push({ at: this.nowValue + delayMs, fn, handle });
    return handle;
  };

  clearTimeout = (handle: unknown) => {
    this.timers = this.timers.filter((timer) => timer.handle !== handle);
  };

  tick(ms: number) {
    this.nowValue += ms;
    const due = this.timers
      .filter((timer) => timer.at <= this.nowValue)
      .sort((a, b) => a.at - b.at);
    this.timers = this.timers.filter((timer) => timer.at > this.nowValue);
    for (const timer of due) {
      timer.fn();
    }
  }
}

type FakeClient = ReleasableClient & { id: number; releases: number };

function createFakeClient(id: number): FakeClient {
  return {
    id,
    releases: 0,
    release(err?: Error | boolean) {
      this.releases += 1;
      if (err instanceof Error) {
        throw err;
      }
    },
  };
}

type ConnectGate = {
  promise: Promise<FakeClient>;
  resolve: (client: FakeClient) => void;
  reject: (error: Error) => void;
};

function createConnectGate(): ConnectGate {
  let resolve!: (client: FakeClient) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<FakeClient>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('FIFO serves waiters when maxActive is 1', async () => {
  const clock = new FakeClock();
  const gates = [createConnectGate(), createConnectGate()];
  let connectIndex = 0;
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 2,
    acquireTimeoutMs: 1_000,
    clock,
    connect: () => {
      const gate = gates[connectIndex++];
      if (gate === undefined) {
        throw new Error('unexpected connect gate index');
      }
      return gate.promise;
    },
  });

  const order: number[] = [];
  const first = controller.acquire({ timeoutMs: 5_000 }, async (client) => {
    order.push(client.id);
    return 'first';
  });
  const gate0 = gates[0];
  assert.ok(gate0);
  gate0.resolve(createFakeClient(1));
  await Promise.resolve();

  const second = controller.acquire({ timeoutMs: 5_000 }, async (client) => {
    order.push(client.id);
    return 'second';
  });
  await Promise.resolve();

  assert.deepEqual(order, [1]);
  assert.equal(await first, 'first');
  const gate1 = gates[1];
  assert.ok(gate1);
  gate1.resolve(createFakeClient(2));
  assert.equal(await second, 'second');
  assert.deepEqual(order, [1, 2]);
});

test('rejects with saturated when queue overflows', async () => {
  const clock = new FakeClock();
  const gate = createConnectGate();
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 1_000,
    clock,
    connect: () => gate.promise,
  });

  const holding = controller.acquire({ timeoutMs: 5_000 }, async () => 'hold');
  gate.resolve(createFakeClient(1));

  const queued = controller.acquire({ timeoutMs: 5_000 }, async () => 'queued');
  await Promise.resolve();

  await assert.rejects(
    () => controller.acquire({ timeoutMs: 5_000 }, async () => 'overflow'),
    (error: unknown) =>
      error instanceof DatabaseAdmissionError && error.category === 'saturated',
  );

  gate.resolve(createFakeClient(2));
  assert.equal(await holding, 'hold');
  assert.equal(await queued, 'queued');
});

test('queued timeout and abort remove the waiter without granting', async () => {
  const clock = new FakeClock();
  const gate = createConnectGate();
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 2,
    acquireTimeoutMs: 1_000,
    clock,
    connect: () => gate.promise,
  });

  let callbacks = 0;
  const hold = new Promise<void>(() => {});
  void controller.acquire({ timeoutMs: 10_000 }, async () => {
    callbacks += 1;
    await hold;
    return 'active';
  });
  gate.resolve(createFakeClient(1));
  await Promise.resolve();

  const abort = new AbortController();
  const aborted = controller.acquire(
    { timeoutMs: 10_000, signal: abort.signal },
    async () => 'aborted',
  );
  const timedOut = controller.acquire({ timeoutMs: 1_000 }, async () => 'late');
  await Promise.resolve();

  abort.abort();
  await assert.rejects(aborted, {
    message: 'Database admission was cancelled.',
  });

  clock.tick(1_000);
  await assert.rejects(timedOut, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    assert.match(error.message, /timeout/i);
    return true;
  });

  assert.equal(callbacks, 1);
});

test('pending acquisition timeout holds the active permit until connect settles', async () => {
  const clock = new FakeClock();
  const gate = createConnectGate();
  let connectCalls = 0;
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 100,
    clock,
    connect: () => {
      connectCalls += 1;
      return gate.promise;
    },
  });

  let callbackRuns = 0;
  const pending = controller.acquire({ timeoutMs: 5_000 }, async () => {
    callbackRuns += 1;
    return 'nope';
  });

  clock.tick(100);
  await assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    return true;
  });

  const blocked = controller.acquire(
    { timeoutMs: 5_000 },
    async () => 'blocked',
  );
  await assert.rejects(blocked, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'saturated');
    return true;
  });

  const client = createFakeClient(9);
  gate.resolve(client);
  await Promise.resolve();
  assert.equal(client.releases, 1);
  assert.equal(callbackRuns, 0);
  assert.equal(connectCalls, 1);
});

test('close refuses queued and pending admissions', async () => {
  const clock = new FakeClock();
  const activeGate = createConnectGate();
  const pendingGate = createConnectGate();
  let connectCount = 0;
  const controller = createAdmissionController({
    maxActive: 2,
    maxQueued: 1,
    acquireTimeoutMs: 1_000,
    clock,
    connect: () => {
      connectCount += 1;
      return connectCount === 1 ? activeGate.promise : pendingGate.promise;
    },
  });

  const hold = new Promise<void>(() => {});
  void controller.acquire({ timeoutMs: 5_000 }, async () => {
    await hold;
    return 'running';
  });
  activeGate.resolve(createFakeClient(1));
  await Promise.resolve();

  const pending = controller.acquire(
    { timeoutMs: 5_000 },
    async () => 'pending',
  );
  await Promise.resolve();

  const queued = controller.acquire({ timeoutMs: 5_000 }, async () => 'queued');
  await Promise.resolve();

  controller.close();

  await assert.rejects(queued, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'closed');
    return true;
  });
  await assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'closed');
    return true;
  });
});

test('queued wait does not reset the total deadline after drain', async () => {
  const clock = new FakeClock();
  const holdGate = createConnectGate();
  const queuedGate = createConnectGate();
  let connectIndex = 0;
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 80,
    clock,
    connect: () =>
      connectIndex++ === 0 ? holdGate.promise : queuedGate.promise,
  });

  let releaseHold!: () => void;
  const holdBarrier = new Promise<void>((resolve) => {
    releaseHold = resolve;
  });

  const holding = controller.acquire({ timeoutMs: 100 }, async () => {
    await holdBarrier;
    return 'hold';
  });
  holdGate.resolve(createFakeClient(1));
  await Promise.resolve();

  const queued = controller.acquire({ timeoutMs: 100 }, async () => 'queued');
  await Promise.resolve();
  const queuedResult = assert.rejects(queued, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    return true;
  });

  clock.tick(80);
  releaseHold();
  await holding;
  await queuedResult;
  assert.equal(connectIndex, 1);
});

test('synchronous connect throw releases the permit once', async () => {
  const clock = new FakeClock();
  let connectCalls = 0;
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    clock,
    connect: () => {
      connectCalls += 1;
      if (connectCalls === 1) {
        throw new Error('connect blew up');
      }
      return Promise.resolve(createFakeClient(1));
    },
  });

  await assert.rejects(
    () => controller.acquire({ timeoutMs: 1_000 }, async () => 'nope'),
    /connect blew up/,
  );

  assert.equal(
    await controller.acquire({ timeoutMs: 1_000 }, async (client) => client.id),
    1,
  );
  assert.equal(connectCalls, 2);
});

test('callback throw undefined is a rejection', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(2);
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    clock,
    connect: async () => client,
  });

  await assert.rejects(
    () =>
      controller.acquire({ timeoutMs: 1_000 }, async () => {
        throw undefined;
      }),
    (error: unknown) => {
      assert.equal(error, undefined);
      return true;
    },
  );
  assert.equal(client.releases, 1);
});

test('queued 80ms plus 30ms connect exceeds a 100ms total budget', async () => {
  const clock = new FakeClock();
  const holdGate = createConnectGate();
  const queuedGate = createConnectGate();
  let connectIndex = 0;
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 100,
    clock,
    connect: () =>
      connectIndex++ === 0 ? holdGate.promise : queuedGate.promise,
  });

  let releaseHold!: () => void;
  const holdBarrier = new Promise<void>((resolve) => {
    releaseHold = resolve;
  });

  const holding = controller.acquire({ timeoutMs: 100 }, async () => {
    await holdBarrier;
    return 'hold';
  });
  holdGate.resolve(createFakeClient(1));
  await Promise.resolve();

  let callbackRuns = 0;
  const queued = controller.acquire({ timeoutMs: 100 }, async () => {
    callbackRuns += 1;
    return 'queued';
  });
  await Promise.resolve();

  clock.tick(80);
  releaseHold();
  await holding;
  clock.tick(30);

  const queuedClient = createFakeClient(2);
  const queuedResult = assert.rejects(queued, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    return true;
  });
  queuedGate.resolve(queuedClient);
  await queuedResult;
  assert.equal(queuedClient.releases, 1);
  assert.equal(callbackRuns, 0);
  assert.equal(clock.now(), 110);
});

test('release failure after a successful callback returns the callback result', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(3);
  const releaseErr = new Error('release failed');
  client.release = () => {
    client.releases += 1;
    throw releaseErr;
  };
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    clock,
    connect: async () => client,
  });

  assert.equal(
    await controller.acquire({ timeoutMs: 1_000 }, async () => 'ok'),
    'ok',
  );
  assert.equal(client.releases, 1);
});

test('callback error beats a release error on failure', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(4);
  const callbackErr = new Error('callback failed');
  const releaseErr = new Error('release failed');
  client.release = () => {
    client.releases += 1;
    throw releaseErr;
  };
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    clock,
    connect: async () => client,
  });

  await assert.rejects(
    () =>
      controller.acquire({ timeoutMs: 1_000 }, async () => {
        throw callbackErr;
      }),
    (error: unknown) => {
      assert.equal(error, callbackErr);
      return true;
    },
  );
  assert.equal(client.releases, 1);
});

test('late connect after queue timeout releases exactly once', async () => {
  const clock = new FakeClock();
  const holdGate = createConnectGate();
  const lateGate = createConnectGate();
  let connectIndex = 0;
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 200,
    clock,
    connect: () => (connectIndex++ === 0 ? holdGate.promise : lateGate.promise),
  });

  void controller.acquire({ timeoutMs: 10_000 }, async () => 'hold');
  holdGate.resolve(createFakeClient(1));
  await Promise.resolve();

  const timedOut = controller.acquire({ timeoutMs: 50 }, async () => 'late');
  await Promise.resolve();

  clock.tick(50);
  await assert.rejects(timedOut, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    return true;
  });

  const lateClient = createFakeClient(5);
  lateGate.resolve(lateClient);
  await Promise.resolve();
  assert.equal(lateClient.releases, 1);
  assert.equal(connectIndex, 2);
});

test('rejects new admissions after close', async () => {
  const clock = new FakeClock();
  const controller = createAdmissionController({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 1_000,
    clock,
    connect: async () => createFakeClient(1),
  });

  controller.close();

  await assert.rejects(
    () => controller.acquire({ timeoutMs: 1_000 }, async () => 'nope'),
    (error: unknown) =>
      error instanceof DatabaseAdmissionError && error.category === 'closed',
  );
});
