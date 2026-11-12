import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import {
  campaignSettingsSchema,
  creativeSettingsSchema,
} from '@offscreen/contracts/campaign';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

export const storytellerPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  creative: creativeSettingsSchema,
});
export type StorytellerPreset = z.infer<typeof storytellerPresetSchema>;

export const settingsHistoryRowSchema = z.object({
  settings: campaignSettingsSchema,
  createdAt: z.string(),
});

async function readJsonArray<T>(
  url: string,
  itemSchema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T[]> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return z.array(itemSchema).parse(await response.json());
}

export function presetCatalogueQueryOptions(viewerId: string) {
  return queryOptions({
    queryKey: queryKeys.catalogue(viewerId, 'storyteller-presets'),
    queryFn: ({ signal }) =>
      readJsonArray(
        '/api/stories/presets/catalogue',
        storytellerPresetSchema,
        signal,
      ),
    staleTime: STALE.catalogueMs,
  });
}

export function ownedPresetsQueryOptions(viewerId: string) {
  return queryOptions({
    queryKey: queryKeys.presets(viewerId),
    queryFn: ({ signal }) =>
      readJsonArray('/api/stories/presets', storytellerPresetSchema, signal),
    staleTime: STALE.presetsMs,
  });
}

export function settingsHistoryQueryOptions(
  viewerId: string,
  storyId: string,
) {
  return queryOptions({
    queryKey: queryKeys.storySettings(viewerId, storyId, 'history'),
    queryFn: ({ signal }) =>
      readJsonArray(
        `/api/stories/${storyId}/settings`,
        settingsHistoryRowSchema,
        signal,
      ),
    staleTime: STALE.historyOrSettingsMs,
    enabled: false,
  });
}
