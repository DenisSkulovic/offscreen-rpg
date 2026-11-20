import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, unlink, writeFile } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { campaign, worldObligation } from '@offscreen/db/campaign-schema';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { gameAuthoritySeamVersion } from '@offscreen/contracts/game-authority';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyPassage, storySceneCheckpoint } from '@offscreen/db/story-schema';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createChamberStorytellerControl } from '@offscreen/application/developer-tools';
import { createDrafts } from '@offscreen/application/drafts';
import { createStoryApplication, StoryError } from '@offscreen/application/stories';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { DocumentStorageError, LocalDocumentStore, S3DocumentStore, importRulePackageDirectory, importStartPackageDirectory } from '@offscreen/documents';
import { createRequire } from 'node:module';
import type { Database } from '@offscreen/db';
import { BOOT03_GA_SERVICE_TOKEN, withBoot03DistributedAppIntegration } from './helpers/boot03-distributed-app-integration.js';

const rulesPackageSource = resolve(
  process.cwd(),
  '../../content/rules/srd-5.2.1-subset',
);

const orm = createRequire(import.meta.url)('drizzle-orm');
const { eq } = orm;

async function assertNoStoryRow(
  database: Database,
  storyId: string,
) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.id, storyId));
  assert.equal(rows.length, 0);
}

const moduleUrl = pathToFileURL(
  process.argv[1] ?? import.meta.url,
).href;

async function prepareImportedOpening(args: {
  database: Database;
  ownerId: string;
  documentRoot: string;
  opening?: 'mechanical' | 'quiescent';
  storage?: LocalDocumentStore | S3DocumentStore;
}) {
  const { database, ownerId, documentRoot } = args;
  const opening = args.opening ?? 'mechanical';
  const storage = args.storage ?? new LocalDocumentStore(documentRoot);
  const rules = await importRulePackageDirectory(storage, rulesPackageSource);
  const defaultRules = {
    ruleSetId: rules.manifest.ruleSetId,
    rootHash: rules.rootHash,
    revision: rules.manifest.revision,
    engine: rules.manifest.engine,
  };
  const source = join(documentRoot, 'abstract-start');
  await mkdir(join(source, 'obligations'), { recursive: true });
  await writeFile(
    join(source, 'START.md'),
    '# Gradient life\n\nThere are no people here, only a living response to chemical gradients.',
  );
  const packageObligationId = opening === 'mechanical' ? randomUUID() : undefined;
  if (packageObligationId) {
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
  }
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
        ...(packageObligationId
          ? [
              {
                path: 'obligations/warming.json',
                kind: 'world-obligation',
                activation: 'executable-obligation',
                authority: 'canon',
                visibility: 'storyteller-private',
                schemaId: 'world-obligation.v1',
              },
            ]
          : []),
      ],
    }),
  );
  const imported = await importStartPackageDirectory(storage, source);
  const drafts = createDrafts(database);
  const draftId = randomUUID();
  await drafts.save(ownerId, draftId, {
    title: 'Abstract start distributed',
    premise: 'A small organism responds to its environment.',
    storytellingDirection: 'Avoid humanoid assumptions.',
    storyteller: { id: 'absurd-action-comedy', revision: 1 },
    expectedRevision: 0,
  });
  const generationId = randomUUID();
  const startReference = {
    startPackageId,
    rootHash: imported.rootHash,
    revision: imported.manifest.revision,
  };
  await createScriptedOpenings(
    database,
    offlineExecution,
    undefined,
    { documentStore: storage },
  ).request(
    ownerId,
    draftId,
    generationId,
    1,
    opening === 'mechanical' ? 'microbe.v3' : undefined,
    startReference,
  );
  const runtime = createStorytellerRuntime(database, {
    documentStore: storage,
    realDurationMs: () => 100,
  });
  await runtime.complete(generationId);
  const campaign: CampaignStart = {
    mechanics: opening === 'mechanical',
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
  return {
    storage,
    draftId,
    generationId,
    campaign,
    packageObligationId,
    defaultRules,
  };
}

const entry = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;
if (entry === moduleUrl) {
  test(
    'BOOT03 imported start through private Game Authority (two-process)',
  { timeout: 300000 },
  async (t) => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-boot03-distributed-'),
    );
    const chamberStorytellerControl = createChamberStorytellerControl();
    await withBoot03DistributedAppIntegration(
      async (context) => {
        await context.restartWorker();
        const prepared = await prepareImportedOpening({
          database: context.database,
          ownerId: context.ownerId,
          documentRoot: context.documentRoot,
        });
        const storyId = randomUUID();
        const headers = {
          cookie: context.cookie,
          origin: context.origin,
          'content-type': 'application/json',
        };
        await t.test(
          'Nest PUT start admits imported Storyteller opening via private GA',
          async () => {
            const started = await fetch(
              `${context.apiOrigin}/api/stories/${storyId}/start`,
              {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                  candidateId: prepared.generationId,
                  expectedDraftRevision: 1,
                  campaign: prepared.campaign,
                }),
              },
            );
            const startedBody = await started.json();
            assert.equal(
              started.status,
              200,
              JSON.stringify(startedBody),
            );
            const snapshot = storySnapshotSchema.parse(startedBody);
            assert.equal(snapshot.id, storyId);
            const [createdStory] = await context.database.db
              .select({
                rootHash: story.documentRootHash,
                rootRevision: story.documentRootRevision,
              })
              .from(story)
              .where(eq(story.id, storyId));
            assert.ok(createdStory?.rootHash);
            assert.equal(createdStory.rootRevision, 2);
            const firstManifest = await prepared.storage.readManifest(
              createdStory.rootHash,
            );
            assert.ok(
              firstManifest.entries.some(
                (entry) => entry.path === 'start/package.md',
              ),
            );
            const obligationsAfterStart = await context.database.db
              .select()
              .from(worldObligation)
              .where(eq(worldObligation.storyId, storyId));
            assert.equal(obligationsAfterStart.length, 1);
            assert.notEqual(
              obligationsAfterStart[0]?.id,
              prepared.packageObligationId,
            );
            const checkpoints = await context.database.db
              .select({ storyId: storySceneCheckpoint.storyId })
              .from(storySceneCheckpoint)
              .where(eq(storySceneCheckpoint.storyId, storyId));
            assert.equal(checkpoints.length, 0);
            const [campaignRow] = await context.database.db
              .select({
                offer: campaign.offer,
                holds: campaign.holds,
              })
              .from(campaign)
              .where(eq(campaign.storyId, storyId));
            assert.ok(campaignRow?.offer);
            assert.ok(
              Array.isArray(campaignRow.holds) && campaignRow.holds.length > 0,
            );

            const retry = await fetch(
              `${context.apiOrigin}/api/stories/${storyId}/start`,
              {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                  candidateId: prepared.generationId,
                  expectedDraftRevision: 1,
                  campaign: prepared.campaign,
                }),
              },
            );
            assert.equal(retry.status, 200);
            assert.deepEqual(await retry.json(), snapshot);
          },
        );
      },
      {
        documentRoot,
        chamberStorytellerControl,
        storytellerRuntime: {
          scriptedGate: chamberStorytellerControl.evaluate,
          documentStore: new LocalDocumentStore(documentRoot),
        },
      },
    );
  },
  );

  test(
    'BOOT03 distributed start fails closed when Game Authority is unavailable',
  { timeout: 180000 },
  async (t) => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-boot03-ga-down-'),
    );
    await withBoot03DistributedAppIntegration(
      async (context) => {
        await context.restartWorker();
        const prepared = await prepareImportedOpening({
          database: context.database,
          ownerId: context.ownerId,
          documentRoot: context.documentRoot,
        });
        const storyId = randomUUID();
        const response = await fetch(
          `${context.apiOrigin}/api/stories/${storyId}/start`,
          {
            method: 'PUT',
            headers: {
              cookie: context.cookie,
              origin: context.origin,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              candidateId: prepared.generationId,
              expectedDraftRevision: 1,
              campaign: prepared.campaign,
            }),
          },
        );
        assert.equal(response.status, 503);
        const rows = await context.database.db
          .select({ id: story.id })
          .from(story)
          .where(eq(story.id, storyId));
        assert.equal(rows.length, 0);
      },
      {
        documentRoot,
        skipGameAuthority: true,
      },
    );
  },
  );

  test(
    'BOOT03 distributed start fails closed with mismatched service token',
  { timeout: 240000 },
  async (t) => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-boot03-wrong-token-'),
    );
    await withBoot03DistributedAppIntegration(
      async (context) => {
        await context.restartWorker();
        const prepared = await prepareImportedOpening({
          database: context.database,
          ownerId: context.ownerId,
          documentRoot: context.documentRoot,
        });
        const storyId = randomUUID();
        const response = await fetch(
          `${context.apiOrigin}/api/stories/${storyId}/start`,
          {
            method: 'PUT',
            headers: {
              cookie: context.cookie,
              origin: context.origin,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              candidateId: prepared.generationId,
              expectedDraftRevision: 1,
              campaign: prepared.campaign,
            }),
          },
        );
        assert.equal(response.status, 503);
        const rows = await context.database.db
          .select({ id: story.id })
          .from(story)
          .where(eq(story.id, storyId));
        assert.equal(rows.length, 0);
      },
      {
        documentRoot,
        nestServiceTokenOverride: 'wrong-token-not-matching-ga-99',
      },
    );
  },
  );

  test(
    'BOOT03 distributed start rejects playable.scripted candidate with startPackage',
  { timeout: 240000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-boot03-playable-start-pkg-'),
    );
    await withBoot03DistributedAppIntegration(
      async (context) => {
        await context.restartWorker();
        const imported = await prepareImportedOpening({
          database: context.database,
          ownerId: context.ownerId,
          documentRoot: context.documentRoot,
        });
        const drafts = createDrafts(context.database);
        const draftId = randomUUID();
        await drafts.save(context.ownerId, draftId, {
          title: 'Playable negative',
          premise: 'A traveller at a locked gate.',
          storytellingDirection: 'Strange but gentle.',
          expectedRevision: 0,
        });
        const candidateId = randomUUID();
        const playableOpenings = createScriptedOpenings(context.database);
        await playableOpenings.request(
          context.ownerId,
          draftId,
          candidateId,
          1,
        );
        await playableOpenings.complete(candidateId);
        const [candidate] = await context.database.db
          .select({ kind: generation.kind })
          .from(generation)
          .where(eq(generation.id, candidateId));
        assert.equal(candidate?.kind, 'opening.playable.scripted.v1');
        const storyId = randomUUID();
        const response = await fetch(
          `${context.apiOrigin}/api/stories/${storyId}/start`,
          {
            method: 'PUT',
            headers: {
              cookie: context.cookie,
              origin: context.origin,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              candidateId,
              expectedDraftRevision: 1,
              campaign: imported.campaign,
            }),
          },
        );
        assert.equal(response.status, 400, await response.text());
        await assertNoStoryRow(context.database, storyId);
      },
      { documentRoot },
    );
  },
  );

  test(
    'BOOT03 distributed start rejects wrong owner and stale draft revision',
  { timeout: 240000 },
  async (t) => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-boot03-start-guards-'),
    );
    await withBoot03DistributedAppIntegration(
      async (context) => {
        await context.restartWorker();
        const prepared = await prepareImportedOpening({
          database: context.database,
          ownerId: context.ownerId,
          documentRoot: context.documentRoot,
        });
        const headers = {
          origin: context.origin,
          'content-type': 'application/json',
        };
        const body = JSON.stringify({
          candidateId: prepared.generationId,
          expectedDraftRevision: 1,
          campaign: prepared.campaign,
        });

        await t.test('foreign owner cannot start with imported candidate', async () => {
          const storyId = randomUUID();
          const response = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: { ...headers, cookie: context.otherCookie },
              body,
            },
          );
          assert.equal(response.status, 404, await response.text());
          await assertNoStoryRow(context.database, storyId);
        });

        await t.test('stale expectedDraftRevision cannot start imported opening', async () => {
          const storyId = randomUUID();
          const response = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: { ...headers, cookie: context.cookie },
              body: JSON.stringify({
                candidateId: prepared.generationId,
                expectedDraftRevision: 2,
                campaign: prepared.campaign,
              }),
            },
          );
          assert.equal(response.status, 409, await response.text());
          await assertNoStoryRow(context.database, storyId);
        });
      },
      { documentRoot },
    );
  },
  );

  test(
    'BOOT03 distributed start leaves no story when the pinned start object is missing',
    { timeout: 240000 },
    async () => {
      const documentRoot = await mkdtemp(
        join(tmpdir(), 'offscreen-boot03-missing-object-'),
      );
      await withBoot03DistributedAppIntegration(
        async (context) => {
          const prepared = await prepareImportedOpening({
            database: context.database,
            ownerId: context.ownerId,
            documentRoot,
          });
          const startRoot = prepared.campaign.startPackage?.rootHash;
          assert.ok(startRoot);
          await unlink(
            join(
              documentRoot,
              'objects',
              'sha256',
              startRoot.slice(0, 2),
              `${startRoot}.json`,
            ),
          );
          const storyId = randomUUID();
          const response = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: {
                cookie: context.cookie,
                origin: context.origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                candidateId: prepared.generationId,
                expectedDraftRevision: 1,
                campaign: prepared.campaign,
              }),
            },
          );
          const responseText = await response.text();
          assert.ok(
            response.status === 400 || response.status === 503,
            responseText,
          );
          await assertNoStoryRow(context.database, storyId);
          const checkpoints = await context.database.db
            .select({ storyId: storySceneCheckpoint.storyId })
            .from(storySceneCheckpoint)
            .where(eq(storySceneCheckpoint.storyId, storyId));
          assert.equal(checkpoints.length, 0);
        },
        { documentRoot },
      );
    },
  );

  test(
    'BOOT03 quiescent imported start keeps one scene-1 checkpoint',
    { timeout: 240000 },
    async () => {
      const documentRoot = await mkdtemp(
        join(tmpdir(), 'offscreen-boot03-quiescent-'),
      );
      await withBoot03DistributedAppIntegration(
        async (context) => {
          const prepared = await prepareImportedOpening({
            database: context.database,
            ownerId: context.ownerId,
            documentRoot: context.documentRoot,
            opening: 'quiescent',
          });
          const storyId = randomUUID();
          const body = {
            candidateId: prepared.generationId,
            expectedDraftRevision: 1,
            campaign: prepared.campaign,
          };
          const started = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: {
                cookie: context.cookie,
                origin: context.origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify(body),
            },
          );
          const startedText = await started.text();
          assert.equal(started.status, 200, startedText);
          const snapshot = storySnapshotSchema.parse(JSON.parse(startedText));
          const [createdStory] = await context.database.db
            .select({ rootHash: story.documentRootHash })
            .from(story)
            .where(eq(story.id, storyId));
          assert.ok(createdStory?.rootHash);
          const obligations = await context.database.db
            .select({ id: worldObligation.id })
            .from(worldObligation)
            .where(eq(worldObligation.storyId, storyId));
          assert.equal(obligations.length, 0);
          const [checkpoint] = await context.database.db
            .select({
              sceneSequence: storySceneCheckpoint.sceneSequence,
              checkpointHash: storySceneCheckpoint.checkpointHash,
              canonRootHash: storySceneCheckpoint.canonRootHash,
            })
            .from(storySceneCheckpoint)
            .where(eq(storySceneCheckpoint.storyId, storyId));
          assert.equal(checkpoint?.sceneSequence, 1);
          assert.equal(checkpoint?.canonRootHash, createdStory.rootHash);
          const stored = await prepared.storage.readSceneCheckpoint(
            checkpoint.checkpointHash,
          );
          assert.equal(stored.canon.rootHash, createdStory.rootHash);
          assert.equal(stored.sceneSequence, 1);
          const retry = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: {
                cookie: context.cookie,
                origin: context.origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify(body),
            },
          );
          assert.equal(retry.status, 200);
          assert.deepEqual(await retry.json(), snapshot);
          const [afterRetry] = await context.database.db
            .select({
              checkpointHash: storySceneCheckpoint.checkpointHash,
            })
            .from(storySceneCheckpoint)
            .where(eq(storySceneCheckpoint.storyId, storyId));
          assert.equal(afterRetry?.checkpointHash, checkpoint.checkpointHash);
          const conflict = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: {
                cookie: context.cookie,
                origin: context.origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                ...body,
                campaign: {
                  ...prepared.campaign,
                  pace: {
                    kind: 'rate',
                    fictionalSeconds: 60,
                    realSeconds: 1,
                  },
                },
              }),
            },
          );
          assert.equal(conflict.status, 409, await conflict.text());
          const [afterConflict] = await context.database.db
            .select({
              checkpointHash: storySceneCheckpoint.checkpointHash,
            })
            .from(storySceneCheckpoint)
            .where(eq(storySceneCheckpoint.storyId, storyId));
          assert.equal(
            afterConflict?.checkpointHash,
            checkpoint.checkpointHash,
          );
        },
        { documentRoot },
      );
    },
  );

  test(
    'BOOT03 eligible start rolls back when the staged checkpoint object fails',
    { timeout: 240000 },
    async (t) => {
      const documentRoot = await mkdtemp(
        join(tmpdir(), 'offscreen-boot03-checkpoint-object-'),
      );
      await withBoot03DistributedAppIntegration(
        async (context) => {
          for (const fault of ['missing', 'corrupt'] as const) {
            await t.test(`checkpoint object ${fault}`, async () => {
              const prepared = await prepareImportedOpening({
                database: context.database,
                ownerId: context.ownerId,
                documentRoot: context.documentRoot,
                opening: 'quiescent',
              });
              assert.ok(prepared.storage instanceof LocalDocumentStore);
              const stories = createStoryApplication(context.database, {
                documentStore: checkpointReadFault(
                  prepared.storage,
                  fault,
                ),
                defaultRules: prepared.defaultRules,
              });
              const storyId = randomUUID();
              await assert.rejects(
                () =>
                  stories.startFromCandidate({
                    ownerId: context.ownerId,
                    storyId,
                    candidateId: prepared.generationId,
                    expectedDraftRevision: 1,
                    campaign: prepared.campaign,
                  }),
                (error: unknown) => {
                  assert.ok(error instanceof StoryError);
                  assert.equal(error.code, 'invalid');
                  assert.equal(
                    error.reason,
                    fault === 'missing'
                      ? 'missing_checkpoint_object'
                      : 'checkpoint_hash_mismatch',
                  );
                  return true;
                },
              );
              await assertNoStoryRow(context.database, storyId);
              const checkpoints = await context.database.db
                .select({ storyId: storySceneCheckpoint.storyId })
                .from(storySceneCheckpoint)
                .where(eq(storySceneCheckpoint.storyId, storyId));
              assert.equal(checkpoints.length, 0);
            });
          }
        },
        { documentRoot },
      );
    },
  );

  test(
    'BOOT03 distributed start rejects a package pinned to other rules',
    { timeout: 240000 },
    async () => {
      const documentRoot = await mkdtemp(
        join(tmpdir(), 'offscreen-boot03-other-rules-'),
      );
      await withBoot03DistributedAppIntegration(
        async (context) => {
          const storage = new LocalDocumentStore(context.documentRoot);
          const rulesCopy = join(documentRoot, 'alt-rules');
          await cp(rulesPackageSource, rulesCopy, { recursive: true });
          await writeFile(
            join(rulesCopy, 'RULES.md'),
            '\nThis sentence is not the authority default.\n',
            { flag: 'a' },
          );
          const alternate = await importRulePackageDirectory(storage, rulesCopy);
          const alternateRules = {
            ruleSetId: alternate.manifest.ruleSetId,
            rootHash: alternate.rootHash,
            revision: alternate.manifest.revision,
            engine: alternate.manifest.engine,
          };
          const source = join(documentRoot, 'other-rules-start');
          await mkdir(source, { recursive: true });
          await writeFile(
            join(source, 'START.md'),
            '# Other rules\n\nThis opening is pinned away from the authority default.',
          );
          const startPackageId = randomUUID();
          await writeFile(
            join(source, 'start-package.json'),
            JSON.stringify({
              format: 'offscreen.start-package-source.v1',
              startPackageId,
              authorOperationId: randomUUID(),
              title: 'Other rules',
              worlds: [],
              rules: alternateRules,
              documents: [
                {
                  path: 'START.md',
                  kind: 'orientation',
                  activation: 'initial-canon',
                  authority: 'canon',
                  visibility: 'player-known',
                },
              ],
            }),
          );
          const imported = await importStartPackageDirectory(storage, source);
          const drafts = createDrafts(context.database);
          const draftId = randomUUID();
          await drafts.save(context.ownerId, draftId, {
            title: 'Disallowed rules',
            premise: 'A quiet room with the wrong rulebook.',
            storytellingDirection: 'Do not invent a second rules engine.',
            storyteller: { id: 'absurd-action-comedy', revision: 1 },
            expectedRevision: 0,
          });
          const generationId = randomUUID();
          await createScriptedOpenings(
            context.database,
            offlineExecution,
            undefined,
            { documentStore: storage },
          ).request(context.ownerId, draftId, generationId, 1, undefined, {
            startPackageId,
            rootHash: imported.rootHash,
            revision: imported.manifest.revision,
          });
          await createStorytellerRuntime(context.database, {
            documentStore: storage,
            realDurationMs: () => 100,
          }).complete(generationId);
          const storyId = randomUUID();
          const response = await fetch(
            `${context.apiOrigin}/api/stories/${storyId}/start`,
            {
              method: 'PUT',
              headers: {
                cookie: context.cookie,
                origin: context.origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                candidateId: generationId,
                expectedDraftRevision: 1,
                campaign: {
                  mechanics: false,
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
                },
              }),
            },
          );
          const responseText = await response.text();
          assert.equal(response.status, 400, responseText);
          await assertNoStoryRow(context.database, storyId);
          const checkpoints = await context.database.db
            .select({ storyId: storySceneCheckpoint.storyId })
            .from(storySceneCheckpoint)
            .where(eq(storySceneCheckpoint.storyId, storyId));
          assert.equal(checkpoints.length, 0);
        },
        { documentRoot },
      );
    },
  );

  test(
    'BOOT03 two Game Authority processes race one quiescent start',
    { timeout: 240000 },
    async () => {
      const documentRoot = await mkdtemp(join(tmpdir(), 'offscreen-boot03-race-'));
      await withBoot03DistributedAppIntegration(
        async (context) => {
          assert.ok(context.peerGameAuthorityOrigin);
          const prepared = await prepareImportedOpening({
            database: context.database,
            ownerId: context.ownerId,
            documentRoot: context.documentRoot,
            opening: 'quiescent',
          });
          const storyId = randomUUID();
          const body = JSON.stringify({
            candidateId: prepared.generationId,
            expectedDraftRevision: 1,
            campaign: prepared.campaign,
          });
          const call = (origin: string) =>
            fetch(`${origin}/internal/v1/stories/${storyId}/start`, {
              method: 'PUT',
              headers: {
                accept: 'application/json',
                authorization: `Bearer ${BOOT03_GA_SERVICE_TOKEN}`,
                'content-type': 'application/json',
                'x-offscreen-actor-id': context.ownerId,
                'x-offscreen-game-authority-version': gameAuthoritySeamVersion,
              },
              body,
            });
          const [first, second] = await Promise.all([
            call(context.gameAuthorityOrigin),
            call(context.peerGameAuthorityOrigin),
          ]);
          const statuses = [first.status, second.status].sort();
          await first.text();
          await second.text();
          assert.ok(
            statuses.every((status) => status === 200 || status === 409),
            statuses.join(','),
          );
          assert.ok(statuses.includes(200), statuses.join(','));
          const stories = await context.database.db
            .select({ id: story.id })
            .from(story)
            .where(eq(story.id, storyId));
          assert.equal(stories.length, 1);
          const passages = await context.database.db
            .select({ sequence: storyPassage.sequence })
            .from(storyPassage)
            .where(eq(storyPassage.storyId, storyId));
          assert.deepEqual(
            passages.map((row) => row.sequence),
            [1],
          );
          const checkpoints = await context.database.db
            .select({
              sceneSequence: storySceneCheckpoint.sceneSequence,
            })
            .from(storySceneCheckpoint)
            .where(eq(storySceneCheckpoint.storyId, storyId));
          assert.equal(checkpoints.length, 1);
          assert.equal(checkpoints[0]?.sceneSequence, 1);
          const obligations = await context.database.db
            .select({ id: worldObligation.id })
            .from(worldObligation)
            .where(eq(worldObligation.storyId, storyId));
          assert.equal(obligations.length, 0);
        },
        { documentRoot, peerGameAuthority: true },
      );
    },
  );

  test(
    'BOOT03 eligible start leaves no story when S3 becomes unreachable',
    { timeout: 240000 },
    async () => {
      const documentRoot = await mkdtemp(join(tmpdir(), 'offscreen-boot03-s3-'));
      const proxy = createServer((client) => {
        const upstream = createConnection({ host: '127.0.0.1', port: 9090 });
        client.pipe(upstream);
        upstream.pipe(client);
        const closeBoth = () => {
          client.destroy();
          upstream.destroy();
        };
        client.once('error', closeBoth);
        upstream.once('error', closeBoth);
      });
      const proxyPort = await listenOnLoopback(proxy);
      const prefix = `boot03-s3-${randomUUID()}`;
      const s3Env = {
        OFFSCREEN_DOCUMENT_STORE: 's3',
        OFFSCREEN_DOCUMENT_S3_BUCKET: 'offscreen-cas',
        OFFSCREEN_DOCUMENT_S3_ENDPOINT: `http://127.0.0.1:${proxyPort}`,
        OFFSCREEN_DOCUMENT_S3_REGION: 'us-east-1',
        OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE: '1',
        OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID: 'offscreen',
        OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY: 'offscreen',
        OFFSCREEN_DOCUMENT_S3_PREFIX: prefix,
      };
      try {
        await withBoot03DistributedAppIntegration(
          async (context) => {
            const storage = new S3DocumentStore({
              bucket: 'offscreen-cas',
              region: 'us-east-1',
              endpoint: 'http://127.0.0.1:9090',
              forcePathStyle: true,
              prefix,
              credentials: {
                accessKeyId: 'offscreen',
                secretAccessKey: 'offscreen',
              },
            });
            const prepared = await prepareImportedOpening({
              database: context.database,
              ownerId: context.ownerId,
              documentRoot: context.documentRoot,
              opening: 'quiescent',
              storage,
            });
            await new Promise<void>((resolve, reject) => {
              proxy.close((error) => (error ? reject(error) : resolve()));
            });
            const storyId = randomUUID();
            const response = await fetch(
              `${context.apiOrigin}/api/stories/${storyId}/start`,
              {
                method: 'PUT',
                headers: {
                  cookie: context.cookie,
                  origin: context.origin,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  candidateId: prepared.generationId,
                  expectedDraftRevision: 1,
                  campaign: prepared.campaign,
                }),
              },
            );
            const responseText = await response.text();
            assert.equal(response.status, 503, responseText);
            await assertNoStoryRow(context.database, storyId);
            const checkpoints = await context.database.db
              .select({ storyId: storySceneCheckpoint.storyId })
              .from(storySceneCheckpoint)
              .where(eq(storySceneCheckpoint.storyId, storyId));
            assert.equal(checkpoints.length, 0);
          },
          { documentRoot, gameAuthorityEnv: s3Env },
        );
      } finally {
        proxy.close();
      }
    },
  );
}

function listenOnLoopback(server: ReturnType<typeof createServer>) {
  return new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('S3 proxy did not bind a port'));
        return;
      }
      resolve(address.port);
    });
  });
}

function checkpointReadFault(
  inner: LocalDocumentStore,
  code: 'missing' | 'corrupt',
): LocalDocumentStore {
  let reads = 0;
  return new Proxy(inner, {
    get(target, property, receiver) {
      if (property === 'readSceneCheckpoint') {
        return async (hash: string) => {
          reads += 1;
          if (reads > 1) throw new DocumentStorageError(code);
          return target.readSceneCheckpoint(hash);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as LocalDocumentStore;
}