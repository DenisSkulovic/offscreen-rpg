import { z } from 'zod';

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
