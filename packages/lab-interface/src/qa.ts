import { z } from 'zod';

const identifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const shortTextSchema = z.string().trim().min(1).max(300);

export const qaCostClassSchema = z.enum([
  'offline',
  'potentially-billable',
  'live-billable',
]);
export const qaDriverSchema = z.enum([
  'manual-chamber',
  'browser-automation',
  'api-script',
]);
export const qaImportanceSchema = z.enum([
  'poc-blocker',
  'major',
  'minor',
  'observation',
]);
export const qaAssessmentSchema = z.enum(['structural', 'human-judgment']);
export const qaRubricDimensionIdSchema = z.enum([
  'situation-fidelity',
  'intention-fidelity',
  'option-agency',
  'consequence-integrity',
  'profile-expression',
  'continuity',
  'readability',
]);
export type QaRubricDimensionId = z.infer<typeof qaRubricDimensionIdSchema>;
export const qaQualityRubric = [
  {
    id: 'situation-fidelity',
    name: 'Situation fidelity',
    anchors: [
      'Contradicts committed state',
      'Partly respects it',
      'Clearly respects it',
    ],
  },
  {
    id: 'intention-fidelity',
    name: 'Intention fidelity',
    anchors: ['Ignores the intention', 'Partly follows it', 'Resolves it'],
  },
  {
    id: 'option-agency',
    name: 'Option agency',
    anchors: [
      'Synonyms or impossible',
      'Mixed agency',
      'Distinct feasible intentions',
    ],
  },
  {
    id: 'consequence-integrity',
    name: 'Consequence integrity',
    anchors: [
      'Conflicts with receipts',
      'Vague',
      'Accurately incorporates mechanics',
    ],
  },
  {
    id: 'profile-expression',
    name: 'Profile expression',
    anchors: [
      'Absent or disruptive',
      'Visible but shallow',
      'Shapes development coherently',
    ],
  },
  {
    id: 'continuity',
    name: 'Continuity',
    anchors: [
      'Forgets consequential facts',
      'Partly recalls them',
      'Uses them correctly',
    ],
  },
  {
    id: 'readability',
    name: 'Readability',
    anchors: ['Confusing', 'Serviceable', 'Clear and playable'],
  },
] as const;
export const qaStageStatusSchema = z.enum([
  'passed',
  'failed',
  'blocked',
  'skipped',
  'not-run',
]);
export const qaRecordedStageStatusSchema = qaStageStatusSchema.exclude([
  'not-run',
]);
export const qaDispositionSchema = z.enum([
  'useful-evidence',
  'inconclusive',
  'product-defect',
  'infrastructure-defect',
  'design-question',
]);
export type QaDisposition = z.infer<typeof qaDispositionSchema>;

export const qaEvidenceRequirementSchema = z.strictObject({
  kind: identifierSchema,
  description: shortTextSchema,
  required: z.boolean(),
});

export const qaAvailabilitySchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('available') }),
  z.strictObject({
    state: z.literal('planned'),
    reason: shortTextSchema,
  }),
]);

export const qaStageDefinitionSchema = z.strictObject({
  id: identifierSchema,
  name: z.string().trim().min(1).max(100),
  importance: qaImportanceSchema,
  assessment: qaAssessmentSchema,
  rubricDimensions: z.array(qaRubricDimensionIdSchema).max(7),
  preconditions: z.array(shortTextSchema).max(12),
  action: shortTextSchema,
  observableExpectation: shortTextSchema,
  authoritativeExpectation: shortTextSchema,
  evidence: z.array(qaEvidenceRequirementSchema).min(1).max(12),
});

export const qaCaseVariantSchema = z.strictObject({
  id: identifierSchema,
  name: z.string().trim().min(1).max(100),
  description: shortTextSchema,
  availability: qaAvailabilitySchema,
  prerequisites: z.array(shortTextSchema).max(12),
});

export const qaJourneyCaseSchema = z
  .strictObject({
    id: identifierSchema,
    version: z.number().int().positive().max(2147483647),
    name: z.string().trim().min(1).max(120),
    purpose: shortTextSchema,
    risk: shortTextSchema,
    costClass: qaCostClassSchema,
    availability: qaAvailabilitySchema,
    prerequisites: z.array(shortTextSchema).max(20),
    initialScenario: identifierSchema.nullable(),
    drivers: z.array(qaDriverSchema).min(1).max(2),
    variants: z.array(qaCaseVariantSchema).max(12),
    stages: z.array(qaStageDefinitionSchema).min(1).max(30),
    evidenceRequirements: z.array(qaEvidenceRequirementSchema).min(1).max(20),
    resetPolicy: shortTextSchema,
    nonAssertions: z.array(shortTextSchema).max(20),
  })
  .superRefine((value, context) => {
    for (const [path, values] of [
      ['variants', value.variants],
      ['stages', value.stages],
    ] as const) {
      const ids = new Set<string>();
      values.forEach((item, index) => {
        if (ids.has(item.id)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate ${path} id`,
            path: [path, index, 'id'],
          });
        }
        ids.add(item.id);
      });
    }
    value.stages.forEach((stage, index) => {
      const dimensions = new Set(stage.rubricDimensions);
      if (dimensions.size !== stage.rubricDimensions.length) {
        context.addIssue({
          code: 'custom',
          message: 'Duplicate rubric dimension',
          path: ['stages', index, 'rubricDimensions'],
        });
      }
      if (
        (stage.assessment === 'structural') !==
        (stage.rubricDimensions.length === 0)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Structural stages have no rubric; human-judgment stages require one',
          path: ['stages', index, 'rubricDimensions'],
        });
      }
    });
    if (
      value.costClass !== 'offline' &&
      value.availability.state === 'available'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Billable QA cases require a separate execution preflight',
        path: ['availability'],
      });
    }
  });
export type QaJourneyCase = z.infer<typeof qaJourneyCaseSchema>;

export const qaEvidenceReferenceSchema = z.strictObject({
  kind: identifierSchema,
  reference: z.string().trim().min(1).max(500),
  label: z.string().trim().min(1).max(120).optional(),
});

export const qaRunSetupSchema = z.strictObject({
  scenario: identifierSchema.nullable().optional(),
  storytellerProfileId: identifierSchema.nullable().optional(),
  storytellerRevision: z.number().int().positive().nullable().optional(),
  settingsRevision: z.number().int().positive().nullable().optional(),
});

export const qaGitStateSchema = z.strictObject({
  commit: z.string().trim().min(7).max(64),
  dirty: z.boolean(),
});
export const qaEnvironmentSchema = z.strictObject({
  identity: z.string().trim().min(1).max(120),
});

export const openQaRunSchema = z.strictObject({
  caseId: identifierSchema,
  caseVersion: z.number().int().positive(),
  variantId: identifierSchema.nullable(),
  driver: qaDriverSchema,
  setup: qaRunSetupSchema,
});
export type OpenQaRun = z.infer<typeof openQaRunSchema>;

export const recordQaStageSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  status: qaRecordedStageStatusSchema,
  observation: z.string().trim().min(1).max(4000),
  evidence: z.array(qaEvidenceReferenceSchema).max(30),
  ratings: z
    .array(
      z.strictObject({
        dimension: qaRubricDimensionIdSchema,
        score: z.number().int().min(0).max(2),
        evidence: z.string().trim().min(1).max(1000),
      }),
    )
    .max(7),
});
export type RecordQaStage = z.infer<typeof recordQaStageSchema>;

export const finalizeQaRunSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  disposition: qaDispositionSchema,
  operatorNotes: z.string().trim().min(1).max(8000),
});
export type FinalizeQaRun = z.infer<typeof finalizeQaRunSchema>;

export const qaStageResultSchema = z.discriminatedUnion('status', [
  z.strictObject({
    stageId: identifierSchema,
    status: qaRecordedStageStatusSchema,
    observation: z.string().min(1),
    evidence: z.array(qaEvidenceReferenceSchema),
    ratings: recordQaStageSchema.shape.ratings,
    recordedAt: z.iso.datetime(),
  }),
  z.strictObject({
    stageId: identifierSchema,
    status: z.literal('not-run'),
    observation: z.null(),
    evidence: z.tuple([]),
    ratings: z.tuple([]),
    recordedAt: z.null(),
  }),
]);

export const qaExecutionSchema = z.strictObject({
  mode: z.enum(['offline', 'live']),
  modelPolicyId: identifierSchema.nullable(),
  pricingPolicyId: identifierSchema.nullable(),
});

export const qaAccountingSchema = z.strictObject({
  providerCallCount: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  verifiedChargeMicrousd: z.number().int().nonnegative(),
  outstandingReservationMicrousd: z.number().int().nonnegative(),
  certainty: z.enum(['not-applicable', 'estimated', 'verified', 'uncertain']),
});

export const qaRunSchema = z.strictObject({
  id: z.uuid(),
  case: qaJourneyCaseSchema,
  variantId: identifierSchema.nullable(),
  driver: qaDriverSchema,
  state: z.enum(['open', 'finalized']),
  revision: z.number().int().positive(),
  git: qaGitStateSchema,
  environment: qaEnvironmentSchema,
  setup: qaRunSetupSchema,
  execution: qaExecutionSchema,
  accounting: qaAccountingSchema,
  stages: z.array(qaStageResultSchema),
  startedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  finalizedAt: z.iso.datetime().nullable(),
  disposition: qaDispositionSchema.nullable(),
  operatorNotes: z.string().nullable(),
});
export type QaRun = z.infer<typeof qaRunSchema>;

export const qaRunSummarySchema = z.strictObject({
  id: z.uuid(),
  caseId: identifierSchema,
  caseVersion: z.number().int().positive(),
  caseName: z.string().min(1),
  variantId: identifierSchema.nullable(),
  state: z.enum(['open', 'finalized']),
  disposition: qaDispositionSchema.nullable(),
  startedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type QaRunSummary = z.infer<typeof qaRunSummarySchema>;

export const qaEvidenceBundleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  rubric: z.array(
    z.strictObject({
      id: qaRubricDimensionIdSchema,
      name: z.string(),
      anchors: z.tuple([z.string(), z.string(), z.string()]),
    }),
  ),
  run: qaRunSchema,
});
export type QaEvidenceBundle = z.infer<typeof qaEvidenceBundleSchema>;
