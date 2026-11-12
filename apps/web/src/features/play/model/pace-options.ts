import type { Pace } from '@offscreen/game/time';

/** Shared pace catalogue for Start and campaign controls. Pure; no Client boundary. */
export const paceOptions: { label: string; value: string; pace: Pace }[] = [
  {
    label: '1 fictional second per real minute',
    value: 'slow',
    pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 60 },
  },
  {
    label: '1 fictional second per real second',
    value: 'steady',
    pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
  },
  {
    label: '10 fictional seconds per real second',
    value: 'fast',
    pace: { kind: 'rate', fictionalSeconds: 10, realSeconds: 1 },
  },
  {
    label: 'Instant, until a choice or completion',
    value: 'instant',
    pace: { kind: 'instant' },
  },
];

export function paceForValue(value: string): Pace | undefined {
  return paceOptions.find((option) => option.value === value)?.pace;
}

export function valueForPace(pace: Pace | undefined): string | undefined {
  if (!pace) {
    return undefined;
  }
  return paceOptions.find(
    (option) => JSON.stringify(option.pace) === JSON.stringify(pace),
  )?.value;
}
