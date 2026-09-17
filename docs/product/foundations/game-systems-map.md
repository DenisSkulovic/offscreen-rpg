---
id: DOC-GAME-SYSTEMS
layer: product
status: draft
domains: [foundations]
tags: [dnd-rules, autonomy, time-cost, affordability, continuity]
updated: 2026-09-17
relations:
  - type: depends_on
    target: DOC-PRODUCT-PRINCIPLES
  - type: depends_on
    target: DOC-GLOSSARY
  - type: relates_to
    target: DOC-ROUTINES
---

# Minimal responsibilities and optional simulation

D064 requests a substantially lighter product before technical design. This map replaces the earlier catalogue of work/travel/combat systems as the proposed starting point. It is a responsibility map, not a service or table diagram. The full [documentation index](../../DOCUMENTATION_TREE.md) is reference material, not an implementation backlog.

## Proposed core

| Responsibility | Purpose | Owner |
| --- | --- | --- |
| Story progression | Turn intention/current situation into a bounded next segment and meaningful choices; distinguish plans from history | [Story progression](../experience/story-progression.md) |
| Continuity | Remember relevant facts, current conditions, people, places and consequential possessions | [World detail](../worlds/world-detail-and-simulation-boundaries.md), [inventory](../rules/equipment-and-resources.md) |
| Time and delivery | Due segments, pause/resume, response windows, abandoned plans and current messages | [Time](../experience/time-presence-and-autonomy.md), [intervention](../notifications/event-intervention-and-timeouts.md) |
| Adjudication | Storyteller judgment with a small optional adopted check contract | [D&D boundary](../rules/dnd-baseline-and-coverage.md), [world events](../worlds/world-events-and-causality.md) |
| Agency and autonomy | Interpret choices and ongoing intentions within permissions and personality | [Play](../experience/moment-to-moment-play.md), [routines](../characters-and-autonomy/routines-work-and-needs.md) |
| Model spending and reliability | Bounded context/generation, validity checks, retries and honest degradation | [AI budget](../ai-experience/cost-budgets-and-degraded-play.md) |
| Scene and chronology | Orient the player now and after an absence | [Return](../experience/leaving-and-returning.md) |

## What is no longer a prerequisite

No dedicated employment, pathfinding, trade, food, sleep, crafting or combat system is required to narrate those situations. Rich inventories, map grids, needs meters, population simulation and economic balancing are not part of the proposed minimal core. Their topic documents remain scoped examples or later reference, not tasks waiting to be built.

## A reusable definition checklist

For a proposed addition, ask what player decision it improves and which inconsistency the minimal core cannot handle. Could a remembered fact and contextual judgment suffice? Does numerical precision actually matter? Add a specialized rule only for a repeated meaningful need or a deliberately selected play style. Avoid moving the old giant rules catalogue into prompts or generated schemas under another name.

## Recommended next elaboration

Walk one generic intention through a quiet interval, an interruption, a changed plan and a persistent consequence. Compare costs and coherence before selecting architecture. Resolve the few product alternatives in [TASKS](../../TASKS.md); do not design the previous per-activity system map in parallel.
