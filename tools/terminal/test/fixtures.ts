import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { StorySnapshot } from '@offscreen/contracts/stories';

export const fixtureIds = {
  storyId: '11111111-1111-4111-8111-111111111111',
  passageId: '22222222-2222-4222-8222-222222222222',
  interactionId: '33333333-3333-4333-8333-333333333333',
  ownerId: 'user-owner-1',
  token: 'fixture-bearer-token',
};

export function makeStorySnapshot(
  overrides: Partial<{
    id: string;
    revision: number;
    interaction: StorySnapshot['current']['interaction'];
    paragraphs: string[];
  }> = {},
): StorySnapshot {
  return storySnapshotSchema.parse({
    id: overrides.id ?? fixtureIds.storyId,
    revision: overrides.revision ?? 3,
    viewVersion: overrides.revision ?? 3,
    canRespond: true,
    items: [],
    decision: null,
    waiting: null,
    lineage: null,
    resolution: null,
    current: {
      id: fixtureIds.passageId,
      content: {
        version: 1,
        title: 'Ashfall Approach',
        paragraphs: overrides.paragraphs ?? ['The road narrows.'],
      },
      interaction:
        overrides.interaction === undefined
          ? {
              id: fixtureIds.interactionId,
              specification: {
                kind: 'choice.v1',
                prompt: 'How do you enter?',
                options: [
                  { id: 'walk', label: 'Walk the gate road' },
                  { id: 'wait', label: 'Wait and watch' },
                ],
              },
            }
          : overrides.interaction,
    },
  });
}
