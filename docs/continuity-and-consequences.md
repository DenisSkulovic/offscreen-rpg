# Continuity and consequences

The world can be sparsely described without being forgetful. Record enough to make player choices and later consequences believable; do not simulate a population merely to justify something the storyteller can introduce.

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

Give consequential people and objects consistent identity. A golden spear sold to someone remains that spear if it returns later. A passing crowd does not need a record for every member. Detail can become worth recording when a player engages with it.

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

Keep modest identity and episode references for encountered people when later recognition could matter; no offscreen population simulation is necessary. Recent context, important relationships and unresolved commitments can stay readily available while older conversations are recalled through people, places, topics or objects. Being absent from current context is not deletion or proof that the character has forgotten. Deliberately vague or fallible recollection is a possible later gameplay feature, separate from accidentally losing data. Do not manufacture a memory when retrieval lacks supporting history.

## Context and cost

As history grows, retrieve and summarize relevant material rather than sending the complete chronology with every request. Durable facts and quantities should not depend exclusively on a lossy summary. A small context can still preserve the spear's owner or the promise made at the mill.

Reuse stable material where useful. Cached or prepared output is only valid while its assumptions still hold. Cost measurement must include generation that gets discarded after a change of plan, not just prose ultimately shown to players.

The initial proof of continuity is modest but concrete: remember a person or object across several developments, apply a lasting consequence, and preserve both after a restart and recap. Elaborate knowledge propagation and offscreen economies are outside the first playable scope.
