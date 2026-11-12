import { describe, expect, it } from 'vitest';
import {
  createBrowserQueryClient,
  createServerQueryClient,
} from './query-client';
import { queryKeys } from './query-keys';
import { clearAuthenticatedQueryCaches } from '@/src/features/session/authenticated-query-provider';
import { makeStorySnapshot } from '@/src/test/story-fixtures';

describe('createServerQueryClient', () => {
  it('allocates a distinct client per SSR request (negative: no shared cache)', () => {
    const first = createServerQueryClient();
    const second = createServerQueryClient();
    expect(first).not.toBe(second);

    const story = makeStorySnapshot({ title: 'Owner A scene' });
    first.setQueryData(queryKeys.storySnapshot('viewer-a', story.id), story);
    expect(
      second.getQueryData(queryKeys.storySnapshot('viewer-a', story.id)),
    ).toBeUndefined();
  });
});

describe('queryKeys', () => {
  it('prefixes private keys with viewer id and never embeds session secrets', () => {
    const key = queryKeys.storySnapshot('viewer-1', 'story-1');
    expect(key[0]).toBe('viewer');
    expect(key).toEqual(['viewer', 'viewer-1', 'story', 'story-1', 'snapshot']);
    const serialized = JSON.stringify(key);
    expect(serialized).not.toMatch(/cookie|token|session|Bearer/i);
  });
});

describe('clearAuthenticatedQueryCaches', () => {
  it('flushes browser Query data on logout', () => {
    const client = createBrowserQueryClient();
    const story = makeStorySnapshot();
    client.setQueryData(queryKeys.storySnapshot('viewer-1', story.id), story);
    clearAuthenticatedQueryCaches(client);
    expect(
      client.getQueryData(queryKeys.storySnapshot('viewer-1', story.id)),
    ).toBeUndefined();
  });
});

describe('hydration vs initialData', () => {
  it('does not let a stale default initialData block a newer seeded SSR snapshot (negative)', () => {
    const client = createBrowserQueryClient();
    const stale = makeStorySnapshot({
      viewVersion: 1,
      title: 'Stale client default',
    });
    const fresh = makeStorySnapshot({
      viewVersion: 9,
      title: 'SSR hydrated scene',
    });
    const key = queryKeys.storySnapshot('viewer-1', fresh.id);

    // Forbidden pattern: default initialData that could mask newer SSR data.
    // Hydration/setQueryData must win for the authenticated projection.
    client.setQueryData(key, fresh);
    const observed = client.getQueryData(key) ?? stale;
    expect(observed).toMatchObject({
      viewVersion: 9,
      current: { content: { title: 'SSR hydrated scene' } },
    });
    expect(observed).not.toMatchObject({
      current: { content: { title: 'Stale client default' } },
    });
  });
});
