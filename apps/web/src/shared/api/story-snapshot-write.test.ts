import { afterEach, describe, expect, it } from 'vitest';
import { createBrowserQueryClient } from './query-client';
import { queryKeys } from './query-keys';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';
import {
  resetStorySnapshotEpochCounterForTests,
  writeStorySnapshot,
} from './story-snapshot-write';

afterEach(() => {
  resetStorySnapshotEpochCounterForTests();
});

describe('writeStorySnapshot', () => {
  it('is the guarded Query write path and drops wrong-story high versions', () => {
    const client = createBrowserQueryClient();
    const viewerId = 'viewer-a';
    const storyId = fixtureIds.storyId;
    const current = makeStorySnapshot({ viewVersion: 4, title: 'Current A' });
    writeStorySnapshot(client, { viewerId, storyId, requestEpoch: 1 }, current);

    const intruder = makeStorySnapshot({
      id: '99999999-9999-4999-8999-999999999999',
      viewVersion: 50,
      title: 'Wrong story',
    });
    writeStorySnapshot(
      client,
      { viewerId, storyId, requestEpoch: 2 },
      intruder,
    );

    expect(
      client.getQueryData(queryKeys.storySnapshot(viewerId, storyId)),
    ).toMatchObject({
      id: storyId,
      current: { content: { title: 'Current A' } },
    });
  });
});
