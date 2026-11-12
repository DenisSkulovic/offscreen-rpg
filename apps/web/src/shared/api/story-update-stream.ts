import {
  storyUpdateHintSchema,
  type StoryUpdateHint,
} from '@offscreen/contracts/stories';

const SEEN_EVENT_LIMIT = 64;

/** Minimal EventSource surface so tests can inject a fake without DOM SSE. */
export type StoryUpdateEventSource = {
  addEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ): void;
  close(): void;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

export type StoryUpdateEventSourceFactory = (
  url: string,
) => StoryUpdateEventSource;

export type StoryUpdateStream = {
  close(): void;
};

export type OpenStoryUpdateStreamArgs = {
  storyId: string;
  onOpen: () => void;
  onHint: (hint: StoryUpdateHint) => void;
  onError: () => void;
};

function defaultEventSourceFactory(url: string): StoryUpdateEventSource {
  if (typeof EventSource === 'undefined') {
    throw new Error('EventSource unavailable');
  }
  return new EventSource(url);
}

let eventSourceFactory: StoryUpdateEventSourceFactory =
  defaultEventSourceFactory;

/** Test-only: replace or restore the EventSource constructor used by the bridge. */
export function setStoryUpdateEventSourceFactoryForTests(
  factory: StoryUpdateEventSourceFactory | null,
) {
  eventSourceFactory = factory ?? defaultEventSourceFactory;
}

/**
 * One same-origin SSE subscription for committed-view hints.
 * Validates envelopes; never treats hint fields as authoritative story state.
 */
export function openStoryUpdateStream(
  args: OpenStoryUpdateStreamArgs,
): StoryUpdateStream {
  const url = `/api/stories/${args.storyId}/updates`;
  const source = eventSourceFactory(url);
  const seenEventIds = new Set<string>();
  let highestViewVersion = 0;
  let closed = false;

  function rememberEventId(eventId: string) {
    seenEventIds.add(eventId);
    if (seenEventIds.size <= SEEN_EVENT_LIMIT) {
      return;
    }
    const oldest = seenEventIds.values().next().value;
    if (oldest !== undefined) {
      seenEventIds.delete(oldest);
    }
  }

  function handleHintMessage(event: MessageEvent<string>) {
    if (closed) {
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(typeof event.data === 'string' ? event.data : '');
    } catch {
      return;
    }
    const parsed = storyUpdateHintSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }
    const hint = parsed.data;
    if (hint.storyId !== args.storyId) {
      return;
    }
    if (seenEventIds.has(hint.eventId)) {
      return;
    }
    if (hint.viewVersion <= highestViewVersion) {
      rememberEventId(hint.eventId);
      return;
    }
    rememberEventId(hint.eventId);
    highestViewVersion = hint.viewVersion;
    args.onHint(hint);
  }

  const onOpen = () => {
    if (!closed) {
      args.onOpen();
    }
  };
  const onError = () => {
    if (!closed) {
      args.onError();
    }
  };

  function handleListenerRecovered() {
    if (closed) {
      return;
    }
    // LISTEN reconnected while this SSE socket stayed open — refresh via GET.
    args.onOpen();
  }

  source.onopen = onOpen;
  source.onerror = onError;
  source.addEventListener('story-update', handleHintMessage);
  source.addEventListener('listener-recovered', handleListenerRecovered);

  return {
    close() {
      if (closed) {
        return;
      }
      closed = true;
      source.removeEventListener('story-update', handleHintMessage);
      source.removeEventListener('listener-recovered', handleListenerRecovered);
      source.onopen = null;
      source.onerror = null;
      source.close();
    },
  };
}
