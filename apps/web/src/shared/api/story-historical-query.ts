import { queryOptions } from '@tanstack/react-query';
import {
  historicalSceneSchema,
  type HistoricalScene,
} from '@offscreen/contracts/stories';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

export async function readHistoricalScene(
  storyId: string,
  sequence: number,
  signal?: AbortSignal,
): Promise<HistoricalScene> {
  const response = await fetch(
    `/api/stories/${storyId}/scenes/${sequence}`,
    {
      cache: 'no-store',
      signal: signal ?? AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return historicalSceneSchema.parse(await response.json());
}

/** Disjoint from the live snapshot key. Historic offers are not commands. */
export function storyHistoricalSceneOptions(
  viewerId: string,
  storyId: string,
  sequence: number,
) {
  return queryOptions({
    queryKey: queryKeys.storyHistoricalScene(viewerId, storyId, sequence),
    queryFn: ({ signal }) => readHistoricalScene(storyId, sequence, signal),
    staleTime: STALE.historyOrSettingsMs,
  });
}
