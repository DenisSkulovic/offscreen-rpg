import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeValidatedAppearanceForPublication } from '@offscreen/contracts/stories';
import { scriptedStorytellerResult } from '../src/fixtures';
import { createRequestAuditFixtureCases } from '../src/providers/request-audit-fixtures';
import {
  diagnoseStorytellerResult,
  validateStorytellerResult,
  type StorytellerResult,
  type StorytellerTask,
} from '../src/tasks';

const mood = {
  schemaVersion: 1 as const,
  scene: { atmosphere: { lighting: 'dim' as const } },
};
const storyId = '11111111-1111-4111-8111-111111111111';
const passageId = '22222222-2222-4222-8222-222222222222';

function taskFor(caseId: 'scene-continuation' | 'activity-consequence') {
  const task = createRequestAuditFixtureCases({ caseIds: [caseId] })[0]?.task;
  if (!task) throw new Error(`Missing ${caseId} fixture`);
  return task;
}

function offerIds(result: StorytellerResult) {
  const next = result.scene.next;
  if (next.kind === 'choice') return next.options.map((option) => option.id);
  if (next.kind === 'action-plans') return next.plans.map((plan) => plan.key);
  if (next.kind === 'interval' && next.arrival.next.kind === 'choice') {
    return next.arrival.next.options.map((option) => option.id);
  }
  return [];
}

function prose(result: StorytellerResult) {
  return result.scene.content.paragraphs;
}

function schemaOffersAppearance(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(schemaOffersAppearance);
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const properties = record.properties;
  if (
    properties &&
    typeof properties === 'object' &&
    !Array.isArray(properties) &&
    Object.hasOwn(properties, 'appearanceSuggestion')
  ) {
    return true;
  }
  return Object.values(record).some(schemaOffersAppearance);
}

async function withoutFetch<T>(run: () => T): Promise<T> {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    throw new Error('scene direction must not fetch');
  };
  try {
    const value = run();
    assert.deepEqual(calls, []);
    return value;
  } finally {
    globalThis.fetch = original;
  }
}

function settle(task: StorytellerTask, suggestion: unknown) {
  const baseline = scriptedStorytellerResult(task);
  if (!('scene' in baseline)) throw new Error('Expected a scene result');
  const output =
    suggestion === 'missing'
      ? baseline
      : { ...baseline, appearanceSuggestion: suggestion };
  const settled = validateStorytellerResult(task, output);
  if (!('scene' in settled)) throw new Error('Expected a scene result');
  assert.equal(diagnoseStorytellerResult(task, output), null);
  assert.deepEqual(prose(settled), prose(baseline));
  assert.deepEqual(offerIds(settled), offerIds(baseline));
  assert.ok(offerIds(settled).length > 0);
  return { baseline, settled };
}

test('a valid optional mood keeps the same prose and offer ids', async () => {
  const continuation = taskFor('scene-continuation');
  const consequence = taskFor('activity-consequence');
  await withoutFetch(() => {
    for (const task of [continuation, consequence]) {
      const { settled } = settle(task, mood);
      assert.deepEqual(settled.appearanceSuggestion, mood);
    }
    assert.equal(
      schemaOffersAppearance(continuation.request.outputSchema),
      false,
    );
    const stored = makeValidatedAppearanceForPublication({
      storyId,
      passageId,
      candidate: mood,
    });
    assert.equal(stored?.source.storyId, storyId);
    assert.equal(stored?.source.passageId, passageId);
    assert.deepEqual(stored?.directive, mood);
  });
});

test('missing, malformed, and over-budget direction still settles without fetch or reroll', async () => {
  const continuation = taskFor('scene-continuation');
  const consequence = taskFor('activity-consequence');
  const rejected = [
    null,
    { schemaVersion: 1, scene: { atmosphere: { lighting: 'moonlight' } } },
    {
      schemaVersion: 1,
      scene: { palette: { backdrop: 'https://evil.example/plate.png' } },
    },
    {
      schemaVersion: 1,
      scene: { palette: { backdrop: '#112233' } },
      css: 'body{background:url(https://evil.example)}',
    },
    {
      schemaVersion: 1,
      genre: 'horror',
      scene: { atmosphere: { lighting: 'dim' } },
    },
    { schemaVersion: 1, scene: { palette: { backdrop: '<b>#112233</b>' } } },
    {
      schemaVersion: 1,
      scene: {
        palette: { backdrop: '#112233', accent: '#abcdef' },
        atmosphere: { lighting: 'dim' },
      },
    },
    {
      schemaVersion: 1,
      scene: { atmosphere: { lighting: 'dim' }, pad: 'x'.repeat(500) },
    },
  ];
  await withoutFetch(() => {
    for (const task of [continuation, consequence]) {
      const missing = settle(task, 'missing');
      assert.equal(missing.settled.appearanceSuggestion, undefined);
      for (const suggestion of rejected) {
        const settled = settle(task, suggestion);
        assert.equal(settled.settled.appearanceSuggestion, undefined);
        assert.equal(
          makeValidatedAppearanceForPublication({
            storyId,
            passageId,
            candidate: suggestion,
          }),
          undefined,
        );
      }
    }
  });
});
