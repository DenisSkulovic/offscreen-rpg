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
  const loopSource = readFileSync(
    join(here, '../src/writer-scene-distributed-v2-round-loop.ts'),
    'utf8',
  );
  assert.match(v2Block, /runWriterSceneDistributedV2RoundLoop/);
  assert.match(loopSource, /await deps\.planWriterSceneRound\(missionId\)/);
  assert.match(loopSource, /deps\.nextAttemptId\(\)/);
  assert.match(loopSource, /await deps\.executePreparedWriterRound\(/);
  assert.match(loopSource, /await deps\.finalizeWriterSceneRound\(missionId\)/);
  assert.match(loopSource, /needs-next-round/);
  assert.match(loopSource, /maxModelRounds/);
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
  const loopSource = readFileSync(
    join(here, '../src/writer-scene-distributed-v2-round-loop.ts'),
    'utf8',
  );
  const helperBlock = indexSource.slice(
    indexSource.indexOf('function holdWriterSceneRound'),
    indexSource.indexOf('export async function writerSceneDistributedV2'),
  );
  assert.match(loopSource, /executorResult\.status === 'replayed'/);
  assert.match(
    loopSource,
    /await deps\.readWriterSceneRoundMissionState\(missionId\)/,
  );
  const uncertainBranch = loopSource.match(
    /} else if \(executorResult\.status === 'uncertain'\) \{[\s\S]*?\n    \}/,
  )?.[0];
  assert.ok(uncertainBranch);
  assert.match(uncertainBranch, /uncertainWriterSceneRound/);
  assert.doesNotMatch(uncertainBranch, /finalizeWriterSceneRound/);
  assert.match(helperBlock, /WriterSceneHeld/);
  assert.match(helperBlock, /WriterSceneUncertain/);
});