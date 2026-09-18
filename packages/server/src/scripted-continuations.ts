import { translateGeneratedContinuation } from './generated-continuation';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import {
  validateContinuationResult,
  validatePlayableResult,
  type ContinuationResult,
} from '@offscreen/ai/playable';
import { GenerationError, validId } from './generations';
import { scriptedRealDurationMs } from './scripted-continuation-timing';
import { commitStoryContinuation } from './story-continuation';
import type { StoryContinuation } from './story-command-policy';
import { StoryError } from './story-errors';
import { lockOwnedStory, requireCurrentPassage } from './story-persistence';

export { scriptedGeneratedIntervalRealMs } from './scripted-continuation-timing';
export const scriptedContinuationKind = 'continuation.playable.scripted.v1';
export const scriptedContinuationTopic = 'continuation.playable.scripted.v1';

export const scriptedPlayableContinuation = validatePlayableResult(
  'continuation',
  {
    version: 1,
    content: {
      version: 1,
      title: 'Around the old wall',
      paragraphs: [
        'The path bends around an old wall. Something has changed ahead.',
      ],
    },
    next: {
      kind: 'choice',
      prompt: 'What do you attempt?',
      options: [
        {
          id: 'inspect-change',
          label: 'Inspect the change',
          intention: 'Look more closely at what has changed ahead.',
        },
        {
          id: 'continue-cautiously',
          label: 'Continue cautiously',
          intention: 'Keep moving carefully without stopping at the change.',
        },
      ],
    },
  },
);

export const scriptedImmediateContinuation = validateContinuationResult({
  version: 2,
  content: scriptedPlayableContinuation.content,
  next: scriptedPlayableContinuation.next,
});

export const scriptedTimedContinuation = validateContinuationResult({
  version: 2,
  content: {
    version: 1,
    title: 'On the road',
    paragraphs: [
      'You leave the fork and walk toward a tavern whose sign you do not yet know.',
    ],
  },
  next: {
    kind: 'interval',
    gameDurationMs: 600000,
    arrival: {
      content: {
        version: 1,
        title: 'At the tavern',
        paragraphs: [
          'You reach the tavern. A bartender watches the door, and a traveller sits apart.',
        ],
      },
      next: {
        kind: 'choice',
        prompt: 'What do you attempt?',
        options: [
          {
            id: 'speak-bartender',
            label: 'Speak to the bartender',
            intention: 'Ask the bartender what this place is like tonight.',
          },
          {
            id: 'sit-traveller',
            label: 'Sit beside the traveller',
            intention: 'Sit near the traveller in the corner and listen.',
          },
        ],
      },
    },
  },
});

export function storyContinuationFromGeneratedResult(args: {
  output: unknown;
  response: StoryContinuation['response'];
  generationId: string;
}): StoryContinuation {
  return translateGeneratedContinuation({
    ...args,
    realDurationMs: scriptedRealDurationMs,
  });
}

function fixtureOutput(): ContinuationResult {
  return scriptedTimedContinuation;
}

/** Only a fixture runner. Never replace this local update with a provider call. */
export function createScriptedContinuations(database: Database) {
  return {
    async complete(id: string) {
      validId(id);
      await database.db.transaction(async (tx) => {
        const [resolution] = await tx
          .select()
          .from(storyResolution)
          .where(eq(storyResolution.generationId, id));
        if (!resolution) {
          throw new GenerationError('not_found');
        }
        const [record] = await tx
          .select()
          .from(generation)
          .where(
            and(
              eq(generation.id, id),
              eq(generation.kind, scriptedContinuationKind),
            ),
          )
          .for('update');
        if (!record) {
          throw new GenerationError('not_found');
        }
        const output = fixtureOutput();
        await tx
          .update(generation)
          .set({
            state: 'succeeded',
            attemptId: id,
            output,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(generation.id, id),
              eq(generation.kind, scriptedContinuationKind),
              eq(generation.state, 'pending'),
            ),
          );
        const [saved] = await tx
          .select()
          .from(generation)
          .where(eq(generation.id, id));
        if (!saved || saved.state !== 'succeeded') {
          throw new GenerationError('conflict');
        }
        const current = await lockOwnedStory(tx, {
          ownerId: record.ownerId,
          storyId: resolution.storyId,
        });
        if (current.revision !== resolution.baseRevision) {
          return;
        }
        const active = await requireCurrentPassage(tx, {
          storyId: resolution.storyId,
          sequence: current.revision,
        });
        if (active.id !== resolution.basePassageId) {
          return;
        }
        const submission = interactionSubmissionSchema.parse(
          resolution.submission,
        );
        const proposed = storyContinuationFromGeneratedResult({
          output: saved.output,
          response: submission,
          generationId: resolution.generationId,
        });
        try {
          await commitStoryContinuation(tx, {
            ownerId: record.ownerId,
            storyId: resolution.storyId,
            transitionId: resolution.operationId,
            input: {
              ...proposed,
              expectedRevision: resolution.baseRevision,
            },
            completingIntervalPassageId: undefined,
            completingDecisionPassageId: undefined,
            sourceGenerationId: resolution.generationId,
          });
        } catch (error) {
          if (error instanceof StoryError && error.code === 'conflict') {
            return;
          }
          throw error;
        }
      });
    },
  };
}
