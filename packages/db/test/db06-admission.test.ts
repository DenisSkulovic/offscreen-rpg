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
    connect: () => gates[connectIndex++]!.promise,
  });

  const order: number[] = [];
  const first = controller.acquire({ timeoutMs: 5_000 }, async (client) => {
    order.push(client.id);
    return 'first';
  });
  gates[0]!.resolve(createFakeClient(1));
  await Promise.resolve();

  const second = controller.acquire({ timeoutMs: 5_000 }, async (client) => {
    order.push(client.id);
    return 'second';
  });
  await Promise.resolve();

  assert.deepEqual(order, [1]);
  assert.equal(await first, 'first');
  gates[1]!.resolve(createFakeClient(2));
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

  const blocked = controller.acquire({ timeoutMs: 5_000 }, async () => 'blocked');
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

  const pending = controller.acquire({ timeoutMs: 5_000 }, async () => 'pending');
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