import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  storytellerControlTaskQueue,
  storytellerDistributedWorkflowType,
  storytellerExecuteTaskQueue,
  storytellerWorkflowId,
  storytellerWorkflowType,
} from '../dist/contracts.js';

const here = dirname(fileURLToPath(import.meta.url));
const indexSource = readFileSync(join(here, '../src/index.ts'), 'utf8');

test('distributed workflow contract names and shared generation identity', () => {
  assert.equal(storytellerDistributedWorkflowType, 'storytellerDistributedV1');
  assert.notEqual(storytellerDistributedWorkflowType, storytellerWorkflowType);
  assert.equal(storytellerExecuteTaskQueue, 'storyteller-execute-v1');
  assert.equal(storytellerControlTaskQueue, 'control');

  const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  assert.equal(
    storytellerWorkflowId(generationId),
    `storyteller/${generationId}`,
  );
  assert.equal(
    storytellerWorkflowId(generationId),
    storytellerWorkflowId(generationId),
  );
});

test('negative: stable workflow id never uses a distributed prefix', () => {
  const generationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const workflowId = storytellerWorkflowId(generationId);
  assert.doesNotMatch(workflowId, /storyteller-distributed\//);
  assert.equal(workflowId, `storyteller/${generationId}`);
});

test('legacy storytellerV1 workflow body stays single-activity', () => {
  const storytellerBlock = indexSource.slice(
    indexSource.indexOf('export async function storytellerV1'),
    indexSource.indexOf('const distributedExecuteRetry'),
  );
  assert.match(storytellerBlock, /await completeStoryteller\(id\)/);
  assert.equal(
    [...storytellerBlock.matchAll(/await completeStoryteller/g)].length,
    1,
  );
  assert.doesNotMatch(storytellerBlock, /executeFrozenStoryteller/);
  assert.doesNotMatch(storytellerBlock, /publishSavedStoryteller/);
});

test('storytellerDistributedV1 orders execution then publish on distinct queues', () => {
  const distributedBlock = indexSource.slice(
    indexSource.indexOf('export async function storytellerDistributedV1'),
    indexSource.indexOf('const { advanceCampaignActivity }'),
  );
  assert.match(
    distributedBlock,
    /await executeFrozenStoryteller\(generationId\);\s*\n\s*await publishSavedStoryteller\(generationId\)/,
  );
  assert.match(indexSource, /taskQueue: storytellerExecuteTaskQueue/);
  assert.match(indexSource, /taskQueue: storytellerControlTaskQueue/);
  assert.match(indexSource, /maximumAttempts: 5/);
  const executeRetry = indexSource.slice(
    indexSource.indexOf('const distributedExecuteRetry'),
    indexSource.indexOf('const publicationRetry'),
  );
  const publicationPolicy = indexSource.slice(
    indexSource.indexOf('const publicationRetry'),
    indexSource.indexOf('const { publishSavedStoryteller }'),
  );
  assert.match(executeRetry, /maximumAttempts: 5/);
  assert.match(publicationPolicy, /initialInterval: '2 seconds'/);
  assert.match(publicationPolicy, /maximumInterval: '30 seconds'/);
  assert.doesNotMatch(publicationPolicy, /maximumAttempts/);
});
