import type { RedisClientType } from 'redis';

import {
  computeReconnectDelayMs,
  parseRedisConnectionEnv,
  resolveRedisConnectionSettings,
  type RedisConnectionSettings,
} from './redis-config.js';

export type RedisConnectionState =
  'disabled' | 'connecting' | 'ready' | 'degraded' | 'closed';

export type RedisLifecycleClient = Readonly<{
  connect(): Promise<void>;
  close(): Promise<void>;
  isOpen: boolean;
  isReady: boolean;
  on(
    event: 'error' | 'ready' | 'end',
    listener: (...args: unknown[]) => void,
  ): void;
  off?(
    event: 'error' | 'ready' | 'end',
    listener: (...args: unknown[]) => void,
  ): void;
}>;

export type RedisClientFactory = (
  settings: RedisConnectionSettings,
) => RedisLifecycleClient;

export type RedisConnection = Readonly<{
  readonly state: RedisConnectionState;
  readonly settings: RedisConnectionSettings | null;
  start(): Promise<void>;
  close(): Promise<void>;
  admitsTraffic(): boolean;
  getClient(): RedisLifecycleClient | null;
}>;

type ScheduleTimeout = (
  handler: () => void,
  delayMs: number,
) => ReturnType<typeof setTimeout>;

type RedisConnectionOptions = Readonly<{
  clientFactory?: RedisClientFactory;
  random?: () => number;
  setTimer?: ScheduleTimeout;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
}>;

function filterRedisEnv(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('REDIS_')),
  );
}

export function createDefaultRedisClientFactory(): RedisClientFactory {
  return (settings) => {
    let client: RedisClientType | undefined;
    return {
      get isOpen() {
        return client?.isOpen ?? false;
      },
      get isReady() {
        return client?.isReady ?? false;
      },
      async connect() {
        if (!client) {
          const { createClient } = await import('redis');
          client = createClient({
            url: settings.url,
            disableOfflineQueue: true,
            socket: {
              connectTimeout: settings.connectTimeoutMs,
              reconnectStrategy: false,
            },
          });
          client.on('error', () => {});
        }
        await client.connect();
      },
      async close() {
        if (client?.isOpen) {
          await client.close();
        }
      },
      on(event, listener) {
        client?.on(event, listener as never);
      },
      off(event, listener) {
        client?.off(event, listener as never);
      },
    };
  };
}

export function createRedisConnection(
  env: Record<string, string | undefined>,
  options: RedisConnectionOptions = {},
): RedisConnection {
  const parsed = parseRedisConnectionEnv(env);
  const settings = resolveRedisConnectionSettings(parsed);
  const clientFactory =
    options.clientFactory ?? createDefaultRedisClientFactory();
  const random = options.random ?? Math.random;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;

  let state: RedisConnectionState = settings ? 'degraded' : 'disabled';
  let client: RedisLifecycleClient | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let connectInFlight: Promise<void> | null = null;

  const onError = () => {
    if (closed) {
      return;
    }
    if (state === 'closed') {
      return;
    }
    state = 'degraded';
    scheduleReconnect();
  };

  const onReady = () => {
    if (closed) {
      return;
    }
    reconnectAttempt = 0;
    clearReconnectTimer();
    state = 'ready';
  };

  const onEnd = () => {
    if (closed) {
      return;
    }
    state = 'degraded';
    scheduleReconnect();
  };

  function clearReconnectTimer() {
    if (reconnectTimer !== undefined) {
      clearTimer(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function attachClientListeners(next: RedisLifecycleClient) {
    next.on('error', onError);
    next.on('ready', onReady);
    next.on('end', onEnd);
  }

  function detachClientListeners(next: RedisLifecycleClient | null) {
    if (!next?.off) {
      return;
    }
    next.off('error', onError);
    next.off('ready', onReady);
    next.off('end', onEnd);
  }

  function scheduleReconnect() {
    if (closed || !settings) {
      return;
    }
    if (reconnectTimer !== undefined) {
      return;
    }
    const delayMs = computeReconnectDelayMs(reconnectAttempt, random);
    reconnectAttempt += 1;
    reconnectTimer = setTimer(() => {
      reconnectTimer = undefined;
      void attemptConnect();
    }, delayMs);
    reconnectTimer.unref?.();
  }

  async function attemptConnect(): Promise<void> {
    if (closed || !settings) {
      return;
    }
    if (connectInFlight) {
      return connectInFlight;
    }
    if (!client) {
      client = clientFactory(settings);
      attachClientListeners(client);
    }
    if (state !== 'ready') {
      state = 'connecting';
    }
    const active = client;
    if (!active) {
      state = 'degraded';
      scheduleReconnect();
      return;
    }
    connectInFlight = (async () => {
      try {
        await active.connect();
        if (active.isReady) {
          onReady();
        }
      } catch {
        state = 'degraded';
        scheduleReconnect();
      } finally {
        connectInFlight = null;
      }
    })();
    return connectInFlight;
  }

  async function start(): Promise<void> {
    if (state === 'disabled' || !settings) {
      state = 'disabled';
      return;
    }
    if (closed) {
      throw new Error('RedisConnectionClosed');
    }
    void attemptConnect();
    await Promise.race([
      (async () => {
        while (!closed && state !== 'ready' && state !== 'degraded') {
          await Promise.resolve();
        }
      })(),
      new Promise<void>((resolve) => {
        setTimer(() => resolve(), settings.connectTimeoutMs);
      }),
    ]);
  }

  async function close(): Promise<void> {
    if (state === 'disabled') {
      return;
    }
    closed = true;
    clearReconnectTimer();
    state = 'closed';
    const active = client;
    detachClientListeners(active);
    client = null;
    if (active?.isOpen) {
      try {
        await active.close();
      } catch {
        // Shutdown must not throw after admissions stop.
      }
    }
  }

  return {
    get state() {
      return state;
    },
    get settings() {
      return settings;
    },
    start,
    close,
    admitsTraffic() {
      return state === 'ready' && client !== null && !closed;
    },
    getClient() {
      return state === 'ready' && client !== null && !closed ? client : null;
    },
  };
}

export function createRedisConnectionFromRedisEnv(
  env: Record<string, string | undefined>,
  options: RedisConnectionOptions = {},
): RedisConnection {
  return createRedisConnection(filterRedisEnv(env), options);
}
