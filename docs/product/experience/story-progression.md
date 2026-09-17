---
id: DOC-STORY-PROGRESSION
layer: product
status: draft
domains: [experience]
tags: [continuity, time-cost, autonomy, affordability]
updated: 2026-09-17
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: relates_to
    target: DOC-AI-BUDGET
---

# Story progression and the minimal game contract

Proposed simplification under D064. This is a product behavior proposal for discussion, not an accepted database schema, execution engine or new rules edition. “Beads on a string” is a useful account of the experience, not a requirement that all state live in one list.

## One way to advance a life

An action, an observation, an agreement, a quiet interval and a crisis can all enter the same chronology. The storyteller interprets intentions, estimates fictional duration, supplies choices and adjudicates consequences using the current situation, campaign limits and adopted checks. It need not dispatch each verb to a dedicated work, eating, travel or trade simulator.

The visible chronology is what happened. Behind it, keep the current situation, relevant established facts and a small amount of pending work. A prospective arrival is not a historical fact; a secretly planned encounter is not yet something the character experienced. Reading a recap need not replay all prior prose to discover where the character is now.

The narrative may summarize a week or dwell on a moment. Its granularity depends on meaningful choices, continuity and pacing, not a mandatory entry per action or minute. The player can redirect a current intention; future chronology follows the resulting course.

## Proposed allocation of authority

| Responsibility | Storyteller judgment | What the application preserves/checks |
| --- | --- | --- |
| Intention and options | Plausibility, alternatives, character interpretation | Player input is an attempt, not authority to overwrite facts or settings |
| Passage of time | A plausible fictional duration and possible interruptions | Explicit conversion to real waiting, pause, due ordering and cancellation |
| Uncertainty | Whether a check is useful, applicable traits and proposed stakes | Adopted roll semantics, actual result and one resolution; no convenient rerolls |
| Outcomes | Contextual success/failure, story developments, qualitative effects | Campaign permissions, consistency, relevant quantities and no duplicate changes |
| Continuation | What follows, what matters and which old connections return | Established identity/history, current status and validity of pending events |
| Presentation | Expressive scene, options and focused recap | No leaking planned events or mistaking a proposed future for a completed fact |

This is narrower than encoding physical laws for every action. It is stronger than accepting every sentence as true. Semantic consistency remains partly a model-quality problem; structural validation cannot prove a generated story makes sense.

## A short future, not a predetermined story

STORY-001: Offer an intention with a duration estimate, salient known costs/risks and any response policy. Do not pre-author all possible futures for every displayed option. After selection, prepare only a bounded next segment: possibly a completion, an intermediate observation or one encounter checkpoint. Exact segment size and number of calls are unselected.

STORY-002: A scheduled development remains conditional until its due point is reached and it is admitted. If the player pauses, changes destination, uses an item or otherwise alters the relevant situation, recheck or discard incompatible pending work. Do not teleport them to an abandoned destination, run an encounter on the old road, or credit the full planned interval after interruption. Cancellation of future content does not erase facts already established.

STORY-003: Record what has actually elapsed and changed when a checkpoint occurs. During travel, “partway along the road” can be enough; exact kilometer progress and per-cell movement are unnecessary unless the chosen experience needs them. At a detour, the storyteller may estimate a new remaining duration constrained by the established position and elapsed time. Resume is not automatically the full original trip or instant arrival.

STORY-004: Repeated delivery, retries and returning to a scene must not apply an outcome or charge twice. If a plan is no longer valid, a newly required adjudication is distinct from rerolling an unchanged check until a preferred result appears. Do not precommit a dramatic ending that later choices cannot affect while presenting those choices as meaningful.

These behaviors support the road encounter illustration without requiring a road-network engine or a separate encounter simulator. A three-minute timed pause is one possible intervention policy, not a replacement for the previously selected normal delegated-running behavior; DOC-INTERVENTION owns the choice.

## Checks and storytelling are different questions

A character check can assess whether an intended action succeeds. A storyteller pacing decision can decide whether a quiet trip merits an encounter. A luck/event roll can vary developments if explicitly adopted. Do not silently make them the same roll: poor skill need not imply that unrelated enemies appear, and high skill need not erase every story opportunity.

Recommend no check for an uncontested mundane action unless the campaign makes uncertainty meaningful. For a rolled action, establish the relevant ability, difficulty and interpretation before consuming the result. Keep outcomes compatible with the roll; do not secretly replace failure with success or decide death solely to fit a planned scene. Story-authored outcomes without rolls can exist under the declared campaign contract. Exact D&D subset, custom chance rules and visibility remain open in DOC-DND-BASELINE.

## Minimal continuity is still state

STORY-005: Keep established character identity, capabilities, consequential conditions, known relationships, current whereabouts and important possessions available to later adjudication. These can be compact facts; they do not require a bespoke simulation per fact. An injury may be a lasting qualitative condition whose practical consequences are adjudicated, without implementing anatomy or a medical simulator.

STORY-006: Bind consequential facts introduced in narration to the current situation before later decisions rely on them. Use enough identity to distinguish one returning object/person from a new one. A description can be flavorful without becoming an actionable object; clarify when it does matter. A generic effect such as transferring an item or changing a condition needs consistent semantics, not a separate effect engine for every genre.

The retained core is chronology, current facts, intended/pending continuation, player/autonomy permissions, time, optional checks and bounded inference. It does not require work/travel classes, a currency exchange market, equip slots, needs meters or a spatial grid. Nor does this proposal commit to event sourcing, a graph database, embeddings or a particular schema.

## Cost and useful failure behavior

One model call per tick or narrated bullet is unnecessary. A bounded generation may produce a short segment, choices, duration, relevant changes and limited conditional continuation together. The application can wait, publish due valid content, roll a defined check and apply approved changes without more inference. Separate observations may be coalesced into one report.

However, a new situation that depends on storyteller judgment may require a new call. Removing specialized mechanics trades code complexity for model reliance. At a budget limit or outage, execute only still-valid prepared continuation or an explicitly supported generic fallback. If neither exists, retain the situation and explain the generation block. Never claim arbitrary new life continued for free, silently spend above the limit or repeat rewards from a stale prepared segment.

Compare cost per meaningful story interval, per player intervention and per real unattended day; include invalidated pre-generation, repairs and long-term context retrieval. Cheap weeks remain an ambition until measured. DOC-AI-BUDGET owns numeric limits and degradation policy.

## Questions worth deciding, without freezing a schema

- How much storyteller adjudication is acceptable before the player expects a stable explicit rule? Recommend contextual judgment with explicit handling for repeated consequential facts and adopted checks.
- Is a compact counted inventory worth keeping? Recommend identity for significant items and quantities only where exact possession/spending matters; DOC-INVENTORY owns the alternative.
- Should fictional duration determine real waiting, or should narrative pacing partly control it? DOC-TIME-AUTONOMY compares the options; do not publish contradictory estimates under one claimed speed.
- How far ahead is worth preparing, given cancellations and cost? Test one short segment before designing a branching story generator.
