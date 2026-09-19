import type { Pace, TickProgress } from '@offscreen/game/time';
import {
  earnedTicks,
  paceSchema,
  tickProgressSchema,
} from '@offscreen/game/time';
import type { CampaignRecord } from './persistence';

/**
 * Project the one campaign clock. Activity effort is derived from whole world
 * ticks while that activity owns the advancing slot; the fractional remainder
 * never belongs to an activity and therefore cannot be duplicated on a switch.
 */
export function projectCampaignClock(
  state: CampaignRecord,
  now: number,
  held: boolean,
  instantTargetTick = state.tick,
): { clock: TickProgress; pace: Pace } {
  const pace = paceSchema.parse(state.clockPace);
  const clock = earnedTicks({
    progress: tickProgressSchema.parse(state.clock),
    anchorAt: state.clockAnchorAt,
    state: held ? 'held' : 'running',
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
