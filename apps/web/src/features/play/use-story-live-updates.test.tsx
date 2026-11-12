import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';
import { renderWithStoryQuery } from '@/src/test/query-harness';
import { pendingStoryRefetchMs } from '@/src/shared/api/story-pending-refresh';
import { playStorySnapshotQueryOptions } from '@/src/shared/api/story-snapshot-query';
import {
  setStoryUpdateEventSourceFactoryForTests,
  type StoryUpdateEventSource,
} from '@/src/shared/api/story-update-stream';
import { useStoryLiveUpdates } from './use-story-live-updates';

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

  constructor(public readonly url: string) {
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

const server = setupServer();
let gets = 0;
let puts = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  FakeEventSource.instances = [];
  setStoryUpdateEventSourceFactoryForTests(null);
  gets = 0;
  puts = 0;
});

afterAll(() => {
  server.close();
});

function LivePlayProbe({
  viewerId,
  storyId,
}: {
  viewerId: string;
  storyId: string;
}) {
  const live = useStoryLiveUpdates({ viewerId, storyId });
  useQuery(
    playStorySnapshotQueryOptions(viewerId, storyId, {
      liveStreamHealthy: live.healthy,
    }),
  );
  return (
    <div>
      <span data-testid="healthy">{String(live.healthy)}</span>
      <span data-testid="cadence">
        {String(pendingStoryRefetchMs(live.healthy))}
      </span>
    </div>
  );
}

function mountLive() {
  setStoryUpdateEventSourceFactoryForTests((url) => new FakeEventSource(url));
  const pending = makeStorySnapshot({
    canRespond: false,
    title: 'Pending live',
    interaction: null,
    resolution: {
      state: 'pending',
      evidence: 'committed',
      version: 1,
    },
  });
  server.use(
    http.get(`/api/stories/${fixtureIds.storyId}`, () => {
      gets += 1;
      return HttpResponse.json(
        makeStorySnapshot({
          viewVersion: 4 + gets,
          title: `Scene ${gets}`,
          canRespond: false,
          interaction: null,
          resolution: {
            state: 'pending',
            evidence: 'committed',
            version: 1,
          },
        }),
      );
    }),
    http.put(`/api/stories/${fixtureIds.storyId}/*`, () => {
      puts += 1;
      return HttpResponse.json(pending);
    }),
  );
  const { element } = renderWithStoryQuery(
    ({ viewerId, storyId }) => (
      <LivePlayProbe viewerId={viewerId} storyId={storyId} />
    ),
    pending,
  );
  return render(element);
}

describe('useStoryLiveUpdates', () => {
  it('invalidates with one GET after a committed-view hint and uses 30s safety cadence', async () => {
    const view = mountLive();
    const source = requireSource();

    await act(async () => {
      source.emitOpen();
    });
    await waitFor(() => {
      expect(view.getByTestId('healthy').textContent).toBe('true');
      expect(view.getByTestId('cadence').textContent).toBe('30000');
    });
    await waitFor(() => {
      expect(gets).toBeGreaterThan(0);
    });
    const getsAfterOpen = gets;

    await act(async () => {
      source.emitStoryUpdate({
        eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        storyId: fixtureIds.storyId,
        viewVersion: 7,
        kind: 'committed-view',
      });
    });
    await waitFor(() => {
      expect(gets).toBeGreaterThan(getsAfterOpen);
    });
    const getsAfterHint = gets;

    await act(async () => {
      source.emitStoryUpdate({
        eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        storyId: fixtureIds.storyId,
        viewVersion: 7,
        kind: 'committed-view',
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(gets).toBe(getsAfterHint);
    expect(puts).toBe(0);
  });

  it('does not invalidate from a foreign story hint and never POSTs (negative)', async () => {
    const view = mountLive();
    const source = requireSource();
    await act(async () => {
      source.emitOpen();
    });
    await waitFor(() => {
      expect(view.getByTestId('healthy').textContent).toBe('true');
    });
    const getsAfterOpen = gets;

    await act(async () => {
      source.emitStoryUpdate({
        eventId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        storyId: '99999999-9999-4999-8999-999999999999',
        viewVersion: 99,
        kind: 'committed-view',
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(gets).toBe(getsAfterOpen);
    expect(puts).toBe(0);
  });

  it('falls back to 2s pending polling after stream error (negative)', async () => {
    const view = mountLive();
    const source = requireSource();
    await act(async () => {
      source.emitOpen();
    });
    await waitFor(() => {
      expect(view.getByTestId('cadence').textContent).toBe('30000');
    });

    await act(async () => {
      source.emitError();
    });
    await waitFor(() => {
      expect(view.getByTestId('healthy').textContent).toBe('false');
      expect(view.getByTestId('cadence').textContent).toBe('2000');
    });
  });

  it('closes the EventSource on unmount', () => {
    const view = mountLive();
    const source = requireSource();
    view.unmount();
    expect(source.closed).toBe(true);
  });
});
