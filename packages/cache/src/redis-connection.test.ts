import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeReconnectDelayMs,
  parseRedisConnectionEnv,
} from './redis/redis-config.js';
import {
  createLazyRedisLifecycleClient,
  createRedisConnection,
  type RedisClientFactory,
  type RedisLifecycleClient,
} from './redis/redis-connection.js';

type FakeClientOptions = Readonly<{
  shouldFailConnect?: (attempt: number) => boolean;
}>;

function failConnectOnce(): (attempt: number) => boolean {
  let failed = false;
  return (_attempt) => {
    if (failed) {
      return false;
    }
    failed = true;
    return true;
  };
}

type FakeClient = RedisLifecycleClient &
  Readonly<{
    connectAttempts: number;
    simulateError(): void;
    simulateEnd(): void;
  }>;

function createFakeClient(options: FakeClientOptions = {}): FakeClient {
  let open = false;
  let ready = false;
  let connectAttempts = 0;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const emit = (event: string) => {
    for (const listener of listeners.get(event) ?? []) {
      listener();
    }
  };

  return {
    get connectAttempts() {
      return connectAttempts;
    },
    get isOpen() {
      return open;
    },
    get isReady() {
      return ready;
    },
    async connect() {
      connectAttempts += 1;
      if (options.shouldFailConnect?.(connectAttempts)) {
        throw new Error('FakeRedisConnectFailed');
      }
      open = true;
      ready = true;
      emit('ready');
    },
    async close() {
      open = false;
      ready = false;
      emit('end');
    },
    on(event, listener) {
      let bucket = listeners.get(event);
      if (!bucket) {
        bucket = new Set();
        listeners.set(event, bucket);
      }
      bucket.add(listener);
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
    },
    simulateError() {
      emit('error');
    },
    simulateEnd() {
      open = false;
      ready = false;
      emit('end');
    },
  };
}

function fakeFactory(
  options: FakeClientOptions,
  holder: { current: FakeClient | null; creations?: number },
): RedisClientFactory {
  return (settings) => {
    void settings;
    holder.creations = (holder.creations ?? 0) + 1;
    const client = createFakeClient(options);
    holder.current = client;
    return client;
  };
}

type TimerJob = Readonly<{ delayMs: number; run: () => void; id: number }>;

function createControllableTimers() {
  const jobs: TimerJob[] = [];
  let nextId = 0;
  return {
    jobs,
    setTimer(fn: () => void, delayMs: number) {
      const id = nextId;
      nextId += 1;
      jobs.push({ delayMs, run: fn, id });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer(handle: ReturnType<typeof setTimeout>) {
      const id = handle as unknown as number;
      const index = jobs.findIndex((job) => job.id === id);
      if (index >= 0) {
        jobs.splice(index, 1);
      }
    },
    async runNext() {
      jobs.sort((left, right) => left.delayMs - right.delayMs);
      const next = jobs.shift();
      next?.run();
      await Promise.resolve();
    },
    async runAll() {
      while (jobs.length > 0) {
        await this.runNext();
      }
    },
  };
}

const configuredEnv = {
  REDIS_URL: 'redis://127.0.0.1:6379',
  REDIS_CONNECT_TIMEOUT_MS: '100',
} as const;

test('unconfigured Redis resolves to disabled without opening a client', async () => {
  const connection = createRedisConnection(
    { REDIS_KEY_PREFIX: 'offscreen' },
    { clientFactory: () => assert.fail('client must not be created') },
  );
  assert.equal(connection.state, 'disabled');
  assert.equal(connection.settings, null);
  await connection.start();
  assert.equal(connection.state, 'disabled');
  assert.equal(connection.admitsTraffic(), false);
  await connection.close();
  assert.equal(connection.state, 'disabled');
});

test('invalid configuration fails explicitly', () => {
  assert.throws(
    () =>
      parseRedisConnectionEnv({
        REDIS_URL: 'redis://127.0.0.1:6379',
        REDIS_KEY_PREFIX: 'INVALID PREFIX',
      }),
    /REDIS_KEY_PREFIX/,
  );
});

test('reconnect delay stays within the documented 250ms–15s jittered band', () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const delay = computeReconnectDelayMs(attempt, () => 0.5);
    assert.ok(delay >= 250 && delay <= 15_000);
  }
});

test('fake client: initial connection failure then automatic recovery', async () => {
  const timers = createControllableTimers();
  const holder: { current: FakeClient | null; creations?: number } = {
    current: null,
  };
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: fakeFactory(
      { shouldFailConnect: failConnectOnce() },
      holder,
    ),
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  await connection.start();
  assert.equal(connection.state, 'degraded');
  assert.equal(holder.current?.connectAttempts, 1);

  await timers.runAll();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(connection.state, 'ready');
  assert.equal(holder.creations, 2);
  assert.equal(holder.current?.connectAttempts, 1);
  assert.equal(connection.admitsTraffic(), true);

  await connection.close();
  assert.equal(connection.state, 'closed');
});

test('startup waits on timers without microtask busy-spin', async () => {
  const timers = createControllableTimers();
  const holder: { current: FakeClient | null; creations: number } = {
    current: null,
    creations: 0,
  };
  let releaseConnect: (() => void) | undefined;
  const connectGate = new Promise<void>((resolve) => {
    releaseConnect = resolve;
  });

  const delayFactory: RedisClientFactory = () => {
    holder.creations += 1;
    const base = createFakeClient({});
    holder.current = base;
    return {
      ...base,
      async connect() {
        await connectGate;
        await base.connect();
      },
    };
  };

  const connection = createRedisConnection(configuredEnv, {
    clientFactory: delayFactory,
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  const startPromise = connection.start();
  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(connection.state, 'connecting');
    assert.equal(
      timers.jobs.some((job) => job.delayMs === 100),
      true,
    );
    releaseConnect?.();
    await startPromise;
    assert.equal(connection.state, 'ready');
  } finally {
    releaseConnect?.();
    await startPromise.catch(() => undefined);
  }
  await connection.close();
});

test('reconnect uses a fresh client generation after connect failure', async () => {
  const timers = createControllableTimers();
  const holder: { current: FakeClient | null; creations: number } = {
    current: null,
    creations: 0,
  };
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: fakeFactory(
      { shouldFailConnect: failConnectOnce() },
      holder,
    ),
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  await connection.start();
  assert.equal(holder.creations, 1);
  await timers.runAll();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(holder.creations, 2);
  assert.equal(connection.state, 'ready');
  await connection.close();
});

test('lazy lifecycle client installs listeners before SDK connect', async () => {
  const readyListeners = new Set<() => void>();
  const fakeSdk = {
    isOpen: false,
    isReady: true,
    on(event: string, listener: () => void) {
      if (event === 'ready') {
        readyListeners.add(listener);
      }
    },
    off(event: string, listener: () => void) {
      readyListeners.delete(listener);
    },
    async connect() {
      for (const listener of readyListeners) {
        listener();
      }
    },
    async close() {},
  };

  const client = createLazyRedisLifecycleClient(
    {
      url: configuredEnv.REDIS_URL,
      connectTimeoutMs: 100,
      operationTimeoutMs: 100,
      keyPrefix: 'offscreen',
    },
    {
      createSdkClient: async () => fakeSdk as never,
    },
  );

  let readyHeard = false;
  client.on('ready', () => {
    readyHeard = true;
  });
  await client.connect();
  assert.equal(readyHeard, true);
  assert.equal(readyListeners.size, 1);
});

test('close during connect settles startup and schedules no reconnect timer', async () => {
  const timers = createControllableTimers();
  let releaseConnect: (() => void) | undefined;
  const connectGate = new Promise<void>((resolve) => {
    releaseConnect = resolve;
  });
  const factory: RedisClientFactory = () => {
    const base = createFakeClient({});
    return {
      ...base,
      async connect() {
        await connectGate;
        await base.connect();
      },
    };
  };

  const connection = createRedisConnection(configuredEnv, {
    clientFactory: factory,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  const startPromise = connection.start();
  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    await connection.close();
    assert.equal(connection.state, 'closed');
    assert.equal(timers.jobs.length, 0);
    releaseConnect?.();
    await startPromise;
    assert.equal(connection.state, 'closed');
    assert.equal(connection.admitsTraffic(), false);
    await timers.runAll();
    assert.equal(connection.state, 'closed');
  } finally {
    releaseConnect?.();
    await startPromise.catch(() => undefined);
  }
});

test('late connect completion after close cannot resurrect ready admissions', async () => {
  let releaseConnect: (() => void) | undefined;
  const connectGate = new Promise<void>((resolve) => {
    releaseConnect = resolve;
  });
  const factory: RedisClientFactory = () => {
    const base = createFakeClient({});
    return {
      ...base,
      async connect() {
        await connectGate;
        await base.connect();
      },
    };
  };

  const connection = createRedisConnection(configuredEnv, {
    clientFactory: factory,
  });

  const startPromise = connection.start();
  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    await connection.close();
    releaseConnect?.();
    await startPromise;
    assert.equal(connection.state, 'closed');
    assert.equal(connection.admitsTraffic(), false);
  } finally {
    releaseConnect?.();
    await startPromise.catch(() => undefined);
  }
});

test('disconnect clears traffic until a new generation reconnects', async () => {
  const timers = createControllableTimers();
  const holder: { current: FakeClient | null; creations: number } = {
    current: null,
    creations: 0,
  };
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: fakeFactory({}, holder),
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  await connection.start();
  assert.equal(connection.admitsTraffic(), true);
  const beforeDisconnect = holder.creations;

  holder.current?.simulateEnd();
  assert.equal(connection.admitsTraffic(), false);
  assert.equal(connection.state, 'degraded');

  await timers.runAll();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(holder.creations, beforeDisconnect + 1);
  assert.equal(connection.admitsTraffic(), true);
  await connection.close();
});

test('terminal close: no further reconnect attempts after shutdown', async () => {
  const timers = createControllableTimers();
  const holder: { current: FakeClient | null } = { current: null };
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: fakeFactory({}, holder),
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  await connection.start();
  assert.equal(connection.state, 'ready');
  const connectsBeforeClose = holder.current?.connectAttempts ?? 0;

  await connection.close();
  assert.equal(connection.state, 'closed');
  assert.equal(connection.admitsTraffic(), false);

  holder.current?.simulateError();
  holder.current?.simulateEnd();
  await timers.runAll();

  assert.equal(holder.current?.connectAttempts, connectsBeforeClose);
  assert.equal(connection.state, 'closed');
});
