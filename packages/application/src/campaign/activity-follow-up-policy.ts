import type { OutcomeEffect } from '@offscreen/game/effects';
import type { StoryRecord } from '../stories/persistence';
import type { CampaignFollowUpIntent } from './follow-up-intents';
import type { ActivityRecord } from './persistence';

type CompletionFollowUp = 'quiet' | 'report' | 'scene';

export function activityCompletionIsNonControlling(
  nextState: string,
  completionFollowUp: CompletionFollowUp,
) {
  return nextState === 'complete' && completionFollowUp !== 'scene';
}

/**
 * Activity continuation has an intentional ordering boundary. A historical
 * report captures the completed moment before a queued successor consumes its
 * offer; a controlling scene is requested only after continuation is settled.
 */
export function planActivityBoundaryFollowUps(args: {
  nextState: string;
  completionFollowUp: CompletionFollowUp;
  current: StoryRecord;
  activity: ActivityRecord;
  passageId: string;
  afterSegment: number;
  throughSegment: number;
  label: string;
  intention: string;
  factualSummary: string;
  completionEffects: readonly OutcomeEffect[];
}) {
  const nonControllingCompletion = activityCompletionIsNonControlling(
    args.nextState,
    args.completionFollowUp,
  );
  const beforeContinuation: CampaignFollowUpIntent[] = [];
  const afterContinuation: CampaignFollowUpIntent[] = [];

  if (args.nextState === 'complete' && args.completionFollowUp === 'report') {
    beforeContinuation.push({
      kind: 'prepare-activity-report',
      current: args.current,
      activity: args.activity,
      passageId: args.passageId,
      label: args.label,
      intention: args.intention,
      factualSummary: args.factualSummary,
      completionEffects: args.completionEffects,
    });
  }
  if (args.nextState !== 'running' && !nonControllingCompletion) {
    afterContinuation.push({
      kind: 'prepare-activity-consequence',
      current: args.current,
      activityId: args.activity.id,
      passageId: args.passageId,
      afterSegment: args.afterSegment,
      throughSegment: args.throughSegment,
      label: args.label,
      intention: args.intention,
    });
  }
  return { beforeContinuation, afterContinuation };
}
