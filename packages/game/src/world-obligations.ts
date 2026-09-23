import { z } from 'zod';
import {
  compileWorldDate,
  worldDateSchema,
  worldTimeDefinitionSchema,
} from './calendar';

const gameSecondSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const identifierSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const labelSchema = z.string().trim().min(1).max(160);

export const worldConditionProvenanceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('world-obligation'),
    obligationId: z.uuid(),
  }),
]);

export const worldConditionSchema = z.strictObject({
  id: identifierSchema,
  label: labelSchema,
  value: z.union([z.string().trim().min(1).max(300), z.boolean()]),
  provenance: worldConditionProvenanceSchema,
  setAtGameSecond: gameSecondSchema,
});
export type WorldCondition = z.infer<typeof worldConditionSchema>;
export const worldConditionsSchema = z
  .array(worldConditionSchema)
  .max(64)
  .refine(
    (conditions) =>
      new Set(conditions.map((condition) => condition.id)).size ===
      conditions.length,
    'Duplicate world condition identity',
  );

const obligationIdentitySchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().positive().max(2_147_483_646),
  source: z.strictObject({
    id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/),
    revision: z.number().int().positive().max(2_147_483_646),
  }),
  label: labelSchema,
  visibility: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('exact') }),
    z.strictObject({
      kind: z.literal('described'),
      description: z.string().trim().min(1).max(300),
    }),
    z.strictObject({ kind: z.literal('hidden') }),
  ]),
  consequence: z.strictObject({
    kind: z.literal('condition.set.v1'),
    condition: z.strictObject({
      id: identifierSchema,
      label: labelSchema,
      value: z.union([z.string().trim().min(1).max(300), z.boolean()]),
    }),
  }),
  followUp: z.enum(['controlling-scene', 'report']),
});

export const worldObligationDueSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('game-second'),
    gameSecond: gameSecondSchema,
  }),
  z.strictObject({ kind: z.literal('date'), date: worldDateSchema }),
]);

export const worldObligationProposalSchema = obligationIdentitySchema.extend({
  due: worldObligationDueSchema,
});
export type WorldObligationProposal = z.infer<
  typeof worldObligationProposalSchema
>;

export const worldObligationSchema = obligationIdentitySchema.extend({
  dueGameSecond: gameSecondSchema,
  originGameSecond: gameSecondSchema,
});
export type WorldObligation = z.infer<typeof worldObligationSchema>;

export const worldObligationStateSchema = z.enum([
  'pending',
  'fired',
  'cancelled',
]);

export function compileWorldObligation(args: {
  proposal: unknown;
  timeDefinition: unknown;
  originGameSecond: number;
}): WorldObligation {
  const proposal = worldObligationProposalSchema.parse(args.proposal);
  const timeDefinition = worldTimeDefinitionSchema.parse(args.timeDefinition);
  const originGameSecond = gameSecondSchema.parse(args.originGameSecond);
  const dueGameSecond =
    proposal.due.kind === 'game-second'
      ? proposal.due.gameSecond
      : compileWorldDate(timeDefinition, proposal.due.date);
  if (dueGameSecond <= originGameSecond) {
    throw new Error('World obligation must be due after its admission origin');
  }
  const { due: _due, ...identity } = proposal;
  return worldObligationSchema.parse({
    ...identity,
    dueGameSecond,
    originGameSecond,
  });
}

export function applyWorldObligationCondition(args: {
  conditions: unknown;
  obligation: unknown;
}): WorldCondition[] {
  const conditions = worldConditionsSchema.parse(args.conditions);
  const obligation = worldObligationSchema.parse(args.obligation);
  const next = conditions.filter(
    (condition) => condition.id !== obligation.consequence.condition.id,
  );
  next.push({
    ...obligation.consequence.condition,
    provenance: {
      kind: 'world-obligation',
      obligationId: obligation.id,
    },
    setAtGameSecond: obligation.dueGameSecond,
  });
  return worldConditionsSchema.parse(next);
}

export const publicWorldObligationSchema = z.discriminatedUnion('visibility', [
  z.strictObject({
    visibility: z.literal('exact'),
    id: z.uuid(),
    revision: z.number().int().positive(),
    label: labelSchema,
    state: worldObligationStateSchema,
    dueGameSecond: gameSecondSchema,
  }),
  z.strictObject({
    visibility: z.literal('described'),
    id: z.uuid(),
    revision: z.number().int().positive(),
    label: labelSchema,
    state: worldObligationStateSchema,
    description: z.string().trim().min(1).max(300),
  }),
]);
export type PublicWorldObligation = z.infer<typeof publicWorldObligationSchema>;

export function projectPublicWorldObligation(args: {
  obligation: unknown;
  state: unknown;
}): PublicWorldObligation | null {
  const obligation = worldObligationSchema.parse(args.obligation);
  const state = worldObligationStateSchema.parse(args.state);
  if (obligation.visibility.kind === 'hidden') {
    return null;
  }
  const common = {
    id: obligation.id,
    revision: obligation.revision,
    label: obligation.label,
    state,
  };
  return obligation.visibility.kind === 'exact'
    ? {
        ...common,
        visibility: 'exact',
        dueGameSecond: obligation.dueGameSecond,
      }
    : {
        ...common,
        visibility: 'described',
        description: obligation.visibility.description,
      };
}
