import type { Database } from '@offscreen/db';
import { createStories } from './stories';

// Preserve this version: a new fixture meaning gets a new source key.
const opening = {
  source: 'chamber.v1',
  content: {
    version: 1,
    title: 'A gate and a small decision.',
    paragraphs: [
      'You stand in a quiet chamber. A closed gate faces you. Beside it, a shallow slot bears the outline of a token.',
      'This saved scene is the first piece of the testing chamber. Choices and timed progression are not connected yet.',
    ],
  },
  interaction: {
    kind: 'choice.v1',
    prompt: 'How would you proceed?',
    options: [
      {
        id: 'offer-token',
        label: 'Offer a token',
        description:
          'The next implementation slice will validate possessions and apply this consequence.',
      },
      { id: 'remain', label: 'Remain in the chamber' },
    ],
  },
};
export function createChamber(database: Database) {
  const stories = createStories(database);
  return {
    start: (owner: string, id: string) =>
      stories.initialize(owner, id, opening),
    read: stories.read,
    history: stories.history,
  };
}
