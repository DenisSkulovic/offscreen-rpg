import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerAttempt, storytellerFunding, storytellerMemoryExploration, storytellerOperation, storytellerRun } from '@offscreen/db/storyteller-schema';
import { createStorytellerBudget, createDispatchReviewControls, createMemoryProviderRoundRuntime, CanonicalMemoryExplorationError, MemoryExplorationControllerError, resourcesForEffectiveUsagePolicy, runMemoryExploration, type MemoryExplorationSnapshot } from '@offscreen/application/storyteller';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { attestedFake } from './helpers/attested-fake-provider.js';
import { createTestUsagePolicy } from './helpers/usage-policy.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq, fakeUsage, fakeTelemetry } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkMemoryExploration(
  t: TestContext,
  {
    database,
    ownerId,
    first,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'memory exploration uses reviewed provider attempts and settles its final round',
    async () => {
      const accountId = randomUUID();
      const runId = randomUUID();
      const generationId = randomUUID();
      await database.db.insert(storytellerFunding).values({
        id: accountId,
        limitMicrousd: 1000000n,
        stopped: false,
        verifiedAt: new Date(),
      });
      await database.db.insert(storytellerRun).values({
        id: runId,
        accountId,
        limitMicrousd: 1000000n,
        maxAttempts: 20,
        enabled: true,
      });
      const execution: ExecutionPolicy = {
        mode: 'provider',
        accountId,
        runId,
        dispatchReview: { mode: 'hold' },
        policy: {
          version: 'fake',
          route: 'fake:memory',
          model: 'fake/model',
          provider: 'fake',
          priceVersion: 'memory-round-test',
          inputMicrousdPerMillion: '1000',
          outputMicrousdPerMillion: '1000',
          maxInputTokens: 100000,
          maxOutputTokens: 2000,
          timeoutMs: 1000,
        },
      };
      const [sourceGeneration] = await database.db
        .select()
        .from(generation)
        .where(eq(generation.id, first.generationId));
      assert.ok(sourceGeneration);
      const sourceTask = storytellerTaskSchema.parse(
        sourceGeneration.input,
      );
      const policy = createTestUsagePolicy(execution.policy.route, [], {
        maxModelRoundsPerOperation: 2,
        maxReadsPerOperation: 1,
        maxRetainedReadBytes: 4096,
      });
      const task = storytellerTaskSchema.parse({
        ...sourceTask,
        execution,
        resources: resourcesForEffectiveUsagePolicy(execution, policy, {
          posture: 'minimal',
        }),
      });
      await database.db.insert(generation).values({
        id: generationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: task,
      });
      const initialSnapshot: MemoryExplorationSnapshot = {
        format: 'offscreen.memory-exploration-snapshot.v1',
        storyId:
          'storyId' in task.source
            ? task.source.storyId
            : task.source.draftId,
        rootHash: 'a'.repeat(64),
        rootRevision: 1,
        readsUsed: 0,
        retainedBytes: 0,
        readyDecisions: 0,
        memoryHandles: [],
        sourceHandles: [],
        rounds: [],
      };
      const createExplorer = (saved?: MemoryExplorationSnapshot) => ({
        execute: async () => {
          throw new Error('Final-only provider must not request memory');
        },
        snapshot: () => saved ?? initialSnapshot,
      });
      let providerCalls = 0;
      const providerRuntime = createMemoryProviderRoundRuntime(database, {
        generationId,
        ownerId,
        task,
        dispatchAuthority: () => policy,
        provider: attestedFake(async (providerTask, dispatch) => {
          providerCalls += 1;
          assert.ok(dispatch);
          assert.notDeepEqual(dispatch.request, providerTask.request);
          return {
            kind: 'result',
            output:
              providerCalls === 1
                ? {
                    kind: 'ready_to_answer',
                    version: 1,
                    purpose:
                      'The supplied evidence is sufficient for the final task.',
                  }
                : {
                    result: scriptedStorytellerResult(providerTask),
                    evidenceUse: { itemIds: [], sourceIds: [] },
                    creativeDirections: {
                      format: 'offscreen.creative-direction-set.v1',
                      directions: [],
                    },
                  },
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('fake-memory-provider'),
          };
        }),
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId,
          task,
          createExplorer,
          ...providerRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'review-held',
      );
      assert.equal(providerCalls, 0);
      const [heldArtifact] = await database.db
        .select()
        .from(storytellerMemoryExploration)
        .where(
          eq(storytellerMemoryExploration.generationId, generationId),
        );
      assert.equal(heldArtifact?.state, 'held');
      assert.equal(heldArtifact?.failureCode, 'review-held');
      assert.equal(heldArtifact?.pendingModelOutput, null);
      const reviews = createDispatchReviewControls(database);
      const review = await reviews.read(ownerId, generationId);
      assert.equal(review?.state, 'awaiting-review');
      await reviews.decide(ownerId, {
        generationId,
        attemptId: review?.attemptId,
        decisionId: randomUUID(),
        expectedRevision: review?.revision,
        packetSha256: review?.packetSha256,
        decision: 'release',
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId,
          task,
          createExplorer,
          ...providerRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'review-held',
      );
      assert.equal(providerCalls, 1);
      const finalReview = await reviews.read(ownerId, generationId);
      assert.equal(finalReview?.state, 'awaiting-review');
      assert.notEqual(finalReview?.attemptId, review?.attemptId);
      await reviews.decide(ownerId, {
        generationId,
        attemptId: finalReview?.attemptId,
        decisionId: randomUUID(),
        expectedRevision: finalReview?.revision,
        packetSha256: finalReview?.packetSha256,
        decision: 'release',
      });
      const completed = await runMemoryExploration(database, {
        generationId,
        task,
        createExplorer,
        ...providerRuntime,
      });
      assert.equal(completed.replayed, false);
      assert.equal(providerCalls, 2);
      const attempts = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, generationId));
      const [operation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, generationId));
      assert.equal(attempts.length, 2);
      assert.ok(
        attempts.every(
          (attempt) =>
            attempt.state === 'settled' &&
            attempt.providerId === 'fake-memory-provider',
        ),
      );
      assert.equal(operation?.state, 'complete');
      assert.equal(operation?.dispatchedRounds, 2);
      assert.equal(operation?.consumedMicrousd, 20n);
      const replayed = await runMemoryExploration(database, {
        generationId,
        task,
        createExplorer,
        ...providerRuntime,
      });
      assert.equal(replayed.replayed, true);
      assert.equal(providerCalls, 2);

      const noRepairGenerationId = randomUUID();
      const noRepairTask = storytellerTaskSchema.parse({
        ...task,
        execution: {
          ...execution,
          dispatchReview: { mode: 'off' },
        },
      });
      await database.db.insert(generation).values({
        id: noRepairGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: noRepairTask,
      });
      let noRepairCalls = 0;
      const noRepairRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: noRepairGenerationId,
        ownerId,
        task: noRepairTask,
        dispatchAuthority: () => policy,
        provider: attestedFake(async () => {
          noRepairCalls += 1;
          return {
            kind: 'result',
            output: { malformed: 'final candidate' },
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('fake-memory-no-repair'),
          };
        }),
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: noRepairGenerationId,
          task: noRepairTask,
          createExplorer,
          ...noRepairRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'invalid-output',
      );
      assert.equal(noRepairCalls, 1);
      const [noRepairArtifact] = await database.db
        .select()
        .from(storytellerMemoryExploration)
        .where(
          eq(
            storytellerMemoryExploration.generationId,
            noRepairGenerationId,
          ),
        );
      assert.equal(noRepairArtifact?.state, 'failed');
      assert.equal(noRepairArtifact?.modelRoundsUsed, 1);

      const repairGenerationId = randomUUID();
      const repairPolicy = createTestUsagePolicy(
        execution.policy.route,
        [],
        {
          maxModelRoundsPerOperation: 3,
          maxReadsPerOperation: 1,
          maxRetainedReadBytes: 4096,
        },
      );
      const repairTask = storytellerTaskSchema.parse({
        ...task,
        resources: resourcesForEffectiveUsagePolicy(
          execution,
          repairPolicy,
          {
            posture: 'minimal',
            maxRepairRounds: 1,
          },
        ),
        execution: {
          ...execution,
          dispatchReview: { mode: 'off' },
        },
      });
      await database.db.insert(generation).values({
        id: repairGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: repairTask,
      });
      let repairCalls = 0;
      const repairRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: repairGenerationId,
        ownerId,
        task: repairTask,
        dispatchAuthority: () => repairPolicy,
        provider: attestedFake(async (providerTask) => {
          repairCalls += 1;
          return {
            kind: 'result',
            output:
              repairCalls === 1
                ? {
                    kind: 'ready_to_answer',
                    version: 1,
                    purpose:
                      'The supplied evidence is sufficient for the final task.',
                  }
                : repairCalls === 2
                  ? { malformed: 'final candidate' }
                  : {
                      result: scriptedStorytellerResult(providerTask),
                      evidenceUse: { itemIds: [], sourceIds: [] },
                      creativeDirections: {
                        format: 'offscreen.creative-direction-set.v1',
                        directions: [],
                      },
                    },
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry(`fake-memory-repair-${repairCalls}`),
          };
        }),
      });
      const repaired = await runMemoryExploration(database, {
        generationId: repairGenerationId,
        task: repairTask,
        createExplorer,
        ...repairRuntime,
      });
      assert.equal(repaired.replayed, false);
      assert.equal(repairCalls, 3);
      const [repairArtifact] = await database.db
        .select()
        .from(storytellerMemoryExploration)
        .where(
          eq(
            storytellerMemoryExploration.generationId,
            repairGenerationId,
          ),
        );
      assert.equal(repairArtifact?.state, 'final-ready');
      assert.equal(repairArtifact?.modelRoundsUsed, 3);
      const [repairOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, repairGenerationId));
      assert.equal(repairOperation?.state, 'complete');
      assert.equal(repairOperation?.dispatchedRounds, 3);

      const failedGenerationId = randomUUID();
      const failedTask = storytellerTaskSchema.parse({
        ...task,
        execution: {
          ...execution,
          dispatchReview: { mode: 'off' },
        },
      });
      await database.db.insert(generation).values({
        id: failedGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: failedTask,
      });
      const failedRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: failedGenerationId,
        ownerId,
        task: failedTask,
        dispatchAuthority: () => policy,
        provider: attestedFake(async () => ({
          kind: 'failed',
          failureCode: 'invalid_output',
          usage: fakeUsage(7n),
          telemetry: fakeTelemetry('fake-invalid-memory-provider'),
        })),
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: failedGenerationId,
          task: failedTask,
          createExplorer,
          ...failedRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'invalid-output',
      );
      const [failedArtifact] = await database.db
        .select()
        .from(storytellerMemoryExploration)
        .where(
          eq(
            storytellerMemoryExploration.generationId,
            failedGenerationId,
          ),
        );
      assert.equal(failedArtifact?.state, 'failed');
      assert.equal(failedArtifact?.failureCode, 'invalid-output');
      assert.ok(failedArtifact?.pendingModelOutput);
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: failedGenerationId,
          task: failedTask,
          createExplorer,
          ...failedRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'invalid-output',
      );

      const readFailureGenerationId = randomUUID();
      await database.db.insert(generation).values({
        id: readFailureGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: failedTask,
      });
      let readFailureCalls = 0;
      const readFailureRuntime = createMemoryProviderRoundRuntime(
        database,
        {
          generationId: readFailureGenerationId,
          ownerId,
          task: failedTask,
          dispatchAuthority: () => policy,
          provider: attestedFake(async () => {
            readFailureCalls += 1;
            return {
              kind: 'result',
              output: {
                kind: 'needs_context',
                version: 1,
                purpose: 'Recover one exact fact before answering.',
                requests: [
                  {
                    requestId: 'r1',
                    operation: 'ask_memory',
                    intent: 'evidence',
                    question: 'What exact fact constrains this return?',
                  },
                ],
              },
              usage: fakeUsage(5n),
              telemetry: fakeTelemetry('fake-read-failure-provider'),
            };
          }),
        },
      );
      const createFailingExplorer = (
        saved?: MemoryExplorationSnapshot,
      ) => ({
        execute: async () => {
          throw new CanonicalMemoryExplorationError('stale-root');
        },
        snapshot: () => saved ?? initialSnapshot,
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: readFailureGenerationId,
          task: failedTask,
          createExplorer: createFailingExplorer,
          ...readFailureRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'stale-root',
      );
      const [closedAfterReadFailure] = await database.db
        .select()
        .from(storytellerOperation)
        .where(
          eq(storytellerOperation.generationId, readFailureGenerationId),
        );
      assert.equal(closedAfterReadFailure?.state, 'complete');
      assert.equal(closedAfterReadFailure?.reservedMicrousd, 0n);
      assert.equal(closedAfterReadFailure?.consumedMicrousd, 5n);
      assert.equal(
        await createStorytellerBudget(database).completeOperation(
          readFailureGenerationId,
          execution,
        ),
        'complete',
      );
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: readFailureGenerationId,
          task: failedTask,
          createExplorer: createFailingExplorer,
          ...readFailureRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'stale-root',
      );
      assert.equal(readFailureCalls, 1);

      const rejectedGenerationId = randomUUID();
      await database.db.insert(generation).values({
        id: rejectedGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: task,
      });
      let rejectedCalls = 0;
      const rejectedRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: rejectedGenerationId,
        ownerId,
        task,
        dispatchAuthority: () => policy,
        provider: attestedFake(async () => {
          rejectedCalls += 1;
          throw new Error('Rejected review must not dispatch');
        }),
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: rejectedGenerationId,
          task,
          createExplorer,
          ...rejectedRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'review-held',
      );
      const rejectedReview = await reviews.read(
        ownerId,
        rejectedGenerationId,
      );
      await reviews.decide(ownerId, {
        generationId: rejectedGenerationId,
        attemptId: rejectedReview?.attemptId,
        decisionId: randomUUID(),
        expectedRevision: rejectedReview?.revision,
        packetSha256: rejectedReview?.packetSha256,
        decision: 'reject',
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: rejectedGenerationId,
          task,
          createExplorer,
          ...rejectedRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'review-stopped',
      );
      const [rejectedArtifact] = await database.db
        .select()
        .from(storytellerMemoryExploration)
        .where(
          eq(
            storytellerMemoryExploration.generationId,
            rejectedGenerationId,
          ),
        );
      assert.equal(rejectedArtifact?.state, 'failed');
      assert.equal(rejectedArtifact?.failureCode, 'review-stopped');
      assert.equal(rejectedCalls, 0);
      assert.equal(
        (
          await database.db
            .select()
            .from(storytellerAttempt)
            .where(
              eq(storytellerAttempt.generationId, rejectedGenerationId),
            )
        ).length,
        0,
      );

      const deniedGenerationId = randomUUID();
      await database.db.insert(generation).values({
        id: deniedGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: failedTask,
      });
      let deniedCalls = 0;
      const deniedRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: deniedGenerationId,
        ownerId,
        task: failedTask,
        dispatchAuthority: () => null,
        provider: attestedFake(async () => {
          deniedCalls += 1;
          throw new Error('Denied authority must not dispatch');
        }),
      });
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: deniedGenerationId,
          task: failedTask,
          createExplorer,
          ...deniedRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'authority-unavailable',
      );
      const [deniedAttempt] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, deniedGenerationId));
      const [deniedOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, deniedGenerationId));
      assert.equal(deniedCalls, 0);
      assert.equal(deniedAttempt?.state, 'unsent');
      assert.equal(deniedAttempt?.chargedMicrousd, 0n);
      assert.equal(deniedOperation?.state, 'complete');
      assert.equal(deniedOperation?.reservedMicrousd, 0n);

      const uncertainGenerationId = randomUUID();
      await database.db.insert(generation).values({
        id: uncertainGenerationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: failedTask,
      });
      let uncertainCalls = 0;
      const uncertainRuntime = createMemoryProviderRoundRuntime(
        database,
        {
          generationId: uncertainGenerationId,
          ownerId,
          task: failedTask,
          dispatchAuthority: () => policy,
          provider: attestedFake(async () => {
            uncertainCalls += 1;
            return {
              kind: 'uncertain',
              telemetry: fakeTelemetry('fake-uncertain-memory-provider'),
            };
          }),
        },
      );
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: uncertainGenerationId,
          task: failedTask,
          createExplorer,
          ...uncertainRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'provider-uncertain',
      );
      const [uncertainArtifact] = await database.db
        .select()
        .from(storytellerMemoryExploration)
        .where(
          eq(
            storytellerMemoryExploration.generationId,
            uncertainGenerationId,
          ),
        );
      assert.equal(uncertainArtifact?.state, 'uncertain');
      assert.equal(uncertainArtifact?.failureCode, 'provider-uncertain');
      assert.ok(uncertainArtifact?.pendingModelOutput);
      await assert.rejects(
        runMemoryExploration(database, {
          generationId: uncertainGenerationId,
          task: failedTask,
          createExplorer,
          ...uncertainRuntime,
        }),
        (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'provider-uncertain',
      );
      assert.equal(uncertainCalls, 1);
      // An unresolved uncertain attempt blocks every later paid admission
      // in this shared database. The assertion above already recorded it.
      await database.db
        .update(storytellerAttempt)
        .set({
          state: 'unsent',
          chargedMicrousd: 0n,
          reconciliation: 'unavailable',
          dispatchedAt: null,
          settledAt: new Date(),
        })
        .where(
          eq(storytellerAttempt.generationId, uncertainGenerationId),
        );
    },
  );
}

registerProfiledStoryteller(import.meta.url, 'memory exploration rounds', checkMemoryExploration);
