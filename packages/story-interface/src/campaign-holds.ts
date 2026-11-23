import { z } from 'zod';

export const campaignHoldSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('storyteller-intent'),
    operationId: z.uuid(),
    reason: z.literal('required-turn'),
  }),
  z.strictObject({
    kind: z.literal('storyteller'),
    generationId: z.uuid(),
    reason: z.literal('required-turn'),
  }),
  z.strictObject({
    kind: z.literal('decision'),
    offerId: z.uuid(),
    reason: z.literal('player-choice'),
  }),
  z.strictObject({
    kind: z.literal('world-obligation'),
    obligationId: z.uuid(),
    reason: z.literal('controlling-event'),
  }),
]);
export const campaignHoldsSchema = z
  .array(campaignHoldSchema)
  .max(20)
  .refine(
    (holds) =>
      new Set(
        holds.map((hold) =>
          hold.kind === 'storyteller-intent'
            ? `storyteller-intent:${hold.operationId}`
            : hold.kind === 'storyteller'
              ? `storyteller:${hold.generationId}`
              : hold.kind === 'decision'
                ? `decision:${hold.offerId}`
                : `world-obligation:${hold.obligationId}`,
        ),
      ).size === holds.length,
    'Campaign hold owners must be unique',
  )
  .refine(
    (holds) => holds.filter((hold) => hold.kind === 'decision').length <= 1,
    'The solo campaign supports one unresolved player decision',
  );
