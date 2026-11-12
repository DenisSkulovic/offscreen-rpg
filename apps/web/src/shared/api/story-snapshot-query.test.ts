import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { createBrowserQueryClient } from './query-client';
import {
  playStorySnapshotQueryOptions,
  storySnapshotQueryOptions,
} from './story-snapshot-query';
import {
  allocateStorySnapshotEpoch,
  resetStorySnapshotEpochCounterForTests,
  writeStorySnapshot,
} from './story-snapshot-write';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetStorySnapshotEpochCounterForTests();
});

afterAll(() => {
  server.close();
});

describe('storySnapshotQueryOptions hydration freshness', () => {
  it('does not refetch immediately when hydrated data is still fresh (no double GET)', async () => {
    const story = makeStorySnapshot();
    let gets = 0;
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () => {
        gets += 1;
        return HttpResponse.json(story);
      }),
    );

    const client = createBrowserQueryClient();
    const options = storySnapshotQueryOptions('viewer-1', story.id);
    client.setQueryData(options.queryKey, story);

    await client.fetchQuery(options);
    expect(gets).toBe(0);
  });
});

describe('playStorySnapshotQueryOptions write gate', () => {
  it('keeps the newer cached scene when a stale GET returns (negative)', async () => {
    const newer = makeStorySnapshot({
      viewVersion: 5,
      title: 'Authoritative',
      canRespond: false,
      interaction: null,
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 2,
      },
    });
    const stale = makeStorySnapshot({
      viewVersion: 4,
      title: 'Stale GET',
      canRespond: false,
      interaction: null,
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
    });
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () =>
        HttpResponse.json(stale),
      ),
    );

    const client = createBrowserQueryClient();
    writeStorySnapshot(
      client,
      {
        viewerId: 'viewer-1',
        storyId: newer.id,
        requestEpoch: allocateStorySnapshotEpoch(),
      },
      newer,
    );

    const options = playStorySnapshotQueryOptions('viewer-1', newer.id);
    const result = await client.fetchQuery({
      ...options,
      staleTime: 0,
    });
    expect(result.current.content.title).toBe('Authoritative');
    expect(result.viewVersion).toBe(5);
  });
});
