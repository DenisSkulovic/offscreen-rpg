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

export const gameTimeProgressSchema = z.strictObject({
  elapsedGameSeconds: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER),
  remainder: z
    .strictObject({
      numerator: z.string().regex(/^(0|[1-9]\d*)$/),
      denominator: z.string().regex(/^[1-9]\d*$/),
    })
    .refine(
      (fraction) => BigInt(fraction.numerator) < BigInt(fraction.denominator),
    ),
});
export type GameTimeProgress = z.infer<typeof gameTimeProgressSchema>;

export function wholeGameSeconds(elapsedGameSeconds: number): GameTimeProgress {
  return {
    elapsedGameSeconds,
    remainder: { numerator: '0', denominator: '1' },
  };
}

function gcd(left: bigint, right: bigint): bigint {
  while (right !== 0n) {
    [left, right] = [right, left % right];
  }
  return left;
}

/** Exact earned progress at the real-time anchor, independent of checks. */
export function earnedGameSeconds(input: {
  progress: GameTimeProgress;
  anchorAt: Date;
  state: string;
  pace: Pace;
  now: number;
  maximumGameSeconds: number;
}): GameTimeProgress {
  if (input.state !== 'running') {
    return input.progress;
  }
  if (input.pace.kind === 'instant') {
    return wholeGameSeconds(input.maximumGameSeconds);
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
  const elapsedGameSeconds =
    BigInt(input.progress.elapsedGameSeconds) + numerator / denominator;
  if (elapsedGameSeconds >= BigInt(input.maximumGameSeconds)) {
    return wholeGameSeconds(input.maximumGameSeconds);
  }
  const remainder = numerator % denominator;
  const divisor = gcd(remainder, denominator);
  return {
    elapsedGameSeconds: Number(elapsedGameSeconds),
    remainder: {
      numerator: String(remainder / divisor),
      denominator: String(denominator / divisor),
    },
  };
}

/** Real wait only. Long waits wake periodically within native timer limits. */
export function realMsUntilGameSecond(
  progress: GameTimeProgress,
  boundaryGameSecond: number,
  pace: Pace,
): number {
  if (
    pace.kind === 'instant' ||
    progress.elapsedGameSeconds >= boundaryGameSecond
  ) {
    return 0;
  }
  const denominator = BigInt(progress.remainder.denominator);
  const remaining =
    BigInt(boundaryGameSecond - progress.elapsedGameSeconds) * denominator -
    BigInt(progress.remainder.numerator);
  const realNumerator = remaining * BigInt(pace.realSeconds) * 1000n;
  const realDenominator = denominator * BigInt(pace.fictionalSeconds);
  const roundedUp = (realNumerator + realDenominator - 1n) / realDenominator;
  return Number(roundedUp > 86_400_000n ? 86_400_000n : roundedUp);
}
