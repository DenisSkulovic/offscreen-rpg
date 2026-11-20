import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  BLOCKED_DATA_NAMESPACES,
  classifyPod,
  normalizeImageDigest,
  seedIndex,
  selectTarget,
} from '../selector.mjs';

const DIGEST_A =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const DIGEST_B =
  'sha256:2222222222222222222222222222222222222222222222222222222222222222';

const PINNED_OWNER = {
  namespace: 'lab-app',
  name: 'storyteller-worker',
  uid: 'dep-uid-aaaa',
  kind: 'Deployment',
  imageDigest: DIGEST_A,
  labels: { 'offscreen.rpg/chaos-eligible': 'true' },
};

/** @param {Partial<import('../selector.mjs').PodRecord> & { uid: string, name: string, namespace: string }> fields */
function eligiblePod(fields) {
  return {
    ready: true,
    labels: {},
    containerImageIds: [`registry.example/app@${DIGEST_A}`],
    owner: {
      kind: 'Deployment',
      name: PINNED_OWNER.name,
      uid: PINNED_OWNER.uid,
    },
    ...fields,
  };
}

describe('selectTarget', () => {
  test('stable seed yields deterministic choice among sorted eligible pods', () => {
    const pods = [
      eligiblePod({ uid: 'pod-z', name: 'worker-z', namespace: 'lab-app' }),
      eligiblePod({ uid: 'pod-a', name: 'worker-a', namespace: 'lab-app' }),
      eligiblePod({ uid: 'pod-m', name: 'worker-m', namespace: 'lab-app' }),
    ];
    const first = selectTarget({
      pods,
      releaseOwners: [PINNED_OWNER],
      seed: 'chaos-round-7',
    });
    const second = selectTarget({
      pods,
      releaseOwners: [PINNED_OWNER],
      seed: 'chaos-round-7',
    });
    assert.equal(first.status, 'selected');
    assert.equal(second.status, 'selected');
    assert.equal(first.podUid, second.podUid);
    assert.equal(first.index, second.index);
    assert.equal(first.candidateCount, 3);
    assert.equal(first.ownerUid, PINNED_OWNER.uid);
  });

  test('filters irrelevant pods: wrong digest, not ready, excluded', () => {
    const pods = [
      eligiblePod({ uid: 'good', name: 'worker-good', namespace: 'lab-app' }),
      eligiblePod({
        uid: 'bad-digest',
        name: 'worker-bad',
        namespace: 'lab-app',
        containerImageIds: [`other@${DIGEST_B}`],
      }),
      eligiblePod({
        uid: 'not-ready',
        name: 'worker-down',
        namespace: 'lab-app',
        ready: false,
      }),
      eligiblePod({ uid: 'skipped', name: 'worker-skip', namespace: 'lab-app' }),
    ];
    const result = selectTarget({
      pods,
      releaseOwners: [PINNED_OWNER],
      seed: 0,
      excludedUids: ['skipped'],
    });
    assert.equal(result.status, 'selected');
    assert.equal(result.podUid, 'good');
    assert.equal(result.candidateCount, 1);
  });

  test('refuses when no pod survives eligibility filtering', () => {
    const pods = [
      eligiblePod({
        uid: 'skeleton',
        name: 'placeholder',
        namespace: 'lab-app',
        labels: { 'offscreen.rpg/skeleton': 'placeholder' },
      }),
    ];
    const result = selectTarget({
      pods,
      releaseOwners: [PINNED_OWNER],
      seed: 1,
    });
    assert.deepEqual(result, {
      status: 'refused',
      reason: 'no-eligible-targets',
      allowlistedNamespaces: ['lab-app'],
    });
  });
});

describe('negative refusal reasons via classifyPod', () => {
  test('changed owner uid is refused', () => {
    const pod = eligiblePod({
      uid: 'pod-1',
      name: 'worker',
      namespace: 'lab-app',
      owner: {
        kind: 'Deployment',
        name: PINNED_OWNER.name,
        uid: 'dep-uid-CHANGED',
      },
    });
    const verdict = classifyPod(pod, [PINNED_OWNER]);
    assert.equal(verdict.status, 'refused');
    assert.equal(verdict.reason, 'owner-not-pinned');
  });

  test('missing chaos eligibility marker on release', () => {
    const owner = {
      ...PINNED_OWNER,
      labels: { 'offscreen.rpg/chaos-eligible': 'false' },
    };
    const pod = eligiblePod({ uid: 'pod-1', name: 'worker', namespace: 'lab-app' });
    const verdict = classifyPod(pod, [owner]);
    assert.equal(verdict.reason, 'missing-chaos-eligibility');
  });

  test('namespace not on selected release allowlist', () => {
    const pod = eligiblePod({
      uid: 'pod-1',
      name: 'worker',
      namespace: 'lab-random',
    });
    const verdict = classifyPod(pod, [PINNED_OWNER]);
    assert.equal(verdict.reason, 'namespace-not-allowlisted');
    assert.equal(verdict.detail, 'lab-random');
  });

  for (const blocked of ['lab-postgres', 'lab-objects', 'messaging', 'temporal']) {
    test(`blocked data namespace ${blocked} is refused`, () => {
      const owner = { ...PINNED_OWNER, namespace: blocked };
      const pod = eligiblePod({ uid: 'pod-1', name: 'data', namespace: blocked });
      const verdict = classifyPod(pod, [owner]);
      assert.equal(verdict.reason, 'data-workload-namespace');
      assert.equal(verdict.detail, blocked);
      assert.ok(BLOCKED_DATA_NAMESPACES.has(blocked));
    });
  }
});

describe('helpers', () => {
  test('normalizeImageDigest extracts sha256 suffix', () => {
    assert.equal(
      normalizeImageDigest('docker.io/app:tag@sha256:AbCd' + '0'.repeat(58)),
      'sha256:abcd' + '0'.repeat(58),
    );
  });

  test('seedIndex is stable for the same seed', () => {
    assert.equal(seedIndex('seed-a', 5), seedIndex('seed-a', 5));
    assert.notEqual(seedIndex('seed-a', 5), seedIndex('seed-b', 5));
  });
});