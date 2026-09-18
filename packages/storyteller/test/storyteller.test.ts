import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  createStorytellerCatalogue,
  storytellerCatalogue,
} from '../src/profiles';
import {
  prepareStorytellerTask,
  validateStorytellerResult,
} from '../src/tasks';
import { scriptedStorytellerResult } from '../src/fixtures';
import { applyContinuityPatch } from '../src/context/continuity';
import { boundStorytellerContext } from '../src/context';
import {
  createOpenRouterProvider,
  usdToMicrousd,
} from '../src/providers/openrouter';

function opening() {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'pineapple.v1' },
    context: {
      premise: {
        title: '',
        premise: 'SpongeBob wakes in the pineapple.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
    },
  });
}

function consequence() {
  const base = opening();
  const passage = {
    id: randomUUID(),
    sequence: 2,
    content: {
      version: 1 as const,
      title: 'After the attempt',
      paragraphs: ['The committed result is now visible.'],
    },
    response: null,
  };
  return prepareStorytellerTask({
    task: 'consequence',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: passage.id,
    },
    profile: base.profile,
    execution: base.execution,
    context: {
      ...base.context,
      current: passage,
      evidence: [passage],
      selected: {
        id: 'inspect',
        label: 'Inspect the clue',
        intention: 'Inspect the clue carefully.',
      },
      resolution: {
        character: {
          name: 'A strange observer',
          scores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 12,
            wisdom: 12,
            charisma: 10,
          },
          proficientSkills: [],
          proficiencyBonus: 2,
          hp: 5,
          maxHp: 5,
          facts: [],
          quantities: [],
        },
        tick: 0,
        offer: {
          id: randomUUID(),
          nodes: [
            {
              id: 'inspect',
              parent: null,
              label: 'Inspect',
              description: 'Inspect what changed.',
              action: { kind: 'attempt' },
            },
            {
              id: 'withdraw',
              parent: null,
              label: 'Withdraw',
              description: 'Step away from the situation.',
              action: { kind: 'attempt' },
            },
          ],
        },
        receipts: [],
      },
    },
  });
}

test('captured schemas expose only the result for the requested task', () => {
  const initial = opening();
  const resolved = consequence();
  const continuation = prepareStorytellerTask({
    ...resolved,
    task: 'continuation',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: randomUUID(),
      interactionId: randomUUID(),
    },
    context: { ...resolved.context, resolution: undefined },
  });
  const cases = [[initial, 1], [continuation, 2], [resolved, 3]] as const;
  for (const [task, version] of cases) {
    const schema = JSON.parse(JSON.stringify(task.request.outputSchema));
    assert.equal(schema.properties.scene.properties.version.const, version);
    assert.equal(schema.properties.scene.anyOf, undefined);
    assert.ok(Buffer.byteLength(JSON.stringify(task.request)) <= 48 * 1024);
  }
  const schema = JSON.parse(JSON.stringify(resolved.request.outputSchema));
  assert.equal(schema.properties.arrivalNotes.maxItems, 0);
});

test('context rejects inconsistent current evidence and unpublished future evidence', () => {
  const { context } = consequence();
  assert.ok(context.current);
  const current = context.current;
  assert.throws(() => boundStorytellerContext({
    ...context,
    current: {
      ...current,
      content: { version: 1, title: 'Contradiction', paragraphs: ['Different facts.'] },
    },
  }, () => true), /Current passage differs/);
  assert.throws(() => boundStorytellerContext({
    ...context,
    evidence: [
      ...context.evidence,
      { ...current, id: randomUUID(), sequence: current.sequence + 1 },
    ],
  }, () => true), /future passage/);
});

test('profiles are data; captured task is isolated and task-specific', () => {
  const task = opening();
  const copy = { ...task.profile, id: 'third-style', name: 'Third style' };
  const catalogue = createStorytellerCatalogue([task.profile, copy]);
  assert.equal(catalogue.list().length, 2);
  const first = catalogue.list()[0];
  assert.ok(first);
  assert.equal('tasks' in first, false);
  assert.throws(() => createStorytellerCatalogue([copy, copy]));
  const input = {
    task: 'opening' as const,
    source: task.source,
    execution: task.execution,
    profile: copy,
    context: task.context,
  };
  const captured = prepareStorytellerTask(input);
  copy.tone = 'changed';
  assert.notEqual(captured.profile.tone, copy.tone);
  assert.ok(Object.isFrozen(captured.request.messages));
  assert.equal(
    captured.request.messages[1].content.includes(
      task.profile.tasks.continuation,
    ),
    false,
  );
  assert.equal(captured.request.messages[1].content.includes('draftId'), false);
});

test('offered agency checks reject duplicates, endings and fabricated/future evidence', () => {
  const task = opening();
  const good = scriptedStorytellerResult(task);
  const duplicate = structuredClone(good);
  if (duplicate.scene.next.kind !== 'choice') {
    throw new Error('Expected offer');
  }
  const [first, second] = duplicate.scene.next.options;
  assert.ok(first && second);
  second.label = first.label.toUpperCase();
  assert.throws(() => validateStorytellerResult(task, duplicate));
  assert.throws(() =>
    validateStorytellerResult(task, {
      ...good,
      scene: { ...good.scene, next: { kind: 'end' } },
    }),
  );
  assert.throws(() =>
    validateStorytellerResult(task, {
      ...good,
      currentNotes: [
        {
          kind: 'create',
          key: 'lie',
          text: 'Already arrived',
          evidence: ['arrival'],
        },
      ],
    }),
  );
});

test('consequence planning selects admitted actions without gaining mechanical authority', () => {
  const task = consequence();
  const result = scriptedStorytellerResult(task);
  assert.equal(result.scene.version, 3);
  if (result.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  assert.deepEqual(
    result.scene.next.options.map((option) => option.id),
    ['withdraw'],
  );

  const fabricated = structuredClone(result);
  if (fabricated.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  fabricated.scene.next.options[0]!.id = 'invented-mechanic';
  assert.throws(() => validateStorytellerResult(task, fabricated));

  const duplicate = structuredClone(result);
  if (duplicate.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  duplicate.scene.next.options.push({
    ...duplicate.scene.next.options[0]!,
  });
  assert.throws(() => validateStorytellerResult(task, duplicate));
});

test('continuity updates preserve provenance and fail without mutating their base', () => {
  const source = randomUUID();
  const notes = applyContinuityPatch({
    notes: [],
    patch: [
      {
        kind: 'create',
        key: 'promise',
        text: 'Gary made a promise.',
        evidence: ['current'],
      },
    ],
    evidence: { current: source },
    revision: 1,
  });
  assert.deepEqual(notes[0]?.sources, [source]);
  assert.throws(() =>
    applyContinuityPatch({
      notes,
      patch: [
        {
          kind: 'update',
          key: 'promise',
          text: 'Different',
          evidence: ['other-story'],
        },
      ],
      evidence: {},
      revision: 2,
    }),
  );
  assert.equal(notes[0]?.text, 'Gary made a promise.');
  assert.deepEqual(
    applyContinuityPatch({
      notes,
      patch: [{ kind: 'retire', key: 'promise', reason: 'Fulfilled' }],
      evidence: {},
      revision: 2,
    }),
    [],
  );
});

test('old mandatory evidence survives recent-window selection, overflow holds', () => {
  const task = opening();
  const evidence = Array.from({ length: 14 }, (_, index) => ({
    id: randomUUID(),
    sequence: index + 1,
    content: {
      version: 1 as const,
      title: 'Scene',
      paragraphs: ['Quiet life.'],
    },
    response: null,
  }));
  const first = evidence[0];
  const current = evidence[13];
  assert.ok(first && current);
  const context = {
    ...task.context,
    current,
    evidence,
    notes: [
      {
        key: 'promise',
        text: 'An old promise.',
        sources: [first.id],
        revision: 1,
      },
    ],
  };
  const selected = boundStorytellerContext(context, () => true);
  assert.equal(selected.evidence.length, 8);
  assert.equal(selected.evidence[0]?.id, first.id);
  assert.throws(
    () => boundStorytellerContext(context, () => false),
    /context_too_large/,
  );
  assert.throws(
    () =>
      boundStorytellerContext(
        { ...context, evidence: evidence.slice(1) },
        () => true,
      ),
    /Missing continuity evidence/,
  );
});

test('provider adapter uses an injected transport, one route and no retry; missing accounting is uncertain', async () => {
  const task = opening();
  const providerTask = prepareStorytellerTask({
    ...task,
    execution: {
      mode: 'provider',
      accountId: randomUUID(),
      runId: randomUUID(),
      policy: {
        version: 'test',
        model: 'test/model',
        provider: 'Test',
        priceVersion: 'invented-test',
        inputMicrousdPerMillion: '500000',
        outputMicrousdPerMillion: '2000000',
        maxInputTokens: 100000,
        maxOutputTokens: 2000,
        timeoutMs: 1000,
      },
    },
  });
  let calls = 0;
  const provider = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy-test-key',
    transport: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.provider.only, ['Test']);
      assert.equal(body.provider.allow_fallbacks, false);
      return new Response(
        JSON.stringify({
          id: 'fake',
          usage: { cost: 0.0000012 },
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify(scriptedStorytellerResult(task)),
              },
            },
          ],
        }),
      );
    },
  });
  const result = await provider(providerTask);
  assert.equal(result.kind, 'result');
  if (result.kind === 'result') {
    assert.equal(result.chargeMicrousd, 2n);
  }
  assert.equal(calls, 1);
  const missingUsage = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () => new Response('{}'),
  });
  assert.deepEqual(await missingUsage(providerTask), { kind: 'uncertain' });
  assert.throws(() =>
    createOpenRouterProvider({ enabled: false, apiKey: 'dummy' }),
  );
  assert.equal(usdToMicrousd('1e-7'), 1n);
  assert.equal(usdToMicrousd('0.012345'), 12345n);
});
