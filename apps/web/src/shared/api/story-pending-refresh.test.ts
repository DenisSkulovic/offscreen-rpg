import { describe, expect, it } from 'vitest';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { storyNeedsPendingRefresh } from './story-pending-refresh';

describe('storyNeedsPendingRefresh', () => {
  it('is false for a settled interactive scene', () => {
    expect(storyNeedsPendingRefresh(makeStorySnapshot())).toBe(false);
  });

  it('is true while resolution is pending or running', () => {
    expect(
      storyNeedsPendingRefresh(
        makeStorySnapshot({
          canRespond: false,
          interaction: null,
          resolution: {
            state: 'pending',
            evidence: 'committed',
            version: 1,
          },
        }),
      ),
    ).toBe(true);
    expect(
      storyNeedsPendingRefresh(
        makeStorySnapshot({
          canRespond: false,
          interaction: null,
          resolution: {
            state: 'running',
            evidence: 'committed',
            version: 1,
          },
        }),
      ),
    ).toBe(true);
  });

  it('is false for undefined', () => {
    expect(storyNeedsPendingRefresh(undefined)).toBe(false);
  });
});
