import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  connectedRigLockOccupied,
  forceClearConnectedRigLockForTests,
  openConnectedRig,
  planConnectedRig,
  ConnectedRigError,
} from '../dist/developer-tools/index.js';

test('plan isolates run DB/queue names under sandbox naming', () => {
  const runId = randomUUID();
  const plan = planConnectedRig({ runId });
  assert.equal(plan.serialOnly, true);
  assert.equal(plan.providerMode, 'offline');
  assert.match(plan.databaseName, /^offscreen_chamber_run_[a-f0-9]{32}$/);
  assert.match(plan.taskQueue, /^chamber-connected-/);
});

test('without confirmation connected rig is blocked; fake path proves one effect', async () => {
  forceClearConnectedRigLockForTests();
  const blocked = await openConnectedRig({
    ownerId: 'owner-a',
    confirmConnectedRig: false,
  });
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.blockedReason ?? '', /confirmConnectedRig/);

  const rig = await openConnectedRig({
    ownerId: 'owner-a',
    confirmConnectedRig: true,
    mode: 'fake-offline',
  });
  assert.equal(rig.status, 'completed');
  assert.equal(rig.effectCount, 1);
  assert.equal(rig.deliveries, 2);
  assert.ok(rig.evidenceId);
  assert.equal(connectedRigLockOccupied(), true);

  await assert.rejects(
    () =>
      openConnectedRig({
        ownerId: 'owner-b',
        confirmConnectedRig: true,
        mode: 'fake-offline',
      }),
    (error) =>
      error instanceof ConnectedRigError && error.code === 'parallel-forbidden',
  );

  const cleaned = await rig.cleanup();
  assert.equal(cleaned.cleaned, true);
  assert.equal(connectedRigLockOccupied(), false);
});

test('live-stack rejects reserved DB and unreachable Temporal', async () => {
  forceClearConnectedRigLockForTests();
  const runId = randomUUID();
  await assert.rejects(
    () =>
      openConnectedRig({
        ownerId: 'owner-a',
        confirmConnectedRig: true,
        mode: 'live-stack',
        runId,
        databaseUrl: 'postgres://127.0.0.1:5432/offscreen_auth_test',
        temporalAddress: '127.0.0.1:7233',
      }),
    (error) =>
      error instanceof ConnectedRigError && error.code === 'isolation',
  );
  await assert.rejects(
    () =>
      openConnectedRig({
        ownerId: 'owner-a',
        confirmConnectedRig: true,
        mode: 'live-stack',
        temporalAddress: '127.0.0.1:1',
      }),
    (error) =>
      error instanceof ConnectedRigError && error.code === 'infra-missing',
  );
});
