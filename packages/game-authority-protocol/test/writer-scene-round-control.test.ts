import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  routeWriterSceneRoundControl,
  writerSceneRoundExecutionPlanSchema,
  writerSceneRoundFinalizeResultSchema,
  writerSceneRoundFinalizePath,
  writerSceneRoundPlanPath,
  writerSceneRoundStatePath,
} from '../src/writer-scene-round-control';

const missionId = randomUUID();

test('writer scene round control paths and routing', () => {
  assert.equal(
    writerSceneRoundPlanPath(missionId),
    `/internal/v1/writer-scene-rounds/${missionId}/plan`,
  );
  assert.equal(
    writerSceneRoundFinalizePath(missionId),
    `/internal/v1/writer-scene-rounds/${missionId}/finalize`,
  );
  assert.equal(
    writerSceneRoundStatePath(missionId),
    `/internal/v1/writer-scene-rounds/${missionId}/state`,
  );
  assert.deepEqual(
    routeWriterSceneRoundControl(
      'POST',
      writerSceneRoundPlanPath(missionId),
    ),
    { kind: 'plan', missionId },
  );
  assert.deepEqual(
    routeWriterSceneRoundControl(
      'POST',
      writerSceneRoundFinalizePath(missionId),
    ),
    { kind: 'finalize', missionId },
  );
  assert.equal(
    routeWriterSceneRoundControl('GET', writerSceneRoundStatePath(missionId))
      .kind,
    'state',
  );
  assert.equal(
    routeWriterSceneRoundControl(
      'POST',
      `/internal/v1/writer-rounds/${missionId}/1/prepare`,
    ).kind,
    'absent',
  );
  assert.equal(
    routeWriterSceneRoundControl(
      'POST',
      writerSceneRoundPlanPath(missionId).replace('/plan', '/bad'),
    ).kind,
    'invalid',
  );
  assert.equal(
    routeWriterSceneRoundControl(
      'GET',
      writerSceneRoundPlanPath(missionId),
    ).kind,
    'invalid',
  );
});

test('writer scene round control schemas include multi-round fields', () => {
  const plan = writerSceneRoundExecutionPlanSchema.parse({
    missionId,
    contextId: missionId,
    ordinal: 3,
    expectedRevision: 2,
    model: 'scripted-offline',
    maxModelRounds: 4,
  });
  assert.equal(plan.maxModelRounds, 4);

  assert.deepEqual(
    writerSceneRoundFinalizeResultSchema.parse({
      status: 'needs-next-round',
      nextOrdinal: 3,
      nextRevision: 1,
    }),
    { status: 'needs-next-round', nextOrdinal: 3, nextRevision: 1 },
  );
  assert.deepEqual(
    writerSceneRoundFinalizeResultSchema.parse({
      status: 'held',
      reason: 'max_model_rounds',
    }),
    { status: 'held', reason: 'max_model_rounds' },
  );
  assert.throws(() =>
    writerSceneRoundFinalizeResultSchema.parse({
      status: 'needs-next-round',
      nextOrdinal: 2,
    }),
  );
});