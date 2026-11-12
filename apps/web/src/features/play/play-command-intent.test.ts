import { describe, expect, it } from 'vitest';
import {
  playResolutionIntentReducer,
  type PlayResolutionIntent,
} from './play-command-intent';
import type { FrozenResolutionEnvelope } from '@/src/shared/api/resolution-intent-store';
import { fixtureIds } from '@/src/test/story-fixtures';

const envelope: FrozenResolutionEnvelope = {
  version: 1,
  kind: 'resolution',
  viewerId: 'viewer-test',
  storyId: fixtureIds.storyId,
  operationId: fixtureIds.passageId,
  endpoint: `/api/stories/${fixtureIds.storyId}/resolutions/${fixtureIds.passageId}`,
  body: {
    expectedRevision: 1,
    submission: {
      interactionId: fixtureIds.interactionId,
      answer: { kind: 'choice.v1', optionId: 'walk' },
    },
  },
  requestDigest: 'a'.repeat(64),
  createdAt: Date.now(),
};

describe('playResolutionIntentReducer', () => {
  it('moves idle → submitting → admitted without inventing a new envelope', () => {
    let state: PlayResolutionIntent = { status: 'idle' };
    state = playResolutionIntentReducer(state, {
      type: 'begin',
      envelope,
    });
    expect(state).toEqual({ status: 'submitting', envelope });
    state = playResolutionIntentReducer(state, {
      type: 'admitted',
      envelope,
    });
    expect(state).toEqual({ status: 'admitted', envelope });
  });

  it('keeps the frozen envelope on lost ACK (negative)', () => {
    const state = playResolutionIntentReducer(
      { status: 'submitting', envelope },
      {
        type: 'awaiting_ack',
        envelope,
        message: 'retry same',
      },
    );
    expect(state.status).toBe('awaiting_ack');
    if (state.status === 'awaiting_ack') {
      expect(state.envelope.operationId).toBe(envelope.operationId);
      expect(state.envelope.body).toEqual(envelope.body);
    }
  });
});
