/**
 * CH05: labeled time domains and seeded entropy at real policy seams.
 * No global Date.now patch. Uncontrolled Temporal/DB clocks stay uncontrolled.
 */
import type { DrawD20 } from '@offscreen/game/checks';
import {
  activityProgressSchema,
  type ActivityProgress,
  type ResolvedActivityPlan,
} from '@offscreen/game/activities';
import {
  earnedGameSeconds,
  wholeGameSeconds,
  type GameTimeProgress,
  type Pace,
} from '@offscreen/game/time';
import type { FixtureSpecimenState } from './fixture-specimens.js';

export type LabTimeDomain =
  | 'fictional-game-second'
  | 'postgres-authoritative'
  | 'temporal-worker-lease'
  | 'browser-wall'
  | 'lab-simulated';

export type LabDomainControl = {
  domain: LabTimeDomain;
  controlled: boolean;
  note: string;
};

export class LabClockError extends Error {
  constructor(
    readonly code:
      | 'uncontrolled-domain'
      | 'non-monotonic'
      | 'negative-delta'
      | 'idle-donation'
      | 'missing-plan'
      | 'past-settlement',
    message: string,
  ) {
    super(message);
    this.name = 'LabClockError';
  }
}

/** Honest per-lane clock inventory — what Lab may control vs must leave real. */
export function describeLaneClocks(
  lane: 'bench-policy' | 'sandbox-db',
): readonly LabDomainControl[] {
  if (lane === 'bench-policy') {
    return [
      {
        domain: 'fictional-game-second',
        controlled: true,
        note: 'Bench advances pure gameSecond / clock-wait progress without wall wait',
      },
      {
        domain: 'lab-simulated',
        controlled: true,
        note: 'Injected now/seed at policy seams only',
      },
      {
        domain: 'postgres-authoritative',
        controlled: false,
        note: 'No PostgreSQL in Bench',
      },
      {
        domain: 'temporal-worker-lease',
        controlled: false,
        note: 'No Temporal in Bench',
      },
      {
        domain: 'browser-wall',
        controlled: false,
        note: 'No browser wall clock in Bench',
      },
    ] as const;
  }
  return [
    {
      domain: 'fictional-game-second',
      controlled: true,
      note: 'Sandbox may advance specimen gameSecond / pure progress overlays',
    },
    {
      domain: 'lab-simulated',
      controlled: true,
      note: 'Optional injected now for projectCampaignClock equivalence tests',
    },
    {
      domain: 'postgres-authoritative',
      controlled: false,
      note: 'readDatabaseClockMs / DB locking remain real; do not fast-forward',
    },
    {
      domain: 'temporal-worker-lease',
      controlled: false,
      note: 'Worker/Temporal stays Connected; Sandbox refuses Temporal fast-forward',
    },
    {
      domain: 'browser-wall',
      controlled: false,
      note: 'Browser time is uncontrolled in Sandbox materialization',
    },
  ] as const;
}

export function refuseUncontrolledFastForward(
  domain: Extract<
    LabTimeDomain,
    'postgres-authoritative' | 'temporal-worker-lease' | 'browser-wall'
  >,
): never {
  throw new LabClockError(
    'uncontrolled-domain',
    `Refusing to fast-forward uncontrolled domain ${domain}`,
  );
}

export type LabDrawRecord = {
  ordinal: number;
  value: number;
  purpose: string;
};

export type LabEntropy = {
  readonly seed: number;
  readonly domain: 'lab-simulated';
  drawD20: DrawD20;
  draws: () => readonly LabDrawRecord[];
};

/** Deterministic d20 stream — same algorithm Bench used; not a second rules engine. */
export function createLabEntropy(seed: number, purpose = 'lab'): LabEntropy {
  let state = seed >>> 0;
  const draws: LabDrawRecord[] = [];
  return {
    seed,
    domain: 'lab-simulated',
    drawD20: () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      const value = (state % 20) + 1;
      draws.push({ ordinal: draws.length + 1, value, purpose });
      return value;
    },
    draws: () => draws,
  };
}

/** @deprecated Prefer createLabEntropy; kept as a thin alias for Bench callers. */
export function createSeededDraw(seed: number): DrawD20 {
  return createLabEntropy(seed).drawD20;
}

export type LabFictionalClock = {
  readonly domain: 'fictional-game-second';
  gameSecond: () => number;
  observations: () => readonly { kind: string; from: number; to: number }[];
  freeze: () => number;
  advanceBy: (delta: number) => number;
  advanceTo: (target: number) => number;
};

export function createLabFictionalClock(
  initialGameSecond = 0,
): LabFictionalClock {
  if (!Number.isInteger(initialGameSecond) || initialGameSecond < 0) {
    throw new LabClockError(
      'negative-delta',
      'Initial gameSecond must be a non-negative integer',
    );
  }
  let current = initialGameSecond;
  const observations: { kind: string; from: number; to: number }[] = [];
  return {
    domain: 'fictional-game-second',
    gameSecond: () => current,
    observations: () => observations,
    freeze: () => current,
    advanceBy: (delta) => {
      if (!Number.isInteger(delta) || delta < 0) {
        throw new LabClockError(
          'negative-delta',
          'Fictional advance delta must be a non-negative integer',
        );
      }
      if (delta === 0) {
        throw new LabClockError(
          'idle-donation',
          'Zero-delta advance is idle time donation; refuse',
        );
      }
      const from = current;
      current += delta;
      observations.push({ kind: 'advance-by', from, to: current });
      return current;
    },
    advanceTo: (target) => {
      if (!Number.isInteger(target) || target < 0) {
        throw new LabClockError(
          'negative-delta',
          'Target gameSecond must be a non-negative integer',
        );
      }
      if (target < current) {
        throw new LabClockError(
          'non-monotonic',
          `Cannot rewind fictional clock from ${current} to ${target}`,
        );
      }
      if (target === current) {
        throw new LabClockError(
          'idle-donation',
          'advanceTo current second is idle time donation; refuse',
        );
      }
      const from = current;
      current = target;
      observations.push({ kind: 'advance-to', from, to: current });
      return current;
    },
  };
}

/**
 * Advance an accepted clock-wait specimen to a due boundary without wall wait.
 * Uses real activityProgressSchema; does not touch postgres/Temporal.
 */
export function advanceClockWaitToBoundary(args: {
  state: FixtureSpecimenState;
  targetGameSecond: number;
}): {
  state: FixtureSpecimenState;
  progress: ActivityProgress;
  plan: ResolvedActivityPlan;
  controlledDomain: 'fictional-game-second';
} {
  const plan = args.state.acceptedPlan;
  const progress = args.state.activityProgress;
  if (!plan || !progress) {
    throw new LabClockError(
      'missing-plan',
      'Clock-wait advance requires accepted plan and progress',
    );
  }
  if (plan.action.process.kind !== 'clock-wait.v1') {
    throw new LabClockError(
      'missing-plan',
      'Only clock-wait.v1 processes support pure fictional advance',
    );
  }
  if (progress.process.kind !== 'clock-wait.v1') {
    throw new LabClockError(
      'missing-plan',
      'Progress process must match clock-wait.v1',
    );
  }
  if (args.targetGameSecond < args.state.gameSecond) {
    throw new LabClockError(
      'non-monotonic',
      'Cannot advance specimen to an earlier gameSecond',
    );
  }
  const required = plan.action.process.requiredFictionalSeconds;
  const elapsedNeeded = Math.min(
    required,
    Math.max(
      progress.process.elapsedFictionalSeconds,
      args.targetGameSecond - plan.resolvedThroughGameSecond,
    ),
  );
  if (elapsedNeeded > required) {
    throw new LabClockError(
      'past-settlement',
      'Target exceeds required fictional seconds without settlement handling',
    );
  }
  const nextProgress = activityProgressSchema.parse({
    effortGameSeconds: elapsedNeeded,
    process: {
      kind: 'clock-wait.v1',
      elapsedFictionalSeconds: elapsedNeeded,
    },
    completionPending: elapsedNeeded >= required,
  });
  const nextState: FixtureSpecimenState = {
    ...args.state,
    gameSecond: args.targetGameSecond,
    activityProgress: nextProgress,
  };
  return {
    state: nextState,
    progress: nextProgress,
    plan,
    controlledDomain: 'fictional-game-second',
  };
}

/**
 * Equivalence: production earnedGameSeconds with an injected lab `now`
 * (lab-simulated) matches a second call with the same inputs. Proves we use
 * the real policy, not a Chamber-only calculator.
 */
export function projectWithLabSimulatedNow(args: {
  progress: GameTimeProgress;
  anchorAt: Date;
  pace: Pace;
  nowMs: number;
  maximumGameSeconds: number;
  running: boolean;
}): GameTimeProgress {
  return earnedGameSeconds({
    progress: args.progress,
    anchorAt: args.anchorAt,
    state: args.running ? 'running' : 'held',
    pace: args.pace,
    now: args.nowMs,
    maximumGameSeconds: args.maximumGameSeconds,
  });
}

export function freezeAtWholeSeconds(
  elapsedGameSeconds: number,
): GameTimeProgress {
  return wholeGameSeconds(elapsedGameSeconds);
}
