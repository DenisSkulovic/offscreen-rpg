/**
 * FORK01-T03: public Nest fork through StorySeam and private Game Authority (two-process).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { createChamberStorytellerControl } from '@offscreen/application/developer-tools';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createStoryApplication } from '@offscreen/application/stories';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { story, storySceneCheckpoint } from '@offscreen/db/story-schema';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { LocalDocumentStore } from '@offscreen/documents';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import {
  withBoot03DistributedAppIntegration,
} from './helpers/boot03-distributed-app-integration.js';
import { requireDefined } from './helpers/require.js';
import type { RulePackageReference } from '@offscreen/documents';
import {
  provisionTurn03DistributedPocFixture,
  turn03DistributedPocAuthorship,
  type Turn03DistributedPocRoots,
} from './helpers/turn03-distributed-poc-fixture.js';

const orm = createRequire(import.meta.url)('drizzle-orm');
const { eq } = orm;

const moduleUrl = pathToFileURL(process.argv[1] ?? import.meta.url).href;

function campaignForPins(roots: Turn03DistributedPocRoots): CampaignStart {
  return {
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
    startPackage: roots.start,
  };
}

type HarborParent = Readonly<{
  storyId: string;
  generationId: string;
  roots: Turn03DistributedPocRoots;
  defaultRules: RulePackageReference;
  passageId: string;
  checkpointHash: string;
  interactionId: string;
  visibleOptionId: string;
}>;

type Boot03Context = Parameters<
  Parameters<typeof withBoot03DistributedAppIntegration>[0]
>[0];

async function prepareHarborParentAtScene2(
  ctx: Boot03Context,
  documentStore: LocalDocumentStore,
  options: { httpStart: boolean },
): Promise<HarborParent> {
  const fixture = await provisionTurn03DistributedPocFixture(documentStore);
  const drafts = createDrafts(ctx.database);
  const draftId = randomUUID();
  await drafts.save(ctx.ownerId, draftId, {
    ...turn03DistributedPocAuthorship.draft,
    expectedRevision: 0,
  });
  const generationId = randomUUID();
  const openings = createScriptedOpenings(
    ctx.database,
    offlineExecution,
    undefined,
    { documentStore },
  );
  await openings.request(
    ctx.ownerId,
    draftId,
    generationId,
    1,
    undefined,
    fixture.roots.start,
  );
  const storytellerControl = createChamberStorytellerControl();
  const openingRuntime = createStorytellerRuntime(ctx.database, {
    scriptedGate: storytellerControl.evaluate,
    documentStore,
  });
  await openingRuntime.complete(generationId);

  const storyId = randomUUID();
  const stories = createStoryApplication(ctx.database, {
    documentStore,
    defaultRules: fixture.defaultRules,
  });
  let scene1;
  if (options.httpStart) {
    const started = await fetch(`${ctx.apiOrigin}/api/stories/${storyId}/start`, {
      method: 'PUT',
      headers: {
        cookie: ctx.cookie,
        origin: ctx.apiOrigin,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        candidateId: generationId,
        expectedDraftRevision: 1,
        campaign: campaignForPins(fixture.roots),
      }),
    });
    const startedText = await started.text();
    assert.equal(started.status, 200, startedText);
    scene1 = storySnapshotSchema.parse(JSON.parse(startedText));
  } else {
    scene1 = await stories.startFromCandidate({
      ownerId: ctx.ownerId,
      storyId,
      candidateId: generationId,
      expectedDraftRevision: 1,
      campaign: campaignForPins(fixture.roots),
    });
  }
  assert.equal(scene1.revision, 1);
  assert.equal(
    scene1.current.content.title,
    turn03DistributedPocAuthorship.scene1.title,
  );
  const interaction = requireDefined(
    scene1.current.interaction,
    'Expected scene1 interaction',
  );
  const visible = requireDefined(
    interaction.specification.options.find(
      (option) =>
        option.id === turn03DistributedPocAuthorship.scene1.visibleChoice.id,
    ),
    'Expected visible choice',
  );
  const [checkpoint] = await ctx.database.db
    .select({
      passageId: storySceneCheckpoint.passageId,
      checkpointHash: storySceneCheckpoint.checkpointHash,
    })
    .from(storySceneCheckpoint)
    .where(eq(storySceneCheckpoint.storyId, storyId));
  assert.ok(checkpoint?.passageId);
  assert.ok(checkpoint?.checkpointHash);

  const operationId = randomUUID();
  await stories.admitResolution({
    ownerId: ctx.ownerId,
    storyId,
    operationId,
    body: {
      expectedRevision: scene1.revision,
      submission: {
        interactionId: interaction.id,
        answer: { kind: 'choice.v1', optionId: visible.id },
      },
    },
  });
  const continuationRuntime = createStorytellerRuntime(ctx.database, {
    scriptedGate: storytellerControl.evaluate,
    documentStore,
    realDurationMs: () => 100,
  });
  await continuationRuntime.complete(operationId);
  const parent = await stories.read({ ownerId: ctx.ownerId, storyId });
  assert.equal(parent.revision, 2);
  assert.equal(
    parent.current.content.title,
    turn03DistributedPocAuthorship.scene2.title,
  );

  return {
    storyId,
    generationId,
    roots: fixture.roots,
    defaultRules: fixture.defaultRules,
    passageId: checkpoint.passageId,
    checkpointHash: checkpoint.checkpointHash,
    interactionId: interaction.id,
    visibleOptionId: visible.id,
  };
}

async function countForkChildren(
  database: Parameters<typeof createStoryApplication>[0],
  parentStoryId: string,
) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.forkedFromStoryId, parentStoryId));
  return rows.length;
}

async function httpFork(
  apiOrigin: string,
  cookie: string,
  sourceStoryId: string,
  forkStoryId: string,
  body: Record<string, unknown>,
) {
  return fetch(`${apiOrigin}/api/stories/${sourceStoryId}/forks/${forkStoryId}`, {
    method: 'PUT',
    headers: {
      cookie,
      origin: apiOrigin,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === moduleUrl) {
  test(
    'FORK01 private GA historical fork through Nest StorySeam (two-process HTTP)',
    { timeout: 300_000 },
    async (t) => {
      const chamberStorytellerControl = createChamberStorytellerControl();
      const documentRoot = await mkdtemp(
        join(tmpdir(), 'offscreen-fork01-distributed-'),
      );

      await withBoot03DistributedAppIntegration(
        async (ctx) => {
          await ctx.restartWorker();
          const documentStore = new LocalDocumentStore(ctx.documentRoot);
          const parent = await prepareHarborParentAtScene2(ctx, documentStore, {
            httpStart: true,
          });
          const forkBody = {
            expectedRevision: 1,
            sourcePassageId: parent.passageId,
            sourceCheckpointHash: parent.checkpointHash,
          };
          const childId = randomUUID();

          await t.test(
            'HTTP Nest PUT fork reaches private GA and forks scene1 checkpoint',
            async () => {
              assert.equal(
                await countForkChildren(ctx.database, parent.storyId),
                0,
              );
              const response = await httpFork(
                ctx.apiOrigin,
                ctx.cookie,
                parent.storyId,
                childId,
                forkBody,
              );
              const text = await response.text();
              assert.equal(response.status, 200, text);
              const child = storySnapshotSchema.parse(JSON.parse(text));
              assert.equal(child.id, childId);
              assert.equal(
                child.current.content.title,
                turn03DistributedPocAuthorship.scene1.title,
              );
              assert.notEqual(
                child.current.content.title,
                turn03DistributedPocAuthorship.scene2.title,
              );
              const parentAfter = await fetch(
                `${ctx.apiOrigin}/api/stories/${parent.storyId}`,
                { headers: { cookie: ctx.cookie } },
              );
              assert.equal(parentAfter.status, 200);
              const parentSnapshot = storySnapshotSchema.parse(
                await parentAfter.json(),
              );
              assert.equal(parentSnapshot.revision, 2);
              assert.equal(
                await countForkChildren(ctx.database, parent.storyId),
                1,
              );

              const retry = await httpFork(
                ctx.apiOrigin,
                ctx.cookie,
                parent.storyId,
                childId,
                forkBody,
              );
              assert.equal(retry.status, 200, await retry.text());
              assert.equal(
                await countForkChildren(ctx.database, parent.storyId),
                1,
              );
            },
          );

          await t.test(
            'HTTP Nest PUT fork rejects foreign owner without a child row',
            async () => {
              const before = await countForkChildren(ctx.database, parent.storyId);
              const foreignChildId = randomUUID();
              const foreign = await httpFork(
                ctx.apiOrigin,
                ctx.otherCookie,
                parent.storyId,
                foreignChildId,
                forkBody,
              );
              assert.equal(foreign.status, 404, await foreign.text());
              assert.equal(
                await countForkChildren(ctx.database, parent.storyId),
                before,
              );
            },
          );

          await t.test(
            'HTTP Nest PUT fork rejects checkpoint hash mismatch without a child row',
            async () => {
              const before = await countForkChildren(ctx.database, parent.storyId);
              const mismatchChild = randomUUID();
              const mismatch = await httpFork(
                ctx.apiOrigin,
                ctx.cookie,
                parent.storyId,
                mismatchChild,
                {
                  ...forkBody,
                  sourceCheckpointHash: `${'d'.repeat(64)}`,
                },
              );
              const body = (await mismatch.json()) as {
                code?: string;
                reason?: string;
              };
              assert.equal(mismatch.status, 400);
              assert.equal(body.code, 'invalid');
              assert.equal(body.reason, 'checkpoint_hash_mismatch');
              assert.equal(
                await countForkChildren(ctx.database, parent.storyId),
                before,
              );
            },
          );

          await t.test(
            'HTTP Nest PUT fork rejects duplicate destination id with conflict',
            async () => {
              const conflict = await httpFork(
                ctx.apiOrigin,
                ctx.cookie,
                parent.storyId,
                childId,
                { expectedRevision: 2 },
              );
              const body = (await conflict.json()) as {
                code?: string;
                reason?: string;
              };
              assert.equal(conflict.status, 409);
              assert.equal(body.code, 'conflict');
              assert.equal(body.reason, 'fork_destination_in_use');
              assert.equal(
                await countForkChildren(ctx.database, parent.storyId),
                1,
              );
            },
          );
        },
        {
          documentRoot,
          chamberStorytellerControl,
          storytellerRuntime: {
            scriptedGate: chamberStorytellerControl.evaluate,
            realDurationMs: () => 100,
          },
        },
      );

      await t.test(
        'HTTP Nest PUT fork fails closed when Game Authority is down',
        async () => {
          const soloDocumentRoot = await mkdtemp(
            join(tmpdir(), 'offscreen-fork01-ga-down-'),
          );
          await withBoot03DistributedAppIntegration(
            async (ctx) => {
              await ctx.restartWorker();
              const documentStore = new LocalDocumentStore(ctx.documentRoot);
              const parent = await prepareHarborParentAtScene2(ctx, documentStore, {
                httpStart: false,
              });
              const childId = randomUUID();
              const response = await httpFork(
                ctx.apiOrigin,
                ctx.cookie,
                parent.storyId,
                childId,
                {
                  expectedRevision: 1,
                  sourcePassageId: parent.passageId,
                  sourceCheckpointHash: parent.checkpointHash,
                },
              );
              const body = (await response.json()) as { code?: string };
              assert.equal(response.status, 503);
              assert.equal(body.code, 'unavailable');
              assert.equal(await countForkChildren(ctx.database, parent.storyId), 0);
            },
            {
              documentRoot: soloDocumentRoot,
              skipGameAuthority: true,
              chamberStorytellerControl,
              storytellerRuntime: {
                scriptedGate: chamberStorytellerControl.evaluate,
                realDurationMs: () => 100,
              },
            },
          );
        },
      );

      await t.test(
        'HTTP Nest PUT fork fails closed when Nest bearer token is rejected',
        async () => {
          const soloDocumentRoot = await mkdtemp(
            join(tmpdir(), 'offscreen-fork01-bad-token-'),
          );
          await withBoot03DistributedAppIntegration(
            async (ctx) => {
              await ctx.restartWorker();
              const documentStore = new LocalDocumentStore(ctx.documentRoot);
              const parent = await prepareHarborParentAtScene2(ctx, documentStore, {
                httpStart: false,
              });
              const childId = randomUUID();
              const response = await httpFork(
                ctx.apiOrigin,
                ctx.cookie,
                parent.storyId,
                childId,
                {
                  expectedRevision: 1,
                  sourcePassageId: parent.passageId,
                  sourceCheckpointHash: parent.checkpointHash,
                },
              );
              const body = (await response.json()) as { code?: string };
              assert.ok(response.status === 401 || response.status === 503);
              assert.equal(body.code, 'unavailable');
              assert.equal(await countForkChildren(ctx.database, parent.storyId), 0);
            },
            {
              documentRoot: soloDocumentRoot,
              nestServiceTokenOverride: 'wrong-token-not-matching-ga-99',
              chamberStorytellerControl,
              storytellerRuntime: {
                scriptedGate: chamberStorytellerControl.evaluate,
                realDurationMs: () => 100,
              },
            },
          );
        },
      );
    },
  );
}