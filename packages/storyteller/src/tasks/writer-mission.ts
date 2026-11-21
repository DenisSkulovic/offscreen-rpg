import {
  interactionSpecificationSchema,
  type InteractionSpecification,
} from '@offscreen/contracts/interactions';
import { passageContentSchema } from '@offscreen/contracts/stories';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { z } from 'zod';

const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const WRITER_MANDATORY_TOOL_NAMES = [
  'library.browse',
  'library.find',
  'library.read',
  'library.diff',
  'skills.open',
  'workdesk.stage',
  'workdesk.read',
  'workdesk.diff',
  'workdesk.discard',
  'submit_scene',
] as const;

export const writerToolNameSchema = z.enum(WRITER_MANDATORY_TOOL_NAMES);

export type WriterToolName = z.infer<typeof writerToolNameSchema>;

export const writerToolCallIdSchema = z.string().regex(/^t[1-9][0-9]*$/);

export const writerModelSelectionSchema = z.strictObject({
  provider: z.literal('openrouter'),
  model: z.string().trim().min(1).max(160),
});

export const writerMissionEffectiveBudgetsSchema = z.strictObject({
  maxModelRounds: z.number().int().positive().max(32),
  maxInputTokens: z.number().int().positive().max(200_000),
  maxGeneratedTokens: z.number().int().positive().max(32_000),
  maxMicrousd: z
    .string()
    .regex(/^\d{1,16}$/)
    .refine((value) => {
      const spend = BigInt(value);
      return spend > 0n && spend <= 10_000_000_000n;
    }, 'Writer mission spend must be finite and positive'),
  deadlineMs: z.number().int().positive().max(3_600_000),
});

export const writerMissionSceneFrontierSchema = z.strictObject({
  passageId: z.uuid(),
  narrativeRevision: z.number().int().positive(),
  sequence: z.number().int().nonnegative(),
});

export const writerMissionSceneScopeOpeningSchema = z.strictObject({
  kind: z.literal('opening'),
  reservedStoryId: z.uuid(),
  reservedFirstPassageId: z.uuid(),
});

export const writerMissionSceneScopeContinuationSchema = z.strictObject({
  kind: z.literal('continuation'),
  baseSceneSequence: z.number().int().nonnegative(),
  basePassageId: z.uuid(),
  baseCheckpointHash: sha256HexSchema,
  baseRootHash: sha256HexSchema,
  baseRootRevision: z.number().int().positive(),
  baseNarrativeRevision: z.number().int().positive(),
  baseCampaignStateRevision: z.number().int().nonnegative(),
  controllingIntentOrReceiptId: z.uuid(),
  scenarioKind: z.enum(['narrative-only', 'mechanical']),
});

/** v1 capture bytes require a UUID owner; v2 opening allows Better Auth text ids. */
export const writerMissionV1OwnerIdSchema = z.uuid();

export const writerMissionV2OpeningOwnerIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value.trim().length > 0, {
    message: 'Writer mission ownerId must not be empty or whitespace-only',
  });

const writerMissionCaptureCommonFields = {
  generationId: z.uuid(),
  operationId: z.uuid(),
  storyId: z.uuid(),
  libraryRootHash: sha256HexSchema,
  libraryRootRevision: z.number().int().positive(),
  profileObjectHash: sha256HexSchema,
  skillObjectHashes: z.array(sha256HexSchema).max(16),
  toolsAllowlist: z.array(writerToolNameSchema).min(1).max(10),
  modelSelection: writerModelSelectionSchema,
  budgets: writerMissionEffectiveBudgetsSchema,
  capturedRequestHash: sha256HexSchema,
} as const;

function refineWriterMissionCaptureDuplicates(
  capture: {
    toolsAllowlist: WriterToolName[];
    skillObjectHashes: string[];
  },
  context: z.RefinementCtx,
): void {
  const toolNames = capture.toolsAllowlist;
  if (new Set(toolNames).size !== toolNames.length) {
    context.addIssue({
      code: 'custom',
      path: ['toolsAllowlist'],
      message: 'Writer tool grant must not list duplicate tool names',
    });
  }
  const skillHashes = capture.skillObjectHashes;
  if (new Set(skillHashes).size !== skillHashes.length) {
    context.addIssue({
      code: 'custom',
      path: ['skillObjectHashes'],
      message: 'Skill pins must be unique within a mission capture',
    });
  }
}

export const writerMissionCaptureV1Schema = z
  .strictObject({
    version: z.literal('writer-mission.v1'),
    ownerId: writerMissionV1OwnerIdSchema,
    ...writerMissionCaptureCommonFields,
    sceneFrontier: writerMissionSceneFrontierSchema,
  })
  .superRefine(refineWriterMissionCaptureDuplicates);

export const writerMissionCaptureV2OpeningSchema = z
  .strictObject({
    version: z.literal('writer-mission.v2'),
    ownerId: writerMissionV2OpeningOwnerIdSchema,
    ...writerMissionCaptureCommonFields,
    sceneScope: writerMissionSceneScopeOpeningSchema,
  })
  .superRefine((capture, context) => {
    refineWriterMissionCaptureDuplicates(capture, context);
    if (capture.sceneScope.reservedStoryId !== capture.storyId) {
      context.addIssue({
        code: 'custom',
        path: ['sceneScope', 'reservedStoryId'],
        message:
          'Opening scene scope reservedStoryId must match the mission storyId',
      });
    }
  });

export const writerMissionCaptureV3ContinuationSchema = z
  .strictObject({
    version: z.literal('writer-mission.v3'),
    ownerId: writerMissionV2OpeningOwnerIdSchema,
    ...writerMissionCaptureCommonFields,
    sceneScope: writerMissionSceneScopeContinuationSchema,
  })
  .superRefine((capture, context) => {
    refineWriterMissionCaptureDuplicates(capture, context);
    if (capture.sceneScope.baseRootHash !== capture.libraryRootHash) {
      context.addIssue({
        code: 'custom',
        path: ['sceneScope', 'baseRootHash'],
        message: 'Continuation baseRootHash must match libraryRootHash',
      });
    }
  });

export const writerMissionCaptureSchema = z.discriminatedUnion('version', [
  writerMissionCaptureV1Schema,
  writerMissionCaptureV2OpeningSchema,
  writerMissionCaptureV3ContinuationSchema,
]);

export type WriterMissionCapture = z.infer<typeof writerMissionCaptureSchema>;

/** Versioned writer-round route; parsed separately from legacy StorytellerTask. */
export const writerRoundTaskSchema = z.strictObject({
  version: z.literal('writer-round.v1'),
  mission: writerMissionCaptureSchema,
});

const writerToolCallArgsSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => Buffer.byteLength(JSON.stringify(value)) <= 4_096,
    'Writer tool args must stay within the round byte cap',
  );

export const writerToolCallSchema = z.strictObject({
  id: writerToolCallIdSchema,
  name: writerToolNameSchema,
  args: writerToolCallArgsSchema,
});

export const writerSceneSourceEvidenceSchema = z.strictObject({
  rootHash: sha256HexSchema,
  objectHash: sha256HexSchema,
  section: z.string().trim().min(1).max(240),
  assertedAsFact: z.boolean(),
});

export type WriterSceneSourceEvidence = z.infer<
  typeof writerSceneSourceEvidenceSchema
>;

const writerSceneProposalCommonFields = {
  summary: z.string().trim().min(1).max(2_000),
  stagedObjectHashes: z.array(sha256HexSchema).max(16),
  sourceEvidence: z.array(writerSceneSourceEvidenceSchema).max(32),
} as const;

function refineWriterSceneProposalDuplicates(
  proposal: {
    stagedObjectHashes: string[];
    sourceEvidence: WriterSceneSourceEvidence[];
  },
  context: z.RefinementCtx,
): void {
  if (
    new Set(proposal.stagedObjectHashes).size !==
    proposal.stagedObjectHashes.length
  ) {
    context.addIssue({
      code: 'custom',
      path: ['stagedObjectHashes'],
      message: 'Staged object hashes must be unique',
    });
  }
  const sourceKeys = proposal.sourceEvidence.map(
    (item) => `${item.rootHash}:${item.objectHash}:${item.section}`,
  );
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    context.addIssue({
      code: 'custom',
      path: ['sourceEvidence'],
      message: 'Source-evidence provenance rows must be unique',
    });
  }
}

type WriterSceneProposalV3Scene = {
  interaction: InteractionSpecification | null;
  authoredIntents: z.infer<typeof narrativeIntentPlanSchema>[];
};

function refineWriterSceneProposalV3AuthoredIntents(
  proposal: { scene: WriterSceneProposalV3Scene },
  context: z.RefinementCtx,
): void {
  const { interaction, authoredIntents } = proposal.scene;
  if (interaction === null) {
    if (authoredIntents.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['scene', 'authoredIntents'],
        message:
          'Authored narrative intents require a choice interaction binding',
      });
    }
    return;
  }

  if (interaction.kind === 'choice.v1') {
    const optionIds = interaction.options.map((option) => option.id);
    const intentKeys = authoredIntents.map((intent) => intent.key);
    if (new Set(intentKeys).size !== intentKeys.length) {
      context.addIssue({
        code: 'custom',
        path: ['scene', 'authoredIntents'],
        message: 'Authored narrative intent keys must be unique',
      });
    }
    for (const optionId of optionIds) {
      const matches = authoredIntents.filter((intent) => intent.key === optionId);
      if (matches.length !== 1) {
        context.addIssue({
          code: 'custom',
          path: ['scene', 'authoredIntents'],
          message: `Each choice option must have exactly one authored intent (missing or duplicate for ${optionId})`,
        });
      }
    }
    for (const intent of authoredIntents) {
      if (!optionIds.includes(intent.key)) {
        context.addIssue({
          code: 'custom',
          path: ['scene', 'authoredIntents'],
          message: `Authored intent key is not an offered choice option (${intent.key})`,
        });
      }
    }
    return;
  }

  if (authoredIntents.length > 0) {
    context.addIssue({
      code: 'custom',
      path: ['scene', 'authoredIntents'],
      message: 'Authored narrative intents are only allowed for choice.v1 interactions',
    });
  }
}

function refineWriterSceneProposalV3DocumentChanges(
  proposal: {
    documentChanges: {
      documentId: string;
      path: string;
    }[];
  },
  context: z.RefinementCtx,
): void {
  const documentIds = proposal.documentChanges.map((change) => change.documentId);
  if (new Set(documentIds).size !== documentIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['documentChanges'],
      message: 'Document change documentId values must be unique',
    });
  }
  const paths = proposal.documentChanges.map((change) => change.path);
  if (new Set(paths).size !== paths.length) {
    context.addIssue({
      code: 'custom',
      path: ['documentChanges'],
      message: 'Document change paths must be unique',
    });
  }
}

const writerSceneDocumentChangeV3Schema = z.strictObject({
  documentId: z.uuid(),
  path: z.string().trim().min(1).max(240),
  stagedObjectHash: sha256HexSchema,
  changeKind: z.enum(['adopt', 'discard']),
  expectedBaseObjectHash: sha256HexSchema,
  visibility: z.enum(['public', 'private']),
  authority: z.enum(['canon', 'possibility']),
  sourceEvidenceRefs: z.array(z.number().int().nonnegative()).max(8),
});

export const writerSceneProposalV1Schema = z
  .strictObject({
    version: z.literal(1),
    ...writerSceneProposalCommonFields,
  })
  .superRefine(refineWriterSceneProposalDuplicates);

export const writerOpeningSceneProposalV2Schema = z
  .strictObject({
    version: z.literal(2),
    ...writerSceneProposalCommonFields,
    scene: z.strictObject({
      content: passageContentSchema,
      interaction: interactionSpecificationSchema.nullable(),
    }),
  })
  .superRefine(refineWriterSceneProposalDuplicates);

export const writerSceneProposalV3Schema = z
  .strictObject({
    version: z.literal(3),
    ...writerSceneProposalCommonFields,
    scene: z.strictObject({
      content: passageContentSchema,
      interaction: interactionSpecificationSchema.nullable(),
      authoredIntents: z.array(narrativeIntentPlanSchema).max(8),
    }),
    documentChanges: z.array(writerSceneDocumentChangeV3Schema).max(8),
  })
  .superRefine((proposal, context) => {
    refineWriterSceneProposalDuplicates(proposal, context);
    refineWriterSceneProposalV3AuthoredIntents(proposal, context);
    refineWriterSceneProposalV3DocumentChanges(proposal, context);
  });

export const writerSceneProposalSchema = z.discriminatedUnion('version', [
  writerSceneProposalV1Schema,
  writerOpeningSceneProposalV2Schema,
  writerSceneProposalV3Schema,
]);

export type WriterSceneProposal = z.infer<typeof writerSceneProposalSchema>;

export type WriterOpeningSceneProposal = z.infer<
  typeof writerOpeningSceneProposalV2Schema
>;

export type WriterSceneProposalV3 = z.infer<typeof writerSceneProposalV3Schema>;

export const writerRoundDecisionSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('tool-calls'),
      calls: z.array(writerToolCallSchema).min(1).max(8),
    }),
    z.strictObject({
      kind: z.literal('final'),
      proposal: writerSceneProposalSchema,
    }),
  ])
  .superRefine((decision, context) => {
    if (decision.kind !== 'tool-calls') {
      return;
    }
    const ids = decision.calls.map((call) => call.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        path: ['calls'],
        message: 'Tool-call ids must be unique within a round',
      });
    }
  });

export type WriterRoundDecision = z.infer<typeof writerRoundDecisionSchema>;

export const writerToolInvocationResultSchema = z.strictObject({
  version: z.literal('writer-tool-result.v1'),
  toolCallId: writerToolCallIdSchema,
  name: writerToolNameSchema,
  resultHash: sha256HexSchema,
  summary: z.string().trim().min(1).max(480),
});

export type WriterToolInvocationResult = z.infer<
  typeof writerToolInvocationResultSchema
>;

/** Decision tool names must match the mission capture grant; no capability expansion. */
export function validateWriterRoundDecisionForCapture(
  capture: WriterMissionCapture,
  decision: WriterRoundDecision,
): void {
  if (decision.kind === 'tool-calls') {
    const granted = new Set(capture.toolsAllowlist);
    for (const call of decision.calls) {
      if (!granted.has(call.name)) {
        throw new Error('ungranted_writer_tool');
      }
    }
    return;
  }

  const expectedProposalVersion =
    capture.version === 'writer-mission.v1'
      ? 1
      : capture.version === 'writer-mission.v2'
        ? 2
        : 3;
  if (decision.proposal.version !== expectedProposalVersion) {
    throw new Error('writer_proposal_version_mismatch');
  }
}
