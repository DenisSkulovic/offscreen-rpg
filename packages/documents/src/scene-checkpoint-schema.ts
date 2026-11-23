import { z } from 'zod';
import { canonicalJson } from './canonical-json.js';
import { contentHashSchema } from './hash-schema.js';
import {
  rulePackageReferenceSchema,
  startPackageReferenceSchema,
  worldPackageReferenceSchema,
} from './package-reference-schema.js';

/** Byte cap for one scene-checkpoint object. The store enforces the same cap. */
export const maximumSceneCheckpointBytes = 1024 * 1024;

const checkpointItemKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);

const checkpointItemSchema = z.strictObject({
  key: checkpointItemKeySchema,
  label: z.string().min(1).max(160),
  holderKey: checkpointItemKeySchema,
});

const checkpointItemsSchema = z
  .array(checkpointItemSchema)
  .max(50)
  .refine(
    (items) => new Set(items.map((item) => item.key)).size === items.length,
    'Item identities must be unique',
  );

const checkpointItemEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('item.create.v1'),
    itemKey: checkpointItemKeySchema,
    label: z.string().min(1).max(160),
    holderKey: checkpointItemKeySchema,
  }),
  z
    .strictObject({
      kind: z.literal('item.transfer.v1'),
      itemKey: checkpointItemKeySchema,
      fromHolder: checkpointItemKeySchema,
      toHolder: checkpointItemKeySchema,
    })
    .refine(
      (effect) => effect.fromHolder !== effect.toHolder,
      'Transfer must change holder',
    ),
]);

const checkpointAbilitySchema = z.enum([
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]);

const checkpointSkillSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  label: z.string().trim().min(1).max(100),
});

/**
 * Pinned copy of the quiescent character snapshot. stateSchemaVersion 1 keeps
 * this shape even if the live character validator later gains a field.
 */
const sceneCheckpointCharacterSchema = z
  .strictObject({
    name: z.string().min(1).max(100),
    scores: z.record(checkpointAbilitySchema, z.number().int().min(1).max(30)),
    applicableAbilities: z
      .array(checkpointAbilitySchema)
      .max(6)
      .refine(
        (abilities) => new Set(abilities).size === abilities.length,
        'Duplicate applicable ability',
      ),
    skills: z
      .array(checkpointSkillSchema)
      .max(64)
      .refine(
        (skills) =>
          new Set(skills.map((skill) => skill.id)).size === skills.length,
        'Duplicate skill identity',
      ),
    proficientSkills: z.array(checkpointSkillSchema.shape.id).max(30),
    proficiencyBonus: z.number().int().min(0).max(6),
    hp: z.number().int().nonnegative().optional(),
    maxHp: z.number().int().positive().optional(),
    facts: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(80),
          value: z.union([z.string().max(300), z.boolean()]),
        }),
      )
      .max(64)
      .refine(
        (facts) => new Set(facts.map((fact) => fact.id)).size === facts.length,
        'Duplicate character fact identity',
      ),
    quantities: z
      .array(
        z.strictObject({
          id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
          label: z.string().trim().min(1).max(100),
          value: z.number().int().nonnegative().max(2147483647),
        }),
      )
      .max(50)
      .refine(
        (values) =>
          new Set(values.map((value) => value.id)).size === values.length,
        'Duplicate quantity identity',
      ),
  })
  .superRefine((character, context) => {
    if ((character.hp === undefined) !== (character.maxHp === undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['hp'],
        message: 'Health is present as a pair or entirely absent',
      });
    }
    const skills = new Set(character.skills.map((skill) => skill.id));
    if (
      new Set(character.proficientSkills).size !==
        character.proficientSkills.length ||
      character.proficientSkills.some((skill) => !skills.has(skill))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['proficientSkills'],
        message: 'Proficiency must reference one declared skill exactly once',
      });
    }
  });

const sceneCheckpointClockSchema = z.strictObject({
  elapsedGameSeconds: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER),
  remainder: z
    .strictObject({
      numerator: z.string().regex(/^(0|[1-9]\d*)$/),
      denominator: z.string().regex(/^[1-9]\d*$/),
    })
    .refine(
      (fraction) => BigInt(fraction.numerator) < BigInt(fraction.denominator),
      'Clock remainder must be a proper fraction',
    ),
});

const sceneCheckpointPaceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('rate'),
    fictionalSeconds: z.number().int().min(1).max(1_000_000),
    realSeconds: z.number().int().min(1).max(86_400),
  }),
  z.strictObject({ kind: z.literal('instant') }),
]);

const sceneCheckpointStoryFactSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  value: z.union([z.string().max(300), z.boolean()]),
  declaredBy: z.uuid(),
});

const sceneCheckpointAnchorSchema = z.strictObject({
  version: z.literal('active-scene-anchor.v1'),
  fromSequence: z.number().int().positive(),
  requiredPassageIds: z.array(z.uuid()).max(40),
  recallCues: z
    .array(
      z.strictObject({
        documentId: z.uuid(),
        reason: z.enum(['identity', 'place', 'thread']),
      }),
    )
    .max(8),
});

const sceneCheckpointChoiceSchema = z
  .strictObject({
    id: z.uuid(),
    specification: z.strictObject({
      kind: z.literal('choice.v1'),
      prompt: z
        .string()
        .max(2000)
        .refine((value) => value.trim().length > 0, 'Prompt is required'),
      options: z
        .array(
          z.strictObject({
            id: checkpointItemKeySchema,
            label: z
              .string()
              .max(500)
              .refine((value) => value.trim().length > 0, 'Label is required'),
            description: z.string().max(2000).optional(),
          }),
        )
        .min(1)
        .max(100),
    }),
  })
  .superRefine((interaction, context) => {
    const ids = interaction.specification.options.map((option) => option.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        path: ['specification', 'options'],
        message: 'Option identities must be unique',
      });
    }
  });

const quiescentMechanicsSchema = z.strictObject({
  mechanicsAbsent: z.literal(false),
  character: sceneCheckpointCharacterSchema.nullable(),
  items: checkpointItemsSchema,
  storyFacts: z
    .array(sceneCheckpointStoryFactSchema)
    .max(64)
    .refine(
      (facts) => new Set(facts.map((fact) => fact.id)).size === facts.length,
      'Duplicate story fact identity',
    ),
  activityOccurrences: z
    .array(
      z.strictObject({
        scopeKey: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
        completed: z.number().int().nonnegative().max(1000),
      }),
    )
    .max(64)
    .refine(
      (occurrences) =>
        new Set(occurrences.map((occurrence) => occurrence.scopeKey)).size ===
        occurrences.length,
      'Duplicate activity occurrence scope',
    ),
  location: z.string().min(1).max(2000).nullable(),
  gameSecond: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  clock: sceneCheckpointClockSchema,
  pace: sceneCheckpointPaceSchema,
  holds: z.tuple([]),
  offer: z.null(),
  acceptedActivityPlan: z.null(),
  activeActivityId: z.null(),
  activeActionOperationId: z.null(),
  situationAuthorization: z.strictObject({
    version: z.literal(2),
    offerId: z.null(),
    activityAccess: z.strictObject({ kind: z.literal('none') }),
    preparedPlans: z.tuple([]),
  }),
  worldConditions: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
        label: z.string().trim().min(1).max(160),
        value: z.union([z.string().trim().min(1).max(300), z.boolean()]),
        provenance: z.strictObject({
          kind: z.literal('world-obligation'),
          obligationId: z.uuid(),
        }),
        setAtGameSecond: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
      }),
    )
    .max(64)
    .refine(
      (conditions) =>
        new Set(conditions.map((condition) => condition.id)).size ===
        conditions.length,
      'Duplicate world condition identity',
    ),
  settingsRevision: z.number().int().positive().max(2147483647),
  content: z.json(),
  continuityNotes: z.union([z.null(), z.tuple([])]),
  activeSceneScope: sceneCheckpointAnchorSchema.nullable(),
});

const absentMechanicsSchema = z.strictObject({
  mechanicsAbsent: z.literal(true),
  items: z.tuple([]),
});

const maximumSceneCheckpointOpenPayloadBytes = 16 * 1024;

/**
 * Historical capture of an open-work blob. Parsing it does not authorize
 * execution; a later writer must check the live validator.
 */
const sceneCheckpointVersionedPayloadSchema = z
  .strictObject({
    version: z.literal(1),
    body: z.json(),
  })
  .superRefine((payload, context) => {
    if (
      Buffer.byteLength(canonicalJson(payload)) >
      maximumSceneCheckpointOpenPayloadBytes
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Open-work payload exceeds 16 KiB',
      });
    }
  });

const sceneCheckpointHoldKindSchema = z.enum([
  'storyteller-intent',
  'storyteller',
  'decision',
  'world-obligation',
]);

const sceneCheckpointHoldSchema = z.strictObject({
  kind: sceneCheckpointHoldKindSchema,
  id: z.uuid(),
});

const sceneCheckpointHoldsSchema = z
  .array(sceneCheckpointHoldSchema)
  .max(20)
  .refine(
    (holds) =>
      new Set(holds.map((hold) => `${hold.kind}:${hold.id}`)).size ===
      holds.length,
    'Hold owners must be unique',
  );

const sceneCheckpointOfferSnapshotSchema = z.strictObject({
  id: z.uuid(),
  source: z.string().min(1).max(200),
  meaning: z.string().min(1).max(200),
  payload: sceneCheckpointVersionedPayloadSchema,
});

const sceneCheckpointActivityAccessSchema = z.union([
  z.strictObject({ kind: z.literal('none') }),
  sceneCheckpointVersionedPayloadSchema,
]);

const sceneCheckpointSituationAuthorizationSchema = z.strictObject({
  version: z.literal(2),
  offerId: z.uuid().nullable(),
  activityAccess: sceneCheckpointActivityAccessSchema,
  preparedPlans: z.array(sceneCheckpointVersionedPayloadSchema).max(20),
});

const sceneCheckpointActiveActivitySchema = z.strictObject({
  id: z.uuid(),
  state: z.string().min(1).max(80),
  revision: z.number().int().nonnegative(),
  boundariesSettled: z.number().int().nonnegative(),
  plan: sceneCheckpointVersionedPayloadSchema,
  progress: sceneCheckpointVersionedPayloadSchema,
});

const sceneCheckpointActiveActivitiesSchema = z
  .array(sceneCheckpointActiveActivitySchema)
  .max(256)
  .refine(
    (activities) =>
      new Set(activities.map((activity) => activity.id)).size ===
      activities.length,
    'Active activity identities must be unique',
  );

const sceneCheckpointWorldObligationSnapshotSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  state: z.string().min(1).max(80),
  dueGameSecond: z.number().int().nonnegative().nullable(),
  firedAtGameSecond: z.number().int().nonnegative().nullable(),
  definition: sceneCheckpointVersionedPayloadSchema,
});

const sceneCheckpointWorldObligationsSchema = z
  .array(sceneCheckpointWorldObligationSnapshotSchema)
  .max(256)
  .refine(
    (obligations) =>
      new Set(obligations.map((obligation) => obligation.id)).size ===
      obligations.length,
    'World obligation identities must be unique',
  );

const sceneCheckpointActiveActionSchema = z.strictObject({
  id: z.uuid(),
  offerId: z.uuid(),
  actionKey: z.string().min(1).max(200),
  baseRevision: z.number().int().nonnegative(),
  offer: sceneCheckpointVersionedPayloadSchema,
  plan: sceneCheckpointVersionedPayloadSchema,
  pendingResolution: sceneCheckpointVersionedPayloadSchema.nullable(),
  status: z.string().min(1).max(80),
  revision: z.number().int().nonnegative(),
  startGameSecond: z.number().int().nonnegative(),
  targetGameSecond: z.number().int().nonnegative(),
  target: z
    .strictObject({
      kind: z.string().min(1).max(80),
      id: z.string().min(1).max(200),
    })
    .nullable(),
});

/** Matches storyteller continuity note limits without a package import. */
const sceneCheckpointContinuityNoteSchema = z.strictObject({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
  text: z.string().min(1).max(400),
  sources: z.array(z.uuid()).min(1).max(4),
  revision: z.number().int().positive(),
});

const sceneCheckpointV2ContinuityNotesSchema = z.union([
  z.null(),
  z.tuple([]),
  z
    .array(sceneCheckpointContinuityNoteSchema)
    .max(20)
    .refine(
      (notes) => new Set(notes.map((note) => note.key)).size === notes.length,
      'Duplicate note keys',
    ),
]);

const presentFictionalStateSchema = z.strictObject({
  mechanicsAbsent: z.literal(false),
  character: sceneCheckpointCharacterSchema.nullable(),
  items: checkpointItemsSchema,
  storyFacts: z
    .array(sceneCheckpointStoryFactSchema)
    .max(64)
    .refine(
      (facts) => new Set(facts.map((fact) => fact.id)).size === facts.length,
      'Duplicate story fact identity',
    ),
  activityOccurrences: z
    .array(
      z.strictObject({
        scopeKey: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
        completed: z.number().int().nonnegative().max(1000),
      }),
    )
    .max(64)
    .refine(
      (occurrences) =>
        new Set(occurrences.map((occurrence) => occurrence.scopeKey)).size ===
        occurrences.length,
      'Duplicate activity occurrence scope',
    ),
  location: z.string().min(1).max(2000).nullable(),
  gameSecond: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  clock: sceneCheckpointClockSchema,
  pace: sceneCheckpointPaceSchema,
  settingsRevision: z.number().int().positive().max(2147483647),
  content: z.json(),
  continuityNotes: sceneCheckpointV2ContinuityNotesSchema,
  activeSceneScope: sceneCheckpointAnchorSchema.nullable(),
  holds: sceneCheckpointHoldsSchema,
  offer: sceneCheckpointOfferSnapshotSchema.nullable(),
  acceptedActivityPlan: sceneCheckpointVersionedPayloadSchema.nullable(),
  activeActivityId: z.uuid().nullable(),
  activeActionOperationId: z.uuid().nullable(),
  situationAuthorization: sceneCheckpointSituationAuthorizationSchema,
  worldConditions: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
        label: z.string().trim().min(1).max(160),
        value: z.union([z.string().trim().min(1).max(300), z.boolean()]),
        provenance: z.strictObject({
          kind: z.literal('world-obligation'),
          obligationId: z.uuid(),
        }),
        setAtGameSecond: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
      }),
    )
    .max(64)
    .refine(
      (conditions) =>
        new Set(conditions.map((condition) => condition.id)).size ===
        conditions.length,
      'Duplicate world condition identity',
    ),
  activeActivities: sceneCheckpointActiveActivitiesSchema,
  worldObligations: sceneCheckpointWorldObligationsSchema,
  activeAction: sceneCheckpointActiveActionSchema.nullable(),
});

const absentFictionalStateSchema = z.strictObject({
  mechanicsAbsent: z.literal(true),
  continuityNotes: sceneCheckpointV2ContinuityNotesSchema,
  activeSceneScope: sceneCheckpointAnchorSchema.nullable(),
});

const sceneCheckpointPassageFieldsSchema = {
  response: z.json(),
  responseSource: z.enum(['player', 'default']).nullable(),
  initialItems: checkpointItemsSchema.nullable(),
  effects: z.array(checkpointItemEffectSchema).max(50),
  controlRevision: z.number().int().nonnegative().max(2147483647),
  content: z.json(),
  contentDocumentHash: contentHashSchema.nullable(),
  interaction: sceneCheckpointChoiceSchema.nullable(),
} as const;

const sceneCheckpointPassageSchema = z.strictObject({
  ...sceneCheckpointPassageFieldsSchema,
  decisionPlan: z.null(),
  waitPlan: z.null(),
});

const sceneCheckpointV2PassageSchema = z.strictObject({
  ...sceneCheckpointPassageFieldsSchema,
  decisionPlan: sceneCheckpointVersionedPayloadSchema.nullable(),
  waitPlan: sceneCheckpointVersionedPayloadSchema.nullable(),
});

const sceneCheckpointCoreSchema = z.strictObject({
  storyId: z.uuid(),
  passageId: z.uuid(),
  sceneSequence: z.number().int().positive().max(2147483647),
  transitionId: z.uuid().nullable(),
  source: z.string().min(1).max(200),
  premise: z.json(),
  storyteller: z.json(),
  execution: z.json(),
  usagePolicy: z.json(),
  canon: z.strictObject({
    rootHash: contentHashSchema.nullable(),
    rootRevision: z.number().int().nonnegative().max(2147483647),
  }),
  ancestor: z.strictObject({
    storyId: z.uuid().nullable(),
    rootHash: contentHashSchema.nullable(),
    rootRevision: z.number().int().nonnegative().max(2147483647).nullable(),
  }),
  pins: z.strictObject({
    worlds: z.array(worldPackageReferenceSchema).max(8),
    rules: rulePackageReferenceSchema.nullable(),
    start: startPackageReferenceSchema.nullable(),
    storytellerProfile: z.json(),
  }),
  passage: sceneCheckpointPassageSchema,
});

type SceneCheckpointSharedRefinement = {
  sceneSequence: number;
  transitionId: string | null;
  canon: z.infer<typeof sceneCheckpointCoreSchema>['canon'];
  ancestor: z.infer<typeof sceneCheckpointCoreSchema>['ancestor'];
  passage: {
    response: unknown;
    responseSource: 'player' | 'default' | null;
    content: unknown;
    contentDocumentHash: string | null;
  };
  pins: z.infer<typeof sceneCheckpointCoreSchema>['pins'];
};

function refineSceneCheckpointShared(
  checkpoint: SceneCheckpointSharedRefinement,
  context: z.RefinementCtx,
) {
  if (
    Buffer.byteLength(canonicalJson(checkpoint)) > maximumSceneCheckpointBytes
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Scene checkpoint exceeds 1 MiB',
    });
  }
  const opening = checkpoint.sceneSequence === 1;
  if (opening !== (checkpoint.transitionId === null)) {
    context.addIssue({
      code: 'custom',
      path: ['transitionId'],
      message: 'Scene 1 has no transition; a later scene requires one',
    });
  }
  const emptyRoot = checkpoint.canon.rootHash === null;
  if (emptyRoot !== (checkpoint.canon.rootRevision === 0)) {
    context.addIssue({
      code: 'custom',
      path: ['canon'],
      message: 'A canon root hash and revision are paired',
    });
  }
  const ancestor = checkpoint.ancestor;
  const ancestorEmpty =
    ancestor.storyId === null &&
    ancestor.rootHash === null &&
    ancestor.rootRevision === null;
  const ancestorComplete =
    ancestor.storyId !== null &&
    ancestor.rootHash !== null &&
    ancestor.rootRevision !== null;
  if (!ancestorEmpty && !ancestorComplete) {
    context.addIssue({
      code: 'custom',
      path: ['ancestor'],
      message: 'Ancestor provenance is complete or entirely absent',
    });
  }
  const passage = checkpoint.passage;
  if ((passage.response === null) !== (passage.responseSource === null)) {
    context.addIssue({
      code: 'custom',
      path: ['passage', 'responseSource'],
      message: 'A response and its source are paired',
    });
  }
  const inlineContent = passage.content !== null;
  const hashedContent = passage.contentDocumentHash !== null;
  if (inlineContent === hashedContent) {
    context.addIssue({
      code: 'custom',
      path: ['passage', 'content'],
      message: 'Passage content is either inline or a content hash',
    });
  }
  if (
    new Set(checkpoint.pins.worlds.map((world) => world.mount)).size !==
    checkpoint.pins.worlds.length
  ) {
    context.addIssue({
      code: 'custom',
      path: ['pins', 'worlds'],
      message: 'Pinned world mounts must be unique',
    });
  }
}

/**
 * DATA01 quiescent scene checkpoint. Active work is not representable:
 * a hold, an offer, a wait, a decision deadline, or a running activity
 * fails this parser instead of being stored as finished.
 */
export const sceneCheckpointV1Schema = sceneCheckpointCoreSchema
  .extend({
    format: z.literal('offscreen.scene-checkpoint.v1'),
    stateSchemaVersion: z.literal(1),
    mechanics: z.discriminatedUnion('mechanicsAbsent', [
      quiescentMechanicsSchema,
      absentMechanicsSchema,
    ]),
  })
  .superRefine((checkpoint, context) => {
    refineSceneCheckpointShared(checkpoint, context);
  });

export const sceneCheckpointV2Schema = sceneCheckpointCoreSchema
  .omit({ passage: true })
  .extend({
    format: z.literal('offscreen.scene-checkpoint.v2'),
    stateSchemaVersion: z.literal(2),
    passage: sceneCheckpointV2PassageSchema,
    fictionalState: z.discriminatedUnion('mechanicsAbsent', [
      presentFictionalStateSchema,
      absentFictionalStateSchema,
    ]),
  })
  .superRefine((checkpoint, context) => {
    refineSceneCheckpointShared(checkpoint, context);
  });

export const sceneCheckpointSchema = z.discriminatedUnion('format', [
  sceneCheckpointV1Schema,
  sceneCheckpointV2Schema,
]);

export type SceneCheckpointV1 = z.infer<typeof sceneCheckpointV1Schema>;
export type SceneCheckpointV2 = z.infer<typeof sceneCheckpointV2Schema>;
export type SceneCheckpoint = z.infer<typeof sceneCheckpointSchema>;
