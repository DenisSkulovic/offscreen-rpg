import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { StorySnapshot } from '@offscreen/contracts/stories';

const storyId = '11111111-1111-4111-8111-111111111111';
const passageId = '22222222-2222-4222-8222-222222222222';
const interactionId = '33333333-3333-4333-8333-333333333333';

/** Minimal valid published scene for provider-free UI tests. */
export function makeStorySnapshot(
  overrides: Partial<{
    id: string;
    revision: number;
    viewVersion: number;
    canRespond: boolean;
    title: string;
    paragraphs: string[];
    resolution: StorySnapshot['resolution'];
    interaction: StorySnapshot['current']['interaction'];
  }> = {},
): StorySnapshot {
  return storySnapshotSchema.parse({
    id: overrides.id ?? storyId,
    revision: overrides.revision ?? 3,
    viewVersion: overrides.viewVersion ?? 3,
    canRespond: overrides.canRespond ?? true,
    items: [],
    decision: null,
    waiting: null,
    lineage: null,
    resolution: overrides.resolution === undefined ? null : overrides.resolution,
    current: {
      id: passageId,
      content: {
        version: 1,
        title: overrides.title ?? 'Ashfall Approach',
        paragraphs: overrides.paragraphs ?? [
          'The road narrows toward the silt gate.',
        ],
      },
      interaction:
        overrides.interaction === undefined
          ? {
              id: interactionId,
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

export const fixtureIds = { storyId, passageId, interactionId };
