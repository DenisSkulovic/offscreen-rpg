import { describe, expect, it } from 'vitest';
import { flattenUniqueById } from './list-page';
import { storiesListInfiniteOptions } from './stories-list-query';
import { draftsListInfiniteOptions } from './drafts-list-query';
import { storyHistoryInfiniteOptions } from './story-history-query';
import { fixtureIds } from '@/src/test/story-fixtures';

describe('flattenUniqueById', () => {
  it('keeps first-seen order and drops duplicate ids', () => {
    expect(
      flattenUniqueById([
        { items: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }] },
        { items: [{ id: 'b', n: 99 }, { id: 'c', n: 3 }] },
      ]),
    ).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
      { id: 'c', n: 3 },
    ]);
  });

  it('returns empty for missing pages', () => {
    expect(flattenUniqueById(undefined)).toEqual([]);
    expect(flattenUniqueById([])).toEqual([]);
  });
});

describe('infinite list cursor kinds', () => {
  it('stories use UUID before; drafts opaque cursor; history numeric before', () => {
    const stories = storiesListInfiniteOptions('viewer-1');
    expect(stories.initialPageParam).toBeNull();
    expect(
      stories.getNextPageParam?.(
        {
          items: [],
          nextBefore: fixtureIds.storyId,
        },
        [],
        null,
        [],
      ),
    ).toBe(fixtureIds.storyId);

    const drafts = draftsListInfiniteOptions('viewer-1');
    expect(drafts.initialPageParam).toBeNull();
    expect(
      drafts.getNextPageParam?.(
        {
          items: [],
          nextCursor: fixtureIds.storyId,
        },
        [],
        null,
        [],
      ),
    ).toBe(fixtureIds.storyId);

    const history = storyHistoryInfiniteOptions('viewer-1', fixtureIds.storyId);
    expect(history.initialPageParam).toBeUndefined();
    expect(
      history.getNextPageParam?.(
        {
          items: [],
          nextBefore: 12,
        },
        [],
        undefined,
        [],
      ),
    ).toBe(12);
    expect(
      history.getNextPageParam?.(
        {
          items: [],
          nextBefore: null,
        },
        [],
        undefined,
        [],
      ),
    ).toBeUndefined();
  });
});
