import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureIds } from '@/src/test/story-fixtures';
import {
  openStoryUpdateStream,
  setStoryUpdateEventSourceFactoryForTests,
  type StoryUpdateEventSource,
} from './story-update-stream';

function requireSource(): FakeEventSource {
  const source = FakeEventSource.instances[0];
  expect(source).toBeDefined();
  if (!source) {
    throw new Error('expected FakeEventSource instance');
  }
  return source;
}

class FakeEventSource implements StoryUpdateEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.onopen?.(new Event('open'));
  }

  emitError() {
    this.onerror?.(new Event('error'));
  }

  emitStoryUpdate(data: unknown) {
    const event = {
      data: JSON.stringify(data),
    } as MessageEvent<string>;
    for (const listener of this.listeners.get('story-update') ?? []) {
      listener(event);
    }
  }
}

function hint(
  overrides: {
    eventId?: string;
    storyId?: string;
    viewVersion?: number;
  } = {},
) {
  return {
    eventId: overrides.eventId ?? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    storyId: overrides.storyId ?? fixtureIds.storyId,
    viewVersion: overrides.viewVersion ?? 4,
    kind: 'committed-view' as const,
  };
}

afterEach(() => {
  FakeEventSource.instances = [];
  setStoryUpdateEventSourceFactoryForTests(null);
});

describe('openStoryUpdateStream', () => {
  it('opens the story updates URL and forwards validated hints', () => {
    setStoryUpdateEventSourceFactoryForTests((url) => new FakeEventSource(url));
    const onOpen = vi.fn();
    const onHint = vi.fn();
    const onError = vi.fn();

    openStoryUpdateStream({
      storyId: fixtureIds.storyId,
      onOpen,
      onHint,
      onError,
    });

    const source = requireSource();
    expect(source.url).toBe(`/api/stories/${fixtureIds.storyId}/updates`);
    source.emitOpen();
    expect(onOpen).toHaveBeenCalledTimes(1);

    const payload = hint({ viewVersion: 5 });
    source.emitStoryUpdate(payload);
    expect(onHint).toHaveBeenCalledTimes(1);
    expect(onHint).toHaveBeenCalledWith(payload);
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores wrong-story and duplicate or older hints (negative)', () => {
    setStoryUpdateEventSourceFactoryForTests((url) => new FakeEventSource(url));
    const onHint = vi.fn();
    openStoryUpdateStream({
      storyId: fixtureIds.storyId,
      onOpen: () => undefined,
      onHint,
      onError: () => undefined,
    });
    const source = requireSource();

    source.emitStoryUpdate(
      hint({
        storyId: '99999999-9999-4999-8999-999999999999',
        viewVersion: 9,
      }),
    );
    expect(onHint).not.toHaveBeenCalled();

    const first = hint({
      eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      viewVersion: 6,
    });
    source.emitStoryUpdate(first);
    source.emitStoryUpdate(first);
    source.emitStoryUpdate(
      hint({
        eventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        viewVersion: 5,
      }),
    );
    expect(onHint).toHaveBeenCalledTimes(1);
  });

  it('closes cleanly and stops delivering hints', () => {
    setStoryUpdateEventSourceFactoryForTests((url) => new FakeEventSource(url));
    const onHint = vi.fn();
    const stream = openStoryUpdateStream({
      storyId: fixtureIds.storyId,
      onOpen: () => undefined,
      onHint,
      onError: () => undefined,
    });
    const source = requireSource();
    stream.close();
    expect(source.closed).toBe(true);
    source.emitStoryUpdate(hint({ viewVersion: 8 }));
    expect(onHint).not.toHaveBeenCalled();
  });
});
