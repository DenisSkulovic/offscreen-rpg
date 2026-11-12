import { describe, expect, it } from 'vitest';
import { preferNewerSnapshot } from './story-transport';
import { makeStorySnapshot } from '@/src/test/story-fixtures';

describe('preferNewerSnapshot', () => {
  it('accepts a higher viewVersion for the same story payload shape', () => {
    const prior = makeStorySnapshot({ viewVersion: 4, title: 'Older scene' });
    const next = makeStorySnapshot({ viewVersion: 5, title: 'Newer scene' });
    expect(preferNewerSnapshot(prior, next).current.content.title).toBe(
      'Newer scene',
    );
  });

  it('rejects an older same-story snapshot (negative)', () => {
    const prior = makeStorySnapshot({
      viewVersion: 7,
      title: 'Authoritative scene',
    });
    const stale = makeStorySnapshot({
      viewVersion: 6,
      title: 'Stale late response',
    });
    expect(preferNewerSnapshot(prior, stale).current.content.title).toBe(
      'Authoritative scene',
    );
  });

  it('rejects a different story id even with a higher viewVersion (negative)', () => {
    const prior = makeStorySnapshot({
      viewVersion: 2,
      title: 'Story A',
    });
    const other = makeStorySnapshot({
      id: '99999999-9999-4999-8999-999999999999',
      viewVersion: 99,
      title: 'Story B',
    });
    expect(preferNewerSnapshot(prior, other).current.content.title).toBe(
      'Story A',
    );
  });

  it('keeps the prior when viewVersions match but next resolution is older', () => {
    const prior = makeStorySnapshot({
      viewVersion: 8,
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 4,
      },
    });
    const next = makeStorySnapshot({
      viewVersion: 8,
      resolution: {
        state: 'running',
        evidence: 'committed',
        version: 2,
      },
    });
    expect(preferNewerSnapshot(prior, next).resolution?.version).toBe(4);
  });
});
