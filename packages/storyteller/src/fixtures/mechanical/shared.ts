import type { StorytellerTask } from '../../tasks';

export type MechanicalCharacter = NonNullable<
  StorytellerTask['context']['mechanicalOpening']
>['character'];

export function factValue(
  facts: readonly { id: string; value: boolean | string }[],
  id: string,
) {
  return facts.find((fact) => fact.id === id)?.value;
}

export function outcome(
  text: string,
  effects: unknown[] = [],
  declarations: unknown[] = [],
) {
  return { text, effects, declarations };
}

export function authoredActivityAccess(
  plans: readonly { key: string; resolution: { kind: string } }[],
) {
  const actionKeys = plans
    .filter(
      (plan) =>
        plan.resolution.kind === 'process' || plan.resolution.kind === 'resume',
    )
    .map((plan) => plan.key);
  return actionKeys.length
    ? ({ kind: 'selected', actionKeys } as const)
    : ({ kind: 'none' } as const);
}
