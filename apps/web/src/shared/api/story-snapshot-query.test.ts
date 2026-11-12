import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { createBrowserQueryClient } from './query-client';
import { storySnapshotQueryOptions } from './story-snapshot-query';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
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
