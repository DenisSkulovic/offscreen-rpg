import { z } from 'zod';
import { canonicalJson } from './canonical-json.js';

export const contentHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'Expected a lowercase SHA-256 hash');

export const logicalDocumentPathSchema = z
  .string()
  .min(1)
  .max(320)
  .refine((value) => !value.startsWith('/') && !value.startsWith('\\'), {
    message: 'Document paths must be relative',
  })
  .refine(
    (value) =>
      !value.includes('\\') &&
      value
        .split('/')
        .every((part) => part !== '' && part !== '.' && part !== '..'),
    { message: 'Document paths must be normalized and cannot traverse' },
  )
  .refine((value) => value.endsWith('.md') || value.endsWith('.json'), {
    message: 'Document paths must identify Markdown or JSON content',
  })
  .refine((value) => !['manifest.json', 'checksums.json'].includes(value), {
    message: 'Document path is reserved for export metadata',
  });

export const documentKindSchema = z.enum([
  'orientation',
  'premise',
  'lore',
  'identity',
  'relationship',
  'source-passage',
  'memory-segment',
  'narrative-thread',
  'creative-guidance',
  'activity-definition',
  'campaign-state',
  'character',
  'inventory',
  'campaign-settings',
  'time-definition',
  'world-reference',
  'rule-reference',
  'start-reference',
  'mechanical-receipt',
  'state-projection',
  'private-possibility',
  'world-obligation',
]);

export const documentAuthoritySchema = z.enum([
  'canon',
  'source',
  'derived',
  'attributed',
  'projection',
  'noncanonical',
]);

export const documentVisibilitySchema = z.enum([
  'player-known',
  'storyteller-private',
  'developer-private',
]);

export const documentSourceSchema = z.strictObject({
  documentId: z.uuid(),
  revision: z.number().int().positive(),
  section: z.string().min(1).max(160).optional(),
});

export const documentCoverageSchema = z.strictObject({
  fromSequence: z.number().int().positive().optional(),
  throughSequence: z.number().int().positive().optional(),
  fromGameSecond: z.string().regex(/^\d+$/).optional(),
  throughGameSecond: z.string().regex(/^\d+$/).optional(),
});

export const documentEnvelopeSchema = z.strictObject({
  documentId: z.uuid(),
  kind: documentKindSchema,
  schemaVersion: z.literal(1),
  revision: z.number().int().positive(),
  authority: documentAuthoritySchema,
  visibility: documentVisibilitySchema,
  sources: z.array(documentSourceSchema).max(64).default([]),
  coverage: documentCoverageSchema.optional(),
});

export const canonicalDocumentSchema = z.strictObject({
  format: z.literal('offscreen.document.v1'),
  envelope: documentEnvelopeSchema,
  title: z.string().min(1).max(240),
  body: z.string().max(512 * 1024),
});

export const sourcePassageContentSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
});

/** The exact accepted Storyteller value; Markdown is only a deterministic view. */
export const canonicalSourcePassageSchema = z.strictObject({
  format: z.literal('offscreen.source-passage.v1'),
  envelope: documentEnvelopeSchema.extend({
    kind: z.literal('source-passage'),
    authority: z.literal('source'),
  }),
  content: sourcePassageContentSchema,
});

export const canonicalStructuredDocumentSchema = z.strictObject({
  format: z.literal('offscreen.structured-document.v1'),
  envelope: documentEnvelopeSchema,
  schemaId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9.-]+\.v\d+$/),
  data: z.json(),
});

export const documentManifestEntrySchema = z.strictObject({
  documentId: z.uuid(),
  revision: z.number().int().positive(),
  path: logicalDocumentPathSchema,
  objectHash: contentHashSchema,
  kind: documentKindSchema,
  authority: documentAuthoritySchema,
  visibility: documentVisibilitySchema,
});

export const worldPackageDocumentKindSchema = documentKindSchema.exclude([
  'source-passage',
  'campaign-state',
  'character',
  'inventory',
  'mechanical-receipt',
  'state-projection',
  'private-possibility',
  'world-obligation',
  'start-reference',
]);

export const worldPackageManifestEntrySchema =
  documentManifestEntrySchema.extend({
    kind: worldPackageDocumentKindSchema,
    sourceBytes: z
      .number()
      .int()
      .nonnegative()
      .max(512 * 1024),
    sections: z
      .array(
        z.strictObject({
          heading: z.string().min(1).max(240),
          level: z.number().int().min(1).max(6),
          line: z.number().int().positive(),
        }),
      )
      .max(256),
  });

export const worldPackageManifestSchema = z
  .strictObject({
    format: z.literal('offscreen.world-package-manifest.v1'),
    worldId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    revision: z.number().int().positive(),
    previousRootHash: contentHashSchema.nullable(),
    authorOperationId: z.uuid(),
    orientationDocumentId: z.uuid(),
    entries: z.array(worldPackageManifestEntrySchema).min(1).max(4096),
  })
  .superRefine((manifest, context) => {
    if (
      new Set(manifest.entries.map((entry) => entry.documentId)).size !==
      manifest.entries.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'World document IDs must be unique',
      });
    }
    if (
      new Set(manifest.entries.map((entry) => entry.path)).size !==
      manifest.entries.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'World document paths must be unique',
      });
    }
    const orientation = manifest.entries.find(
      (entry) => entry.documentId === manifest.orientationDocumentId,
    );
    if (!orientation || orientation.kind !== 'orientation') {
      context.addIssue({
        code: 'custom',
        path: ['orientationDocumentId'],
        message:
          'World package orientation must reference an orientation document',
      });
    }
    if (
      (manifest.revision === 1 && manifest.previousRootHash !== null) ||
      (manifest.revision > 1 && manifest.previousRootHash === null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['previousRootHash'],
        message: 'World package history must be contiguous',
      });
    }
  });

export const worldPackageReferenceSchema = z.strictObject({
  worldId: z.uuid(),
  rootHash: contentHashSchema,
  revision: z.number().int().positive(),
  mount: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
});

const ruleTopicSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);

export const rulePackageManifestEntrySchema =
  documentManifestEntrySchema.extend({
    kind: z.enum(['orientation', 'rule-reference']),
    sourceBytes: z
      .number()
      .int()
      .nonnegative()
      .max(512 * 1024),
    topics: z.array(ruleTopicSchema).min(1).max(32),
    sections: z
      .array(
        z.strictObject({
          heading: z.string().min(1).max(240),
          level: z.number().int().min(1).max(6),
          line: z.number().int().positive(),
          topics: z.array(ruleTopicSchema).min(1).max(16),
        }),
      )
      .max(256),
  });

/**
 * An immutable, navigable rule library. `engine` is a compatibility claim, not
 * executable code: application policy must supply that exact adapter before it
 * can admit mechanics described by these documents.
 */
export const rulePackageManifestSchema = z
  .strictObject({
    format: z.literal('offscreen.rule-package-manifest.v1'),
    ruleSetId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    revision: z.number().int().positive(),
    previousRootHash: contentHashSchema.nullable(),
    authorOperationId: z.uuid(),
    orientationDocumentId: z.uuid(),
    engine: z.strictObject({
      adapterId: z.string().regex(/^[a-z][a-z0-9.-]{0,119}$/),
      adapterVersion: z.number().int().positive(),
    }),
    license: z.strictObject({
      name: z.string().trim().min(1).max(200),
      source: z.url(),
      attribution: z.string().trim().min(1).max(500),
    }),
    entries: z.array(rulePackageManifestEntrySchema).min(1).max(4096),
  })
  .superRefine((manifest, context) => {
    if (
      new Set(manifest.entries.map((entry) => entry.documentId)).size !==
      manifest.entries.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Rule document IDs must be unique',
      });
    }
    if (
      new Set(manifest.entries.map((entry) => entry.path)).size !==
      manifest.entries.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Rule document paths must be unique',
      });
    }
    const orientation = manifest.entries.find(
      (entry) => entry.documentId === manifest.orientationDocumentId,
    );
    if (!orientation || orientation.kind !== 'orientation') {
      context.addIssue({
        code: 'custom',
        path: ['orientationDocumentId'],
        message:
          'Rule package orientation must reference an orientation document',
      });
    } else if (orientation.sourceBytes > 16 * 1024) {
      context.addIssue({
        code: 'custom',
        path: ['orientationDocumentId'],
        message:
          'Rule package orientation must remain a compact navigation aid',
      });
    }
    if (
      (manifest.revision === 1 && manifest.previousRootHash !== null) ||
      (manifest.revision > 1 && manifest.previousRootHash === null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['previousRootHash'],
        message: 'Rule package history must be contiguous',
      });
    }
  });

export const rulePackageReferenceSchema = z.strictObject({
  ruleSetId: z.uuid(),
  rootHash: contentHashSchema,
  revision: z.number().int().positive(),
  engine: z.strictObject({
    adapterId: z.string().regex(/^[a-z][a-z0-9.-]{0,119}$/),
    adapterVersion: z.number().int().positive(),
  }),
});

export const startPackageDocumentKindSchema = documentKindSchema.exclude([
  'source-passage',
  'memory-segment',
  'mechanical-receipt',
  'state-projection',
  'world-reference',
  'rule-reference',
  'start-reference',
]);

export const startPackageManifestEntrySchema =
  documentManifestEntrySchema.extend({
    kind: startPackageDocumentKindSchema,
    activation: z.enum([
      'initial-canon',
      'private-possibility',
      'executable-obligation',
    ]),
  });

export const startPackageManifestSchema = z
  .strictObject({
    format: z.literal('offscreen.start-package-manifest.v1'),
    startPackageId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    revision: z.number().int().positive(),
    previousRootHash: contentHashSchema.nullable(),
    authorOperationId: z.uuid(),
    orientationDocumentId: z.uuid(),
    worlds: z.array(worldPackageReferenceSchema).max(8),
    rules: rulePackageReferenceSchema,
    entries: z.array(startPackageManifestEntrySchema).min(1).max(512),
  })
  .superRefine((manifest, context) => {
    if (
      new Set(manifest.entries.map((entry) => entry.documentId)).size !==
      manifest.entries.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Start document IDs must be unique',
      });
    }
    if (
      new Set(manifest.entries.map((entry) => entry.path)).size !==
      manifest.entries.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Start document paths must be unique',
      });
    }
    if (
      new Set(manifest.worlds.map((world) => world.mount)).size !==
      manifest.worlds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Start world mounts must be unique',
      });
    }
    const orientation = manifest.entries.find(
      (entry) => entry.documentId === manifest.orientationDocumentId,
    );
    if (
      !orientation ||
      orientation.kind !== 'orientation' ||
      orientation.activation !== 'initial-canon'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['orientationDocumentId'],
        message: 'Start package orientation must be initial canon',
      });
    }
    for (const [index, entry] of manifest.entries.entries()) {
      if (
        entry.activation === 'private-possibility' &&
        (entry.kind !== 'private-possibility' ||
          entry.authority !== 'noncanonical' ||
          entry.visibility !== 'storyteller-private')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message:
            'Private possibilities must remain noncanonical and Storyteller-private',
        });
      }
      if (
        entry.activation === 'executable-obligation' &&
        (entry.kind !== 'world-obligation' ||
          entry.authority !== 'canon' ||
          !entry.path.endsWith('.json'))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message:
            'Executable obligations require canonical typed obligation documents',
        });
      }
      if (
        entry.activation === 'initial-canon' &&
        (entry.kind === 'private-possibility' ||
          entry.kind === 'world-obligation')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message:
            'Possibilities and obligations require their explicit activation class',
        });
      }
    }
    if (
      (manifest.revision === 1 && manifest.previousRootHash !== null) ||
      (manifest.revision > 1 && manifest.previousRootHash === null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['previousRootHash'],
        message: 'Start package history must be contiguous',
      });
    }
  });

export const startPackageReferenceSchema = z.strictObject({
  startPackageId: z.uuid(),
  rootHash: contentHashSchema,
  revision: z.number().int().positive(),
});

export const documentManifestSchema = z
  .strictObject({
    format: z.literal('offscreen.manifest.v1'),
    campaignId: z.uuid(),
    revision: z.number().int().nonnegative(),
    previousRootHash: contentHashSchema.nullable(),
    authorOperationId: z.uuid().nullable(),
    entries: z.array(documentManifestEntrySchema).max(4096),
  })
  .superRefine((manifest, context) => {
    if (
      new Set(manifest.entries.map((entry) => entry.documentId)).size !==
      manifest.entries.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Document IDs must be unique',
      });
    if (
      new Set(manifest.entries.map((entry) => entry.path)).size !==
      manifest.entries.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Document paths must be unique',
      });
    if (
      manifest.revision === 0 &&
      (manifest.previousRootHash !== null ||
        manifest.authorOperationId !== null)
    )
      context.addIssue({
        code: 'custom',
        message: 'An empty root cannot claim a prior root or author operation',
      });
    if (manifest.revision > 0 && manifest.authorOperationId === null)
      context.addIssue({
        code: 'custom',
        message: 'A published manifest requires an author operation',
      });
  });

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
    scores: z.record(
      checkpointAbilitySchema,
      z.number().int().min(1).max(30),
    ),
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

/**
 * DATA01 quiescent scene checkpoint. Active work is not representable:
 * a hold, an offer, a wait, a decision deadline, or a running activity
 * fails this parser instead of being stored as finished.
 */
export const sceneCheckpointSchema = z
  .strictObject({
    format: z.literal('offscreen.scene-checkpoint.v1'),
    stateSchemaVersion: z.literal(1),
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
    mechanics: z.discriminatedUnion('mechanicsAbsent', [
      quiescentMechanicsSchema,
      absentMechanicsSchema,
    ]),
    passage: z.strictObject({
      response: z.json(),
      responseSource: z.enum(['player', 'default']).nullable(),
      initialItems: checkpointItemsSchema.nullable(),
      effects: z.array(checkpointItemEffectSchema).max(50),
      decisionPlan: z.null(),
      waitPlan: z.null(),
      controlRevision: z.number().int().nonnegative().max(2147483647),
      content: z.json(),
      contentDocumentHash: contentHashSchema.nullable(),
      interaction: sceneCheckpointChoiceSchema.nullable(),
    }),
  })
  .superRefine((checkpoint, context) => {
    if (Buffer.byteLength(canonicalJson(checkpoint)) > maximumSceneCheckpointBytes) {
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
  });

export type SceneCheckpoint = z.infer<typeof sceneCheckpointSchema>;

export type CanonicalDocument = z.infer<typeof canonicalDocumentSchema>;
export type CanonicalSourcePassage = z.infer<
  typeof canonicalSourcePassageSchema
>;
export type CanonicalStructuredDocument = z.infer<
  typeof canonicalStructuredDocumentSchema
>;
export type DocumentEnvelope = z.infer<typeof documentEnvelopeSchema>;
export type DocumentManifest = z.infer<typeof documentManifestSchema>;
export type DocumentManifestEntry = z.infer<typeof documentManifestEntrySchema>;
export type WorldPackageManifest = z.infer<typeof worldPackageManifestSchema>;
export type WorldPackageReference = z.infer<typeof worldPackageReferenceSchema>;
export type RulePackageManifest = z.infer<typeof rulePackageManifestSchema>;
export type RulePackageReference = z.infer<typeof rulePackageReferenceSchema>;
export type StartPackageManifest = z.infer<typeof startPackageManifestSchema>;
export type StartPackageReference = z.infer<typeof startPackageReferenceSchema>;
