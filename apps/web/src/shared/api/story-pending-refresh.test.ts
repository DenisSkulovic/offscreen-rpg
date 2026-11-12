import { describe, expect, it } from 'vitest';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import {
  PENDING_STORY_REFETCH_MS,
  SAFETY_STORY_REFETCH_MS,
  pendingStoryRefetchMs,
  storyNeedsPendingRefresh,
} from './story-pending-refresh';

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

describe('pendingStoryRefetchMs', () => {
  it('uses 30s safety when the live stream is healthy', () => {
    expect(pendingStoryRefetchMs(true)).toBe(SAFETY_STORY_REFETCH_MS);
    expect(SAFETY_STORY_REFETCH_MS).toBe(30_000);
  });

  it('uses 2s fallback when the live stream is down', () => {
    expect(pendingStoryRefetchMs(false)).toBe(PENDING_STORY_REFETCH_MS);
    expect(PENDING_STORY_REFETCH_MS).toBe(2_000);
  });
});
