import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActionReceipt,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActivity,
  gameActivityEvent,
  gameActivityReport,
  gameRoll,
  worldObligation,
  worldObligationEvent,
} from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import {
  campaignViewSchema,
  campaignSettingsSchema,
  type CampaignView,
} from '@offscreen/contracts/campaign';
import { projectWorldTime } from '@offscreen/game/calendar';
import {
  projectPublicWorldObligation,
  worldConditionsSchema,
  worldObligationSchema,
} from '@offscreen/game/world-obligations';
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
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import {
  projectAcceptedActivityPlan,
  readAcceptedActivityPlan,
} from './accepted-plans';
import { campaignHoldsSchema } from './holds';

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
  const holds = campaignHoldsSchema.parse(state.holds);
  const activities = await db
    .select()
    .from(gameActivity)
    .where(eq(gameActivity.storyId, storyId));
  const activity = activities.find(
    (candidate) => candidate.id === state.activeActivityId,
  );
  const [actionExecution] = state.activeActionOperationId
    ? await db
        .select()
        .from(gameActionExecution)
        .where(
          eq(gameActionExecution.operationId, state.activeActionOperationId),
        )
    : [];
  const rolls = await db
    .select()
    .from(gameRoll)
    .where(eq(gameRoll.storyId, storyId))
    .orderBy(desc(gameRoll.tick), desc(gameRoll.id))
    .limit(100);
  const actionExecutionEvents = await db
    .select()
    .from(gameActionExecutionEvent)
    .where(eq(gameActionExecutionEvent.storyId, storyId))
    .orderBy(desc(gameActionExecutionEvent.ordinal))
    .limit(100);
  const activityEvents = await db
    .select()
    .from(gameActivityEvent)
    .where(eq(gameActivityEvent.storyId, storyId))
    .orderBy(desc(gameActivityEvent.ordinal))
    .limit(100);
  const activityReports = await db
    .select()
    .from(gameActivityReport)
    .where(eq(gameActivityReport.storyId, storyId))
    .orderBy(
      desc(gameActivityReport.sourceTick),
      desc(gameActivityReport.createdAt),
    )
    .limit(50);
  const obligationRows = await db
    .select()
    .from(worldObligation)
    .where(eq(worldObligation.storyId, storyId));
  const obligationEvents = await db
    .select()
    .from(worldObligationEvent)
    .where(eq(worldObligationEvent.storyId, storyId))
    .orderBy(desc(worldObligationEvent.ordinal))
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
      progress:
        plan.action.process.kind === 'contribution.v1' &&
        progress.process.kind === 'contribution.v1'
          ? {
              kind: 'contribution' as const,
              label: plan.action.process.progressLabel,
              earned: progress.process.earned,
              required: plan.action.process.requiredContribution,
            }
          : plan.action.process.kind === 'clock-wait.v1' &&
              progress.process.kind === 'clock-wait.v1'
            ? {
                kind: 'wait' as const,
                label: plan.action.process.progressLabel,
                elapsedTicks: progress.process.elapsedTicks,
                requiredTicks: plan.action.process.requiredTicks,
              }
            : (() => {
                throw new Error(
                  'Activity progress does not match its process rule',
                );
              })(),
      revision: candidate.revision,
      resolvedTicks: plan.resolvedThroughTick,
      settingsRevision: plan.settingsRevision,
      dueAt:
        candidate.state === 'running' &&
        candidate.id === state.activeActivityId &&
        holds.length === 0
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
        candidate.state === 'running' &&
        candidate.id === state.activeActivityId &&
        holds.length === 0 &&
        estimatedCompletionTick !== null
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
      ['running', 'paused', 'encounter', 'suspended', 'blocked'].includes(
        candidate.state,
      ),
    )
    .map(projectActivity);
  const settings = campaignSettingsSchema.parse(row.settings);
  return campaignViewSchema.parse({
    settings,
    character: state.character,
    storyFacts: state.storyFacts,
    location: state.location,
    tick: state.tick,
    worldTime: projectWorldTime(settings.time, state.tick),
    holds,
    offer: state.offer,
    activityAccess: situationAuthorizationSchema.parse(
      state.situationAuthorization,
    ).activityAccess,
    activity: activityView,
    actionExecution: actionExecution
      ? (() => {
          const plan = immediateActionPlanSchema.parse(actionExecution.plan);
          return {
            operationId: actionExecution.operationId,
            label: plan.label,
            startTick: actionExecution.startTick,
            targetTick: actionExecution.targetTick,
            state: actionExecution.state,
            revision: actionExecution.revision,
            dueAt:
              actionExecution.state === 'running' && holds.length === 0
                ? new Date(
                    state.clockAnchorAt.getTime() +
                      realMsUntilTick(
                        tickProgressSchema.parse(state.clock),
                        actionExecution.targetTick,
                        paceSchema.parse(state.clockPace),
                      ),
                  ).toISOString()
                : null,
          };
        })()
      : null,
    actionExecutionEvents: actionExecutionEvents.map((event) => ({
      id: event.id,
      ordinal: event.ordinal,
      executionId: event.executionId,
      executionRevision: event.executionRevision,
      tick: event.tick,
      kind: event.kind,
      label: event.label,
      createdAt: event.createdAt.toISOString(),
    })),
    commitments,
    activityEvents: activityEvents.map((event) => ({
      id: event.id,
      ordinal: event.ordinal,
      activityId: event.activityId,
      activityRevision: event.activityRevision,
      tick: event.tick,
      kind: event.kind,
      label: event.label,
      summary: event.summary,
      createdAt: event.createdAt.toISOString(),
    })),
    activityReports: activityReports.map((report) => ({
      id: report.id,
      activityId: report.activityId,
      activityRevision: report.activityRevision,
      sourceTick: report.sourceTick,
      label: report.label,
      factualSummary: report.factualSummary,
      state:
        report.state === 'published'
          ? 'published'
          : report.state === 'blocked' || report.state === 'omitted'
            ? 'unavailable'
            : report.generationId
              ? 'generating'
              : 'pending',
      report: report.report,
      createdAt: report.createdAt.toISOString(),
      publishedAt: report.publishedAt?.toISOString() ?? null,
    })),
    worldConditions: worldConditionsSchema.parse(state.worldConditions),
    worldObligations: obligationRows.flatMap((row) => {
      const projected = projectPublicWorldObligation({
        obligation: worldObligationSchema.parse(row.definition),
        state: row.state,
      });
      return projected ? [projected] : [];
    }),
    worldObligationEvents: obligationEvents.map((event) => ({
      id: event.id,
      ordinal: event.ordinal,
      obligationId: event.obligationId,
      obligationRevision: event.obligationRevision,
      tick: event.tick,
      kind: event.kind,
      label: event.label,
      createdAt: event.createdAt.toISOString(),
    })),
    acceptedActivityPlan: projectAcceptedActivityPlan(
      readAcceptedActivityPlan(state.acceptedActivityPlan),
    ),
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
