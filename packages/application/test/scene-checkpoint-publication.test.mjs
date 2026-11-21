import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  story,
  storyDocumentCommit,
  storyItem,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import { outbox } from '@offscreen/db/outbox-schema';
import { campaign, campaignSettings } from '@offscreen/db/campaign-schema';
import { DocumentStorageError, LocalDocumentStore } from '@offscreen/documents';
import { generation } from '@offscreen/db/generation-schema';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { validateStorytellerResult } from '@offscreen/storyteller/tasks';
import { storytellerKind } from '../dist/storyteller/records.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import {
  scriptedTimedContinuation,
  storyContinuationFromGeneratedResult,
} from '../dist/generations/scripted-continuations.js';
import { StoryError } from '../dist/stories/errors.js';
import { createStoryInitialization } from '../dist/stories/initialization.js';
import {
  commitStoryContinuation,
  stageSupportedContinuationCheckpoint,
} from '../dist/stories/continuation.js';
import { checkpointWriterStore } from '../dist/stories/scene-checkpoint.js';
import { stageStoryPublicationDocuments } from '../dist/stories/passage-documents.js';
import { readSceneCheckpointReference } from '../dist/stories/scene-checkpoint.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import { publishStorytellerResult } from '../dist/storyteller/publication.js';
import { createStories } from '../dist/stories/index.js';
import { storyResolution } from '@offscreen/db/story-schema';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const openingContent = {
  version: 1,
  title: 'Opening',
  paragraphs: ['The king is alive.'],
};

function choice() {
  return {
    kind: 'choice.v1',
    prompt: 'What do you attempt?',
    options: [
      { id: 'inspect-change', label: 'Inspect the change' },
      { id: 'continue-cautiously', label: 'Continue cautiously' },
    ],
  };
}

function failingCheckpointStore(inner) {
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'putSceneCheckpoint') {
        return async () => {
          throw new DocumentStorageError('unavailable');
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
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
    [ownerId, 'DATA03', `${ownerId}@example.test`],
  );
}

function objectPath(root, hash) {
  return join(root, 'objects', 'sha256', hash.slice(0, 2), `${hash}.json`);
}

test('a failed checkpoint write leaves no story row and no selector', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data03-fail-'));
  const store = failingCheckpointStore(new LocalDocumentStore(root));
  await withDisposable(async (database) => {
    const ownerId = `data03-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    const initialize = createStoryInitialization(database, store);
    await assert.rejects(
      () =>
        initialize({
          ownerId,
          storyId,
          initial: {
            source: 'playable.opening.v1',
            items: [],
            content: openingContent,
            interaction: null,
          },
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'unavailable' &&
        error.reason === 'checkpoint_store_unavailable',
    );
    const [storyRow] = await database.db
      .select({ id: story.id })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(storyRow, undefined);
    const selectors = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    assert.equal(selectors.length, 0);
  });
});

test('opening and continuation commit one checkpoint per scene and keep the prior bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data03-commit-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `data03-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    const initialize = createStoryInitialization(database, store);
    await initialize({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        premise: null,
        items: [],
        content: openingContent,
        interaction: null,
      },
    });
    const openingRows = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    assert.equal(openingRows.length, 1);
    assert.equal(openingRows[0].sceneSequence, 1);
    const opening = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId,
        sceneSequence: 1,
        documentStore: store,
      }),
    );
    const [storyRow] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(opening.checkpoint.source, 'playable.opening.v1');
    assert.equal(opening.checkpoint.canon.rootHash, storyRow.documentRootHash);
    assert.equal(
      opening.checkpoint.canon.rootRevision,
      storyRow.documentRootRevision,
    );
    assert.equal(opening.checkpoint.format, 'offscreen.scene-checkpoint.v2');
    assert.equal(opening.checkpoint.fictionalState.mechanicsAbsent, true);
    const openingBytes = await readFile(
      objectPath(root, opening.checkpointHash),
      'utf8',
    );

    await database.db.transaction(async (tx) => {
      await initializeCampaign(tx, storyId, profile, {
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
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      });
      await tx
        .update(campaign)
        .set({
          character: {
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
            hp: 20,
            maxHp: 20,
            facts: [],
            quantities: [],
          },
        })
        .where(eq(campaign.storyId, storyId));
    });
    await database.db.insert(storyItem).values({
      storyId,
      key: 'sword-a',
      label: 'Sword',
      holderKey: 'character',
    });

    const transitionId = randomUUID();
    const stagedDocuments = await stageStoryPublicationDocuments({
      storage: store,
      storyId,
      passageId: randomUUID(),
      sequence: 2,
      operationId: transitionId,
      rootHash: storyRow.documentRootHash,
      rootRevision: storyRow.documentRootRevision,
      content: {
        version: 1,
        title: 'The sword changes hands',
        paragraphs: ['The king is dead.'],
      },
      changes: [
        {
          operation: 'create',
          path: 'world/facts/king.md',
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
          title: 'The king',
          body: 'The king is dead.',
          reason: 'The admitted scene recorded the death.',
        },
      ],
    });
    const writer = checkpointWriterStore(store);
    assert.ok(writer);
    const input = {
      expectedRevision: 1,
      effects: [
        {
          kind: 'item.transfer.v1',
          itemKey: 'sword-a',
          fromHolder: 'character',
          toHolder: 'ground',
        },
      ],
      content: {
        version: 1,
        title: 'The sword changes hands',
        paragraphs: ['The king is dead.'],
      },
      interaction: null,
      response: null,
      wait: null,
      decision: null,
    };
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      writer,
      {
        ownerId,
        storyId,
        transitionId,
        input,
        passageId: stagedDocuments.passageId,
        contentDocumentHash: stagedDocuments.passageObjectHash,
        nextRootHash: stagedDocuments.rootHash,
        nextRootRevision: stagedDocuments.rootRevision,
        baseRootHash: stagedDocuments.baseRootHash,
        baseRootRevision: stagedDocuments.baseRootRevision,
      },
    );
    assert.ok(staged);
    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, {
        ownerId,
        storyId,
        transitionId,
        input,
        completingIntervalPassageId: undefined,
        completingDecisionPassageId: undefined,
        stagedDocuments,
        stagedCheckpoint: staged,
      }),
    );
    const rows = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    assert.equal(rows.length, 2);
    const scene2 = rows.find((row) => row.sceneSequence === 2);
    assert.ok(scene2);
    assert.equal(scene2.canonRootHash, stagedDocuments.rootHash);
    assert.notEqual(scene2.canonRootHash, opening.checkpoint.canon.rootHash);
    const continued = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId,
        sceneSequence: 2,
        documentStore: store,
      }),
    );
    assert.equal(continued.checkpoint.format, 'offscreen.scene-checkpoint.v2');
    assert.equal(continued.checkpoint.fictionalState.mechanicsAbsent, false);
    assert.equal(continued.checkpoint.fictionalState.character.hp, 20);
    assert.deepEqual(continued.checkpoint.fictionalState.items, [
      { key: 'sword-a', label: 'Sword', holderKey: 'ground' },
    ]);
    assert.equal(continued.checkpoint.passage.decisionPlan, null);
    assert.equal(continued.checkpoint.passage.waitPlan, null);
    assert.equal(
      await readFile(objectPath(root, opening.checkpointHash), 'utf8'),
      openingBytes,
    );

    const retry = await stageSupportedContinuationCheckpoint(database, writer, {
      ownerId,
      storyId,
      transitionId,
      input: { ...input, expectedRevision: 2 },
      passageId: stagedDocuments.passageId,
      contentDocumentHash: stagedDocuments.passageObjectHash,
      nextRootHash: stagedDocuments.rootHash,
      nextRootRevision: stagedDocuments.rootRevision,
      baseRootHash: stagedDocuments.baseRootHash,
      baseRootRevision: stagedDocuments.baseRootRevision,
    });
    assert.equal(retry, undefined);
    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, {
        ownerId,
        storyId,
        transitionId,
        input,
        completingIntervalPassageId: undefined,
        completingDecisionPassageId: undefined,
        stagedDocuments,
      }),
    );
    const afterRetry = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    assert.equal(afterRetry.length, 2);
    assert.equal(
      afterRetry.filter((row) => row.canonRootHash === stagedDocuments.rootHash)
        .length,
      1,
    );
    assert.equal(
      await readFile(objectPath(root, opening.checkpointHash), 'utf8'),
      openingBytes,
    );
  });
});

test('idempotent continuation retry advances a lagging story revision', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data03-retry-rev-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `data03-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    await createStoryInitialization(
      database,
      store,
    )({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        items: [],
        content: openingContent,
        interaction: choice(),
      },
    });
    const transitionId = randomUUID();
    const input = {
      expectedRevision: 1,
      effects: [],
      content: {
        version: 1,
        title: 'After the choice',
        paragraphs: ['You inspect the change.'],
      },
      interaction: null,
      response: {
        interactionId: (
          await database.db
            .select({ interaction: storyPassage.interaction })
            .from(storyPassage)
            .where(eq(storyPassage.storyId, storyId))
        )[0].interaction.id,
        answer: { kind: 'choice.v1', optionId: 'inspect-change' },
      },
      wait: null,
      decision: null,
      sourceGenerationId: null,
      sourceGenerationPart: null,
    };
    const commitArgs = {
      ownerId,
      storyId,
      transitionId,
      input,
      completingIntervalPassageId: undefined,
      completingDecisionPassageId: undefined,
    };
    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, commitArgs),
    );
    const [afterFirstCommit] = await database.db
      .select({ revision: story.revision, viewVersion: story.viewVersion })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(afterFirstCommit.revision, 2);

    await database.db
      .update(story)
      .set({ revision: 1 })
      .where(eq(story.id, storyId));

    const passageCountBefore = (
      await database.db
        .select({ id: storyPassage.id })
        .from(storyPassage)
        .where(eq(storyPassage.storyId, storyId))
    ).length;

    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, commitArgs),
    );
    const [afterRetry] = await database.db
      .select({ revision: story.revision, viewVersion: story.viewVersion })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(afterRetry.revision, 2);
    assert.ok(afterRetry.viewVersion > afterFirstCommit.viewVersion);
    const passageCountAfter = (
      await database.db
        .select({ id: storyPassage.id })
        .from(storyPassage)
        .where(eq(storyPassage.storyId, storyId))
    ).length;
    assert.equal(passageCountAfter, passageCountBefore);

    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, commitArgs),
    );
    const [afterSecondRetry] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(afterSecondRetry.revision, 2);

    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          commitStoryContinuation(tx, {
            ...commitArgs,
            input: {
              ...input,
              content: {
                ...input.content,
                paragraphs: ['Different prose on retry.'],
              },
            },
          }),
        ),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
  });
});

test('a scripted continuation commits when the suggestion field is absent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data03-scripted-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `data03-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    await createStoryInitialization(
      database,
      store,
    )({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        items: [],
        content: openingContent,
        interaction: choice(),
      },
    });
    const [passage] = await database.db
      .select()
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    const proposed = storyContinuationFromGeneratedResult({
      output: scriptedTimedContinuation,
      response: {
        interactionId: passage.interaction.id,
        answer: { kind: 'choice.v1', optionId: 'inspect-change' },
      },
      generationId: randomUUID(),
    });
    assert.equal(Object.hasOwn(proposed, 'suggestion'), false);
    assert.equal(Object.hasOwn(proposed, 'appearanceSuggestion'), false);
    const before = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, {
        ownerId,
        storyId,
        transitionId: randomUUID(),
        input: {
          ...proposed,
          expectedRevision: 1,
          sourceGenerationId: null,
          sourceGenerationPart: null,
        },
        completingIntervalPassageId: undefined,
        completingDecisionPassageId: undefined,
      }),
    );
    const [advanced] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(advanced.revision, 2);
    const [continued] = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 2)),
      );
    assert.ok(continued);
    const after = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    assert.equal(after.length, before.length);
  });
});

test('document-staged continuation commits after storyteller notes publish when checkpoint staged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data03-notes-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `data03-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    const initialize = createStoryInitialization(database, store);
    await initialize({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        premise: null,
        items: [],
        content: openingContent,
        interaction: null,
      },
    });
    await database.db.transaction(async (tx) => {
      await initializeCampaign(tx, storyId, profile, {
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
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      });
      await tx
        .update(campaign)
        .set({
          character: {
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
            hp: 20,
            maxHp: 20,
            facts: [],
            quantities: [],
          },
        })
        .where(eq(campaign.storyId, storyId));
    });
    await database.db
      .update(story)
      .set({ storyteller: profile, continuityNotes: [] })
      .where(eq(story.id, storyId));
    await database.db.insert(storyItem).values({
      storyId,
      key: 'sword-a',
      label: 'Sword',
      holderKey: 'character',
    });

    const [storyRow] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, storyId));
    const generationId = randomUUID();
    const task = createRequestAuditFixtureCases({
      caseIds: ['scene-continuation'],
      profile: { id: profile.id, revision: profile.revision },
    })[0].task;
    const baseline = scriptedStorytellerResult(task);
    const storytellerOutput = validateStorytellerResult(task, {
      ...baseline,
      currentNotes: [
        {
          kind: 'create',
          key: 'gary-watch',
          text: 'Gary is watching the delivery.',
          evidence: ['current'],
        },
      ],
    });
    await database.db.insert(generation).values({
      id: generationId,
      ownerId,
      kind: storytellerKind,
      state: 'succeeded',
      attemptId: randomUUID(),
      input: task,
      output: storytellerOutput,
    });

    const transitionId = randomUUID();
    const stagedDocuments = await stageStoryPublicationDocuments({
      storage: store,
      storyId,
      passageId: randomUUID(),
      sequence: 2,
      operationId: transitionId,
      rootHash: storyRow.documentRootHash,
      rootRevision: storyRow.documentRootRevision,
      content: {
        version: 1,
        title: 'Gary answers',
        paragraphs: ['Gary mutters about the crate.'],
      },
      changes: [],
    });
    const writer = checkpointWriterStore(store);
    assert.ok(writer);
    const input = {
      expectedRevision: 1,
      effects: [
        {
          kind: 'item.transfer.v1',
          itemKey: 'sword-a',
          fromHolder: 'character',
          toHolder: 'ground',
        },
      ],
      content: {
        version: 1,
        title: 'Gary answers',
        paragraphs: ['Gary mutters about the crate.'],
      },
      interaction: null,
      response: null,
      wait: null,
      decision: null,
      sourceGenerationId: generationId,
      sourceGenerationPart: 'current',
    };
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      writer,
      {
        ownerId,
        storyId,
        transitionId,
        input,
        passageId: stagedDocuments.passageId,
        contentDocumentHash: stagedDocuments.passageObjectHash,
        nextRootHash: stagedDocuments.rootHash,
        nextRootRevision: stagedDocuments.rootRevision,
        baseRootHash: stagedDocuments.baseRootHash,
        baseRootRevision: stagedDocuments.baseRootRevision,
      },
    );
    assert.ok(staged);
    // Before the notes-publish reorder, publishStorytellerNotes ran before
    // lockedCheckpointMatches and this commit threw StoryError conflict
    // stale_story_revision because checkpointNotes([]) no longer matched.
    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, {
        ownerId,
        storyId,
        transitionId,
        input,
        completingIntervalPassageId: undefined,
        completingDecisionPassageId: undefined,
        stagedDocuments,
        stagedCheckpoint: staged,
        sourceGenerationId: generationId,
      }),
    );

    const [advanced] = await database.db
      .select({
        revision: story.revision,
        continuityNotes: story.continuityNotes,
      })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(advanced.revision, 2);
    const notes = continuityNotesSchema.parse(advanced.continuityNotes);
    assert.ok(notes.some((note) => note.key === 'gary-watch'));
    const [continued] = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 2)),
      );
    assert.ok(continued);
    const selectors = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    assert.equal(selectors.filter((row) => row.sceneSequence === 2).length, 1);
    const published = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId,
        sceneSequence: 2,
        documentStore: store,
      }),
    );
    assert.equal(published.checkpoint.format, 'offscreen.scene-checkpoint.v2');
    const checkpointNotes = continuityNotesSchema.parse(
      published.checkpoint.fictionalState.continuityNotes,
    );
    assert.ok(checkpointNotes.some((note) => note.key === 'gary-watch'));
    const secondStage = await stageSupportedContinuationCheckpoint(
      database,
      writer,
      {
        ownerId,
        storyId,
        transitionId,
        input,
        passageId: stagedDocuments.passageId,
        contentDocumentHash: stagedDocuments.passageObjectHash,
        nextRootHash: stagedDocuments.rootHash,
        nextRootRevision: stagedDocuments.rootRevision,
        baseRootHash: stagedDocuments.baseRootHash,
        baseRootRevision: stagedDocuments.baseRootRevision,
      },
    );
    assert.equal(secondStage, undefined);
    const selectorRow = selectors.find((row) => row.sceneSequence === 2);
    await database.db.transaction((tx) =>
      commitStoryContinuation(tx, {
        ownerId,
        storyId,
        transitionId,
        input,
        completingIntervalPassageId: undefined,
        completingDecisionPassageId: undefined,
        stagedDocuments,
        stagedCheckpoint: staged,
        sourceGenerationId: generationId,
      }),
    );
    const selectorsAfterRetry = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, storyId),
          eq(storySceneCheckpoint.sceneSequence, 2),
        ),
      );
    assert.equal(selectorsAfterRetry.length, 1);
    assert.equal(
      selectorsAfterRetry[0].checkpointHash,
      selectorRow.checkpointHash,
    );
  });
});

test('continuation wait and decision plans round-trip in v2 passage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-plans-'));
  const store = new LocalDocumentStore(root);
  const decisionPlan = {
    version: 1,
    responseDurationMs: 60_000,
    defaultOptionId: 'continue-cautiously',
    outcome: {
      content: {
        version: 1,
        title: 'Decision outcome',
        paragraphs: ['The quay settles.'],
      },
      interaction: null,
    },
  };
  const waitPlan = {
    version: 1,
    realDurationMs: 120_000,
    gameDurationMs: 3600,
    arrival: {
      content: {
        version: 1,
        title: 'After the wait',
        paragraphs: ['Morning arrives on the docks.'],
      },
      interaction: null,
    },
  };
  await withDisposable(async (database) => {
    const ownerId = `wr05p2-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    await createStoryInitialization(
      database,
      store,
    )({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        items: [],
        content: openingContent,
        interaction: null,
      },
    });
    const writer = checkpointWriterStore(store);
    assert.ok(writer);
    const transitionId = randomUUID();
    const stagedDecision = await stageSupportedContinuationCheckpoint(
      database,
      writer,
      {
        ownerId,
        storyId,
        transitionId,
        input: {
          expectedRevision: 1,
          effects: [],
          content: {
            version: 1,
            title: 'A fork',
            paragraphs: ['You hesitate at the quay.'],
          },
          interaction: null,
          response: null,
          wait: null,
          decision: decisionPlan,
          sourceGenerationId: null,
          sourceGenerationPart: null,
        },
      },
    );
    assert.ok(stagedDecision);
    assert.equal(
      stagedDecision.checkpoint.format,
      'offscreen.scene-checkpoint.v2',
    );
    assert.equal(stagedDecision.checkpoint.passage.decisionPlan.version, 1);
    assert.equal(
      stagedDecision.checkpoint.passage.decisionPlan.body.defaultOptionId,
      'continue-cautiously',
    );
    const transitionWait = randomUUID();
    const stagedWait = await stageSupportedContinuationCheckpoint(
      database,
      writer,
      {
        ownerId,
        storyId,
        transitionId: transitionWait,
        input: {
          expectedRevision: 1,
          effects: [],
          content: {
            version: 1,
            title: 'A pause',
            paragraphs: ['You wait beside the canal.'],
          },
          interaction: null,
          response: null,
          wait: waitPlan,
          decision: null,
          sourceGenerationId: null,
          sourceGenerationPart: null,
        },
      },
    );
    assert.ok(stagedWait);
    assert.equal(stagedWait.checkpoint.format, 'offscreen.scene-checkpoint.v2');
    assert.equal(
      stagedWait.checkpoint.passage.waitPlan.body.realDurationMs,
      120_000,
    );
  });
});

test('tampered post-state between staging and lock rolls back all SQL rows', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-tamper-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `wr05p2-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    const initialize = createStoryInitialization(database, store);
    await initialize({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        premise: null,
        items: [],
        content: openingContent,
        interaction: null,
      },
    });
    await database.db.transaction(async (tx) => {
      await initializeCampaign(tx, storyId, profile, {
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
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      });
    });
    const [storyRow] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, storyId));
    const transitionId = randomUUID();
    const stagedDocuments = await stageStoryPublicationDocuments({
      storage: store,
      storyId,
      passageId: randomUUID(),
      sequence: 2,
      operationId: transitionId,
      rootHash: storyRow.documentRootHash,
      rootRevision: storyRow.documentRootRevision,
      content: {
        version: 1,
        title: 'Mutiny',
        paragraphs: ['A different offer should not commit.'],
      },
      changes: [],
    });
    const writer = checkpointWriterStore(store);
    assert.ok(writer);
    const input = {
      expectedRevision: 1,
      effects: [],
      content: {
        version: 1,
        title: 'Mutiny',
        paragraphs: ['A different offer should not commit.'],
      },
      interaction: null,
      response: null,
      wait: null,
      decision: null,
      sourceGenerationId: null,
      sourceGenerationPart: null,
    };
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      writer,
      {
        ownerId,
        storyId,
        transitionId,
        input,
        passageId: stagedDocuments.passageId,
        contentDocumentHash: stagedDocuments.passageObjectHash,
        nextRootHash: stagedDocuments.rootHash,
        nextRootRevision: stagedDocuments.rootRevision,
        baseRootHash: stagedDocuments.baseRootHash,
        baseRootRevision: stagedDocuments.baseRootRevision,
      },
    );
    assert.ok(staged);
    await database.db
      .update(campaign)
      .set({
        offer: {
          id: randomUUID(),
          source: 'stale-between-stage-and-lock',
          meaning: 'conflict',
          payload: { revision: 99 },
        },
      })
      .where(eq(campaign.storyId, storyId));
    const passagesBefore = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    const selectorsBefore = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    const commitsBefore = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, storyId));
    const outboxBefore = await database.db
      .select({ id: outbox.id })
      .from(outbox);
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          commitStoryContinuation(tx, {
            ownerId,
            storyId,
            transitionId,
            input,
            completingIntervalPassageId: undefined,
            completingDecisionPassageId: undefined,
            stagedDocuments,
            stagedCheckpoint: staged,
          }),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'stale_story_revision',
    );
    const passagesAfter = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    const selectorsAfter = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, storyId));
    const commitsAfter = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, storyId));
    const outboxAfter = await database.db
      .select({ id: outbox.id })
      .from(outbox);
    const [rootAfter] = await database.db
      .select({
        documentRootHash: story.documentRootHash,
        documentRootRevision: story.documentRootRevision,
      })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(passagesAfter.length, passagesBefore.length);
    assert.equal(selectorsAfter.length, selectorsBefore.length);
    assert.equal(commitsAfter.length, commitsBefore.length);
    assert.equal(outboxAfter.length, outboxBefore.length);
    assert.equal(rootAfter.documentRootHash, storyRow.documentRootHash);
    assert.equal(rootAfter.documentRootRevision, storyRow.documentRootRevision);
  });
});

const quayCharacter = {
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
  hp: 20,
  maxHp: 20,
  facts: [],
  quantities: [],
};

async function seedConsequencePublication(database, store) {
  const ownerId = `wr05p2-cons-${randomUUID()}`;
  const storyId = randomUUID();
  await insertUser(database, ownerId);
  const initialize = createStoryInitialization(database, store);
  await initialize({
    ownerId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      premise: null,
      items: [],
      content: openingContent,
      interaction: null,
    },
  });
  await database.db.transaction(async (tx) => {
    const openingPlan = immediateActionPlanSchema.parse({
      version: 1,
      key: 'opening-wait',
      label: 'Wait and watch',
      intention: 'Watch the quay without acting yet.',
      risk: null,
      evidence: [],
      requires: [],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 5,
        outcome: {
          text: 'Nothing changes yet.',
          effects: [],
          declarations: [],
          worldEffects: [],
        },
      },
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
        character: quayCharacter,
        storyFacts: [],
        plans: [openingPlan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  await database.db
    .update(story)
    .set({
      storyteller: profile,
      execution: offlineExecution,
      continuityNotes: [],
    })
    .where(eq(story.id, storyId));
  const [passage] = await database.db
    .select()
    .from(storyPassage)
    .where(
      and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 1)),
    );
  assert.ok(passage);
  const fixture = createRequestAuditFixtureCases({
    caseIds: ['activity-consequence'],
    profile: { id: profile.id, revision: profile.revision },
  })[0];
  assert.ok(fixture);
  const passageContent = passage.content ?? openingContent;
  const evidencePassage = {
    id: passage.id,
    sequence: 1,
    content: passageContent,
    response: passage.response,
  };
  const task = {
    ...fixture.task,
    execution: offlineExecution,
    source: {
      ...fixture.task.source,
      storyId,
      narrativeRevision: 1,
      passageId: passage.id,
    },
    context: {
      ...fixture.task.context,
      current: evidencePassage,
      evidence: [evidencePassage],
      resolution: {
        ...fixture.task.context.resolution,
        character: quayCharacter,
      },
    },
  };
  const generationId = randomUUID();
  const operationId = randomUUID();
  const baseline = scriptedStorytellerResult(task);
  const output = validateStorytellerResult(task, {
    ...baseline,
    currentNotes: [
      {
        kind: 'create',
        key: 'dock-rumor',
        text: 'The dockhands trade rumors about the late ships.',
        evidence: ['current'],
      },
    ],
  });
  await database.db
    .update(campaign)
    .set({
      holds: [{ kind: 'storyteller', generationId, reason: 'required-turn' }],
      offer: null,
    })
    .where(eq(campaign.storyId, storyId));
  await database.db.insert(generation).values({
    id: generationId,
    ownerId,
    kind: storytellerKind,
    state: 'succeeded',
    attemptId: randomUUID(),
    input: task,
    output,
  });
  await database.db.insert(storyResolution).values({
    generationId,
    storyId,
    basePassageId: passage.id,
    baseRevision: 1,
    operationId,
    submission: { kind: 'committed-consequence', operationId },
  });
  return { ownerId, storyId, generationId, operationId, task, output };
}

test('consequence Storyteller publication commits v2 checkpoint with offer and notes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-consequence-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedConsequencePublication(database, store);
    await publishStorytellerResult(
      database,
      seeded.generationId,
      () => 0,
      store,
    );
    const [advanced] = await database.db
      .select({
        revision: story.revision,
        continuityNotes: story.continuityNotes,
        documentRootHash: story.documentRootHash,
      })
      .from(story)
      .where(eq(story.id, seeded.storyId));
    assert.equal(advanced.revision, 2);
    const notes = continuityNotesSchema.parse(advanced.continuityNotes);
    assert.ok(notes.some((note) => note.key === 'dock-rumor'));
    const selectors = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 2),
        ),
      );
    assert.equal(selectors.length, 1);
    const checkpoint = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId: seeded.storyId,
        sceneSequence: 2,
        documentStore: store,
      }),
    );
    assert.equal(checkpoint.checkpoint.format, 'offscreen.scene-checkpoint.v2');
    assert.equal(
      checkpoint.checkpoint.canon.rootHash,
      advanced.documentRootHash,
    );
    const checkpointNotes = continuityNotesSchema.parse(
      checkpoint.checkpoint.fictionalState.continuityNotes,
    );
    assert.ok(checkpointNotes.some((note) => note.key === 'dock-rumor'));
    const offerSnapshot = checkpoint.checkpoint.fictionalState.offer;
    assert.ok(offerSnapshot);
    assert.equal(offerSnapshot.source, 'storyteller-publication.v1');
    assert.equal(offerSnapshot.meaning, 'choose');
    assert.ok(offerSnapshot.payload.body.offer);
    assert.ok(offerSnapshot.payload.body.plans);
    await publishStorytellerResult(
      database,
      seeded.generationId,
      () => 0,
      store,
    );
    const selectorsAfterRetry = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 2),
        ),
      );
    assert.equal(selectorsAfterRetry.length, 1);
    assert.equal(
      selectorsAfterRetry[0].checkpointHash,
      selectors[0].checkpointHash,
    );
  });
});

test('consequence publication rolls back when campaign offer drifts between stage and lock', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'offscreen-wr05p2-consequence-fail-'),
  );
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedConsequencePublication(database, store);
    const originalTransaction = database.db.transaction.bind(database.db);
    let poisoned = false;
    database.db.transaction = async (fn) => {
      if (!poisoned) {
        poisoned = true;
        await database.db
          .update(campaign)
          .set({ holds: [] })
          .where(eq(campaign.storyId, seeded.storyId));
      }
      return originalTransaction(fn);
    };
    const passagesBefore = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, seeded.storyId));
    const selectorsBefore = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, seeded.storyId));
    await assert.rejects(
      () =>
        publishStorytellerResult(database, seeded.generationId, () => 0, store),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'stale_story_revision',
    );
    const passagesAfter = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, seeded.storyId));
    const selectorsAfter = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, seeded.storyId));
    assert.equal(passagesAfter.length, passagesBefore.length);
    assert.equal(selectorsAfter.length, selectorsBefore.length);
  });
});

test('WR05P2 T05: a new opening checkpoint is v2 with mechanics absent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-opening-v2-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `wr05p2-${randomUUID()}`;
    const storyId = randomUUID();
    await insertUser(database, ownerId);
    const initialize = createStoryInitialization(database, store);
    await initialize({
      ownerId,
      storyId,
      initial: {
        source: 'playable.opening.v1',
        premise: null,
        items: [],
        content: openingContent,
        interaction: choice(),
      },
    });
    const opening = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId,
        sceneSequence: 1,
        documentStore: store,
      }),
    );
    assert.equal(opening.checkpoint.format, 'offscreen.scene-checkpoint.v2');
    assert.equal(opening.checkpoint.transitionId, null);
    assert.equal(opening.checkpoint.fictionalState.mechanicsAbsent, true);
    assert.equal(
      opening.checkpoint.passage.interaction?.specification.kind,
      'choice.v1',
    );
    const stories = createStories(database, { documentStore: store });
    const historic = await stories.readHistoricalScene({
      ownerId,
      storyId,
      sequence: 1,
    });
    assert.equal(historic.canRespond, false);
    assert.equal(historic.campaign, null);
    assert.equal(historic.current.interaction?.specification.kind, 'choice.v1');
  });
});

test('WR05P2 T05: historical read keeps captured v2 offer and clock after live drift', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-historical-v2-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedConsequencePublication(database, store);
    await publishStorytellerResult(
      database,
      seeded.generationId,
      () => 0,
      store,
    );
    const stories = createStories(database, { documentStore: store });
    const first = await stories.readHistoricalScene({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      sequence: 2,
    });
    assert.ok(first.campaign?.offer);
    assert.equal(first.campaign.gameSecond, 0);
    assert.equal(first.campaign.settings.revision, 1);
    const checkpoint = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId: seeded.storyId,
        sceneSequence: 2,
        documentStore: store,
      }),
    );
    const notes = continuityNotesSchema.parse(
      checkpoint.checkpoint.fictionalState.continuityNotes,
    );
    assert.ok(notes.some((note) => note.key === 'dock-rumor'));
    await database.db
      .update(campaign)
      .set({
        gameSecond: 999,
        offer: null,
        holds: [],
      })
      .where(eq(campaign.storyId, seeded.storyId));
    await database.db.insert(campaignSettings).values({
      storyId: seeded.storyId,
      revision: 2,
      profile,
      settings: {
        ...settingsDocument(profile),
        revision: 2,
        creative: {
          ...settingsDocument(profile).creative,
          tone: 'A different tone after drift.',
        },
      },
    });
    await database.db
      .update(campaign)
      .set({ settingsRevision: 2 })
      .where(eq(campaign.storyId, seeded.storyId));
    const second = await stories.readHistoricalScene({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      sequence: 2,
    });
    assert.deepEqual(second.campaign?.offer, first.campaign?.offer);
    assert.equal(second.campaign?.gameSecond, first.campaign?.gameSecond);
    assert.equal(
      second.campaign?.settings.creative.tone,
      first.campaign?.settings.creative.tone,
    );
    assert.notEqual(
      second.campaign?.settings.creative.tone,
      'A different tone after drift.',
    );
  });
});

async function prepareStagedContinuation(database, store) {
  const ownerId = `wr05p2-t06-${randomUUID()}`;
  const storyId = randomUUID();
  await insertUser(database, ownerId);
  await createStoryInitialization(
    database,
    store,
  )({
    ownerId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      items: [],
      content: openingContent,
      interaction: null,
    },
  });
  const [storyRow] = await database.db
    .select()
    .from(story)
    .where(eq(story.id, storyId));
  const transitionId = randomUUID();
  const stagedDocuments = await stageStoryPublicationDocuments({
    storage: store,
    storyId,
    passageId: randomUUID(),
    sequence: 2,
    operationId: transitionId,
    rootHash: storyRow.documentRootHash,
    rootRevision: storyRow.documentRootRevision,
    content: {
      version: 1,
      title: 'Fault probe',
      paragraphs: ['A staged continuation.'],
    },
    changes: [],
  });
  const writer = checkpointWriterStore(store);
  assert.ok(writer);
  const input = {
    expectedRevision: 1,
    effects: [],
    content: {
      version: 1,
      title: 'Fault probe',
      paragraphs: ['A staged continuation.'],
    },
    interaction: null,
    response: null,
    wait: null,
    decision: null,
    sourceGenerationId: null,
    sourceGenerationPart: null,
  };
  return {
    ownerId,
    storyId,
    storyRow,
    transitionId,
    stagedDocuments,
    writer,
    input,
  };
}

function stagedContinuationArgs(fix, stagedDocuments, extra = {}) {
  return {
    ownerId: fix.ownerId,
    storyId: fix.storyId,
    transitionId: fix.transitionId,
    input: fix.input,
    passageId: stagedDocuments.passageId,
    contentDocumentHash: stagedDocuments.passageObjectHash,
    nextRootHash: stagedDocuments.rootHash,
    nextRootRevision: stagedDocuments.rootRevision,
    baseRootHash: stagedDocuments.baseRootHash,
    baseRootRevision: stagedDocuments.baseRootRevision,
    ...extra,
  };
}

test('WR05P2 T06: continuation staging rejects a stale document root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-t06-root-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const fix = await prepareStagedContinuation(database, store);
    const selectorsBefore = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, fix.storyId));
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      fix.writer,
      stagedContinuationArgs(fix, fix.stagedDocuments, {
        baseRootHash: `${'ff'.repeat(31)}ff`,
        baseRootRevision: fix.storyRow.documentRootRevision + 9,
      }),
    );
    assert.equal(staged, undefined);
    const selectorsAfter = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, fix.storyId));
    assert.deepEqual(selectorsAfter, selectorsBefore);
  });
});

test('WR05P2 T06: wrong owner cannot stage a continuation checkpoint', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'offscreen-wr05p2-t06-owner-stage-'),
  );
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const fix = await prepareStagedContinuation(database, store);
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      fix.writer,
      stagedContinuationArgs(fix, fix.stagedDocuments, {
        ownerId: `other-${randomUUID()}`,
      }),
    );
    assert.equal(staged, undefined);
  });
});

test('WR05P2 T06: continuation commit rejects stale document root without partial publication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-t06-doc-root-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const fix = await prepareStagedContinuation(database, store);
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      fix.writer,
      stagedContinuationArgs(fix, fix.stagedDocuments),
    );
    assert.ok(staged);
    await database.db
      .update(story)
      .set({
        documentRootHash: `${'ee'.repeat(31)}ee`,
        documentRootRevision: fix.storyRow.documentRootRevision + 3,
      })
      .where(eq(story.id, fix.storyId));
    const passagesBefore = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, fix.storyId));
    const selectorsBefore = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, fix.storyId));
    const commitsBefore = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, fix.storyId));
    const outboxBefore = await database.db
      .select({ id: outbox.id })
      .from(outbox);
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          commitStoryContinuation(tx, {
            ownerId: fix.ownerId,
            storyId: fix.storyId,
            transitionId: fix.transitionId,
            input: fix.input,
            completingIntervalPassageId: undefined,
            completingDecisionPassageId: undefined,
            stagedDocuments: fix.stagedDocuments,
            stagedCheckpoint: staged,
          }),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'document_root',
    );
    const passagesAfter = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, fix.storyId));
    const selectorsAfter = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, fix.storyId));
    const commitsAfter = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, fix.storyId));
    const outboxAfter = await database.db
      .select({ id: outbox.id })
      .from(outbox);
    assert.equal(passagesAfter.length, passagesBefore.length);
    assert.equal(selectorsAfter.length, selectorsBefore.length);
    assert.equal(commitsAfter.length, commitsBefore.length);
    assert.equal(outboxAfter.length, outboxBefore.length);
  });
});

test('WR05P2 T06: wrong owner cannot commit a staged continuation', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'offscreen-wr05p2-t06-owner-commit-'),
  );
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const fix = await prepareStagedContinuation(database, store);
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      fix.writer,
      stagedContinuationArgs(fix, fix.stagedDocuments),
    );
    assert.ok(staged);
    const passagesBefore = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, fix.storyId));
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          commitStoryContinuation(tx, {
            ownerId: `other-${randomUUID()}`,
            storyId: fix.storyId,
            transitionId: fix.transitionId,
            input: fix.input,
            completingIntervalPassageId: undefined,
            completingDecisionPassageId: undefined,
            stagedDocuments: fix.stagedDocuments,
            stagedCheckpoint: staged,
          }),
        ),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    const passagesAfter = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, fix.storyId));
    assert.equal(passagesAfter.length, passagesBefore.length);
  });
});

test('WR05P2 T06: mismatched staged checkpoint hash rolls back passage rows and selector', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr05p2-t06-hash-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const fix = await prepareStagedContinuation(database, store);
    const staged = await stageSupportedContinuationCheckpoint(
      database,
      fix.writer,
      stagedContinuationArgs(fix, fix.stagedDocuments),
    );
    assert.ok(staged);
    const selectorsBefore = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, fix.storyId));
    const commitsBefore = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, fix.storyId));
    const outboxBefore = await database.db
      .select({ id: outbox.id })
      .from(outbox);
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          commitStoryContinuation(tx, {
            ownerId: fix.ownerId,
            storyId: fix.storyId,
            transitionId: fix.transitionId,
            input: fix.input,
            completingIntervalPassageId: undefined,
            completingDecisionPassageId: undefined,
            stagedDocuments: fix.stagedDocuments,
            stagedCheckpoint: {
              ...staged,
              checkpointHash: `${'dd'.repeat(31)}dd`,
            },
          }),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    const passagesAfter = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, fix.storyId));
    const selectorsAfter = await database.db
      .select({ sceneSequence: storySceneCheckpoint.sceneSequence })
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, fix.storyId));
    const commitsAfter = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, fix.storyId));
    const outboxAfter = await database.db
      .select({ id: outbox.id })
      .from(outbox);
    assert.equal(passagesAfter.length, 1);
    assert.equal(selectorsAfter.length, selectorsBefore.length);
    assert.equal(commitsAfter.length, commitsBefore.length);
    assert.equal(outboxAfter.length, outboxBefore.length);
  });
});

test('WR05P2 T06: repeat consequence publication keeps one passage and generation attempt', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'offscreen-wr05p2-t06-idempotent-'),
  );
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedConsequencePublication(database, store);
    const [generationBefore] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, seeded.generationId));
    await publishStorytellerResult(
      database,
      seeded.generationId,
      () => 0,
      store,
    );
    const selectors = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 2),
        ),
      );
    assert.equal(selectors.length, 1);
    const passagesAfterFirst = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, seeded.storyId));
    const commitsAfterFirst = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, seeded.storyId));
    await publishStorytellerResult(
      database,
      seeded.generationId,
      () => 0,
      store,
    );
    const selectorsAfterRetry = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 2),
        ),
      );
    const passagesAfterRetry = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, seeded.storyId));
    const commitsAfterRetry = await database.db
      .select({ operationId: storyDocumentCommit.operationId })
      .from(storyDocumentCommit)
      .where(eq(storyDocumentCommit.storyId, seeded.storyId));
    const generations = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, seeded.generationId));
    assert.equal(selectorsAfterRetry.length, 1);
    assert.equal(
      selectorsAfterRetry[0].checkpointHash,
      selectors[0].checkpointHash,
    );
    assert.equal(passagesAfterRetry.length, passagesAfterFirst.length);
    assert.equal(commitsAfterRetry.length, commitsAfterFirst.length);
    assert.equal(generations.length, 1);
    assert.equal(generations[0].attemptId, generationBefore.attemptId);
  });
});

function settingsDocument(profileRef) {
  return {
    revision: 1,
    creative: {
      profile: { id: profileRef.id, revision: profileRef.revision },
      tone: 'A quay at dusk.',
      emphasis: 'balanced',
      surprises: 'occasional',
      tags: [],
      guidance: [],
    },
    pace: { kind: 'instant' },
    locked: false,
    rules: 'srd-5.2.1-subset.v1',
    risk: 'nonlethal',
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
  };
}
