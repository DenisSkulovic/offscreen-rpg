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

/** WorkflowTaskCompleted must be strictly after the tool ActivityTaskCompleted, with no later model schedule. */
export function toolCompletionSettled(summary) {
  const tools = named(summary, 'runSyntheticTool');
  if (tools.length !== 1) return false;
  const completion = summary.completions.find((item) => String(item.scheduledEventId) === String(tools[0].eventId));
  if (!completion) return false;
  const taskAfter = summary.workflowTaskCompleted.some((eventId) => Number(eventId) > Number(completion.eventId));
  const laterModel = named(summary, 'invokeModel').some((item) => Number(item.eventId) > Number(completion.eventId));
  return taskAfter && !laterModel;
}

function missionScoped(list, workflowId, runId) {
  return (list ?? []).filter((item) => item.workflowId === workflowId && (!runId || item.runId === runId));
}

export async function runRecovery(harness, completedP1) {
  const cases = [];
  try {
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
    cases.push({ name: 'replay', status: 'pass', observations: replayObservations.length, workflowId: completedP1.workflowId });
  } catch (error) {
    const evidence = harness.failureEvidence ? await harness.failureEvidence(error) : { message: String(error?.message ?? 'failed') };
    cases.push({ name: 'replay', status: 'fail', ...evidence });
    return { cases };
  }

  try {
    const generationBefore = harness.generations().length;
    const started = await harness.startMission(
      'researcher',
      'E1_RESTART',
      ['readDocument'],
      3,
      'hold-after-tool',
    );
    const described = await started.handle.describe();
    await harness.waitFor(async () => toolCompletionSettled(await harness.history(started.handle)), 20000);
    const firstObservations = missionScoped(harness.generations()[generationBefore - 1], described.workflowId, described.runId);
    await harness.stopWorker();
    await harness.startWorker();
    await started.handle.signal('e1-release');
    const outcome = await started.handle.result();
    const summary = await harness.history(started.handle);
    const secondObservations = missionScoped(harness.generations().at(-1), described.workflowId, described.runId);
    assert(outcome.status === 'completed' && outcome.text === FIXTURE.researcherAnswer, 'restart answer');
    assert(named(summary, 'invokeModel').length === 2 && named(summary, 'runSyntheticTool').length === 1, 'restart counts');
    const completedTools = summary.completions.filter((item) =>
      named(summary, 'runSyntheticTool').some((scheduled) => String(scheduled.eventId) === String(item.scheduledEventId)),
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
    cases.push({
      name: 'fresh-worker',
      status: 'pass',
      counts: summary.counts,
      workflowId: started.workflowId,
      runId: summary.runId,
      historyEventCount: summary.eventCount,
    });
  } catch (error) {
    const evidence = harness.failureEvidence ? await harness.failureEvidence(error) : { message: String(error?.message ?? 'failed') };
    cases.push({ name: 'fresh-worker', status: 'fail', ...evidence });
  }
  return { cases };
}
