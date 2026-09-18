import type { Pace } from '@offscreen/contracts/campaign';

export type TickProgress = Readonly<{
  elapsedTicks: number;
  remainder: Readonly<{ numerator: string; denominator: string }>;
}>;

export function wholeTicks(elapsedTicks: number): TickProgress {
  return { elapsedTicks, remainder: { numerator: '0', denominator: '1' } };
}

function gcd(left: bigint, right: bigint): bigint {
  while (right !== 0n) {
    [left, right] = [right, left % right];
  }
  return left;
}

/** Exact earned progress at the real-time anchor, independent of resolved checks. */
export function earnedTicks(input: {
  progress: TickProgress;
  anchorAt: Date;
  state: string;
  pace: Pace;
  now: number;
  durationTicks: number;
}): TickProgress {
  if (input.state !== 'running') {
    return input.progress;
  }
  if (input.pace.kind === 'instant') {
    return wholeTicks(input.durationTicks);
  }
  const realElapsedMs = BigInt(Math.max(0, input.now - input.anchorAt.getTime()));
  const previousDenominator = BigInt(input.progress.remainder.denominator);
  const denominator = previousDenominator * BigInt(input.pace.realMs);
  const numerator = BigInt(input.progress.remainder.numerator) * BigInt(input.pace.realMs)
    + realElapsedMs * BigInt(input.pace.ticks) * previousDenominator;
  const elapsedTicks = BigInt(input.progress.elapsedTicks) + numerator / denominator;
  if (elapsedTicks >= BigInt(input.durationTicks)) {
    return wholeTicks(input.durationTicks);
  }
  const remainder = numerator % denominator;
  const divisor = gcd(remainder, denominator);
  return {
    elapsedTicks: Number(elapsedTicks),
    remainder: {
      numerator: String(remainder / divisor),
      denominator: String(denominator / divisor),
    },
  };
}

/** Real wait only. Long waits wake periodically within native timer limits. */
export function realMsUntilTick(progress: TickProgress, boundaryTick: number, pace: Pace): number {
  if (pace.kind === 'instant' || progress.elapsedTicks >= boundaryTick) {
    return 0;
  }
  const denominator = BigInt(progress.remainder.denominator);
  const remaining = BigInt(boundaryTick - progress.elapsedTicks) * denominator
    - BigInt(progress.remainder.numerator);
  const realNumerator = remaining * BigInt(pace.realMs);
  const realDenominator = denominator * BigInt(pace.ticks);
  const roundedUp = (realNumerator + realDenominator - 1n) / realDenominator;
  return Number(roundedUp > 86_400_000n ? 86_400_000n : roundedUp);
}
