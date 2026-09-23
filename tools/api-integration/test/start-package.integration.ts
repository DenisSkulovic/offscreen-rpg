import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createStories } from '@offscreen/application/stories';
import { retrievalOracleCase } from '@offscreen/application/developer-tools';
import {
  canonicalRuleEvidence,
  createStorytellerRuntime,
  loadCanonicalKnowledge,
  resolveCanonicalRecallCues,
  resolveCreativeExplorationRecipe,
  resourcesForEffectiveUsagePolicy,
  runScriptedMemoryExploration,
  searchCanonicalKnowledge,
  type MemoryExplorationSnapshot,
  MemoryExplorationControllerError,
  type ScriptedMemoryRoundSource,
} from '@offscreen/application/storyteller';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerFunding,
  storytellerMemoryExploration,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
import {
  type ExecutionPolicy,
  prepareStorytellerTask,
  storytellerTaskSchema,
} from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import {
  canonicalDocumentSchema,
  LocalDocumentStore,
  importRulePackageDirectory,
  importStartPackageDirectory,
  importWorldPackage,
  startPackageManifestSchema,
} from '@offscreen/documents';
import { registerStoryConcern } from './helpers/story-suite.js';
import { createTestUsagePolicy } from './helpers/usage-policy.js';

const fakeUsage = (reportedCostMicrousd: bigint) => ({
  reportedCostMicrousd,
  promptTokens: 20,
  completionTokens: 10,
  totalTokens: 30,
  reasoningTokens: 0,
  cachedTokens: 0,
  cacheWriteTokens: 0,
});

const fakeTelemetry = (providerId: string) => ({
  durationMs: 25,
  httpStatus: 200,
  providerId,
  reportedModel: 'fake/model',
  finishReason: 'stop',
});

registerStoryConcern(
  import.meta.url,
  'reusable start package',
  async ({ t, database, owner }) => {
    await t.test(
      'memory exploration persists private rounds and replays its final candidate',
      async () => {
        const drafts = createDrafts(database);
        const openings = createScriptedOpenings(database);
        const draftId = randomUUID();
        await drafts.save(owner, draftId, {
          title: 'Memory exploration controller',
          premise: 'A traveler returns after a long absence.',
          storytellingDirection: 'Use recovered evidence conservatively.',
          storyteller: { id: 'absurd-action-comedy', revision: 1 },
          expectedRevision: 0,
        });
        const openingId = randomUUID();
        await openings.request(owner, draftId, openingId, 1);
        const generated = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [openingId],
        );
        const oneShotTask = storytellerTaskSchema.parse(
          generated.rows[0]?.input,
        );
        const task = storytellerTaskSchema.parse({
          ...oneShotTask,
          resources: {
            ...oneShotTask.resources,
            creativeExploration: resolveCreativeExplorationRecipe({
              posture: 'minimal',
              requested: { maxCandidatesPerQuery: 1, maxLeads: 1 },
            }),
            recipe: {
              version: 'memory-exploration.v1',
              maxModelRounds: 2,
              maxReads: 2,
              maxRetainedReadBytes: 4096,
              tools: 'memory-read.v1',
              automaticEscalation: false,
              finalAnswerReserveRounds: 1,
              maxRepairRounds: 0,
            },
          },
        });
        const generationId = randomUUID();
        await database.db.insert(generation).values({
          id: generationId,
          ownerId: owner,
          kind: 'storyteller.profiled.v1',
          input: task,
        });

        const initialSnapshot: MemoryExplorationSnapshot = {
          format: 'offscreen.memory-exploration-snapshot.v1',
          storyId: draftId,
          rootHash: 'a'.repeat(64),
          rootRevision: 1,
          readsUsed: 0,
          retainedBytes: 0,
          memoryHandles: [],
          sourceHandles: [],
          rounds: [],
        };
        const memoryUnit = {
          unitId: `${randomUUID()}@1#root`,
          documentId: randomUUID(),
          revision: 1,
          sourceHash: 'b'.repeat(64),
          path: 'relationships/old-promise.md',
          kind: 'relationship',
          authority: 'canon',
          visibility: 'player-known',
          branchKey: 'main',
          current: true,
          headingPath: [],
          linkedDocumentIds: [],
          effectiveFromGameSecond: null,
          effectiveThroughGameSecond: null,
          title: 'Old promise',
          contextualKey: 'relationship old promise',
          bodyBytes: 64,
        };
        let failNextRead = true;
        const createExplorer = (saved?: MemoryExplorationSnapshot) => {
          let snapshot = saved ?? initialSnapshot;
          return {
            execute: async (request: { requests: readonly unknown[] }) => {
              if (failNextRead) {
                failNextRead = false;
                throw new Error('simulated crash after request persistence');
              }
              const round = {
                request,
                results: [
                  {
                    requestId: 'r1',
                    operation: 'creative_search',
                    lens: 'serendipity',
                    state: 'ok',
                    candidates: [
                      {
                        handle: 'm1',
                        documentId: memoryUnit.documentId,
                        revision: 1,
                        title: 'Old promise',
                        path: memoryUnit.path,
                        kind: memoryUnit.kind,
                        linkedSources: [],
                        snippet: 'The old promise remains unresolved.',
                      },
                    ],
                  },
                ],
              };
              snapshot = {
                ...snapshot,
                readsUsed: snapshot.readsUsed + request.requests.length,
                memoryHandles: [{ handle: 'm1', unit: memoryUnit }],
                rounds: [...snapshot.rounds, round],
              };
              return round;
            },
            snapshot: () => snapshot,
          };
        };
        let sourceCalls = 0;
        const composedContexts: Array<
          Pick<
            Parameters<ScriptedMemoryRoundSource>[0],
            | 'attemptId'
            | 'request'
            | 'capturedRequestBytes'
            | 'boundedRequestBytes'
          >
        > = [];
        const source: ScriptedMemoryRoundSource = async ({
          attemptId,
          round,
          request,
          capturedRequestBytes,
          boundedRequestBytes,
        }) => {
          sourceCalls += 1;
          composedContexts.push({
            attemptId,
            request,
            capturedRequestBytes,
            boundedRequestBytes,
          });
          const pendingRound = (
            await database.db.select().from(storytellerMemoryExploration)
          ).find((row) => row.generationId === generationId);
          assert.equal(pendingRound?.pendingModelAttemptId, attemptId);
          assert.deepEqual(pendingRound?.pendingModelRequest, request);
          assert.equal(pendingRound?.pendingModelOutput, null);
          if (round === 1) {
            return {
              kind: 'needs_context',
              version: 1,
              purpose: 'Find the old promise before composing.',
              requests: [
                {
                  requestId: 'r1',
                  operation: 'ask_memory',
                  intent: 'possibilities',
                  question: 'How could the old promise matter here?',
                },
              ],
            };
          }
          const user = JSON.parse(request.messages[1].content);
          const evidence = user.memoryExploration.evidencePack.evidence[0];
          assert.ok(evidence);
          return {
            result: scriptedStorytellerResult(task),
            evidenceUse: {
              itemIds: [evidence.itemId],
              sourceIds: evidence.sourceIds,
            },
            creativeDirections: {
              format: 'offscreen.creative-direction-set.v1',
              directions: [
                {
                  id: 'd1',
                  premise:
                    'Let the old promise touch the current return without forcing a commitment.',
                  evidenceItemIds: [evidence.itemId],
                  intendedValue:
                    'Create a specific relationship callback while preserving player agency.',
                  constraints: ['The promise remains unresolved.'],
                  status: 'selected',
                },
              ],
            },
          };
        };
        let settlementCalls = 0;
        const controllerInput = {
          generationId,
          task,
          createExplorer,
          source,
          captureDelivery: (output: unknown) => ({
            output,
            settlement: { kind: 'fake-provider-accounting' },
          }),
          settlePersistedRound: async ({
            attemptId,
            delivery,
          }: {
            attemptId: string;
            delivery: { settlement: unknown | null };
          }) => {
            settlementCalls += 1;
            const pendingRound = (
              await database.db.select().from(storytellerMemoryExploration)
            ).find((row) => row.generationId === generationId);
            assert.equal(pendingRound?.pendingModelAttemptId, attemptId);
            assert.equal(
              (
                pendingRound?.pendingModelOutput as {
                  format?: unknown;
                }
              )?.format,
              'offscreen.memory-round-delivery.v1',
            );
            assert.deepEqual(
              (
                pendingRound?.pendingModelOutput as {
                  settlement?: unknown;
                }
              )?.settlement,
              { kind: 'fake-provider-accounting' },
            );
            assert.deepEqual(delivery.settlement, {
              kind: 'fake-provider-accounting',
            });
            if (settlementCalls === 1) {
              throw new Error('simulated crash after delivery persistence');
            }
          },
        } as const;
        await assert.rejects(
          runScriptedMemoryExploration(database, controllerInput),
          /simulated crash after delivery persistence/,
        );
        assert.equal(sourceCalls, 1);
        await assert.rejects(
          runScriptedMemoryExploration(database, controllerInput),
          /simulated crash/,
        );
        assert.equal(sourceCalls, 1);

        const completed = await runScriptedMemoryExploration(
          database,
          controllerInput,
        );
        assert.equal(completed.replayed, false);
        assert.equal(completed.explorationRounds, 1);
        assert.equal(completed.evidenceUse.declaredItemIds.length, 1);
        assert.deepEqual(completed.evidenceUse.requiredUnusedItemIds, []);
        assert.equal(
          completed.creativeDirections.directions[0]?.status,
          'selected',
        );
        assert.equal(sourceCalls, 2);
        assert.equal(settlementCalls, 3);
        const initialContext = composedContexts[0];
        const finalContext = composedContexts[1];
        assert.ok(initialContext);
        assert.ok(finalContext);
        assert.notEqual(initialContext.attemptId, finalContext.attemptId);
        const initialUser = JSON.parse(
          initialContext.request.messages[1].content,
        );
        const finalUser = JSON.parse(finalContext.request.messages[1].content);
        assert.equal(
          initialUser.memoryExploration.evidencePack.evidence.length,
          0,
        );
        assert.match(
          finalUser.memoryExploration.evidencePack.contents[0]?.text ?? '',
          /old promise remains unresolved/i,
        );
        assert.equal(finalUser.memoryExploration.round, 2);
        assert.equal(finalUser.memoryExploration.canRequestContext, false);
        assert.ok(
          finalContext.capturedRequestBytes < finalContext.boundedRequestBytes,
        );
        assert.ok(
          finalContext.boundedRequestBytes <=
            task.resources.envelope.maxSerializedRequestBytes,
        );

        const replayed = await runScriptedMemoryExploration(database, {
          generationId,
          task,
          createExplorer,
          source: () => {
            throw new Error('A completed exploration must not run again');
          },
        });
        assert.equal(replayed.replayed, true);
        assert.equal(replayed.explorationRounds, 1);
        assert.deepEqual(replayed.output, completed.output);
        assert.deepEqual(replayed.evidenceUse, completed.evidenceUse);
        assert.deepEqual(
          replayed.creativeDirections,
          completed.creativeDirections,
        );

        const disabledCreativeTask = storytellerTaskSchema.parse({
          ...task,
          resources: {
            ...task.resources,
            creativeExploration: resolveCreativeExplorationRecipe({
              posture: 'off',
            }),
          },
        });
        const disabledGenerationId = randomUUID();
        await database.db.insert(generation).values({
          id: disabledGenerationId,
          ownerId: owner,
          kind: 'storyteller.profiled.v1',
          input: disabledCreativeTask,
        });
        let disabledSourceCalls = 0;
        const disabledSource: ScriptedMemoryRoundSource = () => {
          disabledSourceCalls += 1;
          return {
            kind: 'needs_context',
            version: 1,
            purpose: 'Try creative search without captured authority.',
            requests: [
              {
                requestId: 'r1',
                operation: 'ask_memory',
                intent: 'possibilities',
                question: 'How could the old promise matter here?',
              },
            ],
          };
        };
        const disabledInput = {
          generationId: disabledGenerationId,
          task: disabledCreativeTask,
          createExplorer,
          source: disabledSource,
        } as const;
        const assertCreativeLimit = (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'creative-limit';
        await assert.rejects(
          runScriptedMemoryExploration(database, disabledInput),
          assertCreativeLimit,
        );
        assert.equal(disabledSourceCalls, 1);
        await assert.rejects(
          runScriptedMemoryExploration(database, disabledInput),
          assertCreativeLimit,
        );
        assert.equal(disabledSourceCalls, 1);

        const overflowGenerationId = randomUUID();
        await database.db.insert(generation).values({
          id: overflowGenerationId,
          ownerId: owner,
          kind: 'storyteller.profiled.v1',
          input: task,
        });
        let overflowSourceCalls = 0;
        const overflowSource: ScriptedMemoryRoundSource = () => {
          overflowSourceCalls += 1;
          return {
            kind: 'needs_context',
            version: 1,
            purpose: 'Try to return more creative leads than admitted.',
            requests: [
              {
                requestId: 'r1',
                operation: 'ask_memory',
                intent: 'possibilities',
                question: 'How could the old promise matter here?',
              },
            ],
          };
        };
        const createOverflowExplorer = (saved?: MemoryExplorationSnapshot) => {
          let snapshot = saved ?? initialSnapshot;
          return {
            execute: async (request: { requests: readonly unknown[] }) => {
              const candidate = {
                handle: 'm1',
                documentId: memoryUnit.documentId,
                revision: 1,
                title: 'Old promise',
                path: memoryUnit.path,
                kind: memoryUnit.kind,
                linkedSources: [],
                snippet: 'The old promise remains unresolved.',
              };
              snapshot = {
                ...snapshot,
                readsUsed: snapshot.readsUsed + request.requests.length,
                memoryHandles: [{ handle: 'm1', unit: memoryUnit }],
                rounds: [
                  ...snapshot.rounds,
                  {
                    request,
                    results: [
                      {
                        requestId: 'r1',
                        operation: 'creative_search',
                        lens: 'serendipity',
                        state: 'ok',
                        candidates: [candidate, candidate],
                      },
                    ],
                  },
                ],
              };
            },
            snapshot: () => snapshot,
          };
        };
        const overflowInput = {
          generationId: overflowGenerationId,
          task,
          createExplorer: createOverflowExplorer,
          source: overflowSource,
        } as const;
        await assert.rejects(
          runScriptedMemoryExploration(database, overflowInput),
          assertCreativeLimit,
        );
        assert.equal(overflowSourceCalls, 1);
        await assert.rejects(
          runScriptedMemoryExploration(database, overflowInput),
          assertCreativeLimit,
        );
        assert.equal(overflowSourceCalls, 1);

        const failedGenerationId = randomUUID();
        await database.db.insert(generation).values({
          id: failedGenerationId,
          ownerId: owner,
          kind: 'storyteller.profiled.v1',
          input: task,
        });
        let failedSourceCalls = 0;
        const exhaustedSource: ScriptedMemoryRoundSource = () => {
          failedSourceCalls += 1;
          return {
            kind: 'needs_context',
            version: 1,
            purpose: 'Request more reads than this operation permits.',
            requests: [
              {
                requestId: 'r1',
                operation: 'ask_memory',
                intent: 'evidence',
                question: 'What established fact is relevant to one?',
              },
              {
                requestId: 'r2',
                operation: 'ask_memory',
                intent: 'evidence',
                question: 'What established fact is relevant to two?',
              },
              { requestId: 'r3', operation: 'read_memory', handle: 'm1' },
            ],
          };
        };
        const assertReadLimit = (error: unknown) =>
          error instanceof MemoryExplorationControllerError &&
          error.code === 'read-limit';
        await assert.rejects(
          runScriptedMemoryExploration(database, {
            generationId: failedGenerationId,
            task,
            createExplorer,
            source: exhaustedSource,
          }),
          assertReadLimit,
        );
        assert.equal(failedSourceCalls, 1);
        await assert.rejects(
          runScriptedMemoryExploration(database, {
            generationId: failedGenerationId,
            task,
            createExplorer,
            source: () => {
              throw new Error('A durable failure must not decide again');
            },
          }),
          assertReadLimit,
        );
        assert.equal(failedSourceCalls, 1);
      },
    );

    await t.test(
      'abstract start publishes one final root and one obligation across retry',
      async () => {
        const fixtureRoot = await mkdtemp(
          join(tmpdir(), 'offscreen-start-integration-'),
        );
        const storage = new LocalDocumentStore(join(fixtureRoot, 'store'));
        const rules = await importRulePackageDirectory(
          storage,
          resolve('content/rules/srd-5.2.1-subset'),
        );
        const defaultRules = {
          ruleSetId: rules.manifest.ruleSetId,
          rootHash: rules.rootHash,
          revision: rules.manifest.revision,
          engine: rules.manifest.engine,
        };
        const source = join(fixtureRoot, 'abstract-start');
        await mkdir(join(source, 'obligations'), { recursive: true });
        await mkdir(join(source, 'adaptations'), { recursive: true });
        await writeFile(
          join(source, 'START.md'),
          '# Gradient life\n\nThere are no people here, only a living response to chemical gradients.',
        );
        await writeFile(
          join(source, 'adaptations', 'membrane.md'),
          '# Membrane adaptation\n\nWhen the iron gradient steepens, the organism slows exchange across its membrane.',
        );
        const packageObligationId = randomUUID();
        await writeFile(
          join(source, 'obligations', 'warming.json'),
          JSON.stringify({
            version: 1,
            obligation: {
              id: packageObligationId,
              revision: 1,
              source: { id: 'gradient-life', revision: 1 },
              label: 'The medium warms',
              visibility: { kind: 'hidden' },
              consequence: {
                kind: 'condition.set.v1',
                condition: {
                  id: 'warm-medium',
                  label: 'Warm medium',
                  value: true,
                },
              },
              followUp: 'report',
              due: { kind: 'game-second', gameSecond: 12 },
            },
          }),
        );
        const startPackageId = randomUUID();
        await writeFile(
          join(source, 'start-package.json'),
          JSON.stringify({
            format: 'offscreen.start-package-source.v1',
            startPackageId,
            authorOperationId: randomUUID(),
            title: 'Gradient life',
            worlds: [],
            rules: defaultRules,
            documents: [
              {
                path: 'START.md',
                kind: 'orientation',
                activation: 'initial-canon',
                authority: 'canon',
                visibility: 'player-known',
              },
              {
                path: 'adaptations/membrane.md',
                kind: 'lore',
                activation: 'initial-canon',
                authority: 'canon',
                visibility: 'player-known',
              },
              {
                path: 'obligations/warming.json',
                kind: 'world-obligation',
                activation: 'executable-obligation',
                authority: 'canon',
                visibility: 'storyteller-private',
                schemaId: 'world-obligation.v1',
              },
            ],
          }),
        );
        const imported = await importStartPackageDirectory(storage, source);
        const drafts = createDrafts(database);
        const openings = createScriptedOpenings(database);
        const runtime = createStorytellerRuntime(database, {
          realDurationMs: () => 1000,
        });
        const stories = createStories(database, {
          documentStore: storage,
          defaultRules,
        });
        const draftId = randomUUID();
        await drafts.save(owner, draftId, {
          title: 'Abstract start integration',
          premise: 'A small organism responds to its environment.',
          storytellingDirection: 'Avoid humanoid assumptions.',
          storyteller: { id: 'absurd-action-comedy', revision: 1 },
          expectedRevision: 0,
        });
        const candidateId = randomUUID();
        await openings.request(owner, draftId, candidateId, 1, 'microbe.v3');
        await runtime.complete(candidateId);
        const storyId = randomUUID();
        const campaign: CampaignStart = {
          mechanics: true,
          locked: false,
          pace: { kind: 'instant' },
          time: {
            kind: 'elapsed',
            id: 'simulation-gameSeconds',
            revision: 1,
            unit: {
              id: 'game-second',
              label: 'game-second',
              pluralLabel: 'gameSeconds',
              gameSecondsPerUnit: 1,
            },
            epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
          },
          worldObligations: [],
          worlds: [],
          startPackage: {
            startPackageId,
            rootHash: imported.rootHash,
            revision: imported.manifest.revision,
          },
        };
        const request = {
          ownerId: owner,
          storyId,
          candidateId,
          expectedDraftRevision: 1,
          campaign,
        };
        const startedSnapshot = await stories.startFromCandidate(request);
        const firstStory = await database.db.$client.query(
          'SELECT document_root_hash, document_root_revision FROM story WHERE id = $1',
          [storyId],
        );
        assert.equal(firstStory.rowCount, 1);
        assert.equal(firstStory.rows[0].document_root_revision, 2);
        const firstRootHash = String(firstStory.rows[0].document_root_hash);
        const manifest = await storage.readManifest(firstRootHash);
        assert.ok(
          manifest.entries.some((entry) => entry.path === 'start/package.md'),
        );
        assert.ok(
          manifest.entries.some(
            (entry) => entry.path === 'start/reference.json',
          ),
        );
        assert.ok(
          manifest.entries.some((entry) => entry.kind === 'character'),
          'the actual microbe protagonist remains explicit campaign data',
        );
        const abstractOracle = retrievalOracleCase(
          'gradient-life.no-human-economy',
        );
        const abstractRecall = await resolveCanonicalRecallCues(storage, {
          storyId,
          rootHash: firstRootHash,
          rootRevision: manifest.revision,
          cues: [],
          maxCandidates: abstractOracle.budget.maxCandidates,
        });
        assert.deepEqual(abstractRecall.candidates, []);
        assert.deepEqual(abstractRecall.trace.requested, []);
        const abstractDiscovery = await searchCanonicalKnowledge(storage, {
          storyId,
          rootHash: firstRootHash,
          rootRevision: manifest.revision,
          query: abstractOracle.query,
          maxResults: abstractOracle.budget.maxCandidates,
          maxExaminedBytes: abstractOracle.budget.maxBytes,
        });
        assert.equal(abstractDiscovery.coverage.state, 'complete');
        assert.deepEqual(abstractDiscovery.candidates, []);
        assert.ok(abstractOracle.abstainWhenExpectedMissing);
        const obligations = await database.db.$client.query(
          'SELECT id, due_tick FROM world_obligation WHERE story_id = $1',
          [storyId],
        );
        assert.equal(obligations.rowCount, 1);
        assert.notEqual(obligations.rows[0].id, packageObligationId);
        assert.equal(Number(obligations.rows[0].due_tick), 12);

        await stories.startFromCandidate(request);
        const retriedStory = await database.db.$client.query(
          'SELECT document_root_hash, document_root_revision FROM story WHERE id = $1',
          [storyId],
        );
        assert.deepEqual(retriedStory.rows, firstStory.rows);
        const retriedObligations = await database.db.$client.query(
          'SELECT id FROM world_obligation WHERE story_id = $1',
          [storyId],
        );
        assert.equal(retriedObligations.rowCount, 1);

        const campaignSnapshot = startedSnapshot.campaign;
        assert.ok(campaignSnapshot?.offer);
        const rolledAction = campaignSnapshot.offer.nodes.find(
          (node) => node.id === 'follow-gradient',
        );
        assert.ok(rolledAction?.action);
        assert.equal(rolledAction.action.timing.kind, 'finite');
        const actionOperationId = randomUUID();
        await stories.campaignAction({
          ownerId: owner,
          storyId,
          operationId: actionOperationId,
          body: {
            expectedRevision: startedSnapshot.revision,
            offerId: campaignSnapshot.offer.id,
            path: [rolledAction.id],
          },
        });
        const preparedAction = await database.db.$client.query(
          'SELECT preparation_generation_id FROM game_action_execution WHERE operation_id = $1',
          [actionOperationId],
        );
        const preparationGenerationId = String(
          preparedAction.rows[0]?.preparation_generation_id,
        );
        assert.match(preparationGenerationId, /^[0-9a-f-]{36}$/);
        const preparedGeneration = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [preparationGenerationId],
        );
        const preparedTask = storytellerTaskSchema.parse(
          preparedGeneration.rows[0]?.input,
        );
        assert.equal(preparedTask.task, 'pending-consequence');
        assert.deepEqual(
          preparedTask.context.canonicalKnowledge?.librarySelection
            .requestedTopics,
          ['ability-check'],
        );
        assert.deepEqual(
          preparedTask.context.canonicalKnowledge?.librarySelection
            .unmatchedTopics,
          [],
        );
        const loadedRuleHandles =
          preparedTask.context.canonicalKnowledge?.librarySelection
            .loadedHandles ?? [];
        assert.ok(loadedRuleHandles.length >= 1);
        const selectedRuleSections =
          preparedTask.context.canonicalKnowledge?.libraries.flatMap(
            (library) => library.selectedSections,
          ) ?? [];
        assert.deepEqual(
          selectedRuleSections.map((section) => section.handle),
          loadedRuleHandles,
        );
        assert.ok(
          selectedRuleSections.every((section) => section.body.length > 0),
        );
        const preparedPacket = JSON.parse(
          preparedTask.request.messages[1].content,
        ) as {
          sceneContext?: {
            canonicalKnowledge?: {
              librarySelection?: { requestedTopics: string[] };
            };
          };
        };
        assert.deepEqual(
          preparedPacket.sceneContext?.canonicalKnowledge?.librarySelection
            ?.requestedTopics,
          ['ability-check'],
        );

        const accountId = randomUUID();
        const runId = randomUUID();
        const route = 'fake:abstract-memory';
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
          maxAttempts: 2,
          enabled: true,
        });
        const execution: ExecutionPolicy = {
          mode: 'provider',
          accountId,
          runId,
          dispatchReview: { mode: 'off' },
          policy: {
            version: 'fake',
            route,
            model: 'fake/model',
            provider: 'fake',
            priceVersion: 'abstract-memory-test',
            inputMicrousdPerMillion: '1000',
            outputMicrousdPerMillion: '1000',
            maxInputTokens: 100000,
            maxOutputTokens: 2000,
            timeoutMs: 1000,
          },
        };
        const policy = createTestUsagePolicy(route, [], {
          maxModelRoundsPerOperation: 2,
          maxReadsPerOperation: 1,
          maxRetainedReadBytes: 4096,
        });
        const connectedTask = storytellerTaskSchema.parse({
          ...preparedTask,
          execution,
          resources: resourcesForEffectiveUsagePolicy(execution, policy, {
            posture: 'minimal',
          }),
        });
        const connectedGenerationId = randomUUID();
        await database.db.insert(generation).values({
          id: connectedGenerationId,
          ownerId: owner,
          kind: 'storyteller.profiled.v1',
          input: connectedTask,
        });
        let providerRounds = 0;
        const connectedRuntime = createStorytellerRuntime(database, {
          realDurationMs: () => 1000,
          documentStore: storage,
          dispatchAuthority: () => policy,
          provider: async (providerTask, dispatch) => {
            providerRounds += 1;
            assert.ok(dispatch);
            if (providerRounds === 1) {
              return {
                kind: 'result',
                output: {
                  kind: 'needs_context',
                  version: 1,
                  purpose:
                    'Recover the organism adaptation relevant to the gradient.',
                  requests: [
                    {
                      requestId: 'adaptation',
                      operation: 'ask_memory',
                      intent: 'evidence',
                      question:
                        'What membrane adaptation applies when the iron gradient steepens?',
                    },
                  ],
                },
                usage: fakeUsage(0n),
                telemetry: fakeTelemetry('fake-abstract-memory-search'),
              };
            }
            const user = JSON.parse(dispatch.request.messages[1].content) as {
              memoryExploration: {
                evidencePack: {
                  evidence: Array<{ itemId: string; sourceIds: string[] }>;
                  contents: Array<{ text: string }>;
                };
              };
            };
            const packet = user.memoryExploration.evidencePack;
            const evidenceText = packet.contents
              .map((content) => content.text)
              .join('\n');
            assert.match(evidenceText, /slows exchange across its membrane/i);
            assert.doesNotMatch(
              evidenceText,
              /\b(?:person|tavern|wage|calendar|quest)\b/i,
            );
            const result = structuredClone(
              scriptedStorytellerResult(providerTask),
            );
            if (!('scene' in result)) {
              throw new Error('Expected abstract pending-consequence result');
            }
            result.scene.content.paragraphs = [
              'The iron gradient steepens; exchange across the membrane slows.',
            ];
            return {
              kind: 'result',
              output: {
                result,
                evidenceUse: {
                  itemIds: packet.evidence.map((item) => item.itemId),
                  sourceIds: [
                    ...new Set(
                      packet.evidence.flatMap((item) => item.sourceIds),
                    ),
                  ],
                },
                creativeDirections: {
                  format: 'offscreen.creative-direction-set.v1',
                  directions: [],
                },
              },
              usage: fakeUsage(0n),
              telemetry: fakeTelemetry('fake-abstract-memory-final'),
            };
          },
        });
        await connectedRuntime.complete(connectedGenerationId);
        assert.equal(providerRounds, 2);
        const abstractArtifacts = await database.db.$client.query(
          'SELECT state, model_rounds_used, snapshot FROM storyteller_memory_exploration WHERE generation_id = $1',
          [connectedGenerationId],
        );
        assert.equal(abstractArtifacts.rows[0]?.state, 'final-ready');
        assert.equal(Number(abstractArtifacts.rows[0]?.model_rounds_used), 2);
        assert.equal(
          (abstractArtifacts.rows[0]?.snapshot as MemoryExplorationSnapshot)
            .rounds.length,
          1,
        );
        const preparedResult = await database.db.$client.query(
          'SELECT output FROM generation WHERE id = $1',
          [connectedGenerationId],
        );
        const preparedOutput = JSON.stringify(preparedResult.rows[0]?.output);
        assert.match(preparedOutput, /exchange across the membrane slows/i);
        assert.doesNotMatch(
          preparedOutput,
          /\b(?:person|tavern|wage|calendar|quest)\b/i,
        );
      },
    );

    await t.test(
      'conventional start retains rich roles and stays pinned after revision two',
      async () => {
        const fixtureRoot = await mkdtemp(
          join(tmpdir(), 'offscreen-start-conventional-'),
        );
        const storage = new LocalDocumentStore(join(fixtureRoot, 'store'));
        const rules = await importRulePackageDirectory(
          storage,
          resolve('content/rules/srd-5.2.1-subset'),
        );
        const defaultRules = {
          ruleSetId: rules.manifest.ruleSetId,
          rootHash: rules.rootHash,
          revision: rules.manifest.revision,
          engine: rules.manifest.engine,
        };
        const worldId = randomUUID();
        const world = await importWorldPackage(storage, {
          worldId,
          operationId: randomUUID(),
          title: 'Salt Coast',
          files: [
            {
              path: 'WORLD.md',
              content:
                '# Salt Coast\n\nA compact navigation page for the coast and its authored lore.',
            },
            {
              path: 'lore/tides.md',
              content:
                '# The patient tide\n\nThe harbor drains far enough at dusk to expose an old stone road.',
            },
          ],
        });
        const worldReference = {
          worldId,
          rootHash: world.rootHash,
          revision: world.manifest.revision,
          mount: 'salt-coast',
        };

        const source = join(fixtureRoot, 'conventional-start');
        for (const directory of [
          'identities',
          'locations',
          'threads',
          'possibilities',
          'developer',
          'obligations',
        ]) {
          await mkdir(join(source, directory), { recursive: true });
        }
        const markdown = new Map([
          [
            'START.md',
            '# Arrival at Greywake\n\nYou step from the ferry while the warehouse bell marks the late shift.',
          ],
          [
            'identities/player.md',
            '# The newcomer\n\nYou arrive with a sealed letter and no assigned profession.',
          ],
          [
            'identities/harbormaster.md',
            '# Harbormaster Ilya\n\nIlya assigns berths and knows which crews are hiring.',
          ],
          [
            'identities/keeper.md',
            '# Warehouse keeper Sera\n\nIn Greywake, Sera runs two finite shifts and never staffs the warehouse around the clock.',
          ],
          [
            'locations/quay.md',
            '# Greywake quay\n\nA public Greywake landing bordered by customs sheds.',
          ],
          [
            'locations/warehouse.md',
            '# Salt warehouse\n\nA guarded Greywake storehouse that closes between shifts.',
          ],
          [
            'threads/work.md',
            '# Work at the warehouse\n\nIn Greywake, Sera is openly seeking one careful hand for the late shift.',
          ],
          [
            'possibilities/smugglers.md',
            '# A possible hidden route\n\nThe exposed stone road may be used by smugglers, but this is not yet fact.',
          ],
          [
            'developer/false-tide-road.md',
            '# Patient tide road\n\nThis developer-only decoy must never appear in Storyteller search results.',
          ],
        ]);
        for (const [path, body] of markdown) {
          await writeFile(join(source, path), body);
        }
        const packageObligationId = randomUUID();
        await writeFile(
          join(source, 'obligations', 'shift-bell.json'),
          JSON.stringify({
            version: 1,
            obligation: {
              id: packageObligationId,
              revision: 1,
              source: { id: 'greywake-shift-bell', revision: 1 },
              label: 'The late-shift bell rings',
              visibility: { kind: 'exact' },
              consequence: {
                kind: 'condition.set.v1',
                condition: {
                  id: 'late-shift-open',
                  label: 'Late shift open',
                  value: true,
                },
              },
              followUp: 'report',
              due: { kind: 'game-second', gameSecond: 20 },
            },
          }),
        );
        const startPackageId = randomUUID();
        const initialCanon = (
          path: string,
          kind: 'orientation' | 'identity' | 'lore' | 'narrative-thread',
        ) => ({
          path,
          kind,
          activation: 'initial-canon',
          authority: 'canon',
          visibility: 'player-known',
        });
        await writeFile(
          join(source, 'start-package.json'),
          JSON.stringify({
            format: 'offscreen.start-package-source.v1',
            startPackageId,
            authorOperationId: randomUUID(),
            title: 'Arrival at Greywake',
            worlds: [worldReference],
            rules: defaultRules,
            documents: [
              initialCanon('START.md', 'orientation'),
              initialCanon('identities/player.md', 'identity'),
              initialCanon('identities/harbormaster.md', 'identity'),
              initialCanon('identities/keeper.md', 'identity'),
              initialCanon('locations/quay.md', 'lore'),
              initialCanon('locations/warehouse.md', 'lore'),
              initialCanon('threads/work.md', 'narrative-thread'),
              {
                path: 'possibilities/smugglers.md',
                kind: 'private-possibility',
                activation: 'private-possibility',
                authority: 'noncanonical',
                visibility: 'storyteller-private',
              },
              {
                path: 'developer/false-tide-road.md',
                kind: 'lore',
                activation: 'initial-canon',
                authority: 'canon',
                visibility: 'developer-private',
              },
              {
                path: 'obligations/shift-bell.json',
                kind: 'world-obligation',
                activation: 'executable-obligation',
                authority: 'canon',
                visibility: 'storyteller-private',
                schemaId: 'world-obligation.v1',
              },
            ],
          }),
        );
        const imported = await importStartPackageDirectory(storage, source);

        const drafts = createDrafts(database);
        const openings = createScriptedOpenings(database);
        let offeredWorldSection: string | undefined;
        let offeredCampaignDocument: string | undefined;
        const promotedThreadPath = 'threads/patient-tide-return.md';
        const promotedIdentityPath = 'identities/ira-venn.md';
        const promotedRelationshipPath =
          'relationships/newcomer-and-ira-venn.md';
        const unrelatedMarketPath = 'lore/net-market-weather.md';
        let promotedThreadDocumentId: string | undefined;
        let narrativeContinuationPhase = 0;
        const runtime = createStorytellerRuntime(database, {
          realDurationMs: () => 1000,
          documentStore: storage,
          scriptedSource: (storytellerTask) => {
            const result = structuredClone(
              scriptedStorytellerResult(storytellerTask),
            );
            if (
              offeredWorldSection &&
              storytellerTask.task === 'continuation' &&
              'scene' in result &&
              result.scene.next.kind === 'choice'
            ) {
              const option = result.scene.next.options[0]!;
              if (narrativeContinuationPhase === 0) {
                option.worldSections = [offeredWorldSection];
                option.campaignDocuments = offeredCampaignDocument
                  ? [offeredCampaignDocument]
                  : [];
                result.documentChanges = [
                  {
                    operation: 'create',
                    path: promotedThreadPath,
                    kind: 'narrative-thread',
                    authority: 'canon',
                    visibility: 'storyteller-private',
                    title: 'The patient tide road',
                    body: 'The newcomer may return at dusk to investigate the exposed stone road.',
                    reason:
                      'The current passage established a durable possible return.',
                  },
                  {
                    operation: 'create',
                    path: promotedIdentityPath,
                    kind: 'identity',
                    authority: 'canon',
                    visibility: 'player-known',
                    title: 'Ira Venn',
                    body: 'Ira Venn is the quay worker who gave the newcomer a precise warning about the patient tide road.',
                    reason:
                      'A named person became continuity-relevant through direct advice and a possible later return.',
                  },
                  {
                    operation: 'create',
                    path: promotedRelationshipPath,
                    kind: 'relationship',
                    authority: 'canon',
                    visibility: 'player-known',
                    title: 'The newcomer and Ira Venn',
                    body: 'Ira Venn gave the newcomer a specific warning about the patient tide road. The newcomer may return to Ira as the source of that advice.',
                    reason:
                      'The exchange established a source-linked acquaintance that later recognition must preserve.',
                  },
                ];
                option.createdDocuments = [0, 1, 2];
              } else if (narrativeContinuationPhase === 1) {
                result.documentChanges = [
                  {
                    operation: 'create',
                    path: unrelatedMarketPath,
                    kind: 'lore',
                    authority: 'canon',
                    visibility: 'player-known',
                    title: 'Weather over the net market',
                    body: 'A brief squall soaked the net market before the awnings were raised.',
                    reason:
                      'The intervening passage established an unrelated local detail.',
                  },
                ];
                option.createdDocuments = [0];
              } else if (narrativeContinuationPhase === 2) {
                assert.ok(promotedThreadDocumentId);
                result.documentChanges = [
                  {
                    operation: 'revise',
                    documentId: promotedThreadDocumentId,
                    expectedRevision: 1,
                    path: promotedThreadPath,
                    kind: 'narrative-thread',
                    authority: 'canon',
                    visibility: 'storyteller-private',
                    title: 'The patient tide road',
                    body: 'The tide road has collapsed beneath the surf; the newcomer must use the cliff stairs to return.',
                    reason:
                      'The current passage corrected the route before the later return.',
                    recallAs: 'thread',
                  },
                ];
                const quay =
                  storytellerTask.context.canonicalKnowledge?.catalogue.find(
                    (entry) => entry.path === 'locations/quay.md',
                  );
                assert.ok(quay);
                result.activeScene = {
                  kind: 'restart-at-current',
                  recallDocuments: [{ handle: quay.handle, reason: 'place' }],
                };
              }
              narrativeContinuationPhase += 1;
            }
            return result;
          },
        });
        const stories = createStories(database, {
          documentStore: storage,
          defaultRules,
        });
        const draftId = randomUUID();
        await drafts.save(owner, draftId, {
          title: 'Conventional start integration',
          premise: 'A newcomer arrives at the working harbor of Greywake.',
          storytellingDirection:
            'Keep authored facts and possibilities distinct.',
          storyteller: { id: 'absurd-action-comedy', revision: 1 },
          expectedRevision: 0,
        });
        const candidateId = randomUUID();
        await openings.request(owner, draftId, candidateId, 1);
        await runtime.complete(candidateId);
        const storyId = randomUUID();
        const campaign: CampaignStart = {
          mechanics: false,
          locked: false,
          pace: { kind: 'instant' },
          time: {
            kind: 'elapsed',
            id: 'harbor-gameSeconds',
            revision: 1,
            unit: {
              id: 'game-second',
              label: 'game-second',
              pluralLabel: 'gameSeconds',
              gameSecondsPerUnit: 1,
            },
            epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
          },
          worldObligations: [],
          worlds: [],
          startPackage: {
            startPackageId,
            rootHash: imported.rootHash,
            revision: imported.manifest.revision,
          },
        };
        const startedSnapshot = await stories.startFromCandidate({
          ownerId: owner,
          storyId,
          candidateId,
          expectedDraftRevision: 1,
          campaign,
        });

        const started = await database.db.$client.query(
          'SELECT document_root_hash, document_root_revision FROM story WHERE id = $1',
          [storyId],
        );
        assert.equal(started.rowCount, 1);
        assert.equal(started.rows[0].document_root_revision, 2);
        const campaignRoot = String(started.rows[0].document_root_hash);
        const campaignManifest = await storage.readManifest(campaignRoot);
        const expectedPaths = [
          'identities/harbormaster.md',
          'identities/keeper.md',
          'identities/player.md',
          'locations/quay.md',
          'locations/warehouse.md',
          'threads/work.md',
          'possibilities/smugglers.md',
          'obligations/shift-bell.json',
        ];
        for (const path of expectedPaths) {
          assert.ok(
            campaignManifest.entries.some((entry) => entry.path === path),
            `campaign root should contain ${path}`,
          );
        }
        const startReferenceEntry = campaignManifest.entries.find(
          (entry) => entry.path === 'start/reference.json',
        );
        assert.ok(startReferenceEntry);
        const startReference = await storage.readStructuredDocument(
          startReferenceEntry.objectHash,
        );
        assert.equal(startReference.schemaId, 'start-reference.v1');
        const referenceData = startReference.data as {
          rootHash: string;
          revision: number;
          entries: Array<{
            packageDocumentId: string;
            campaignDocumentId: string;
            path: string;
            activation: string;
          }>;
        };
        assert.equal(referenceData.rootHash, imported.rootHash);
        assert.equal(referenceData.revision, 1);
        assert.equal(
          referenceData.entries.filter(
            (entry) => entry.activation === 'initial-canon',
          ).length,
          8,
        );
        assert.equal(
          referenceData.entries.filter(
            (entry) => entry.activation === 'private-possibility',
          ).length,
          1,
        );
        assert.equal(
          referenceData.entries.filter(
            (entry) => entry.activation === 'executable-obligation',
          ).length,
          1,
        );
        const obligations = await database.db.$client.query(
          'SELECT id, due_tick FROM world_obligation WHERE story_id = $1',
          [storyId],
        );
        assert.equal(obligations.rowCount, 1);
        assert.notEqual(obligations.rows[0].id, packageObligationId);
        assert.equal(Number(obligations.rows[0].due_tick), 20);

        const orientationEntry = imported.manifest.entries.find(
          (entry) => entry.path === 'START.md',
        );
        assert.ok(orientationEntry);
        const firstOrientation = await storage.readDocument(
          orientationEntry.objectHash,
        );
        const secondOrientationHash = await storage.putDocument(
          canonicalDocumentSchema.parse({
            ...firstOrientation,
            envelope: {
              ...firstOrientation.envelope,
              revision: 2,
              sources: [
                ...firstOrientation.envelope.sources,
                {
                  documentId: firstOrientation.envelope.documentId,
                  revision: 1,
                  section: 'revision-one',
                },
              ],
            },
            body: `${firstOrientation.body}\n\nRevision two adds a market notice.`,
          }),
        );
        const revisionTwoManifest = startPackageManifestSchema.parse({
          ...imported.manifest,
          revision: 2,
          previousRootHash: imported.rootHash,
          authorOperationId: randomUUID(),
          entries: imported.manifest.entries.map((entry) =>
            entry.documentId === orientationEntry.documentId
              ? { ...entry, revision: 2, objectHash: secondOrientationHash }
              : entry,
          ),
        });
        const revisionTwoRoot =
          await storage.putStartPackageManifest(revisionTwoManifest);
        assert.notEqual(revisionTwoRoot, imported.rootHash);

        const reread = await database.db.$client.query(
          'SELECT document_root_hash, document_root_revision FROM story WHERE id = $1',
          [storyId],
        );
        assert.deepEqual(reread.rows, started.rows);
        const pinnedReference = await storage.readStructuredDocument(
          startReferenceEntry.objectHash,
        );
        assert.equal(
          (pinnedReference.data as { rootHash: string }).rootHash,
          imported.rootHash,
        );
        const clonedOrientationEntry = campaignManifest.entries.find(
          (entry) => entry.path === 'start/package.md',
        );
        assert.ok(clonedOrientationEntry);
        const clonedOrientation = await storage.readDocument(
          clonedOrientationEntry.objectHash,
        );
        assert.deepEqual(clonedOrientation.envelope.sources.at(-1), {
          documentId: orientationEntry.documentId,
          revision: 1,
        });

        assert.ok(startedSnapshot.current.interaction);
        const option =
          startedSnapshot.current.interaction.specification.options[0];
        assert.ok(option);
        const continuationId = randomUUID();
        await stories.admitResolution({
          ownerId: owner,
          storyId,
          operationId: continuationId,
          expectedRevision: startedSnapshot.revision,
          submission: {
            interactionId: startedSnapshot.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: option.id },
          },
        });
        const continuation = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [continuationId],
        );
        assert.equal(continuation.rowCount, 1);
        const task = storytellerTaskSchema.parse(continuation.rows[0].input);
        assert.equal(task.task, 'continuation');
        assert.equal(task.inputVersion, 10);
        assert.equal(task.context.canonicalKnowledge?.rootHash, campaignRoot);
        assert.equal(
          task.context.canonicalKnowledge?.rootRevision,
          Number(started.rows[0].document_root_revision),
        );
        assert.equal(task.context.canonicalKnowledge?.catalogue.length, 9);
        assert.equal(task.context.canonicalKnowledge?.documents.length, 8);
        assert.equal(
          task.context.canonicalKnowledge?.catalogue.filter(
            (entry) => entry.loaded,
          ).length,
          8,
        );
        assert.equal(task.context.canonicalKnowledge?.libraries.length, 2);
        const worldLibrary = task.context.canonicalKnowledge?.libraries.find(
          (library) => library.kind === 'world',
        );
        assert.equal(worldLibrary?.mount, 'salt-coast');
        assert.equal(worldLibrary?.catalogue.length, 2);
        assert.ok(worldLibrary?.orientation?.body.includes('Salt Coast'));
        const selectableSection = worldLibrary?.catalogue
          .flatMap((entry) => entry.sections)
          .find((section) => section.heading !== 'Salt Coast');
        assert.ok(selectableSection);
        offeredWorldSection = selectableSection.handle;
        const unloadedCampaignDocument =
          task.context.canonicalKnowledge?.catalogue.find(
            (entry) => !entry.loaded,
          );
        assert.ok(unloadedCampaignDocument);
        offeredCampaignDocument = unloadedCampaignDocument.handle;
        const selectedKnowledge = await loadCanonicalKnowledge(storage, {
          storyId,
          rootHash: campaignRoot,
          rootRevision: Number(started.rows[0].document_root_revision),
          librarySectionSelection: {
            handles: [selectableSection.handle],
            ruleTopics: [],
            maxReads: 1,
            maxBytes: 4 * 1024,
          },
        });
        assert.deepEqual(selectedKnowledge.librarySelection, {
          requestedTopics: [],
          unmatchedTopics: [],
          requestedHandles: [selectableSection.handle],
          loadedHandles: [selectableSection.handle],
          omitted: [],
          maxReads: 1,
          maxBytes: 4 * 1024,
          usedReads: 1,
          usedBytes:
            selectedKnowledge.libraries
              .flatMap((library) => library.selectedSections)
              .find((section) => section.handle === selectableSection.handle)
              ?.bytes ?? 0,
        });
        const selectedSection = selectedKnowledge.libraries
          .flatMap((library) => library.selectedSections)
          .find((section) => section.handle === selectableSection.handle);
        assert.equal(selectedSection?.heading, selectableSection.heading);
        assert.ok(selectedSection?.body.includes(selectableSection.heading));
        const {
          inputVersion: _inputVersion,
          promptVersion: _promptVersion,
          request: _request,
          contextManifest: _contextManifest,
          ...capturedInput
        } = task;
        const selectedTask = prepareStorytellerTask({
          ...capturedInput,
          context: {
            ...task.context,
            canonicalKnowledge: selectedKnowledge,
          },
        });
        const selectedPacket = JSON.parse(
          selectedTask.request.messages[1].content,
        ) as {
          sceneContext?: {
            canonicalKnowledge?: {
              libraries: Array<{
                selectedSections: Array<{ handle: string; body: string }>;
              }>;
              librarySelection: { loadedHandles: string[] };
            };
          };
        };
        assert.deepEqual(
          selectedPacket.sceneContext?.canonicalKnowledge?.librarySelection
            .loadedHandles,
          [selectableSection.handle],
        );
        assert.equal(
          selectedPacket.sceneContext?.canonicalKnowledge?.libraries
            .flatMap((library) => library.selectedSections)
            .find((section) => section.handle === selectableSection.handle)
            ?.body,
          selectedSection?.body,
        );
        const contributionKnowledge = await loadCanonicalKnowledge(storage, {
          storyId,
          rootHash: campaignRoot,
          rootRevision: Number(started.rows[0].document_root_revision),
          librarySectionSelection: canonicalRuleEvidence(['contribution']),
        });
        assert.deepEqual(
          contributionKnowledge.librarySelection.requestedTopics,
          ['contribution'],
        );
        assert.deepEqual(
          contributionKnowledge.librarySelection.unmatchedTopics,
          [],
        );
        assert.equal(
          contributionKnowledge.librarySelection.loadedHandles.length,
          1,
        );
        assert.match(
          contributionKnowledge.libraries
            .flatMap((library) => library.selectedSections)
            .find(
              (section) =>
                section.handle ===
                contributionKnowledge.librarySelection.loadedHandles[0],
            )?.body ?? '',
          /contribution activity/i,
        );
        const ruleLibrary = task.context.canonicalKnowledge?.libraries.find(
          (library) => library.kind === 'rules',
        );
        assert.ok(ruleLibrary?.catalogue.length);
        assert.ok(ruleLibrary?.orientation);
        const packet = JSON.parse(task.request.messages[1].content) as {
          sceneContext?: {
            canonicalKnowledge?: {
              catalogue: unknown[];
              documents: unknown[];
              libraries: Array<Record<string, unknown>>;
            };
          };
        };
        assert.equal(
          packet.sceneContext?.canonicalKnowledge?.catalogue.length,
          9,
        );
        assert.equal(
          packet.sceneContext?.canonicalKnowledge?.documents.length,
          8,
        );
        assert.equal(
          packet.sceneContext?.canonicalKnowledge?.libraries.length,
          2,
        );
        assert.ok(
          packet.sceneContext?.canonicalKnowledge?.libraries.every(
            (library) => !('rootHash' in library),
          ),
        );

        await runtime.complete(continuationId);
        const offered = await stories.read({ ownerId: owner, storyId });
        assert.ok(offered.current.interaction);
        const hintedOption =
          offered.current.interaction.specification.options[0];
        assert.ok(hintedOption);
        const hintedContinuationId = randomUUID();
        await stories.admitResolution({
          ownerId: owner,
          storyId,
          operationId: hintedContinuationId,
          expectedRevision: offered.revision,
          submission: {
            interactionId: offered.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: hintedOption.id },
          },
        });
        const hintedContinuation = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [hintedContinuationId],
        );
        const hintedTask = storytellerTaskSchema.parse(
          hintedContinuation.rows[0]?.input,
        );
        assert.deepEqual(
          hintedTask.context.canonicalKnowledge?.librarySelection
            .requestedHandles,
          [selectableSection.handle],
        );
        assert.deepEqual(
          hintedTask.context.canonicalKnowledge?.librarySelection.loadedHandles,
          [selectableSection.handle],
        );
        assert.deepEqual(
          hintedTask.context.canonicalKnowledge?.documentSelection
            .requestedDocumentIds,
          [
            unloadedCampaignDocument.documentId,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedThreadPath,
            )?.documentId,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedIdentityPath,
            )?.documentId,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedRelationshipPath,
            )?.documentId,
          ],
        );
        const reloadedCampaignEntry =
          hintedTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.documentId === unloadedCampaignDocument.documentId,
          );
        assert.ok(reloadedCampaignEntry?.loaded);
        assert.deepEqual(
          hintedTask.context.canonicalKnowledge?.documentSelection
            .loadedHandles,
          [
            reloadedCampaignEntry.handle,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedThreadPath,
            )?.handle,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedIdentityPath,
            )?.handle,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedRelationshipPath,
            )?.handle,
          ],
        );
        assert.ok(
          hintedTask.context.canonicalKnowledge?.documents.some(
            (document) =>
              document.handle === reloadedCampaignEntry.handle &&
              document.body.length > 0,
          ),
        );
        const promotedThreadEntry =
          hintedTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.path === promotedThreadPath,
          );
        assert.ok(promotedThreadEntry?.loaded);
        promotedThreadDocumentId = promotedThreadEntry.documentId;
        const hintedManifest = await storage.readManifest(
          hintedTask.context.canonicalKnowledge!.rootHash,
        );
        const storedPromotedThread = hintedManifest.entries.find(
          (entry) => entry.documentId === promotedThreadEntry.documentId,
        );
        assert.ok(storedPromotedThread);
        const promotedThread = await storage.readDocument(
          storedPromotedThread.objectHash,
        );
        assert.equal(promotedThread.envelope.sources.length, 1);
        assert.equal(promotedThread.envelope.sources[0]?.revision, 1);
        const originalThreadSourceId =
          promotedThread.envelope.sources[0]!.documentId;
        assert.match(promotedThread.body, /exposed stone road/);
        assert.ok(
          hintedTask.context.canonicalKnowledge?.libraries
            .flatMap((library) => library.selectedSections)
            .some(
              (section) =>
                section.handle === selectableSection.handle &&
                section.body.includes(selectableSection.heading),
            ),
        );

        await runtime.complete(hintedContinuationId);
        const interveningOffer = await stories.read({
          ownerId: owner,
          storyId,
        });
        assert.ok(interveningOffer.current.interaction);
        const interveningOption =
          interveningOffer.current.interaction.specification.options[0];
        assert.ok(interveningOption);
        const interveningContinuationId = randomUUID();
        await stories.admitResolution({
          ownerId: owner,
          storyId,
          operationId: interveningContinuationId,
          expectedRevision: interveningOffer.revision,
          submission: {
            interactionId: interveningOffer.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: interveningOption.id },
          },
        });
        const interveningContinuation = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [interveningContinuationId],
        );
        const interveningTask = storytellerTaskSchema.parse(
          interveningContinuation.rows[0]?.input,
        );
        const unrelatedMarketEntry =
          interveningTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.path === unrelatedMarketPath,
          );
        assert.ok(unrelatedMarketEntry?.loaded);
        const carriedIdentityEntry =
          interveningTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.path === promotedIdentityPath,
          );
        const carriedRelationshipEntry =
          interveningTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.path === promotedRelationshipPath,
          );
        assert.ok(carriedIdentityEntry?.loaded);
        assert.ok(carriedRelationshipEntry?.loaded);
        assert.match(
          interveningTask.context.canonicalKnowledge?.documents.find(
            (document) => document.handle === carriedIdentityEntry.handle,
          )?.body ?? '',
          /Ira Venn is the quay worker/,
        );
        assert.match(
          interveningTask.context.canonicalKnowledge?.documents.find(
            (document) => document.handle === carriedRelationshipEntry.handle,
          )?.body ?? '',
          /source of that advice/,
        );
        assert.deepEqual(
          interveningTask.context.canonicalKnowledge?.documentSelection
            .requestedDocumentIds,
          [unrelatedMarketEntry.documentId],
        );
        assert.ok(
          !interveningTask.context.canonicalKnowledge?.documentSelection.requestedDocumentIds.includes(
            promotedThreadDocumentId,
          ),
        );

        await runtime.complete(interveningContinuationId);
        const correctedOffer = await stories.read({ ownerId: owner, storyId });
        assert.ok(correctedOffer.current.interaction);
        const correctedOption =
          correctedOffer.current.interaction.specification.options[0];
        assert.ok(correctedOption);
        const returnContinuationId = randomUUID();
        await stories.admitResolution({
          ownerId: owner,
          storyId,
          operationId: returnContinuationId,
          expectedRevision: correctedOffer.revision,
          submission: {
            interactionId: correctedOffer.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: correctedOption.id },
          },
        });
        const returnContinuation = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [returnContinuationId],
        );
        const returnTask = storytellerTaskSchema.parse(
          returnContinuation.rows[0]?.input,
        );
        const recalledQuay =
          returnTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.path === 'locations/quay.md',
          );
        assert.ok(recalledQuay?.loaded);
        assert.deepEqual(
          returnTask.context.canonicalKnowledge?.documentSelection
            .requestedDocumentIds,
          [recalledQuay.documentId, promotedThreadDocumentId],
        );
        assert.deepEqual(
          returnTask.context.canonicalKnowledge?.documentSelection.cueResolution
            .requested,
          [
            { documentId: recalledQuay.documentId, reason: 'place' },
            { documentId: promotedThreadDocumentId, reason: 'thread' },
          ],
        );
        const currentThreadEntry =
          returnTask.context.canonicalKnowledge?.catalogue.find(
            (entry) => entry.documentId === promotedThreadDocumentId,
          );
        assert.ok(currentThreadEntry?.loaded);
        const loadedCurrentThread =
          returnTask.context.canonicalKnowledge?.documents.find(
            (document) => document.handle === currentThreadEntry.handle,
          );
        assert.ok(loadedCurrentThread);
        assert.match(loadedCurrentThread.body, /collapsed beneath the surf/);
        assert.doesNotMatch(loadedCurrentThread.body, /exposed stone road/);
        const returnManifest = await storage.readManifest(
          returnTask.context.canonicalKnowledge!.rootHash,
        );
        const storedCurrentThread = returnManifest.entries.find(
          (entry) => entry.documentId === promotedThreadDocumentId,
        );
        assert.equal(storedCurrentThread?.revision, 2);
        assert.ok(storedCurrentThread);
        const currentThread = await storage.readDocument(
          storedCurrentThread.objectHash,
        );
        assert.equal(currentThread.envelope.sources.length, 1);
        assert.equal(currentThread.envelope.sources[0]!.revision, 1);
        assert.notEqual(
          currentThread.envelope.sources[0]!.documentId,
          originalThreadSourceId,
        );
        assert.match(currentThread.body, /cliff stairs/);

        const returnOracle = retrievalOracleCase(
          'greywake.patient-tide-current',
        );
        const returnPaths = new Set(
          returnManifest.entries.map((entry) => entry.path),
        );
        assert.ok(
          [
            ...returnOracle.structuredCues.identityPaths,
            ...returnOracle.structuredCues.placePaths,
            ...returnOracle.structuredCues.threadPaths,
          ].every((path) => returnPaths.has(path)),
        );
        const cueReasons = [
          ...returnOracle.structuredCues.identityPaths.map((path) => ({
            path,
            reason: 'identity' as const,
          })),
          ...returnOracle.structuredCues.placePaths.map((path) => ({
            path,
            reason: 'place' as const,
          })),
          ...returnOracle.structuredCues.threadPaths.map((path) => ({
            path,
            reason: 'thread' as const,
          })),
        ];
        const recall = await resolveCanonicalRecallCues(storage, {
          storyId,
          rootHash: returnTask.context.canonicalKnowledge!.rootHash,
          rootRevision: returnTask.context.canonicalKnowledge!.rootRevision,
          cues: cueReasons.map(({ path, reason }) => ({
            documentId: returnManifest.entries.find(
              (entry) => entry.path === path,
            )!.documentId,
            reason,
          })),
          maxCandidates: returnOracle.budget.maxCandidates,
        });
        assert.ok(
          recall.candidates.some(
            (candidate) =>
              candidate.documentId === promotedThreadDocumentId &&
              candidate.reasons.includes('thread'),
          ),
        );
        assert.deepEqual(recall.trace.unavailable, []);
        const discovery = await searchCanonicalKnowledge(storage, {
          storyId,
          rootHash: returnTask.context.canonicalKnowledge!.rootHash,
          rootRevision: returnTask.context.canonicalKnowledge!.rootRevision,
          query: returnOracle.query,
          maxResults: returnOracle.budget.maxCandidates,
          maxExaminedBytes: returnOracle.budget.maxBytes,
        });
        assert.equal(discovery.coverage.state, 'complete');
        assert.equal(
          discovery.candidates[0]?.unit.documentId,
          promotedThreadDocumentId,
        );
        assert.equal(discovery.candidates[0]?.unit.revision, 2);
        assert.match(
          discovery.candidates[0]?.snippet ?? '',
          /collapsed beneath/,
        );
        assert.ok(
          returnOracle.expectedPaths.every((path) =>
            discovery.candidates.some((result) => result.unit.path === path),
          ),
        );
        assert.ok(
          returnOracle.forbiddenPaths.every((path) =>
            discovery.candidates.every((result) => result.unit.path !== path),
          ),
        );
        const staleDiscovery = await searchCanonicalKnowledge(storage, {
          storyId,
          rootHash: returnTask.context.canonicalKnowledge!.rootHash,
          rootRevision: returnTask.context.canonicalKnowledge!.rootRevision,
          query: 'exposed stone road',
          maxResults: 8,
        });
        assert.ok(
          staleDiscovery.candidates.every(
            (result) => result.unit.documentId !== promotedThreadDocumentId,
          ),
        );
        assert.ok(
          staleDiscovery.candidates.some(
            (result) => result.unit.path === 'possibilities/smugglers.md',
          ),
        );
        const discoveredKnowledge = await loadCanonicalKnowledge(storage, {
          storyId,
          rootHash: returnTask.context.canonicalKnowledge!.rootHash,
          rootRevision: returnTask.context.canonicalKnowledge!.rootRevision,
          recallCues: [
            {
              documentId: discovery.candidates[0]!.unit.documentId,
              reason: 'thread',
            },
          ],
        });
        assert.equal(returnOracle.budget.maxReads, 1);
        assert.deepEqual(
          discoveredKnowledge.documentSelection.requestedDocumentIds,
          [promotedThreadDocumentId],
        );
        assert.deepEqual(
          discoveredKnowledge.documentSelection.cueResolution
            .resolvedDocumentIds,
          [promotedThreadDocumentId],
        );
        const discoveredEntry = discoveredKnowledge.catalogue.find(
          (entry) => entry.documentId === promotedThreadDocumentId,
        );
        assert.ok(discoveredEntry?.loaded);
        const discoveredThread = discoveredKnowledge.documents.find(
          (document) => document.handle === discoveredEntry.handle,
        );
        assert.match(discoveredThread?.body ?? '', /cliff stairs/);
        assert.doesNotMatch(discoveredThread?.body ?? '', /exposed stone road/);

        const minimalRecipe = resolveCreativeExplorationRecipe({
          posture: 'minimal',
        });
        const balancedRecipe = resolveCreativeExplorationRecipe({
          posture: 'balanced',
        });
        const compareRetrieval = (maxResults: number) =>
          searchCanonicalKnowledge(storage, {
            storyId,
            rootHash: returnTask.context.canonicalKnowledge!.rootHash,
            rootRevision: returnTask.context.canonicalKnowledge!.rootRevision,
            query: 'Greywake',
            maxResults,
            maxExaminedBytes: returnOracle.budget.maxBytes,
          });
        const [minimalLocalityEvidence, balancedLocalityEvidence] =
          await Promise.all([
            compareRetrieval(minimalRecipe.limits.maxCandidatesPerQuery),
            compareRetrieval(balancedRecipe.limits.maxCandidatesPerQuery),
          ]);
        assert.ok(
          balancedLocalityEvidence.candidates.length >
            minimalLocalityEvidence.candidates.length,
          'balanced retrieval should expose additional optional evidence at the same root',
        );
        assert.deepEqual(
          balancedLocalityEvidence.candidates
            .slice(0, minimalLocalityEvidence.candidates.length)
            .map((candidate) => ({
              path: candidate.unit.path,
              authority: candidate.unit.authority,
              visibility: candidate.unit.visibility,
            })),
          minimalLocalityEvidence.candidates.map((candidate) => ({
            path: candidate.unit.path,
            authority: candidate.unit.authority,
            visibility: candidate.unit.visibility,
          })),
          'a richer budget may add leads but must not reinterpret shared evidence',
        );
        assert.ok(
          [
            ...minimalLocalityEvidence.candidates,
            ...balancedLocalityEvidence.candidates,
          ].every(
            (candidate) =>
              candidate.unit.path !== 'developer/false-tide-road.md',
          ),
        );

        const accountId = randomUUID();
        const runId = randomUUID();
        const route = 'fake:connected-memory';
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
          maxAttempts: 2,
          enabled: true,
        });
        const execution: ExecutionPolicy = {
          mode: 'provider',
          accountId,
          runId,
          dispatchReview: { mode: 'off' },
          policy: {
            version: 'fake',
            route,
            model: 'fake/model',
            provider: 'fake',
            priceVersion: 'connected-memory-test',
            inputMicrousdPerMillion: '1000',
            outputMicrousdPerMillion: '1000',
            maxInputTokens: 100000,
            maxOutputTokens: 2000,
            timeoutMs: 1000,
          },
        };
        const policy = createTestUsagePolicy(route, [], {
          maxModelRoundsPerOperation: 2,
          maxReadsPerOperation: 1,
          maxRetainedReadBytes: 4096,
        });
        const connectedTask = storytellerTaskSchema.parse({
          ...returnTask,
          execution,
          resources: resourcesForEffectiveUsagePolicy(execution, policy, {
            posture: 'minimal',
          }),
        });
        await database.db.$client.query(
          'UPDATE generation SET input = $2::jsonb WHERE id = $1',
          [returnContinuationId, JSON.stringify(connectedTask)],
        );
        let providerRounds = 0;
        const requestBytes: number[] = [];
        let finalEvidenceItems = 0;
        const connectedRuntime = createStorytellerRuntime(database, {
          realDurationMs: () => 1000,
          documentStore: storage,
          dispatchAuthority: () => policy,
          provider: async (providerTask, dispatch) => {
            providerRounds += 1;
            assert.ok(dispatch);
            requestBytes.push(
              Buffer.byteLength(JSON.stringify(dispatch.request), 'utf8'),
            );
            if (providerRounds === 1) {
              return {
                kind: 'result',
                output: {
                  kind: 'needs_context',
                  version: 1,
                  purpose: 'Recover the current route before narrating return.',
                  requests: [
                    {
                      requestId: 'route',
                      operation: 'ask_memory',
                      intent: 'evidence',
                      question:
                        'What changed after the warning about the patient tide road?',
                    },
                  ],
                },
                usage: fakeUsage(0n),
                telemetry: fakeTelemetry('fake-connected-memory-search'),
              };
            }
            const user = JSON.parse(dispatch.request.messages[1].content) as {
              memoryExploration: {
                evidencePack: {
                  evidence: Array<{ itemId: string; sourceIds: string[] }>;
                  contents: Array<{ text: string }>;
                };
              };
            };
            const packet = user.memoryExploration.evidencePack;
            finalEvidenceItems = packet.evidence.length;
            assert.match(
              packet.contents.map((content) => content.text).join('\n'),
              /collapsed beneath the surf|cliff stairs/i,
            );
            const result = structuredClone(
              scriptedStorytellerResult(providerTask),
            );
            if (!('scene' in result)) {
              throw new Error('Expected connected continuation result');
            }
            result.scene.content.paragraphs = [
              'Remembering the collapsed tide road, you turn toward the cliff stairs instead.',
            ];
            const itemIds = packet.evidence.map((item) => item.itemId);
            const sourceIds = [
              ...new Set(packet.evidence.flatMap((item) => item.sourceIds)),
            ];
            return {
              kind: 'result',
              output: {
                result,
                evidenceUse: { itemIds, sourceIds },
                creativeDirections: {
                  format: 'offscreen.creative-direction-set.v1',
                  directions: [],
                },
              },
              usage: fakeUsage(0n),
              telemetry: fakeTelemetry('fake-connected-memory-final'),
            };
          },
        });
        await connectedRuntime.complete(returnContinuationId);
        assert.equal(providerRounds, 2);
        const connectedReturn = await stories.read({ ownerId: owner, storyId });
        assert.match(
          connectedReturn.current.content.paragraphs.join('\n'),
          /collapsed tide road.*cliff stairs/i,
        );
        const connectedArtifacts = await database.db.$client.query(
          'SELECT state, model_rounds_used, snapshot FROM storyteller_memory_exploration WHERE generation_id = $1',
          [returnContinuationId],
        );
        const connectedArtifact = connectedArtifacts.rows[0];
        assert.equal(connectedArtifact?.state, 'final-ready');
        assert.equal(Number(connectedArtifact?.model_rounds_used), 2);
        assert.equal(
          (connectedArtifact?.snapshot as MemoryExplorationSnapshot).rounds
            .length,
          1,
        );
        assert.equal(requestBytes.length, 2);
        assert.ok(requestBytes.every((bytes) => bytes > 0));
        assert.ok(finalEvidenceItems >= 1);
        const connectedAccounting = await database.db.$client.query(
          'SELECT state, dispatched_rounds, consumed_microusd FROM storyteller_operation WHERE generation_id = $1',
          [returnContinuationId],
        );
        assert.equal(connectedAccounting.rows[0]?.state, 'complete');
        assert.equal(Number(connectedAccounting.rows[0]?.dispatched_rounds), 2);
        assert.equal(
          BigInt(connectedAccounting.rows[0]?.consumed_microusd),
          0n,
        );
      },
    );

    await t.test(
      'contribution consequence captures its pinned rule evidence',
      async () => {
        const fixtureRoot = await mkdtemp(
          join(tmpdir(), 'offscreen-contribution-context-'),
        );
        const storage = new LocalDocumentStore(join(fixtureRoot, 'store'));
        const rules = await importRulePackageDirectory(
          storage,
          resolve('content/rules/srd-5.2.1-subset'),
        );
        const defaultRules = {
          ruleSetId: rules.manifest.ruleSetId,
          rootHash: rules.rootHash,
          revision: rules.manifest.revision,
          engine: rules.manifest.engine,
        };
        const drafts = createDrafts(database);
        const openings = createScriptedOpenings(database);
        const runtime = createStorytellerRuntime(database, {
          realDurationMs: () => 1000,
          documentStore: storage,
        });
        const stories = createStories(database, {
          documentStore: storage,
          defaultRules,
        });
        const draftId = randomUUID();
        await drafts.save(owner, draftId, {
          title: 'Contribution context integration',
          premise: 'A damaged harbor beacon must be restored.',
          storytellingDirection: 'Keep mechanics and narration distinct.',
          storyteller: { id: 'absurd-action-comedy', revision: 1 },
          expectedRevision: 0,
        });
        const candidateId = randomUUID();
        await openings.request(
          owner,
          draftId,
          candidateId,
          1,
          'beacon-watch.v1',
        );
        await runtime.complete(candidateId);
        const storyId = randomUUID();
        const started = await stories.startFromCandidate({
          ownerId: owner,
          storyId,
          candidateId,
          expectedDraftRevision: 1,
          campaign: {
            mechanics: true,
            locked: false,
            pace: { kind: 'instant' },
            time: {
              kind: 'elapsed',
              id: 'beacon-gameSeconds',
              revision: 1,
              unit: {
                id: 'game-second',
                label: 'game-second',
                pluralLabel: 'gameSeconds',
                gameSecondsPerUnit: 1,
              },
              epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
            },
            worldObligations: [],
            worlds: [],
          },
        });
        const offer = started.campaign?.offer;
        assert.ok(offer);
        const repair = offer.nodes.find((node) => node.id === 'restore-beacon');
        assert.ok(repair?.action);
        const selectionId = randomUUID();
        await stories.campaignAction({
          ownerId: owner,
          storyId,
          operationId: selectionId,
          body: {
            expectedRevision: started.revision,
            offerId: offer.id,
            path: [repair.id],
          },
        });
        const running = await stories.read({ ownerId: owner, storyId });
        const activityId = running.campaign?.activity?.id;
        assert.ok(activityId);

        let consequenceGenerationId: string | null = null;
        for (let boundary = 0; boundary < 20; boundary++) {
          await stories.advanceCampaignActivity(activityId);
          const consequence = await database.db.$client.query(
            'SELECT generation_id FROM campaign_consequence WHERE operation_id = $1',
            [activityId],
          );
          if (consequence.rowCount) {
            await stories.prepareCampaignConsequence(activityId);
            const prepared = await database.db.$client.query(
              'SELECT generation_id FROM campaign_consequence WHERE operation_id = $1',
              [activityId],
            );
            consequenceGenerationId = String(prepared.rows[0]?.generation_id);
            break;
          }
        }
        assert.match(consequenceGenerationId ?? '', /^[0-9a-f-]{36}$/);
        const generated = await database.db.$client.query(
          'SELECT input FROM generation WHERE id = $1',
          [consequenceGenerationId],
        );
        const task = storytellerTaskSchema.parse(generated.rows[0]?.input);
        assert.equal(task.task, 'consequence');
        assert.deepEqual(
          task.context.canonicalKnowledge?.librarySelection.requestedTopics,
          ['contribution', 'ability-check'],
        );
        assert.deepEqual(
          task.context.canonicalKnowledge?.librarySelection.unmatchedTopics,
          [],
        );
        const loadedHandles =
          task.context.canonicalKnowledge?.librarySelection.loadedHandles ?? [];
        const selectedSections =
          task.context.canonicalKnowledge?.libraries.flatMap(
            (library) => library.selectedSections,
          ) ?? [];
        assert.ok(loadedHandles.length >= 2);
        assert.deepEqual(
          selectedSections.map((section) => section.handle),
          loadedHandles,
        );
        assert.ok(
          selectedSections.some((section) =>
            /contribution activity/i.test(section.body),
          ),
        );
        const packet = JSON.parse(task.request.messages[1].content) as {
          sceneContext?: {
            canonicalKnowledge?: {
              librarySelection?: { requestedTopics: string[] };
            };
          };
        };
        assert.deepEqual(
          packet.sceneContext?.canonicalKnowledge?.librarySelection
            ?.requestedTopics,
          ['contribution', 'ability-check'],
        );
      },
    );
  },
);
