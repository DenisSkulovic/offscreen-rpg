import type { Database } from '@offscreen/db';
import { createStories, StoryError } from './stories';
import { and, eq } from 'drizzle-orm';
import { story } from '@offscreen/db/story-schema';
import { respondToStorySchema } from '@offscreen/contracts/stories';

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
  async function source(owner: string, id: string) {
    const [row] = await database.db
      .select({ source: story.source })
      .from(story)
      .where(and(eq(story.id, id), eq(story.ownerId, owner)));
    if (!row) throw new StoryError('not_found');
    return row.source;
  }
  async function read(owner: string, id: string) {
    const snapshot = await stories.read(owner, id);
    return {
      ...snapshot,
      canRespond:
        ['chamber.v2', 'chamber.v3'].includes(await source(owner, id)) &&
        snapshot.current.interaction !== null,
    };
  }
  return {
    async start(
      owner: string,
      id: string,
      scenario: 'chamber.v1' | 'chamber.v2' | 'chamber.v3' = 'chamber.v1',
    ) {
      await stories.initialize(
        owner,
        id,
        scenario === 'chamber.v1'
          ? opening
          : scenario === 'chamber.v2'
            ? playableOpening
            : timedOpening,
      );
      return read(owner, id);
    },
    async respond(
      owner: string,
      id: string,
      operationId: string,
      body: unknown,
    ) {
      const parsed = respondToStorySchema.safeParse(body);
      if (!parsed.success) throw new StoryError('invalid');
      await stories.read(owner, id);
      const scenario = await source(owner, id);
      if (!['chamber.v2', 'chamber.v3'].includes(scenario))
        throw new StoryError('conflict');
      const { expectedRevision, submission } = parsed.data;
      // Pure, versioned fixture policy. Resolve from the submitted base revision
      // so an acknowledged-late retry proposes the same outcome after progression.
      const outcome =
        scenario === 'chamber.v3'
          ? timedContinuation(expectedRevision, submission.answer.optionId)
          : continuation(expectedRevision, submission.answer.optionId);
      await stories.append(owner, id, operationId, {
        expectedRevision,
        response: submission,
        ...outcome,
      });
      return read(owner, id);
    },
    read,
    history: stories.history,
  };
}

const playableOpening = {
  source: 'chamber.v2',
  content: {
    version: 1,
    title: 'A gate and a small decision.',
    paragraphs: [
      'You stand in a quiet chamber. Beyond a wooden gate, someone is humming.',
    ],
  },
  interaction: {
    kind: 'choice.v1',
    prompt: 'What do you do?',
    options: [
      { id: 'approach', label: 'Approach the gate' },
      { id: 'leave', label: 'Leave the chamber' },
    ],
  },
};
function continuation(revision: number, option: string) {
  if (revision === 1 && option === 'approach')
    return {
      content: {
        version: 1,
        title: 'At the gate.',
        paragraphs: [
          'You approach. The humming stops. A voice asks who is there.',
        ],
      },
      interaction: {
        kind: 'choice.v1',
        prompt: 'How do you reply?',
        options: [
          { id: 'joke', label: 'Tell a joke' },
          { id: 'leave', label: 'Say goodbye and leave' },
        ],
      },
    };
  if ((revision === 1 || revision === 2) && option === 'leave')
    return {
      content: {
        version: 1,
        title: 'A quiet departure.',
        paragraphs: ['You leave the chamber. This little visit is over.'],
      },
      interaction: null,
    };
  if (revision === 2 && option === 'joke')
    return {
      content: {
        version: 1,
        title: 'Someone laughs.',
        paragraphs: [
          '“I was going to tell a joke about a gate, but I could not find an opening.”',
          'A laugh comes from the other side. You exchange goodbyes, and your visit ends.',
        ],
      },
      interaction: null,
    };
  throw new StoryError('conflict');
}

const timedOpening = {
  source: 'chamber.v3',
  content: {
    version: 1,
    title: 'A visit across the courtyard.',
    paragraphs: ['You are at home. A friend is waiting in the courtyard cafe.'],
  },
  interaction: {
    kind: 'choice.v1',
    prompt: 'What would you like to do?',
    options: [
      { id: 'visit', label: 'Walk to the cafe (20 seconds)' },
      { id: 'leave', label: 'Stay home and end this visit' },
    ],
  },
};
function timedContinuation(revision: number, option: string) {
  if (revision === 1 && option === 'visit')
    return {
      content: {
        version: 1,
        title: 'Crossing the courtyard.',
        paragraphs: [
          'You set out toward the cafe. You may close this page; the visit will continue.',
        ],
      },
      interaction: null,
      wait: {
        version: 1,
        realDurationMs: 20000,
        gameDurationMs: 600000,
        arrival: {
          content: {
            version: 1,
            title: 'At the cafe.',
            paragraphs: [
              'You arrive after ten minutes in the story. Your friend waves you over.',
            ],
          },
          interaction: {
            kind: 'choice.v1',
            prompt: 'How do you greet your friend?',
            options: [
              { id: 'joke', label: 'Tell a joke' },
              { id: 'leave', label: 'Say goodbye and leave' },
            ],
          },
        },
      },
    };
  if (revision === 1 && option === 'leave') return continuation(1, 'leave');
  if (revision === 3 && option === 'leave') return continuation(2, 'leave');
  if (revision === 3 && option === 'joke')
    return {
      content: {
        version: 1,
        title: 'Coffee and a laugh.',
        paragraphs: [
          '“I tried to catch the fog on my way here. Mist.” Your friend groans, then laughs. You enjoy your coffee and head home.',
        ],
      },
      interaction: null,
    };
  throw new StoryError('conflict');
}
