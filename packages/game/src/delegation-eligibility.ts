import type { ImmediateActionPlan } from './immediate-actions';

export const DECLINE_HARMLESS_INVITATION_CLASS =
  'decline-harmless-invitation.v1' as const;

/** True only for the fixed marker on a safe automatic plan with no transfer or debit. */
export function isDeclineHarmlessInvitation(plan: ImmediateActionPlan): boolean {
  if (plan.delegationMarker !== DECLINE_HARMLESS_INVITATION_CLASS) {
    return false;
  }
  if (plan.resolution.kind !== 'automatic') {
    return false;
  }
  if (plan.requiresQuantities.some((entry) => entry.minimum > 0)) {
    return false;
  }
  const { outcome } = plan.resolution;
  if (outcome.worldEffects.length > 0) {
    return false;
  }
  if (
    outcome.effects.some(
      (effect) => effect.kind === 'quantity.change.v1' && effect.delta < 0,
    )
  ) {
    return false;
  }
  return true;
}