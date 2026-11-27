import { Worker } from '@temporalio/worker';
import { AiSdkPlugin } from '@temporalio/vercel-ai-sdk';
import { createFixturePlugin } from './fixtures/model.mjs';
import { FIXTURE } from './fixtures/scenarios.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function named(summary, name) {
  return summary.scheduled.filter((item) => item.name === name);
}

export async function runRecovery(harness, completedP1) {
  assert(completedP1?.workflowId, 'completed P1 is required');
  const replayObservations = [];
  const prior = harness.handle(completedP1.workflowId);
  const replayFixture = createFixturePlugin(replayObservations, () => null);
  await Worker.runReplayHistory(
    {
      workflowsPath: harness.workflowsPath,
      plugins: [
        new AiSdkPlugin({
          modelProvider: replayFixture.modelProvider,
          download: replayFixture.download,
        }),
      ],
    },
    await prior.fetchHistory(),
  );
  assert(replayObservations.length === 0, 'replay dispatched work');

  const started = await harness.startMission(
    'researcher',
    'E1_RESTART',
    ['readDocument'],
    3,
    'hold-after-tool',
  );
  await harness.waitFor(async () => {
    const summary = await harness.history(started.handle);
    const tool = named(summary, 'runSyntheticTool')[0];
    if (!tool || !summary.completedIds.includes(tool.eventId)) return false;
    const taskAfter = summary.workflowTaskCompleted.some((eventId) => Number(eventId) > Number(tool.eventId));
    return taskAfter && named(summary, 'invokeModel').length === 1;
  }, 20000);
  const firstObservations = harness.observations().slice();
  await harness.stopWorker();
  await harness.startWorker();
  await started.handle.signal('e1-release');
  const outcome = await started.handle.result();
  const summary = await harness.history(started.handle);
  const secondObservations = harness.observations();
  assert(outcome.status === 'completed' && outcome.text === FIXTURE.researcherAnswer, 'restart answer');
  assert(named(summary, 'invokeModel').length === 2 && named(summary, 'runSyntheticTool').length === 1, 'restart counts');
  const completedTools = summary.completedIds.filter((id) =>
    named(summary, 'runSyntheticTool').some((item) => item.eventId === id),
  );
  assert(completedTools.length === 1, 'tool completed once');
  assert(
    firstObservations.some((item) => item.kind === 'model') &&
      firstObservations.some((item) => item.kind === 'tool'),
    'worker1 effects',
  );
  assert(
    secondObservations.some((item) => item.kind === 'model') &&
      secondObservations.every((item) => item.kind !== 'tool'),
    'worker2 model only',
  );

  return {
    cases: [
      { name: 'replay', status: 'pass', observations: replayObservations.length, workflowId: completedP1.workflowId },
      {
        name: 'fresh-worker',
        status: 'pass',
        counts: summary.counts,
        workflowId: started.workflowId,
      },
    ],
  };
}
