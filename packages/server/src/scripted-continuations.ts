import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import {
  playablePresentation,
  validatePlayableResult,
} from '@offscreen/ai/playable';
import { GenerationError, validId } from './generations';
import { commitStoryContinuation } from './story-continuation';
import { StoryError } from './story-errors';
import { lockOwnedStory, requireCurrentPassage } from './story-persistence';

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

const presented = playablePresentation(scriptedPlayableContinuation);

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
        await tx
          .update(generation)
          .set({
            state: 'succeeded',
            attemptId: id,
            output: scriptedPlayableContinuation,
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
        try {
          await commitStoryContinuation(tx, {
            ownerId: record.ownerId,
            storyId: resolution.storyId,
            transitionId: resolution.operationId,
            input: {
              expectedRevision: resolution.baseRevision,
              effects: [],
              content: presented.content,
              interaction: presented.interaction,
              response: submission,
              wait: null,
              decision: null,
              sourceGenerationId: resolution.generationId,
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
