import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createChamberStorytellerControl } from '@offscreen/application/developer-tools';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { createStories, StoryError } from '@offscreen/application/stories';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyPassage } from '@offscreen/db/story-schema';
import { offlineExecution, storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { LocalDocumentStore } from '@offscreen/documents';
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with { 'resolution-mode': 'require' };
import { test } from 'node:test';
import { withAppIntegration } from './helpers/app-integration.js';
import { attestedFake } from './helpers/attested-fake-provider.js';
import { requireDefined } from './helpers/require.js';
import {
  provisionTurn03DistributedPocFixture,
  turn03DistributedPocAuthorship,
  type Turn03DistributedPocRoots,
} from './helpers/turn03-distributed-poc-fixture.js';

const orm: typeof Drizzle = createRequire(import.meta.url)('drizzle-orm');
const { eq } = orm;

type PreparedGolden = Readonly<{
  ownerId: string;
  draftId: string;
  draftRevision: number;
  generationId: string;
  storyId: string;
  roots: Turn03DistributedPocRoots;
}>;

async function prepareSucceededStorytellerOpening(
  database: Parameters<typeof createDrafts>[0],
  documentStore: LocalDocumentStore,
  ownerId: string,
): Promise<PreparedGolden> {
  const fixture = await provisionTurn03DistributedPocFixture(documentStore);
  const drafts = createDrafts(database);
  const draftId = randomUUID();
  await drafts.save(ownerId, draftId, {
    ...turn03DistributedPocAuthorship.draft,
    expectedRevision: 0,
  });
  const generationId = randomUUID();
  const openings = createScriptedOpenings(
    database,
    offlineExecution,
    undefined,
    { documentStore },
  );
  await openings.request(
    ownerId,
    draftId,
    generationId,
    1,
    undefined,
    fixture.roots.start,
  );
  const runtime = createStorytellerRuntime(database, {
    scriptedGate: createChamberStorytellerControl().evaluate,
    documentStore,
  });
  await runtime.complete(generationId);
  const [row] = await database.db
    .select({ kind: generation.kind, state: generation.state, input: generation.input })
    .from(generation)
    .where(eq(generation.id, generationId));
  assert.equal(row?.kind, 'storyteller.profiled.v1');
  assert.equal(row?.state, 'succeeded');
  const task = storytellerTaskSchema.parse(row?.input);
  if (task.task !== 'opening') {
    throw new Error('Expected an opening Storyteller task');
  }
  assert.equal(task.execution.mode, 'scripted');
  assert.deepEqual(task.source.startPackage, fixture.roots.start);
  assert.equal(task.source.draftRevision, 1);
  return {
    ownerId,
    draftId,
    draftRevision: 1,
    generationId,
    storyId: randomUUID(),
    roots: fixture.roots,
  };
}

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

async function assertNoStoryArtifacts(
  database: Parameters<typeof createStories>[0],
  storyId: string,
) {
  const [created] = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.id, storyId));
  assert.equal(created, undefined);
  const passages = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  assert.equal(passages.length, 0);
}

export async function checkTurn03DistributedPocFixture({
  t,
  database,
  owner: ownerId,
  restartWorker,
}: {
  t: TestContext;
  database: Parameters<typeof createStories>[0];
  owner: string;
  restartWorker: () => Promise<void>;
}): Promise<void> {
  const documentStore = new LocalDocumentStore(
    join(
      await mkdtemp(join(tmpdir(), 'offscreen-turn03-poc-store-')),
      'store',
    ),
  );
  const pinnedFixture = await provisionTurn03DistributedPocFixture(documentStore);
  const stories = createStories(database, {
    documentStore,
    defaultRules: pinnedFixture.defaultRules,
  });

  await t.test(
    'pinned storyteller scripted opening yields scene1, choice, and scene2',
    async () => {
      await restartWorker();
      const prepared = await prepareSucceededStorytellerOpening(
        database,
        documentStore,
        ownerId,
      );
      assert.ok(prepared.roots.rules.rootHash);
      assert.ok(prepared.roots.start.rootHash);
      assert.equal(
        prepared.roots.start.startPackageId,
        prepared.roots.startPackageId,
      );
      const snapshot = await stories.startFromCandidate({
        ownerId,
        storyId: prepared.storyId,
        candidateId: prepared.generationId,
        expectedDraftRevision: prepared.draftRevision,
        campaign: campaignForPins(prepared.roots),
      });
      assert.equal(snapshot.revision, 1);
      assert.equal(
        snapshot.current.content.title,
        turn03DistributedPocAuthorship.scene1.title,
      );
      const interaction = requireDefined(
        snapshot.current.interaction,
        'Expected a visible opening choice',
      );
      const visible = requireDefined(
        interaction.specification.options.find(
          (option: { id: string; label: string }) =>
            option.id === turn03DistributedPocAuthorship.scene1.visibleChoice.id,
        ),
        'Expected the supported visible choice',
      );
      assert.equal(
        visible.label,
        turn03DistributedPocAuthorship.scene1.visibleChoice.label,
      );
      const operationId = randomUUID();
      await stories.admitResolution({
        ownerId,
        storyId: prepared.storyId,
        operationId,
        expectedRevision: snapshot.revision,
        submission: {
          interactionId: interaction.id,
          answer: {
            kind: 'choice.v1',
            optionId: visible.id,
          },
        },
      });
      const runtime = createStorytellerRuntime(database, {
        scriptedGate: createChamberStorytellerControl().evaluate,
        documentStore,
      });
      await runtime.complete(operationId);
      const scene2 = await stories.read({
        ownerId,
        storyId: prepared.storyId,
      });
      assert.equal(scene2.revision, 2);
      assert.equal(
        scene2.current.content.title,
        turn03DistributedPocAuthorship.scene2.title,
      );
      const passages = await database.db
        .select({ sequence: storyPassage.sequence })
        .from(storyPassage)
        .where(eq(storyPassage.storyId, prepared.storyId))
        .orderBy(storyPassage.sequence);
      assert.deepEqual(
        passages.map((row: { sequence: number }) => row.sequence),
        [1, 2],
      );
    },
  );

  await t.test(
    'raw playable scripted opening with startPackage is rejected without partial story',
    async () => {
      const storyId = randomUUID();
      const drafts = createDrafts(database);
      const draftId = randomUUID();
      await drafts.save(ownerId, draftId, {
        title: 'Wrong kind negative',
        premise: 'A traveller at a locked gate.',
        storytellingDirection: 'Strange but gentle.',
        expectedRevision: 0,
      });
      const candidateId = randomUUID();
      const playableOpenings = createScriptedOpenings(database);
      await playableOpenings.request(ownerId, draftId, candidateId, 1);
      await playableOpenings.complete(candidateId);
      const [candidate] = await database.db
        .select({ kind: generation.kind })
        .from(generation)
        .where(eq(generation.id, candidateId));
      assert.equal(candidate?.kind, 'opening.playable.scripted.v1');
      try {
        await stories.startFromCandidate({
          ownerId,
          storyId,
          candidateId,
          expectedDraftRevision: 1,
          campaign: campaignForPins(pinnedFixture.roots),
        });
        assert.fail('Expected startPackage with playable.scripted candidate to fail');
      } catch (error: unknown) {
        assert.ok(error instanceof StoryError);
        const storyError = error as StoryError;
        assert.equal(storyError.code, 'invalid');
        assert.equal(storyError.reason, 'start_package_requires_storyteller');
      }
      await assertNoStoryArtifacts(database, storyId);
    },
  );

  await t.test(
    'mismatched start package pin is rejected without partial story',
    async () => {
      const prepared = await prepareSucceededStorytellerOpening(
        database,
        documentStore,
        ownerId,
      );
      const storyId = randomUUID();
      const mismatched: CampaignStart = {
        ...campaignForPins(prepared.roots),
        startPackage: {
          ...prepared.roots.start,
          startPackageId: randomUUID(),
        },
      };
      await assert.rejects(
        () =>
          stories.startFromCandidate({
            ownerId,
            storyId,
            candidateId: prepared.generationId,
            expectedDraftRevision: prepared.draftRevision,
            campaign: mismatched,
          }),
        (error: unknown) => {
          assert.ok(error instanceof StoryError);
          const storyError = error as StoryError;
          assert.equal(storyError.code, 'invalid');
          assert.equal(storyError.reason, 'start_reference');
          return true;
        },
      );
      await assertNoStoryArtifacts(database, storyId);
    },
  );
}

const storytellerControl = createChamberStorytellerControl();
let providerDispatchCalls = 0;

test(
  'turn03 distributed poc golden fixture',
  { timeout: 180000 },
  async (t) => {
    await withAppIntegration(
      async (context) => {
        await context.restartWorker();
        await checkTurn03DistributedPocFixture({
          t,
          database: context.database,
          owner: context.ownerId,
          restartWorker: context.restartWorker,
        });
        assert.equal(providerDispatchCalls, 0);
      },
      {
        chamberStorytellerControl: storytellerControl,
        storytellerRuntime: {
          scriptedGate: storytellerControl.evaluate,
          provider: attestedFake(async () => {
            providerDispatchCalls += 1;
            throw new Error('TURN03 golden fixture must not dispatch a provider');
          }),
        },
      },
    );
  },
);