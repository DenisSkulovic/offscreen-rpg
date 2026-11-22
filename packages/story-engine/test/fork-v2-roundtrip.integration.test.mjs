/**
 * FORK02 T01: JSONB null persistence proof and v2 fork round-trip diagnostics.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, lte } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActionExecution,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import {
  story,
  storyDocumentCommit,
  storyItem,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import {
  documentManifestSchema,
  LocalDocumentStore,
  sceneCheckpointSchema,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../lab-support/dist/index.js';
import { createAcceptedActivityPlan } from '../dist/campaign/accepted-plans.js';
import { StoryError, createStories } from '../dist/stories/index.js';
import {
  buildV2ForkRows,
  gameOfferPlansColumnValue,
} from '../dist/stories/fork-v2-reconstruct.js';
import { stageV2ForkCheckpoint } from '../dist/stories/fork-reconstruct.js';
import { mapV2ForkState } from '../dist/stories/fork-state.js';
import {
  insertSceneCheckpointReference,
  insertStagedSceneCheckpointSelector,
} from '../dist/stories/scene-checkpoint.js';
import { readSceneAfterStateFromDatabase } from '../dist/stories/scene-after-state.js';
import {
  assertV2PostStateMatches,
  toV2FictionalState,
} from '../dist/stories/scene-checkpoint-v2.js';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { ForkStateError } from '../dist/stories/fork-state.js';
import {
  PARENT_PASSAGE_ID,
  PARENT_STORY_ID,
  SOURCE_SCENE_SEQUENCE,
  STABLE_ROOT_HASH,
  scene37V2Checkpoint,
  selectedProcessPlan,
  wrappedSelectedSituationAuthorization,
} from './fork-reconstruct.test.mjs';

const roundTripImmediatePlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'travel-leg',
  label: 'Continue travel',
  intention: 'Walk the coastal leg toward Seyda Neen.',
  risk: null,
  evidence: [],
  requires: [],
  requiresStory: [],
  requiresQuantities: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 3600,
    outcome: {
      text: 'The road bends onward.',
      effects: [],
      declarations: [],
      worldEffects: [],
    },
  },
});

/**
 * Mirror of packages/story-engine/src/stories/scene-checkpoint-v2.ts::COMPARE_FIELDS.
 * Test-only; keep aligned with production field coverage for diagnostics.
 */
const COMPARE_FIELDS = [
  { code: 'mechanicsAbsent', select: (state) => state.mechanicsAbsent },
  { code: 'continuityNotes', select: (state) => state.continuityNotes },
  { code: 'activeSceneScope', select: (state) => state.activeSceneScope },
  {
    code: 'items',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.items,
  },
  {
    code: 'character',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.character,
  },
  {
    code: 'storyFacts',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.storyFacts,
  },
  {
    code: 'activityOccurrences',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activityOccurrences,
  },
  {
    code: 'location',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.location,
  },
  {
    code: 'gameSecond',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.gameSecond,
  },
  {
    code: 'clock',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.clock,
  },
  {
    code: 'pace',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.pace,
  },
  {
    code: 'settingsRevision',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.settingsRevision,
  },
  {
    code: 'content',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.content,
  },
  {
    code: 'holds',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.holds,
  },
  {
    code: 'offer',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.offer,
  },
  {
    code: 'acceptedActivityPlan',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.acceptedActivityPlan,
  },
  {
    code: 'activeActivityId',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activeActivityId,
  },
  {
    code: 'activeActionOperationId',
    select: (state) =>
      state.mechanicsAbsent === true
        ? undefined
        : state.activeActionOperationId,
  },
  {
    code: 'situationAuthorization',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.situationAuthorization,
  },
  {
    code: 'worldConditions',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.worldConditions,
  },
  {
    code: 'activeActivities',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activeActivities,
  },
  {
    code: 'worldObligations',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.worldObligations,
  },
  {
    code: 'activeAction',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activeAction,
  },
];

function offerPayloadPlans(offer) {
  const body = offer?.payload?.body;
  if (!body || !('plans' in body)) {
    return undefined;
  }
  return body.plans;
}

/** Reports every unequal COMPARE_FIELDS entry plus nested offer plan path when relevant. */
export function collectAllV2FictionalFieldDiffs(expected, actual) {
  const diffs = [];
  if (expected.mechanicsAbsent !== actual.mechanicsAbsent) {
    diffs.push({
      path: 'mechanicsAbsent',
      expected: expected.mechanicsAbsent,
      actual: actual.mechanicsAbsent,
    });
  }
  for (const field of COMPARE_FIELDS) {
    const left = field.select(expected);
    const right = field.select(actual);
    if (left === undefined && right === undefined) {
      continue;
    }
    if (!isDeepStrictEqual(left, right)) {
      diffs.push({
        path: field.code,
        expected: left,
        actual: right,
      });
      if (field.code === 'offer') {
        const expectedPlans = offerPayloadPlans(left);
        const actualPlans = offerPayloadPlans(right);
        if (!isDeepStrictEqual(expectedPlans, actualPlans)) {
          diffs.push({
            path: 'offer.payload.body.plans',
            expected: expectedPlans,
            actual: actualPlans,
          });
        }
      }
    }
  }
  return diffs;
}

function formatDiffsForAssertion(diffs) {
  return diffs
    .map(
      (diff) =>
        `${diff.path}: expected ${JSON.stringify(diff.expected)} actual ${JSON.stringify(diff.actual)}`,
    )
    .join('\n');
}

/** Every compare field code with a defined selector value for mechanics-present state. */
export const EXERCISED_COMPARE_FIELD_CODES = COMPARE_FIELDS.map(
  (field) => field.code,
).filter((code) => code !== 'mechanicsAbsent');

async function countForkChildren(database, sourceStoryId) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.forkedFromStoryId, sourceStoryId));
  return rows.length;
}

function assertZeroFictionalRoundTrip(expected, actual, t, label) {
  const diffs = collectAllV2FictionalFieldDiffs(expected, actual);
  for (const diff of diffs) {
    t.diagnostic(
      `${label} mismatch ${diff.path}: expected=${JSON.stringify(diff.expected)} actual=${JSON.stringify(diff.actual)}`,
    );
  }
  assert.equal(diffs.length, 0, `${label}:\n${formatDiffsForAssertion(diffs)}`);
  assertV2PostStateMatches(expected, actual);
}

const secondSelectedProcessPlan = immediateActionPlanSchema.parse({
  ...selectedProcessPlan,
  key: 'wait-at-quay',
  label: 'Wait at the quay',
});

function acceptedActivityPlanEnvelope(offerId, activityId) {
  const body = createAcceptedActivityPlan({
    offerId,
    plans: [selectedProcessPlan, secondSelectedProcessPlan],
    firstActivityId: activityId,
    acceptedAtGameSecond: 118_000,
    horizonGameSeconds: 200_000,
  });
  return { version: 1, body };
}

async function withDisposable(run) {
  const runId = randomUUID();
  let provisioned;
  try {
    provisioned = await provisionDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
      applyFullMigrations: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'unknown');
    test.diagnostic(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: provisioned.connectionString,
      DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS,
      DB_IDLE_TRANSACTION_TIMEOUT_MS:
        process.env.DB_IDLE_TRANSACTION_TIMEOUT_MS,
    }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedMinimalStory(database, storyId, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'FORK02', `${ownerId}@example.test`],
  );
  await database.db.insert(story).values({
    id: storyId,
    ownerId,
    source: 'fork02-json-null',
    premise: null,
    revision: 1,
    documentRootHash: STABLE_ROOT_HASH,
    documentRootRevision: 1,
  });
}

/** Mirrors forks.ts row insertion without post-insert assertReconstructedV2Matches. */
async function insertV2ForkBundle(database, bundleInput, staged) {
  const rows = buildV2ForkRows(bundleInput);
  await database.db.transaction(async (tx) => {
    const inserted = await tx
      .insert(story)
      .values({
        ...rows.story,
        revision: 1,
      })
      .returning({ id: story.id });
    assert.equal(inserted.length, 1);
    if (rows.storyItems.length) {
      await tx.insert(storyItem).values(rows.storyItems);
    }
    if (rows.campaignSettings.length) {
      await tx.insert(campaignSettings).values(rows.campaignSettings);
    }
    await tx.insert(campaign).values(rows.campaign);
    for (const offer of rows.gameOffers) {
      await tx.insert(gameOffer).values({
        ...offer,
        plans: gameOfferPlansColumnValue(offer.plans),
      });
    }
    for (const activity of rows.gameActivities) {
      await tx.insert(gameActivity).values(activity);
    }
    for (const obligation of rows.worldObligations) {
      await tx.insert(worldObligation).values(obligation);
    }
    for (const execution of rows.gameActionExecutions) {
      await tx.insert(gameActionExecution).values(execution);
    }
    await tx.insert(storyPassage).values({
      ...rows.storyPassage,
      appearance: null,
    });
    if (rows.storyDocumentCommit) {
      await tx.insert(storyDocumentCommit).values(rows.storyDocumentCommit);
    }
    await insertStagedSceneCheckpointSelector(tx, {
      ownerId: bundleInput.ownerId,
      operationId: bundleInput.forkStoryId,
      staged,
    });
  });
}

function checkpointWithOfferBodyPlans(baseCheckpoint, plans) {
  const offer = baseCheckpoint.fictionalState.offer;
  assert.ok(offer);
  return sceneCheckpointSchema.parse({
    ...baseCheckpoint,
    fictionalState: {
      ...baseCheckpoint.fictionalState,
      offer: {
        ...offer,
        payload: {
          version: 1,
          body: {
            ...offer.payload.body,
            plans,
          },
        },
      },
    },
  });
}

function checkpointWithNestedOfferTree(baseCheckpoint, offerTreePatch) {
  const offer = baseCheckpoint.fictionalState.offer;
  assert.ok(offer);
  const body = offer.payload.body;
  return sceneCheckpointSchema.parse({
    ...baseCheckpoint,
    fictionalState: {
      ...baseCheckpoint.fictionalState,
      offer: {
        ...offer,
        payload: {
          version: 1,
          body: {
            ...body,
            offer: {
              ...body.offer,
              ...offerTreePatch,
            },
          },
        },
      },
    },
  });
}

async function seedScene37Checkpoint(database, store, checkpoint) {
  const ownerId = `fork02-${randomUUID()}`;
  const operation37 = randomUUID();
  const transition37 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const profile = { id: 'test-profile', revision: 1 };

  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'FORK02', `${ownerId}@example.test`],
  );

  const rootHash = await store.putManifest(
    documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: PARENT_STORY_ID,
      revision: 4,
      previousRootHash: null,
      authorOperationId: operation37,
      entries: [],
    }),
  );

  await database.db.insert(story).values({
    id: PARENT_STORY_ID,
    ownerId,
    source: 'test.scene-37.v1',
    premise: null,
    revision: SOURCE_SCENE_SEQUENCE,
    documentRootHash: rootHash,
    documentRootRevision: 4,
    activeSceneScope: {
      version: 'active-scene-anchor.v1',
      fromSequence: SOURCE_SCENE_SEQUENCE,
      requiredPassageIds: [PARENT_PASSAGE_ID],
      recallCues: [],
    },
  });

  await database.db.insert(storyPassage).values({
    id: PARENT_PASSAGE_ID,
    storyId: PARENT_STORY_ID,
    sequence: SOURCE_SCENE_SEQUENCE,
    transitionId: transition37,
    content: {
      version: 1,
      title: 'Scene 37',
      paragraphs: ['The road bends toward Seyda Neen.'],
    },
    interaction: null,
  });

  await database.db.insert(campaignSettings).values({
    storyId: PARENT_STORY_ID,
    revision: 1,
    settings: {
      revision: 1,
      creative: {
        profile,
        tone: 'Coast',
        emphasis: 'balanced',
        surprises: 'occasional',
        tags: [],
        guidance: [],
      },
      pace: { kind: 'instant' },
      locked: false,
      rules: 'srd-5.2.1-subset.v1',
      risk: 'nonlethal',
    },
    profile,
  });

  const checkpointWithCanon = sceneCheckpointSchema.parse({
    ...checkpoint,
    canon: { rootHash, rootRevision: 4 },
  });

  await store.putSceneCheckpoint(checkpointWithCanon);
  await database.db.transaction((tx) =>
    insertSceneCheckpointReference(tx, {
      ownerId,
      operationId: operation37,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      expectedRootHash: rootHash,
      expectedRootRevision: 4,
      checkpoint: checkpointWithCanon,
      documentStore: store,
    }),
  );

  const [selector] = await database.db
    .select()
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, PARENT_STORY_ID),
        eq(storySceneCheckpoint.sceneSequence, SOURCE_SCENE_SEQUENCE),
      ),
    );
  assert.ok(selector);

  return {
    ownerId,
    checkpointHash: selector.checkpointHash,
    sourceCheckpoint: checkpointWithCanon,
  };
}

async function roundTripForkBundle(
  database,
  store,
  seeded,
  forkStoryId,
  t,
  { requireZeroDiffs = true } = {},
) {
  const { mapped, staged } = await stageV2ForkCheckpoint(
    store,
    seeded.sourceCheckpoint,
    PARENT_STORY_ID,
    forkStoryId,
  );
  const settingsRows = await database.db
    .select()
    .from(campaignSettings)
    .where(
      and(
        eq(campaignSettings.storyId, PARENT_STORY_ID),
        lte(
          campaignSettings.revision,
          mapped.checkpoint.fictionalState.settingsRevision,
        ),
      ),
    );

  await insertV2ForkBundle(
    database,
    {
      checkpoint: mapped.checkpoint,
      settingsRows,
      forkStoryId,
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceSceneSequence: SOURCE_SCENE_SEQUENCE,
      checkpointHash: seeded.checkpointHash,
      clockAnchorAt: new Date(),
    },
    staged,
  );

  const expectedFictional = mapped.checkpoint.fictionalState;
  const afterState = await readSceneAfterStateFromDatabase(
    database,
    forkStoryId,
  );
  const actualFictional = toV2FictionalState(afterState);

  const diffs = collectAllV2FictionalFieldDiffs(
    expectedFictional,
    actualFictional,
  );
  for (const diff of diffs) {
    t.diagnostic(
      `field mismatch ${diff.path}: expected=${JSON.stringify(diff.expected)} actual=${JSON.stringify(diff.actual)}`,
    );
  }

  if (requireZeroDiffs) {
    assert.equal(
      diffs.length,
      0,
      `v2 fork fictional round-trip mismatches:\n${formatDiffsForAssertion(diffs)}`,
    );
  }

  const offerRows = await database.db
    .select()
    .from(gameOffer)
    .where(eq(gameOffer.storyId, forkStoryId));
  return { expectedFictional, actualFictional, offerRows, mapped, diffs };
}

test('FORK02: explicit JSONB null in game_offer.plans survives NOT NULL and maps to JS null', async (t) => {
  await withDisposable(async (database) => {
    const storyId = randomUUID();
    const offerId = randomUUID();
    const ownerId = `fork02-json-null-${randomUUID()}`;
    await seedMinimalStory(database, storyId, ownerId);

    await database.db.$client.query(
      `insert into game_offer (id, story_id, narrative_revision, plans, created_at)
       values ($1, $2, 1, 'null'::jsonb, now())`,
      [offerId, storyId],
    );

    const {
      rows: [sqlRow],
    } = await database.db.$client.query(
      `select plans is null as sql_is_null, jsonb_typeof(plans) as jsonb_type, plans
       from game_offer where id = $1`,
      [offerId],
    );

    assert.equal(sqlRow.sql_is_null, false);
    assert.equal(sqlRow.jsonb_type, 'null');
    assert.equal(sqlRow.plans, null);

    const [drizzleRow] = await database.db
      .select({ plans: gameOffer.plans })
      .from(gameOffer)
      .where(eq(gameOffer.id, offerId));
    assert.ok(drizzleRow);
    assert.equal(drizzleRow.plans, null);

    t.diagnostic(
      `JSON-null evidence: sql_is_null=${sqlRow.sql_is_null} jsonb_typeof=${sqlRow.jsonb_type} drizzle=${drizzleRow.plans}`,
    );
  });
});

test('FORK02: SQL NULL game_offer.plans violates NOT NULL', async () => {
  await withDisposable(async (database) => {
    const storyId = randomUUID();
    const offerId = randomUUID();
    const ownerId = `fork02-sql-null-${randomUUID()}`;
    await seedMinimalStory(database, storyId, ownerId);

    await assert.rejects(
      () =>
        database.db.$client.query(
          `insert into game_offer (id, story_id, narrative_revision, plans, created_at)
           values ($1, $2, 1, null, now())`,
          [offerId, storyId],
        ),
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        return /not-null|null value|violates not-null/i.test(message);
      },
    );
  });
});

test('FORK02: v2 fork with mapped offer payload.body.plans=null round-trips all fictional fields', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-roundtrip-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = checkpointWithOfferBodyPlans(
      scene37V2Checkpoint(),
      null,
    );
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const stories = createStories(database, { documentStore: store });

    const { mapped } = await stageV2ForkCheckpoint(
      store,
      seeded.sourceCheckpoint,
      PARENT_STORY_ID,
      forkStoryId,
    );

    const forked = await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      forkStoryId,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    assert.equal(forked.id, forkStoryId);

    assert.equal(
      offerPayloadPlans(mapped.checkpoint.fictionalState.offer),
      null,
    );
    const afterState = await readSceneAfterStateFromDatabase(
      database,
      forkStoryId,
    );
    const actualFictional = toV2FictionalState(afterState);
    assert.equal(offerPayloadPlans(actualFictional.offer), null);

    const diffs = collectAllV2FictionalFieldDiffs(
      mapped.checkpoint.fictionalState,
      actualFictional,
    );
    assert.equal(
      diffs.length,
      0,
      `stories.fork round-trip mismatches:\n${formatDiffsForAssertion(diffs)}`,
    );

    const offerRows = await database.db
      .select()
      .from(gameOffer)
      .where(eq(gameOffer.storyId, forkStoryId));
    assert.equal(offerRows.length, 1);
    assert.equal(offerRows[0].plans, null);
  });
});

test('FORK02: v2 fork insert path preserves plans=null with one game_offer row', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-roundtrip-sql-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = checkpointWithOfferBodyPlans(
      scene37V2Checkpoint(),
      null,
    );
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const { offerRows } = await roundTripForkBundle(
      database,
      store,
      seeded,
      forkStoryId,
      t,
    );
    assert.equal(offerRows.length, 1);
    assert.equal(offerRows[0].plans, null);

    const afterState = await readSceneAfterStateFromDatabase(
      database,
      forkStoryId,
    );
    assert.equal(offerPayloadPlans(toV2FictionalState(afterState).offer), null);
  });
});

test('FORK02: empty versioned plans body round-trips as [] not null', async (t) => {
  const root = await mkdtemp(
    join(tmpdir(), 'offscreen-fork02-roundtrip-empty-'),
  );
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = checkpointWithOfferBodyPlans(scene37V2Checkpoint(), {
      version: 1,
      body: [],
    });
    assert.deepEqual(checkpoint.fictionalState.offer.payload.body.plans, {
      version: 1,
      body: [],
    });
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const { expectedFictional, actualFictional, offerRows } =
      await roundTripForkBundle(database, store, seeded, forkStoryId, t);
    assert.equal(offerRows.length, 1);
    assert.deepEqual(offerRows[0].plans, []);
    assert.notEqual(offerRows[0].plans, null);
    const plans = offerPayloadPlans(actualFictional.offer);
    assert.ok(plans);
    assert.equal(plans.version, 1);
    assert.deepEqual(plans.body, []);
    assertZeroFictionalRoundTrip(
      expectedFictional,
      actualFictional,
      t,
      'empty versioned plans',
    );
  });
});

test('FORK02: nonempty plans and nested offer keys survive one wrap', async (t) => {
  const root = await mkdtemp(
    join(tmpdir(), 'offscreen-fork02-roundtrip-rich-'),
  );
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const lineageTag = 'seydaneen-quay';
    let checkpoint = checkpointWithOfferBodyPlans(scene37V2Checkpoint(), {
      version: 1,
      body: [roundTripImmediatePlan],
    });
    checkpoint = checkpointWithNestedOfferTree(checkpoint, {
      coastLegend: lineageTag,
      fork02UnknownKey: 'preserved-open-field',
    });
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const { expectedFictional, actualFictional, offerRows, mapped } =
      await roundTripForkBundle(database, store, seeded, forkStoryId, t);
    assert.equal(offerRows.length, 1);
    assert.deepEqual(offerRows[0].plans, [roundTripImmediatePlan]);

    const offer = actualFictional.offer;
    assert.ok(offer);
    assert.equal(offer.id, mapped.checkpoint.fictionalState.offer.id);
    assert.equal(offer.source, 'scene-37-choice');
    assert.equal(offer.meaning, 'continue');
    const nested = offer.payload.body.offer;
    assert.equal(nested.coastLegend, lineageTag);
    assert.equal(nested.fork02UnknownKey, 'preserved-open-field');
    assert.ok(Array.isArray(nested.nodes));

    const plans = offerPayloadPlans(offer);
    assert.deepEqual(plans, {
      version: 1,
      body: [roundTripImmediatePlan],
    });
    assertZeroFictionalRoundTrip(
      expectedFictional,
      actualFictional,
      t,
      'nonempty plans and nested offer',
    );
  });
});

test('FORK02: invalid offer plans fail during checkpoint mapping', () => {
  const checkpoint = checkpointWithOfferBodyPlans(scene37V2Checkpoint(), {
    version: 1,
    body: [{ definitely: 'not-a-plan' }],
  });
  assert.throws(
    () =>
      mapV2ForkState({
        checkpoint,
        sourceStoryId: PARENT_STORY_ID,
        forkStoryId: randomUUID(),
      }),
    (error) => error instanceof Error,
  );
});

test('FORK02: non-object nested offer tree fails during row build', () => {
  const base = scene37V2Checkpoint();
  const offer = base.fictionalState.offer;
  assert.ok(offer);
  const checkpoint = sceneCheckpointSchema.parse({
    ...base,
    fictionalState: {
      ...base.fictionalState,
      offer: {
        ...offer,
        payload: {
          version: 1,
          body: {
            ...offer.payload.body,
            offer: 'not-an-object',
          },
        },
      },
    },
  });
  const mapped = mapV2ForkState({
    checkpoint,
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: randomUUID(),
  });
  assert.throws(
    () =>
      buildV2ForkRows({
        checkpoint: mapped.checkpoint,
        settingsRows: [
          {
            storyId: PARENT_STORY_ID,
            revision: 1,
            settings: {
              revision: 1,
              creative: {
                profile: { id: 'test-profile', revision: 1 },
                tone: 'Coast',
                emphasis: 'balanced',
                surprises: 'occasional',
                tags: [],
                guidance: [],
              },
              pace: { kind: 'instant' },
              locked: false,
              rules: 'srd-5.2.1-subset.v1',
              risk: 'nonlethal',
            },
            profile: { id: 'test-profile', revision: 1 },
          },
        ],
        forkStoryId: mapped.checkpoint.storyId,
        ownerId: randomUUID(),
        sourceStoryId: PARENT_STORY_ID,
        sourcePassageId: PARENT_PASSAGE_ID,
        sourceSceneSequence: SOURCE_SCENE_SEQUENCE,
        checkpointHash: 'ab'.repeat(32),
        clockAnchorAt: new Date(),
      }),
    (error) => error instanceof ForkStateError,
  );
});

test('FORK02: default scene37 checkpoint round-trips every fictional compare field', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-full-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = scene37V2Checkpoint();
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const { expectedFictional, actualFictional } = await roundTripForkBundle(
      database,
      store,
      seeded,
      forkStoryId,
      t,
    );
    assertZeroFictionalRoundTrip(
      expectedFictional,
      actualFictional,
      t,
      'scene37 default',
    );
    t.diagnostic(
      `compare fields exercised: ${EXERCISED_COMPARE_FIELD_CODES.join(', ')}`,
    );
  });
});

test('FORK02: selected situation authorization round-trips without FORK01 regression', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-selected-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = scene37V2Checkpoint({
      situationAuthorization: wrappedSelectedSituationAuthorization(),
    });
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const { expectedFictional, actualFictional } = await roundTripForkBundle(
      database,
      store,
      seeded,
      forkStoryId,
      t,
    );
    assertZeroFictionalRoundTrip(
      expectedFictional,
      actualFictional,
      t,
      'selected authorization',
    );
  });
});

test('FORK02: acceptedActivityPlan present round-trips wrapped once', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-accepted-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const base = scene37V2Checkpoint();
    const offerId = base.fictionalState.offer.id;
    const activityId = base.fictionalState.activeActivityId;
    const checkpoint = scene37V2Checkpoint({
      acceptedActivityPlan: acceptedActivityPlanEnvelope(offerId, activityId),
    });
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const { expectedFictional, actualFictional, mapped } =
      await roundTripForkBundle(database, store, seeded, forkStoryId, t);
    assert.ok(actualFictional.acceptedActivityPlan);
    assert.equal(actualFictional.acceptedActivityPlan.version, 1);
    assert.equal(
      actualFictional.acceptedActivityPlan.body.sourceOfferId,
      mapped.checkpoint.fictionalState.offer.id,
    );
    assertZeroFictionalRoundTrip(
      expectedFictional,
      actualFictional,
      t,
      'acceptedActivityPlan',
    );
  });
});

test('FORK02: one representative field mutation fails strict comparator', () => {
  const base = scene37V2Checkpoint().fictionalState;
  assert.equal(base.mechanicsAbsent, false);
  const mutated = {
    ...base,
    location: 'Changed coast',
  };
  assert.throws(
    () => assertV2PostStateMatches(base, mutated),
    /v2_post_state_mismatch:location/,
  );
});

test('FORK02: wrong owner, wrong hash, and malformed v2 payload refuse with rollback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-neg-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = scene37V2Checkpoint();
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const otherOwnerId = `fork02-other-${randomUUID()}`;
    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now())`,
      [otherOwnerId, 'FORK02-other', `${otherOwnerId}@example.test`],
    );
    const stories = createStories(database, { documentStore: store });
    const beforeForks = await countForkChildren(database, PARENT_STORY_ID);

    const wrongOwnerForkId = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: otherOwnerId,
          sourceStoryId: PARENT_STORY_ID,
          forkStoryId: wrongOwnerForkId,
          expectedRevision: SOURCE_SCENE_SEQUENCE,
          sourcePassageId: PARENT_PASSAGE_ID,
          sourceCheckpointHash: seeded.checkpointHash,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(story)
          .where(eq(story.id, wrongOwnerForkId))
      ).length,
      0,
    );

    const wrongHashForkId = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: PARENT_STORY_ID,
          forkStoryId: wrongHashForkId,
          expectedRevision: SOURCE_SCENE_SEQUENCE,
          sourcePassageId: PARENT_PASSAGE_ID,
          sourceCheckpointHash: 'c'.repeat(64),
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(story)
          .where(eq(story.id, wrongHashForkId))
      ).length,
      0,
    );

    const malformedCheckpoint = sceneCheckpointSchema.parse({
      ...checkpoint,
      fictionalState: {
        ...checkpoint.fictionalState,
        offer: {
          ...checkpoint.fictionalState.offer,
          payload: {
            version: 1,
            body: {
              ...checkpoint.fictionalState.offer.payload.body,
              offer: 'not-an-object',
            },
          },
        },
      },
    });
    const badRoot = await mkdtemp(
      join(tmpdir(), 'offscreen-fork02-malformed-'),
    );
    const badStore = new LocalDocumentStore(badRoot);
    const badOwner = `fork02-bad-${randomUUID()}`;
    const operationBad = randomUUID();
    const transition37 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const profile = { id: 'test-profile', revision: 1 };
    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now())`,
      [badOwner, 'FORK02-bad', `${badOwner}@example.test`],
    );
    const badStoryId = randomUUID();
    const badPassageId = randomUUID();
    const badRootHash = await badStore.putManifest(
      documentManifestSchema.parse({
        format: 'offscreen.manifest.v1',
        campaignId: badStoryId,
        revision: 4,
        previousRootHash: null,
        authorOperationId: operationBad,
        entries: [],
      }),
    );
    await database.db.insert(story).values({
      id: badStoryId,
      ownerId: badOwner,
      source: 'test.scene-37.v1',
      premise: null,
      revision: SOURCE_SCENE_SEQUENCE,
      documentRootHash: badRootHash,
      documentRootRevision: 4,
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: SOURCE_SCENE_SEQUENCE,
        requiredPassageIds: [badPassageId],
        recallCues: [],
      },
    });
    await database.db.insert(storyPassage).values({
      id: badPassageId,
      storyId: badStoryId,
      sequence: SOURCE_SCENE_SEQUENCE,
      transitionId: transition37,
      content: {
        version: 1,
        title: 'Scene 37',
        paragraphs: ['The road bends toward Seyda Neen.'],
      },
      interaction: null,
    });
    await database.db.insert(campaignSettings).values({
      storyId: badStoryId,
      revision: 1,
      settings: {
        revision: 1,
        creative: {
          profile,
          tone: 'Coast',
          emphasis: 'balanced',
          surprises: 'occasional',
          tags: [],
          guidance: [],
        },
        pace: { kind: 'instant' },
        locked: false,
        rules: 'srd-5.2.1-subset.v1',
        risk: 'nonlethal',
      },
      profile,
    });
    const malformedCanon = sceneCheckpointSchema.parse({
      ...malformedCheckpoint,
      storyId: badStoryId,
      passageId: badPassageId,
      canon: { rootHash: badRootHash, rootRevision: 4 },
    });
    await badStore.putSceneCheckpoint(malformedCanon);
    await database.db.transaction((tx) =>
      insertSceneCheckpointReference(tx, {
        ownerId: badOwner,
        operationId: operationBad,
        expectedRevision: SOURCE_SCENE_SEQUENCE,
        expectedRootHash: badRootHash,
        expectedRootRevision: 4,
        checkpoint: malformedCanon,
        documentStore: badStore,
      }),
    );
    const [badSelector] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, badStoryId),
          eq(storySceneCheckpoint.sceneSequence, SOURCE_SCENE_SEQUENCE),
        ),
      );
    assert.ok(badSelector);
    const rejectForkId = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: badOwner,
          sourceStoryId: badStoryId,
          forkStoryId: rejectForkId,
          expectedRevision: SOURCE_SCENE_SEQUENCE,
          sourcePassageId: badPassageId,
          sourceCheckpointHash: badSelector.checkpointHash,
        }),
      () => true,
    );
    assert.equal(
      (await database.db.select().from(story).where(eq(story.id, rejectForkId)))
        .length,
      0,
    );

    assert.equal(
      await countForkChildren(database, PARENT_STORY_ID),
      beforeForks,
    );
    const [parentSelector] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, PARENT_STORY_ID),
          eq(storySceneCheckpoint.sceneSequence, SOURCE_SCENE_SEQUENCE),
        ),
      );
    assert.equal(parentSelector.checkpointHash, seeded.checkpointHash);
  });
});

test('FORK02: same forkStoryId replay remains idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork02-idem-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const checkpoint = scene37V2Checkpoint();
    const seeded = await seedScene37Checkpoint(database, store, checkpoint);
    const forkStoryId = randomUUID();
    const stories = createStories(database, { documentStore: store });
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      forkStoryId,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    assert.equal(await countForkChildren(database, PARENT_STORY_ID), 1);
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      forkStoryId,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    assert.equal(await countForkChildren(database, PARENT_STORY_ID), 1);
  });
});
