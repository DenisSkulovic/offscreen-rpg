import { z } from 'zod';

export const paceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('rate'),
    fictionalSeconds: z.number().int().min(1).max(1_000_000),
    realSeconds: z.number().int().min(1).max(86_400),
  }),
  z.strictObject({ kind: z.literal('instant') }),
]);
export type Pace = z.infer<typeof paceSchema>;

export const tickProgressSchema = z.strictObject({
  elapsedTicks: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  remainder: z
    .strictObject({
      numerator: z.string().regex(/^(0|[1-9]\d*)$/),
      denominator: z.string().regex(/^[1-9]\d*$/),
    })
    .refine(
      (fraction) => BigInt(fraction.numerator) < BigInt(fraction.denominator),
    ),
});
export type TickProgress = z.infer<typeof tickProgressSchema>;

export function wholeTicks(elapsedTicks: number): TickProgress {
  return { elapsedTicks, remainder: { numerator: '0', denominator: '1' } };
}

function gcd(left: bigint, right: bigint): bigint {
  while (right !== 0n) {
    [left, right] = [right, left % right];
  }
  return left;
}

/** Exact earned progress at the real-time anchor, independent of checks. */
export function earnedTicks(input: {
  progress: TickProgress;
  anchorAt: Date;
  state: string;
  pace: Pace;
  now: number;
  maximumTicks: number;
}): TickProgress {
  if (input.state !== 'running') {
    return input.progress;
  }
  if (input.pace.kind === 'instant') {
    return wholeTicks(input.maximumTicks);
  }
  const realElapsedMs = BigInt(
    Math.max(0, input.now - input.anchorAt.getTime()),
  );
  const previousDenominator = BigInt(input.progress.remainder.denominator);
  const realDurationMs = BigInt(input.pace.realSeconds) * 1000n;
  const denominator = previousDenominator * realDurationMs;
  const numerator =
    BigInt(input.progress.remainder.numerator) * realDurationMs +
    realElapsedMs * BigInt(input.pace.fictionalSeconds) * previousDenominator;
  const elapsedTicks =
    BigInt(input.progress.elapsedTicks) + numerator / denominator;
  if (elapsedTicks >= BigInt(input.maximumTicks)) {
    return wholeTicks(input.maximumTicks);
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
export function realMsUntilTick(
  progress: TickProgress,
  boundaryTick: number,
  pace: Pace,
): number {
  if (pace.kind === 'instant' || progress.elapsedTicks >= boundaryTick) {
    return 0;
  }
  const denominator = BigInt(progress.remainder.denominator);
  const remaining =
    BigInt(boundaryTick - progress.elapsedTicks) * denominator -
    BigInt(progress.remainder.numerator);
  const realNumerator = remaining * BigInt(pace.realSeconds) * 1000n;
  const realDenominator = denominator * BigInt(pace.fictionalSeconds);
  const roundedUp = (realNumerator + realDenominator - 1n) / realDenominator;
  return Number(roundedUp > 86_400_000n ? 86_400_000n : roundedUp);
}
