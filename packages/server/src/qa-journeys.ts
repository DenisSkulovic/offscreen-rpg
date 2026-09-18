import {
  finalizeQaRunSchema,
  openQaRunSchema,
  qaEvidenceReferenceSchema,
  qaJourneyCaseSchema,
  qaRunSchema,
  qaRunSummarySchema,
  qaQualityRubric,
  recordQaStageSchema,
  type QaRun,
  type qaEnvironmentSchema,
  type qaGitStateSchema,
} from '@offscreen/contracts/qa';
import type { Database } from '@offscreen/db';
import { qaRun, qaRunStage } from '@offscreen/db/qa-schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { findQaJourneyCase, listQaJourneyCases } from './qa-catalog';

export type QaJourneyErrorCode =
  'invalid' | 'not_found' | 'conflict' | 'unavailable';

export class QaJourneyError extends Error {
  constructor(readonly code: QaJourneyErrorCode) {
    super(code);
  }
}

const runIdSchema = z.uuid();
const offlineAccounting = {
  providerCallCount: 0,
  inputTokens: 0,
  outputTokens: 0,
  verifiedChargeMicrousd: 0,
  outstandingReservationMicrousd: 0,
  certainty: 'not-applicable',
} as const;

type QaJourneyContext = {
  git: z.infer<typeof qaGitStateSchema>;
  environment: z.infer<typeof qaEnvironmentSchema>;
};

export function createQaJourneys(
  database: Database,
  context: QaJourneyContext,
) {
  async function read(args: {
    ownerId: string;
    runId: string;
  }): Promise<QaRun> {
    if (!runIdSchema.safeParse(args.runId).success) {
      throw new QaJourneyError('invalid');
    }
    const [record] = await database.db
      .select()
      .from(qaRun)
      .where(and(eq(qaRun.id, args.runId), eq(qaRun.ownerId, args.ownerId)));
    if (!record) {
      throw new QaJourneyError('not_found');
    }
    const stages = await database.db
      .select()
      .from(qaRunStage)
      .where(eq(qaRunStage.runId, record.id))
      .orderBy(asc(qaRunStage.ordinal));
    const definition = qaJourneyCaseSchema.parse(record.caseDefinition);
    const recordedById = new Map(
      stages.map((result) => [result.stageId, result]),
    );
    return qaRunSchema.parse({
      id: record.id,
      case: definition,
      variantId: record.variantId,
      driver: record.driver,
      state: record.state,
      revision: record.revision,
      git: { commit: record.gitCommit, dirty: record.gitDirty },
      environment: record.environment,
      setup: record.setup,
      execution: record.execution,
      accounting: record.accounting,
      stages: definition.stages.map((stage) => {
        const result = recordedById.get(stage.id);
        return result
          ? {
              stageId: result.stageId,
              status: result.status,
              observation: result.observation,
              evidence: z
                .array(qaEvidenceReferenceSchema)
                .parse(result.evidence),
              ratings: recordQaStageSchema.shape.ratings.parse(result.ratings),
              recordedAt: result.recordedAt.toISOString(),
            }
          : {
              stageId: stage.id,
              status: 'not-run' as const,
              observation: null,
              evidence: [],
              ratings: [],
              recordedAt: null,
            };
      }),
      startedAt: record.startedAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      finalizedAt: record.finalizedAt?.toISOString() ?? null,
      disposition: record.disposition,
      operatorNotes: record.operatorNotes,
    });
  }

  return {
    catalogue: listQaJourneyCases,
    async list(args: { ownerId: string }) {
      const records = await database.db
        .select()
        .from(qaRun)
        .where(eq(qaRun.ownerId, args.ownerId))
        .orderBy(desc(qaRun.startedAt))
        .limit(20);
      return qaRunSummarySchema.array().parse(
        records.map((record) => {
          const definition = qaJourneyCaseSchema.parse(record.caseDefinition);
          return {
            id: record.id,
            caseId: record.caseId,
            caseVersion: record.caseVersion,
            caseName: definition.name,
            variantId: record.variantId,
            state: record.state,
            disposition: record.disposition,
            startedAt: record.startedAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
          };
        }),
      );
    },
    read,
    async open(args: {
      ownerId: string;
      runId: string;
      body: unknown;
    }): Promise<QaRun> {
      const parsedId = runIdSchema.safeParse(args.runId);
      const parsed = openQaRunSchema.safeParse(args.body);
      if (!parsedId.success || !parsed.success) {
        throw new QaJourneyError('invalid');
      }
      const definition = findQaJourneyCase(
        parsed.data.caseId,
        parsed.data.caseVersion,
      );
      if (!definition) {
        throw new QaJourneyError('invalid');
      }
      if (
        definition.availability.state !== 'available' ||
        definition.costClass !== 'offline'
      ) {
        throw new QaJourneyError('unavailable');
      }
      if (!definition.drivers.includes(parsed.data.driver)) {
        throw new QaJourneyError('invalid');
      }
      const selectedVariant = definition.variants.find(
        (variant) => variant.id === parsed.data.variantId,
      );
      const variantValid =
        definition.variants.length === 0
          ? parsed.data.variantId === null
          : selectedVariant !== undefined;
      if (!variantValid) {
        throw new QaJourneyError('invalid');
      }
      if (selectedVariant?.availability.state === 'planned') {
        throw new QaJourneyError('unavailable');
      }

      const inserted = await database.db
        .insert(qaRun)
        .values({
          id: parsedId.data,
          ownerId: args.ownerId,
          caseId: definition.id,
          caseVersion: definition.version,
          caseDefinition: definition,
          variantId: parsed.data.variantId,
          driver: parsed.data.driver,
          state: 'open',
          revision: 1,
          gitCommit: context.git.commit,
          gitDirty: context.git.dirty,
          environment: context.environment,
          setup: parsed.data.setup,
          execution: {
            mode: 'offline',
            modelPolicyId: null,
            pricingPolicyId: null,
          },
          accounting: offlineAccounting,
        })
        .onConflictDoNothing({ target: qaRun.id })
        .returning({ id: qaRun.id });
      if (inserted.length === 0) {
        throw new QaJourneyError('conflict');
      }
      return read({ ownerId: args.ownerId, runId: parsedId.data });
    },
    async recordStage(args: {
      ownerId: string;
      runId: string;
      stageId: string;
      body: unknown;
    }): Promise<QaRun> {
      const parsedId = runIdSchema.safeParse(args.runId);
      const parsed = recordQaStageSchema.safeParse(args.body);
      if (!parsedId.success || !parsed.success) {
        throw new QaJourneyError('invalid');
      }
      await database.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(qaRun)
          .where(
            and(eq(qaRun.id, parsedId.data), eq(qaRun.ownerId, args.ownerId)),
          )
          .for('update');
        if (!current) {
          throw new QaJourneyError('not_found');
        }
        if (
          current.state !== 'open' ||
          current.revision !== parsed.data.expectedRevision
        ) {
          throw new QaJourneyError('conflict');
        }
        const definition = qaJourneyCaseSchema.parse(current.caseDefinition);
        const recorded = await tx
          .select({ stageId: qaRunStage.stageId })
          .from(qaRunStage)
          .where(eq(qaRunStage.runId, current.id))
          .orderBy(asc(qaRunStage.ordinal));
        const expected = definition.stages[recorded.length];
        if (!expected || expected.id !== args.stageId) {
          throw new QaJourneyError('conflict');
        }
        if (
          ['passed', 'failed'].includes(parsed.data.status) &&
          expected.evidence.some(
            (requirement) =>
              requirement.required &&
              !parsed.data.evidence.some(
                (reference) => reference.kind === requirement.kind,
              ),
          )
        ) {
          throw new QaJourneyError('invalid');
        }
        const ratingDimensions = new Set(
          parsed.data.ratings.map((rating) => rating.dimension),
        );
        if (
          ratingDimensions.size !== parsed.data.ratings.length ||
          (['passed', 'failed'].includes(parsed.data.status) &&
            expected.rubricDimensions.some(
              (dimension) => !ratingDimensions.has(dimension),
            )) ||
          parsed.data.ratings.some(
            (rating) => !expected.rubricDimensions.includes(rating.dimension),
          )
        ) {
          throw new QaJourneyError('invalid');
        }
        await tx.insert(qaRunStage).values({
          runId: current.id,
          stageId: expected.id,
          ordinal: recorded.length,
          status: parsed.data.status,
          observation: parsed.data.observation,
          evidence: parsed.data.evidence,
          ratings: parsed.data.ratings,
        });
        await tx
          .update(qaRun)
          .set({ revision: current.revision + 1, updatedAt: new Date() })
          .where(eq(qaRun.id, current.id));
      });
      return read({ ownerId: args.ownerId, runId: parsedId.data });
    },
    async finalize(args: {
      ownerId: string;
      runId: string;
      body: unknown;
    }): Promise<QaRun> {
      const parsedId = runIdSchema.safeParse(args.runId);
      const parsed = finalizeQaRunSchema.safeParse(args.body);
      if (!parsedId.success || !parsed.success) {
        throw new QaJourneyError('invalid');
      }
      await database.db.transaction(async (tx) => {
        const [current] = await tx
          .select({ state: qaRun.state, revision: qaRun.revision })
          .from(qaRun)
          .where(
            and(eq(qaRun.id, parsedId.data), eq(qaRun.ownerId, args.ownerId)),
          )
          .for('update');
        if (!current) {
          throw new QaJourneyError('not_found');
        }
        if (
          current.state !== 'open' ||
          current.revision !== parsed.data.expectedRevision
        ) {
          throw new QaJourneyError('conflict');
        }
        const now = new Date();
        await tx
          .update(qaRun)
          .set({
            state: 'finalized',
            revision: current.revision + 1,
            disposition: parsed.data.disposition,
            operatorNotes: parsed.data.operatorNotes,
            finalizedAt: now,
            updatedAt: now,
          })
          .where(eq(qaRun.id, parsedId.data));
      });
      return read({ ownerId: args.ownerId, runId: parsedId.data });
    },
    async evidence(args: { ownerId: string; runId: string }) {
      const run = await read(args);
      if (run.state !== 'finalized') {
        throw new QaJourneyError('conflict');
      }
      return {
        schemaVersion: 1 as const,
        exportedAt: new Date().toISOString(),
        rubric: [...qaQualityRubric],
        run,
      };
    },
  };
}
