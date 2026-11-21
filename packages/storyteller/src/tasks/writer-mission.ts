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

const writerMissionCaptureCommonFields = {
  generationId: z.uuid(),
  operationId: z.uuid(),
  ownerId: z.uuid(),
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
    ...writerMissionCaptureCommonFields,
    sceneFrontier: writerMissionSceneFrontierSchema,
  })
  .superRefine(refineWriterMissionCaptureDuplicates);

export const writerMissionCaptureV2OpeningSchema = z
  .strictObject({
    version: z.literal('writer-mission.v2'),
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

export const writerMissionCaptureSchema = z.discriminatedUnion('version', [
  writerMissionCaptureV1Schema,
  writerMissionCaptureV2OpeningSchema,
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

export const writerSceneProposalSchema = z
  .strictObject({
    version: z.literal(1),
    summary: z.string().trim().min(1).max(2_000),
    stagedObjectHashes: z.array(sha256HexSchema).max(16),
    sourceEvidence: z.array(writerSceneSourceEvidenceSchema).max(32),
  })
  .superRefine((proposal, context) => {
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
  });

export type WriterSceneProposal = z.infer<typeof writerSceneProposalSchema>;

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
  if (decision.kind !== 'tool-calls') {
    return;
  }
  const granted = new Set(capture.toolsAllowlist);
  for (const call of decision.calls) {
    if (!granted.has(call.name)) {
      throw new Error('ungranted_writer_tool');
    }
  }
}
