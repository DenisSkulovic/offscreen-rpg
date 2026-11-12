import { describe, expect, it } from 'vitest';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';
import { reconcileStorySnapshot } from './story-snapshot-reconcile';

const viewerId = 'viewer-a';
const storyId = fixtureIds.storyId;
const otherStoryId = '99999999-9999-4999-8999-999999999999';

describe('reconcileStorySnapshot', () => {
  it('accepts a higher viewVersion for the same story', () => {
    const prior = makeStorySnapshot({ viewVersion: 4, title: 'Older' });
    const next = makeStorySnapshot({ viewVersion: 5, title: 'Newer' });
    const result = reconcileStorySnapshot({
      viewerId,
      storyId,
      prior,
      priorEpoch: 1,
      next,
      nextEpoch: 2,
    });
    expect(result.accepted).toBe(true);
    expect(result.snapshot?.current.content.title).toBe('Newer');
  });

  it('rejects an older viewVersion (v14 then v13)', () => {
    const prior = makeStorySnapshot({
      viewVersion: 14,
      title: 'Authoritative',
    });
    const next = makeStorySnapshot({ viewVersion: 13, title: 'Stale' });
    const result = reconcileStorySnapshot({
      viewerId,
      storyId,
      prior,
      priorEpoch: 5,
      next,
      nextEpoch: 99,
    });
    expect(result.accepted).toBe(false);
    expect(result.snapshot?.current.content.title).toBe('Authoritative');
  });

  it('rejects a wrong-story payload even with a higher viewVersion (negative)', () => {
    const prior = makeStorySnapshot({ viewVersion: 3, title: 'Story A' });
    const next = makeStorySnapshot({
      id: otherStoryId,
      viewVersion: 99,
      title: 'Story B high version',
    });
    const result = reconcileStorySnapshot({
      viewerId,
      storyId,
      prior,
      priorEpoch: 1,
      next,
      nextEpoch: 2,
    });
    expect(result.accepted).toBe(false);
    expect(result.snapshot?.id).toBe(storyId);
    expect(result.snapshot?.current.content.title).toBe('Story A');
  });

  it('rejects writes when viewerId is empty (negative auth-switch guard)', () => {
    const next = makeStorySnapshot({ title: 'No viewer' });
    const result = reconcileStorySnapshot({
      viewerId: '',
      storyId,
      prior: undefined,
      priorEpoch: 0,
      next,
      nextEpoch: 1,
    });
    expect(result.accepted).toBe(false);
    expect(result.snapshot).toBeUndefined();
  });

  it('keeps prior when equal viewVersion has older resolution.version', () => {
    const prior = makeStorySnapshot({
      viewVersion: 8,
      resolution: { state: 'pending', evidence: 'committed', version: 4 },
      interaction: null,
      canRespond: false,
    });
    const next = makeStorySnapshot({
      viewVersion: 8,
      resolution: { state: 'running', evidence: 'committed', version: 2 },
      interaction: null,
      canRespond: false,
      title: 'Older resolution',
    });
    const result = reconcileStorySnapshot({
      viewerId,
      storyId,
      prior,
      priorEpoch: 3,
      next,
      nextEpoch: 4,
    });
    expect(result.accepted).toBe(false);
    expect(result.snapshot?.resolution?.version).toBe(4);
  });

  it('at equal versions, older request epoch cannot replace newer epoch (negative)', () => {
    const prior = makeStorySnapshot({
      viewVersion: 5,
      title: 'Epoch 10 projection',
      resolution: null,
      interaction: null,
      canRespond: false,
    });
    const next = makeStorySnapshot({
      viewVersion: 5,
      title: 'Late epoch 7 projection',
      resolution: null,
      interaction: null,
      canRespond: false,
    });
    const result = reconcileStorySnapshot({
      viewerId,
      storyId,
      prior,
      priorEpoch: 10,
      next,
      nextEpoch: 7,
    });
    expect(result.accepted).toBe(false);
    expect(result.snapshot?.current.content.title).toBe('Epoch 10 projection');
  });

  it('at equal versions, a newer request epoch may update the projection', () => {
    const prior = makeStorySnapshot({
      viewVersion: 5,
      title: 'Earlier epoch',
      resolution: null,
      interaction: null,
      canRespond: false,
    });
    const next = makeStorySnapshot({
      viewVersion: 5,
      title: 'Later epoch',
      resolution: null,
      interaction: null,
      canRespond: false,
    });
    const result = reconcileStorySnapshot({
      viewerId,
      storyId,
      prior,
      priorEpoch: 7,
      next,
      nextEpoch: 8,
    });
    expect(result.accepted).toBe(true);
    expect(result.snapshot?.current.content.title).toBe('Later epoch');
  });
});
