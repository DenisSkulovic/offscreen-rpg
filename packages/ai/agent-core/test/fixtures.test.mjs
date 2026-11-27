import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFINITIONS, FIXTURE, MODEL_ID } from './fixtures/scenarios.mjs';
import { decideFixture, createFixturePlugin } from './fixtures/model.mjs';
import { createFixtureActivities, evaluateFixtureTool, missionWorkflowId } from './fixtures/tools.mjs';

const MISSION = '11111111-1111-4111-8111-111111111111';

function prompt({ definition, scenario, calls = [], results = [] }) {
  return {
    prompt: [
      { role: 'system', content: definition.instructions },
      { role: 'user', content: scenario },
      ...(calls.length
        ? [{ role: 'assistant', content: calls.map((call) => ({ type: 'tool-call', ...call })) }]
        : []),
      ...(results.length ? [{ role: 'tool', content: results }] : []),
    ],
  };
}

const readCall = {
  toolCallId: FIXTURE.callId,
  toolName: 'readDocument',
  input: JSON.stringify({ path: FIXTURE.documentPath }),
};

test('definitions expose distinct tools and markers', () => {
  assert.equal(DEFINITIONS.researcher.toolName, 'readDocument');
  assert.equal(DEFINITIONS.arithmetic.toolName, 'calculate');
  assert.notEqual(DEFINITIONS.researcher.marker, DEFINITIONS.arithmetic.marker);
  assert.equal(MODEL_ID, 'e1-synthetic');
});

test('single-turn answers come from the scenario, not a counter', () => {
  const researcher = decideFixture(prompt({ definition: DEFINITIONS.researcher, scenario: 'E1_SINGLE' }));
  const again = decideFixture(prompt({ definition: DEFINITIONS.researcher, scenario: 'E1_SINGLE' }));
  assert.equal(researcher.text, FIXTURE.singleResearcher);
  assert.deepEqual(researcher, again);
  assert.equal(
    decideFixture(prompt({ definition: DEFINITIONS.arithmetic, scenario: 'E1_SINGLE' })).text,
    FIXTURE.singleArithmetic,
  );
});

test('tool call then exact result yields the same answer on a fresh decision', () => {
  const first = decideFixture(prompt({ definition: DEFINITIONS.researcher, scenario: 'E1_TOOL' }));
  assert.equal(first.mode, 'tool-calls');
  assert.equal(first.calls[0].toolName, 'readDocument');
  const second = decideFixture(prompt({
    definition: DEFINITIONS.researcher,
    scenario: 'E1_TOOL',
    calls: [readCall],
    results: [{
      type: 'tool-result',
      toolCallId: FIXTURE.callId,
      toolName: 'readDocument',
      output: { type: 'text', value: FIXTURE.documentText },
    }],
  }));
  assert.equal(second.text, FIXTURE.researcherAnswer);
});

test('wrong or error tool results do not become a successful read', () => {
  assert.throws(
    () => decideFixture(prompt({
      definition: DEFINITIONS.researcher,
      scenario: 'E1_TOOL',
      calls: [readCall],
      results: [{
        type: 'tool-result',
        toolCallId: FIXTURE.callId,
        toolName: 'readDocument',
        output: { type: 'text', value: 'spoofed' },
      }],
    })),
    (error) => error.code === 'unexpected-tool-result',
  );
  const errorResult = decideFixture(prompt({
    definition: DEFINITIONS.researcher,
    scenario: 'E1_TOOL',
    calls: [readCall],
    results: [{
      type: 'tool-result',
      toolCallId: FIXTURE.callId,
      toolName: 'readDocument',
      isError: true,
      output: { type: 'error-text', value: 'denied' },
    }],
  }));
  assert.equal(errorResult.text, FIXTURE.falseSuccess);
});

test('ungranted researcher still emits readDocument when no tools are advertised', () => {
  const decision = decideFixture({
    ...prompt({ definition: DEFINITIONS.researcher, scenario: 'E1_UNGRANTED_TOOL' }),
    tools: {},
  });
  assert.equal(decision.calls[0].toolName, 'readDocument');
  assert.equal(decision.calls[0].input, JSON.stringify({ path: FIXTURE.documentPath }));
});

test('unknown model and download are rejected', async () => {
  const observations = [];
  const plugin = createFixturePlugin(observations);
  assert.throws(() => plugin.modelProvider.languageModel('gpt'), (error) => error.code === 'unknown-model');
  await assert.rejects(plugin.download({ url: 'file:///etc/passwd' }), (error) => error.code === 'download-disabled');
  assert.equal(observations.at(-1).phase, 'refused');
});

test('empty effective list and wrong workflow cannot execute a capability', () => {
  const request = {
    missionId: MISSION,
    definitionId: 'researcher',
    definitionVersion: 1,
    effectiveToolNames: [],
    toolName: 'readDocument',
    input: { path: FIXTURE.documentPath },
  };
  assert.throws(
    () => evaluateFixtureTool(request, missionWorkflowId(MISSION)),
    (error) => error.code === 'tool-not-allowed',
  );
  assert.throws(
    () => evaluateFixtureTool(
      { ...request, effectiveToolNames: ['readDocument'] },
      'agent-core-e1-other',
    ),
    (error) => error.code === 'workflow-mismatch',
  );
  assert.throws(
    () => evaluateFixtureTool({
      ...request,
      definitionId: 'arithmetic',
      effectiveToolNames: ['readDocument'],
    }, missionWorkflowId(MISSION)),
    (error) => error.code === 'foreign-capability',
  );
});

test('arithmetic sentinel is admitted and then fails without a result', async () => {
  const observations = [];
  const workflowId = missionWorkflowId(MISSION);
  const activities = createFixtureActivities(observations, () => ({
    info: { workflowExecution: { workflowId }, activityId: '1', attempt: 1 },
    cancellationSignal: { aborted: false },
  }));
  await assert.rejects(
    activities.runSyntheticTool({
      missionId: MISSION,
      definitionId: 'arithmetic',
      definitionVersion: 1,
      effectiveToolNames: ['calculate'],
      toolName: 'calculate',
      input: FIXTURE.failArgs,
    }),
    (error) => error.code === 'synthetic-tool-failure',
  );
  assert.deepEqual(observations.map((item) => item.phase), ['admitted', 'failed']);
  const ok = await activities.runSyntheticTool({
    missionId: MISSION,
    definitionId: 'arithmetic',
    definitionVersion: 1,
    effectiveToolNames: ['calculate'],
    toolName: 'calculate',
    input: FIXTURE.arithmeticArgs,
  });
  assert.equal(ok, '12');
});

test('held model records abort and does not return success', async () => {
  const observations = [];
  const plugin = createFixturePlugin(observations, () => ({
    info: { workflowExecution: { workflowId: 'wf' }, activityId: 'm', attempt: 1 },
  }));
  const model = plugin.modelProvider.languageModel(MODEL_ID);
  const controller = new AbortController();
  const pending = model.doGenerate({
    ...prompt({ definition: DEFINITIONS.researcher, scenario: 'E1_CANCEL_HOLD' }),
    abortSignal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, (error) => error.code === 'model-aborted');
  assert.equal(observations.some((item) => item.phase === 'aborted'), true);
});
