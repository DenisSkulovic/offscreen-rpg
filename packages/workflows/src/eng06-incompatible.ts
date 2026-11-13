/**
 * Test-only deliberately incompatible campaignActionV1 for ENG06 replay negatives.
 * Inserts an extra sleep before the first Activity so old histories fail nondeterminism checks.
 * Not exported from the package root; never register this on a production worker.
 */
import { proxyActivities, sleep } from '@temporalio/workflow';
import type { CampaignActivities } from './contracts.js';

const { advanceCampaignAction } = proxyActivities<CampaignActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});

export async function campaignActionV1(id: string): Promise<void> {
  await sleep(1);
  while (true) {
    const remaining = await advanceCampaignAction(id);
    if (remaining === null) return;
    await sleep(Math.max(1, remaining));
  }
}
