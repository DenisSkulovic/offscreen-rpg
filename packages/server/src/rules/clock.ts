import type { Pace } from '@offscreen/contracts/campaign';

export function elapsedGameMs(input: { elapsedMs: number; anchorAt: Date; state: string; pace: Pace; now: number; durationMs: number }) {
  const durationMs = input.durationMs;
  if (input.state !== 'running') return input.elapsedMs;
  if (input.pace.kind === 'instant') return durationMs;
  return Math.min(durationMs, input.elapsedMs + Math.floor(Math.max(0, input.now - input.anchorAt.getTime()) * input.pace.game / input.pace.real));
}
export function waitUntilBoundary(elapsed: number, boundaryMs: number, pace: Pace) {
  if (pace.kind === 'instant') return 0;
  return Math.max(0, Math.ceil((boundaryMs - elapsed) * pace.real / pace.game));
}
