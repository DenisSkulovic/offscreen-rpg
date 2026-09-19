import type { Pace, TickProgress } from '@offscreen/game/time';
import {
  earnedTicks,
  paceSchema,
  tickProgressSchema,
} from '@offscreen/game/time';
import type { CampaignRecord } from './persistence';

export type CampaignClockEligibility =
  | { kind: 'accepted-activity'; activityId: string }
  | { kind: 'none' };

/**
 * Project the one campaign clock. Activity effort is derived from whole world
 * ticks while that activity owns the advancing slot; the fractional remainder
 * never belongs to an activity and therefore cannot be duplicated on a switch.
 */
export function projectCampaignClock(
  state: CampaignRecord,
  now: number,
  eligibility: CampaignClockEligibility,
  held: boolean,
  instantTargetTick = state.tick,
): { clock: TickProgress; pace: Pace } {
  const pace = paceSchema.parse(state.clockPace);
  const acceptedActivityOwnsClock =
    eligibility.kind === 'accepted-activity' &&
    state.activeActivityId === eligibility.activityId;
  const clock = earnedTicks({
    progress: tickProgressSchema.parse(state.clock),
    anchorAt: state.clockAnchorAt,
    // A missing hold is not permission to advance. The caller must identify
    // the accepted execution that owns the campaign's single advancing slot.
    state: !held && acceptedActivityOwnsClock ? 'running' : 'held',
    pace,
    now,
    maximumTicks:
      pace.kind === 'instant' ? instantTargetTick : Number.MAX_SAFE_INTEGER,
  });
  if (clock.elapsedTicks < state.tick) {
    throw new Error('Campaign clock is behind its settled frontier');
  }
  return { clock, pace };
}
