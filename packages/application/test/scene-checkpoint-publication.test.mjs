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
  storyItem,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import { campaign } from '@offscreen/db/campaign-schema';
import {
  DocumentStorageError,
  LocalDocumentStore,
} from '@offscreen/documents';
import { generation } from '@offscreen/db/generation-schema';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
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
    assert.equal(opening.checkpoint.mechanics.mechanicsAbsent, true);
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
    assert.equal(continued.checkpoint.mechanics.mechanicsAbsent, false);
    assert.equal(continued.checkpoint.mechanics.character.hp, 20);
    assert.deepEqual(continued.checkpoint.mechanics.items, [
      { key: 'sword-a', label: 'Sword', holderKey: 'ground' },
    ]);
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
    await createStoryInitialization(database, store)({
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
    await createStoryInitialization(database, store)({
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
    assert.equal(
      selectors.filter((row) => row.sceneSequence === 2).length,
      1,
    );
  });
});
