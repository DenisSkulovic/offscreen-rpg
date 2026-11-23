import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  interactionSchema,
  validateInteractionSubmission,
  InteractionInputError,
} from '../src/interactions';

const id = randomUUID();
const offer = (count: number) => ({
  id,
  specification: {
    kind: 'choice.v1',
    prompt: 'What will you do?',
    options: Array.from({ length: count }, (_, index) => ({
      id: `option-${index}`,
      label: `Choice ${index}`,
    })),
  },
});
const answer = (optionId: string, interactionId = id) => ({
  interactionId,
  answer: { kind: 'choice.v1', optionId },
});
const errorCode = (code: InteractionInputError['code']) => (error: unknown) =>
  error instanceof InteractionInputError && error.code === code;

test('one, three, five and larger offered sets use the same response contract', () => {
  for (const count of [1, 3, 5, 100]) {
    assert.deepEqual(
      validateInteractionSubmission(
        offer(count),
        answer(`option-${count - 1}`),
      ),
      answer(`option-${count - 1}`),
    );
  }
});

test('selection uses identity, independently of option ordering or duplicate labels', () => {
  const current = offer(3);
  current.specification.options.reverse();
  current.specification.options.forEach((option) => {
    option.label = 'Look closer';
  });
  assert.equal(
    validateInteractionSubmission(current, answer('option-2')).answer.optionId,
    'option-2',
  );
  assert.throws(
    () => validateInteractionSubmission(current, answer('2')),
    errorCode('unoffered_option'),
  );
});

test('a replacement interaction rejects an old answer even when option IDs match', () => {
  assert.throws(
    () =>
      validateInteractionSubmission(
        { ...offer(3), id: randomUUID() },
        answer('option-1'),
      ),
    errorCode('stale_interaction'),
  );
  assert.throws(
    () => validateInteractionSubmission(offer(3), answer('hidden-option')),
    errorCode('unoffered_option'),
  );
});

test('unsupported formats and client-supplied authority never pass validation', () => {
  for (const submitted of [
    { interactionId: id, answer: { kind: 'text.v1', text: 'Open everything' } },
    {
      interactionId: id,
      answer: { kind: 'choice.v1', optionIds: ['option-0', 'option-1'] },
    },
    { ...answer('option-0'), effects: [{ type: 'grant-token' }] },
    {
      interactionId: id,
      answer: { kind: 'choice.v1', optionId: 'option-0', nextScene: 'ending' },
    },
  ])
    assert.throws(
      () => validateInteractionSubmission(offer(3), submitted),
      errorCode('invalid_answer'),
    );
  assert.equal(
    interactionSchema.safeParse({
      id,
      specification: { kind: 'text.v1', prompt: 'Act' },
    }).success,
    false,
  );
});

test('malformed offers fail before publication rather than becoming ambiguous choices', () => {
  const duplicates = offer(2);
  duplicates.specification.options[1]!.id = 'option-0';
  const emptyLabel = offer(1);
  emptyLabel.specification.options[0]!.label = ' ';
  for (const malformed of [
    offer(0),
    offer(101),
    duplicates,
    emptyLabel,
    { ...offer(1), id: 'scene-1' },
  ])
    assert.equal(interactionSchema.safeParse(malformed).success, false);
});
