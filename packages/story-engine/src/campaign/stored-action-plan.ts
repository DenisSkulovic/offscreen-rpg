import {
  immediateActionPlanSchema,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import {
  narrativeIntentPlanSchema,
  type NarrativeIntentPlan,
} from '@offscreen/game/narrative-intent';

export type StoredActionPlan = ImmediateActionPlan | NarrativeIntentPlan;

export function isNarrativeIntentPlanValue(
  value: unknown,
): value is NarrativeIntentPlan {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as NarrativeIntentPlan).kind === 'narrative-intent.v1'
  );
}

export function isNarrativeIntentPlan(
  plan: StoredActionPlan,
): plan is NarrativeIntentPlan {
  return isNarrativeIntentPlanValue(plan);
}

export function isImmediateActionPlan(
  plan: StoredActionPlan,
): plan is ImmediateActionPlan {
  return !isNarrativeIntentPlan(plan);
}

/** Discriminates narrative intent from legacy immediate-action plans (no `kind`). */
export function parseStoredActionPlan(value: unknown): StoredActionPlan {
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'narrative-intent.v1'
  ) {
    return narrativeIntentPlanSchema.parse(value);
  }
  return immediateActionPlanSchema.parse(value);
}

export function parseStoredActionPlans(
  values: readonly unknown[],
): StoredActionPlan[] {
  return values.map((value) => parseStoredActionPlan(value));
}