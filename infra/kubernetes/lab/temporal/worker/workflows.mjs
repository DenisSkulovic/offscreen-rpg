import { proxyActivities, sleep, workflowInfo } from '@temporalio/workflow';

const { recordOnce } = proxyActivities({
  startToCloseTimeout: '30 seconds',
  scheduleToCloseTimeout: '60 seconds',
  retry: { maximumAttempts: 3 },
});

export async function labOnce() {
  const info = workflowInfo();
  await recordOnce(info.workflowId, info.runId);
  await sleep('90 seconds');
  return 'finished-once';
}
