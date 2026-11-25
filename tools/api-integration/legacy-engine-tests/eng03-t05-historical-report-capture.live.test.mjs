import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import {
  campaign,
  campaignReport,
  gameActivity,
  worldObligation,
} from '@offscreen/story-persistence/campaign';
import { story, storyPassage } from '@offscreen/story-persistence/stories';
import {
  storytellerContextCapture,
  storytellerPublication,
} from '@offscreen/story-persistence/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { stageStoryBootstrapDocuments } from '../../../packages/story-engine/dist/stories/passage-documents.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { storytellerKind } from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  activityHistoricalReportContextCaptureV1Schema,
  hashContextCapture,
  parseContextCapture,
  storytellerContextCaptureKind,
  worldObligationHistoricalReportContextCaptureV1Schema,
} from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import {
  requestActivityReport,
  requestWorldObligationReport,
} from '../../../packages/story-engine/dist/campaign/reports.js';
import { lockOwnedStory } from '../../../packages/story-engine/dist/stories/persistence.js';
import { createStorytellerRuntime } from '../../../packages/story-engine/dist/storyteller/runtime.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

function quayCharacter() {
  return {
    name: 'A quay runner',
    scores: {
      strength: 10,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 12,
      charisma: 14,
    },
    applicableAbilities: [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ],
    skills: [{ id: 'persuasion', label: 'Persuasion' }],
    proficientSkills: ['persuasion'],
    proficiencyBonus: 2,
    hp: 10,
    maxHp: 10,
    facts: [],
    quantities: [],
  };
}

async function withDisposable(run) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
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

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'ENG03-T05', `${ownerId}@example.test`],
  );
}

async function seedActivityReportStory(database, storage) {
  const ownerId = `eng03t05-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor report',
    paragraphs: ['A beacon repair completes quietly.'],
  };
  const premise = {
    title: 'Harbor report',
    premise: 'A quay runner finishes beacon work.',
    storytellingDirection: 'Keep reports factual.',
  };
  const staged = await stageStoryBootstrapDocuments({
    storage,
    storyId,
    passageId,
    sequence: 1,
    operationId: storyId,
    rootHash: null,
    rootRevision: 0,
    content,
    premise,
    items: [],
  });
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise,
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content,
        interaction: null,
      },
      stagedPassage: staged,
    });
    await initializeCampaign(
      tx,
      storyId,
      profile,
      {
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
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      },
      {
        character: quayCharacter(),
        storyFacts: [],
        plans: [],
        activityAccess: { kind: 'none' },
      },
    );
  });

  const activityId = randomUUID();
  await database.db.insert(gameActivity).values({
    id: activityId,
    storyId,
    plan: {
      version: 1,
      label: 'Repair the beacon',
      steps: [],
    },
    state: 'complete',
    boundariesSettled: 1,
    revision: 2,
    progress: { process: { kind: 'clock-wait.v1', elapsedFictionalSeconds: 5 } },
  });

  const stories = createStories(database, { documentStore: storage });
  const current = await lockOwnedStory(database.db, { storyId, ownerId });
  const [campaignState] = await database.db
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, storyId));
  const [activity] = await database.db
    .select()
    .from(gameActivity)
    .where(eq(gameActivity.id, activityId));
  const [passage] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, current.revision)),
    );

  let hookId;
  await database.db.transaction(async (tx) => {
    await requestActivityReport(tx, {
      current,
      state: campaignState,
      activity,
      passageId: passage.id,
      label: 'Beacon repair report',
      intention: 'Summarize the completed beacon work.',
      factualSummary: 'The beacon stayed lit after the repair.',
      completionEffects: [],
    });
    const [report] = await tx
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.storyId, storyId));
    assert.equal(report.state, 'generating');
    hookId = report.id;
  });

  return { ownerId, storyId, hookId, stories, passageId: passage.id, activity };
}

async function seedWorldObligationReportStory(database, storage) {
  const ownerId = `eng03t05wo-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor obligation report',
    paragraphs: ['A quiet world transition completes.'],
  };
  const premise = {
    title: 'Harbor obligation report',
    premise: 'A quay runner notes a fired world obligation.',
    storytellingDirection: 'Keep reports factual.',
  };
  const staged = await stageStoryBootstrapDocuments({
    storage,
    storyId,
    passageId,
    sequence: 1,
    operationId: storyId,
    rootHash: null,
    rootRevision: 0,
    content,
    premise,
    items: [],
  });
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise,
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content,
        interaction: null,
      },
      stagedPassage: staged,
    });
    await initializeCampaign(
      tx,
      storyId,
      profile,
      {
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
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      },
      {
        character: quayCharacter(),
        storyFacts: [],
        plans: [],
        activityAccess: { kind: 'none' },
      },
    );
  });

  const obligationId = randomUUID();
  const obligationRevision = 2;
  const dueGameSecond = 900;
  await database.db.insert(worldObligation).values({
    id: obligationId,
    storyId,
    revision: obligationRevision,
    definition: {
      id: obligationId,
      revision: obligationRevision,
      label: 'The watch bell',
      followUp: 'report',
      dueGameSecond,
    },
    dueGameSecond,
    state: 'fired',
    firedAtGameSecond: dueGameSecond,
  });

  const stories = createStories(database, { documentStore: storage });
  const current = await lockOwnedStory(database.db, { storyId, ownerId });
  const [campaignState] = await database.db
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, storyId));
  const [passage] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, current.revision)),
    );

  let hookId;
  await database.db.transaction(async (tx) => {
    await requestWorldObligationReport(tx, {
      current,
      state: campaignState,
      passageId: passage.id,
      obligationId,
      obligationRevision,
      dueGameSecond,
      label: 'Watch bell report',
      factualSummary:
        'The watch bell condition became true at fictional second 900.',
    });
    const [report] = await tx
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.storyId, storyId));
    assert.equal(report.state, 'generating');
    hookId = report.id;
  });

  return {
    ownerId,
    storyId,
    hookId,
    stories,
    passageId: passage.id,
    obligationId,
    obligationRevision,
    dueGameSecond,
    campaignState,
    current,
  };
}

test('ENG03-T05: activity historical report captures off-lock and promotes after scene advance', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t05-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityReportStory(database, storage);

    const [reportBefore] = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, seeded.hookId));
    const generationId = reportBefore.generationId;
    assert.ok(generationId);

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    const capture = activityHistoricalReportContextCaptureV1Schema.parse(
      captureRow.capture,
    );
    assert.equal(capture.purpose, 'historical-report');
    assert.equal(capture.sourceKind, 'campaign-activity-report');
    assert.equal(parseContextCapture(captureRow.capture).purpose, 'historical-report');

    const [provisional] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(provisional.kind, storytellerContextCaptureKind);

    await database.db
      .update(story)
      .set({ revision: 2, viewVersion: 2 })
      .where(eq(story.id, seeded.storyId));

    await seeded.stories.prepareCampaignConsequence(seeded.hookId);

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(promoted.kind, storytellerKind);
    assert.equal(promoted.input.task, 'report');
    assert.equal(promoted.input.source.hookId, seeded.hookId);
    assert.equal(promoted.input.source.narrativeRevision, 1);

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);

    await database.db.transaction(async (tx) => {
      await requestActivityReport(tx, {
        current: await lockOwnedStory(tx, {
          storyId: seeded.storyId,
          ownerId: seeded.ownerId,
        }),
        state: (
          await tx
            .select()
            .from(campaign)
            .where(eq(campaign.storyId, seeded.storyId))
        )[0],
        activity: seeded.activity,
        passageId: seeded.passageId,
        label: 'Beacon repair report',
        intention: 'Summarize the completed beacon work.',
        factualSummary: 'The beacon stayed lit after the repair.',
        completionEffects: [],
      });
    });
    const afterRetry = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(afterRetry.length, 1);
  });
});

test('ENG03-T05: historical report publication fences frozen source revision', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t05-pub-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityReportStory(database, storage);

    const [reportBefore] = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, seeded.hookId));
    const generationId = reportBefore.generationId;
    assert.ok(generationId);

    await seeded.stories.prepareCampaignConsequence(seeded.hookId);
    await seeded.stories.prepareCampaignConsequence(seeded.hookId);

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(promoted.kind, storytellerKind);
    assert.equal(promoted.input.task, 'report');
    assert.equal(promoted.input.source.narrativeRevision, 1);

    await database.db
      .update(story)
      .set({ revision: 2, viewVersion: 2 })
      .where(eq(story.id, seeded.storyId));

    const [liveStory] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, seeded.storyId));
    assert.equal(liveStory.revision, 2);

    const storyteller = createStorytellerRuntime(database, {
      documentStore: storage,
    });
    await storyteller.complete(generationId);

    const [publication] = await database.db
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, generationId));
    assert.equal(publication.state, 'published');

    const [report] = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, seeded.hookId));
    assert.equal(report.state, 'published');
    assert.equal(report.sourceRevision, 1);
    assert.ok(report.report);
    assert.equal(report.generationId, generationId);

    await storyteller.complete(generationId);

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);
  });
});

test('ENG03-T05: missing preserved root holds optional prose while report intent remains', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t05-held-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityReportStory(database, storage);

    const [row] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, seeded.hookId));
    const capture = activityHistoricalReportContextCaptureV1Schema.parse(
      row.capture,
    );
    const patched = {
      ...capture,
      root: { hash: null, revision: 0 },
      sourcePassages: capture.sourcePassages.map((passage) => ({
        storage: 'cas',
        passageId: passage.passageId,
        sequence: passage.sequence,
        contentHash: 'f'.repeat(64),
        inlineContent: null,
        response: passage.response,
      })),
    };
    await database.db
      .update(storytellerContextCapture)
      .set({
        capture: patched,
        captureSha256: hashContextCapture(patched),
      })
      .where(eq(storytellerContextCapture.captureId, row.captureId));

    const stories = createStories(database, { documentStore: storage });
    for (let attempt = 0; attempt < 3; attempt++) {
      await stories.prepareCampaignConsequence(seeded.hookId);
    }

    const [report] = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, seeded.hookId));
    assert.equal(report.state, 'generating');

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, report.generationId));
    assert.equal(captureRow.state, 'held');
    assert.equal(captureRow.failureCode, 'missing_historical_root');
  });
});

test('ENG03-T05: world-obligation historical report captures one row and generation', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t05-wo-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedWorldObligationReportStory(database, storage);

    const reports = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.storyId, seeded.storyId));
    assert.equal(reports.length, 1);
    const report = reports[0];
    assert.equal(report.id, seeded.hookId);
    assert.ok(report.generationId);

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);
    assert.equal(generations[0].id, report.generationId);

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, report.generationId));
    const capture = worldObligationHistoricalReportContextCaptureV1Schema.parse(
      captureRow.capture,
    );
    assert.equal(capture.sourceKind, 'campaign-world-obligation-report');
    assert.equal(parseContextCapture(captureRow.capture).purpose, 'historical-report');

    const [provisional] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, report.generationId));
    assert.equal(provisional.kind, storytellerContextCaptureKind);
  });
});

test('ENG03-T05: world-obligation report source conflict leaves mechanical row', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t05-wo-conflict-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedWorldObligationReportStory(database, storage);

    const before = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, seeded.hookId));
    assert.equal(before.length, 1);
    const originalGenerationId = before[0].generationId;
    assert.ok(originalGenerationId);
    const conflictedSource = {
      kind: 'world-obligation',
      obligationId: seeded.obligationId,
      obligationRevision: seeded.obligationRevision + 1,
    };
    await database.db
      .update(campaignReport)
      .set({ source: conflictedSource })
      .where(eq(campaignReport.id, seeded.hookId));

    await assert.rejects(
      () =>
        database.db.transaction(async (tx) => {
          const current = await lockOwnedStory(tx, {
            storyId: seeded.storyId,
            ownerId: seeded.ownerId,
          });
          const [state] = await tx
            .select()
            .from(campaign)
            .where(eq(campaign.storyId, seeded.storyId));
          await requestWorldObligationReport(tx, {
            current,
            state,
            passageId: seeded.passageId,
            obligationId: seeded.obligationId,
            obligationRevision: seeded.obligationRevision,
            dueGameSecond: seeded.dueGameSecond,
            label: 'Watch bell report',
            factualSummary: 'Conflicting stored source must not replace the hook.',
          });
        }),
      /report_source_conflict/,
    );

    const after = await database.db
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.storyId, seeded.storyId));
    assert.equal(after.length, 1);
    assert.equal(after[0].id, seeded.hookId);
    assert.equal(after[0].generationId, originalGenerationId);
    assert.equal(after[0].state, 'generating');

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);
  });
});