import {
  continuationArrivalPresentation,
  continuationCurrentPresentation,
  continuationResultSchema,
  playablePresentation,
} from '@offscreen/ai/playable';
import type { StoryContinuation } from './story-command-policy';

export function translateGeneratedContinuation(args: {
  output: unknown;
  realDurationMs: (gameDurationMs: number) => number;
  response: StoryContinuation['response'];
  generationId: string;
}): StoryContinuation {
  const timed = continuationResultSchema.safeParse(args.output);
  if (timed.success && timed.data.next.kind === 'interval') {
    const current = continuationCurrentPresentation(timed.data);
    const arrival = continuationArrivalPresentation(timed.data);
    return {
      expectedRevision: 0,
      effects: [],
      content: current.content,
      interaction: null,
      response: args.response,
      wait: {
        version: 1,
        realDurationMs: args.realDurationMs(timed.data.next.gameDurationMs),
        gameDurationMs: timed.data.next.gameDurationMs,
        arrival: {
          content: arrival.content,
          interaction: arrival.interaction,
        },
      },
      decision: null,
      sourceGenerationId: args.generationId,
      sourceGenerationPart: 'current',
    };
  }
  const immediate = continuationResultSchema.safeParse(args.output);
  const presented = immediate.success
    ? continuationCurrentPresentation(immediate.data)
    : playablePresentation(args.output);
  return {
    expectedRevision: 0,
    effects: [],
    content: presented.content,
    interaction: presented.interaction,
    response: args.response,
    wait: null,
    decision: null,
    sourceGenerationId: args.generationId,
    sourceGenerationPart: 'current',
  };
}
