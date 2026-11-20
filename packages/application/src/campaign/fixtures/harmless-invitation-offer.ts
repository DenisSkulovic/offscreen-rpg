import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { DECLINE_HARMLESS_INVITATION_CLASS } from '@offscreen/game/delegation-eligibility';

/** Terminal invitation in the GM07 two-action fixture; not a delegated withdrawal. */
export const harmlessSocialInvitationPlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'accept-quay-invitation',
  label: 'Accept the quay invitation',
  intention: 'Join the harbor gathering for a quiet evening.',
  risk: null,
  evidence: [],
  requires: [],
  requiresStory: [],
  requiresQuantities: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 30,
    outcome: {
      text: 'You accept and step toward the quay lights.',
      effects: [],
      declarations: [],
      worldEffects: [],
    },
  },
});

/** Provider-free withdrawal paired with the invitation; carries the fixed marker class. */
export const declineHarmlessInvitationWithdrawalPlan =
  immediateActionPlanSchema.parse({
    version: 1,
    key: 'decline-quay-invitation',
    label: 'Decline politely',
    intention: 'Withdraw from the invitation without repercussions.',
    risk: null,
    evidence: [],
    requires: [],
    requiresStory: [],
    requiresQuantities: [],
    delegationMarker: DECLINE_HARMLESS_INVITATION_CLASS,
    resolution: {
      kind: 'automatic',
      fictionalDurationSeconds: 5,
      outcome: {
        text: 'You decline and remain at the rail.',
        effects: [],
        declarations: [],
        worldEffects: [],
      },
    },
  });