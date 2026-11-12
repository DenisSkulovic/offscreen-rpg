import { afterEach, describe, expect, it } from 'vitest';
import {
  clearResolutionEnvelope,
  loadResolutionEnvelope,
  saveResolutionEnvelope,
  type FrozenResolutionEnvelope,
} from './resolution-intent-store';
import { fixtureIds } from '@/src/test/story-fixtures';

const viewerId = 'viewer-test';

function envelope(
  overrides: Partial<FrozenResolutionEnvelope> = {},
): FrozenResolutionEnvelope {
  return {
    version: 1,
    kind: 'resolution',
    viewerId,
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
    requestDigest: 'b'.repeat(64),
    createdAt: Date.now(),
    ...overrides,
  };
}

afterEach(() => {
  clearResolutionEnvelope(viewerId, fixtureIds.storyId);
});

describe('resolution intent session store', () => {
  it('round-trips a frozen envelope for the same viewer/story', () => {
    const saved = envelope();
    saveResolutionEnvelope(saved);
    expect(loadResolutionEnvelope(viewerId, fixtureIds.storyId)).toEqual(saved);
  });

  it('rejects expired and cross-viewer envelopes (negative)', () => {
    saveResolutionEnvelope(
      envelope({ createdAt: Date.now() - 25 * 60 * 60 * 1000 }),
    );
    expect(loadResolutionEnvelope(viewerId, fixtureIds.storyId)).toBeNull();

    saveResolutionEnvelope(envelope({ viewerId: 'other-viewer' }));
    expect(loadResolutionEnvelope(viewerId, fixtureIds.storyId)).toBeNull();
  });
});
