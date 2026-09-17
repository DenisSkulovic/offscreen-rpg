---
id: DOC-ROUTINES
layer: product
status: draft
domains: [characters-and-autonomy]
tags: [autonomy, time-cost, consequences, continuity]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-GOALS-ORDERS
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-WORLD-EVENTS
---

# Routines, work and needs

Owner: Denis. Release placement is owned by DOC-RELEASE-SCOPE; D041 selects recurring ordinary life for the first slice.
Scope: ongoing ordinary activity, including periods without direct control.
Sources: [goals/orders](goals-orders-and-permissions.md), [time/autonomy](../experience/time-presence-and-autonomy.md), [world events](../worlds/world-events-and-causality.md).

This draft applies the confirmed idea of a character living between visits. It does not select a job catalogue, needs meters, fixed daily schedule or economic formulas. Examples are illustrations.

## Routine is ongoing behavior, not guaranteed repetition

A routine can organize recurring work, rest, meals or other activity. Its intended repetition does not guarantee the character will follow it or that the world will keep making it possible. GOAL-001 through GOAL-004 own the distinction between planned behavior, actual effort and its consequences.

A character may continue a routine, interrupt it, resume it, replace it or abandon it. Those descriptions are useful for understanding the life that unfolded; they are not an implementation state machine.

## Proposed behavior

| ID | Draft expectation |
| --- | --- |
| ROUTINE-001 | Distinguish a one-off activity from an instruction or policy permitting recurrence. |
| ROUTINE-002 | Before another occurrence, account for relevant changed circumstances rather than treating initial eligibility as permanent. |
| ROUTINE-003 | When an activity is interrupted, retain or discard partial progress according to that activity's defined rules, not an unexplained narrator choice. |
| ROUTINE-004 | Where an activity provides compensation, distinguish performing work from actually receiving payment according to its terms. |
| ROUTINE-005 | Handle competing activities under an explicit policy rather than crediting mutually incompatible activity as if both occurred. |

The adopted time policy controls durations. Global pause and the possibility of personality-driven deviation are referenced rather than redefined here.

## Needs and desires

A bodily need, a preference and an obligation are different pressures. The product may represent some or all of them, at different levels of detail. Having a need does not guarantee the character satisfies it promptly or wisely.

Which pressures affect behavior and which have mechanical consequences depend on the selected D&D baseline and explicit adaptations. No hunger bar, addiction system, mood score or mandatory set of daily chores is implied.

## Illustrative situations

- A recurring job remains available but the character stops attending. Actual behavior and its consequences matter; scheduled attendance is not evidence of work.
- A workplace closes. Reassess whether the work can continue and what payment follows under its terms. Whether the character seeks another job, waits, or does something else belongs to autonomy.
- Work is interrupted partway through. Payment may depend on time worked, completion, an agreement or another defined rule; no universal answer is selected.
- A plan combines rest and work at the same time. The system needs to resolve the conflict rather than grant both benefits automatically.

## Options and forks

Detailed expression/defaults remain candidates; recurrence itself is initial direction under D041.

| Fork | Alternatives and tradeoffs | Evidence needed |
| --- | --- | --- |
| ROUTINE-F01: expressing recurrence | Fixed schedules; recurring goals; character-organized routines | Compare player effort and flexibility when circumstances change |
| ROUTINE-F02: everyday detail | Coarse daily outcomes; selected meaningful activities; detailed routines | Determine which detail creates worthwhile decisions |
| ROUTINE-F03: needs representation | Adopted rules only; qualitative pressures; additional explicit mechanics | D&D baseline plus examples where extra detail improves play |
| ROUTINE-F04: adaptation after interruption | Resume when possible; reevaluate priorities; seek an alternative | Character behavior in a disrupted ordinary week |
| ROUTINE-F05: simultaneous activity | Conservative incompatibility rules; permit defined combinations | Cases such as travel with conversation versus incompatible work |

Detailed employment, crafting and trade terms belong in [DOC-EMPLOYMENT](../activities/employment-crafting-and-trade.md). This topic owns recurrence and daily-life behavior. Personality, disobedience and major changes of goal stay with identity and goals/orders.

## Open work

Define relevant kinds of recurrence, activity interruption and ordinary-life pressures without overbuilding. Keep rewards and affordability questions visible, without implying that the illustrated rates or occupations are universal. DOC-RELEASE-SCOPE owns first-release coverage.

## Initial configurable life contract

D041–D042 require useful recurrence over supported activities without a language-model decision on every cycle. Fishing is illustrative content, not core behavior. Proposed initial interface: edit an ordered routine of supported activities with time windows or completion conditions, permitted purchases, expense caps and explicit fallback behavior. Offer a generated starter routine for review; a world description alone is not authorization to spend without limits.

ROUTINE-006: Each occurrence checks current location, available time, equipment, inventory, funds and relevant access. Include travel between distinct places. Mutually incompatible activities cannot all receive credit for the same hours. Opening windows use fictional time. Queue the next eligible activity only under the active routine's permissions.

ROUTINE-007: Editing a routine affects future choices; expose whether the current activity will complete or stop under its interruption contract. Preserve completed production and expenses. Spending permissions constrain automatic purchasing even if character judgment is fallible; personality cannot grant itself financial authorization.

ROUTINE-008: Define a fallback for a full inventory, no catch, insufficient money, unavailable merchant or interrupted route. Recommended first default: skip an optional purchase and use a valid authorized continuation when available. Pause with an explained pending decision only when a required step has no authorized continuation; a missed invitation alone is not such a blocker (D057). A month of unattended progress is possible only while the selected routine remains viable; never invent sales, supplies or income to force success.

ROUTINE-009: Reports summarize actual time elapsed, completed activities, goods produced/sold/consumed, income, spending by category, opening/closing funds and exceptions. Distinguish fictional days from real time. Aggregate routine outcomes into user-configurable digests; individual action notifications are optional. Important unresolved decisions follow DOC-INTERVENTION.

Recommend coarse rest/food effects in the first supported humanoid profile, with explicit replenishment and failure consequences rather than decorative bars. Exact rates remain open. Other bodies use appropriate profile-defined pressures; the shared routine machinery must not require money, alcohol, rent or human sleep. Rumor conversations and detailed intoxication can wait; a tavern visit can initially be a supported rest/social activity with an explicit price and duration, without pretending to simulate dialogue.

## Quiet life is a valid result

D049 makes routine life and story equally central. Reports may say that no major incident occurred while still showing actual activity, resource changes and small observations. No report requires a dramatic twist or a model call. Generated flavor must not invent consumed items, discoveries or other consequential facts absent from state. A quiet period can deepen characterization; do not equate engagement with constant disruption.
