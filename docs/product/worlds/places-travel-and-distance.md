---
id: DOC-TRAVEL
layer: product
status: draft
domains: [worlds]
tags: [time-cost, consequences, continuity]
updated: 2026-09-17
relations:
  - type: depends_on
    target: DOC-DND-BASELINE
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-WORLD-DETAIL
---

# Places and journeys in the story

This topic owns spatial continuity, not a mandatory movement simulator. D064 requests reconsidering activity/world complexity. The proposed [story-progression contract](../experience/story-progression.md) allows journeys and interruptions to be adjudicated by the storyteller with coarse persistent location and time.

## Proposed journey contract

Remember the current place or in-transit situation, intended destination, known relevant obstacles and the estimated fictional duration. The model can judge route plausibility and duration from those facts; the application schedules and records progress. There is no required distance/speed formula, pathfinding graph, cell-by-cell update or per-NPC route schedule.

Do not treat a planned arrival as complete. After an interruption, preserve enough location/time context to estimate a credible continuation. Abandoning the journey invalidates pending arrival or road content that no longer fits. Exact tracking is unnecessary until a player decision depends on it. Established geography still constrains invention: a sealed room or an unreachable destination cannot disappear merely because the model proposes walking there.

## Different environments and scales

Walking, flying, portals and interstellar transit can share one narrative progression flow. The premise and established capabilities constrain adjudication without requiring a new software subsystem for each mode. Preserve significant containment and identity—for example being aboard a ship—when they affect a scene. New genre details are not a promise of accurate orbital or microscopic physics.

## Initial square map and extensible places

D037's grid was an earlier selected presentation direction. D064 reopens whether it is useful for the lightweight version; recommend deferring it from the first implementation, without claiming the user has rejected maps. Named places and relative relationships can orient the story, with a visual map added when it improves play. Do not build a grid generator as a prerequisite for the chronology.

TRAVEL-F01: Evaluate whether coarse narrative whereabouts suffice; exact speed/position rules are later candidates, not source-coverage gates. MAP-F01: Decide whether an initial map earns its interface and data cost. Recommend scene/location presentation first. Neither decision should be inferred from the walking-distance illustration.
