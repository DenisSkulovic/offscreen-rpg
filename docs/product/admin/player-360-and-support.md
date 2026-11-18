# Player 360 and support

**Owns:** how a staff member investigates an account, a campaign and a case without treating payer, participant and character as the same person.  
**Status: proposed product target, 2026-11-14, except where a landed Admin slice is named.** Player-safe reads and case anchors exist from the Admin wave. Situation UI in OBS06/07 is synthetic. Full Turn Capsule disclosure and production Support grants are **not** implemented. Illustrative Support, impersonation, raw-prompt, refund, export, and LiveOps examples stay Proposed or Blocked.  
**Technical:** [investigation and privacy](../../technical/admin/investigation-and-privacy.md), [Turn Capsule](../../technical/observability/identities-and-evidence.md#turn-evidence-capsule).

## Subjects that must stay distinct

One account is not one story owner and not one payer. The console must not be designed around that shortcut.

| Subject | Is not automatically |
| --- | --- |
| Staff identity | The player, even if the same human has both |
| Player account | The payer, the campaign owner, or the character |
| Campaign | One participant's private profile |
| Membership | Campaign ownership or billing authority |
| Controlled character | The human account |
| Commercial payer | Every participant in a shared campaign |
| Entitlement beneficiary | Whoever paid |
| Grant source | Fictional currency or a provider invoice |
| Published shared content | Another member's private notes |

These distinctions are conceptual. They are not a promise that shared campaigns, family plans or gifting exist in the first playable version. They exist so Admin does not have to be reinvented when multiplayer arrives. Do not invent campaign roles the gameplay product has not defined.

## What the operator must be able to answer

Who is this account, and in which campaigns does it participate? Which character is associated? Who else is affected if this campaign is restricted or repaired? What can the person do **now**, and why? Who funded the relevant ability to play, if that is known? Which facts are shared, and which records are private to someone else? Which of those states are verified, pending, stale, or unknowable?

Effective access is four questions, not one Premium badge:

1. Is there a paid, sponsored or granted commercial relationship?
2. Is the specific gameplay capability entitled to this beneficiary?
3. Is there enough verified remaining allowance?
4. Is the account, campaign or platform operationally allowed to proceed, or held by a restriction, a failed sync, a budget stop or an incident?

Example: subscription active, entitlement sync pending, allowance positive, global provider spending paused. The summary must not become "Premium works."

Unknown is different from zero. A read-only Support view stays coherent on summary and operational metadata. A blank forbidden panel does not imply that other private records do or do not exist. Deep links are references, not access tokens.

## Shared campaigns

Open a campaign from a player profile and keep that participation context. Distinguish shared committed state from each member's character. Show whether an incident affects one participant, a character, or the shared world, and show blast radius before any intervention.

**Negative:** permission over Alice does not authorize Bob's account, payment instruments or private materials. Shared facts both can see are different from Bob's personal data. A grant aimed at one beneficiary cannot be reassigned by opening a case or by player-preview mode. A sandbox reproduction does not mutate live state. A story fork is not the same operation as undoing a bad event in an existing shared game.

The payer-versus-beneficiary-versus-participant journey is a design stress test. It is not an approved family plan or a settled multiplayer billing model.

## Timeline and intervention

The timeline is typed events, not one list: participation, game operation, published story, commercial fact, support case, administrative intervention, trust or privacy state, and system incident. A request is not success. A queued intervention is not a completed repair. Proposed, approved and verified outcome stay distinct. The interface does not claim evidence that was deleted or never captured.

Every contextual action names target, intent, scope, authority, impact and outcome. There is no one-click free-form database edit from the 360 page. A player-view mode is not an admin mutation mechanism.

**Negative:** do not claim production Support investigation works end to end while grant issuance for live workers is absent. A Support persona example does not grant raw provider prompt access or cross-tenant impersonation. An uncertain paid dispatch is not silently charged twice. "No event returned" does not mean the player has no history.
