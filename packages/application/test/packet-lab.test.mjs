import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  assertHeldPacketSafe,
  materializeHeldPacketEvidence,
  PacketLabError,
  refuseUnauthorizedLiveRelease,
} from '../dist/developer-tools/index.js';

const held = () => ({
  generationId: randomUUID(),
  packetHash: 'a'.repeat(64),
  state: 'held',
  selectedRoute: 'openrouter:dry-run-unselected',
  estimatedInputBytes: 2048,
  estimatedBudgetMicrousd: 0,
  providerAttempts: 0,
  verifiedChargeMicrousd: 0,
  rawPrompt: 'SECRET_WORLD_BIBLE_PROMPT',
  providerReply: null,
  dispatchAttempted: false,
});

test('held packet materializes redacted LabRun evidence with zero charge', () => {
  const result = materializeHeldPacketEvidence({
    snapshot: held(),
    expectedHash: 'a'.repeat(64),
    gitCommit: 'packetlabdeadbeef',
    dirty: false,
  });
  assert.equal(result.capsule.providerMode, 'held');
  assert.equal(result.capsule.sideEffectCounts.providerAttempts, 0);
  assert.equal(result.capsule.sideEffectCounts.verifiedChargeMicrousd, 0);
  assert.equal(result.safeInspection.providerAttempts, 0);
  assert.match(result.reproduction, /chamber:packet/);
  const serialized = JSON.stringify(result.capsule);
  assert.equal(serialized.includes('SECRET_WORLD_BIBLE_PROMPT'), false);
  assert.equal(serialized.includes('sk-should-never-leak'), false);
});

test('negatives: dispatch tripwire, hash mismatch, live unauthorized', () => {
  assert.throws(
    () =>
      assertHeldPacketSafe({
        ...held(),
        dispatchAttempted: true,
      }),
    (error) =>
      error instanceof PacketLabError && error.code === 'dispatch-tripwire',
  );
  assert.throws(
    () =>
      materializeHeldPacketEvidence({
        snapshot: held(),
        expectedHash: 'b'.repeat(64),
      }),
    (error) =>
      error instanceof PacketLabError && error.code === 'hash-mismatch',
  );
  assert.throws(
    () =>
      refuseUnauthorizedLiveRelease({
        mode: 'authorized-live',
        explicitRoute: null,
        explicitCapMicrousd: null,
        authorizeToken: null,
      }),
    (error) =>
      error instanceof PacketLabError && error.code === 'live-unauthorized',
  );
  refuseUnauthorizedLiveRelease({ mode: 'held' });
});
