import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { writerSceneDistributedWorkflowType } from '../dist/contracts.js';
import { runWriterSceneDistributedV2RoundLoop } from '../dist/writer-scene-distributed-v2-round-loop.js';

const missionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function basePlan(overrides = {}) {
  return {
    missionId,
    contextId: missionId,
    ordinal: 1,
    expectedRevision: 1,
    model: 'fake-model',
    maxModelRounds: 2,
    ...overrides,
  };
}

function createDeps(overrides = {}) {
  const calls = {
    plan: 0,
    execute: 0,
    finalize: 0,
    readState: 0,
    attemptIds: [],
  };

  const deps = {
    async planWriterSceneRound() {
      calls.plan += 1;
      if (calls.plan === 1) {
        return basePlan({ ordinal: 1, expectedRevision: 1 });
      }
      return basePlan({ ordinal: 2, expectedRevision: 2 });
    },
    async readWriterSceneRoundMissionState() {
      calls.readState += 1;
      return { status: 'pending' };
    },
    async executePreparedWriterRound(input) {
      calls.execute += 1;
      calls.attemptIds.push(input.attemptId);
      return { status: 'delivered' };
    },
    async finalizeWriterSceneRound() {
      calls.finalize += 1;
      if (calls.finalize === 1) {
        return {
          status: 'needs-next-round',
          nextOrdinal: 2,
          nextRevision: 2,
        };
      }
      return { status: 'published' };
    },
    nextAttemptId() {
      return `attempt-${calls.execute + 1}`;
    },
    holdWriterSceneRound(message) {
      throw new Error(`hold:${message}`);
    },
    uncertainWriterSceneRound(message) {
      throw new Error(`uncertain:${message}`);
    },
    failWriterSceneExecutor(message) {
      throw new Error(`failed:${message}`);
    },
    ...overrides,
  };

  return { deps, calls };
}

test('workflow type name remains writerSceneDistributedV2', () => {
  assert.equal(writerSceneDistributedWorkflowType, 'writerSceneDistributedV2');
});

test('two rounds: needs-next-round then published with two executes', async () => {
  const { deps, calls } = createDeps();
  await runWriterSceneDistributedV2RoundLoop(missionId, deps);
  assert.equal(calls.plan, 2);
  assert.equal(calls.execute, 2);
  assert.equal(calls.finalize, 2);
  assert.deepEqual(calls.attemptIds, ['attempt-1', 'attempt-2']);
});

test('uncertain on round 1 stops without second execute or finalize', async () => {
  const { deps, calls } = createDeps({
    async executePreparedWriterRound() {
      calls.execute += 1;
      return { status: 'uncertain', reason: 'maybe-sent' };
    },
  });
  await assert.rejects(
    () => runWriterSceneDistributedV2RoundLoop(missionId, deps),
    /uncertain:maybe-sent/,
  );
  assert.equal(calls.plan, 1);
  assert.equal(calls.execute, 1);
  assert.equal(calls.finalize, 0);
});

test('writerSceneDistributedV2 delegates to bounded round loop', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const indexSource = readFileSync(join(here, '../src/index.ts'), 'utf8');
  assert.match(indexSource, /runWriterSceneDistributedV2RoundLoop/);
  assert.match(
    indexSource,
    /executePreparedWriterRound[\s\S]*retry: \{ maximumAttempts: 1 \}/,
  );
});