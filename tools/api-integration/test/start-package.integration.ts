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
  runScriptedMemoryExploration,
  searchCanonicalKnowledge,
  type MemoryExplorationSnapshot,
} from '@offscreen/application/storyteller';
import { generation } from '@offscreen/db/generation-schema';
import {
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
            recipe: {
              version: 'memory-exploration.v1',
              maxModelRounds: 2,
              maxReads: 2,
              maxRetainedReadBytes: 4096,
              tools: 'memory-read.v1',
              automaticEscalation: false,
              finalAnswerReserveRounds: 1,
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
        const createExplorer = (saved?: MemoryExplorationSnapshot) => {
          let snapshot = saved ?? initialSnapshot;
          return {
            execute: async (request: {
              requests: readonly unknown[];
            }) => {
              const round = { request, results: [] };
              snapshot = {
                ...snapshot,
                readsUsed: snapshot.readsUsed + request.requests.length,
                rounds: [...snapshot.rounds, round],
              };
              return round;
            },
            snapshot: () => snapshot,
          };
        };
        let sourceCalls = 0;
        const completed = await runScriptedMemoryExploration(database, {
          generationId,
          task,
          createExplorer,
          source: ({ round }) => {
            sourceCalls += 1;
            return round === 1
              ? {
                  kind: 'needs_context',
                  version: 1,
                  purpose: 'Find the old promise before composing.',
                  requests: [
                    {
                      requestId: 'r1',
                      operation: 'search_memory',
                      query: 'old promise',
                    },
                  ],
                }
              : scriptedStorytellerResult(task);
          },
        });
        assert.equal(completed.replayed, false);
        assert.equal(completed.explorationRounds, 1);
        assert.equal(sourceCalls, 2);

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
        await writeFile(
          join(source, 'START.md'),
          '# Gradient life\n\nThere are no people here, only a living response to chemical gradients.',
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
              due: { kind: 'tick', tick: 12 },
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
        await openings.request(
          owner,
          draftId,
          candidateId,
          1,
          'microbe.v3',
        );
        await runtime.complete(candidateId);
        const storyId = randomUUID();
        const campaign: CampaignStart = {
          mechanics: true,
          locked: false,
          pace: { kind: 'instant' },
          time: {
            kind: 'elapsed',
            id: 'simulation-ticks',
            revision: 1,
            unit: {
              id: 'tick',
              label: 'tick',
              pluralLabel: 'ticks',
              ticksPerUnit: 1,
            },
            epoch: { wholeUnits: 0, tickOfUnit: 0 },
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
            '# Warehouse keeper Sera\n\nSera runs two finite shifts and never staffs the warehouse around the clock.',
          ],
          [
            'locations/quay.md',
            '# Greywake quay\n\nA public landing bordered by customs sheds.',
          ],
          [
            'locations/warehouse.md',
            '# Salt warehouse\n\nA guarded storehouse that closes between shifts.',
          ],
          [
            'threads/work.md',
            '# Work at the warehouse\n\nSera is openly seeking one careful hand for the late shift.',
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
              due: { kind: 'tick', tick: 20 },
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
                ];
                option.createdDocuments = [0];
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
                const quay = storytellerTask.context.canonicalKnowledge?.catalogue.find(
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
          storytellingDirection: 'Keep authored facts and possibilities distinct.',
          storyteller: { id: 'absurd-action-comedy', revision: 1 },
          expectedRevision: 0,
        });
        const candidateId = randomUUID();
        await openings.request(
          owner,
          draftId,
          candidateId,
          1,
        );
        await runtime.complete(candidateId);
        const storyId = randomUUID();
        const campaign: CampaignStart = {
          mechanics: false,
          locked: false,
          pace: { kind: 'instant' },
          time: {
            kind: 'elapsed',
            id: 'harbor-ticks',
            revision: 1,
            unit: {
              id: 'tick',
              label: 'tick',
              pluralLabel: 'ticks',
              ticksPerUnit: 1,
            },
            epoch: { wholeUnits: 0, tickOfUnit: 0 },
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
        const hintedOption = offered.current.interaction.specification.options[0];
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
          ],
        );
        const reloadedCampaignEntry =
          hintedTask.context.canonicalKnowledge?.catalogue.find(
            (entry) =>
              entry.documentId === unloadedCampaignDocument.documentId,
          );
        assert.ok(reloadedCampaignEntry?.loaded);
        assert.deepEqual(
          hintedTask.context.canonicalKnowledge?.documentSelection.loadedHandles,
          [
            reloadedCampaignEntry.handle,
            hintedTask.context.canonicalKnowledge?.catalogue.find(
              (entry) => entry.path === promotedThreadPath,
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
        const interveningOffer = await stories.read({ ownerId: owner, storyId });
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
        assert.deepEqual(
          interveningTask.context.canonicalKnowledge?.documentSelection
            .requestedDocumentIds,
          [unrelatedMarketEntry.documentId],
        );
        assert.ok(
          !interveningTask.context.canonicalKnowledge?.documentSelection
            .requestedDocumentIds.includes(promotedThreadDocumentId),
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
          returnTask.context.canonicalKnowledge?.documentSelection
            .cueResolution.requested,
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
        assert.equal(discovery.candidates[0]?.unit.documentId, promotedThreadDocumentId);
        assert.equal(discovery.candidates[0]?.unit.revision, 2);
        assert.match(discovery.candidates[0]?.snippet ?? '', /collapsed beneath/);
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
        assert.deepEqual(discoveredKnowledge.documentSelection.requestedDocumentIds, [
          promotedThreadDocumentId,
        ]);
        assert.deepEqual(
          discoveredKnowledge.documentSelection.cueResolution.resolvedDocumentIds,
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
              id: 'beacon-ticks',
              revision: 1,
              unit: {
                id: 'tick',
                label: 'tick',
                pluralLabel: 'ticks',
                ticksPerUnit: 1,
              },
              epoch: { wholeUnits: 0, tickOfUnit: 0 },
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
            consequenceGenerationId = String(
              prepared.rows[0]?.generation_id,
            );
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
