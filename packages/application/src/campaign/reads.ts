import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActionReceipt,
  gameActivity,
  gameRoll,
} from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import {
  campaignViewSchema,
  campaignSettingsSchema,
  type CampaignView,
} from '@offscreen/contracts/campaign';
import {
  activityProgressSchema,
  estimatedCompletionBoundaryTick,
  nextBoundaryTick,
  resolvedActivityPlanSchema,
  worldTickForEffortBoundary,
} from '@offscreen/game/activities';
import {
  paceSchema,
  realMsUntilTick,
  tickProgressSchema,
} from '@offscreen/game/time';
import { characterSchema } from '@offscreen/game/state';
import { situationAuthorizationSchema } from '@offscreen/game/immediate-actions';

function actionReceiptState(
  generationId: string | null,
  publicationState: string | null,
) {
  if (!generationId) return 'pending' as const;
  if (publicationState === 'published') return 'published' as const;
  if (publicationState === 'blocked' || publicationState === 'stale') {
    return 'failed' as const;
  }
  return 'generating' as const;
}

export async function readCampaign(
  db: Pick<Database['db'], 'select'>,
  ownerId: string,
  storyId: string,
): Promise<CampaignView | null> {
  const [row] = await db
    .select({ campaign, settings: campaignSettings.settings })
    .from(campaign)
    .innerJoin(story, eq(story.id, campaign.storyId))
    .innerJoin(
      campaignSettings,
      and(
        eq(campaignSettings.storyId, campaign.storyId),
        eq(campaignSettings.revision, campaign.settingsRevision),
      ),
    )
    .where(and(eq(story.id, storyId), eq(story.ownerId, ownerId)));
  if (!row) {
    return null;
  }
  const state = row.campaign;
  const activities = await db
    .select()
    .from(gameActivity)
    .where(eq(gameActivity.storyId, storyId));
  const activity = activities.find(
    (candidate) => candidate.id === state.activeActivityId,
  );
  const rolls = await db
    .select()
    .from(gameRoll)
    .where(eq(gameRoll.storyId, storyId))
    .orderBy(desc(gameRoll.tick), desc(gameRoll.id))
    .limit(100);
  const actionReceipts = await db
    .select({
      receipt: gameActionReceipt,
      publicationState: storytellerPublication.state,
    })
    .from(gameActionReceipt)
    .leftJoin(
      storytellerPublication,
      eq(storytellerPublication.generationId, gameActionReceipt.generationId),
    )
    .where(eq(gameActionReceipt.storyId, storyId))
    .orderBy(
      desc(gameActionReceipt.createdAt),
      desc(gameActionReceipt.operationId),
    )
    .limit(20);
  function projectActivity(candidate: (typeof activities)[number]) {
    const plan = resolvedActivityPlanSchema.parse(candidate.plan);
    const pace = paceSchema.parse(state.clockPace);
    const clock = tickProgressSchema.parse(state.clock);
    const progress = activityProgressSchema.parse(candidate.progress);
    // Campaign rows also back narrative-only stories. A character becomes
    // mandatory only when projecting a mechanical commitment whose estimate
    // depends on their captured capabilities.
    const character = characterSchema.parse(state.character);
    const estimatedCompletionTick = estimatedCompletionBoundaryTick(
      plan,
      progress.process,
      character,
    );
    return {
      id: candidate.id,
      label: plan.action.label,
      state: candidate.state,
      boundariesSettled: candidate.boundariesSettled,
      completionPending: progress.completionPending,
      progress: {
        label: plan.action.process.progressLabel,
        earned: progress.process.earned,
        required: plan.action.process.requiredContribution,
      },
      revision: candidate.revision,
      resolvedTicks: plan.resolvedThroughTick,
      settingsRevision: plan.settingsRevision,
      dueAt:
        candidate.state === 'running'
          ? new Date(
              state.clockAnchorAt.getTime() +
                realMsUntilTick(
                  clock,
                  worldTickForEffortBoundary({
                    campaignTick: state.tick,
                    retainedEffortTicks: progress.effortTicks,
                    boundaryEffortTick: nextBoundaryTick(
                      plan,
                      plan.resolvedThroughTick,
                    ),
                  }),
                  pace,
                ),
            ).toISOString()
          : null,
      estimatedCompletionAt:
        candidate.state === 'running' && estimatedCompletionTick !== null
          ? new Date(
              state.clockAnchorAt.getTime() +
                realMsUntilTick(
                  clock,
                  worldTickForEffortBoundary({
                    campaignTick: state.tick,
                    retainedEffortTicks: progress.effortTicks,
                    boundaryEffortTick: Math.max(
                      estimatedCompletionTick,
                      progress.effortTicks,
                    ),
                  }),
                  pace,
                ),
            ).toISOString()
          : null,
    };
  }
  const activityView = activity ? projectActivity(activity) : null;
  const commitments = activities
    .filter((candidate) =>
      ['running', 'paused', 'encounter', 'suspended'].includes(candidate.state),
    )
    .map(projectActivity);
  return campaignViewSchema.parse({
    settings: campaignSettingsSchema.parse(row.settings),
    character: state.character,
    storyFacts: state.storyFacts,
    location: state.location,
    tick: state.tick,
    offer: state.offer,
    activityAccess: situationAuthorizationSchema.parse(
      state.situationAuthorization,
    ).activityAccess,
    activity: activityView,
    commitments,
    rolls: rolls.map((roll) => ({
      id: roll.id,
      segment: roll.segment,
      tick: roll.tick,
      roll: roll.result,
      effects: roll.effects,
    })),
    actionReceipts: actionReceipts.map(({ receipt, publicationState }) => ({
      id: receipt.operationId,
      label: receipt.label,
      intention: receipt.intention,
      outcome: receipt.outcome,
      text: receipt.outcomeText,
      effects: receipt.effects,
      declarations: receipt.declarations,
      roll: receipt.roll,
      state: actionReceiptState(receipt.generationId, publicationState),
    })),
  });
}
