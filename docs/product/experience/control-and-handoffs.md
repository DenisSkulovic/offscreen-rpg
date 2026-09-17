---
id: DOC-CONTROL-HANDOFFS
layer: product
status: draft
domains: [experience]
tags: [direct-control, autonomy, consequences, continuity]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-GLOSSARY
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-MOMENT-TO-MOMENT-PLAY
---

# Control and handoffs

Owner: Denis. Scope: moving between direct character control and delegation.
Basis: [shared terms](../foundations/glossary-and-domain-map.md), [time/autonomy](time-presence-and-autonomy.md), [active play](moment-to-moment-play.md).

Direct control and ongoing autonomy are confirmed directions. Requirements and transition choices here are drafts. This document does not decide the world clock, D&D action ordering or whether a character can disobey an explicit instruction.

## Two separate controls

Changing who chooses actions does not inherently pause or resume time. A player may pause while inspecting or preparing instructions; whether instructions can be queued during pause remains open. Delegation may continue while the player watches. Going offline does not itself define the control policy.

The handoff must make clear who will choose the next relevant action and what happens to activity already underway. A proposed [character-identity constraint](../characters-and-autonomy/identity-personality-and-judgment.md) would also limit direct control; its enforcement is unresolved, so taking over must not be assumed to imply unrestricted personality replacement.

## Proposed requirements

| ID | Draft behavior |
| --- | --- |
| CTRL-001 | Show the effective control state and any pending handoff rather than implying transfer succeeded before it takes effect. |
| CTRL-002 | Allow the player to request direct control or delegation; explain any delay or restriction imposed by the current activity and adopted rules. |
| CTRL-003 | A transfer of control must not retroactively undo a resolved action, reward, loss or decision. |
| CTRL-004 | Delegation must use the active autonomy policy and character traits; it must not silently promise competent or player-optimal behavior. |
| CTRL-005 | On effective transfer to direct control, identify the current situation, ongoing activity and unresolved choices needed to act. The absence recap is owned by RETURN-003 in [leaving/returning](leaving-and-returning.md#proposed-requirements). |
| CTRL-006 | If player intervention is too late for an offered choice, distinguish the resolved outcome from actions still available now. |
| CTRL-007 | Where competing player instructions or an autonomous action cannot both apply, communicate which took effect and why under the agreed handoff policy. |

## Transition cases to define

| Case | Known boundary | Unresolved choice |
| --- | --- | --- |
| Delegate while idle | New choices may be made autonomously | Which goals and permissions are required or inherited? |
| Delegate during travel/work | Existing progress is not erased merely by handing over | Continue, interrupt or complete a pending step? |
| Take over during an autonomous action | Already-resolved consequences remain | At which action boundary does control transfer? |
| Respond to an event invitation | Timely input may guide the response | Exact deadline, pause state and treatment of simultaneous expiry |
| Pause during a handoff | Explicit pause freezes the world | Which pending instructions remain queued for resume? |
| Close the interface | Absence is distinct from pause | Default disconnect behavior and whether any prompt is needed |

Defaults are not selected by this table. Detailed event-window behavior belongs in DOC-INTERVENTION, and action boundaries depend on the chosen D&D rules.

## Examples for discussion

**Take over a workday.** The character is halfway through an authorized shift. The player requests control. They should see whether work continues, can be interrupted, or requires a transition. Taking control does not instantly earn the full shift's pay.

**Intervene in a robbery.** A notification offers a decision. If the player responds before the relevant boundary, their choice applies according to the policy. If the character already surrendered a purse or fought, taking control does not rewrite that history.

**Watch an autonomous mistake.** The player is present but has delegated. The character may make a foolish choice. Presence alone does not substitute a wiser decision; the player can request intervention under the active rules.

**Give conflicting orders.** “Finish this shift” followed by “leave for the next town” requires defined priority and interruptibility. The document does not yet choose automatic replacement or clarification.

## Decisions required

Order priority and obedience; transition boundaries; activity interruption; presence/disconnect defaults; queued commands during pause; whether control extends to one or several characters.

Use these questions when reviewing the proposed requirements. Do not infer a final answer from an illustrative scenario.
