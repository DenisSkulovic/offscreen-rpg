# Continuity and consequences

The world can be sparsely described without being forgetful. Record enough to make player choices and later consequences believable; do not simulate a population merely to justify something the storyteller can introduce.

## Sparse world, progressive materialization

The fictional world may imply far more people, objects and places than the database explicitly stores.

1. **Implied/background world** — facts or population that make the setting feel real but have never become individually relevant. “The tavern is crowded.” “There are farms beyond the hill.” Do not create durable records merely because such things logically exist. Incidental crowds do not need individual rows, schedules or breakfast habits.

2. **Materialized scene detail** — people, objects and environmental details actually presented to the player in a passage. Nine patrons can genuinely appear in history when the storyteller establishes them. Individually targetable details may later need stable scene-local references so “talk to that woman” is unambiguous, but appearance alone does not require a full persistent world entity. Historical prose remains history even when an incidental detail was never promoted.

3. **Durable continuity entities** — a person, object, place or other thing becomes worth persistent story-scoped identity when later correctness depends on it: the player engages with it, ownership/location/relationship/state changes, it is deliberately revisited, or future rules/storytelling need to refer to that exact thing. Once durable identity/state exists, later generation must respect it. Absence from current context is not deletion.

A tavern may visibly contain several patrons without running a background life simulation for every patron. If the player forms a relationship with one patron, gives them an object, or later returns looking for them, that specific identity becomes continuity-relevant. The other patrons can remain scene detail.

Do not decide yet whether future durable people, places and objects use one entity table, separate typed tables, or another representation. That requires a concrete gameplay slice. Do not build one LLM agent per NPC, place or faction. A future storyteller can produce one bounded coherent scene or world proposal and materialize only what earns persistence. Space and movement representation remains an open product question; this distinction does not settle a map model.

## Places, scenes and cinematic presentation

The game needs a structured account of the situated present without turning every description into simulated geometry. Separate three concerns:

1. **World truth** records facts later correctness depends on: the current place, present durable participants, possession or placement of consequential objects, and spatial relations that enable or prevent actions.
2. **Scene staging** records what is salient now: local conditions, current focus, atmosphere and lightweight blocking such as inside/outside, nearby/distant, holding, following, concealed or blocking an exit.
3. **Cinematic presentation** chooses how to portray that truth: shot size, angle, composition, focus, lighting, palette and small sensory details. These choices guide prose or illustration generation but do not independently change game state.

A **place** earns durable identity when the player may return, something consequential remains there, its relationship to another place constrains movement, or a stable visual identity matters. Structural anchors such as a gate's twin towers may persist. Rain, temporary crowds and the current light normally belong to a scene rather than redefining the place.

A **scene** is a continuous situation at one primary place and time with relatively stable participants and constraints. Several action resolutions may produce several beats inside one scene. A conversation becoming hostile is usually a new beat; crossing town is a scene transition. Returning tomorrow creates a new scene at the same place, reconstructed from stable place identity, persistent changes and new conditions.

Do not promote every named background object, person or spatial detail. A cup on a table can remain scene dressing. Materialize the object if possession, location, later recognition or rule enforcement begins to depend on that exact cup. Likewise, “a drop of sweat rolls down her face” is normally presentation; it becomes state only when it establishes a consequential condition or observed clue.

The initial scene representation should remain a bounded `scene-frame.v1`, not a map or universal entity system. Candidate information includes:

- a durable place reference or temporary place description;
- fictional time and temporary environmental conditions;
- present durable participants and salient durable objects;
- a small set of meaningful spatial relations;
- current focus and atmosphere for generation.

The storyteller may propose an updated scene frame alongside a DM turn. Application code validates references to durable identities and authoritative relations. Prose remains free to add disposable texture. A later image pipeline derives a separate visual frame containing composition, shot, angle, lighting, palette and reference anchors. Camera instructions are never prerequisites, effects or evidence that an event occurred.

Scene transitions should be explicit enough to distinguish continuing the same situation, moving to another place, departing into a timed activity and arriving after one. Remote cutaways are not part of the solo POC because they can expose events the player character does not know.

## What happened, what is true, what might happen

The chronology records completed developments and choices. The current situation describes the facts relevant now. A prepared continuation is a possible future, not history. These are distinctions in meaning, not a requirement for three particular software entities.

If a wizard is scheduled to arrive at a tower and instead becomes trapped inside an apple, the arrival did not happen. If a friend takes the apple away, its location and the trapped wizard's circumstances change together. A recap must not turn an abandoned plan into a remembered fact.

## Space, movement and maps

Storytelling alone must not redefine established whereabouts, distances or travel conditions from passage to passage. When location affects a choice or consequence, the story needs an authoritative account of where characters are and how they can reach each other. A character interrupted between two places is still on a journey; neither departure nor planned arrival alone describes their position. Shared play makes this essential: proximity, rescue and encounters must fit both characters' circumstances at the same fictional time.

A coarse, uniform 3D cube map is a candidate representation, not yet a required format for every world. Within one such map, the cube is the fixed cell unit: no differently sized cells or recursive subdivision. A mountain cell might contain a city, with a dungeon cell beneath it. A separate local map could provide a second level of detail, but two-level navigation is optional and remains undesigned. Locations inside a region do not automatically require their own map.

The format must not force every story into terrestrial geography. Underwater regions can use vertical cells with different movement conditions; space may use sparse sectors and special travel links; an abstract world may have meaningful connections without meaningful metric distance. Scale and spatial meaning belong to the particular map/world. Equal-looking cells on different maps do not establish equal physical distances. A diagrammatic position must not silently become a distance used in travel calculations.

The storyteller may propose places, connections and changes consistent with the setting. Once accepted, those facts constrain subsequent generation. Adjacent cells are not automatically traversable: walls, water, entrances, stairs, vehicles and portals can matter without requiring dedicated simulations for each. A teleport or other exceptional transition is an explicit change, not an unexplained correction of contradictory prose.

An interactive map is deferred. Before implementing authoritative movement, choose the smallest representation that can demonstrate an interrupted journey and two characters' relative whereabouts. Rendering rotating cubes is a separate question from enforcing that consistency.

The storyteller could propose introducing, retaining or leaving a map when it helps the current situation. This is a presentation and scope choice, not permission to erase established geography. A transition to another realm can switch to a new map or no map while retaining the departure, relevant possessions, companions and any meaningful way back. In shared play, another character may still occupy the previous region. Changing the current view must not relocate them or delete their surroundings.

Route or region descriptions can provide useful narrative context without a detailed terrain simulation: a longer safe road and a shorter route through cursed marshes already make a meaningful choice. Agreed durations and movement constraints can apply to those connections without rendering cubes. Atmospheric qualities can guide the storyteller's encounters without guaranteeing an event or requiring a population of simulated monsters. If a quality also changes a calculated duration or difficulty, that effect needs an explicit supported rule; descriptive labels alone must not silently alter calculations.

Flexibility does not mean every imagined rule is automatically executable. A locked entrance can use an implemented possession check; an entrance that opens when someone forgets their name requires a defined way to assess that condition. The storyteller may judge narrative circumstances, but prose alone does not establish a deterministic check. Distinguish facts the system enforces from judgments the storyteller makes, and preserve accepted outcomes consistently. Add reusable mechanisms when a concrete playthrough needs them, rather than building a universal physics or rules engine.

## People, objects and capabilities

Give consequential people and objects consistent identity. A golden spear sold to someone remains that spear if it returns later. A passing crowd does not need a record for every member. Scene appearance can materialize detail without promoting every mentioned person or object to a durable entity; promotion happens when later correctness depends on that identity. See [sparse world, progressive materialization](#sparse-world-progressive-materialization).

Characters can have descriptive traits, capabilities, relationships and conditions. Their representation must accommodate unusual bodies and settings. Being miniature changes what is plausible; it need not automatically introduce a physics simulator. A character cannot use a lost object or an established unavailable ability simply because the next generated scene would be convenient.

Important injuries and other lasting changes should constrain subsequent choices until something in the story changes them. Ordinary atmospheric description need not become a tracked attribute.

## Possessions and exchanges

A short descriptive inventory can cover many needs. Add quantities when decisions depend on them. If a character has five coins and pays three, the remainder is two; the storyteller can judge a contextual price without inventing a full trade economy.

An accepted exchange must consistently update what was given and received. Repeated submission cannot purchase twice or restore spent resources. Gifts, favors and promises can matter without being forced into a universal monetary value.

The initial product needs meaningful possession continuity, not equipment slots, carrying-capacity calculations or simulated merchant inventories. The exact extent of counted resources is still to be chosen.

## Knowledge and perspective

Separate what is true in the fiction from what a character knows when that difference matters. The wizard inside an apple does not automatically perceive everything a friend sees outside. A character hearing a rumor has heard a claim; it need not establish the claim as true.

The first shared experience can keep players on a common narrative view. Private character information and separate perspectives should not be promised until their presentation and interaction are designed. Even with a shared view, the storyteller should not casually make characters act on information they never acquired.

Long-running play needs a distinction between established world state, character knowledge and current recall. A debt remains owed even when it is not in working context. A tavern visitor's story remains an attributed claim, not confirmed world truth. A character can recognize a returning acquaintance and retrieve a relevant earlier exchange without remembering every incidental remark from the past month.

Keep modest identity and episode references for encountered people when later recognition could matter; no offscreen population simulation is necessary. Encountered people are rememberable once they have crossed into durable continuity, not merely because they stood in a crowded room. Recent context, important relationships and unresolved commitments can stay readily available while older conversations are recalled through people, places, topics or objects. Being absent from current context is not deletion or proof that the character has forgotten. Deliberately vague or fallible recollection is a possible later gameplay feature, separate from accidentally losing data. Do not manufacture a memory when retrieval lacks supporting history.

## Context and cost

As history grows, retrieve and summarize relevant material rather than sending the complete chronology with every request. Durable facts and quantities should not depend exclusively on a lossy summary. A small context can still preserve the spear's owner or the promise made at the mill.

Reuse stable material where useful. Cached or prepared output is only valid while its assumptions still hold. Cost measurement must include generation that gets discarded after a change of plan, not just prose ultimately shown to players.

The initial proof of continuity is modest but concrete: remember a person or object across several developments, apply a lasting consequence, and preserve both after a restart and recap. Elaborate knowledge propagation and offscreen economies are outside the first playable scope.
