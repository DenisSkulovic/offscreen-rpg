import assert from 'node:assert/strict';
import test from 'node:test';
import { publicFailure, scopeObservations, summarizeHistory, validateQualificationEnv } from './qualification.mjs';
import { toolCompletionSettled } from './qualification-recovery.mjs';

const base = {
  E1_QUALIFY: '1',
  POC_TEMPORAL_ADDRESS: '127.0.0.1:7233',
  POC_NAMESPACE: 'offscreen-agent-poc-e1-1127193045-ab12cd',
  PATH: '/usr/bin',
  HOME: '/tmp',
};

test('qualification import does not require a live endpoint', async () => {
  const loaded = await import('./qualification.mjs');
  assert.equal(typeof loaded.createHarness, 'function');
  assert.equal(typeof loaded.main, 'function');
});

function scheduled(eventId, name, activityId) {
  return {
    eventId,
    eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
    activityTaskScheduledEventAttributes: { activityType: { name }, activityId },
  };
}

test('history observations stay inside one workflow run and activity', () => {
  const observations = [
    { workflowId: 'mission-a', runId: 'run-a', activityId: '1', attempt: 1, phase: 'completed', kind: 'model', workerGeneration: 1 },
    { workflowId: 'mission-b', runId: 'run-b', activityId: '1', attempt: 1, phase: 'completed', kind: 'tool', toolName: 'calculate', workerGeneration: 2 },
  ];
  const historyA = { events: [scheduled('10', 'invokeModel', '1')] };
  const historyB = { events: [scheduled('10', 'runSyntheticTool', '1')] };
  const summaryA = summarizeHistory(historyA, observations, { workflowId: 'mission-a', runId: 'run-a' });
  const summaryB = summarizeHistory(historyB, observations, { workflowId: 'mission-b', runId: 'run-b' });
  assert.deepEqual(summaryA.observations.map((item) => item.kind), ['model']);
  assert.deepEqual(summaryB.observations.map((item) => item.kind), ['tool']);
  assert.equal(summaryA.observations.some((item) => item.workflowId === 'mission-b'), false);
  assert.equal(summaryB.observations.some((item) => item.workflowId === 'mission-a'), false);
  assert.equal(scopeObservations(observations, { workflowId: 'mission-a', runId: 'run-a' }, ['1']).length, 1);
});

test('workflow task completion before the tool completion is not a restart boundary', () => {
  const early = summarizeHistory({
    events: [
      {
        eventId: '5',
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
        activityTaskScheduledEventAttributes: { activityType: { name: 'invokeModel' }, activityId: 'm' },
      },
      {
        eventId: '8',
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
        activityTaskScheduledEventAttributes: { activityType: { name: 'runSyntheticTool' }, activityId: 't' },
      },
      { eventId: '9', eventType: 'EVENT_TYPE_WORKFLOW_TASK_COMPLETED' },
      {
        eventId: '11',
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
        activityTaskCompletedEventAttributes: { scheduledEventId: '8' },
      },
    ],
  }, [], { workflowId: 'mission-a', runId: 'run-a' });
  assert.equal(toolCompletionSettled(early), false);
  const settled = summarizeHistory({
    events: [
      ...early.scheduled.map((item) => ({
        eventId: item.eventId,
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
        activityTaskScheduledEventAttributes: { activityType: { name: item.name }, activityId: item.activityId },
      })),
      {
        eventId: '11',
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
        activityTaskCompletedEventAttributes: { scheduledEventId: '8' },
      },
      { eventId: '12', eventType: 'EVENT_TYPE_WORKFLOW_TASK_COMPLETED' },
    ],
  }, [], { workflowId: 'mission-a', runId: 'run-a' });
  assert.equal(toolCompletionSettled(settled), true);
});

test('failure evidence drops secrets and keeps a bounded message', () => {
  assert.equal(publicFailure(new Error('OPENAI_API_KEY sk-secret')), 'redacted-failure');
  assert.equal(publicFailure(new Error('wait-deadline')), 'wait-deadline');
});

test('qualification env refuses missing opt-in, unsafe endpoint, namespace, and credentials', () => {
  assert.equal(validateQualificationEnv({ ...base, E1_QUALIFY: '0' }).ok, false);
  assert.equal(validateQualificationEnv({ ...base, POC_TEMPORAL_ADDRESS: 'temporal:7233' }).ok, false);
  assert.equal(validateQualificationEnv({ ...base, POC_NAMESPACE: 'default' }).ok, false);
  assert.equal(validateQualificationEnv({ ...base, OPENAI_API_KEY: 'present' }).reason, 'credential-refused');
  assert.equal(validateQualificationEnv({ ...base, OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector' }).reason, 'credential-refused');
  assert.equal(validateQualificationEnv(base).ok, true);
});
