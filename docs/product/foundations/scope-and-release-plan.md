---
id: DOC-RELEASE-SCOPE
layer: product
status: draft
domains: [foundations]
tags: [offline-play, autonomy, dnd-rules, affordability]
updated: 2026-09-17
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
  - type: relates_to
    target: DOC-GAME-SYSTEMS
---

# First release: simplifying the product before architecture

Status: revised proposal under D064, not an accepted v0.02 baseline. The prior v0.01 remains in Git history. Confirmed goals survive: a persistent character life, an active storyteller, optional player participation, continuity, explicit pause, a scene-focused browser UI, phone contact and senior fullstack quality. Specialized mechanics are being reduced before technical design.

## First-release boundary

Propose one loop: establish a character/current situation; offer or infer an intention; prepare a short continuation; let time pass; admit a due story development with relevant state changes; accept a choice or authorized fallback; continue and recap. The [story-progression contract](../experience/story-progression.md) owns this proposal.

| Capability | Proposed minimum |
| --- | --- |
| Opening | Premise, compact character facts and a scene with meaningful options; no world census or mandatory map generation |
| Progression | One generic flow for actions, observations, agreements and quiet intervals; variable narrative granularity |
| Storyteller | Judge plausibility, duration, consequences and opportunities within campaign limits; retain actual LLM authorship |
| Continuity | Established identities/facts plus current situation; distinguish committed history from pending plans and rumors |
| Time | Explicit fictional/real-time relationship, due ordering, cancellation, pause and recovery |
| Checks | Candidate small D&D character/check subset; no broad rules catalogue or tactical-combat prerequisite |
| Possessions | Candidate compact record of significant items and quantities only when meaningful; no price economy or equipment simulator |
| Agency | Meaningful contextual choices, direct initiative and ongoing intentions; free text/hybrid still open |
| Intervention | Ordinary delegated continuation; explicit campaign alternative for timed holds, and manual pause always clear |
| Interface | Current scene, useful actions, state and focused chronology; one selected phone route, no dense management dashboard |
| Costs | Bounded prepared segments/context/repairs and actual usage; no guarantee of unlimited novel no-model life |

Map necessity, inventory precision, check breadth and duration policy are proposals to resolve, not accepted eliminations. “Work” and “travel” can remain narrative labels without becoming dedicated software modules. A generic recorded transfer or condition change is not an entire economy or survival system.

## Incremental development checkpoints

1. Resolve the few product choices in TASKS, then write compact technical contracts for a generic story flow and consistent state/time.
2. Build a local playable loop with actual storyteller judgment early: choice, short preparation, due event, interruption and changed continuation. A mock is for tests, not a live-storyteller claim.
3. Connect the selected phone surface, valid nonresponse and browser recap; demonstrate restart/pause and stale-plan behavior.
4. Measure coherence, agency and cost; polish the scene-focused experience and explain architecture with actual evidence.

Do not build specialized routines, markets or pathfinding before proving the storytelling loop. Existing profession and incident examples are optional content, not release gates.

## Completion checks

These are proposed, unexecuted checks; [SCN-019](../validation/reference-campaigns-and-journeys.md#scn-019--generic-story-progression-and-contextual-exchange) is the primary simplification fixture. Older scenarios supply relevant edge cases, not a demand to implement all their mechanics.

- A premise yields a coherent scene and options without a dedicated implementation for each action verb.
- A selected intention can continue quietly or encounter a scheduled interruption; changing course cancels incompatible future content and preserves the elapsed past.
- History/current state remain consistent after retries, pause, restart and a returning character/object.
- Model judgment respects declared facts, permissions and any adopted roll; a generic transfer cannot double-spend or duplicate a significant item.
- Direct and unattended choices alter the story; notifications/recaps distinguish happened, planned and rumored information.
- Budget exhaustion produces only legitimate prepared/fallback continuation or a clearly reported block, never invented progress or hidden spend.
- The browser/phone loop demonstrates actual outcomes; no fictional setting, number or dramatic incident is mandatory.

## Portfolio evidence

Keep the engineering bar: polished responsive scenes and useful error states, validated model outputs, durable progression, meaningful tests/CI, observable calls and costs, reproducible setup and a credible demo. Show semantic failures as well as structural validation successes. Compare a short story with a long quiet interval and an invalidated prepared segment. Less simulation concentrates the work in adjudication, continuity, scheduling and bounded inference; it does not make those problems disappear.

## Definition still needed before implementation

[TASKS](../../TASKS.md#short-design-gate-list) owns the remaining decisions: degree of adjudication, small check contract, time policy, precision of possessions and bounded continuation/fallback. Stack/channel/access follow these choices. No automatic license, development budget or deployment selection is implied.

## Later candidates

Visual maps; exact inventory/capacity; deliberately selected detailed movement, work, survival or combat rules; expanded UI/input, providers and channels. These require a player-facing reason, not a wish to complete the documentation index.

## Parked ideas

World population/economy simulation, mandatory merchant restocking and payroll, exhaustive needs schedules, broad tactical/source coverage, generated executable mechanics, universal physical rules and combinatorial world-profile matrices. Images and self-hosted GPU serving remain optional investigations with no initial cost/capability claim. Multiplayer and billing remain outside the selected core.

## Architectural value without expanding the game

No database, schema, event-sourcing design, graph, model or agent framework is selected. The visible chronology is a product experience; a literal append-only list as the sole state representation is not assumed. Preserve current facts and conditional future work using whatever technical design fits after the proposed product boundary is discussed.
