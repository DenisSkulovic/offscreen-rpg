/**
 * STORY03-T09: first causal local multi-process Turn03 story (local filesystem store tier).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import {
  latestOpeningSchema,
  openingPreviewSchema,
} from '@offscreen/contracts/openings';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { createChamberStorytellerControl } from '@offscreen/application/developer-tools';
import { outbox } from '@offscreen/db/outbox-schema';
import { worldObligation } from '@offscreen/db/campaign-schema';
import { story, storyPassage, storySceneCheckpoint } from '@offscreen/db/story-schema';
import {
  storytellerAttempt,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import { storytellerDistributedTopic } from '@offscreen/application/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with { 'resolution-mode': 'require' };
import {
  provisionTurn03DistributedPocFixture,
  turn03DistributedPocAuthorship,
  type Turn03DistributedPocRoots,
} from './helpers/turn03-distributed-poc-fixture.js';
import {
  STORY03_CAUSAL_GA_EXECUTOR_TOKEN,
  withStory03CausalMultiprocessHarness,
  type Story03CausalMultiprocessContext,
} from './helpers/story03-causal-multiprocess-harness.js';
import {
  storytellerTaskCustodyReadSavedPath,
  storytellerTaskCustodyReadSavedResponseSchema,
} from '@offscreen/contracts/storyteller-task-custody';
import { requireDefined } from './helpers/require.js';

const orm: typeof Drizzle = createRequire(import.meta.url)('drizzle-orm');
const { eq, and, asc } = orm;

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

async function waitForSucceededOpening(
  apiOrigin: string,
  cookie: string,
  draftId: string,
  deadlineMs: number,
) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    const response = await fetch(
      `${apiOrigin}/api/drafts/${draftId}/openings/latest`,
      { headers: { cookie } },
    );
    assert.equal(response.status, 200);
    const preview = latestOpeningSchema.parse(await response.json()).preview;
    if (preview?.state === 'succeeded' && preview.candidate) {
      return preview;
    }
    await delay(100);
  }
  throw new Error('Opening preview did not reach succeeded within deadline');
}

async function waitForStoryRevision(
  apiOrigin: string,
  cookie: string,
  storyId: string,
  revision: number,
  deadlineMs: number,
) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    const response = await fetch(`${apiOrigin}/api/stories/${storyId}`, {
      headers: { cookie },
    });
    assert.equal(response.status, 200);
    const snapshot = storySnapshotSchema.parse(await response.json());
    if (snapshot.revision === revision) {
      return snapshot;
    }
    await delay(200);
  }
  throw new Error(
    `Story ${storyId} did not reach revision ${revision} within deadline`,
  );
}

type Turn03HttpGolden = {
  draftId: string;
  generationId: string;
  storyId: string;
  operationId: string;
  interactionId: string;
  roots: Turn03DistributedPocRoots;
};

async function admitTurn03OpeningAndScene1(
  ctx: Story03CausalMultiprocessContext,
  roots: Turn03DistributedPocRoots,
): Promise<
  Omit<Turn03HttpGolden, 'operationId'> & {
    visibleOptionId: string;
  }
> {
  const draftId = randomUUID();
  const generationId = randomUUID();
  const storyId = randomUUID();
  const headers = {
    cookie: ctx.cookie,
    origin: ctx.apiOrigin,
    'content-type': 'application/json',
  };

  const saveDraft = await fetch(`${ctx.apiOrigin}/api/drafts/${draftId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      ...turn03DistributedPocAuthorship.draft,
      expectedRevision: 0,
    }),
  });
  const saveDraftText = await saveDraft.text();
  assert.equal(saveDraft.status, 200, saveDraftText);

  const requestOpening = await fetch(
    `${ctx.apiOrigin}/api/drafts/${draftId}/openings/${generationId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        expectedRevision: 1,
        startPackage: roots.start,
      }),
    },
  );
  const requestOpeningText = await requestOpening.text();
  assert.equal(requestOpening.status, 202, requestOpeningText);
  if (requestOpeningText.length > 0) {
    openingPreviewSchema.parse(JSON.parse(requestOpeningText));
  }

  const openingPreview = await waitForSucceededOpening(
    ctx.apiOrigin,
    ctx.cookie,
    draftId,
    30_000,
  );
  assert.equal(openingPreview.id, generationId);

  const campaign = campaignForPins(roots);
  const start = await fetch(`${ctx.apiOrigin}/api/stories/${storyId}/start`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      candidateId: generationId,
      expectedDraftRevision: 1,
      campaign,
    }),
  });
  const startBodyText = await start.text();
  assert.equal(start.status, 200, startBodyText);
  const scene1 = storySnapshotSchema.parse(JSON.parse(startBodyText));
  assert.equal(scene1.revision, 1);
  assert.equal(
    scene1.current.content.title,
    turn03DistributedPocAuthorship.scene1.title,
  );
  const obligations = await ctx.database.db
    .select({ id: worldObligation.id })
    .from(worldObligation)
    .where(eq(worldObligation.storyId, storyId));
  assert.equal(obligations.length, 0);
  const [checkpoint] = await ctx.database.db
    .select({
      sceneSequence: storySceneCheckpoint.sceneSequence,
      checkpointHash: storySceneCheckpoint.checkpointHash,
      canonRootHash: storySceneCheckpoint.canonRootHash,
      passageId: storySceneCheckpoint.passageId,
    })
    .from(storySceneCheckpoint)
    .where(eq(storySceneCheckpoint.storyId, storyId));
  const [createdStory] = await ctx.database.db
    .select({ rootHash: story.documentRootHash })
    .from(story)
    .where(eq(story.id, storyId));
  assert.equal(checkpoint?.sceneSequence, 1);
  assert.equal(checkpoint?.canonRootHash, createdStory?.rootHash);
  assert.equal(checkpoint?.passageId, scene1.current.id);
  const stored = await new LocalDocumentStore(ctx.documentRoot).readSceneCheckpoint(
    checkpoint.checkpointHash,
  );
  assert.equal(stored.canon.rootHash, createdStory?.rootHash);
  assert.equal(stored.passageId, scene1.current.id);
  const interaction = requireDefined(
    scene1.current.interaction,
    'Expected scene1 interaction',
  );
  const visible = requireDefined(
    interaction.specification.options.find(
      (option) =>
        option.id === turn03DistributedPocAuthorship.scene1.visibleChoice.id,
    ),
    'Expected ask choice',
  );
  assert.equal(
    visible.label,
    turn03DistributedPocAuthorship.scene1.visibleChoice.label,
  );

  return {
    draftId,
    generationId,
    storyId,
    interactionId: interaction.id,
    visibleOptionId: visible.id,
    roots,
  };
}

async function submitTurn03Resolution(
  ctx: Story03CausalMultiprocessContext,
  args: {
    storyId: string;
    operationId: string;
    expectedRevision: number;
    interactionId: string;
    optionId: string;
  },
) {
  const resolution = await fetch(
    `${ctx.apiOrigin}/api/stories/${args.storyId}/resolutions/${args.operationId}`,
    {
      method: 'PUT',
      headers: {
        cookie: ctx.cookie,
        origin: ctx.apiOrigin,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        expectedRevision: args.expectedRevision,
        submission: {
          interactionId: args.interactionId,
          answer: { kind: 'choice.v1', optionId: args.optionId },
        },
      }),
    },
  );
  assert.equal(resolution.status, 202, await resolution.text());
}

async function admitTurn03ViaHttp(
  ctx: Story03CausalMultiprocessContext,
  roots: Turn03DistributedPocRoots,
): Promise<Turn03HttpGolden> {
  const scene1 = await admitTurn03OpeningAndScene1(ctx, roots);
  const operationId = randomUUID();
  await submitTurn03Resolution(ctx, {
    storyId: scene1.storyId,
    operationId,
    expectedRevision: 1,
    interactionId: scene1.interactionId,
    optionId: scene1.visibleOptionId,
  });
  return { ...scene1, operationId };
}

async function assertContinuationSql(
  ctx: Story03CausalMultiprocessContext,
  operationId: string,
  storyId: string,
) {
  const notices = await ctx.database.db
    .select({ topic: outbox.topic })
    .from(outbox)
    .where(
      and(
        eq(outbox.operationId, operationId),
        eq(outbox.topic, storytellerDistributedTopic),
      ),
    );
  assert.equal(
    notices.length,
    1,
    `expected one ${storytellerDistributedTopic} outbox row`,
  );

  const attempts = await ctx.database.db
    .select({ id: storytellerAttempt.id })
    .from(storytellerAttempt)
    .where(eq(storytellerAttempt.generationId, operationId));
  assert.equal(attempts.length, 1);

  const [publication] = await ctx.database.db
    .select({ state: storytellerPublication.state })
    .from(storytellerPublication)
    .where(eq(storytellerPublication.generationId, operationId));
  assert.equal(publication?.state, 'published');

  const passages = await ctx.database.db
    .select({ sequence: storyPassage.sequence })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId))
    .orderBy(asc(storyPassage.sequence));
  assert.deepEqual(
    passages.map((row) => row.sequence),
    [1, 2],
  );
}

async function waitForSavedContinuationWhileRevisionOne(
  ctx: Story03CausalMultiprocessContext,
  operationId: string,
  storyId: string,
  deadlineMs: number,
) {
  const path = storytellerTaskCustodyReadSavedPath(operationId);
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    const saved = await fetch(`${ctx.gameAuthorityOrigin}${path}`, {
      headers: {
        authorization: `Bearer ${STORY03_CAUSAL_GA_EXECUTOR_TOKEN}`,
      },
    });
    if (saved.status === 200) {
      const body = storytellerTaskCustodyReadSavedResponseSchema.parse(
        await saved.json(),
      );
      if (body.status === 'saved') {
        const response = await fetch(`${ctx.apiOrigin}/api/stories/${storyId}`, {
          headers: { cookie: ctx.cookie },
        });
        const revision = storySnapshotSchema.parse(await response.json()).revision;
        if (revision === 1) {
          return body;
        }
      }
    }
    await delay(100);
  }
  throw new Error(
    `Continuation ${operationId} did not reach saved while story revision 1`,
  );
}

async function passageIdsForStory(
  ctx: Story03CausalMultiprocessContext,
  storyId: string,
) {
  const rows = await ctx.database.db
    .select({ id: storyPassage.id, sequence: storyPassage.sequence })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId))
    .orderBy(asc(storyPassage.sequence));
  return rows;
}

const chamberStorytellerControl = createChamberStorytellerControl();

test(
  'STORY03 T09 causal multiprocess Turn03 golden path (local filesystem documents)',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t09-causal-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const golden = await admitTurn03ViaHttp(ctx, fixture.roots);
        const scene2 = await waitForStoryRevision(
          ctx.apiOrigin,
          ctx.cookie,
          golden.storyId,
          2,
          45_000,
        );
        assert.equal(
          scene2.current.content.title,
          turn03DistributedPocAuthorship.scene2.title,
        );

        await assertContinuationSql(ctx, golden.operationId, golden.storyId);

        const [openingNotice] = await ctx.database.db
          .select({ topic: outbox.topic })
          .from(outbox)
          .where(eq(outbox.operationId, golden.generationId));
        assert.equal(openingNotice?.topic, storytellerDistributedTopic);

        const beforeIds = await passageIdsForStory(ctx, golden.storyId);
        await ctx.restartDistributedWorkers();
        const afterRead = await fetch(
          `${ctx.apiOrigin}/api/stories/${golden.storyId}`,
          { headers: { cookie: ctx.cookie } },
        );
        const afterReadText = await afterRead.text();
        assert.equal(afterRead.status, 200, afterReadText);
        const afterSnapshot = storySnapshotSchema.parse(JSON.parse(afterReadText));
        assert.equal(
          afterSnapshot.current.content.title,
          turn03DistributedPocAuthorship.scene2.title,
        );
        const afterIds = await passageIdsForStory(ctx, golden.storyId);
        assert.deepEqual(afterIds, beforeIds);
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
      },
    );
  },
);

test(
  'STORY03 T09 wrong actor cannot start or resolve',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t09-wrong-actor-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const draftId = randomUUID();
        const generationId = randomUUID();
        const headers = {
          origin: ctx.apiOrigin,
          'content-type': 'application/json',
        };
        await fetch(`${ctx.apiOrigin}/api/drafts/${draftId}`, {
          method: 'PUT',
          headers: { ...headers, cookie: ctx.cookie },
          body: JSON.stringify({
            ...turn03DistributedPocAuthorship.draft,
            expectedRevision: 0,
          }),
        });
        await fetch(
          `${ctx.apiOrigin}/api/drafts/${draftId}/openings/${generationId}`,
          {
            method: 'PUT',
            headers: { ...headers, cookie: ctx.cookie },
            body: JSON.stringify({
              expectedRevision: 1,
              startPackage: fixture.roots.start,
            }),
          },
        );
        await waitForSucceededOpening(ctx.apiOrigin, ctx.cookie, draftId, 30_000);

        const foreignStoryId = randomUUID();
        const foreignStart = await fetch(
          `${ctx.apiOrigin}/api/stories/${foreignStoryId}/start`,
          {
            method: 'PUT',
            headers: { ...headers, cookie: ctx.otherCookie },
            body: JSON.stringify({
              candidateId: generationId,
              expectedDraftRevision: 1,
              campaign: campaignForPins(fixture.roots),
            }),
          },
        );
        assert.ok(
          foreignStart.status === 401 || foreignStart.status === 404,
          await foreignStart.text(),
        );
        const foreignRows = await ctx.database.db
          .select({ id: story.id })
          .from(story)
          .where(
            and(eq(story.id, foreignStoryId), eq(story.ownerId, ctx.otherUser.id)),
          );
        assert.equal(foreignRows.length, 0);

        const golden = await admitTurn03ViaHttp(ctx, fixture.roots);
        await waitForStoryRevision(
          ctx.apiOrigin,
          ctx.cookie,
          golden.storyId,
          2,
          45_000,
        );
        const foreignResolve = await fetch(
          `${ctx.apiOrigin}/api/stories/${golden.storyId}/resolutions/${randomUUID()}`,
          {
            method: 'PUT',
            headers: { ...headers, cookie: ctx.otherCookie },
            body: JSON.stringify({
              expectedRevision: 2,
              submission: {
                interactionId: golden.interactionId,
                answer: { kind: 'choice.v1', optionId: 'ask' },
              },
            }),
          },
        );
        assert.ok(
          foreignResolve.status === 401 || foreignResolve.status === 404,
          await foreignResolve.text(),
        );
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
      },
    );
  },
);

test(
  'STORY03 T09 resolution replay does not create passage sequence 3',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t09-replay-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const golden = await admitTurn03ViaHttp(ctx, fixture.roots);
        await waitForStoryRevision(
          ctx.apiOrigin,
          ctx.cookie,
          golden.storyId,
          2,
          45_000,
        );
        const replay = await fetch(
          `${ctx.apiOrigin}/api/stories/${golden.storyId}/resolutions/${golden.operationId}`,
          {
            method: 'PUT',
            headers: {
              cookie: ctx.cookie,
              origin: ctx.apiOrigin,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              expectedRevision: 2,
              submission: {
                interactionId: golden.interactionId,
                answer: { kind: 'choice.v1', optionId: 'ask' },
              },
            }),
          },
        );
        assert.ok(replay.status === 409 || replay.status === 200);
        const passages = await ctx.database.db
          .select({ sequence: storyPassage.sequence })
          .from(storyPassage)
          .where(eq(storyPassage.storyId, golden.storyId))
          .orderBy(asc(storyPassage.sequence));
        assert.deepEqual(
          passages.map((row) => row.sequence),
          [1, 2],
        );
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
      },
    );
  },
);

test(
  'STORY03 T09 resolution waits for executor then settles once',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t09-no-executor-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const scene1 = await admitTurn03OpeningAndScene1(ctx, fixture.roots);
        await ctx.stopExecutorOnly();
        const operationId = randomUUID();
        await submitTurn03Resolution(ctx, {
          storyId: scene1.storyId,
          operationId,
          expectedRevision: 1,
          interactionId: scene1.interactionId,
          optionId: scene1.visibleOptionId,
        });
        const holdUntil = Date.now() + 8_000;
        while (Date.now() < holdUntil) {
          const response = await fetch(
            `${ctx.apiOrigin}/api/stories/${scene1.storyId}`,
            { headers: { cookie: ctx.cookie } },
          );
          const revision = storySnapshotSchema.parse(
            await response.json(),
          ).revision;
          assert.equal(
            revision,
            1,
            `executor absent: revision advanced early (${ctx.workerStderrTail('relay')})`,
          );
          await delay(250);
        }
        await ctx.spawnExecutorOnly();
        const scene2 = await waitForStoryRevision(
          ctx.apiOrigin,
          ctx.cookie,
          scene1.storyId,
          2,
          45_000,
        );
        assert.equal(
          scene2.current.content.title,
          turn03DistributedPocAuthorship.scene2.title,
        );
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
      },
    );
  },
);

test(
  'STORY03 T09 resolution does not bypass GA control publication when GA is down',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t09-ga-down-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const draftId = randomUUID();
        const generationId = randomUUID();
        const storyId = randomUUID();
        const headers = {
          cookie: ctx.cookie,
          origin: ctx.apiOrigin,
          'content-type': 'application/json',
        };
        await fetch(`${ctx.apiOrigin}/api/drafts/${draftId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            ...turn03DistributedPocAuthorship.draft,
            expectedRevision: 0,
          }),
        });
        await fetch(
          `${ctx.apiOrigin}/api/drafts/${draftId}/openings/${generationId}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              expectedRevision: 1,
              startPackage: fixture.roots.start,
            }),
          },
        );
        await waitForSucceededOpening(ctx.apiOrigin, ctx.cookie, draftId, 30_000);
        const start = await fetch(`${ctx.apiOrigin}/api/stories/${storyId}/start`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            candidateId: generationId,
            expectedDraftRevision: 1,
            campaign: campaignForPins(fixture.roots),
          }),
        });
        const startBodyText = await start.text();
        assert.equal(start.status, 200, startBodyText);
        const scene1 = storySnapshotSchema.parse(JSON.parse(startBodyText));
        const interaction = requireDefined(
          scene1.current.interaction,
          'Expected scene1 interaction',
        );
        const visible = requireDefined(
          interaction.specification.options.find((o) => o.id === 'ask'),
          'Expected ask choice',
        );

        await ctx.killGameAuthority();

        const operationId = randomUUID();
        const resolution = await fetch(
          `${ctx.apiOrigin}/api/stories/${storyId}/resolutions/${operationId}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              expectedRevision: 1,
              submission: {
                interactionId: interaction.id,
                answer: { kind: 'choice.v1', optionId: visible.id },
              },
            }),
          },
        );
        const resolutionText = await resolution.text();
        assert.ok(
          resolution.status === 202 || resolution.status === 503,
          resolutionText,
        );

        await delay(3000);
        const [storyRow] = await ctx.database.db
          .select({ revision: story.revision })
          .from(story)
          .where(eq(story.id, storyId));
        assert.equal(storyRow?.revision, 1);
        const passages = await ctx.database.db
          .select({ sequence: storyPassage.sequence })
          .from(storyPassage)
          .where(eq(storyPassage.storyId, storyId))
          .orderBy(asc(storyPassage.sequence));
        assert.deepEqual(
          passages.map((row) => row.sequence),
          [1],
        );
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
      },
    );
  },
);

test(
  'STORY03 T10 continuation publish ACK loss retries to already_published',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t10-ack-loss-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );
    const continuationGenerationId = { current: '' };

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const scene1 = await admitTurn03OpeningAndScene1(ctx, fixture.roots);
        const operationId = randomUUID();
        continuationGenerationId.current = operationId;
        await submitTurn03Resolution(ctx, {
          storyId: scene1.storyId,
          operationId,
          expectedRevision: 1,
          interactionId: scene1.interactionId,
          optionId: scene1.visibleOptionId,
        });

        const scene2 = await waitForStoryRevision(
          ctx.apiOrigin,
          ctx.cookie,
          scene1.storyId,
          2,
          60_000,
        );
        assert.equal(
          scene2.current.content.title,
          turn03DistributedPocAuthorship.scene2.title,
        );

        await assertContinuationSql(ctx, operationId, scene1.storyId);

        const proxy = requireDefined(
          ctx.controlPublishProxy,
          'Expected control publish proxy stats',
        );
        assert.equal(proxy.droppedCompletedPublishResponseCount, 1);
        assert.ok(
          proxy.publishPostCount >= 2,
          `expected opening and continuation publish posts (got ${proxy.publishPostCount})`,
        );

        const stages = await ctx.database.db
          .select({ id: storytellerAttempt.id })
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.generationId, operationId));
        assert.equal(stages.length, 1);
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
        controlPublishProxy: {
          dropFirstCompletedPublishResponseWhen: (generationId) =>
            generationId === continuationGenerationId.current,
        },
      },
    );
  },
);

test(
  'STORY03 T12 executor kill after saved result reuses attempt and publishes once',
  { timeout: 300_000 },
  async () => {
    const documentRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-story03-t12-save-hold-'),
    );
    const { LocalDocumentStore } = await import('@offscreen/documents');
    const fixture = await provisionTurn03DistributedPocFixture(
      new LocalDocumentStore(documentRoot),
    );
    const continuationGenerationId = { current: '' };

    await withStory03CausalMultiprocessHarness(
      async (ctx) => {
        const scene1 = await admitTurn03OpeningAndScene1(ctx, fixture.roots);
        const operationId = randomUUID();
        continuationGenerationId.current = operationId;
        await submitTurn03Resolution(ctx, {
          storyId: scene1.storyId,
          operationId,
          expectedRevision: 1,
          interactionId: scene1.interactionId,
          optionId: scene1.visibleOptionId,
        });

        await waitForSavedContinuationWhileRevisionOne(
          ctx,
          operationId,
          scene1.storyId,
          45_000,
        );

        const proxy = requireDefined(
          ctx.executorResultProxy,
          'Expected executor result proxy stats',
        );
        assert.equal(proxy.heldCompletedSaveResponseCount, 1);

        await ctx.stopExecutorOnly();
        ctx.dropHeldExecutorSaveResponse?.();

        await ctx.spawnExecutorOnly();

        const scene2 = await waitForStoryRevision(
          ctx.apiOrigin,
          ctx.cookie,
          scene1.storyId,
          2,
          60_000,
        );
        assert.equal(
          scene2.current.content.title,
          turn03DistributedPocAuthorship.scene2.title,
        );

        await assertContinuationSql(ctx, operationId, scene1.storyId);
      },
      {
        documentRoot,
        defaultRules: fixture.defaultRules,
        chamberStorytellerControl,
        executorResultProxy: {
          holdFirstCompletedSaveResponseWhen: (generationId) =>
            generationId === continuationGenerationId.current,
        },
      },
    );
  },
);