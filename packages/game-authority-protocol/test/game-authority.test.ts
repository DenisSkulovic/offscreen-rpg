import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  gameAuthorityActorIdSchema,
  gameAuthorityResolutionRequestSchema,
  gameAuthoritySeamVersion,
} from '../src/game-authority';

const submission = {
  expectedRevision: 1,
  submission: {
    interactionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    answer: { kind: 'choice.v1' as const, optionId: 'go' },
  },
};

test('game authority resolution body rejects an owner override', () => {
  assert.equal(gameAuthoritySeamVersion, 'game-authority.story-seam.v1');
  assert.equal(
    gameAuthorityResolutionRequestSchema.safeParse(submission).success,
    true,
  );
  assert.equal(
    gameAuthorityResolutionRequestSchema.safeParse({
      ...submission,
      ownerId: 'owner-a',
    }).success,
    false,
  );
  assert.equal(gameAuthorityActorIdSchema.safeParse('owner-a').success, true);
  assert.equal(gameAuthorityActorIdSchema.safeParse('owner a').success, false);
  assert.equal(gameAuthorityActorIdSchema.safeParse('').success, false);
});
