import { DEFINITIONS, FIXTURE } from './scenarios.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function missionWorkflowId(missionId) {
  return `agent-core-e1-${missionId}`;
}

function jsonLength(value) {
  return JSON.stringify(value).length;
}

function sameArgs(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function evaluateFixtureTool(request, actualWorkflowId) {
  if (!request || typeof request !== 'object') throw fail('invalid-request', 'Tool request is missing.');
  if (!UUID.test(request.missionId)) throw fail('invalid-mission', 'Mission id is not a UUID.');
  if (actualWorkflowId !== missionWorkflowId(request.missionId)) {
    throw fail('workflow-mismatch', 'Workflow id does not match the mission.');
  }
  const definition = DEFINITIONS[request.definitionId];
  if (!definition || request.definitionVersion !== 1) throw fail('unknown-definition', 'Definition is not a fixture.');
  const effective = request.effectiveToolNames;
  if (!Array.isArray(effective) || new Set(effective).size !== effective.length) {
    throw fail('invalid-effective-tools', 'Effective tool names are not a unique list.');
  }
  if (effective.some((name) => name !== definition.toolName)) {
    throw fail('foreign-capability', 'Effective tools are not a subset of the definition.');
  }
  if (!effective.includes(request.toolName) || request.toolName !== definition.toolName) {
    throw fail('tool-not-allowed', 'Requested tool is outside the definition and effective list.');
  }
  if (jsonLength(request.input) > 1024) throw fail('tool-input-limit', 'Serialized input exceeds 1024.');

  if (request.toolName === 'readDocument') {
    if (!sameArgs(request.input, { path: FIXTURE.documentPath })) {
      throw fail('invalid-tool-input', 'Document path is not the fixture literal.');
    }
    return FIXTURE.documentText;
  }
  if (request.toolName === 'calculate') {
    const failSentinel = sameArgs(request.input, FIXTURE.failArgs);
    const normal = sameArgs(request.input, FIXTURE.arithmeticArgs);
    if (!failSentinel && !normal) throw fail('invalid-tool-input', 'Arithmetic arguments are not a fixture.');
    if (failSentinel) throw fail('synthetic-tool-failure', 'Scripted synthetic tool failure.');
    return FIXTURE.arithmeticResult;
  }
  throw fail('tool-not-allowed', 'Tool has no fixture effect.');
}

export function createFixtureActivities(observations, readContext) {
  return {
    async runSyntheticTool(request) {
      const context = readContext();
      const info = context.info;
      if (context.cancellationSignal?.aborted) {
        throw fail('activity-cancelled', 'Synthetic tool observed cancellation.');
      }
      observations.push({
        workflowId: info.workflowExecution.workflowId,
        activityId: info.activityId,
        attempt: info.attempt,
        phase: 'admitted',
        kind: 'tool',
        toolName: request.toolName,
      });
      try {
        const result = evaluateFixtureTool(request, info.workflowExecution.workflowId);
        if (result.length > 4096) throw fail('text-limit', 'Fixture result exceeds 4096.');
        observations.push({
          workflowId: info.workflowExecution.workflowId,
          activityId: info.activityId,
          attempt: info.attempt,
          phase: 'completed',
          kind: 'tool',
          toolName: request.toolName,
        });
        return result;
      } catch (error) {
        observations.push({
          workflowId: info.workflowExecution.workflowId,
          activityId: info.activityId,
          attempt: info.attempt,
          phase: 'failed',
          kind: 'tool',
          toolName: request.toolName,
          code: error.code,
        });
        throw error;
      }
    },
  };
}
