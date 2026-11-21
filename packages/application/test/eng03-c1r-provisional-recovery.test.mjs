import assert from 'node:assert/strict';
import test from 'node:test';
import { storytellerContextCaptureKind } from '../dist/storyteller/context-capture.js';

/**
 * Provider-free projection of the ENG03-C1-R read policy.
 * Mirrors packages/story-engine/src/stories/reads.ts provisional branch.
 */
function projectProvisionalResolution({ generationKind, captureState }) {
  const provisional = generationKind === storytellerContextCaptureKind;
  if (!provisional) {
    return { provisional: false };
  }
  const blocker =
    captureState === 'held'
      ? { kind: 'generation', recovery: 'operator' }
      : null;
  return {
    provisional: true,
    blocker,
    canRetry: false,
    reason: null,
  };
}

test('ENG03-C1-R: provisional in-progress capture never offers player retry', () => {
  for (const captureState of ['captured', 'materializing']) {
    const projected = projectProvisionalResolution({
      generationKind: storytellerContextCaptureKind,
      captureState,
    });
    assert.equal(projected.canRetry, false);
    assert.equal(projected.blocker, null);
    assert.equal(projected.reason, null);
  }
});

test('ENG03-C1-R: exhausted held provisional exposes operator blocker only', () => {
  const projected = projectProvisionalResolution({
    generationKind: storytellerContextCaptureKind,
    captureState: 'held',
  });
  assert.equal(projected.canRetry, false);
  assert.deepEqual(projected.blocker, {
    kind: 'generation',
    recovery: 'operator',
  });
  assert.equal(projected.reason, null);
});

test('ENG03-C1-R: promoted profiled kind is not treated as provisional', () => {
  const projected = projectProvisionalResolution({
    generationKind: 'storyteller.profiled.v1',
    captureState: 'ready',
  });
  assert.equal(projected.provisional, false);
});
