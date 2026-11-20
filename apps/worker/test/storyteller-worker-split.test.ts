import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  storytellerControlTaskQueue,
  storytellerExecuteTaskQueue,
} from '@offscreen/workflows/contracts';

const srcRoot = join(__dirname, '../../src');

test('legacy runtime worker does not register distributed execution activities', () => {
  const legacyRuntime = readFileSync(join(srcRoot, 'runtime/index.ts'), 'utf8');
  const legacyActivities = readFileSync(
    join(srcRoot, 'activities/index.ts'),
    'utf8',
  );
  assert.doesNotMatch(legacyRuntime, /executeFrozenStoryteller/);
  assert.doesNotMatch(legacyActivities, /executeFrozenStoryteller/);
  assert.doesNotMatch(legacyActivities, /publishSavedStoryteller/);
});

test('split runtimes bind the dedicated temporal task queues', () => {
  const executionRuntime = readFileSync(
    join(srcRoot, 'runtime/execution.ts'),
    'utf8',
  );
  const controlRuntime = readFileSync(join(srcRoot, 'runtime/control.ts'), 'utf8');
  assert.match(executionRuntime, /storytellerExecuteTaskQueue/);
  assert.match(controlRuntime, /storytellerControlTaskQueue/);
  assert.equal(storytellerExecuteTaskQueue, 'storyteller-execute-v1');
  assert.equal(storytellerControlTaskQueue, 'control');
  assert.doesNotMatch(executionRuntime, /workflowsPath/);
  assert.doesNotMatch(executionRuntime, /createDatabase/);
  assert.match(controlRuntime, /workflowsPath/);
});