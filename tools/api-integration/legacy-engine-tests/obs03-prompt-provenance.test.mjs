import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  prepareStorytellerTask,
  storytellerPromptComponentCatalogueV1,
} from '@offscreen/storyteller/tasks';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import { inspectOpenRouterRequest } from '@offscreen/storyteller/providers/openrouter';
import {
  buildConsequencePromptProvenance,
  hashCompiledRequest,
  hashStorytellerTaskInput,
} from '../../../packages/story-engine/dist/storyteller/prompt-provenance.js';

function sha(value) {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

test('OBS03: catalogue export does not change compiled request or packet SHA', () => {
  const [fixture] = createRequestAuditFixtureCases({
    caseIds: ['activity-consequence'],
  });
  const first = prepareStorytellerTask(fixture.task);
  const second = prepareStorytellerTask(fixture.task);
  assert.equal(hashCompiledRequest(first), hashCompiledRequest(second));
  assert.equal(hashStorytellerTaskInput(first), hashStorytellerTaskInput(second));
  assert.equal(
    inspectOpenRouterRequest(first).sha256,
    inspectOpenRouterRequest(second).sha256,
  );
  assert.ok(storytellerPromptComponentCatalogueV1.length >= 4);
  assert.equal(
    storytellerPromptComponentCatalogueV1[0].contentSha256.length,
    64,
  );
});

test('OBS03: consequence sidecar lists included system components and source decisions', () => {
  const [fixture] = createRequestAuditFixtureCases({
    caseIds: ['activity-consequence'],
  });
  const task = prepareStorytellerTask(fixture.task);
  assert.equal(task.task, 'consequence');
  const generationId = '00000000-0000-4000-8000-000000000099';
  const manifest = buildConsequencePromptProvenance({
    generationId,
    task,
    captureStatus: 'promoted',
  });
  assert.equal(manifest.generationId, generationId);
  assert.equal(manifest.sourceKind, 'consequence');
  assert.equal(manifest.compiledRequestSha256, hashCompiledRequest(task));
  assert.equal(manifest.taskInputSha256, hashStorytellerTaskInput(task));
  const continuity = manifest.components.find(
    (row) => row.stableComponentKey === 'system/continuity',
  );
  assert.equal(continuity?.included, true);
  assert.equal(manifest.coverage.exactRequestComparison, 'sidecar-additive');
  assert.equal(
    JSON.stringify(manifest).toLowerCase().includes('you propose a playable'),
    false,
  );
  assert.ok(manifest.effectiveSettings.profileId);
  assert.equal(sha(task.request), manifest.compiledRequestSha256);
});

test('OBS03: opening branch omits continuity component in catalogue inclusion', () => {
  const continuity = storytellerPromptComponentCatalogueV1.find(
    (row) => row.stableComponentKey === 'system/continuity',
  );
  assert.equal(continuity.includedForTasks.includes('opening'), false);
  assert.equal(continuity.includedForTasks.includes('consequence'), true);
});
