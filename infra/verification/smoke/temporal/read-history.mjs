import fs from 'node:fs';

const doc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const flat = JSON.stringify(doc);

function count(type) {
  const needle = `"eventType":"${type}"`;
  let found = 0;
  let from = 0;
  while (true) {
    const at = flat.indexOf(needle, from);
    if (at < 0) return found;
    found += 1;
    from = at + needle.length;
  }
}

function findStatus(value) {
  if (!value || typeof value !== 'object') return '';
  if (typeof value.status === 'string' && /RUNNING|COMPLETED|FAILED|CANCELED|CANCELLED|TERMINATED|TIMED_OUT|CONTINUED_AS_NEW/i.test(value.status)) {
    return value.status.toUpperCase().replace('WORKFLOW_EXECUTION_STATUS_', '');
  }
  if (typeof value.status === 'number') {
    return ['UNSPECIFIED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED', 'TERMINATED', 'CONTINUED_AS_NEW', 'TIMED_OUT'][value.status] ?? '';
  }
  for (const child of Object.values(value)) {
    const found = findStatus(child);
    if (found) return found;
  }
  return '';
}

function countAny(types) {
  return types.reduce((sum, type) => sum + count(type), 0);
}

const summary = {
  status: findStatus(doc),
  runId: flat.match(/"runId":"([^"]+)"/)?.[1] ?? '',
  workflowId: flat.match(/"workflowId":"([^"]+)"/)?.[1] ?? '',
  timerStarted: countAny(['EVENT_TYPE_TIMER_STARTED', 'TimerStarted']),
  activityScheduled: countAny(['EVENT_TYPE_ACTIVITY_TASK_SCHEDULED', 'ActivityTaskScheduled']),
  activityCompleted: countAny(['EVENT_TYPE_ACTIVITY_TASK_COMPLETED', 'ActivityTaskCompleted']),
  activityFailed: countAny(['EVENT_TYPE_ACTIVITY_TASK_FAILED', 'ActivityTaskFailed']),
  workflowStarted: countAny(['EVENT_TYPE_WORKFLOW_EXECUTION_STARTED', 'WorkflowExecutionStarted']),
  workflowCompleted: countAny(['EVENT_TYPE_WORKFLOW_EXECUTION_COMPLETED', 'WorkflowExecutionCompleted']),
  finishedOnce: flat.includes('finished-once'),
};
process.stdout.write(`${JSON.stringify(summary)}\n`);
