import { Client } from 'pg';
import {
  STORY_VIEW_NOTIFY_CHANNEL,
  storyUpdateHintSchema,
  type StoryUpdateHint,
} from '@offscreen/contracts/stories';
import type { DatabaseConfig } from '@offscreen/db';
import type { MessageEvent } from '@nestjs/common';
import {
  EMPTY,
  Observable,
  Subject,
  from,
  interval,
  merge,
  of,
} from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

const HEARTBEAT_MS = 15_000;
const MAX_STREAMS_PER_STORY = 8;
const MAX_STREAMS_PER_OWNER = 16;

type StreamKey = `${string}:${string}`;

type ActiveStream = {
  ownerId: string;
  storyId: string;
  subject: Subject<MessageEvent>;
};

/**
 * In-process SSE broker fed by a dedicated PostgreSQL LISTEN connection.
 * Authorization is enforced at subscribe time; hints never include narrative.
 */
export function createStoryUpdateHub(config: DatabaseConfig) {
  const streams = new Map<StreamKey, Set<ActiveStream>>();
  const client = new Client({
    connectionString: config.connectionString,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
  });
  let started = false;
  let closed = false;

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

  async function start() {
    if (started) {
      return;
    }
    await client.connect();
    await client.query(`LISTEN ${STORY_VIEW_NOTIFY_CHANNEL}`);
    client.on('notification', (message) => {
      if (message.channel !== STORY_VIEW_NOTIFY_CHANNEL || !message.payload) {
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
    client.on('error', () => {
      /* process owner observes connection health via readiness elsewhere */
    });
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
              data: { ok: true },
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
    for (const group of streams.values()) {
      for (const stream of group) {
        stream.subject.complete();
      }
    }
    streams.clear();
    if (!started) {
      return;
    }
    try {
      await client.query(`UNLISTEN ${STORY_VIEW_NOTIFY_CHANNEL}`);
    } catch {
      /* closing */
    }
    await client.end().catch(() => undefined);
  }

  /** Test/diagnostics only: active authorized stream count. */
  function activeStreamCount() {
    let total = 0;
    for (const group of streams.values()) {
      total += group.size;
    }
    return total;
  }

  return { start, subscribe, close, publish, activeStreamCount };
}

export type StoryUpdateHub = ReturnType<typeof createStoryUpdateHub>;
