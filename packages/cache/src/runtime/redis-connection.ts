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

type RedisListenerEvent = 'error' | 'ready' | 'end';

type PendingRedisListener = Readonly<{
  event: RedisListenerEvent;
  listener: (...args: unknown[]) => void;
}>;

export type LazyRedisLifecycleClientHooks = Readonly<{
  createSdkClient?: (
    settings: RedisConnectionSettings,
  ) => Promise<RedisClientType>;
  onSdkCreated?: (client: RedisClientType) => void;
  onSdkClosed?: () => void;
}>;

/**
 * Wraps lazy SDK construction so lifecycle listeners registered before
 * connect() are still attached to the real client.
 */
export function createLazyRedisLifecycleClient(
  settings: RedisConnectionSettings,
  hooks: LazyRedisLifecycleClientHooks = {},
): RedisLifecycleClient {
  let client: RedisClientType | undefined;
  const pendingListeners: PendingRedisListener[] = [];

  const flushPendingListeners = () => {
    if (!client) {
      return;
    }
    for (const { event, listener } of pendingListeners) {
      client.on(event, listener as never);
    }
    pendingListeners.length = 0;
  };

  const defaultCreateSdkClient = async (
    activeSettings: RedisConnectionSettings,
  ) => {
    const { createClient } = await import('redis');
    return createClient({
      url: activeSettings.url,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: activeSettings.connectTimeoutMs,
        reconnectStrategy: false,
      },
    });
  };

  return {
    get isOpen() {
      return client?.isOpen ?? false;
    },
    get isReady() {
      return client?.isReady ?? false;
    },
    async connect() {
      if (!client) {
        const createSdkClient = hooks.createSdkClient ?? defaultCreateSdkClient;
        const created = await createSdkClient(settings);
        client = created as RedisClientType;
        client.on('error', () => {});
        hooks.onSdkCreated?.(client);
        flushPendingListeners();
      }
      const active = client;
      await active.connect();
    },
    async close() {
      pendingListeners.length = 0;
      const active = client;
      client = undefined;
      try {
        if (active?.isOpen) {
          await active.close();
        }
      } finally {
        hooks.onSdkClosed?.();
      }
    },
    on(event, listener) {
      if (client) {
        client.on(event, listener as never);
        return;
      }
      pendingListeners.push({ event, listener });
    },
    off(event, listener) {
      if (client) {
        client.off(event, listener as never);
        return;
      }
      const index = pendingListeners.findIndex(
        (pending) => pending.event === event && pending.listener === listener,
      );
      if (index >= 0) {
        pendingListeners.splice(index, 1);
      }
    },
  };
}

function filterRedisEnv(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('REDIS_')),
  );
}

export function createDefaultRedisClientFactory(): RedisClientFactory {
  return (settings) => createLazyRedisLifecycleClient(settings);
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
  let connectionGeneration = 0;
  let startupSettle: (() => void) | null = null;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;

  type WrappedListeners = Readonly<{
    error: () => void;
    ready: () => void;
    end: () => void;
  }>;
  let wrappedListeners: WrappedListeners | null = null;

  function trySettleStartup() {
    if (!startupSettle) {
      return;
    }
    if (
      state === 'ready' ||
      state === 'degraded' ||
      state === 'closed' ||
      closed
    ) {
      if (startupTimer !== undefined) {
        clearTimer(startupTimer);
        startupTimer = undefined;
      }
      const settle = startupSettle;
      startupSettle = null;
      settle();
    }
  }

  const onError = () => {
    if (closed || state === 'closed') {
      return;
    }
    state = 'degraded';
    trySettleStartup();
    void discardCurrentClient();
    scheduleReconnect();
  };

  const onReady = () => {
    if (closed || state === 'closed') {
      return;
    }
    reconnectAttempt = 0;
    clearReconnectTimer();
    state = 'ready';
    trySettleStartup();
  };

  const onEnd = () => {
    if (closed || state === 'closed') {
      return;
    }
    state = 'degraded';
    trySettleStartup();
    void discardCurrentClient();
    scheduleReconnect();
  };

  function clearReconnectTimer() {
    if (reconnectTimer !== undefined) {
      clearTimer(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function attachClientListeners(
    next: RedisLifecycleClient,
    generation: number,
  ) {
    const guard = (run: () => void) => () => {
      if (closed || generation !== connectionGeneration) {
        return;
      }
      run();
    };
    wrappedListeners = {
      error: guard(onError),
      ready: guard(onReady),
      end: guard(onEnd),
    };
    next.on('error', wrappedListeners.error);
    next.on('ready', wrappedListeners.ready);
    next.on('end', wrappedListeners.end);
  }

  function detachClientListeners(next: RedisLifecycleClient | null) {
    if (!next?.off || !wrappedListeners) {
      wrappedListeners = null;
      return;
    }
    next.off('error', wrappedListeners.error);
    next.off('ready', wrappedListeners.ready);
    next.off('end', wrappedListeners.end);
    wrappedListeners = null;
  }

  async function discardCurrentClient() {
    const active = client;
    client = null;
    if (!active) {
      return;
    }
    detachClientListeners(active);
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

  function installFreshClient(): RedisLifecycleClient | null {
    if (!settings) {
      return null;
    }
    connectionGeneration += 1;
    const generation = connectionGeneration;
    const next = clientFactory(settings);
    client = next;
    attachClientListeners(next, generation);
    return next;
  }

  async function attemptConnect(): Promise<void> {
    if (closed || !settings) {
      return;
    }
    if (connectInFlight) {
      return connectInFlight;
    }

    let active = client;
    if (!active) {
      active = installFreshClient();
    }
    if (!active) {
      state = 'degraded';
      trySettleStartup();
      scheduleReconnect();
      return;
    }

    if (state !== 'ready') {
      state = 'connecting';
    }

    const generation = connectionGeneration;
    connectInFlight = (async () => {
      try {
        await active.connect();
        if (closed || generation !== connectionGeneration) {
          return;
        }
        if (active.isReady) {
          onReady();
        }
      } catch {
        if (closed || generation !== connectionGeneration) {
          return;
        }
        await discardCurrentClient();
        state = 'degraded';
        trySettleStartup();
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

    await new Promise<void>((resolve) => {
      startupSettle = resolve;
      if (
        state === 'ready' ||
        state === 'degraded' ||
        state === 'closed' ||
        closed
      ) {
        trySettleStartup();
        return;
      }
      startupTimer = setTimer(() => {
        trySettleStartup();
      }, settings.connectTimeoutMs);
      startupTimer.unref?.();
    });
  }

  async function close(): Promise<void> {
    if (state === 'disabled') {
      return;
    }
    closed = true;
    connectionGeneration += 1;
    clearReconnectTimer();
    if (startupTimer !== undefined) {
      clearTimer(startupTimer);
      startupTimer = undefined;
    }
    trySettleStartup();
    state = 'closed';

    const active = client;
    detachClientListeners(active);
    client = null;
    const inFlight = connectInFlight;
    connectInFlight = null;

    // Generation fence already suppresses late connect; avoid blocking close on hung connects.
    void inFlight?.catch(() => undefined);

    if (active) {
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
