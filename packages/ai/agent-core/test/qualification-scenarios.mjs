import { WorkflowExecutionAlreadyStartedError, WorkflowFailedError } from '@temporalio/client';
import { isCancellation } from '@temporalio/workflow';
import { FIXTURE } from './fixtures/scenarios.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function outcomeOf(handle) {
  return handle.result();
}

async function nativeName(handle) {
  const described = await handle.describe();
  return described.status.name ?? String(described.status);
}

function scheduledCount(summary, name) {
  return summary.counts[name] ?? summary.scheduled.filter((item) => item.name === name).length;
}

function physical(summary, kind, phase) {
  return summary.observations.filter((item) => item.kind === kind && item.phase === phase);
}

function assertOnce(summary, kind, scheduledName, phase) {
  assert(scheduledCount(summary, scheduledName) === physical(summary, kind, phase).length, `${kind} physical count`);
  assert(summary.observations.filter((item) => item.kind === kind).every((item) => item.attempt === 1), `${kind} retried`);
}

export async function runScenarios(harness) {
  const cases = [];
  let completedP1 = null;
  let researcherSingle = null;
  let stopped = false;

  async function check(name, fn) {
    if (stopped) return;
    try {
      const detail = await fn();
      cases.push({ name, status: 'pass', ...detail });
    } catch (error) {
      stopped = true;
      const evidence = harness.failureEvidence ? await harness.failureEvidence(error) : { message: String(error?.message ?? 'failed') };
      cases.push({ name, status: 'fail', ...evidence });
    }
  }

  async function run(definitionId, input, requestedTools, maxSteps, testControl) {
    const started = await harness.startMission(
      definitionId,
      input,
      requestedTools,
      maxSteps,
      testControl,
    );
    const outcome = await outcomeOf(started.handle);
    const summary = await harness.history(started.handle);
    return { ...started, outcome, summary, native: await nativeName(started.handle), historyEventCount: summary.eventCount };
  }

  await check('researcher-single', async () => {
    const row = await run('researcher', 'E1_SINGLE', [], 3);
    assert(row.outcome.status === 'completed' && row.outcome.text === FIXTURE.singleResearcher, 'researcher single');
    assert(scheduledCount(row.summary, 'invokeModel') === 1, 'researcher single model');
    assert(scheduledCount(row.summary, 'runSyntheticTool') === 0, 'researcher single tool');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    assert(physical(row.summary, 'tool', 'admitted').length === 0, 'researcher single physical tool');
    researcherSingle = row;
    return { workflowId: row.workflowId, runId: row.summary.runId, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('arithmetic-single', async () => {
    const row = await run('arithmetic', 'E1_SINGLE', [], 3);
    assert(row.outcome.status === 'completed' && row.outcome.text === FIXTURE.singleArithmetic, 'arithmetic single');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'arithmetic single counts');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    return { workflowId: row.workflowId, runId: row.summary.runId, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('researcher-tool', async () => {
    const row = await run('researcher', 'E1_TOOL', ['readDocument'], 3);
    assert(row.outcome.status === 'completed' && row.outcome.text === FIXTURE.researcherAnswer, 'researcher tool');
    assert(scheduledCount(row.summary, 'invokeModel') === 2 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'researcher tool counts');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    assert(physical(row.summary, 'tool', 'completed').length === 1, 'researcher tool physical');
    completedP1 = { workflowId: row.workflowId, definitionId: 'researcher' };
    return { workflowId: row.workflowId, runId: row.summary.runId, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('arithmetic-tool', async () => {
    const row = await run('arithmetic', 'E1_TOOL', ['calculate'], 3);
    assert(row.outcome.text === FIXTURE.arithmeticResult, 'arithmetic tool');
    assert(scheduledCount(row.summary, 'invokeModel') === 2 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'arithmetic tool counts');
    assert(physical(row.summary, 'tool', 'completed').length === 1, 'arithmetic tool physical');
    return { workflowId: row.workflowId, runId: row.summary.runId, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  const denied = [
    ['bad-definition', { version: 1, missionId: '00000000-0000-4000-8000-000000000001', definitionId: 'missing', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: [], maxSteps: 3 }],
    ['bad-version', { version: 1, missionId: '00000000-0000-4000-8000-000000000002', definitionId: 'researcher', definitionVersion: 2, input: 'E1_SINGLE', requestedTools: [], maxSteps: 3 }],
    ['id-mismatch', { version: 1, missionId: '00000000-0000-4000-8000-000000000099', definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: [], maxSteps: 3 }, 'agent-core-e1-00000000-0000-4000-8000-000000000003'],
    ['extra-field', { version: 1, missionId: '00000000-0000-4000-8000-000000000004', definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: [], maxSteps: 3, modelId: 'e1-synthetic' }],
    ['duplicate-tool', { version: 1, missionId: '00000000-0000-4000-8000-000000000005', definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: ['readDocument', 'readDocument'], maxSteps: 3 }],
    ['foreign-tool', { version: 1, missionId: '00000000-0000-4000-8000-000000000006', definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: ['calculate'], maxSteps: 3 }],
    ['steps-zero', { version: 1, missionId: '00000000-0000-4000-8000-000000000007', definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: [], maxSteps: 0 }],
    ['steps-four', { version: 1, missionId: '00000000-0000-4000-8000-000000000008', definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: [], maxSteps: 4 }],
    ['input-limit', { version: 1, missionId: '00000000-0000-4000-8000-000000000009', definitionId: 'researcher', definitionVersion: 1, input: 'x'.repeat(4097), requestedTools: [], maxSteps: 3 }],
  ];

  const deniedCodes = {
    'bad-definition': 'unknown-definition',
    'bad-version': 'invalid-mission',
    'id-mismatch': 'workflow-id-mismatch',
    'extra-field': 'invalid-mission',
    'duplicate-tool': 'invalid-tool-list',
    'foreign-tool': 'tool-not-allowed',
    'steps-zero': 'step-limit',
    'steps-four': 'step-limit',
    'input-limit': 'input-limit',
  };

  for (const [name, raw, workflowId] of denied) {
    await check(name, async () => {
      const id = workflowId ?? `agent-core-e1-${raw.missionId}`;
      const started = await harness.startRaw(raw, id);
      const outcome = await outcomeOf(started.handle);
      const summary = await harness.history(started.handle);
      assert(outcome.status === 'denied' && outcome.code === deniedCodes[name], name);
      assert(scheduledCount(summary, 'invokeModel') === 0 && scheduledCount(summary, 'runSyntheticTool') === 0, `${name} effects`);
      assert(physical(summary, 'model', 'started').length === 0 && physical(summary, 'tool', 'admitted').length === 0, `${name} physical`);
      return { code: outcome.code, counts: summary.counts, historyEventCount: summary.eventCount };
    });
  }

  await check('unknown-model', async () => {
    const row = await run('researcher', 'E1_SINGLE', [], 3, 'unknown-model');
    assert(row.outcome.status === 'failed' && row.outcome.code === 'execution-failed', 'unknown model outcome');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'unknown model once');
    assert(physical(row.summary, 'model', 'completed').length === 0, 'no synthetic success');
    assert(physical(row.summary, 'tool', 'admitted').length === 0, 'unknown model tools');
    assert(row.summary.observations.filter((item) => item.kind === 'model').every((item) => item.attempt === 1), 'unknown model retry');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('unknown-tool', async () => {
    const row = await run('researcher', 'E1_UNKNOWN_TOOL', ['readDocument'], 3);
    assert(row.outcome.status === 'denied' && row.outcome.code === 'tool-not-allowed', 'unknown tool');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'unknown tool counts');
    assert(physical(row.summary, 'tool', 'admitted').length === 0, 'unknown tool physical');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('bad-args', async () => {
    const row = await run('researcher', 'E1_BAD_ARGS', ['readDocument'], 3);
    assert(row.outcome.status === 'denied' && row.outcome.code === 'invalid-tool-input', 'bad args');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'bad args counts');
    assert(physical(row.summary, 'tool', 'admitted').length === 0, 'bad args physical');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('ungranted-tool', async () => {
    const row = await run('researcher', 'E1_UNGRANTED_TOOL', [], 3);
    assert(row.outcome.status === 'denied' && row.outcome.code === 'tool-not-allowed', 'ungranted');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'ungranted counts');
    assert(physical(row.summary, 'tool', 'admitted').length === 0, 'ungranted physical');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('three-tools', async () => {
    const row = await run('researcher', 'E1_THREE_TOOLS', ['readDocument'], 3);
    assert(row.outcome.status === 'limit-reached' && row.outcome.code === 'tool-limit', 'three tools');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 2, 'three tool ceiling');
    assert(physical(row.summary, 'tool', 'admitted').length === 2, 'three tool physical');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('step-ceiling', async () => {
    const row = await run('researcher', 'E1_TOOL', ['readDocument'], 1);
    assert(row.outcome.status === 'limit-reached' && row.outcome.code === 'step-limit', 'step ceiling');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'step ceiling counts');
    assert(physical(row.summary, 'tool', 'completed').length === 1, 'step ceiling physical');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('model-fail', async () => {
    const row = await run('researcher', 'E1_MODEL_FAIL', [], 3);
    assert(row.outcome.status === 'failed' && row.outcome.code === 'execution-failed', 'model fail');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'model fail counts');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    assert(physical(row.summary, 'model', 'completed').length === 0, 'model fail success');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('tool-fail', async () => {
    const row = await run('arithmetic', 'E1_TOOL_FAIL', ['calculate'], 3);
    assert(row.outcome.status === 'failed' && row.outcome.code === 'tool-failed', 'tool fail');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'tool fail counts');
    assert(physical(row.summary, 'tool', 'failed').length === 1 && physical(row.summary, 'tool', 'completed').length === 0, 'tool fail physical');
    assertOnce(row.summary, 'tool', 'runSyntheticTool', 'admitted');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  await check('partial', async () => {
    const row = await run('researcher', 'E1_PARTIAL', [], 3);
    assert(row.outcome.status === 'failed' && row.outcome.code === 'nonterminal-model-output', 'partial');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'partial counts');
    assertOnce(row.summary, 'model', 'invokeModel', 'started');
    return { code: row.outcome.code, counts: row.summary.counts, historyEventCount: row.summary.eventCount };
  });

  async function expectDuplicate(workflowId, raw) {
    try {
      await harness.startRaw(raw, workflowId);
      return null;
    } catch (error) {
      return error;
    }
  }

  await check('duplicate-active', async () => {
    const started = await harness.startMission('researcher', 'E1_SINGLE', [], 3, 'hold-before-loop');
    const before = await harness.history(started.handle);
    const error = await expectDuplicate(started.workflowId, {
      version: 1,
      missionId: started.missionId,
      definitionId: 'researcher',
      definitionVersion: 1,
      input: 'E1_SINGLE',
      requestedTools: [],
      maxSteps: 3,
    });
    const after = await harness.history(started.handle);
    assert(error instanceof WorkflowExecutionAlreadyStartedError, 'duplicate sdk error');
    assert(error.workflowId === started.workflowId, 'duplicate workflow id');
    assert(after.eventCount === before.eventCount, 'duplicate history changed');
    assert(scheduledCount(after, 'invokeModel') === 0 && scheduledCount(after, 'runSyntheticTool') === 0, 'duplicate effects');
    assert(after.observations.length === before.observations.length, 'duplicate observations');
    await started.handle.cancel();
    await harness.waitFor(async () => (await nativeName(started.handle)) === 'CANCELLED', 20000);
    return { workflowId: started.workflowId, runId: after.runId, historyEventCount: after.eventCount };
  });

  await check('duplicate-completed', async () => {
    assert(researcherSingle?.handle, 'completed mission required');
    const before = await harness.history(researcherSingle.handle);
    const error = await expectDuplicate(researcherSingle.workflowId, {
      version: 1,
      missionId: researcherSingle.missionId,
      definitionId: 'researcher',
      definitionVersion: 1,
      input: 'E1_SINGLE',
      requestedTools: [],
      maxSteps: 3,
    });
    const after = await harness.history(researcherSingle.handle);
    assert(error instanceof WorkflowExecutionAlreadyStartedError, 'completed duplicate sdk error');
    assert(error.workflowId === researcherSingle.workflowId, 'completed duplicate id');
    assert(after.eventCount === before.eventCount, 'completed history changed');
    assert(after.scheduled.length === before.scheduled.length, 'completed effects');
    assert(after.observations.length === before.observations.length, 'completed observations');
    return { workflowId: researcherSingle.workflowId, runId: after.runId, historyEventCount: after.eventCount };
  });

  await check('cancel-hold', async () => {
    const started = await harness.startMission('researcher', 'E1_CANCEL_HOLD', [], 3);
    await harness.waitFor(async () => {
      const summary = await harness.history(started.handle);
      return summary.observations.some((item) => item.kind === 'model' && item.phase === 'started');
    }, 15000);
    await started.handle.cancel();
    await harness.waitFor(async () => {
      const status = await nativeName(started.handle);
      return status === 'CANCELLED' || status === 'FAILED' || status === 'COMPLETED' || status === 'TIMED_OUT';
    }, 20000);
    const native = await nativeName(started.handle);
    let resultError = null;
    try {
      await started.handle.result();
    } catch (error) {
      resultError = error;
    }
    const summary = await harness.history(started.handle);
    assert(native === 'CANCELLED', 'cancel native');
    assert(resultError instanceof WorkflowFailedError && isCancellation(resultError.cause), 'native cancellation');
    assert(summary.observations.some((item) => item.kind === 'model' && item.phase === 'aborted'), 'fixture abort');
    assert(physical(summary, 'model', 'completed').length === 0, 'cancel model success');
    assert(scheduledCount(summary, 'runSyntheticTool') === 0 && physical(summary, 'tool', 'admitted').length === 0, 'cancel tools');
    return { native, workflowId: summary.workflowId, runId: summary.runId, historyEventCount: summary.eventCount };
  });

  await check('timeout-hold', async () => {
    const started = await harness.startMission('researcher', 'E1_TIMEOUT_HOLD', [], 3);
    const outcome = await outcomeOf(started.handle);
    const summary = await harness.history(started.handle);
    assert(outcome.status === 'failed' && outcome.code === 'execution-failed', 'activity timeout');
    assert(scheduledCount(summary, 'invokeModel') === 1 && scheduledCount(summary, 'runSyntheticTool') === 0, 'timeout counts');
    assert(physical(summary, 'model', 'completed').length === 0 && physical(summary, 'tool', 'admitted').length === 0, 'timeout success');
    assert(summary.observations.filter((item) => item.kind === 'model').every((item) => item.attempt === 1), 'timeout retry');
    return { code: outcome.code, counts: summary.counts, workflowId: summary.workflowId, runId: summary.runId, historyEventCount: summary.eventCount };
  });

  await check('workflow-timeout', async () => {
    const started = await harness.startMission('researcher', 'E1_SINGLE', [], 3, 'hold-before-loop');
    let native = '';
    try {
      await outcomeOf(started.handle);
    } catch {
      native = await nativeName(started.handle);
    }
    const summary = await harness.history(started.handle);
    assert(native === 'TIMED_OUT', 'workflow timeout');
    assert(scheduledCount(summary, 'invokeModel') === 0 && scheduledCount(summary, 'runSyntheticTool') === 0, 'timeout effects');
    assert(summary.observations.length === 0, 'workflow timeout physical');
    return { native, workflowId: summary.workflowId, runId: summary.runId, historyEventCount: summary.eventCount };
  });

  return { cases, completedP1 };
}
