import assert from 'node:assert/strict';
import test from 'node:test';
import {
  forceClearConnectedRigLockForTests,
  openConnectedRig,
} from '../dist/developer-tools/index.js';

test('live-stack connected rig provisions migrated DB against local Temporal', async () => {
  forceClearConnectedRigLockForTests();
  const rig = await openConnectedRig({
    ownerId: 'owner-live',
    confirmConnectedRig: true,
    mode: 'live-stack',
    temporalAddress: '127.0.0.1:7233',
  });
  try {
    assert.equal(rig.status, 'completed');
    assert.equal(rig.effectCount, 1);
    assert.equal(rig.deliveries, 2);
    assert.ok(rig.evidenceId);
    assert.match(rig.plan.databaseName, /^offscreen_chamber_run_/);
  } finally {
    const cleaned = await rig.cleanup();
    assert.equal(cleaned.cleaned, true);
    forceClearConnectedRigLockForTests();
  }
});
