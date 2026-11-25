import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DatabaseAdmissionError,
  type AdmissionClock,
  type ReleasableClient,
} from '../src/connection/admission';
import {
  createManagedClientRuntime,
  safeBackgroundErrorSink,
} from '../src/connection/managed-client';

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

type FakeClient = ReleasableClient & {
  id: number;
  releases: number;
  lastReleaseArg: Error | boolean | undefined;
};

function createFakeClient(id: number): FakeClient {
  return {
    id,
    releases: 0,
    lastReleaseArg: undefined,
    release(err?: Error | boolean) {
      this.releases += 1;
      this.lastReleaseArg = err;
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

function createStructuralRuntime(
  clock: FakeClock,
  connect: () => Promise<FakeClient>,
  end: () => Promise<void>,
) {
  return createManagedClientRuntime({
    maxActive: 1,
    maxQueued: 2,
    acquireTimeoutMs: 1_000,
    clock,
    connect,
    end,
  });
}

test('structural fake connect, release and end without pg Pool', async () => {
  const clock = new FakeClock();
  let endCalls = 0;
  const gate = createConnectGate();
  const runtime = createStructuralRuntime(
    clock,
    () => gate.promise,
    async () => {
      endCalls += 1;
    },
  );

  const work = runtime.withClient({ timeoutMs: 5_000 }, async (client) => {
    assert.equal(typeof client.release, 'function');
    return client.id;
  });
  gate.resolve(createFakeClient(1));
  assert.equal(await work, 1);

  await runtime.close();
  assert.equal(endCalls, 1);
});

test('callback throw still releases the client once', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(1);
  const runtime = createStructuralRuntime(
    clock,
    async () => client,
    async () => {},
  );

  await assert.rejects(
    () =>
      runtime.withClient({ timeoutMs: 5_000 }, async () => {
        throw new Error('callback failed');
      }),
    /callback failed/,
  );
  assert.equal(client.releases, 1);
});

test('callback pending after admission deadline retains permit until settlement', async () => {
  const clock = new FakeClock();
  const gate = createConnectGate();
  const runtime = createManagedClientRuntime({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 50,
    clock,
    connect: () => gate.promise,
    end: async () => {},
  });

  let callbackRuns = 0;
  const pending = runtime.withClient({ timeoutMs: 5_000 }, async () => {
    callbackRuns += 1;
    return 'late';
  });

  clock.tick(50);
  await assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    return true;
  });

  const blocked = runtime.withClient({ timeoutMs: 5_000 }, async () => 'nope');
  await assert.rejects(blocked, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'saturated');
    return true;
  });

  const client = createFakeClient(2);
  gate.resolve(client);
  await Promise.resolve();
  assert.equal(client.releases, 1);
  assert.equal(callbackRuns, 0);
});

test('discard marks lease tainted with release(true)', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(3);
  const runtime = createStructuralRuntime(
    clock,
    async () => client,
    async () => {},
  );

  await runtime.withClient(
    { timeoutMs: 5_000 },
    async (_c, _remaining, discard) => {
      discard();
      return 'done';
    },
  );

  assert.equal(client.releases, 1);
  assert.equal(client.lastReleaseArg, true);
});

test('delayed acquisition after close releases exactly once and skips callback', async () => {
  const clock = new FakeClock();
  const gate = createConnectGate();
  let connectCalls = 0;
  const runtime = createManagedClientRuntime({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 10_000,
    clock,
    connect: () => {
      connectCalls += 1;
      return gate.promise;
    },
    end: async () => {},
  });

  let callbackRuns = 0;
  const pending = runtime.withClient({ timeoutMs: 10_000 }, async () => {
    callbackRuns += 1;
    return 'nope';
  });
  await Promise.resolve();

  const pendingResult = assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'closed');
    return true;
  });

  const closing = runtime.close();
  await pendingResult;

  const client = createFakeClient(4);
  gate.resolve(client);
  await Promise.resolve();
  await closing;

  assert.equal(connectCalls, 1);
  assert.equal(client.releases, 1);
  assert.equal(callbackRuns, 0);
});

test('refused acquire never invokes the callback', async () => {
  const clock = new FakeClock();
  const gate = createConnectGate();
  const runtime = createManagedClientRuntime({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 100,
    clock,
    connect: () => gate.promise,
    end: async () => {},
  });

  let callbackRuns = 0;
  const pending = runtime.withClient({ timeoutMs: 5_000 }, async () => {
    callbackRuns += 1;
    return 'nope';
  });

  clock.tick(100);
  await assert.rejects(pending);

  const client = createFakeClient(5);
  gate.resolve(client);
  await Promise.resolve();

  assert.equal(callbackRuns, 0);
  assert.equal(client.releases, 1);
});

test('double close calls end once', async () => {
  const clock = new FakeClock();
  let endCalls = 0;
  const runtime = createStructuralRuntime(
    clock,
    async () => createFakeClient(6),
    async () => {
      endCalls += 1;
    },
  );

  await Promise.all([runtime.close(), runtime.close()]);
  assert.equal(endCalls, 1);
});

test('close waits for a running callback before ending the pool', async () => {
  const clock = new FakeClock();
  let endCalls = 0;
  const gate = createConnectGate();
  const runtime = createStructuralRuntime(
    clock,
    () => gate.promise,
    async () => {
      endCalls += 1;
    },
  );

  let releaseCallback!: () => void;
  const hold = new Promise<void>((resolve) => {
    releaseCallback = resolve;
  });

  const work = runtime.withClient({ timeoutMs: 10_000 }, async () => {
    await hold;
    return 'done';
  });
  gate.resolve(createFakeClient(7));
  await Promise.resolve();

  let closeSettled = false;
  const closing = runtime.close().then(() => {
    closeSettled = true;
  });
  await Promise.resolve();
  assert.equal(closeSettled, false);
  assert.equal(endCalls, 0);

  releaseCallback();
  assert.equal(await work, 'done');
  await closing;
  assert.equal(closeSettled, true);
  assert.equal(endCalls, 1);
});

test('safe background error sink does not throw', () => {
  const sink = safeBackgroundErrorSink(() => {
    throw new Error('handler blew up');
  });
  assert.doesNotThrow(() => sink(new Error('idle failure')));
});

test('release failure after success still returns the callback result', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(9);
  client.release = () => {
    client.releases += 1;
    throw new Error('release failed');
  };
  const runtime = createStructuralRuntime(
    clock,
    async () => client,
    async () => {},
  );

  assert.equal(
    await runtime.withClient({ timeoutMs: 5_000 }, async () => 'payload'),
    'payload',
  );
  assert.equal(client.releases, 1);
});

test('close waits for active permits before ending the pool', async () => {
  const clock = new FakeClock();
  let endCalls = 0;
  const gate = createConnectGate();
  const runtime = createManagedClientRuntime({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 50,
    clock,
    connect: () => gate.promise,
    end: async () => {
      endCalls += 1;
    },
  });

  let callbackRuns = 0;
  const pending = runtime.withClient({ timeoutMs: 5_000 }, async () => {
    callbackRuns += 1;
    return 'late';
  });

  clock.tick(50);
  await assert.rejects(pending, (error: unknown) => {
    assert.ok(error instanceof DatabaseAdmissionError);
    assert.equal(error.category, 'timeout');
    return true;
  });

  const closing = runtime.close();
  await Promise.resolve();
  assert.equal(endCalls, 0);

  const client = createFakeClient(10);
  gate.resolve(client);
  await closing;
  assert.equal(endCalls, 1);
  assert.equal(client.releases, 1);
  assert.equal(callbackRuns, 0);
});

test('callback throw undefined is a rejection', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(11);
  const runtime = createStructuralRuntime(
    clock,
    async () => client,
    async () => {},
  );

  await assert.rejects(
    () =>
      runtime.withClient({ timeoutMs: 5_000 }, async () => {
        throw undefined;
      }),
    (error: unknown) => {
      assert.equal(error, undefined);
      return true;
    },
  );
  assert.equal(client.releases, 1);
});

test('synchronous connect throw releases the permit once', async () => {
  const clock = new FakeClock();
  let connectCalls = 0;
  const runtime = createManagedClientRuntime({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    clock,
    connect: () => {
      connectCalls += 1;
      if (connectCalls === 1) {
        throw new Error('sync connect failure');
      }
      return Promise.resolve(createFakeClient(12));
    },
    end: async () => {},
  });

  await assert.rejects(
    () => runtime.withClient({ timeoutMs: 5_000 }, async () => 'nope'),
    /sync connect failure/,
  );
  assert.equal(
    await runtime.withClient({ timeoutMs: 5_000 }, async () => 'second'),
    'second',
  );
});

test('probe race discard does not prematurely release in-flight work', async () => {
  const clock = new FakeClock();
  const client = createFakeClient(8);
  const runtime = createStructuralRuntime(
    clock,
    async () => client,
    async () => {},
  );

  const probeTimeoutMs = 50;
  let discardLease: (() => void) | undefined;
  let acquired = false;

  let releaseQuery!: () => void;
  const queryHang = new Promise<void>((resolve) => {
    releaseQuery = resolve;
  });

  const work = runtime.withClient(
    { timeoutMs: probeTimeoutMs },
    async (_c, _r, discard) => {
      acquired = true;
      discardLease = discard;
      await queryHang;
    },
  );

  let probeTimer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  const probe = new Promise<void>((resolve, reject) => {
    probeTimer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      if (acquired && discardLease) {
        discardLease();
      }
      reject(new DatabaseAdmissionError('timeout'));
      void work.catch(() => {});
    }, probeTimeoutMs);
  });

  await assert.rejects(probe, /timeout/);
  assert.equal(client.releases, 0);

  releaseQuery();
  await work;
  assert.equal(client.releases, 1);
  assert.equal(client.lastReleaseArg, true);
  if (probeTimer !== undefined) {
    clearTimeout(probeTimer);
  }
});
