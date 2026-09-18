import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  continuationArrivalPresentation,
  continuationCurrentPresentation,
  continuationResultSchema,
  playablePresentation,
  playableProposalSchema,
  preparePlayableContinuation,
  publishedPlayableFromGeneration,
  selectedIntentionFromPublished,
  validateContinuationResult,
} from '../src/tasks/playable';

const immediate = {
  version: 2 as const,
  content: {
    version: 1 as const,
    title: 'Around the old wall',
    paragraphs: ['The path bends around an old wall.'],
  },
  next: {
    kind: 'choice' as const,
    prompt: 'What do you attempt?',
    options: [
      {
        id: 'inspect-change',
        label: 'Inspect the change',
        intention: 'Look more closely at what has changed ahead.',
      },
    ],
  },
};

const timed = {
  version: 2 as const,
  content: {
    version: 1 as const,
    title: 'On the road',
    paragraphs: ['You set out toward the tavern. The road is still long.'],
  },
  next: {
    kind: 'interval' as const,
    gameDurationMs: 600000,
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
            id: 'speak-bartender',
            label: 'Speak to the bartender',
            intention: 'Ask the bartender what this place is like tonight.',
          },
          {
            id: 'sit-traveller',
            label: 'Sit beside the traveller',
            intention: 'Sit near the traveller in the corner and listen.',
          },
        ],
      },
    },
  },
};

const v1Proposal = {
  version: 1 as const,
  content: timed.content,
  next: immediate.next,
};

test('continuation v2 accepts an immediate playable scene', () => {
  const result = validateContinuationResult(immediate);
  assert.equal(result.next.kind, 'choice');
  assert.equal(
    playablePresentation({
      content: result.content,
      next: result.next,
    }).interaction?.options[0]?.label,
    'Inspect the change',
  );
  assert.equal(
    continuationCurrentPresentation(result).content.title,
    'Around the old wall',
  );
});

test('continuation v2 accepts a timed interval with a prepared arrival choice', () => {
  const result = validateContinuationResult(timed);
  assert.equal(result.next.kind, 'interval');
  if (result.next.kind !== 'interval') {
    throw new Error('Expected interval');
  }
  assert.equal(result.next.gameDurationMs, 600000);
  assert.equal(continuationCurrentPresentation(result).interaction, null);
  const arrival = continuationArrivalPresentation(result);
  assert.equal(arrival.content.title, 'At the tavern');
  assert.equal(arrival.interaction?.options[1]?.id, 'sit-traveller');
  assert.equal(
    JSON.stringify(arrival).includes('Sit near the traveller'),
    false,
  );
});

test('continuation v2 rejects mixed, extra and invalid duration states', () => {
  assert.throws(() =>
    continuationResultSchema.parse({
      ...timed,
      next: { ...timed.next, extra: true },
    }),
  );
  assert.throws(() =>
    continuationResultSchema.parse({
      ...immediate,
      next: { kind: 'interval', gameDurationMs: 1 },
    }),
  );
  assert.throws(() =>
    continuationResultSchema.parse({
      ...timed,
      next: { ...timed.next, gameDurationMs: 0 },
    }),
  );
  assert.throws(() =>
    continuationResultSchema.parse({
      ...timed,
      next: { ...timed.next, gameDurationMs: 1.5 },
    }),
  );
  assert.throws(() =>
    continuationResultSchema.parse({
      ...timed,
      next: {
        ...timed.next,
        realDurationMs: 2000,
      },
    }),
  );
  assert.throws(() =>
    continuationResultSchema.parse({
      ...timed,
      next: {
        ...timed.next,
        arrival: {
          ...timed.next.arrival,
          next: {
            ...timed.next.arrival.next,
            options: [
              timed.next.arrival.next.options[0],
              timed.next.arrival.next.options[0],
            ],
          },
        },
      },
    }),
  );
});

test('publication recovery uses the declared generation part', () => {
  const opening = publishedPlayableFromGeneration({
    output: v1Proposal,
    sourcePart: 'current',
  });
  assert.equal(opening.next.kind, 'choice');
  const currentImmediate = publishedPlayableFromGeneration({
    output: immediate,
    sourcePart: 'current',
  });
  assert.equal(currentImmediate.content.title, 'Around the old wall');
  const arrival = publishedPlayableFromGeneration({
    output: timed,
    sourcePart: 'arrival',
  });
  assert.equal(arrival.content.title, 'At the tavern');
  assert.equal(
    selectedIntentionFromPublished(arrival, 'speak-bartender').intention,
    'Ask the bartender what this place is like tonight.',
  );
  assert.throws(() =>
    publishedPlayableFromGeneration({ output: timed, sourcePart: 'current' }),
  );
  assert.throws(() =>
    publishedPlayableFromGeneration({
      output: v1Proposal,
      sourcePart: 'arrival',
    }),
  );
  assert.throws(() =>
    publishedPlayableFromGeneration({
      output: immediate,
      sourcePart: 'arrival',
    }),
  );
});

test('arrival provenance recovers the exact hidden intention for continuation capture', () => {
  const published = publishedPlayableFromGeneration({
    output: timed,
    sourcePart: 'arrival',
  });
  const presentation = playablePresentation(published);
  const snapshot = {
    id: randomUUID(),
    revision: 3,
    viewVersion: 8,
    items: [],
    current: {
      id: randomUUID(),
      content: presentation.content,
      interaction: {
        id: randomUUID(),
        specification: presentation.interaction,
      },
    },
  };
  const artifact = preparePlayableContinuation({
    premise: {
      title: '',
      premise: 'A traveller walking toward a tavern.',
      storytellingDirection: '',
    },
    snapshot,
    publishedProposal: timed,
    sourcePart: 'arrival',
    submission: {
      interactionId: snapshot.current.interaction.id,
      answer: { kind: 'choice.v1', optionId: 'speak-bartender' },
    },
  });
  assert.equal(
    JSON.parse(artifact.request.messages[1]!.content).intention,
    'Ask the bartender what this place is like tonight.',
  );
  assert.equal(artifact.promptVersion, 'playable.v2');
  assert.equal(
    JSON.stringify(artifact.request).includes('Sit near the traveller'),
    false,
  );
});

test('v1 opening proposals publish from declared current provenance', () => {
  assert.equal(playableProposalSchema.parse(v1Proposal).version, 1);
  assert.equal(
    publishedPlayableFromGeneration({
      output: v1Proposal,
      sourcePart: 'current',
    }).next.kind,
    'choice',
  );
});
