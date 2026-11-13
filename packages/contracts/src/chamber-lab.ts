import { z } from 'zod';

const identifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

const shortTextSchema = z.string().trim().min(1).max(300);
const longTextSchema = z.string().trim().min(1).max(1000);

export const chamberLabLaneSchema = z.enum([
  'bench-policy',
  'sandbox-db',
  'connected',
  'held-packet',
  'authorized-live',
]);
export type ChamberLabLane = z.infer<typeof chamberLabLaneSchema>;

export const chamberLabCostClassSchema = z.enum([
  'offline',
  'potentially-billable',
  'live-billable',
]);
export type ChamberLabCostClass = z.infer<typeof chamberLabCostClassSchema>;

export const chamberLabFamilySchema = z.enum([
  'calendar-time',
  'finite-action',
  'scripted-chamber-scene',
  'activity-interruption',
  'storyteller-operation',
  'other',
]);
export type ChamberLabFamily = z.infer<typeof chamberLabFamilySchema>;

export const chamberLabAvailabilityStateSchema = z.enum([
  'available',
  'blocked',
  'planned',
]);

export const chamberLabLaneAvailabilitySchema = z.strictObject({
  state: chamberLabAvailabilityStateSchema,
  reason: shortTextSchema.optional(),
});
export type ChamberLabLaneAvailability = z.infer<
  typeof chamberLabLaneAvailabilitySchema
>;

export const chamberLabFixtureRefSchema = z.strictObject({
  id: identifierSchema,
  version: z.number().int().positive(),
  owningSource: shortTextSchema,
  params: z.record(z.string(), z.unknown()).default({}),
});
export type ChamberLabFixtureRef = z.infer<typeof chamberLabFixtureRefSchema>;

export const chamberLabLegacyBridgeSchema = z.strictObject({
  kind: z.enum(['chamber-scene', 'qa-journey']),
  legacyId: identifierSchema,
  legacyVersion: z.number().int().positive().optional(),
  /** Manual QA evidence stays operator-owned; never an automated pass claim. */
  automatedPassAllowed: z.literal(false),
});
export type ChamberLabLegacyBridge = z.infer<
  typeof chamberLabLegacyBridgeSchema
>;

const laneAvailabilityRecordSchema = z
  .strictObject({
    'bench-policy': chamberLabLaneAvailabilitySchema.optional(),
    'sandbox-db': chamberLabLaneAvailabilitySchema.optional(),
    connected: chamberLabLaneAvailabilitySchema.optional(),
    'held-packet': chamberLabLaneAvailabilitySchema.optional(),
    'authorized-live': chamberLabLaneAvailabilitySchema.optional(),
  })
  .superRefine((value, ctx) => {
    const entries = Object.entries(value).filter(
      (entry): entry is [ChamberLabLane, ChamberLabLaneAvailability] =>
        entry[1] !== undefined,
    );
    if (entries.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one lane availability entry is required',
      });
    }
    for (const [lane, availability] of entries) {
      if (
        availability.state !== 'available' &&
        (!availability.reason || availability.reason.length === 0)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Lane ${lane} must include a reason when not available`,
          path: [lane, 'reason'],
        });
      }
    }
  });

export const chamberLabScenarioDefinitionSchema = z
  .strictObject({
    id: identifierSchema,
    version: z.number().int().positive(),
    family: chamberLabFamilySchema,
    name: shortTextSchema,
    searchTags: z.array(identifierSchema).min(1).max(24),
    proofIntent: longTextSchema,
    invariants: z.array(shortTextSchema).min(1).max(24),
    costClass: chamberLabCostClassSchema,
    fixture: chamberLabFixtureRefSchema,
    availabilityPerLane: laneAvailabilityRecordSchema,
    legacy: chamberLabLegacyBridgeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.costClass !== 'offline' &&
      value.availabilityPerLane['bench-policy']?.state === 'available'
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'bench-policy cannot be available for a non-offline cost class',
        path: ['availabilityPerLane', 'bench-policy'],
      });
    }
    if (
      value.costClass === 'offline' &&
      value.availabilityPerLane['authorized-live']?.state === 'available'
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'offline scenarios cannot mark authorized-live as available',
        path: ['availabilityPerLane', 'authorized-live'],
      });
    }
  });

export type ChamberLabScenarioDefinition = z.infer<
  typeof chamberLabScenarioDefinitionSchema
>;

export function scenarioKey(
  id: string,
  version: number,
): `${string}@${number}` {
  return `${id}@${version}`;
}

export function parseChamberLabScenario(
  input: unknown,
): ChamberLabScenarioDefinition {
  return chamberLabScenarioDefinitionSchema.parse(input);
}

export function assertChamberLabCatalogue(
  entries: readonly ChamberLabScenarioDefinition[],
): readonly ChamberLabScenarioDefinition[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    const parsed = parseChamberLabScenario(entry);
    const key = scenarioKey(parsed.id, parsed.version);
    if (keys.has(key)) {
      throw new Error(`Duplicate chamber-lab scenario ${key}`);
    }
    keys.add(key);
  }
  return entries;
}

/** Opening gate used by later drivers; catalogue alone does not execute. */
export function canOpenScenarioOnLane(
  scenario: ChamberLabScenarioDefinition,
  lane: ChamberLabLane,
): { ok: true } | { ok: false; reason: string } {
  const availability = scenario.availabilityPerLane[lane];
  if (!availability) {
    return {
      ok: false,
      reason: `Lane ${lane} is not declared for ${scenarioKey(scenario.id, scenario.version)}`,
    };
  }
  if (availability.state !== 'available') {
    return {
      ok: false,
      reason:
        availability.reason ??
        `Lane ${lane} is ${availability.state} for ${scenarioKey(scenario.id, scenario.version)}`,
    };
  }
  if (!scenario.fixture.id || !scenario.fixture.owningSource) {
    return { ok: false, reason: 'Scenario fixture reference is incomplete' };
  }
  if (scenario.costClass !== 'offline' && lane === 'bench-policy') {
    return {
      ok: false,
      reason: 'Non-offline scenarios cannot open on bench-policy',
    };
  }
  return { ok: true };
}

/** CH03: versioned semantic fixture recipe (no persistence). */
export const chamberLabFixtureOverlayKindSchema = z.enum([
  'accepted-finite-work',
  'owned-item',
  'due-decision-boundary',
]);

export const acceptedFiniteWorkOverlaySchema = z.strictObject({
  kind: z.literal('accepted-finite-work'),
  actionId: identifierSchema.default('paid-shift'),
  requiredFictionalSeconds: z.number().int().positive().max(1_000_000),
  /** 0 exclusive..1 inclusive; 0.8 means eighty percent elapsed. */
  progressRatio: z.number().gt(0).max(1),
  acceptedAtGameSecond: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER),
  settingsRevision: z.number().int().positive().default(1),
});

export const ownedItemOverlaySchema = z.strictObject({
  kind: z.literal('owned-item'),
  itemKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  label: shortTextSchema,
  ownerHolderKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  /** If set, must equal ownerHolderKey — foreign holders are rejected. */
  holderKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const dueDecisionBoundaryOverlaySchema = z
  .strictObject({
    kind: z.literal('due-decision-boundary'),
    offerId: z.uuid(),
    interactionId: z.uuid(),
    gameSecond: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    dueGameSecond: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    prompt: z.string().trim().min(1).max(2000),
    options: z
      .array(
        z.strictObject({
          id: z
            .string()
            .min(1)
            .max(100)
            .regex(/^[a-zA-Z0-9_-]+$/),
          label: z.string().trim().min(1).max(500),
        }),
      )
      .min(1)
      .max(12),
  })
  .superRefine((value, ctx) => {
    if (value.dueGameSecond > value.gameSecond) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueGameSecond'],
        message: 'Decision boundary is not yet due at gameSecond',
      });
    }
    const ids = value.options.map((option) => option.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Duplicate decision option identity',
      });
    }
  });

export const chamberLabFixtureOverlaySchema = z.discriminatedUnion('kind', [
  acceptedFiniteWorkOverlaySchema,
  ownedItemOverlaySchema,
  dueDecisionBoundaryOverlaySchema,
]);
export type ChamberLabFixtureOverlay = z.infer<
  typeof chamberLabFixtureOverlaySchema
>;

export const chamberLabFixtureRecipeSchema = z.strictObject({
  id: identifierSchema,
  version: z.number().int().positive(),
  seed: z.number().int().nonnegative(),
  overlays: z.array(chamberLabFixtureOverlaySchema).min(1).max(16),
});
export type ChamberLabFixtureRecipe = z.infer<
  typeof chamberLabFixtureRecipeSchema
>;

export function parseChamberLabFixtureRecipe(
  input: unknown,
): ChamberLabFixtureRecipe {
  return chamberLabFixtureRecipeSchema.parse(input);
}

/** CH06: LabRun lifecycle and whitelisted semantic steps. */
export const labRunLifecycleSchema = z.enum([
  'prepared',
  'running',
  'paused',
  'completed',
  'failed',
  'blocked',
  'cancelled',
]);
export type LabRunLifecycle = z.infer<typeof labRunLifecycleSchema>;

export const labStepCommandKindSchema = z.enum([
  'load',
  'inspect',
  'advanceClock',
  'admitChoice',
  'admitActivity',
  'controlActivity',
  'deliverNotice',
  'armFault',
  'releaseFault',
  'assert',
  'saveCheckpoint',
  'export',
  'reset',
]);
export type LabStepCommandKind = z.infer<typeof labStepCommandKindSchema>;

/** CH08: named fault cut points, run-scoped. */
export const labFaultCutPointSchema = z.enum([
  'before-admission',
  'after-commit-before-ack',
  'outbox-before-delivery',
  'duplicate-delivery',
  'after-provider-dispatch-before-result',
  'before-publication',
  'projection-cache-unavailable',
  'before-due-wake',
  'held-storyteller-consequence',
]);
export type LabFaultCutPoint = z.infer<typeof labFaultCutPointSchema>;

export const labFaultPlanSchema = z.strictObject({
  faultId: identifierSchema,
  runId: z.uuid(),
  cutPoint: labFaultCutPointSchema,
  targetOperationId: z.uuid().nullable(),
  storyId: z.uuid().nullable(),
  triggerCount: z.number().int().positive().max(16).default(1),
  expectedObservation: shortTextSchema,
});
export type LabFaultPlan = z.infer<typeof labFaultPlanSchema>;

export function parseLabFaultPlan(input: unknown): LabFaultPlan {
  return labFaultPlanSchema.parse(input);
}

export const labStepCommandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('load') }),
  z.strictObject({
    kind: z.literal('inspect'),
    facets: z
      .array(z.enum(['activity', 'clock', 'items', 'decision', 'summary']))
      .min(1)
      .max(8),
  }),
  z.strictObject({
    kind: z.literal('advanceClock'),
    targetGameSecond: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
  }),
  z.strictObject({
    kind: z.literal('admitChoice'),
    optionId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/),
  }),
  z.strictObject({ kind: z.literal('admitActivity') }),
  z.strictObject({
    kind: z.literal('controlActivity'),
    action: z.enum(['pause', 'resume']),
  }),
  z.strictObject({ kind: z.literal('deliverNotice') }),
  z.strictObject({
    kind: z.literal('armFault'),
    faultId: identifierSchema,
    cutPoint: labFaultCutPointSchema,
    targetOperationId: z.uuid().nullable().optional(),
    storyId: z.uuid().nullable().optional(),
    triggerCount: z.number().int().positive().max(16).optional(),
    expectedObservation: shortTextSchema,
  }),
  z.strictObject({
    kind: z.literal('releaseFault'),
    faultId: identifierSchema,
  }),
  z.strictObject({
    kind: z.literal('assert'),
    invariantId: identifierSchema,
    expected: z.unknown().optional(),
  }),
  z.strictObject({ kind: z.literal('saveCheckpoint') }),
  z.strictObject({ kind: z.literal('export') }),
  z.strictObject({ kind: z.literal('reset') }),
]);
export type LabStepCommand = z.infer<typeof labStepCommandSchema>;

export const labStepRequestSchema = z.strictObject({
  stepId: z.uuid(),
  ordinal: z.number().int().positive(),
  expectedRunRevision: z.number().int().nonnegative(),
  command: labStepCommandSchema,
  breakpoint: identifierSchema.optional(),
});
export type LabStepRequest = z.infer<typeof labStepRequestSchema>;

export function parseLabStepRequest(input: unknown): LabStepRequest {
  return labStepRequestSchema.parse(input);
}

/** CH07: typed observations and semantic deltas. */
export const labObservationDomainSchema = z.enum([
  'public-story',
  'mechanics',
  'persistence',
  'worker',
  'documents',
  'provider',
  'transport',
]);
export type LabObservationDomain = z.infer<typeof labObservationDomainSchema>;

export const labObservationConsistencySchema = z.enum([
  'atomic',
  'cross-version',
]);

export const labFacetObservationSchema = z.strictObject({
  version: z.number().int().nonnegative(),
  value: z.unknown(),
});

export const labObservationSchema = z.strictObject({
  runId: z.uuid(),
  stepOrdinal: z.number().int().positive().nullable(),
  consistency: labObservationConsistencySchema,
  consistencyNote: shortTextSchema.optional(),
  domains: z.array(labObservationDomainSchema).min(1).max(8),
  facets: z.record(z.string(), labFacetObservationSchema),
  redaction: z.enum(['default', 'private-drilldown']),
});
export type LabObservation = z.infer<typeof labObservationSchema>;

export const labSemanticChangeSchema = z.strictObject({
  path: shortTextSchema,
  before: z.unknown(),
  after: z.unknown(),
});

export const labPreventedEffectSchema = z.strictObject({
  path: shortTextSchema,
  reason: z.enum([
    'rejected',
    'blocked',
    'pending',
    'not-due',
    'stale',
    'legitimate-no-change',
  ]),
});

export const labSemanticDeltaSchema = z.strictObject({
  before: labObservationSchema,
  after: labObservationSchema,
  changes: z.array(labSemanticChangeSchema).max(200),
  unchanged: z.array(shortTextSchema).max(200),
  prevented: z.array(labPreventedEffectSchema).max(50),
  normalizedForComparison: z.boolean(),
});
export type LabSemanticDelta = z.infer<typeof labSemanticDeltaSchema>;

export const labAssertionResultSchema = z.strictObject({
  invariantId: identifierSchema,
  predicate: z.enum([
    'equals',
    'monotonic',
    'exists',
    'absent',
    'countOnce',
    'unchanged',
    'stateTransition',
    'rejects',
  ]),
  passed: z.boolean(),
  actual: z.unknown(),
  expected: z.unknown().optional(),
  proofBoundary: z.enum(['bench-policy', 'sandbox-db', 'observation-delta']),
});
export type LabAssertionResult = z.infer<typeof labAssertionResultSchema>;

export function parseLabObservation(input: unknown): LabObservation {
  return labObservationSchema.parse(input);
}

export function parseLabSemanticDelta(input: unknown): LabSemanticDelta {
  return labSemanticDeltaSchema.parse(input);
}
