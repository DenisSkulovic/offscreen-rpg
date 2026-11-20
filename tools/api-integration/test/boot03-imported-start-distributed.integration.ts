import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { campaign, worldObligation } from '@offscreen/db/campaign-schema';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { generation } from '@offscreen/db/generation-schema';
import { story, storySceneCheckpoint } from '@offscreen/db/story-schema';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createChamberStorytellerControl } from '@offscreen/application/developer-tools';
import { createDrafts } from '@offscreen/application/drafts';
import { createStoryApplication, StoryError } from '@offscreen/application/stories';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { DocumentStorageError, LocalDocumentStore, importRulePackageDirectory, importStartPackageDirectory } from '@offscreen/documents';
import { createRequire } from 'node:module';
import type { Database } from '@offscreen/db';
import { withBoot03DistributedAppIntegration } from './helpers/boot03-distributed-app-integration.js';

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
}) {
  const { database, ownerId, documentRoot } = args;
  const opening = args.opening ?? 'mechanical';
  const storage = new LocalDocumentStore(documentRoot);
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