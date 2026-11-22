import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import {
  WRITER_SCENE_WAKE_TOPIC,
  buildWriterContinuationCapture,
} from '../dist/storyteller/writer-continuation.js';

const BASE_SHA = 'a'.repeat(64);

function scheduleInput(overrides = {}) {
  return {
    storyId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    basePassageId: randomUUID(),
    baseSceneSequence: 1,
    baseCheckpointHash: BASE_SHA,
    baseRootHash: BASE_SHA,
    baseRootRevision: 1,
    baseNarrativeRevision: 1,
    baseCampaignStateRevision: 0,
    controllingIntentOrReceiptId: randomUUID(),
    ...overrides,
  };
}

test('scripted continuation capture omits providerPolicy and pins scripted-offline', () => {
  const capture = buildWriterContinuationCapture({
    generationId: randomUUID(),
    ownerId: randomUUID(),
    schedule: scheduleInput(),
  });
  assert.equal(capture.capture.modelSelection.model, 'scripted-offline');
  assert.equal(capture.capture.providerPolicy, undefined);
});

test('provider admission pins model and policy on v3 capture', () => {
  const capture = buildWriterContinuationCapture({
    generationId: randomUUID(),
    ownerId: randomUUID(),
    schedule: scheduleInput({
      admission: {
        mode: 'provider',
        model: 'test/wr11-model',
        policyVersion: 'writer-round-lab.v2',
      },
    }),
  });
  assert.equal(capture.capture.modelSelection.provider, 'openrouter');
  assert.equal(capture.capture.modelSelection.model, 'test/wr11-model');
  assert.deepEqual(capture.capture.providerPolicy, {
    version: 'writer-round-lab.v2',
    model: 'test/wr11-model',
  });
});

test('provider admission rejects empty model or policy version', () => {
  assert.throws(
    () =>
      buildWriterContinuationCapture({
        generationId: randomUUID(),
        ownerId: randomUUID(),
        schedule: scheduleInput({
          admission: {
            mode: 'provider',
            model: '   ',
            policyVersion: 'writer-round-lab.v2',
          },
        }),
      }),
    /writer_continuation_provider_model_required/,
  );
  assert.throws(
    () =>
      buildWriterContinuationCapture({
        generationId: randomUUID(),
        ownerId: randomUUID(),
        schedule: scheduleInput({
          admission: {
            mode: 'provider',
            model: 'test/wr11-model',
            policyVersion: '',
          },
        }),
      }),
    /writer_continuation_provider_policy_version_required/,
  );
});

test('narrative intent plan cannot carry provider admission fields', () => {
  const plan = narrativeIntentPlanSchema.parse({
    kind: 'narrative-intent.v1',
    key: 'study',
    label: 'Study',
    intention: 'Watch the road.',
    risk: 'Seen.',
    fictionalDurationSeconds: 1,
    effects: [],
  });
  assert.equal(plan.kind, 'narrative-intent.v1');
  assert.throws(
    () =>
      narrativeIntentPlanSchema.parse({
        kind: 'narrative-intent.v1',
        key: 'study',
        label: 'Study',
        intention: 'Watch the road.',
        risk: 'Seen.',
        fictionalDurationSeconds: 1,
        effects: [],
        writerProviderModel: 'evil/model',
        writerPolicyVersion: 'forged',
      }),
    /Unrecognized key/,
  );
});

test('writer.scene.v1 topic unchanged for provider admission wiring', () => {
  assert.equal(WRITER_SCENE_WAKE_TOPIC, 'writer.scene.v1');
});