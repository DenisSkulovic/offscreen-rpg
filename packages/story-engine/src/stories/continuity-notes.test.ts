import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { generation } from '@offscreen/db/generation-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import type { Transaction } from '@offscreen/db/outbox';
import { storytellerKind } from '../generations/storyteller-kinds';
import type { ContinuityNotes } from '@offscreen/storyteller/context';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  prepareStorytellerTask,
  validateStorytellerResult,
  type StorytellerResult,
  type StorytellerSceneTask,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import {
  projectStorytellerNotes,
  publishStorytellerNotes,
} from './continuity-notes';

function continuationTask(notes: ContinuityNotes = []): StorytellerSceneTask {
  const base = prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: '',
        premise: 'A spongebob pineapple morning with Gary.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes,
      evidence: [],
    },
  });
  const passage = {
    id: randomUUID(),
    sequence: 2,
    content: {
      version: 1 as const,
      title: 'After the choice',
      paragraphs: ['Something changed.'],
    },
    response: null,
  };
  return prepareStorytellerTask({
    task: 'continuation',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: passage.id,
      interactionId: randomUUID(),
    },
    profile: base.profile,
    execution: base.execution,
    context: {
      ...base.context,
      current: passage,
      evidence: [passage],
      selected: {
        id: 'ask',
        label: 'Ask Gary',
        intention: 'Ask Gary about the delivery.',
      },
      notes,
    },
  }) as StorytellerSceneTask;
}

const intervalScene = {
  version: 2 as const,
  content: {
    version: 1 as const,
    title: 'On the road',
    paragraphs: ['You set out toward the tavern.'],
  },
  next: {
    kind: 'interval' as const,
    gameDurationMs: 600_000,
    arrival: {
      content: {
        version: 1 as const,
        title: 'At the tavern',
        paragraphs: ['You reach the tavern.'],
      },
      next: {
        kind: 'choice' as const,
        prompt: 'What do you attempt?',
        options: [
          {
            id: 'listen',
            label: 'Listen',
            intention: 'Listen to the room.',
          },
          {
            id: 'leave',
            label: 'Leave',
            intention: 'Step back outside.',
          },
        ],
      },
    },
  },
};

function intervalArrivalResult(task: StorytellerSceneTask): StorytellerResult {
  return validateStorytellerResult(task, {
    version: 1,
    scene: intervalScene,
    currentNotes: [],
    arrivalNotes: [
      {
        kind: 'create',
        key: 'tavern-arrival',
        text: 'The character reached the tavern after the road interval.',
        evidence: ['arrival'],
      },
    ],
    documentChanges: [],
  });
}

function makeRecordingTx(options: {
  generationRow: {
    input: unknown;
    output: unknown;
    kind: typeof storytellerKind;
    state: 'succeeded';
  } | null;
  departure?: { id: string } | null;
}) {
  let updateCalls = 0;
  const tx = {
    select() {
      return {
        from(table: unknown) {
          return {
            where: async () => {
              if (table === generation) {
                return options.generationRow ? [options.generationRow] : [];
              }
              if (table === storyPassage) {
                return options.departure ? [options.departure] : [];
              }
              return [];
            },
          };
        },
      };
    },
    update() {
      return {
        set() {
          return {
            where: async () => {
              updateCalls += 1;
            },
          };
        },
      };
    },
    updateCalls: () => updateCalls,
  };
  return tx as unknown as Transaction & { updateCalls: () => number };
}

test('projectStorytellerNotes patches current notes from a validated scene result', () => {
  const task = continuationTask([]);
  const result = scriptedStorytellerResult(task);
  const passageId = randomUUID();
  const notes = projectStorytellerNotes({
    task,
    result,
    notes: [],
    revision: 2,
    sourcePart: 'current',
    passageId,
  });
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.key, 'gary-promise');
  assert.deepEqual(notes[0]?.sources, [passageId]);
});

test('projectStorytellerNotes patches arrival notes with departure evidence', () => {
  const task = continuationTask([]);
  const result = intervalArrivalResult(task);
  const arrivalId = randomUUID();
  const departureId = randomUUID();
  const notes = projectStorytellerNotes({
    task,
    result,
    notes: [],
    revision: 3,
    sourcePart: 'arrival',
    passageId: arrivalId,
    departurePassageId: departureId,
  });
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.key, 'tavern-arrival');
  assert.deepEqual(notes[0]?.sources, [arrivalId]);
});

test('projectStorytellerNotes rejects a stale continuity base', () => {
  const task = continuationTask([]);
  const result = scriptedStorytellerResult(task);
  assert.throws(
    () =>
      projectStorytellerNotes({
        task,
        result,
        notes: [{ bogus: true }],
        revision: 2,
        sourcePart: 'current',
        passageId: randomUUID(),
      }),
    { message: 'Stale continuity base' },
  );
});

test('projectStorytellerNotes rejects historical report tasks', () => {
  assert.throws(
    () =>
      projectStorytellerNotes({
        task: { task: 'report' } as StorytellerTask,
        result: {
          version: 1,
          scene: intervalScene,
          currentNotes: [],
          arrivalNotes: [],
          documentChanges: [],
        },
        notes: [],
        revision: 1,
        sourcePart: 'current',
        passageId: randomUUID(),
      }),
    { message: 'Historical reports do not publish continuity notes' },
  );
});

test('projectStorytellerNotes rejects missing departure and non-interval arrival', () => {
  const task = continuationTask([]);
  const immediate = scriptedStorytellerResult(task);
  const arrivalId = randomUUID();
  assert.throws(
    () =>
      projectStorytellerNotes({
        task,
        result: immediate,
        notes: [],
        revision: 2,
        sourcePart: 'arrival',
        passageId: arrivalId,
      }),
    { message: 'Missing continuity departure' },
  );
  const interval = intervalArrivalResult(task);
  assert.throws(
    () =>
      projectStorytellerNotes({
        task,
        result: interval,
        notes: [],
        revision: 2,
        sourcePart: 'arrival',
        passageId: arrivalId,
      }),
    { message: 'Missing continuity departure' },
  );
});

test('projectStorytellerNotes rejects source part evidence mismatch', () => {
  const task = continuationTask([]);
  const validated = scriptedStorytellerResult(task);
  const result: StorytellerResult = {
    ...validated,
    currentNotes: [
      {
        kind: 'create',
        key: 'wrong-slice',
        text: 'Arrival-only evidence on the current slice.',
        evidence: ['arrival'],
      },
    ],
  };
  assert.throws(
    () =>
      projectStorytellerNotes({
        task,
        result,
        notes: [],
        revision: 2,
        sourcePart: 'current',
        passageId: randomUUID(),
      }),
    /Unknown continuity evidence/,
  );
});

test('publishStorytellerNotes performs no story update when projection fails', async () => {
  const task = continuationTask([]);
  const result = scriptedStorytellerResult(task);
  const tx = makeRecordingTx({
    generationRow: {
      kind: storytellerKind,
      state: 'succeeded',
      input: task,
      output: result,
    },
  });
  await assert.rejects(
    () =>
      publishStorytellerNotes(tx, {
        storyId: randomUUID(),
        generationId: randomUUID(),
        passageId: randomUUID(),
        revision: 2,
        sourcePart: 'current',
        notes: [{ stale: true }],
      }),
    { message: 'Stale continuity base' },
  );
  assert.equal(tx.updateCalls(), 0);
});
