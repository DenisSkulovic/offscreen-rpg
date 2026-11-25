import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import { story, storyPassage, storyResolution } from '@offscreen/story-persistence/stories';
import { storytellerPublication } from '@offscreen/story-persistence/storyteller';
import {
  offlineExecution,
  prepareStorytellerTask,
} from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  createStorytellerExecution,
  hashStorytellerCustodyResult,
} from '../../../packages/story-engine/dist/storyteller/execution.js';
import { createStorytellerSavedGenerationPublish } from '../../../packages/story-engine/dist/storyteller/saved-generation-publish.js';
import { insertStorytellerTask } from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { commitStoryContinuation } from '../../../packages/story-engine/dist/stories/continuation.js';
import {
  scriptedTimedContinuation,
  storyContinuationFromGeneratedResult,
} from '../../../packages/story-engine/dist/generations/scripted-continuations.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

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

function continuationTask({ storyId, passage, narrativeRevision }) {
  const current = {
    id: passage.id,
    sequence: passage.sequence,
    content: passage.content,
    response: 'What do you attempt?',
  };
  return prepareStorytellerTask({
    task: 'continuation',
    source: {
      storyId,
      narrativeRevision,
      passageId: passage.id,
      interactionId: passage.interaction.id,
    },
    profile,
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: 'Stale saved publish',
        premise: 'A branch captured before the story moved on.',
        storytellingDirection: '',
      },
      current,
      selected: {
        id: 'inspect-change',
        label: 'Inspect the change',
        intention: 'Look more closely at what has changed ahead.',
      },
      items: [],
      notes: [],
      evidence: [current],
    },
  });
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
    const message = error instanceof Error ? error.message : String(error);
    test.skip(`disposable sandbox unavailable: ${message}`);
    return;
  }
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
    [ownerId, 'STORY03', `${ownerId}@example.test`],
  );
}

async function seedOpeningStory(database, ownerId) {
  const storyId = randomUUID();
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise: null,
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Opening',
          paragraphs: ['The harbor is quiet.'],
        },
        interaction: choice(),
      },
    });
  });
  return storyId;
}

async function advanceStoryOnePassage(database, ownerId, storyId) {
  const [passage] = await database.db
    .select()
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  assert.ok(passage);
  const proposed = storyContinuationFromGeneratedResult({
    output: scriptedTimedContinuation,
    response: {
      interactionId: passage.interaction.id,
      answer: { kind: 'choice.v1', optionId: 'inspect-change' },
    },
    generationId: randomUUID(),
  });
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
}

async function seedSavedContinuation(database, {
  ownerId,
  storyId,
  narrativeRevision,
}) {
  const [passage] = await database.db
    .select()
    .from(storyPassage)
    .where(and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 1)));
  assert.ok(passage);
  const generationId = randomUUID();
  const task = continuationTask({ storyId, passage, narrativeRevision });
  const result = scriptedStorytellerResult(task);
  await database.db.transaction(async (tx) => {
    await insertStorytellerTask(tx, { id: generationId, ownerId, task });
    await tx.insert(storyResolution).values({
      generationId,
      storyId,
      basePassageId: passage.id,
      baseRevision: narrativeRevision,
      operationId: randomUUID(),
      submission: {
        interactionId: passage.interaction.id,
        answer: { kind: 'choice.v1', optionId: 'inspect-change' },
      },
    });
  });
  const custody = createStorytellerExecution(database, {});
  await custody.claimGeneration({ generationId, pinnedRoot: null });
  const saved = await custody.saveValidatedResult({
    generationId,
    pinnedRoot: null,
    resultHash: hashStorytellerCustodyResult(result),
    result,
  });
  assert.equal(saved.status, 'saved');
  return { generationId, task, result };
}

async function passageCount(database, storyId) {
  const rows = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  return rows.length;
}

test('saved-generation publish returns stale when narrative revision lags the story', async () => {
  await withDisposable(async (database) => {
    const ownerId = `story03-${randomUUID()}`;
    await insertUser(database, ownerId);
    const storyId = await seedOpeningStory(database, ownerId);
    await advanceStoryOnePassage(database, ownerId, storyId);
    const [beforeStory] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(beforeStory.revision, 2);
    const passagesBefore = await passageCount(database, storyId);

    const { generationId, result } = await seedSavedContinuation(database, {
      ownerId,
      storyId,
      narrativeRevision: 1,
    });
    const publish = createStorytellerSavedGenerationPublish(database, {});
    const outcome = await publish.publishSavedGeneration(generationId);
    assert.deepEqual(outcome, { status: 'stale', generationId });

    const [afterStory] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(afterStory.revision, beforeStory.revision);
    assert.equal(await passageCount(database, storyId), passagesBefore);

    const [row] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(row.state, 'succeeded');
    assert.deepEqual(row.output, result);

    const [publication] = await database.db
      .select({ state: storytellerPublication.state })
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, generationId));
    assert.equal(publication?.state, 'stale');
  });
});

test('saved-generation publish does not mark matching narrative revision stale', async () => {
  await withDisposable(async (database) => {
    const ownerId = `story03-${randomUUID()}`;
    await insertUser(database, ownerId);
    const storyId = await seedOpeningStory(database, ownerId);
    const [beforeStory] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    assert.equal(beforeStory.revision, 1);

    const { generationId } = await seedSavedContinuation(database, {
      ownerId,
      storyId,
      narrativeRevision: beforeStory.revision,
    });
    const publish = createStorytellerSavedGenerationPublish(database, {});
    const outcome = await publish.publishSavedGeneration(generationId);
    assert.notEqual(outcome.status, 'stale');

    const [publication] = await database.db
      .select({ state: storytellerPublication.state })
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, generationId));
    assert.notEqual(publication?.state, 'stale');
  });
});