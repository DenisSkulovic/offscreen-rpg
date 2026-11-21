import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
  storytellerUsageAllocation,
} from '@offscreen/db/storyteller-schema';
import {
  createStorytellerBudget,
  resourcesForEffectiveUsagePolicy,
} from '@offscreen/application/storyteller';
import { insertSyntheticCurrentAuthorityForTest } from '@offscreen/application/storyteller/test-synthetic-current-authority';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { createTestUsagePolicy } from './helpers/usage-policy.js';
import type { TestContext } from 'node:test';
import {
  type ProfiledStoryteller,
  eq,
  fakeUsage,
  fakeTelemetry,
} from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkProviderBudget(
  t: TestContext,
  { database, ownerId, first }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'concurrent reservations obey a shared cap and duplicate settlement is harmless',
    async () => {
      const accountId = randomUUID();
      const runId = randomUUID();
      await database.db.insert(storytellerFunding).values({
        id: accountId,
        limitMicrousd: 1000n,
        stopped: false,
        verifiedAt: new Date(),
      });
      await database.db.insert(storytellerRun).values({
        id: runId,
        accountId,
        limitMicrousd: 1000n,
        maxAttempts: 3,
        enabled: true,
      });
      const execution = {
        mode: 'provider' as const,
        accountId,
        runId,
        dispatchReview: { mode: 'hold' as const },
        policy: {
          version: 'fake',
          route: 'fake:economy',
          model: 'fake/model',
          provider: 'fake',
          priceVersion: 'concurrency-test',
          inputMicrousdPerMillion: '1000',
          outputMicrousdPerMillion: '1000',
          maxInputTokens: 100000,
          maxOutputTokens: 2000,
          timeoutMs: 1000,
        },
      };
      const budget = createStorytellerBudget(database);
      const [sourceGeneration] = await database.db
        .select()
        .from(generation)
        .where(eq(generation.id, first.generationId));
      assert.ok(sourceGeneration);
      const sourceTask = storytellerTaskSchema.parse(sourceGeneration.input);
      const capturedPolicy = createTestUsagePolicy(execution.policy.route, [
        {
          id: 'account-cost-burst',
          version: 1,
          scope: 'account',
          metric: 'microusd',
          limit: '150',
          window: { kind: 'rolling', durationSeconds: 3600 },
        },
      ]);
      const resources = resourcesForEffectiveUsagePolicy(
        execution,
        capturedPolicy,
      );
      await insertSyntheticCurrentAuthorityForTest(database, {
        capturedPolicy,
        executionPolicy: execution.policy,
        ownerId,
        accountId,
        runId,
      });
      const ids = [randomUUID(), randomUUID()];
      const results = await Promise.allSettled(
        ids.map((id) =>
          budget.reserve({
            id,
            generationId: first.generationId,
            ownerId,
            task: {
              ...sourceTask,
              execution,
              resources,
            },
          }),
        ),
      );
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        1,
      );
      const allocations = await database.db
        .select()
        .from(storytellerUsageAllocation);
      assert.equal(allocations.length, 1);
      assert.equal(allocations[0]?.reserved, 102n);
      const [reservedOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, first.generationId));
      assert.equal(reservedOperation?.reservedRounds, 1);
      assert.equal(reservedOperation?.dispatchedRounds, 0);
      assert.equal(reservedOperation?.reservedMicrousd, 102n);
      const winner =
        ids[results.findIndex((result) => result.status === 'fulfilled')];
      assert.ok(winner);
      assert.equal((await budget.inspect(accountId)).reservedMicrousd, 102n);
      assert.equal(await budget.dispatch(winner, execution, true), true);
      assert.equal(await budget.dispatch(winner, execution, true), false);
      const settlement = {
        id: winner,
        execution,
        usage: fakeUsage(80n),
        telemetry: fakeTelemetry('fake-settled'),
      };
      await budget.settle(settlement);
      await budget.settle(settlement);
      const [settledAllocation] = await database.db
        .select()
        .from(storytellerUsageAllocation);
      assert.equal(settledAllocation?.state, 'settled');
      assert.equal(settledAllocation?.consumed, 80n);
      assert.equal((await budget.inspect(accountId)).settledMicrousd, 80n);
      assert.equal((await budget.inspect(accountId)).reservedMicrousd, 0n);
      const [completedOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, first.generationId));
      assert.equal(completedOperation?.state, 'complete');
      assert.equal(completedOperation?.reservedRounds, 0);
      assert.equal(completedOperation?.dispatchedRounds, 1);
      assert.equal(completedOperation?.reservedMicrousd, 0n);
      assert.equal(completedOperation?.consumedMicrousd, 80n);
      await assert.rejects(
        budget.reserve({
          id: randomUUID(),
          generationId: first.generationId,
          ownerId,
          task: {
            ...sourceTask,
            execution,
            resources,
          },
        }),
        { code: 'budget_unavailable' },
      );
    },
  );
  await t.test(
    'multiple dispatch slices consume one operation envelope',
    async () => {
      const accountId = randomUUID();
      const runId = randomUUID();
      const generationId = randomUUID();
      await database.db.insert(storytellerFunding).values({
        id: accountId,
        limitMicrousd: 1000n,
        stopped: false,
        verifiedAt: new Date(),
      });
      await database.db.insert(storytellerRun).values({
        id: runId,
        accountId,
        limitMicrousd: 1000n,
        maxAttempts: 3,
        enabled: true,
      });
      const execution = {
        mode: 'provider' as const,
        accountId,
        runId,
        dispatchReview: { mode: 'off' as const },
        policy: {
          version: 'fake',
          route: 'fake:economy',
          model: 'fake/model',
          provider: 'fake',
          priceVersion: 'multi-round-test',
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
      const sourceTask = storytellerTaskSchema.parse(sourceGeneration.input);
      const capturedPolicy = createTestUsagePolicy(execution.policy.route, [], {
        maxModelRoundsPerOperation: 2,
        maxReadsPerOperation: 2,
        maxRetainedReadBytes: 4096,
      });
      const resources = resourcesForEffectiveUsagePolicy(
        execution,
        capturedPolicy,
        { posture: 'minimal' },
      );
      await insertSyntheticCurrentAuthorityForTest(database, {
        capturedPolicy,
        executionPolicy: execution.policy,
        ownerId,
        accountId,
        runId,
      });
      const task = storytellerTaskSchema.parse({
        ...sourceTask,
        execution,
        resources,
      });
      await database.db.insert(generation).values({
        id: generationId,
        ownerId,
        kind: sourceGeneration.kind,
        input: task,
      });
      const budget = createStorytellerBudget(database);
      const slice = {
        request: task.request,
        maxSerializedRequestBytes: resources.envelope.maxSerializedRequestBytes,
        maxInputTokens: 50000,
        maxGeneratedTokens: 500,
        maxReasoningTokens: 0,
      };
      const firstAttempt = randomUUID();
      await budget.reserve({
        id: firstAttempt,
        generationId,
        ownerId,
        task,
        dispatch: slice,
      });
      assert.equal(await budget.dispatch(firstAttempt, execution, true), true);
      await budget.settle({
        id: firstAttempt,
        execution,
        usage: fakeUsage(10n),
        telemetry: fakeTelemetry('fake-round-one'),
        operationOutcome: 'continue',
      });
      const secondAttempt = randomUUID();
      await budget.reserve({
        id: secondAttempt,
        generationId,
        ownerId,
        task,
        dispatch: slice,
      });
      assert.equal(await budget.dispatch(secondAttempt, execution, true), true);
      await budget.settle({
        id: secondAttempt,
        execution,
        usage: fakeUsage(10n),
        telemetry: fakeTelemetry('fake-round-two'),
        operationOutcome: 'complete',
      });
      const [completed] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, generationId));
      assert.equal(completed?.state, 'complete');
      assert.equal(completed?.dispatchedRounds, 2);
      assert.equal(completed?.consumedMicrousd, 20n);
      assert.equal(completed?.consumedInputTokens, 40);
      assert.equal(completed?.consumedGeneratedTokens, 20);
    },
  );
}

registerProfiledStoryteller(
  import.meta.url,
  'provider reservation budget',
  checkProviderBudget,
  { executionMode: 'manual' },
);
