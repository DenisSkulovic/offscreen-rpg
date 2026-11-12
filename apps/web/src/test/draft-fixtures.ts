import { draftSchema, type Draft } from '@offscreen/contracts/drafts';

export const fixtureDraftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export function makeDraft(
  overrides: Partial<{
    id: string;
    revision: number;
    title: string;
    premise: string;
    characterName: string;
    storytellingDirection: string;
    storytellerId: string;
  }> = {},
): Draft {
  return draftSchema.parse({
    id: overrides.id ?? fixtureDraftId,
    revision: overrides.revision ?? 1,
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    storyteller: {
      id: overrides.storytellerId ?? 'chronicler',
      revision: 1,
    },
    openingContentId: null,
    characterName: overrides.characterName ?? '',
    title: overrides.title ?? 'Ashfall Draft',
    premise: overrides.premise ?? 'A prisoner waits at the silt gate.',
    storytellingDirection: overrides.storytellingDirection ?? '',
  });
}
