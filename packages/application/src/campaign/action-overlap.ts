import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  storyFactDeclarationsSchema,
  type ImmediateActionResolution,
} from '@offscreen/game/immediate-actions';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { rollSchema } from '@offscreen/game/checks';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';

export const pendingImmediateActionResolutionSchema = z.strictObject({
  version: z.literal(1),
  sourceStateDigest: z.string().regex(/^[a-f0-9]{64}$/),
  projectedStateDigest: z.string().regex(/^[a-f0-9]{64}$/),
  resolution: z.strictObject({
    outcome: z.enum(['automatic', 'success', 'failure']),
    text: z.string().max(1000),
    effects: outcomeEffectsSchema,
    declarations: storyFactDeclarationsSchema,
    roll: rollSchema.nullable(),
    character: characterSchema,
    storyFacts: storyFactsSchema,
  }),
});
export type PendingImmediateActionResolution = z.infer<
  typeof pendingImmediateActionResolutionSchema
>;

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function actionResolutionSourceDigest(input: {
  character: unknown;
  storyFacts: unknown;
  startGameSecond: number;
}) {
  return digest({
    character: characterSchema.parse(input.character),
    storyFacts: storyFactsSchema.parse(input.storyFacts),
    gameSecond: input.startGameSecond,
  });
}

export function actionResolutionProjectedDigest(input: {
  resolution: ImmediateActionResolution;
  targetGameSecond: number;
}) {
  return actionProjectedStateDigest({
    character: input.resolution.character,
    storyFacts: input.resolution.storyFacts,
    gameSecond: input.targetGameSecond,
  });
}

export function actionProjectedStateDigest(input: {
  character: unknown;
  storyFacts: unknown;
  gameSecond: number;
}) {
  return digest({
    character: characterSchema.parse(input.character),
    storyFacts: storyFactsSchema.parse(input.storyFacts),
    gameSecond: input.gameSecond,
  });
}

export function freezePendingActionResolution(input: {
  character: unknown;
  storyFacts: unknown;
  startGameSecond: number;
  targetGameSecond: number;
  resolution: ImmediateActionResolution;
}): PendingImmediateActionResolution {
  return pendingImmediateActionResolutionSchema.parse({
    version: 1,
    sourceStateDigest: actionResolutionSourceDigest(input),
    projectedStateDigest: actionResolutionProjectedDigest(input),
    resolution: input.resolution,
  });
}
