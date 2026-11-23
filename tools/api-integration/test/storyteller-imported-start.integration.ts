import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  gameActionReceipt,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { story } from '@offscreen/db/story-schema';
import { createScriptedOpenings } from '@offscreen/story-engine/generations';
import { createStories } from '@offscreen/story-engine/stories';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { requireDefined } from './helpers/require.js';
import {
  importRulePackageDirectory,
  importStartPackageDirectory,
} from '@offscreen/content-packages';
import { LocalDocumentStore } from '@offscreen/documents';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

const rulesPackageSource = resolve(
  process.cwd(),
  '../../content/rules/srd-5.2.1-subset',
);

// Moved unchanged from the profiled Storyteller suite.
export async function checkImportedStart(
  t: TestContext,
  {
    database,
    ownerId,
    drafts,
    stories,
    storyService,
    runtime,
    mechanicalCandidate,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'imported abstract start publishes one root and one obligation across retry',
    async () => {
      const fixtureRoot = await mkdtemp(
        join(tmpdir(), 'offscreen-start-integration-'),
      );
      const storage = new LocalDocumentStore(join(fixtureRoot, 'store'));
      const rules = await importRulePackageDirectory(
        storage,
        rulesPackageSource,
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
      const storiesWithDocuments = createStories(database, {
        documentStore: storage,
        defaultRules,
      });
      const draftId = randomUUID();
      await drafts.save(ownerId, draftId, {
        title: 'Abstract start integration',
        premise: 'A small organism responds to its environment.',
        storytellingDirection: 'Avoid humanoid assumptions.',
        storyteller: { id: 'absurd-action-comedy', revision: 1 },
        expectedRevision: 0,
      });
      const generationId = randomUUID();
      // The Story start requires the admitted opening task to carry the
      // same start-package reference (task.source.startPackage).
      const startReference = {
        startPackageId,
        rootHash: imported.rootHash,
        revision: imported.manifest.revision,
      };
      await createScriptedOpenings(database, offlineExecution, undefined, {
        documentStore: storage,
      }).request(
        ownerId,
        draftId,
        generationId,
        1,
        'microbe.v3',
        startReference,
      );
      await runtime.complete(generationId);
      const storyId = randomUUID();
      const campaign: CampaignStart = {
        mechanics: true,
        locked: false,
        pace: { kind: 'instant' },
        time: {
          kind: 'elapsed',
          id: 'simulation-game-seconds',
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
      await storiesWithDocuments.startFromCandidate({
        ownerId,
        storyId,
        candidateId: generationId,
        expectedDraftRevision: 1,
        campaign,
      });
      const [createdStory] = await database.db
        .select({
          rootHash: story.documentRootHash,
          rootRevision: story.documentRootRevision,
        })
        .from(story)
        .where(eq(story.id, storyId));
      assert.ok(createdStory?.rootHash);
      assert.equal(createdStory.rootRevision, 2);
      const firstRootHash = createdStory.rootHash;
      const firstManifest = await storage.readManifest(firstRootHash);
      assert.ok(
        firstManifest.entries.some(
          (entry) => entry.path === 'start/package.md',
        ),
      );
      assert.ok(
        firstManifest.entries.some(
          (entry) => entry.path === 'start/reference.json',
        ),
      );
      assert.equal(
        firstManifest.entries.some((entry) => entry.kind === 'character'),
        true,
        'the mechanical opening character remains explicit campaign data',
      );
      const obligationsAfterStart = await database.db
        .select()
        .from(worldObligation)
        .where(eq(worldObligation.storyId, storyId));
      assert.equal(obligationsAfterStart.length, 1);
      assert.notEqual(obligationsAfterStart[0]?.id, packageObligationId);
      assert.equal(obligationsAfterStart[0]?.dueGameSecond, 12);

      await storiesWithDocuments.startFromCandidate({
        ownerId,
        storyId,
        candidateId: generationId,
        expectedDraftRevision: 1,
        campaign,
      });
      const [retriedStory] = await database.db
        .select({
          rootHash: story.documentRootHash,
          rootRevision: story.documentRootRevision,
        })
        .from(story)
        .where(eq(story.id, storyId));
      assert.deepEqual(retriedStory, createdStory);
      assert.equal(
        (
          await database.db
            .select()
            .from(worldObligation)
            .where(eq(worldObligation.storyId, storyId))
        ).length,
        1,
      );
    },
  );
  await t.test(
    'mechanical opening and three consequences reshape plans from committed state',
    async () => {
      const started = await mechanicalCandidate();
      let snapshot = started.snapshot;
      assert.equal(snapshot.revision, 1);
      assert.equal(snapshot.campaign?.offer?.nodes[0]?.id, 'take-cover');
      assert.deepEqual(snapshot.campaign?.holds, [
        {
          kind: 'decision',
          offerId: snapshot.campaign?.offer?.id,
          reason: 'player-choice',
        },
      ]);

      const sequence = ['take-cover', 'leave-cover', 'calm-gary'] as const;
      for (let round = 0; round < 3; round++) {
        const campaign = requireDefined(
          snapshot.campaign,
          'Expected a mechanical campaign',
        );
        const offer = requireDefined(
          campaign.offer,
          'Expected a generated mechanical offer',
        );
        const expectedActionId = sequence[round];
        const action = requireDefined(
          offer.nodes.find((node) => node.id === expectedActionId),
          `Expected mechanical action ${expectedActionId}`,
        );
        assert.ok(action.action);
        const operationId = randomUUID();
        await stories.campaignAction({
          ownerId,
          storyId: started.storyId,
          operationId,
          body: {
            expectedRevision: snapshot.revision,
            offerId: offer.id,
            path: [action.id],
          },
        });
        const admitted = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
        assert.equal(admitted.revision, snapshot.revision);
        assert.equal(admitted.campaign?.offer, null);
        assert.equal(
          admitted.campaign?.actionExecution?.operationId,
          operationId,
        );
        assert.equal(admitted.campaign?.actionReceipts.length, round);
        assert.deepEqual(admitted.campaign?.holds, []);

        if (round === 0) {
          await stories.actionExecutionControl({
            ownerId,
            storyId: started.storyId,
            operationId: randomUUID(),
            body: {
              executionId: operationId,
              expectedRevision: 0,
              action: 'pause',
            },
          });
          assert.equal(
            await storyService.advanceCampaignAction(operationId),
            null,
          );
          const paused = await stories.read({
            ownerId,
            storyId: started.storyId,
          });
          assert.equal(paused.campaign?.actionExecution?.state, 'paused');
          assert.equal(paused.campaign?.actionReceipts.length, 0);
          await stories.actionExecutionControl({
            ownerId,
            storyId: started.storyId,
            operationId: randomUUID(),
            body: {
              executionId: operationId,
              expectedRevision: 1,
              action: 'pace',
              pace: { kind: 'instant' },
            },
          });
          await stories.actionExecutionControl({
            ownerId,
            storyId: started.storyId,
            operationId: randomUUID(),
            body: {
              executionId: operationId,
              expectedRevision: 2,
              action: 'resume',
            },
          });
        }

        assert.equal(
          await storyService.advanceCampaignAction(operationId),
          null,
        );
        const committed = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
        assert.equal(committed.campaign?.actionExecution, null);
        assert.equal(committed.campaign?.actionReceipts[0]?.id, operationId);
        // ENG03-narrow: the finite action reserved its narration G at
        // admission (preparationGenerationId); settlement links the
        // receipt to that exact G, so the required-turn hold is already
        // owned by the generation (not a deferred storyteller intent).
        const [receipt] = await database.db
          .select({ generationId: gameActionReceipt.generationId })
          .from(gameActionReceipt)
          .where(eq(gameActionReceipt.operationId, operationId));
        assert.ok(receipt?.generationId);
        assert.equal(
          committed.campaign?.actionReceipts[0]?.state,
          'generating',
        );
        assert.deepEqual(committed.campaign?.holds, [
          {
            kind: 'storyteller',
            generationId: receipt.generationId,
            reason: 'required-turn',
          },
        ]);

        // Idempotent: promotes the provisional capture G off-lock.
        await storyService.prepareCampaignConsequence(operationId);
        const held = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
        assert.deepEqual(held.campaign?.holds, [
          {
            kind: 'storyteller',
            generationId: receipt.generationId,
            reason: 'required-turn',
          },
        ]);
        await runtime.complete(receipt.generationId);
        snapshot = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
        assert.equal(snapshot.revision, round + 2);
        assert.deepEqual(snapshot.campaign?.holds, [
          {
            kind: 'decision',
            offerId: snapshot.campaign?.offer?.id,
            reason: 'player-choice',
          },
        ]);
        assert.equal(snapshot.campaign?.actionReceipts.length, round + 1);
        assert.equal(snapshot.campaign?.actionReceipts[0]?.state, 'published');
        assert.ok(snapshot.campaign?.offer?.nodes.length);
        const offerIds = snapshot.campaign?.offer?.nodes.map((node) => node.id);
        if (round === 0) {
          assert.deepEqual(offerIds, ['inspect-from-cover', 'leave-cover']);
        } else if (round === 1) {
          assert.deepEqual(offerIds, [
            'take-cover',
            'calm-gary',
            'keep-distance',
          ]);
        } else {
          const publishedReceipt = requireDefined(
            snapshot.campaign?.actionReceipts.find(
              (item) => item.id === operationId,
            ),
            'Expected the current operation receipt',
          );
          if (publishedReceipt.outcome === 'success') {
            assert.deepEqual(offerIds, ['inspect-with-gary']);
          } else if (publishedReceipt.outcome === 'failure') {
            assert.deepEqual(offerIds, ['take-cover', 'observe-from-doorway']);
          } else {
            assert.fail(
              `Unexpected calm-gary outcome ${publishedReceipt.outcome}`,
            );
          }
        }
      }
    },
  );
  await t.test(
    'microbe completes three mechanical turns through the shared finite-action path',
    async () => {
      const started = await mechanicalCandidate('microbe.v3', {
        kind: 'instant',
      });
      let snapshot = started.snapshot;
      const microbePlans = new Set([
        'follow-gradient',
        'contract',
        'remain-sheltered',
        'follow-gradient-again',
        'contract-again',
        // Plans added to microbe.v3 after this suite was written.
        'wait-contracted',
        'sample-gradient-cycle',
        'hold-temperature-cycle',
        'hold-pressure-cycle',
      ]);

      for (let round = 0; round < 3; round++) {
        const offer = requireDefined(
          snapshot.campaign?.offer,
          'Expected a microbe decision offer',
        );
        assert.ok(offer.nodes.length > 0);
        assert.equal(
          offer.nodes.every((node) => microbePlans.has(node.id)),
          true,
        );
        const selected = requireDefined(
          offer.nodes.find((node) => node.action),
          'Expected an admitted finite microbe action',
        );
        const operationId = randomUUID();
        const tickBefore = requireDefined(
          snapshot.campaign?.gameSecond,
          'Expected a microbe campaign gameSecond',
        );

        await stories.campaignAction({
          ownerId,
          storyId: started.storyId,
          operationId,
          body: {
            expectedRevision: snapshot.revision,
            offerId: offer.id,
            path: [selected.id],
          },
        });
        assert.equal(
          await storyService.advanceCampaignAction(operationId),
          null,
        );
        const committed = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
        assert.equal(committed.campaign?.gameSecond, tickBefore + 5);
        assert.equal(committed.campaign?.actionReceipts.length, round + 1);
        const [receipt] = await database.db
          .select({ generationId: gameActionReceipt.generationId })
          .from(gameActionReceipt)
          .where(eq(gameActionReceipt.operationId, operationId));
        assert.ok(receipt?.generationId);
        // ENG03-narrow: the admission-time narration G already owns the hold.
        assert.deepEqual(committed.campaign?.holds, [
          {
            kind: 'storyteller',
            generationId: receipt.generationId,
            reason: 'required-turn',
          },
        ]);

        await storyService.prepareCampaignConsequence(operationId);
        await runtime.complete(receipt.generationId);
        snapshot = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
        assert.equal(snapshot.revision, round + 2);
        assert.equal(snapshot.campaign?.actionReceipts.length, round + 1);
        assert.equal(snapshot.campaign?.actionReceipts[0]?.state, 'published');
        assert.deepEqual(snapshot.campaign?.holds, [
          {
            kind: 'decision',
            offerId: snapshot.campaign?.offer?.id,
            reason: 'player-choice',
          },
        ]);
      }
    },
  );
}

registerProfiledStoryteller(
  import.meta.url,
  'imported start and mechanical opening',
  checkImportedStart,
);
