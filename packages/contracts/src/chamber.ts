import { z } from 'zod';
import { interactionSchema } from './interactions';
import {
  passageContentSchema,
  startChamberSchema,
  storyItemSchema,
} from './stories';

export type ChamberScenario = z.infer<typeof startChamberSchema>['scenario'];

export const chamberScenarioMetadataSchema = z.strictObject({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  exercises: z.array(z.string().min(1).max(80)).min(1).max(12),
});
export type ChamberScenarioMetadata = z.infer<
  typeof chamberScenarioMetadataSchema
>;

export const chamberScenarioCatalog = {
  'chamber.v1': {
    name: 'Read-only opening',
    description:
      'Preserves the first saved chamber opening. Responses are not connected.',
    exercises: ['snapshot reopen', 'owner isolation', 'unresolved offer'],
  },
  'chamber.v2': {
    name: 'Immediate conversation',
    description:
      'Exercises persisted branching choices and retry-safe responses.',
    exercises: ['choice persistence', 'revision fencing', 'history'],
  },
  'chamber.v3': {
    name: 'Timed courtyard visit',
    description:
      'Exercises a durable wait that continues while the browser is closed.',
    exercises: [
      'Temporal wait',
      'polling/reopen',
      'pause/resume',
      'viewVersion ordering',
    ],
  },
  'chamber.v4': {
    name: 'Decision deadline',
    description: 'Exercises a response window racing an automatic default.',
    exercises: ['deadline', 'fallback', 'player/default contention'],
  },
  'chamber.v5': {
    name: 'Letter delivery',
    description:
      'Exercises an authoritative item transfer committed with its narrative consequence.',
    exercises: ['item state', 'atomic effects', 'retry/reload'],
  },
} as const satisfies Record<ChamberScenario, ChamberScenarioMetadata>;

export function listChamberScenarios() {
  return startChamberSchema.shape.scenario.options.map((id) => ({
    id,
    ...chamberScenarioCatalog[id],
  }));
}

const isoDateTime = z.iso.datetime();

export const chamberInspectorHistoryLimit = 20;

export const chamberInspectorSchema = z.strictObject({
  activityReports: z
    .array(
      z.strictObject({
        hookId: z.uuid(),
        activityId: z.uuid(),
        activityRevision: z.number().int().nonnegative(),
        sourcePassageId: z.uuid(),
        sourceRevision: z.number().int().positive(),
        sourceTick: z.number().int().nonnegative(),
        state: z.string().min(1),
        generationId: z.uuid().nullable(),
        generationState: z
          .enum(['pending', 'running', 'succeeded', 'failed', 'uncertain'])
          .nullable(),
        generationFailureCode: z.string().nullable(),
        publicationState: z.string().nullable(),
        publicationFailureCode: z.string().nullable(),
      }),
    )
    .max(50),
  storyteller: z
    .strictObject({
      profile: z.unknown(),
      notes: z.unknown(),
      context: z.unknown().nullable(),
    })
    .nullable()
    .optional(),
  story: z.strictObject({
    id: z.uuid(),
    source: z.string().min(1),
    revision: z.number().int().positive(),
    viewVersion: z.number().int().positive(),
    createdAt: isoDateTime,
  }),
  current: z.strictObject({
    passageId: z.uuid(),
    sequence: z.number().int().positive(),
    transitionId: z.uuid().nullable(),
    content: passageContentSchema,
    interaction: interactionSchema.nullable(),
    responseSource: z.enum(['player', 'default']).nullable(),
    sourceGenerationId: z.uuid().nullable(),
    sourceGenerationPart: z.enum(['current', 'arrival']).nullable(),
  }),
  timing: z.strictObject({
    waitPlan: z.unknown().nullable(),
    dueAt: isoDateTime.nullable(),
    remainingMs: z.number().int().nonnegative().nullable(),
    controlRevision: z.number().int().nonnegative(),
    decisionPlan: z.unknown().nullable(),
    responseDueAt: isoDateTime.nullable(),
  }),
  items: z.array(storyItemSchema).max(50),
  recentHistory: z
    .array(
      z.strictObject({
        sequence: z.number().int().positive(),
        passageId: z.uuid(),
        transitionId: z.uuid().nullable(),
        title: z.string().min(1),
        responseSource: z.enum(['player', 'default']).nullable(),
        hasInteraction: z.boolean(),
        hasWait: z.boolean(),
        hasDecision: z.boolean(),
        hasEffect: z.boolean(),
      }),
    )
    .max(chamberInspectorHistoryLimit),
  generation: z
    .strictObject({
      id: z.uuid(),
      kind: z.string().min(1),
      state: z.enum(['pending', 'running', 'succeeded', 'failed', 'uncertain']),
      failureCode: z.string().nullable(),
      sourceDraftId: z.uuid().nullable(),
      sourceDraftRevision: z.number().int().positive().nullable(),
      proposal: z.unknown().nullable(),
      optionIntentions: z
        .array(
          z.strictObject({
            id: z.string().min(1),
            intention: z.string().min(1),
          }),
        )
        .nullable(),
    })
    .nullable(),
  resolution: z
    .strictObject({
      operationId: z.uuid(),
      basePassageId: z.uuid(),
      baseRevision: z.number().int().positive(),
      generationId: z.uuid(),
      kind: z.string().min(1),
      state: z.enum(['pending', 'running', 'succeeded', 'failed', 'uncertain']),
      selectedOptionId: z.string().nullable(),
      selectedIntention: z.string().nullable(),
      proposal: z.unknown().nullable(),
    })
    .nullable(),
});
export type ChamberInspector = z.infer<typeof chamberInspectorSchema>;
