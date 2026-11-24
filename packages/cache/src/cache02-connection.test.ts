import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeReconnectDelayMs,
  parseRedisConnectionEnv,
} from './runtime/redis-config.js';
import {
  createRedisConnection,
  type RedisClientFactory,
  type RedisLifecycleClient,
} from './runtime/redis-connection.js';

type FakeClientOptions = Readonly<{
  shouldFailConnect?: (attempt: number) => boolean;
}>;

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
  holder: { current: FakeClient | null },
): RedisClientFactory {
  return (settings) => {
    void settings;
    const client = createFakeClient(options);
    holder.current = client;
    return client;
  };
}

type TimerJob = Readonly<{ delayMs: number; run: () => void }>;

function createControllableTimers() {
  const jobs: TimerJob[] = [];
  return {
    setTimer(fn: () => void, delayMs: number) {
      jobs.push({ delayMs, run: fn });
      return delayMs as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer() {},
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
  const holder: { current: FakeClient | null } = { current: null };
  let created = 0;
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: () => {
      created += 1;
      const generation = created;
      const client = createFakeClient({
        shouldFailConnect: () => generation === 1,
      });
      holder.current = client;
      return client;
    },
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
  assert.equal(holder.current?.connectAttempts, 1);
  assert.equal(connection.admitsTraffic(), true);

  await connection.close();
  assert.equal(connection.state, 'closed');
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

test('listeners registered before SDK connect survive a fresh generation', async () => {
  const events: string[] = [];
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: () => {
      let ready = false;
      const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
      return {
        get isOpen() {
          return ready;
        },
        get isReady() {
          return ready;
        },
        on(event: string, listener: (...args: unknown[]) => void) {
          events.push(`on:${event}`);
          const bucket = listeners.get(event) ?? new Set();
          bucket.add(listener);
          listeners.set(event, bucket);
        },
        async connect() {
          events.push('connect');
          ready = true;
          for (const listener of listeners.get('ready') ?? []) {
            listener();
          }
        },
        async close() {
          ready = false;
        },
      };
    },
  });
  await connection.start();
  assert.equal(connection.admitsTraffic(), true);
  assert.ok(events.indexOf('on:ready') < events.indexOf('connect'));
  await connection.close();
});

test('stale generation ready does not admit traffic after socket loss', async () => {
  const timers = createControllableTimers();
  const clients: FakeClient[] = [];
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: () => {
      const generation = clients.length;
      const client = createFakeClient({
        shouldFailConnect: () => generation > 0,
      });
      clients.push(client);
      return client;
    },
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  await connection.start();
  assert.equal(connection.state, 'ready');
  clients[0]?.simulateEnd();
  await timers.runNext();
  clients[0]?.simulateError();
  assert.equal(connection.state, 'degraded');
  assert.equal(connection.admitsTraffic(), false);
  await connection.close();
});

test('shutdown during connect is not resurrected by late completion', async () => {
  let release: (() => void) | undefined;
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: () => ({
      isOpen: false,
      isReady: false,
      on() {},
      async connect() {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
      async close() {},
    }),
  });
  const starting = connection.start();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await connection.close();
  release?.();
  await starting;
  assert.equal(connection.state, 'closed');
  assert.equal(connection.admitsTraffic(), false);
});
