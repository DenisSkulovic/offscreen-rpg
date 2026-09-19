import type { Transaction } from '../outbox/index';
import { holdCampaignForStorytellerIntent } from './holds';
import { requestActionNarration } from './narration';
import type { CampaignRecord } from './persistence';

/**
 * Durable work required by an already-decided campaign transition. These are
 * commands to application adapters, not domain facts or an in-process event bus.
 */
export type CampaignFollowUpIntent = {
  kind: 'prepare-action-consequence';
  operationId: string;
};

/**
 * Applies follow-ups inside the transition's transaction so its hold and
 * outbox notice cannot be separated from the authoritative state change.
 */
export async function applyCampaignFollowUpIntents(
  tx: Transaction,
  state: CampaignRecord,
  intents: readonly CampaignFollowUpIntent[],
  now: number,
) {
  let nextState = state;
  const handlers = {
    'prepare-action-consequence': async (
      intent: Extract<
        CampaignFollowUpIntent,
        { kind: 'prepare-action-consequence' }
      >,
    ) => {
      nextState = await holdCampaignForStorytellerIntent(
        tx,
        nextState,
        intent.operationId,
        now,
      );
      await requestActionNarration(tx, intent.operationId);
    },
  } satisfies {
    [Kind in CampaignFollowUpIntent['kind']]: (
      intent: Extract<CampaignFollowUpIntent, { kind: Kind }>,
    ) => Promise<void>;
  };
  for (const intent of intents) {
    await handlers[intent.kind](intent);
  }
  return nextState;
}
