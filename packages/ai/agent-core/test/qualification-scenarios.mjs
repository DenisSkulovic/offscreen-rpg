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

export async function runScenarios(harness) {
  const cases = [];
  let completedP1 = null;

  async function check(name, fn) {
    const detail = await fn();
    cases.push({ name, status: 'pass', ...detail });
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
    return { ...started, outcome, summary, native: await nativeName(started.handle) };
  }

  await check('researcher-single', async () => {
    const row = await run('researcher', 'E1_SINGLE', [], 3);
    assert(row.outcome.status === 'completed' && row.outcome.text === FIXTURE.singleResearcher, 'researcher single');
    assert(scheduledCount(row.summary, 'invokeModel') === 1, 'researcher single model');
    assert(scheduledCount(row.summary, 'runSyntheticTool') === 0, 'researcher single tool');
    return { workflowId: row.workflowId, counts: row.summary.counts };
  });

  await check('arithmetic-single', async () => {
    const row = await run('arithmetic', 'E1_SINGLE', [], 3);
    assert(row.outcome.text === FIXTURE.singleArithmetic, 'arithmetic single');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'arithmetic single counts');
    return { workflowId: row.workflowId, counts: row.summary.counts };
  });

  await check('researcher-tool', async () => {
    const row = await run('researcher', 'E1_TOOL', ['readDocument'], 3);
    assert(row.outcome.status === 'completed' && row.outcome.text === FIXTURE.researcherAnswer, 'researcher tool');
    assert(scheduledCount(row.summary, 'invokeModel') === 2 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'researcher tool counts');
    completedP1 = { workflowId: row.workflowId, definitionId: 'researcher' };
    return { workflowId: row.workflowId, counts: row.summary.counts };
  });

  await check('arithmetic-tool', async () => {
    const row = await run('arithmetic', 'E1_TOOL', ['calculate'], 3);
    assert(row.outcome.text === FIXTURE.arithmeticResult, 'arithmetic tool');
    assert(scheduledCount(row.summary, 'invokeModel') === 2 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'arithmetic tool counts');
    return { workflowId: row.workflowId, counts: row.summary.counts };
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

  for (const [name, raw, workflowId] of denied) {
    await check(name, async () => {
      const id = workflowId ?? `agent-core-e1-${raw.missionId}`;
      const started = await harness.startRaw(raw, id);
      const outcome = await outcomeOf(started.handle);
      const summary = await harness.history(started.handle);
      assert(outcome.status === 'denied', name);
      assert(scheduledCount(summary, 'invokeModel') === 0 && scheduledCount(summary, 'runSyntheticTool') === 0, `${name} effects`);
      return { code: outcome.code, counts: summary.counts };
    });
  }

  await check('unknown-model', async () => {
    const row = await run('researcher', 'E1_SINGLE', [], 3, 'unknown-model');
    assert(row.outcome.status === 'failed', 'unknown model outcome');
    assert(scheduledCount(row.summary, 'runSyntheticTool') === 0, 'unknown model tools');
    assert(row.summary.observations.every((item) => item.phase !== 'completed' || item.kind !== 'model'), 'no synthetic success');
    return { counts: row.summary.counts };
  });

  await check('unknown-tool', async () => {
    const row = await run('researcher', 'E1_UNKNOWN_TOOL', ['readDocument'], 3);
    assert(row.outcome.status === 'denied', 'unknown tool');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'unknown tool counts');
    return { code: row.outcome.code };
  });

  await check('bad-args', async () => {
    const row = await run('researcher', 'E1_BAD_ARGS', ['readDocument'], 3);
    assert(row.outcome.status === 'denied' && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'bad args');
    return { code: row.outcome.code };
  });

  await check('ungranted-tool', async () => {
    const row = await run('researcher', 'E1_UNGRANTED_TOOL', [], 3);
    assert(row.outcome.status === 'denied', 'ungranted');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'ungranted counts');
    return { code: row.outcome.code };
  });

  await check('three-tools', async () => {
    const row = await run('researcher', 'E1_THREE_TOOLS', ['readDocument'], 3);
    assert(row.outcome.status === 'limit-reached', 'three tools');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') <= 2, 'three tool ceiling');
    return { counts: row.summary.counts };
  });

  await check('step-ceiling', async () => {
    const row = await run('researcher', 'E1_TOOL', ['readDocument'], 1);
    assert(row.outcome.status === 'limit-reached', 'step ceiling');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'step ceiling counts');
    return { counts: row.summary.counts };
  });

  await check('model-fail', async () => {
    const row = await run('researcher', 'E1_MODEL_FAIL', [], 3);
    assert(row.outcome.status === 'failed' && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'model fail');
    return { code: row.outcome.code };
  });

  await check('tool-fail', async () => {
    const row = await run('arithmetic', 'E1_TOOL_FAIL', ['calculate'], 3);
    assert(row.outcome.status === 'failed', 'tool fail');
    assert(scheduledCount(row.summary, 'invokeModel') === 1 && scheduledCount(row.summary, 'runSyntheticTool') === 1, 'tool fail counts');
    return { code: row.outcome.code };
  });

  await check('partial', async () => {
    const row = await run('researcher', 'E1_PARTIAL', [], 3);
    assert(row.outcome.status === 'failed' && scheduledCount(row.summary, 'runSyntheticTool') === 0, 'partial');
    return { code: row.outcome.code };
  });

  await check('duplicate-active', async () => {
    const started = await harness.startMission('researcher', 'E1_SINGLE', [], 3, 'hold-before-loop');
    let rejected = false;
    try {
      await harness.startRaw({ version: 1, missionId: started.missionId, definitionId: 'researcher', definitionVersion: 1, input: 'E1_SINGLE', requestedTools: [], maxSteps: 3 }, started.workflowId);
    } catch {
      rejected = true;
    }
    const before = await harness.history(started.handle);
    await started.handle.cancel();
    assert(rejected, 'duplicate start');
    assert(scheduledCount(before, 'invokeModel') === 0 && scheduledCount(before, 'runSyntheticTool') === 0, 'duplicate effects');
    return { workflowId: started.workflowId };
  });

  await check('cancel-hold', async () => {
    const started = await harness.startMission('researcher', 'E1_CANCEL_HOLD', [], 3);
    await harness.waitFor(async () => {
      const summary = await harness.history(started.handle);
      return summary.observations.some((item) => item.kind === 'model' && item.phase === 'started');
    }, 15000);
    await started.handle.cancel();
    const native = await nativeName(started.handle);
    const summary = await harness.history(started.handle);
    assert(native === 'CANCELLED', 'cancel native');
    assert(scheduledCount(summary, 'runSyntheticTool') === 0, 'cancel tools');
    return { native };
  });

  await check('timeout-hold', async () => {
    const started = await harness.startMission('researcher', 'E1_TIMEOUT_HOLD', [], 3);
    const outcome = await outcomeOf(started.handle);
    const summary = await harness.history(started.handle);
    assert(outcome.status === 'failed' && outcome.code === 'execution-failed', 'activity timeout');
    assert(scheduledCount(summary, 'runSyntheticTool') === 0, 'timeout tools');
    return { code: outcome.code };
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
    return { native };
  });

  return { cases, completedP1 };
}
