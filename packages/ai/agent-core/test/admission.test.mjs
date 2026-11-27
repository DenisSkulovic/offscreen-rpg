import assert from 'node:assert/strict';
import test from 'node:test';
import { missionWorkflowId } from '../dist/index.js';
import { assembleContext } from '../dist/context/assemble.js';
import { admitMission } from '../dist/missions/validate.js';

const missionId = '11111111-1111-4111-8111-111111111111';

const definition = {
  id: 'researcher',
  version: 1,
  instructions: 'Read the fixture.',
  toolNames: ['readFixture'],
};

function mission(overrides = {}) {
  return {
    version: 1,
    missionId,
    definitionId: 'researcher',
    definitionVersion: 1,
    input: 'What does the fixture say?',
    requestedTools: ['readFixture'],
    maxSteps: 2,
    ...overrides,
  };
}

test('admits a bounded mission and copies requested tools', () => {
  const raw = mission();
  const result = admitMission(
    raw,
    missionWorkflowId(missionId),
    [definition],
    ['readFixture', 'addNumbers'],
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.effectiveToolNames, ['readFixture']);
  assert.notEqual(result.effectiveToolNames, raw.requestedTools);
  assert.deepEqual(assembleContext(result.definition, result.mission), {
    instructions: 'Read the fixture.',
    prompt: raw.input,
  });
});

test('denies identity, shape, tools, bounds and host configuration', () => {
  const registry = ['readFixture'];
  const definitions = [definition];
  const workflowId = missionWorkflowId(missionId);
  const cases = [
    [mission({ extra: true }), 'invalid-mission'],
    [mission({ version: 2 }), 'invalid-mission'],
    [{ ...mission(), surplus: 1 }, 'invalid-mission'],
    [mission({ missionId: 'not-a-uuid' }), 'invalid-mission'],
    [mission({ input: '   ' }), 'invalid-mission'],
    [mission({ requestedTools: ['readFixture', 'readFixture'] }), 'invalid-tool-list'],
    [mission({ requestedTools: ['nope'] }), 'tool-not-allowed'],
    [mission({ input: 'x'.repeat(4097) }), 'input-limit'],
    [mission({ maxSteps: 0 }), 'step-limit'],
    [mission({ maxSteps: 4 }), 'step-limit'],
    [mission({ maxSteps: 1.5 }), 'step-limit'],
    [mission({ definitionId: 'missing' }), 'unknown-definition'],
  ];
  for (const [raw, code] of cases) {
    assert.equal(admitMission(raw, workflowId, definitions, registry).code, code, code);
  }
  assert.equal(
    admitMission(mission(), 'other-workflow', definitions, registry).code,
    'workflow-id-mismatch',
  );
  assert.equal(
    admitMission(mission(), workflowId, [{ ...definition, instructions: ' ' }], registry).code,
    'invalid-definition',
  );
  assert.equal(
    admitMission(mission(), workflowId, definitions, ['readFixture', 'readFixture']).code,
    'invalid-definition',
  );
});
