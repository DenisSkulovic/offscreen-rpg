---
id: DOC-AUTONOMOUS-RISK
layer: product
status: draft
domains: [characters-and-autonomy]
tags: [autonomy, consequences, configurability, notifications]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-CHARACTER-IDENTITY
  - type: depends_on
    target: DOC-KNOWLEDGE-BELIEFS
  - type: depends_on
    target: DOC-GOALS-ORDERS
  - type: depends_on
    target: DOC-TIME-AUTONOMY
---

# Autonomous risk and decisions

Owner: Denis. Release disposition: unassigned.
Scope: how to define autonomous choices under uncertainty and their consequences.
Sources: [identity](identity-personality-and-judgment.md), [knowledge](knowledge-beliefs-and-secrets.md), [goals/orders](goals-orders-and-permissions.md), [time](../experience/time-presence-and-autonomy.md).

Confirmed direction includes foolish choices, abandoned plans, external disruption, unexpected gains, loss and possible death during unattended play. This draft does not choose an AI decision algorithm, risk score, obedience model or difficulty preset.

## The decision and its outcome are different

A character can choose prudently and suffer bad luck, or act foolishly and benefit. An intended outcome is not a guarantee. Character judgment must not become a hidden promise of safe play, nor must every unwise choice trigger punishment.

Information may be incomplete or false. KNOW-001 through KNOW-005 own information boundaries; identity owns traits, and goals/orders owns whether the character pursues the player's plan.

## Proposed behavior

| ID | Draft expectation |
| --- | --- |
| AUTO-001 | Distinguish the character's selected action from how the adopted game rules resolve it. |
| AUTO-002 | Retired duplicate; GOAL-005 in [goals/orders](goals-orders-and-permissions.md#draft-behavior) owns campaign restrictions versus fictional disobedience. |
| AUTO-003 | Attribute losses, gains and other outcomes to what actually resolved; do not substitute the character's intended success for the result. |
| AUTO-004 | Where the game explains a consequential choice, distinguish available evidence from uncertain or subjective interpretations of motive. |

GOAL-005 does not decide which player controls are hard restrictions. That remains GOAL-F02. Outcome persistence and corrections follow the world/canon policies.

## Proposed autonomous-choice contract

Reconsider an intention when an activity completes, eligibility changes, relevant information arrives, a defined need/commitment boundary is crossed, or a meaningful opportunity appears. A computational tick, repeated narration request or unchanged observation is not itself another decision or risk exposure. These are draft mechanics; exact trigger coverage and balance remain open.

For a consequential choice, identify the actor's known facts and current capabilities; determine eligible actions; enforce hard campaign restrictions; then consider current intention, motives, needs and alternatives. A permitted trait-sensitive choice can be unwise. Resolve the selected action through its owning rules and retain the actual consequence. A model supplies a candidate intention, not missing capabilities or permission to bypass limits.

Routine and model-assisted choice obey the same eligibility and information boundaries. If no eligible continuation exists, the event policy determines waiting/intervention. Risk belongs to defined fictional exposure: a journey, encounter, activity or time interval. Increasing update frequency must not increase danger or repeatedly reroll an unchanged temptation. SCN-003 tests that property; it does not prescribe a trait probability.

Example: an invitation becomes available during work. Continuing, accepting or deferring depend on the actor's situation and permissions. Accepting invokes the employment rules for unfinished work and payment. An unreachable, unknown or expired invitation cannot be selected. Changed hunger, obligations or resources may change a choice; ignoring those facts is a product defect, not personality.

AUTO-F05: Choose significant reconsideration triggers and their relation to ongoing commitments. Recommend trigger-based reconsideration with explicit eligible alternatives, without guaranteed obedience or wisdom. GOAL-F02 owns hard permissions; AI-F01 owns behavioral differences between spending profiles.

## Intervention policy

The event policy may wait for the player, offer timed intervention and then delegate, or allow a choice without immediate intervention. [DOC-INTERVENTION](../notifications/event-intervention-and-timeouts.md) owns offered choices and notification behavior; DOC-TIME-AUTONOMY owns world progression.

Choosing an autonomous response after a deadline does not require selecting the safest listed option. The character may respond according to their traits, beliefs and circumstances. Exact selection and notification presentation remain open.

## Illustrative situations

- The character accepts a dubious offer and benefits. Poor judgment and fortunate resolution can coexist.
- The character avoids a danger they know about but encounters another they could not anticipate.
- An external change invalidates their plan. They may improvise well, act badly or remain inactive; no universal competence is promised.
- A player responds after an autonomous outcome is resolved. Late intervention follows CTRL-006 in [control/handoffs](../experience/control-and-handoffs.md#proposed-requirements), rather than rewriting the outcome.

## Options and forks

All candidates; release disposition unassigned.

| Fork | Alternatives and tradeoffs | Evidence needed |
| --- | --- | --- |
| AUTO-F01: stable traits versus circumstances | Traits dominate; immediate conditions strongly influence choice; a mixture | Compare similar choices in materially different situations without making the character arbitrary |
| AUTO-F02: deliberation depth | Simple routine choices; more consideration for selected situations; variable depth | Identify where richer decisions improve play enough to justify cost |
| AUTO-F03: risk guidance | Player supplies preferences; character-led appetite; configuration blends the two | Reconcile guidance with intentional fallibility and GOAL-F02 |
| AUTO-F04: escalation | Offer intervention at defined boundaries; selective character requests; fewer interruptions | Assess attention demands and coherent unattended play |

No numeric trait-to-risk mapping or new check is chosen. D&D mechanics and any documented adaptation must govern resolution where applicable. The boundary between modeled judgment, narrative interpretation and chance remains to be explored.

Explanation visibility is owned by GOAL-F04 and KNOW-F05, not a second disclosure setting here. Death/nonfatal alternatives belong to the planned consequence policy. This document should not duplicate those option lists.
