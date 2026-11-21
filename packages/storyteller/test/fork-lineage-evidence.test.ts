import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  boundStorytellerContext,
  contextRequestSections,
  selectForkLineageEvidence,
  type ForkLineagePassageRow,
} from '../src/context/index.js';
import { createRequire } from 'node:module';

const requireAdapter = createRequire(__filename);
const { ForkLineageMemoryError, readForkLineageMemory } = requireAdapter(
  '../../../story-engine/dist/storyteller/fork-lineage-memory.js',
) as {
  ForkLineageMemoryError: new (code: 'not-owned') => Error & { code: 'not-owned' };
  readForkLineageMemory: (input: {
    ownerId: string;
    ancestorStoryId: string;
    authorize: (
      ownerId: string,
      ancestorStoryId: string,
    ) => boolean | Promise<boolean>;
    pinnedRootHash: string;
    pinnedPassageHashById: Record<string, string>;
    cutoffSequence: number;
    parentPassages: readonly ForkLineagePassageRow[];
    childPassages: readonly ForkLineagePassageRow[];
  }) => Promise<ReturnType<typeof selectForkLineageEvidence>>;
};

const pinnedRootHash = 'a'.repeat(64);

function passageContent(title: string) {
  return {
    version: 1 as const,
    title,
    paragraphs: [`${title} body`],
  };
}

function row(
  overrides: Partial<ForkLineagePassageRow> & {
    sequence: number;
    storyId: string;
  },
): ForkLineagePassageRow {
  const id = overrides.id ?? randomUUID();
  const contentHash = overrides.contentHash ?? `${sequenceHash(overrides.sequence)}${'0'.repeat(56)}`;
  return {
    id,
    sequence: overrides.sequence,
    content: overrides.content ?? passageContent(`scene-${overrides.sequence}`),
    response: overrides.response ?? null,
    rootHash: overrides.rootHash ?? pinnedRootHash,
    contentHash,
    storyId: overrides.storyId,
  };
}

function sequenceHash(sequence: number): string {
  return sequence.toString(16).padStart(8, '0');
}

test('selectForkLineageEvidence cites ancestor a18 and child p1 without future parent scenes', () => {
  const ancestorStoryId = randomUUID();
  const childStoryId = randomUUID();
  const parent18 = row({ sequence: 18, storyId: ancestorStoryId });
  const child1 = row({ sequence: 1, storyId: childStoryId });
  const pins = { [parent18.id]: parent18.contentHash };

  const { evidence, notesSourcesUnchanged } = selectForkLineageEvidence({
    ancestorStoryId,
    pinnedRootHash,
    pinnedPassageHashById: pins,
    cutoffSequence: 37,
    parentPassages: [parent18],
    childPassages: [child1],
  });

  assert.equal(notesSourcesUnchanged, true);
  assert.equal(evidence.length, 2);
  const ancestor = evidence.find((entry) => entry.lineage === 'ancestor');
  const child = evidence.find((entry) => (entry.lineage ?? 'child') === 'child');
  assert.ok(ancestor);
  assert.ok(child);
  assert.equal(ancestor.sequence, 18);
  assert.equal(child.sequence, 1);
  assert.equal(
    evidence.some((entry) => entry.lineage === 'ancestor' && entry.sequence === 70),
    false,
  );

  const sections = contextRequestSections({
    premise: {
      title: 'Fork',
      premise: 'A child story continues from scene 37.',
      storytellingDirection: '',
    },
    current: child,
    items: [],
    selected: null,
    notes: [
      {
        key: 'inherit',
        text: 'Carries parent memory.',
        sources: [parent18.id],
        revision: 1,
      },
    ],
    evidence,
  });
  assert.deepEqual(sections.sceneContext.notes[0]?.evidence, ['a18']);
  const handles = sections.sceneContext.evidence.map((entry) => entry.handle);
  assert.ok(handles.includes('a18'));
  assert.ok(!handles.includes('a70'));
  assert.equal(sections.currentState.current?.handle, 'p1');
  assert.equal(sections.sceneContext.notes[0]?.key, 'inherit');
});

test('selectForkLineageEvidence rejects future ancestor scenes and parent ids posing as child', () => {
  const ancestorStoryId = randomUUID();
  const parent70 = row({ sequence: 70, storyId: ancestorStoryId });
  const pins = { [parent70.id]: parent70.contentHash };

  assert.throws(
    () =>
      selectForkLineageEvidence({
        ancestorStoryId,
        pinnedRootHash,
        pinnedPassageHashById: pins,
        cutoffSequence: 37,
        parentPassages: [parent70],
        childPassages: [],
      }),
    /future_ancestor/,
  );

  const sharedId = randomUUID();
  const parent18 = row({ id: sharedId, sequence: 18, storyId: ancestorStoryId });
  const childClone = row({ id: sharedId, sequence: 1, storyId: randomUUID() });

  assert.throws(
    () =>
      selectForkLineageEvidence({
        ancestorStoryId,
        pinnedRootHash,
        pinnedPassageHashById: { [sharedId]: parent18.contentHash },
        cutoffSequence: 37,
        parentPassages: [parent18],
        childPassages: [childClone],
      }),
    /parent_as_child/,
  );
});

test('boundStorytellerContext ignores ancestor sequences for future-child guard', () => {
  const ancestorStoryId = randomUUID();
  const parent18 = row({ sequence: 18, storyId: ancestorStoryId });
  const child1 = row({ sequence: 1, storyId: randomUUID() });
  const { evidence } = selectForkLineageEvidence({
    ancestorStoryId,
    pinnedRootHash,
    pinnedPassageHashById: { [parent18.id]: parent18.contentHash },
    cutoffSequence: 37,
    parentPassages: [parent18],
    childPassages: [child1],
  });
  const current = child1;
  const currentEvidence = evidence.find(
    (entry) => entry.id === child1.id && (entry.lineage ?? 'child') === 'child',
  );
  assert.ok(currentEvidence);
  const context = {
    premise: {
      title: 'Fork',
      premise: 'A child story continues from scene 37.',
      storytellingDirection: '',
    },
    current: currentEvidence,
    items: [],
    selected: null,
    notes: [],
    evidence,
  };
  assert.doesNotThrow(() => boundStorytellerContext(context, () => true));

  const futureChild = {
    ...currentEvidence,
    id: randomUUID(),
    sequence: 2,
    lineage: 'child' as const,
  };
  assert.throws(
    () =>
      boundStorytellerContext(
        {
          ...context,
          evidence: [...evidence, futureChild],
        },
        () => true,
      ),
    /future passage/,
  );
});

test('readForkLineageMemory enforces ownership and returns fork handles', async () => {
  const ancestorStoryId = randomUUID();
  const parent18 = row({ sequence: 18, storyId: ancestorStoryId });
  const child1 = row({ sequence: 1, storyId: randomUUID() });
  const args = {
    ownerId: randomUUID(),
    ancestorStoryId,
    pinnedRootHash,
    pinnedPassageHashById: { [parent18.id]: parent18.contentHash },
    cutoffSequence: 37,
    parentPassages: [parent18],
    childPassages: [child1],
  };

  await assert.rejects(
    () =>
      readForkLineageMemory({
        ...args,
        authorize: () => false,
      }),
    (error: unknown) =>
      error instanceof ForkLineageMemoryError && error.code === 'not-owned',
  );

  const loaded = await readForkLineageMemory({
    ...args,
    authorize: () => true,
  });
  const handles = loaded.evidence.map((entry: (typeof loaded.evidence)[number]) =>
    entry.lineage === 'ancestor'
      ? `a${entry.sequence}`
      : `p${entry.sequence}`,
  );
  assert.deepEqual(handles.sort(), ['a18', 'p1']);
});