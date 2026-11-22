import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  storytellerControlTaskQueue,
  storytellerExecuteTaskQueue,
  writerSceneDistributedWorkflowType,
  writerSceneWorkflowType,
} from '../dist/contracts.js';

const here = dirname(fileURLToPath(import.meta.url));
const indexSource = readFileSync(join(here, '../src/index.ts'), 'utf8');

test('writer.scene.v1 dispatch type stays distinct from historical writerSceneV1', () => {
  assert.equal(writerSceneDistributedWorkflowType, 'writerSceneDistributedV2');
  assert.notEqual(writerSceneDistributedWorkflowType, writerSceneWorkflowType);
});

test('writerSceneV1 body remains single scripted activity', () => {
  const v1Block = indexSource.slice(
    indexSource.indexOf('export async function writerSceneV1'),
    indexSource.indexOf('const writerSceneDistributedControlRetry'),
  );
  assert.match(v1Block, /await runScriptedWriterScene\(missionId\)/);
  assert.equal(
    [...v1Block.matchAll(/await runScriptedWriterScene/g)].length,
    1,
  );
  assert.doesNotMatch(v1Block, /executePreparedWriterRound/);
  assert.doesNotMatch(v1Block, /planWriterSceneRound/);
});

test('writerSceneDistributedV2 orders plan, execute, finalize on distinct queues', () => {
  const v2Block = indexSource.slice(
    indexSource.indexOf('export async function writerSceneDistributedV2'),
    indexSource.indexOf('type WriterResearchActivities'),
  );
  assert.match(v2Block, /await planWriterSceneRound\(missionId\)/);
  assert.match(v2Block, /const attemptId = uuid4\(\)/);
  assert.match(v2Block, /await executePreparedWriterRound\(/);
  assert.match(v2Block, /await finalizeWriterSceneRound\(missionId\)/);
  assert.match(
    indexSource,
    /proxyActivities<WriterSceneDistributedExecutionActivities>\(\{[\s\S]*taskQueue: storytellerExecuteTaskQueue/,
  );
  assert.match(
    indexSource,
    /proxyActivities<WriterSceneDistributedControlActivities>\(\{[\s\S]*taskQueue: storytellerControlTaskQueue/,
  );
  assert.equal(storytellerExecuteTaskQueue, 'storyteller-execute-v1');
  assert.equal(storytellerControlTaskQueue, 'control');
  assert.match(indexSource, /maximumAttempts: 1/);
});

test('writerSceneDistributedV2 reads GA state on uncertain executor terminals', () => {
  const v2Block = indexSource.slice(
    indexSource.indexOf('function holdWriterSceneRound'),
    indexSource.indexOf('type WriterResearchActivities'),
  );
  assert.match(v2Block, /executorResult\.status === 'replayed'/);
  assert.match(v2Block, /await readWriterSceneRoundMissionState\(missionId\)/);
  assert.match(v2Block, /WriterSceneHeld/);
  assert.match(v2Block, /WriterSceneUncertain/);
});