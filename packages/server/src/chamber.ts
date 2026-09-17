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
        (await source(owner, id)) === 'chamber.v2' &&
        snapshot.current.interaction !== null,
    };
  }
  return {
    async start(
      owner: string,
      id: string,
      scenario: 'chamber.v1' | 'chamber.v2' = 'chamber.v1',
    ) {
      await stories.initialize(
        owner,
        id,
        scenario === 'chamber.v1' ? opening : playableOpening,
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
      if ((await source(owner, id)) !== 'chamber.v2')
        throw new StoryError('conflict');
      const { expectedRevision, submission } = parsed.data;
      // Pure, versioned fixture policy. Resolve from the submitted base revision
      // so an acknowledged-late retry proposes the same outcome after progression.
      const outcome = continuation(
        expectedRevision,
        submission.answer.optionId,
      );
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
