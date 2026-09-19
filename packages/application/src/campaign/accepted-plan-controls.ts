import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign } from '@offscreen/db/campaign-schema';
import { acceptedActivityPlanControlSchema } from '@offscreen/contracts/campaign';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
} from '../stories/persistence';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import { commandReceipt, saveCommand } from './settings';
import { requireCampaign } from './persistence';
import {
  acceptedActivityPlanSchema,
  readAcceptedActivityPlan,
} from './accepted-plans';

/** Cancels only future entries. The current activity keeps its own lifecycle. */
export function createAcceptedPlanControls(database: Database) {
  return async function control(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
    const parsed = acceptedActivityPlanControlSchema.safeParse(args.body);
    if (!parsed.success) throw new StoryError('invalid');
    parseStoryIdentifier(args.storyId);
    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'accepted-plan-control', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request)) {
        return;
      }
      const state = await requireCampaign(tx, current.id);
      const accepted = readAcceptedActivityPlan(state.acceptedActivityPlan);
      if (
        !accepted ||
        accepted.id !== parsed.data.planId ||
        accepted.revision !== parsed.data.expectedRevision ||
        !['active', 'blocked'].includes(accepted.state)
      ) {
        throw new StoryError('conflict');
      }
      const cancelled = acceptedActivityPlanSchema.parse({
        ...accepted,
        revision: accepted.revision + 1,
        state: 'cancelled',
        entries: accepted.entries.map((entry, index) =>
          index > accepted.cursor || entry.state === 'blocked'
            ? { ...entry, state: 'cancelled' as const }
            : entry,
        ),
        blockedReason: null,
      });
      await tx
        .update(campaign)
        .set({ acceptedActivityPlan: cancelled })
        .where(eq(campaign.storyId, current.id));
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
      await saveCommand(tx, current.id, args.operationId, request);
    });
  };
}
