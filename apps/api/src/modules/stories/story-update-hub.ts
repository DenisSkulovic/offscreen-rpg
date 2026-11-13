import { Client } from 'pg';
import {
  STORY_VIEW_NOTIFY_CHANNEL,
  storyUpdateHintSchema,
  type StoryUpdateHint,
} from '@offscreen/contracts/stories';
import type { DatabaseConfig } from '@offscreen/db';
import type { MessageEvent } from '@nestjs/common';
import { EMPTY, Observable, Subject, from, interval, merge, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

const HEARTBEAT_MS = 15_000;
const MAX_STREAMS_PER_STORY = 8;
const MAX_STREAMS_PER_OWNER = 16;
const DEFAULT_RECONNECT_INITIAL_MS = 250;
const DEFAULT_RECONNECT_MAX_MS = 10_000;

type StreamKey = `${string}:${string}`;

type ActiveStream = {
  ownerId: string;
  storyId: string;
  subject: Subject<MessageEvent>;
};

type ListenNotification = {
  channel: string;
  payload?: string | undefined;
};

/** Minimal pg client surface for LISTEN + injectable test fakes. */
export type StoryUpdateListenClient = {
  connect(): Promise<unknown>;
  query(sql: string): Promise<unknown>;
  on(
    event: 'notification',
    listener: (message: ListenNotification) => void,
  ): void;
  on(event: 'error' | 'end', listener: (error?: Error) => void): void;
  removeAllListeners?(): void;
  end(): Promise<void>;
};

export type StoryUpdateHubOptions = {
  createClient?: (config: DatabaseConfig) => StoryUpdateListenClient;
  reconnectInitialMs?: number;
  reconnectMaxMs?: number;
  scheduleReconnect?: (
    fn: () => void,
    ms: number,
  ) => {
    cancel: () => void;
  };
};

/**
 * In-process SSE broker fed by a dedicated PostgreSQL LISTEN connection.
 * Authorization is enforced at subscribe time; hints never include narrative.
 * LISTEN failures reconnect with backoff and signal active SSE clients to refresh.
 */
export function createStoryUpdateHub(
  config: DatabaseConfig,
  options: StoryUpdateHubOptions = {},
) {
  const streams = new Map<StreamKey, Set<ActiveStream>>();
  const createClient =
    options.createClient ??
    ((databaseConfig: DatabaseConfig): StoryUpdateListenClient => {
      const pg = new Client({
        connectionString: databaseConfig.connectionString,
        connectionTimeoutMillis: databaseConfig.connectionTimeoutMillis,
      });
      return {
        connect: () => pg.connect(),
        query: (sql) => pg.query(sql),
        on: (event, listener) => {
          if (event === 'notification') {
            pg.on('notification', (message) => {
              (listener as (message: ListenNotification) => void)({
                channel: message.channel,
                payload: message.payload,
              });
            });
            return;
          }
          pg.on(event, listener as () => void);
        },
        removeAllListeners: () => {
          pg.removeAllListeners();
        },
        end: () => pg.end(),
      };
    });
  const reconnectInitialMs =
    options.reconnectInitialMs ?? DEFAULT_RECONNECT_INITIAL_MS;
  const reconnectMaxMs = options.reconnectMaxMs ?? DEFAULT_RECONNECT_MAX_MS;
  const scheduleReconnect =
    options.scheduleReconnect ??
    ((fn: () => void, ms: number) => {
      const handle = setTimeout(fn, ms);
      return {
        cancel: () => {
          clearTimeout(handle);
        },
      };
    });

  let started = false;
  let closed = false;
  let listenerHealthy = false;
  let reconnectAttempt = 0;
  let reconnectHandle: { cancel: () => void } | null = null;
  let connecting: Promise<void> | null = null;
  let client: StoryUpdateListenClient | null = null;
  let generation = 0;

  function streamKey(ownerId: string, storyId: string): StreamKey {
    return `${ownerId}:${storyId}`;
  }

  function countForOwner(ownerId: string) {
    let total = 0;
    for (const group of streams.values()) {
      for (const stream of group) {
        if (stream.ownerId === ownerId) {
          total += 1;
        }
      }
    }
    return total;
  }

  function publish(hint: StoryUpdateHint) {
    for (const group of streams.values()) {
      for (const stream of group) {
        if (stream.storyId !== hint.storyId) {
          continue;
        }
        stream.subject.next({
          type: 'story-update',
          id: hint.eventId,
          data: hint,
        });
      }
    }
  }

  function signalListenerRecovered() {
    for (const group of streams.values()) {
      for (const stream of group) {
        stream.subject.next({
          type: 'listener-recovered',
          data: { ok: true },
        });
      }
    }
  }

  function markUnhealthy(fromGeneration: number) {
    if (closed || fromGeneration !== generation) {
      return;
    }
    listenerHealthy = false;
    queueReconnect();
  }

  function queueReconnect() {
    if (closed || reconnectHandle || connecting) {
      return;
    }
    const delay = Math.min(
      reconnectMaxMs,
      reconnectInitialMs * 2 ** Math.min(reconnectAttempt, 6),
    );
    reconnectAttempt += 1;
    reconnectHandle = scheduleReconnect(() => {
      reconnectHandle = null;
      void ensureListening().catch(() => {
        queueReconnect();
      });
    }, delay);
  }

  async function ensureListening(isRecovery = false): Promise<void> {
    if (closed) {
      return;
    }
    if (connecting) {
      await connecting;
      return;
    }
    if (listenerHealthy && client) {
      return;
    }
    connecting = (async () => {
      const prior = client;
      client = null;
      if (prior) {
        try {
          prior.removeAllListeners?.();
          await prior.end();
        } catch {
          /* replacing dead client */
        }
      }
      const nextGeneration = generation + 1;
      generation = nextGeneration;
      const next = createClient(config);
      try {
        await next.connect();
        await next.query(`LISTEN ${STORY_VIEW_NOTIFY_CHANNEL}`);
        next.on('notification', (message: ListenNotification) => {
          if (
            message.channel !== STORY_VIEW_NOTIFY_CHANNEL ||
            !message.payload
          ) {
            return;
          }
          let raw: unknown;
          try {
            raw = JSON.parse(message.payload);
          } catch {
            return;
          }
          const parsed = storyUpdateHintSchema.safeParse(raw);
          if (!parsed.success) {
            return;
          }
          publish(parsed.data);
        });
        next.on('error', () => {
          markUnhealthy(nextGeneration);
        });
        next.on('end', () => {
          markUnhealthy(nextGeneration);
        });
        client = next;
        listenerHealthy = true;
        reconnectAttempt = 0;
        if (isRecovery || started) {
          signalListenerRecovered();
        }
      } catch (error) {
        try {
          next.removeAllListeners?.();
          await next.end();
        } catch {
          /* connect failed */
        }
        listenerHealthy = false;
        throw error;
      }
    })();
    try {
      await connecting;
    } finally {
      connecting = null;
    }
  }

  async function start() {
    if (started) {
      return;
    }
    await ensureListening(false);
    started = true;
  }

  function subscribe(args: {
    ownerId: string;
    storyId: string;
    /** Periodic ownership/session check; false completes the stream. */
    stillAuthorized?: () => Promise<boolean>;
  }): Observable<MessageEvent> {
    if (closed) {
      throw new Error('Story update hub is closed');
    }
    const key = streamKey(args.ownerId, args.storyId);
    const group = streams.get(key) ?? new Set<ActiveStream>();
    if (group.size >= MAX_STREAMS_PER_STORY) {
      throw new Error('story_stream_limit');
    }
    if (countForOwner(args.ownerId) >= MAX_STREAMS_PER_OWNER) {
      throw new Error('owner_stream_limit');
    }
    const subject = new Subject<MessageEvent>();
    const active: ActiveStream = {
      ownerId: args.ownerId,
      storyId: args.storyId,
      subject,
    };
    group.add(active);
    streams.set(key, group);

    const stop = new Subject<void>();
    const heartbeats = interval(HEARTBEAT_MS).pipe(
      switchMap(() =>
        from(
          (async (): Promise<MessageEvent | null> => {
            if (args.stillAuthorized && !(await args.stillAuthorized())) {
              subject.complete();
              return null;
            }
            return {
              type: 'heartbeat',
              data: { ok: true, listenerHealthy },
            };
          })(),
        ).pipe(switchMap((event) => (event ? of(event) : EMPTY))),
      ),
      takeUntil(stop),
    );

    return new Observable<MessageEvent>((subscriber) => {
      const subscription = merge(subject.asObservable(), heartbeats).subscribe(
        subscriber,
      );
      return () => {
        stop.next();
        stop.complete();
        subscription.unsubscribe();
        group.delete(active);
        if (group.size === 0) {
          streams.delete(key);
        }
        subject.complete();
      };
    });
  }

  async function close() {
    closed = true;
    reconnectHandle?.cancel();
    reconnectHandle = null;
    for (const group of streams.values()) {
      for (const stream of group) {
        stream.subject.complete();
      }
    }
    streams.clear();
    listenerHealthy = false;
    if (!client) {
      return;
    }
    const closing = client;
    client = null;
    try {
      await closing.query(`UNLISTEN ${STORY_VIEW_NOTIFY_CHANNEL}`);
    } catch {
      /* closing */
    }
    try {
      closing.removeAllListeners?.();
      await closing.end();
    } catch {
      /* closing */
    }
  }

  /** Test/diagnostics only: active authorized stream count. */
  function activeStreamCount() {
    let total = 0;
    for (const group of streams.values()) {
      total += group.size;
    }
    return total;
  }

  function isListenerHealthy() {
    return listenerHealthy;
  }

  /** Test seam: force the current LISTEN client into the unhealthy path. */
  function simulateListenFailureForTests() {
    if (!client) {
      markUnhealthy(generation);
      return;
    }
    markUnhealthy(generation);
  }

  return {
    start,
    subscribe,
    close,
    publish,
    activeStreamCount,
    isListenerHealthy,
    simulateListenFailureForTests,
  };
}

export type StoryUpdateHub = ReturnType<typeof createStoryUpdateHub>;
