import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerRun,
} from '@offscreen/story-persistence/storyteller';
import {
  diagnoseStorytellerResult,
  prepareStorytellerRepairRequest,
  storytellerOutputDiagnosticSchema,
  storytellerTaskSchema,
  validateStorytellerResult,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import type {
  StorytellerProvider,
  StorytellerProviderDispatch,
} from '@offscreen/storyteller/providers/openrouter';
import type { EffectiveUsagePolicy } from '@offscreen/usage-policy/usage-policy';
import { createStorytellerBudget, StorytellerBudgetError } from './budget';
import { prepareReviewedDispatch } from './dispatch-review';
import { retainsCapturedAuthority } from './dispatch-authority';
import type { DocumentStore } from '@offscreen/documents';
import { createLexicalStoryIndexCache } from './lexical-story-index-cache';
import type { LexicalStoryIndexCache } from './lexical-story-index-cache';
import { createCanonicalMemoryExplorer } from './memory-exploration';
import {
  MemoryExplorationControllerError,
  runMemoryExploration,
} from './memory-exploration-controller';
import { createMemoryProviderRoundRuntime } from './memory-provider-runtime';
import { resolveStoryRetrievalRecipe } from './retrieval-recipes';
import { recordExecutionStage } from './execution-stages';
import { storytellerKind } from './records';
import type { Transaction } from '@offscreen/db/outbox';
import {
  acceptWriterSceneProposal,
  type WriterSceneProposalAccepted,
} from './writer-scene-proposal';

export type { WriterSceneProposalAccepted };
export { acceptWriterSceneProposal as submitWriterSceneProposal };

const custodyVersion = 'storyteller.task-claim.v1';
const scriptedCustodyProvider = 'scripted-custody';

export type PinnedStorytellerRoot = string | null;

export type StorytellerClaimGeneration = {
  id: string;
  ownerId: string;
  kind: string;
  input: unknown;
};

export type StorytellerClaimAttempt = {
  id: string;
  generationId: string;
  createdAt: Date;
  state: 'reserved' | 'dispatched' | 'settled' | 'uncertain' | 'unsent';
  requestedProvider: string;
  attribution: unknown;
};

export type ScriptedClaimInsert = {
  /** True only for a scripted claim that has no captured funding identity. */
  createStoppedFunding: boolean;
  fundingId: string;
  runId: string;
  attempt: StorytellerClaimAttempt & {
    ownerId: string;
    storyId: string | null;
    draftId: string | null;
    purpose: string;
    storytellerProfileId: string;
    storytellerProfileRevision: number;
    taskInputVersion: number;
    promptVersion: string;
    recipeVersion: string;
    resourcePolicyVersion: string;
    requestedModel: string;
    priceVersion: string;
    policy: unknown;
  };
};

export type ClaimResultUpdate = {
  attemptId: string;
  attribution: unknown;
  settlement: { dispatchedAt: Date; settledAt: Date } | null;
};

/** Persistence for one claim. The production store writes `storyteller_attempt`. */
export type StorytellerClaimTx = {
  lockGeneration(id: string): Promise<StorytellerClaimGeneration | null>;
  lockAttempts(generationId: string): Promise<StorytellerClaimAttempt[]>;
  insertScriptedClaim(row: ScriptedClaimInsert): Promise<void>;
  saveClaimResult(update: ClaimResultUpdate): Promise<void>;
};

export type StorytellerClaimStore = {
  transaction<T>(body: (tx: StorytellerClaimTx) => Promise<T>): Promise<T>;
};

export type FetchedStorytellerGeneration =
  | {
      status: 'ready';
      generationId: string;
      ownerId: string;
      pinnedRoot: PinnedStorytellerRoot;
      task: StorytellerTask;
    }
  | {
      status: 'refused';
      reason: 'unknown-generation' | 'unreadable-task' | 'unsupported-execution';
    };

export type StorytellerClaimOutcome =
  | {
      status: 'claimed';
      generationId: string;
      attemptId: string;
      created: boolean;
    }
  | {
      status: 'refused';
      reason:
        | 'unknown-generation'
        | 'root-mismatch'
        | 'unreadable-task'
        | 'unsupported-execution';
    };

export type StorytellerSaveOutcome =
  | {
      status: 'saved';
      generationId: string;
      attemptId: string;
      resultHash: string;
      result: unknown;
    }
  | {
      status: 'conflict';
      reason: 'result-hash';
      generationId: string;
      attemptId: string;
      resultHash: string;
    }
  | {
      status: 'refused';
      reason:
        | 'unknown-generation'
        | 'root-mismatch'
        | 'unreadable-task'
        | 'unsupported-execution'
        | 'invalid-result'
        | 'hash-mismatch'
        | 'unclaimed';
    };

export type StorytellerReadOutcome =
  | {
      status: 'saved';
      generationId: string;
      attemptId: string;
      resultHash: string;
      result: unknown;
    }
  | { status: 'claimed'; generationId: string; attemptId: string }
  | { status: 'unclaimed'; generationId: string }
  | {
      status: 'refused';
      reason: 'unknown-generation' | 'unreadable-task' | 'unsupported-execution';
    };

type LoadedTask =
  | {
      ok: true;
      generation: StorytellerClaimGeneration;
      task: StorytellerTask;
      pinnedRoot: PinnedStorytellerRoot;
    }
  | { ok: false; reason: 'unknown-generation' | 'unreadable-task' };

function readCommittedTask(
  generation: StorytellerClaimGeneration | null,
): LoadedTask {
  if (!generation || generation.kind !== storytellerKind) {
    return { ok: false, reason: 'unknown-generation' };
  }
  const parsed = storytellerTaskSchema.safeParse(generation.input);
  if (!parsed.success) return { ok: false, reason: 'unreadable-task' };
  return {
    ok: true,
    generation,
    task: parsed.data,
    pinnedRoot: parsed.data.context.canonicalKnowledge?.rootHash ?? null,
  };
}

function rootsMatch(
  pinnedRoot: PinnedStorytellerRoot,
  presented: PinnedStorytellerRoot,
) {
  return pinnedRoot === presented;
}

/** Stable SHA-256 of one JSON value. Object keys are sorted. */
export function hashStorytellerCustodyResult(result: unknown): string {
  return createHash('sha256').update(canonicalJson(result)).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid-result');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }
  throw new Error('invalid-result');
}

function baseAttribution(task: StorytellerTask) {
  return {
    storyId: 'storyId' in task.source ? task.source.storyId : null,
    draftId: 'draftId' in task.source ? task.source.draftId : null,
    purpose: task.task,
    profileId: task.profile.id,
    profileRevision: task.profile.revision,
    source: task.source,
    usageAuthority: task.resources.authority,
    custody: null,
  };
}

export function readStorytellerSavedCustody(
  attribution: unknown,
): { resultHash: string; result: unknown } | null {
  if (!attribution || typeof attribution !== 'object') return null;
  const custody = (attribution as { custody?: unknown }).custody;
  if (!custody || typeof custody !== 'object') return null;
  const record = custody as {
    version?: unknown;
    resultHash?: unknown;
    result?: unknown;
  };
  if (
    record.version !== custodyVersion ||
    typeof record.resultHash !== 'string' ||
    !/^[0-9a-f]{64}$/.test(record.resultHash)
  ) {
    return null;
  }
  return { resultHash: record.resultHash, result: record.result };
}

function withSavedCustody(
  attribution: unknown,
  saved: { resultHash: string; result: unknown },
) {
  const base =
    attribution && typeof attribution === 'object' ? attribution : {};
  return {
    ...base,
    custody: {
      version: custodyVersion,
      resultHash: saved.resultHash,
      result: saved.result,
    },
  };
}

function earliestAttempt(attempts: readonly StorytellerClaimAttempt[]) {
  return [...attempts].sort((left, right) => {
    const time = left.createdAt.getTime() - right.createdAt.getTime();
    if (time !== 0) return time;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  })[0];
}

function refusesScriptedCustody(task: StorytellerTask) {
  return task.execution.mode !== 'scripted';
}

function isScriptedCustodyAttempt(attempt: StorytellerClaimAttempt) {
  return attempt.requestedProvider === scriptedCustodyProvider;
}

function isAcceptedScriptedCustodyAttempt(attempt: StorytellerClaimAttempt) {
  return (
    isScriptedCustodyAttempt(attempt) &&
    (attempt.state === 'reserved' || attempt.state === 'settled')
  );
}

function refusesForeignCustodyAttempt(
  attempt: StorytellerClaimAttempt | undefined,
) {
  return !!attempt && !isAcceptedScriptedCustodyAttempt(attempt);
}

function claimInsert(
  generation: StorytellerClaimGeneration,
  task: StorytellerTask,
): ScriptedClaimInsert {
  const attemptId = randomUUID();
  const execution = task.execution;
  const shared = {
    id: attemptId,
    generationId: generation.id,
    createdAt: new Date(),
    state: 'reserved' as const,
    attribution: baseAttribution(task),
    ownerId: generation.ownerId,
    storyId: 'storyId' in task.source ? task.source.storyId : null,
    draftId: 'draftId' in task.source ? task.source.draftId : null,
    purpose: task.task,
    storytellerProfileId: task.profile.id,
    storytellerProfileRevision: task.profile.revision,
    taskInputVersion: task.inputVersion,
    promptVersion: task.promptVersion,
    recipeVersion: task.resources.recipe.version,
    resourcePolicyVersion: task.resources.version,
  };
  if (execution.mode === 'scripted') {
    return {
      createStoppedFunding: true,
      fundingId: randomUUID(),
      runId: randomUUID(),
      attempt: {
        ...shared,
        requestedProvider: scriptedCustodyProvider,
        requestedModel: scriptedCustodyProvider,
        priceVersion: 'offline-rehearsal.v1',
        policy: execution,
      },
    };
  }
  return {
    createStoppedFunding: false,
    fundingId: execution.accountId,
    runId: execution.runId,
    attempt: {
      ...shared,
      requestedProvider: execution.policy.provider,
      requestedModel: execution.policy.model,
      priceVersion: execution.policy.priceVersion,
      policy: execution.policy,
    },
  };
}

/**
 * Writes one scripted claim into the existing attempt ledger.
 * The stopped zero-limit funding row exists only because `account_id` and
 * `run_id` are non-null foreign keys. It cannot pay a provider.
 */
export async function insertScriptedCustodyAttempt(
  tx: Transaction,
  row: ScriptedClaimInsert,
) {
  const now = row.attempt.createdAt;
  if (row.createStoppedFunding) {
    await tx.insert(storytellerFunding).values({
      id: row.fundingId,
      limitMicrousd: 0n,
      settledMicrousd: 0n,
      reservedMicrousd: 0n,
      stopped: true,
      verifiedAt: now,
    });
    await tx.insert(storytellerRun).values({
      id: row.runId,
      accountId: row.fundingId,
      limitMicrousd: 0n,
      settledMicrousd: 0n,
      reservedMicrousd: 0n,
      maxAttempts: 1,
      admittedAttempts: 0,
      enabled: false,
    });
  }
  await tx.insert(storytellerAttempt).values({
    id: row.attempt.id,
    generationId: row.attempt.generationId,
    accountId: row.fundingId,
    runId: row.runId,
    ownerId: row.attempt.ownerId,
    storyId: row.attempt.storyId,
    draftId: row.attempt.draftId,
    purpose: row.attempt.purpose,
    storytellerProfileId: row.attempt.storytellerProfileId,
    storytellerProfileRevision: row.attempt.storytellerProfileRevision,
    taskInputVersion: row.attempt.taskInputVersion,
    promptVersion: row.attempt.promptVersion,
    recipeVersion: row.attempt.recipeVersion,
    resourcePolicyVersion: row.attempt.resourcePolicyVersion,
    requestedModel: row.attempt.requestedModel,
    requestedProvider: row.attempt.requestedProvider,
    priceVersion: row.attempt.priceVersion,
    attribution: row.attempt.attribution,
    state: 'reserved',
    reservedMicrousd: 0n,
    reservedInputTokens: 0,
    reservedGeneratedTokens: 0,
    reservedReasoningTokens: 0,
    estimatedMicrousd: 0n,
    estimatedInputTokens: 0,
    estimationMethod: row.createStoppedFunding
      ? scriptedCustodyProvider
      : 'provider-custody',
    reconciliation: 'pending',
    requestBytes: 0,
    policy: row.attempt.policy,
    createdAt: now,
  });
}

/** Records one validated result on the existing attempt row. */
export async function saveCustodyResultOnAttempt(
  tx: Transaction,
  update: ClaimResultUpdate,
) {
  await tx
    .update(storytellerAttempt)
    .set(
      update.settlement
        ? {
            attribution: update.attribution,
            state: 'settled',
            chargedMicrousd: 0n,
            reconciliation: 'unavailable',
            dispatchedAt: update.settlement.dispatchedAt,
            settledAt: update.settlement.settledAt,
          }
        : { attribution: update.attribution },
    )
    .where(eq(storytellerAttempt.id, update.attemptId));
}

function createDrizzleClaimStore(database: Database): StorytellerClaimStore {
  return {
    async transaction(body) {
      return database.db.transaction(async (tx) => {
        const adapter: StorytellerClaimTx = {
          async lockGeneration(id) {
            const [row] = await tx
              .select()
              .from(generation)
              .where(
                and(
                  eq(generation.id, id),
                  eq(generation.kind, storytellerKind),
                ),
              )
              .for('update');
            if (!row) return null;
            return {
              id: row.id,
              ownerId: row.ownerId,
              kind: row.kind,
              input: row.input,
            };
          },
          async lockAttempts(generationId) {
            const rows = await tx
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, generationId))
              .orderBy(
                asc(storytellerAttempt.createdAt),
                asc(storytellerAttempt.id),
              )
              .for('update');
            return rows.map((row) => ({
              id: row.id,
              generationId: row.generationId,
              createdAt: row.createdAt,
              state: row.state,
              requestedProvider: row.requestedProvider,
              attribution: row.attribution,
            }));
          },
          insertScriptedClaim(row) {
            return insertScriptedCustodyAttempt(tx, row);
          },
          saveClaimResult(update) {
            return saveCustodyResultOnAttempt(tx, update);
          },
        };
        return body(adapter);
      });
    },
  };
}

function validatedCustodyResult(task: StorytellerTask, result: unknown) {
  try {
    const validated = validateStorytellerResult(task, result);
    const resultHash = hashStorytellerCustodyResult(validated);
    return { ok: true as const, result: validated, resultHash };
  } catch {
    return { ok: false as const };
  }
}

/** Provider-free task claim. The attempt row is the claim, not an in-memory set. */
export function createStorytellerTaskCustody(store: StorytellerClaimStore) {
  return {
    async fetchCommittedGeneration(
      generationId: string,
    ): Promise<FetchedStorytellerGeneration> {
      return store.transaction(async (tx) => {
        const loaded = readCommittedTask(await tx.lockGeneration(generationId));
        if (!loaded.ok) return { status: 'refused', reason: loaded.reason };
        if (refusesScriptedCustody(loaded.task)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        return {
          status: 'ready',
          generationId: loaded.generation.id,
          ownerId: loaded.generation.ownerId,
          pinnedRoot: loaded.pinnedRoot,
          task: loaded.task,
        };
      });
    },

    async claimGeneration(input: {
      generationId: string;
      pinnedRoot: PinnedStorytellerRoot;
    }): Promise<StorytellerClaimOutcome> {
      return store.transaction(async (tx) => {
        const loaded = readCommittedTask(
          await tx.lockGeneration(input.generationId),
        );
        if (!loaded.ok) return { status: 'refused', reason: loaded.reason };
        if (refusesScriptedCustody(loaded.task)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        if (!rootsMatch(loaded.pinnedRoot, input.pinnedRoot)) {
          return { status: 'refused', reason: 'root-mismatch' };
        }
        const existing = earliestAttempt(
          await tx.lockAttempts(loaded.generation.id),
        );
        if (refusesForeignCustodyAttempt(existing)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        if (existing) {
          return {
            status: 'claimed',
            generationId: loaded.generation.id,
            attemptId: existing.id,
            created: false,
          };
        }
        const row = claimInsert(loaded.generation, loaded.task);
        await tx.insertScriptedClaim(row);
        return {
          status: 'claimed',
          generationId: loaded.generation.id,
          attemptId: row.attempt.id,
          created: true,
        };
      });
    },

    async saveValidatedResult(input: {
      generationId: string;
      pinnedRoot: PinnedStorytellerRoot;
      resultHash: string;
      result: unknown;
    }): Promise<StorytellerSaveOutcome> {
      return store.transaction(async (tx) => {
        const loaded = readCommittedTask(
          await tx.lockGeneration(input.generationId),
        );
        if (!loaded.ok) return { status: 'refused', reason: loaded.reason };
        if (refusesScriptedCustody(loaded.task)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        if (!rootsMatch(loaded.pinnedRoot, input.pinnedRoot)) {
          return { status: 'refused', reason: 'root-mismatch' };
        }
        const attempt = earliestAttempt(
          await tx.lockAttempts(loaded.generation.id),
        );
        if (!attempt) return { status: 'refused', reason: 'unclaimed' };
        if (refusesForeignCustodyAttempt(attempt)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        const validated = validatedCustodyResult(loaded.task, input.result);
        if (!validated.ok)
          return { status: 'refused', reason: 'invalid-result' };
        if (validated.resultHash !== input.resultHash) {
          return { status: 'refused', reason: 'hash-mismatch' };
        }
        const saved = readStorytellerSavedCustody(attempt.attribution);
        if (saved) {
          if (saved.resultHash === input.resultHash) {
            return {
              status: 'saved',
              generationId: loaded.generation.id,
              attemptId: attempt.id,
              resultHash: saved.resultHash,
              result: saved.result,
            };
          }
          return {
            status: 'conflict',
            reason: 'result-hash',
            generationId: loaded.generation.id,
            attemptId: attempt.id,
            resultHash: saved.resultHash,
          };
        }
        const attribution = withSavedCustody(attempt.attribution, {
          resultHash: validated.resultHash,
          result: validated.result,
        });
        const settlement =
          attempt.requestedProvider === scriptedCustodyProvider &&
          attempt.state === 'reserved'
            ? { dispatchedAt: new Date(), settledAt: new Date() }
            : null;
        await tx.saveClaimResult({
          attemptId: attempt.id,
          attribution,
          settlement,
        });
        return {
          status: 'saved',
          generationId: loaded.generation.id,
          attemptId: attempt.id,
          resultHash: validated.resultHash,
          result: validated.result,
        };
      });
    },

    async readValidatedResult(
      generationId: string,
    ): Promise<StorytellerReadOutcome> {
      return store.transaction(async (tx) => {
        const loaded = readCommittedTask(await tx.lockGeneration(generationId));
        if (!loaded.ok) return { status: 'refused', reason: loaded.reason };
        if (refusesScriptedCustody(loaded.task)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        const attempt = earliestAttempt(
          await tx.lockAttempts(loaded.generation.id),
        );
        if (!attempt) {
          return { status: 'unclaimed', generationId: loaded.generation.id };
        }
        if (refusesForeignCustodyAttempt(attempt)) {
          return { status: 'refused', reason: 'unsupported-execution' };
        }
        const saved = readStorytellerSavedCustody(attempt.attribution);
        if (!saved) {
          return {
            status: 'claimed',
            generationId: loaded.generation.id,
            attemptId: attempt.id,
          };
        }
        return {
          status: 'saved',
          generationId: loaded.generation.id,
          attemptId: attempt.id,
          resultHash: saved.resultHash,
          result: saved.result,
        };
      });
    },
  };
}

export type StorytellerRuntimeOptions = {
  provider?: StorytellerProvider;
  scriptedSource?: (task: StorytellerTask) => unknown | Promise<unknown>;
  scriptedGate?: (input: {
    generationId: string;
    task: StorytellerTask;
  }) => 'proceed' | 'hold' | 'fail' | Promise<'proceed' | 'hold' | 'fail'>;
  realDurationMs?: (gameDurationMs: number) => number;
  documentStore?: DocumentStore;
  /**
   * Optional root-keyed lexical index reuse for memory exploration.
   * Defaults to a process-local LRU when omitted.
   */
  lexicalIndexCache?: LexicalStoryIndexCache;
  /** Resolves current server authority immediately before transport. */
  dispatchAuthority?: (input: {
    generationId: string;
    ownerId: string;
    task: StorytellerTask;
  }) => EffectiveUsagePolicy | null | Promise<EffectiveUsagePolicy | null>;
  /**
   * Attempt-row claim store. Defaults to `storyteller_attempt`.
   * Tests inject a store so the claim is not an in-memory set.
   */
  claimStore?: StorytellerClaimStore;
};

export function createStorytellerExecution(
  database: Database,
  options: StorytellerRuntimeOptions,
) {
  const custody = createStorytellerTaskCustody(
    options.claimStore ?? createDrizzleClaimStore(database),
  );
  const budget = createStorytellerBudget(database);
  const scriptedSource = options.scriptedSource ?? scriptedStorytellerResult;
  const lexicalIndexCache =
    options.lexicalIndexCache ??
    createLexicalStoryIndexCache({ maxEntries: 8 });
  async function saveOutcome(
    id: string,
    attemptId: string,
    outcome:
      | { state: 'succeeded'; output: unknown }
      | { state: 'failed' | 'uncertain'; failureCode?: string },
  ) {
    await database.db
      .update(generation)
      .set({
        state: outcome.state,
        output: outcome.state === 'succeeded' ? outcome.output : null,
        failureCode:
          outcome.state === 'failed'
            ? (outcome.failureCode ?? 'invalid_output')
            : null,
        updatedAt: sql`clock_timestamp()`,
        statusRevision: sql`${generation.statusRevision} + 1`,
      })
      .where(
        and(
          eq(generation.id, id),
          eq(generation.attemptId, attemptId),
          inArray(generation.state, ['running', 'uncertain']),
        ),
      );
  }

  async function generate(
    record: typeof generation.$inferSelect,
    task: StorytellerTask,
  ) {
    const attemptId = record.attemptId ?? randomUUID();
    if (record.state === 'pending') {
      const claimed = await database.db
        .update(generation)
        .set({
          state: 'running',
          attemptId,
          updatedAt: sql`clock_timestamp()`,
          statusRevision: sql`${generation.statusRevision} + 1`,
        })
        .where(
          and(eq(generation.id, record.id), eq(generation.state, 'pending')),
        )
        .returning({ id: generation.id });
      if (!claimed.length) {
        return;
      }
    }
    if (task.execution.mode === 'scripted') {
      await recordExecutionStage(database.db, {
        generationId: record.id,
        stage: 'task-prepared',
        outcome: 'completed',
        idempotencyKey: `task-prepared:${attemptId}`,
        attemptId,
        sourceKind: 'generation',
        sourceId: record.id,
      });
      await recordExecutionStage(database.db, {
        generationId: record.id,
        stage: 'stage-skipped',
        outcome: 'not-run',
        idempotencyKey: `provider-skipped:scripted:${attemptId}`,
        attemptId,
        sourceKind: 'none',
        failureClass: 'scripted_execution',
      });
      const gate =
        (await options.scriptedGate?.({
          generationId: record.id,
          task,
        })) ?? 'proceed';
      if (gate === 'hold') {
        await recordExecutionStage(database.db, {
          generationId: record.id,
          stage: 'stage-held',
          outcome: 'held',
          idempotencyKey: `held:scripted:${attemptId}`,
          attemptId,
          sourceKind: 'generation',
          sourceId: record.id,
          failureClass: 'scripted_hold',
        });
        return 'held' as const;
      }
      if (gate === 'fail') {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'chamber_injected_failure',
        });
        await recordExecutionStage(database.db, {
          generationId: record.id,
          stage: 'validation-settled',
          outcome: 'failed',
          idempotencyKey: `validation:${attemptId}`,
          attemptId,
          sourceKind: 'generation',
          sourceId: record.id,
          failureClass: 'chamber_injected_failure',
        });
        return;
      }
      // This injected contract is explicitly side-effect-free; duplicate delivery may recompute it.
      let output: unknown;
      try {
        output = validateStorytellerResult(task, await scriptedSource(task));
      } catch {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'invalid_output',
        });
        await recordExecutionStage(database.db, {
          generationId: record.id,
          stage: 'validation-settled',
          outcome: 'failed',
          idempotencyKey: `validation:${attemptId}`,
          attemptId,
          sourceKind: 'generation',
          sourceId: record.id,
          failureClass: 'invalid_output',
        });
        return;
      }
      await saveOutcome(record.id, attemptId, { state: 'succeeded', output });
      await recordExecutionStage(database.db, {
        generationId: record.id,
        stage: 'validation-settled',
        outcome: 'completed',
        idempotencyKey: `validation:${attemptId}`,
        attemptId,
        sourceKind: 'generation',
        sourceId: record.id,
      });
      return;
    }
    if (task.resources.recipe.version === 'memory-exploration.v1') {
      if (!options.provider || !options.documentStore) {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: options.provider
            ? 'memory_store_disabled'
            : 'provider_disabled',
        });
        return;
      }
      if (!('storyId' in task.source) || !task.context.canonicalKnowledge) {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'memory_context_unavailable',
        });
        return;
      }
      const root = task.context.canonicalKnowledge;
      const retrievalRecipe = resolveStoryRetrievalRecipe({
        posture:
          task.resources.creativeExploration.posture === 'off'
            ? 'minimal'
            : task.resources.creativeExploration.posture,
        operationLimits: {
          maxReads: task.resources.recipe.maxReads,
          maxRetainedBytes: task.resources.recipe.maxRetainedReadBytes,
        },
      });
      const { index } = await lexicalIndexCache.resolve(options.documentStore, {
        storyId: task.source.storyId,
        rootHash: root.rootHash,
        rootRevision: root.rootRevision,
      });
      const providerRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: record.id,
        ownerId: record.ownerId,
        task,
        provider: options.provider,
        dispatchAuthority: async (input) =>
          (await options.dispatchAuthority?.(input)) ?? null,
      });
      try {
        const completed = await runMemoryExploration(database, {
          generationId: record.id,
          task,
          createExplorer: (snapshot) =>
            createCanonicalMemoryExplorer({
              storage: options.documentStore!,
              index,
              recipe: retrievalRecipe,
              creativeExploration: task.resources.creativeExploration,
              ...(snapshot ? { snapshot } : {}),
            }),
          ...providerRuntime,
        });
        await saveOutcome(record.id, attemptId, {
          state: 'succeeded',
          output: completed.output,
        });
      } catch (error) {
        if (!(error instanceof MemoryExplorationControllerError)) throw error;
        if (error.code === 'review-held') return 'held' as const;
        await saveOutcome(record.id, attemptId, {
          state:
            error.code === 'usage-uncertain' ||
            error.code === 'provider-uncertain'
              ? 'uncertain'
              : 'failed',
          failureCode: error.code.replaceAll('-', '_'),
        });
      }
      return;
    }
    const repairable = task.resources.recipe.version === 'repairable-turn.v1';
    const hasRepairEvidence =
      record.repairCandidate !== null || record.repairDiagnostic !== null;
    if (
      hasRepairEvidence &&
      (!repairable ||
        record.repairCandidate === null ||
        record.repairDiagnostic === null)
    ) {
      throw new Error('Invalid Storyteller repair evidence');
    }
    const repairing = repairable && hasRepairEvidence;
    const request = repairing
      ? prepareStorytellerRepairRequest({
          task,
          candidate: record.repairCandidate,
          diagnostic: storytellerOutputDiagnosticSchema.parse(
            record.repairDiagnostic,
          ),
        })
      : task.request;
    const roundCount = repairable ? 2 : 1;
    const providerDispatch: StorytellerProviderDispatch = {
      request,
      maxGeneratedTokens: Math.max(
        1,
        Math.floor(task.resources.envelope.maxGeneratedTokens / roundCount),
      ),
    };
    const reviewed = await prepareReviewedDispatch(
      database,
      record.id,
      attemptId,
      task,
      providerDispatch,
      options.provider,
    );
    if (reviewed.disposition === 'held' || reviewed.disposition === 'stopped') {
      return reviewed.disposition;
    }
    if (!options.provider) {
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: 'provider_disabled',
      });
      return;
    }
    if (reviewed.disposition === 'wire-refused') {
      // OBS00-C: refused before reserve/dispatch. No HTTP, no liability, and
      // the persisted review row is left exactly as approved.
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: 'wire_mismatch',
      });
      return;
    }
    const wireDispatch = reviewed.dispatch;
    try {
      const state = await budget.reserve({
        id: attemptId,
        generationId: record.id,
        ownerId: record.ownerId,
        task,
        dispatch: {
          request,
          maxSerializedRequestBytes:
            task.resources.envelope.maxSerializedRequestBytes,
          maxInputTokens: Math.min(
            task.execution.policy.maxInputTokens,
            task.resources.authority.kind === 'effective-usage-policy'
              ? task.resources.authority.policy.limits.maxInputTokensPerRequest
              : task.execution.policy.maxInputTokens,
          ),
          maxGeneratedTokens: providerDispatch.maxGeneratedTokens,
          maxReasoningTokens: Math.floor(
            task.resources.envelope.maxReasoningTokens / roundCount,
          ),
        },
      });
      if (state === 'settled') {
        return;
      }
      if (state === 'unsent') {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'budget_unavailable',
        });
        return;
      }
      if (state !== 'reserved') {
        await budget.uncertain(attemptId, task.execution);
        await saveOutcome(record.id, attemptId, { state: 'uncertain' });
        return;
      }
      let authorityGranted = false;
      try {
        authorityGranted = retainsCapturedAuthority(
          task,
          (await options.dispatchAuthority?.({
            generationId: record.id,
            ownerId: record.ownerId,
            task,
          })) ?? null,
        );
      } catch {
        // Resolver failure is denial. It must not turn into an uncertain call.
      }
      if (
        !(await budget.dispatch(attemptId, task.execution, authorityGranted))
      ) {
        // A racing delivery could already have dispatched. Inspect, never assume no charge.
        const stateNow = await budget.attemptState(attemptId);
        if (stateNow === 'unsent') {
          await saveOutcome(record.id, attemptId, {
            state: 'failed',
            failureCode: authorityGranted
              ? 'budget_unavailable'
              : 'authority_unavailable',
          });
        }
        return;
      }
      let outcome;
      try {
        outcome = await options.provider(task, wireDispatch);
      } catch {
        outcome = {
          kind: 'uncertain' as const,
          telemetry: {
            durationMs: null,
            httpStatus: null,
            providerId: null,
            reportedModel: null,
            finishReason: null,
          },
        };
      }
      if (outcome.kind === 'uncertain') {
        await budget.uncertain(attemptId, task.execution, outcome.telemetry);
        await saveOutcome(record.id, attemptId, { state: 'uncertain' });
        return;
      }
      if (
        outcome.kind === 'failed' &&
        outcome.failureCode === 'provider_unavailable'
      ) {
        await budget.confirmUnsent(
          attemptId,
          task.execution,
          outcome.telemetry,
        );
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'provider_unavailable',
        });
        return;
      }
      let output: unknown = null;
      let failureCode = outcome.kind === 'failed' ? outcome.failureCode : null;
      let repairCandidate: unknown = null;
      let repairDiagnostic: unknown = null;
      if (outcome.kind === 'result') {
        try {
          output = validateStorytellerResult(task, outcome.output);
        } catch {
          failureCode = 'invalid_output';
          if (task.resources.recipe.version === 'repairable-turn.v1') {
            repairCandidate = outcome.output;
            repairDiagnostic = diagnoseStorytellerResult(task, outcome.output);
          }
        }
      }
      await budget.settle({
        id: attemptId,
        execution: task.execution,
        usage: outcome.usage,
        telemetry: outcome.telemetry,
        generationOutcome: failureCode
          ? {
              state: 'failed',
              output: null,
              failureCode,
              repairCandidate,
              repairDiagnostic,
            }
          : {
              state: 'succeeded',
              output,
              failureCode: null,
              repairCandidate: null,
              repairDiagnostic: null,
            },
        operationOutcome:
          !repairing &&
          failureCode === 'invalid_output' &&
          repairDiagnostic !== null
            ? 'continue'
            : 'complete',
      });
    } catch (error) {
      if (!(error instanceof StorytellerBudgetError)) {
        throw error;
      }
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: error.code,
      });
    }
  }

  return {
    execute: generate,
    fetchCommittedGeneration: custody.fetchCommittedGeneration,
    claimGeneration: custody.claimGeneration,
    saveValidatedResult: custody.saveValidatedResult,
    readValidatedResult: custody.readValidatedResult,
  };
}
