import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerAttempt, storytellerFunding, storytellerOperation, storytellerRun } from '@offscreen/db/storyteller-schema';
import { createStorytellerOpenings } from '@offscreen/application/storyteller';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { createStorytellerBudget, createDispatchReviewControls } from '@offscreen/application/storyteller';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { attestedFake } from './helpers/attested-fake-provider.js';
import { createTestUsagePolicy } from './helpers/usage-policy.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq, fakeUsage, fakeTelemetry } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkProviderRecovery(
  t: TestContext,
  {
    database,
    ownerId,
    stopWorker,
    restartWorker,
    drafts,
    stories,
    candidate,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'fake provider accounting settles once and unknown dispatch is never repeated',
    async () => {
      await stopWorker();
      const accountId = randomUUID();
      const runId = randomUUID();
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
        maxAttempts: 6,
        enabled: true,
      });
      const execution: ExecutionPolicy = {
        mode: 'provider',
        accountId,
        runId,
        dispatchReview: { mode: 'off' },
        policy: {
          version: 'fake',
          route: 'fake:economy',
          model: 'fake/model',
          provider: 'fake',
          priceVersion: 'test-only',
          inputMicrousdPerMillion: '100000',
          cacheReadMicrousdPerMillion: '10000',
          cacheWriteMicrousdPerMillion: '250000',
          outputMicrousdPerMillion: '100000',
          maxInputTokens: 100000,
          maxOutputTokens: 2000,
          timeoutMs: 1000,
        },
      };
      const profiled = createStorytellerOpenings(
        database,
        execution,
        createTestUsagePolicy(execution.policy.route),
      );
      let calls = 0;
      const source = createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (task) => {
          calls++;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: { ...fakeUsage(10n), cacheWriteTokens: 15 },
            telemetry: fakeTelemetry('fake-provider-id'),
          };
        }),
      });
      const draftId = randomUUID();
      await drafts.save(ownerId, draftId, {
        title: '',
        premise: 'SpongeBob in the pineapple',
        storytellingDirection: '',
        storyteller: { id: 'absurd-action-comedy', revision: 1 },
        expectedRevision: 0,
      });
      const heldExecution: ExecutionPolicy = {
        ...execution,
        dispatchReview: { mode: 'hold' },
      };
      const heldProfiled = createStorytellerOpenings(
        database,
        heldExecution,
        createTestUsagePolicy(execution.policy.route),
      );
      const heldId = randomUUID();
      await heldProfiled.request(ownerId, draftId, heldId, 1);
      let heldCalls = 0;
      const heldRuntime = createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (task) => {
          heldCalls++;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('reviewed-provider-id'),
          };
        }),
      });
      await heldRuntime.complete(heldId);
      assert.equal(heldCalls, 0);
      const reviews = createDispatchReviewControls(database);
      const review = await reviews.read(ownerId, heldId);
      assert.equal(review?.state, 'awaiting-review');
      assert.equal(review?.mode, 'hold');
      assert.match(review?.packetSha256 ?? '', /^[0-9a-f]{64}$/);
      const [attemptBeforeRelease] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, heldId));
      assert.equal(attemptBeforeRelease, undefined);
      await reviews.decide(ownerId, {
        generationId: heldId,
        attemptId: review?.attemptId,
        decisionId: randomUUID(),
        expectedRevision: review?.revision,
        packetSha256: review?.packetSha256,
        decision: 'release',
      });
      await heldRuntime.complete(heldId);
      assert.equal(heldCalls, 1);
      assert.equal(
        (await reviews.read(ownerId, heldId))?.state,
        'released',
      );
      const deniedId = randomUUID();
      await profiled.request(ownerId, draftId, deniedId, 1);
      await createStorytellerRuntime(database, {
        provider: attestedFake(async (task) => {
          calls++;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('must-not-dispatch'),
          };
        }),
      }).complete(deniedId);
      assert.equal(calls, 0);
      const [deniedAttempt] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, deniedId));
      const [deniedOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, deniedId));
      assert.equal(deniedAttempt?.state, 'unsent');
      assert.equal(deniedOperation?.state, 'open');
      assert.equal(deniedOperation?.reservedRounds, 0);
      assert.equal(deniedOperation?.reservedMicrousd, 0n);
      const id = randomUUID();
      await profiled.request(ownerId, draftId, id, 1);
      await source.complete(id);
      await source.complete(id);
      assert.equal(calls, 1);
      const budget = createStorytellerBudget(database);
      // The reviewed-and-released hold generation above settled its own
      // 10 microusd on this same account; this attempt adds another 10.
      assert.equal(
        (await budget.inspect(accountId)).settledMicrousd,
        20n,
      );
      const [settledAttempt] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, id));
      assert.ok(settledAttempt);
      assert.equal(settledAttempt.ownerId, ownerId);
      assert.equal(settledAttempt.storyId, null);
      assert.equal(settledAttempt.draftId, draftId);
      assert.equal(settledAttempt.purpose, 'opening');
      assert.equal(
        settledAttempt.storytellerProfileId,
        'absurd-action-comedy',
      );
      assert.equal(settledAttempt.requestedModel, 'fake/model');
      assert.equal(settledAttempt.reportedModel, 'fake/model');
      assert.equal(settledAttempt.providerId, 'fake-provider-id');
      assert.equal(settledAttempt.promptTokens, 20);
      assert.equal(settledAttempt.completionTokens, 10);
      assert.equal(settledAttempt.reasoningTokens, 0);
      assert.equal(settledAttempt.chargedMicrousd, 10n);
      assert.equal(settledAttempt.calculatedMicrousd, 6n);
      assert.ok(
        settledAttempt.estimatedMicrousd <
          settledAttempt.reservedMicrousd,
      );
      assert.equal(
        settledAttempt.estimationMethod,
        'serialized-byte-upper-bound.v1',
      );
      assert.ok(settledAttempt.estimatedInputTokens > 0);
      assert.equal(settledAttempt.reconciliation, 'different');
      assert.ok(settledAttempt.requestBytes > 0);
      assert.ok(settledAttempt.dispatchedAt);
      assert.ok(settledAttempt.settledAt);
      assert.equal(settledAttempt.durationMs, 25);
      const overlappingId = randomUUID();
      await profiled.request(ownerId, draftId, overlappingId, 1);
      let overlapCalls = 0;
      let releaseProvider!: () => void;
      const providerReleased = new Promise<void>((resolve) => {
        releaseProvider = resolve;
      });
      let enterProvider!: () => void;
      const providerEntered = new Promise<void>((resolve) => {
        enterProvider = resolve;
      });
      const overlapping = createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (task) => {
          overlapCalls++;
          enterProvider();
          await providerReleased;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('overlapping-provider-id'),
          };
        }),
      });
      const firstDelivery = overlapping.complete(overlappingId);
      await providerEntered;
      await overlapping.complete(overlappingId);
      assert.equal(overlapCalls, 1);
      assert.equal((await budget.inspect(accountId)).stopped, false);
      releaseProvider();
      await firstDelivery;
      const [overlappingAttempt] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, overlappingId));
      assert.equal(overlappingAttempt?.state, 'settled');
      assert.equal(overlappingAttempt?.chargedMicrousd, 10n);
      const uncertainId = randomUUID();
      await profiled.request(ownerId, draftId, uncertainId, 1);
      const uncertain = createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async () => {
          calls++;
          return {
            kind: 'uncertain',
            telemetry: fakeTelemetry('fake-uncertain'),
          };
        }),
      });
      await uncertain.complete(uncertainId);
      await uncertain.complete(uncertainId);
      assert.equal(calls, 2);
      const account = await budget.inspect(accountId);
      assert.equal(account.stopped, true);
      assert.ok(account.reservedMicrousd > 0n);
      const [attempt] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, uncertainId));
      assert.equal(attempt?.state, 'uncertain');
      assert.ok(attempt);
      assert.equal(attempt.reconciliation, 'unknown');
      assert.equal(attempt.providerId, 'fake-uncertain');
      assert.equal(attempt.durationMs, 25);
      // Explicit simulated reconciliation; keep this disposable test database usable on rerun.
      if (execution.mode !== 'provider') {
        throw new Error('Expected provider execution');
      }
      await budget.settle({
        id: attempt.id,
        execution,
        usage: fakeUsage(1n),
        telemetry: fakeTelemetry('fake-reconciled'),
      });
      assert.equal((await budget.inspect(accountId)).stopped, true);
    },
  );
  await t.test(
    'over-reservation settlement stops only the paying funding account',
    async () => {
      const chargedAccountId = randomUUID();
      const unrelatedAccountId = randomUUID();
      const runId = randomUUID();
      const verifiedAt = new Date();
      await database.db.insert(storytellerFunding).values([
        {
          id: chargedAccountId,
          limitMicrousd: 1_000_000n,
          stopped: false,
          verifiedAt,
        },
        {
          id: unrelatedAccountId,
          limitMicrousd: 1_000_000n,
          stopped: false,
          verifiedAt,
        },
      ]);
      await database.db.insert(storytellerRun).values({
        id: runId,
        accountId: chargedAccountId,
        limitMicrousd: 1_000_000n,
        maxAttempts: 2,
        enabled: true,
      });
      const execution: ExecutionPolicy = {
        mode: 'provider',
        accountId: chargedAccountId,
        runId,
        dispatchReview: { mode: 'off' },
        policy: {
          version: 'funding-isolation.v1',
          route: 'fake:account-isolation',
          model: 'fake/model',
          provider: 'fake',
          priceVersion: 'test-only',
          inputMicrousdPerMillion: '100000',
          cacheReadMicrousdPerMillion: '10000',
          cacheWriteMicrousdPerMillion: '250000',
          outputMicrousdPerMillion: '100000',
          maxInputTokens: 100000,
          maxOutputTokens: 2000,
          timeoutMs: 1000,
        },
      };
      const draftId = randomUUID();
      await drafts.save(ownerId, draftId, {
        title: 'Funding isolation',
        premise:
          'A quiet offline opening for a provider accounting check.',
        storytellingDirection: '',
        storyteller: { id: 'absurd-action-comedy', revision: 1 },
        expectedRevision: 0,
      });
      const generationId = randomUUID();
      await createStorytellerOpenings(
        database,
        execution,
        createTestUsagePolicy(execution.policy.route),
      ).request(ownerId, draftId, generationId, 1);
      let providerCalls = 0;
      await createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (task) => {
          providerCalls += 1;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(100_000n),
            telemetry: fakeTelemetry('fake-overreservation'),
          };
        }),
      }).complete(generationId);
      assert.equal(providerCalls, 1);
      const [attempt] = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, generationId));
      assert.equal(attempt?.state, 'settled');
      assert.ok(attempt?.reservedMicrousd !== undefined);
      assert.ok(
        (attempt?.chargedMicrousd ?? 0n) >
          (attempt?.reservedMicrousd ?? 0n),
        'The fake provider must actually exceed its reservation',
      );
      const budget = createStorytellerBudget(database);
      assert.equal(
        (await budget.inspect(chargedAccountId)).stopped,
        true,
      );
      assert.equal(
        (await budget.inspect(unrelatedAccountId)).stopped,
        false,
        'One account overrun must not halt another payer',
      );
    },
  );
  await t.test(
    'provider recovery retries only work proven unsent',
    async () => {
      async function providerStory(
        repairable = false,
        repairOpening = false,
      ) {
        const accountId = randomUUID();
        const runId = randomUUID();
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
          maxAttempts: 4,
          enabled: true,
        });
        const execution: ExecutionPolicy = {
          mode: 'provider',
          accountId,
          runId,
          dispatchReview: { mode: 'off' },
          policy: {
            version: 'fake',
            route: 'fake:economy',
            model: 'fake/model',
            provider: 'fake',
            priceVersion: 'test-only',
            inputMicrousdPerMillion: '1000',
            outputMicrousdPerMillion: '1000',
            maxInputTokens: 100000,
            maxOutputTokens: 2000,
            timeoutMs: 1000,
          },
        };
        const draftId = randomUUID();
        await drafts.save(ownerId, draftId, {
          title: 'Provider recovery test',
          premise: 'SpongeBob wakes in the pineapple with Gary.',
          storytellingDirection: '',
          storyteller: { id: 'absurd-action-comedy', revision: 1 },
          expectedRevision: 0,
        });
        const openingId = randomUUID();
        const profiledOpenings = createStorytellerOpenings(
          database,
          execution,
          createTestUsagePolicy(
            execution.policy.route,
            [],
            repairable
              ? {
                  maxInputTokensPerOperation: 200000,
                  maxGeneratedTokensPerOperation: 4000,
                  maxModelRoundsPerOperation: 2,
                }
              : {},
          ),
        );
        await profiledOpenings.request(ownerId, draftId, openingId, 1);
        let openingCalls = 0;
        await createStorytellerRuntime(database, {
          dispatchAuthority: ({ task }) =>
            task.resources.authority.kind === 'effective-usage-policy'
              ? task.resources.authority.policy
              : null,
          provider: attestedFake(async (task) => {
            openingCalls++;
            return {
              kind: 'result',
              output: repairOpening
                ? { invalid: true }
                : scriptedStorytellerResult(task),
              usage: fakeUsage(10n),
              telemetry: fakeTelemetry('provider-opening'),
            };
          }),
        }).complete(openingId);
        if (repairOpening) {
          const failedOpening = await profiledOpenings.latest(
            ownerId,
            draftId,
          );
          assert.equal(failedOpening?.state, 'failed');
          assert.equal(failedOpening?.canRetry, true);
          await profiledOpenings.retry(
            ownerId,
            draftId,
            openingId,
            randomUUID(),
          );
          await createStorytellerRuntime(database, {
            dispatchAuthority: ({ task }) =>
              task.resources.authority.kind === 'effective-usage-policy'
                ? task.resources.authority.policy
                : null,
            provider: attestedFake(async (task) => {
              openingCalls++;
              return {
                kind: 'result',
                output: scriptedStorytellerResult(task),
                usage: fakeUsage(10n),
                telemetry: fakeTelemetry('provider-opening-repair'),
              };
            }),
          }).complete(openingId);
        }
        const storyId = randomUUID();
        await stories.startFromCandidate({
          ownerId,
          storyId,
          candidateId: openingId,
          expectedDraftRevision: 1,
        });
        return { accountId, execution, storyId, openingCalls };
      }

      async function admit(storyId: string) {
        const before = await stories.read({ ownerId, storyId });
        assert.ok(before.current.interaction);
        const generationId = randomUUID();
        await stories.admitResolution({
          ownerId,
          storyId,
          operationId: generationId,
          body: {
            expectedRevision: before.revision,
            submission: {
              interactionId: before.current.interaction.id,
              answer: { kind: 'choice.v1', optionId: 'ask' },
            },
          },
        });
        return generationId;
      }

      const repairedOpening = await providerStory(true, true);
      assert.equal(repairedOpening.openingCalls, 2);

      const unsent = await providerStory();
      const unsentId = await admit(unsent.storyId);
      let unsentCalls = 0;
      await createStorytellerRuntime(database, {
        dispatchAuthority: () => null,
        provider: attestedFake(async (task) => {
          unsentCalls++;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('must-not-be-called'),
          };
        }),
      }).complete(unsentId);
      const denied = await stories.read({
        ownerId,
        storyId: unsent.storyId,
      });
      assert.deepEqual(denied.resolution?.blocker, {
        kind: 'authority',
        recovery: 'retry',
      });
      assert.equal(denied.resolution?.canRetry, true);
      assert.equal(unsentCalls, 0);
      await stories.retryResolution({
        ownerId,
        storyId: unsent.storyId,
        retryId: randomUUID(),
      });
      await createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (task) => {
          unsentCalls++;
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('retried-unsent'),
          };
        }),
      }).complete(unsentId);
      assert.equal(unsentCalls, 1);
      assert.equal(
        (await stories.read({ ownerId, storyId: unsent.storyId }))
          .revision,
        2,
      );

      const spent = await providerStory();
      const spentId = await admit(spent.storyId);
      let spentCalls = 0;
      await createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async () => {
          spentCalls++;
          return {
            kind: 'result',
            output: { invalid: true },
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('spent-invalid-output'),
          };
        }),
      }).complete(spentId);
      const invalid = await stories.read({
        ownerId,
        storyId: spent.storyId,
      });
      assert.deepEqual(invalid.resolution?.blocker, {
        kind: 'generation',
        recovery: 'none',
      });
      assert.equal(invalid.resolution?.canRetry, false);
      await assert.rejects(
        stories.retryResolution({
          ownerId,
          storyId: spent.storyId,
          retryId: randomUUID(),
        }),
        { code: 'conflict' },
      );
      assert.equal(spentCalls, 1);

      const repairable = await providerStory(true);
      const repairableId = await admit(repairable.storyId);
      let repairCalls = 0;
      await createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (_task, dispatch) => {
          repairCalls++;
          assert.ok(dispatch);
          return {
            kind: 'result',
            output: { invalid: true },
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('repairable-invalid-output'),
          };
        }),
      }).complete(repairableId);
      const [capturedInvalid] = await database.db
        .select()
        .from(generation)
        .where(eq(generation.id, repairableId));
      assert.equal(capturedInvalid?.state, 'failed');
      assert.deepEqual(capturedInvalid?.repairCandidate, {
        invalid: true,
      });
      assert.ok(capturedInvalid?.repairDiagnostic);
      const [openRepairOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, repairableId));
      assert.equal(openRepairOperation?.state, 'open');
      const repairableFailure = await stories.read({
        ownerId,
        storyId: repairable.storyId,
      });
      assert.deepEqual(repairableFailure.resolution?.blocker, {
        kind: 'generation',
        recovery: 'retry',
      });
      assert.equal(repairableFailure.resolution?.canRetry, true);
      await stories.retryResolution({
        ownerId,
        storyId: repairable.storyId,
        retryId: randomUUID(),
      });
      await createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async (task, dispatch) => {
          repairCalls++;
          assert.ok(dispatch);
          assert.match(
            dispatch.request.messages[1].content,
            /Invalid candidate: \{"invalid":true\}/,
          );
          assert.match(
            dispatch.request.messages[1].content,
            /Validator findings/,
          );
          return {
            kind: 'result',
            output: scriptedStorytellerResult(task),
            usage: fakeUsage(10n),
            telemetry: fakeTelemetry('repaired-output'),
          };
        }),
      }).complete(repairableId);
      assert.equal(repairCalls, 2);
      const repairedStory = await stories.read({
        ownerId,
        storyId: repairable.storyId,
      });
      assert.equal(repairedStory.revision, 2);
      const repairedAttempts = await database.db
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.generationId, repairableId));
      assert.equal(repairedAttempts.length, 2);
      assert.equal(
        repairedAttempts.reduce(
          (total, attempt) => total + (attempt.chargedMicrousd ?? 0n),
          0n,
        ),
        20n,
      );
      const [repairedGeneration] = await database.db
        .select()
        .from(generation)
        .where(eq(generation.id, repairableId));
      assert.equal(repairedGeneration?.state, 'succeeded');
      assert.equal(repairedGeneration?.repairCandidate, null);
      const [completeRepairOperation] = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, repairableId));
      assert.equal(completeRepairOperation?.state, 'complete');

      const uncertain = await providerStory();
      const uncertainId = await admit(uncertain.storyId);
      let uncertainCalls = 0;
      await createStorytellerRuntime(database, {
        dispatchAuthority: ({ task }) =>
          task.resources.authority.kind === 'effective-usage-policy'
            ? task.resources.authority.policy
            : null,
        provider: attestedFake(async () => {
          uncertainCalls++;
          return {
            kind: 'uncertain',
            telemetry: fakeTelemetry('uncertain-delivery'),
          };
        }),
      }).complete(uncertainId);
      const unknown = await stories.read({
        ownerId,
        storyId: uncertain.storyId,
      });
      assert.deepEqual(unknown.resolution?.blocker, {
        kind: 'usage-uncertain',
        recovery: 'operator',
      });
      assert.equal(unknown.resolution?.canRetry, false);
      await assert.rejects(
        stories.retryResolution({
          ownerId,
          storyId: uncertain.storyId,
          retryId: randomUUID(),
        }),
        { code: 'conflict' },
      );
      assert.equal(uncertainCalls, 1);
      assert.equal(
        (
          await createStorytellerBudget(database).inspect(
            uncertain.accountId,
          )
        ).stopped,
        true,
      );
    },
  );
  // Isolated provider-recovery does not need the worker; the profiled suite
  // continues into worker-replay, which admits a timed campaignAction.
  await restartWorker();
}

registerProfiledStoryteller(import.meta.url, 'provider settlement and recovery', checkProviderRecovery);
