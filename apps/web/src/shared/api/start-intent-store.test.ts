import { afterEach, describe, expect, it } from 'vitest';
import {
  clearStartEnvelope,
  loadStartEnvelope,
  parseStartEnvelope,
  saveStartEnvelope,
  type FrozenStartEnvelope,
} from './start-intent-store';
import { fixtureDraftId } from '@/src/test/draft-fixtures';
import {
  fixtureCandidateId,
  fixtureStartStoryId,
} from '@/src/test/opening-fixtures';

const viewerId = 'viewer-start';

function envelope(
  overrides: Partial<FrozenStartEnvelope> = {},
): FrozenStartEnvelope {
  return {
    version: 1,
    kind: 'start',
    viewerId,
    draftId: fixtureDraftId,
    storyId: fixtureStartStoryId,
    candidateId: fixtureCandidateId,
    expectedDraftRevision: 1,
    campaign: {
      mechanics: false,
      locked: true,
      pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

afterEach(() => {
  clearStartEnvelope(viewerId, fixtureStartStoryId);
});

describe('start intent session store', () => {
  it('round-trips a frozen Start envelope for the same viewer/story', () => {
    const saved = envelope();
    saveStartEnvelope(saved);
    expect(loadStartEnvelope(viewerId, fixtureStartStoryId)).toEqual(saved);
  });

  it('rejects expired, cross-viewer and corrupt captures (negative)', () => {
    saveStartEnvelope(
      envelope({ createdAt: Date.now() - 25 * 60 * 60 * 1000 }),
    );
    expect(loadStartEnvelope(viewerId, fixtureStartStoryId)).toBeNull();

    saveStartEnvelope(envelope({ viewerId: 'other-viewer' }));
    expect(loadStartEnvelope(viewerId, fixtureStartStoryId)).toBeNull();

    expect(
      parseStartEnvelope({
        version: 1,
        kind: 'start',
        viewerId,
        // missing required fields
      }),
    ).toBeNull();
  });
});
