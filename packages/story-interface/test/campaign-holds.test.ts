import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { campaignHoldSchema, campaignHoldsSchema } from '../src/campaign-holds';

const u = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

test('MA03 T01: one valid hold of each kind parses', () => {
  assert.doesNotThrow(() =>
    campaignHoldSchema.parse({
      kind: 'storyteller-intent',
      operationId: randomUUID(),
      reason: 'required-turn',
    }),
  );
  assert.doesNotThrow(() =>
    campaignHoldSchema.parse({
      kind: 'storyteller',
      generationId: randomUUID(),
      reason: 'required-turn',
    }),
  );
  assert.doesNotThrow(() =>
    campaignHoldSchema.parse({
      kind: 'decision',
      offerId: randomUUID(),
      reason: 'player-choice',
    }),
  );
  assert.doesNotThrow(() =>
    campaignHoldSchema.parse({
      kind: 'world-obligation',
      obligationId: randomUUID(),
      reason: 'controlling-event',
    }),
  );
});

test('MA03 T01: duplicate same-kind owner id rejects', () => {
  const sharedId = randomUUID();
  const result = campaignHoldsSchema.safeParse([
    {
      kind: 'storyteller-intent',
      operationId: sharedId,
      reason: 'required-turn',
    },
    {
      kind: 'storyteller-intent',
      operationId: sharedId,
      reason: 'required-turn',
    },
  ]);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(
      result.error.issues.map((issue) => issue.message).join(' '),
      /Campaign hold owners must be unique/,
    );
  }
});

test('MA03 T01: two decision holds reject', () => {
  const result = campaignHoldsSchema.safeParse([
    {
      kind: 'decision',
      offerId: randomUUID(),
      reason: 'player-choice',
    },
    {
      kind: 'decision',
      offerId: randomUUID(),
      reason: 'player-choice',
    },
  ]);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(
      result.error.issues.map((issue) => issue.message).join(' '),
      /The solo campaign supports one unresolved player decision/,
    );
  }
});

test('MA03 T01: more than 20 holds reject', () => {
  const holds = Array.from({ length: 21 }, (_, i) => ({
    kind: 'storyteller-intent' as const,
    operationId: u(i + 1),
    reason: 'required-turn' as const,
  }));
  const result = campaignHoldsSchema.safeParse(holds);
  assert.equal(result.success, false);
});

test('MA03 T01: unrecognized kind rejects', () => {
  assert.throws(
    () =>
      campaignHoldSchema.parse({
        kind: 'unknown',
        operationId: randomUUID(),
        reason: 'required-turn',
      }),
    /invalid value|Invalid literal|invalid_union/,
  );
});
