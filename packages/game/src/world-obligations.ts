import { z } from 'zod';
import {
  compileWorldDate,
  worldDateSchema,
  worldTimeDefinitionSchema,
} from './calendar';

const tickSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identifierSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const labelSchema = z.string().trim().min(1).max(160);

export const worldConditionSchema = z.strictObject({
  id: identifierSchema,
  label: labelSchema,
  value: z.union([z.string().trim().min(1).max(300), z.boolean()]),
  setByObligationId: z.uuid(),
  setAtTick: tickSchema,
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
  followUp: z.literal('controlling-scene'),
});

export const worldObligationProposalSchema = obligationIdentitySchema.extend({
  due: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('tick'), tick: tickSchema }),
    z.strictObject({ kind: z.literal('date'), date: worldDateSchema }),
  ]),
});
export type WorldObligationProposal = z.infer<
  typeof worldObligationProposalSchema
>;

export const worldObligationSchema = obligationIdentitySchema.extend({
  dueTick: tickSchema,
  originTick: tickSchema,
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
  originTick: number;
}): WorldObligation {
  const proposal = worldObligationProposalSchema.parse(args.proposal);
  const timeDefinition = worldTimeDefinitionSchema.parse(args.timeDefinition);
  const originTick = tickSchema.parse(args.originTick);
  const dueTick =
    proposal.due.kind === 'tick'
      ? proposal.due.tick
      : compileWorldDate(timeDefinition, proposal.due.date);
  if (dueTick <= originTick) {
    throw new Error('World obligation must be due after its admission origin');
  }
  const { due: _due, ...identity } = proposal;
  return worldObligationSchema.parse({ ...identity, dueTick, originTick });
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
    setByObligationId: obligation.id,
    setAtTick: obligation.dueTick,
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
    dueTick: tickSchema,
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
    ? { ...common, visibility: 'exact', dueTick: obligation.dueTick }
    : {
        ...common,
        visibility: 'described',
        description: obligation.visibility.description,
      };
}
