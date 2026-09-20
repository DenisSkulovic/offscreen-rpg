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
  startTick: number;
}) {
  return digest({
    character: characterSchema.parse(input.character),
    storyFacts: storyFactsSchema.parse(input.storyFacts),
    tick: input.startTick,
  });
}

export function actionResolutionProjectedDigest(input: {
  resolution: ImmediateActionResolution;
  targetTick: number;
}) {
  return actionProjectedStateDigest({
    character: input.resolution.character,
    storyFacts: input.resolution.storyFacts,
    tick: input.targetTick,
  });
}

export function actionProjectedStateDigest(input: {
  character: unknown;
  storyFacts: unknown;
  tick: number;
}) {
  return digest({
    character: characterSchema.parse(input.character),
    storyFacts: storyFactsSchema.parse(input.storyFacts),
    tick: input.tick,
  });
}

export function freezePendingActionResolution(input: {
  character: unknown;
  storyFacts: unknown;
  startTick: number;
  targetTick: number;
  resolution: ImmediateActionResolution;
}): PendingImmediateActionResolution {
  return pendingImmediateActionResolutionSchema.parse({
    version: 1,
    sourceStateDigest: actionResolutionSourceDigest(input),
    projectedStateDigest: actionResolutionProjectedDigest(input),
    resolution: input.resolution,
  });
}
