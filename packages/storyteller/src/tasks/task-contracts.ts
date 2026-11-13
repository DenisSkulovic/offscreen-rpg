/**
 * Storyteller task/result contracts and provider opening normalization.
 *
 * This module is the canonical shape owner. It does not construct requests,
 * call a model, inspect the database, or publish results.
 */
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { passageContentSchema } from '@offscreen/contracts/stories';
import { startPackageReferenceSchema } from '@offscreen/contracts/campaign';
import { capturedProviderRequestSchema } from './opening';
import { storytellerProfileSchema } from '../profiles';
import { executionPolicySchema } from './policy';
import { storytellerTaskResourcesSchema } from './resources';
import { contextInputSchema } from '../context';
import { continuityPatchSchema } from '../context/continuity';
import {
  continuationResultSchema,
  playableProposalSchema,
} from './playable-proposal';
import {
  activityAccessSchema,
  immediateActionPlanSchema,
  validateActivityAccess,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import { proposedDocumentChangesSchema } from './document-changes.js';
import {
  storytellerNeedsContextSchema,
  storytellerReadyToAnswerSchema,
} from './memory-exploration.js';

const actionPlanNextSchema = z
  .strictObject({
    kind: z.literal('action-plans'),
    state: z.enum(['available', 'held']),
    plans: z.array(immediateActionPlanSchema).max(6),
    activityAccess: activityAccessSchema,
  })
  .superRefine((next, context) => {
    try {
      validateActivityAccess(next.plans, next.activityAccess);
    } catch (error) {
      context.addIssue({
        code: 'custom',
        message:
          error instanceof Error ? error.message : 'Invalid activity access',
      });
    }
  });
export const mechanicalOpeningSceneSchema = z.strictObject({
  version: z.literal(1),
  content: passageContentSchema,
  next: actionPlanNextSchema,
});
const consequenceSceneSchema = z.strictObject({
  version: z.literal(3),
  content: passageContentSchema,
  next: actionPlanNextSchema,
});
export const storytellerResultSchema = z.strictObject({
  version: z.literal(1),
  scene: z.union([
    playableProposalSchema,
    mechanicalOpeningSceneSchema,
    continuationResultSchema,
    consequenceSceneSchema,
  ]),
  currentNotes: continuityPatchSchema,
  arrivalNotes: continuityPatchSchema,
  documentChanges: proposedDocumentChangesSchema,
  activeScene: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('continue') }),
      z.strictObject({
        kind: z.literal('restart-at-current'),
        recallDocuments: z
          .array(
            z.strictObject({
              handle: z.string().regex(/^d[1-9][0-9]*$/),
              reason: z.enum(['identity', 'place', 'thread']),
            }),
          )
          .max(8)
          .default([]),
      }),
    ])
    .optional(),
});
export const storytellerReportResultSchema = z.strictObject({
  version: z.literal(1),
  report: passageContentSchema,
});
export const storytellerOutputSchema = z.union([
  storytellerResultSchema,
  storytellerReportResultSchema,
]);
export const storytellerRoundOutputSchema = z.union([
  storytellerNeedsContextSchema,
  storytellerReadyToAnswerSchema,
  storytellerOutputSchema,
]);
export type StorytellerRoundOutput = z.infer<
  typeof storytellerRoundOutputSchema
>;
// Provider guidance and local parsing share the same task-specific structural contract.
export const openingProviderResultSchema = z.strictObject({
  version: z.literal(1),
  scene: playableProposalSchema,
});
const openingImmediateActionPlanSchema = immediateActionPlanSchema.extend({
  evidence: z.array(z.string()).max(0),
});
const openingImmediateActionPlanProposalSchema =
  openingImmediateActionPlanSchema.omit({
    version: true,
    evidence: true,
  });
const authorizedOpeningPlanReferenceSchema = z.strictObject({
  source: z.literal('authorized'),
  key: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
});
const mechanicalOpeningPlanSelectionSchema = z.union([
  authorizedOpeningPlanReferenceSchema,
  openingImmediateActionPlanProposalSchema,
]);
const mechanicalOpeningProviderResultSchema = z.strictObject({
  content: passageContentSchema,
  plans: z.array(openingImmediateActionPlanProposalSchema).max(6),
});
const mechanicalOpeningReferenceProviderResultSchema = z.strictObject({
  content: passageContentSchema,
  plans: z.array(mechanicalOpeningPlanSelectionSchema).max(6),
});
const legacyMechanicalOpeningPlanSelectionSchema = z.union([
  authorizedOpeningPlanReferenceSchema,
  openingImmediateActionPlanSchema,
]);
const legacyMechanicalOpeningProviderResultSchema = z.strictObject({
  version: z.literal(1),
  scene: z.strictObject({
    version: z.literal(1),
    content: passageContentSchema,
    next: z.strictObject({
      kind: z.literal('action-plans'),
      state: z.enum(['available', 'held']),
      plans: z.array(legacyMechanicalOpeningPlanSelectionSchema).max(6),
      activityAccess: activityAccessSchema,
    }),
  }),
});
export function mechanicalOpeningProviderSchema(allowReferences: boolean) {
  return allowReferences
    ? mechanicalOpeningReferenceProviderResultSchema
    : mechanicalOpeningProviderResultSchema;
}
function expandMechanicalOpeningPlans(
  entries: readonly unknown[],
  authorizedPlans: readonly ImmediateActionPlan[],
  options: { allowCapturedBodyRehydration: boolean },
) {
  const byKey = new Map(authorizedPlans.map((plan) => [plan.key, plan]));
  const processActionIds = new Map(
    authorizedPlans.flatMap((plan) =>
      plan.resolution.kind === 'process'
        ? [[plan.resolution.action.id, plan.key] as const]
        : [],
    ),
  );
  return entries.map((entry) => {
    const reference = authorizedOpeningPlanReferenceSchema.safeParse(entry);
    if (reference.success) {
      const plan = byKey.get(reference.data.key);
      if (!plan) {
        throw new Error('Unknown authorized opening plan');
      }
      return plan;
    }
    const stored = openingImmediateActionPlanSchema.safeParse(entry);
    const proposed = stored.success
      ? stored.data
      : openingImmediateActionPlanSchema.parse({
          ...openingImmediateActionPlanProposalSchema.parse(entry),
          version: 1,
          evidence: [],
        });
    if (proposed.resolution.kind === 'resume') {
      throw new Error('Opening cannot propose activity resumption');
    }
    const captured = byKey.get(proposed.key);
    if (captured) {
      // Lean provider bodies must use {source:'authorized', key}. Exact body
      // rehydration remains only for already-compiled/scripted stored results.
      if (
        !options.allowCapturedBodyRehydration ||
        !isDeepStrictEqual(captured, proposed)
      ) {
        throw new Error('Authorized opening plan was reconstructed');
      }
      return captured;
    }
    if (
      proposed.resolution.kind === 'process' &&
      processActionIds.has(proposed.resolution.action.id)
    ) {
      throw new Error('Authorized opening plan was reconstructed');
    }
    return proposed;
  });
}

function mechanicalOpeningActivityAccess(
  plans: readonly ImmediateActionPlan[],
) {
  const actionKeys = plans
    .filter((plan) => plan.resolution.kind === 'process')
    .map((plan) => plan.key);
  return actionKeys.length
    ? ({ kind: 'selected', actionKeys } as const)
    : ({ kind: 'none' } as const);
}

export function compileMechanicalOpeningProviderResult(
  output: unknown,
  authorizedPlans: readonly ImmediateActionPlan[],
) {
  const stored = storytellerResultSchema.safeParse(output);
  if (stored.success) {
    if (stored.data.currentNotes.length || stored.data.arrivalNotes.length) {
      throw new Error('Opening cannot write continuity notes');
    }
    const scene = mechanicalOpeningSceneSchema.parse(stored.data.scene);
    const plans = expandMechanicalOpeningPlans(
      scene.next.plans,
      authorizedPlans,
      { allowCapturedBodyRehydration: true },
    );
    return {
      version: 1 as const,
      scene: {
        ...scene,
        next: { ...scene.next, plans },
      },
    };
  }
  const legacy = legacyMechanicalOpeningProviderResultSchema.safeParse(output);
  if (legacy.success) {
    const plans = expandMechanicalOpeningPlans(
      legacy.data.scene.next.plans,
      authorizedPlans,
      { allowCapturedBodyRehydration: true },
    );
    return {
      version: 1 as const,
      scene: {
        ...legacy.data.scene,
        next: { ...legacy.data.scene.next, plans },
      },
    };
  }
  const parsed = mechanicalOpeningProviderSchema(
    authorizedPlans.length > 0,
  ).parse(output);
  const plans = expandMechanicalOpeningPlans(parsed.plans, authorizedPlans, {
    allowCapturedBodyRehydration: false,
  });
  return {
    version: 1 as const,
    scene: {
      version: 1 as const,
      content: parsed.content,
      next: {
        kind: 'action-plans' as const,
        state: plans.length ? ('available' as const) : ('held' as const),
        plans,
        activityAccess: mechanicalOpeningActivityAccess(plans),
      },
    },
  };
}
export function parseOpeningProviderResult<Schema extends z.ZodType>(
  output: unknown,
  schema: Schema,
): z.infer<Schema> {
  const stored = storytellerResultSchema.safeParse(output);
  if (stored.success) {
    if (stored.data.currentNotes.length || stored.data.arrivalNotes.length) {
      throw new Error('Opening cannot write continuity notes');
    }
    return schema.parse({
      version: stored.data.version,
      scene: stored.data.scene,
    });
  }
  return schema.parse(output);
}
export const resultSchemas = {
  opening: openingProviderResultSchema,
  continuation: storytellerResultSchema.extend({
    scene: continuationResultSchema,
  }),
  consequence: storytellerResultSchema.extend({
    scene: consequenceSceneSchema,
    arrivalNotes: continuityPatchSchema.max(0),
  }),
  'pending-consequence': storytellerResultSchema.extend({
    scene: consequenceSceneSchema,
    arrivalNotes: continuityPatchSchema.max(0),
  }),
  report: storytellerReportResultSchema,
};
const common = {
  inputVersion: z.union([
    z.literal(10),
    z.literal(11),
    z.literal(12),
    z.literal(13),
    z.literal(14),
    z.literal(15),
    z.literal(16),
  ]),
  promptVersion: z.union([
    z.literal('storyteller.v10'),
    z.literal('storyteller.v11'),
    z.literal('storyteller.v12'),
    z.literal('storyteller.v13'),
    z.literal('storyteller.v14'),
    z.literal('storyteller.v15'),
    z.literal('storyteller.v16'),
  ]),
  profile: storytellerProfileSchema,
  execution: executionPolicySchema,
  resources: storytellerTaskResourcesSchema,
  context: contextInputSchema,
  contextManifest: z.strictObject({
    policyVersion: z.literal('bounded-scene.v3'),
    recentFrom: z.number().int().nonnegative(),
    through: z.number().int().nonnegative(),
    omittedSequences: z.array(z.number().int().positive()).max(87),
    activeScene: z
      .strictObject({
        fromSequence: z.number().int().positive(),
        throughSequence: z.number().int().positive(),
        requiredHandles: z.array(z.string().regex(/^p\d+$/)).max(40),
      })
      .nullable(),
  }),
  request: capturedProviderRequestSchema,
};
export const storytellerTaskSchema = z
  .discriminatedUnion('task', [
    z.strictObject({
      ...common,
      task: z.literal('consequence'),
      source: z.strictObject({
        storyId: z.uuid(),
        narrativeRevision: z.number().int().positive(),
        passageId: z.uuid(),
      }),
    }),
    z.strictObject({
      ...common,
      task: z.literal('pending-consequence'),
      source: z.strictObject({
        storyId: z.uuid(),
        narrativeRevision: z.number().int().positive(),
        passageId: z.uuid(),
        executionId: z.uuid(),
        targetGameSecond: z
          .number()
          .int()
          .positive()
          .max(Number.MAX_SAFE_INTEGER),
        projectedStateDigest: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    }),
    z.strictObject({
      ...common,
      task: z.literal('report'),
      source: z.strictObject({
        storyId: z.uuid(),
        narrativeRevision: z.number().int().positive(),
        passageId: z.uuid(),
        hookId: z.uuid(),
      }),
    }),
    z.strictObject({
      ...common,
      task: z.literal('opening'),
      source: z.strictObject({
        draftId: z.uuid(),
        draftRevision: z.number().int().positive(),
        startPackage: startPackageReferenceSchema.optional(),
      }),
    }),
    z.strictObject({
      ...common,
      task: z.literal('continuation'),
      source: z.strictObject({
        storyId: z.uuid(),
        narrativeRevision: z.number().int().positive(),
        passageId: z.uuid(),
        interactionId: z.uuid(),
      }),
    }),
  ])
  .superRefine((task, context) => {
    const expectedPromptVersion = `storyteller.v${task.inputVersion}`;
    if (task.promptVersion !== expectedPromptVersion) {
      context.addIssue({
        code: 'custom',
        path: ['promptVersion'],
        message: 'Storyteller task and prompt versions must match',
      });
    }
  });
export type StorytellerTask = z.infer<typeof storytellerTaskSchema>;
export type StorytellerSceneTask = Exclude<StorytellerTask, { task: 'report' }>;
export type StorytellerResult = z.infer<typeof storytellerResultSchema>;
export type StorytellerReportResult = z.infer<
  typeof storytellerReportResultSchema
>;
export type StorytellerOutput = z.infer<typeof storytellerOutputSchema>;
