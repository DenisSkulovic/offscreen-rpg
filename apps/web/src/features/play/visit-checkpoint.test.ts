import { describe, expect, it } from 'vitest';
import {
  mayAcknowledgeStoryVisit,
  visitDigestCopy,
} from './visit-checkpoint';

describe('GM06 visit ACK gate', () => {
  const allowed = {
    visibilityState: 'visible' as const,
    routeIsActiveForegroundStory: true,
    storySituationRendered: true,
    digestVisibleOrExplicitContinue: true,
    hasTrustedVisitToken: true,
  };

  it('allows ACK only for a visible foreground rendered visit', () => {
    expect(mayAcknowledgeStoryVisit(allowed)).toBe(true);
  });

  it('refuses hidden tab, prefetch-like, and missing token ACKs (negative)', () => {
    expect(
      mayAcknowledgeStoryVisit({ ...allowed, visibilityState: 'hidden' }),
    ).toBe(false);
    expect(
      mayAcknowledgeStoryVisit({
        ...allowed,
        routeIsActiveForegroundStory: false,
      }),
    ).toBe(false);
    expect(
      mayAcknowledgeStoryVisit({ ...allowed, storySituationRendered: false }),
    ).toBe(false);
    expect(
      mayAcknowledgeStoryVisit({
        ...allowed,
        digestVisibleOrExplicitContinue: false,
      }),
    ).toBe(false);
    expect(
      mayAcknowledgeStoryVisit({ ...allowed, hasTrustedVisitToken: false }),
    ).toBe(false);
  });
});

describe('GM06 visit digest copy', () => {
  it('uses Recent developments without a prior checkpoint', () => {
    expect(
      visitDigestCopy({
        previous: null,
        newEventCount: 3,
        hasMore: false,
        coverage: 'since-enabled',
      }),
    ).toBe('Recent developments');
  });

  it('claims since-last-opened only with a trusted previous baseline', () => {
    expect(
      visitDigestCopy({
        previous: { eventSequence: 10 },
        newEventCount: 2,
        hasMore: false,
        coverage: 'since-enabled',
      }),
    ).toBe('Since you last opened this story');
  });
});
