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

type RedisLifecycleEvent = 'error' | 'ready' | 'end';

type BufferedListener = Readonly<{
  event: RedisLifecycleEvent;
  listener: (...args: unknown[]) => void;
}>;

/**
 * Listener registration is independent of SDK construction. Subscriptions made
 * before connect() attach to the client before the socket attempt starts.
 * reconnectStrategy stays false: this package owns reconnect.
 */
export function createBufferedRedisLifecycleClient(
  settings: RedisConnectionSettings,
  onClient?: (client: RedisClientType) => void,
): RedisLifecycleClient {
  const pending: BufferedListener[] = [];
  let client: RedisClientType | undefined;

  function attach(event: RedisLifecycleEvent, listener: BufferedListener['listener']) {
    client?.on(event, listener as never);
  }

  return {
    get isOpen() {
      return client?.isOpen ?? false;
    },
    get isReady() {
      return client?.isReady ?? false;
    },
    on(event, listener) {
      pending.push({ event, listener });
      attach(event, listener);
    },
    off(event, listener) {
      const index = pending.findIndex(
        (item) => item.event === event && item.listener === listener,
      );
      if (index >= 0) {
        pending.splice(index, 1);
      }
      client?.off(event, listener as never);
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
        for (const item of pending) {
          attach(item.event, item.listener);
        }
        client.on('error', () => {});
        onClient?.(client);
      }
      await client.connect();
    },
    async close() {
      if (client?.isOpen) {
        await client.close();
      }
    },
  };
}

export function createDefaultRedisClientFactory(): RedisClientFactory {
  return (settings) => createBufferedRedisLifecycleClient(settings);
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
  let generation = 0;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let connectInFlight: Promise<void> | null = null;

  function isCurrent(token: number) {
    return !closed && token === generation;
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== undefined) {
      clearTimer(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function attachClientListeners(next: RedisLifecycleClient, token: number) {
    const onError = () => {
      if (!isCurrent(token)) {
        return;
      }
      state = 'degraded';
      scheduleReconnect();
    };
    const onReady = () => {
      if (!isCurrent(token) || !next.isReady) {
        return;
      }
      reconnectAttempt = 0;
      clearReconnectTimer();
      state = 'ready';
    };
    const onEnd = () => {
      if (!isCurrent(token)) {
        return;
      }
      state = 'degraded';
      scheduleReconnect();
    };
    next.on('error', onError);
    next.on('ready', onReady);
    next.on('end', onEnd);
    return { onError, onReady, onEnd };
  }

  function detachClientListeners(
    next: RedisLifecycleClient | null,
    listeners: ReturnType<typeof attachClientListeners> | null,
  ) {
    if (!next?.off || !listeners) {
      return;
    }
    next.off('error', listeners.onError);
    next.off('ready', listeners.onReady);
    next.off('end', listeners.onEnd);
  }

  let activeListeners: ReturnType<typeof attachClientListeners> | null = null;

  function scheduleReconnect() {
    if (closed || !settings) {
      return;
    }
    if (reconnectTimer !== undefined || connectInFlight) {
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

  function attemptConnect(): Promise<void> {
    if (closed || !settings) {
      return Promise.resolve();
    }
    if (connectInFlight) {
      return connectInFlight;
    }
    const token = ++generation;
    const previous = client;
    const previousListeners = activeListeners;
    client = null;
    activeListeners = null;
    detachClientListeners(previous, previousListeners);
    const next = clientFactory(settings);
    const listeners = attachClientListeners(next, token);
    client = next;
    activeListeners = listeners;
    state = 'connecting';
    connectInFlight = (async () => {
      try {
        if (previous?.isOpen) {
          try {
            await previous.close();
          } catch {
            // The replaced generation must not block the new attempt.
          }
        }
        if (!isCurrent(token)) {
          return;
        }
        await next.connect();
        if (!isCurrent(token)) {
          if (next.isOpen) {
            await next.close().catch(() => {});
          }
          return;
        }
        if (next.isReady) {
          reconnectAttempt = 0;
          clearReconnectTimer();
          state = 'ready';
        } else {
          state = 'degraded';
          scheduleReconnect();
        }
      } catch {
        if (!isCurrent(token)) {
          return;
        }
        state = 'degraded';
        scheduleReconnect();
      } finally {
        connectInFlight = null;
        if (isCurrent(token) && state === 'degraded') {
          scheduleReconnect();
        }
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
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<void>((resolve) => {
      deadlineTimer = setTimer(() => resolve(), settings.connectTimeoutMs);
    });
    await Promise.race([attemptConnect(), deadline]);
    if (deadlineTimer !== undefined) {
      clearTimer(deadlineTimer);
    }
  }

  async function close(): Promise<void> {
    if (state === 'disabled') {
      return;
    }
    closed = true;
    generation += 1;
    clearReconnectTimer();
    state = 'closed';
    const active = client;
    detachClientListeners(active, activeListeners);
    activeListeners = null;
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
      return state === 'ready' && client?.isReady === true && !closed;
    },
    getClient() {
      return state === 'ready' && client?.isReady === true && !closed
        ? client
        : null;
    },
  };
}

export function createRedisConnectionFromRedisEnv(
  env: Record<string, string | undefined>,
  options: RedisConnectionOptions = {},
): RedisConnection {
  return createRedisConnection(filterRedisEnv(env), options);
}
