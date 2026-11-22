import { proxyActivities } from '@temporalio/workflow';

const activities = proxyActivities<{ mark(): Promise<string> }>({ startToCloseTimeout: '10 seconds' });

export async function slotPing(): Promise<string> {
  return activities.mark();
}
