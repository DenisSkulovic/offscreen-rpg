---
id: DOC-TRAVEL
layer: product
status: draft
domains: [worlds]
tags: [time-cost, consequences, continuity]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-DND-BASELINE
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-WORLD-DETAIL
---

# Places, travel and distance

This topic owns travel behavior. The following is a draft contract for SCN-002 and SCN-008, not selected D&D movement rates or a universal physics model.

## Proposed journey contract

A journey identifies origin, intended destination, an available connection or movement method, actor/vehicle capabilities, relevant environment, progress measure, resource needs and known constraints. Straight-line proximity does not imply access. The actor chooses using known information; a remote route closure is not automatically known.

For a supported constant-speed segment, progress equals effective speed multiplied by eligible fictional duration, bounded by the segment endpoint. Movement rules determine effective speed, rest, terrain or other modifiers; exact source values remain unselected. Other methods may use scheduled departures, jumps or distinct movement rules rather than this formula.

Before crediting arrival, resolve events and resource boundaries within the interval. At interruption, preserve reached position/segment progress, elapsed time and expenditure. Waiting, continuing, reversing or taking a detour each requires a currently legal connection and its own time/cost. A detour cannot reuse the original arrival promise without recalculation.

Global pause advances neither movement nor concurrent environmental processes. Acceleration reduces real waiting, not fictional travel requirements or intermediate consequences. A material new observation may trigger a decision; repeated polling is not another encounter roll.

## Different environments and scales

Walking, flying, rail travel, orbital/interstellar movement, teleportation and microscopic movement can share the journey contract while using different capabilities and resolution. Define units, containment and cross-scale reach explicitly. A traveler inside a vehicle has a location relative to it; vehicle movement and personal movement cannot independently teleport the traveler to inconsistent places.

Environmental compatibility is a prerequisite where relevant. Do not assume every actor breathes air, rests like a human or carries conventional provisions. A changing body or movement mode invokes the transformation rules in its mechanical profile and resolves any interrupted journey.

TRAVEL-F01: Choose the supported initial movement modes, progress granularity and source rules. Recommend a simple connected-route fixture plus a non-ground movement comparison before expanding coverage. SCN-002's 24 km example is an accounting fixture, not a selected rate. SCN-008 tests transformation and containment.

## Initial square map and extensible places

D037 chooses a simple square grid for the starting experience. Proposed behavior: cells have coordinates within their own map, terrain/access attributes and links to relevant locations. A cell can contain entrances or places such as a home, mine or settlement. Those places may contain sublocations without requiring a new detailed tile map for every room. Stable place identity is distinct from its current map coordinates and presentation.

Connections determine permitted travel: adjacency can create ordinary neighboring-cell routes, while explicit entrances and special links support sublocations. Recommend four-neighbor movement initially; diagonal movement, corner blocking and exact cell distance are unselected details. Each supported connection defines movement requirements and its distance/duration model. The world builder must not generate a visually neighboring mine that is unreachable by the chosen rules.

Terrain and routes are place facts; occupants and loose items have their own current location/custody. Cell views show those occupants without making new copies. An actor stays in a place or progresses on a connection; entering a sublocation changes location through a valid entrance rather than teleporting based on a label. NPC movement uses the same supported access/time rules, with simple schedules or choices rather than an LLM per step.

For the first underground mine, an entrance can lead to an abstract mine interior where the work action occurs. This does not claim a fully traversable multi-level cave map. Later, levels or separate maps can connect through stairs, shafts, flight, portals or other supported links. Space regions can use connected destinations and travel methods rather than converting every astronomical distance into square cells. Those are extension directions, not current implementations or claims about another game's exact map model.

MAP-F01: Choose initial grid extent/cell scale, movement neighborhood and what the player can see versus what the character has discovered. Recommend a small finite local map with reachable named destinations and one level of abstract sublocations. Do not require complete continent generation. Before adding a new topology, test identity, reachability, time, containment and interruptions against existing journeys.
