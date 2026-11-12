/**
 * Private Query keys always start with viewer id. Never put cookies, tokens,
 * session secrets or mutable object identity into a key.
 */
export const queryKeys = {
  viewer: (viewerId: string) => ['viewer', viewerId] as const,
  storySnapshot: (viewerId: string, storyId: string) =>
    ['viewer', viewerId, 'story', storyId, 'snapshot'] as const,
  storyHistory: (
    viewerId: string,
    storyId: string,
    filters: Record<string, string | number | boolean | null | undefined> = {},
  ) => ['viewer', viewerId, 'story', storyId, 'history', filters] as const,
  storiesList: (
    viewerId: string,
    filters: Record<string, string | number | boolean | null | undefined> = {},
  ) => ['viewer', viewerId, 'stories', 'list', filters] as const,
  draftsList: (
    viewerId: string,
    filters: Record<string, string | number | boolean | null | undefined> = {},
  ) => ['viewer', viewerId, 'drafts', 'list', filters] as const,
  draft: (viewerId: string, draftId: string) =>
    ['viewer', viewerId, 'draft', draftId] as const,
  draftOpening: (viewerId: string, draftId: string) =>
    ['viewer', viewerId, 'draft', draftId, 'opening'] as const,
  catalogue: (viewerId: string, kind: string) =>
    ['viewer', viewerId, 'catalogue', kind] as const,
  presets: (viewerId: string) => ['viewer', viewerId, 'presets'] as const,
  storySettings: (viewerId: string, storyId: string, kind: string) =>
    ['viewer', viewerId, 'story', storyId, 'settings', kind] as const,
  chamber: (viewerId: string, ...parts: string[]) =>
    ['viewer', viewerId, 'chamber', ...parts] as const,
  qa: (viewerId: string, runId: string, ...parts: string[]) =>
    ['viewer', viewerId, 'qa', runId, ...parts] as const,
};
