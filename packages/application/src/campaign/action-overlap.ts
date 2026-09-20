import { createHash } from 'node:crypto';
import {
  pendingImmediateActionResolutionSchema,
  type ImmediateActionResolution,
  type PendingImmediateActionResolution,
} from '@offscreen/game/immediate-actions';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';

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
