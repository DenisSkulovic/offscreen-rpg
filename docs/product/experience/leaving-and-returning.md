---
id: DOC-LEAVING-RETURNING
layer: product
status: draft
domains: [experience]
tags: [offline-play, autonomy, notifications, continuity, consequences]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-CONTROL-HANDOFFS
  - type: derives_from
    target: DOC-PLAYER-NEEDS
---

# Leaving and returning

Owner: Denis. Scope: the experience around absence and return.
Sources: [time/autonomy](time-presence-and-autonomy.md), [control handoffs](control-and-handoffs.md), [player needs](../foundations/audience-and-player-needs.md).

This document is a draft. It applies confirmed pause and autonomous-risk directions without selecting default absence behavior, notification schedules or return-time protection.

## What the player needs to understand before leaving

The campaign may be paused or running. In a running campaign, the character may continue under its autonomy policy, and events may wait or resolve automatically according to configuration. Losses and death can occur where enabled.

The player should be able to understand their current choice without being forced through a repetitive approval screen on every departure. Exact presentation remains open.

## Proposed requirements

| ID | Draft behavior |
| --- | --- |
| RETURN-001 | Make the effective world state and delegated behavior discoverable before departure; closing the interface must not be represented as a guaranteed pause unless that is the active policy. |
| RETURN-002 | On return, distinguish a paused unchanged world, a running world with developments, and a world paused by an event. |
| RETURN-003 | Summarize meaningful changes since the relevant previous visit, with access to further history where supported; do not require reading every routine occurrence before acting. |
| RETURN-004 | Distinguish completed outcomes from pending opportunities or choices, including decisions already taken autonomously. |
| RETURN-005 | Report major consequences honestly, including death or loss where enabled; returning does not automatically reverse them. |
| RETURN-006 | Retain enough context to explain consequential character actions through available history without promising access to all hidden world information. |
| RETURN-007 | Retired as a duplicate; late intervention is owned by CTRL-006 in [control/handoffs](control-and-handoffs.md#proposed-requirements). Preserve this ID for historical references. |

Reference the owning time and handoff policies for the actual behavior; these requirements govern orientation and communication.

## Returning examples

**Paused for six months.** The player resumes the paused situation. The game does not simulate six months of missed work, hunger or threats. The proposed recap can remind the player what they were doing.

**Running for a week.** The player sees relevant work, earnings, expenses, social developments and major events. The character may be richer, poorer, injured or dead under campaign settings. The exact summary cadence during absence is not selected.

**An event stopped progression.** The recap identifies the pending situation and that the world has been paused. Time since that pause has not advanced the journey or other campaign activities.

**An expired invitation.** The character already chose a response under its policy. The player can inspect the outcome and act from the current situation; the old notification does not offer a time-travel decision.

## Notification and service boundaries

Occasional summaries and event invitations are intended, but channel, frequency, quiet periods and failure behavior need a dedicated specification. A notification is not evidence that the player saw or accepted anything.

Player absence and service unavailability are different. D038 now requires the initial web experience to progress and offer phone updates while the browser/player computer is closed, when intentionally running and the service is available. Hosting and outage recovery remain technical decisions; a local-only catch-up mode does not satisfy that initial notification loop. See DOC-INTERVENTION.

Returning while time is running may itself require a policy: does inspection or reading a recap pause it, or not? This is unresolved and must agree with active-play clock behavior.

## Decisions required

### Changing availability and attention

D032: Denis favors adjustable unattended behavior as gameplay style and real-life circumstances change, especially autonomy and notification appetite. This is a direction, not a requirement to support every execution mechanism or policy combination in the MVP.

Keep three preferences distinct: world progression, permitted autonomous choices, and contact preferences. Proposed interpretation: muting notifications does not itself pause the world or increase character authority; lowering autonomy can cause a future decision to wait under the chosen pause policy. Switching policies applies prospectively at an explicit boundary and does not rewrite already-resolved events. Exact transitions, pending invitations and campaign-lock interactions remain proposals to specify.

Availability is a separate capability: timely events while the player's computer is off need an available runtime somewhere. Catch-up can reconstruct elapsed permitted life on return but cannot have delivered a timely invitation during the absence. The product should explain supported behavior without forcing Denis to choose one permanent way of playing. SCN-006 in [reference scenarios](../validation/reference-campaigns-and-journeys.md) owns the comparison case; technology remains unselected.

### Remaining details

What counts as the previous visit for summaries? Which changes always appear? What history may the player inspect beyond character knowledge? What are initial absence and notification defaults? Does return/inspection change the clock state? What is the experience after character death?

These questions depend on planned clock, notifications, campaign-end and quality documents; they are not reasons to invent their answers here.

## Focused chronology after a long break

D054 calls for reorientation to the story, not an exhaustive log. Proposed return view answers: where am I, what am I doing, why, who matters now, what changed, and what can I do next? Show current clock/control state and outstanding decisions prominently. Provide a concise story-so-far with expandable significant events and relevant people/items; routine detail can remain available without flooding the chronology.

RETURN-008: Distinguish real absence from fictional elapsed time. Five months after an explicit pause, restore the same situation and offer a recap without manufacturing five months of life. Reading does not silently resume a paused campaign. In a running campaign, make ongoing time visible and keep explicit pause accessible; the default reading/inspection clock policy remains open.

RETURN-009: A recap reflects established outcomes and the selected knowledge boundary, with links to underlying events where supported. Distinguish user choices, autonomous choices and external developments. Do not replace uncertain rumors with truth, rewrite the motivation for prior choices or reveal hidden storyteller plans. Returning after context compression must still recover relevant long-term connections. Factual/template recap is a valid fallback if model generation is unavailable; reorientation cannot depend on purchasing new inference.
