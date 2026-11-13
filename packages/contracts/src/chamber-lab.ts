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
