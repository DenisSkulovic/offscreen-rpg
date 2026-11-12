import {
  openingPreviewSchema,
  type OpeningPreview,
} from '@offscreen/contracts/openings';
import { fixtureDraftId } from './draft-fixtures';

export const fixtureCandidateId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const fixtureStartStoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

export function makeOpeningPreview(
  overrides: Partial<{
    id: string;
    sourceRevision: number;
    isCurrent: boolean;
    state: OpeningPreview['state'];
    contentId: string;
    title: string;
  }> = {},
): OpeningPreview {
  return openingPreviewSchema.parse({
    id: overrides.id ?? fixtureCandidateId,
    sourceRevision: overrides.sourceRevision ?? 1,
    isCurrent: overrides.isCurrent ?? true,
    mode: 'scripted',
    storyteller: {
      id: 'chronicler',
      revision: 1,
      name: 'Chronicler',
      description: 'Measured chronicle voice.',
    },
    ...(overrides.contentId ? { contentId: overrides.contentId } : {}),
    state: overrides.state ?? 'succeeded',
    candidate:
      overrides.state === 'pending' ||
      overrides.state === 'running' ||
      overrides.state === 'failed' ||
      overrides.state === 'uncertain'
        ? null
        : {
            content: {
              version: 1,
              title: overrides.title ?? 'Silt Gate Opening',
              paragraphs: ['The prisoner waits by the silt gate.'],
            },
            interaction: {
              kind: 'choice.v1',
              prompt: 'What do you do?',
              options: [
                { id: 'approach', label: 'Approach the gate' },
                { id: 'wait', label: 'Wait in shadow' },
              ],
            },
          },
  });
}

export { fixtureDraftId };
