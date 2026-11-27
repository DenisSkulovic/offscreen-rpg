# Spatial play | unratified proposal

**Status: Proposed. Not selected.** This page is an open design. It is not a product rule, not a technical contract, and not permission to implement.

**Reader question:** Which location facts must stay consistent, and which choices about distance, visibility, map identity, travel time, teleportation, concurrent position, and the world clock stay open?

This page is the unratified map for that question. The [Historical domain research](../../../../research/product-reality/DOMAIN-COVERAGE-2026-11-18.md#domain-questions) retains coverage classification; this investigation owns the minimal representation of interrupted journeys, including discrete transitions and nonmetric worlds. Selected promises stay on the headings named below. The unanswered choices stay here. `docs/product/gameplay/maps-and-travel.md` is not created. No route-planning engine and no coordinate schema are proposed as rules.

A prose map does not create an executable route. A bodiless world does not have to use Euclidean meters.

## No separate selected invariant

No independent selected spatial invariant emerged. Authoritative whereabouts, a scene that is not a map, and world-neutral connections already live on [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) and [Places, scenes and cinematic presentation](../../../../docs/product/gameplay/continuity.md#places-scenes-and-cinematic-presentation). Travel duration, pace, and the undesigned movement rule already live on [Travel duration and progress](../../../../docs/product/gameplay/time-and-autonomy.md#travel-duration-and-progress). The fictional-second clock and its calendar label already live on [Calendars label accepted time](../../../../docs/technical/engine/calendars-and-world-time.md#calendars-label-accepted-time).

Those headings do not combine into a new selected journey contract. [Sparse world, progressive materialization](../../../../docs/product/gameplay/continuity.md#sparse-world-progressive-materialization) still leaves space and movement representation open. This proposal does not close it.

## Three kinds of place

These three are easy to collapse. This page keeps them apart.

| Kind | What it is | What it is not |
| --- | --- | --- |
| Narrative location | A place in prose, a scene, or a lore page. Seyda Neen can be named, described, and returned to. | A coordinate, a traversable edge, or proof that a journey can be executed. |
| Mechanically admitted movement | An admitted activity with a fictional duration and captured effects, when a ruleset offers one. | A route graph. A literal wait is not a traversal family. |
| Route topology | Source, destination, permitted route, and progress while interrupted. | Selected. The movement rule remains to be designed. |

**Normal:** an interrupted journey stays between departure and arrival when the story has established that journey. **Negative:** a prose map creates executable routes, a different clock presentation changes travel progress, or a bodiless world must use Euclidean meters.

## Two worlds

These worlds show the same selected continuity under different spatial meanings. Neither world publishes a coordinate schema.

### A named road

The checked-in Vvardenfell reference is a narrative location plus a prose route, not a planner.

[Seyda Neen](../../../../content/worlds/vvardenfell-poc/locations/seyda-neen.md) is a small Imperial port in the Bitter Coast. The page establishes atmosphere and broad connections. It says it is not a complete map, and that access, travel time, and hazards need admitted story or mechanical definitions. The [census and excise office](../../../../content/worlds/vvardenfell-poc/locations/census-and-excise-office.md) is one working place inside that settlement. [The road toward Balmora](../../../../content/worlds/vvardenfell-poc/routes/seyda-neen-to-balmora.md) says a northbound route leaves Seyda Neen through the Bitter Coast and connects eventually toward Balmora. Knowing that the route exists does not grant instant travel or a precise duration. A campaign must admit the selected path, pace, conditions, and interruptions through its generic travel rules.

[Human-scale duration guidance](../../../../content/worlds/vvardenfell-poc/WORLD.md#human-scale-duration-guidance) offers about 600–1,800 fictional seconds for leaving the settlement and covering the first meaningful stretch of marsh road. Those figures are local estimation anchors, not engine defaults.

That road can matter as a choice: a longer safer way and a shorter dangerous way are already meaningful in the selected continuity text, once a campaign admits them. This package does not admit either as an executable graph.

### A world without meters

A bodiless mind, or an abstract relation between two states, has no latitude and no body to place on a grid. [Flexible settings and protagonists](../../../../docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists) already withholds a required geography. A bodiless consciousness may have no use for Strength. That ability limit is unchanged here. [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) already allows meaningful connections without metric distance. [Non-negotiables](../../../../docs/product/experience/principles.md#non-negotiables) already withhold a mandatory map. The [world-neutral capability kernel](../../../../docs/technical/engine/selected-architecture.md#world-neutral-capability-kernel) already withholds a requirement for Euclidean travel, and it is a conceptual target, not a schema.

No checked-in world package assigns this mind a meter grid. That absence is the world. A connection, if the world admits one, is not a Euclidean length. A diagram of the relation is not a travel distance.

## Selected limits

These limits are already selected. This page repeats them so the open choices below stay separate.

| Selected limit | Owner | What is already true |
| --- | --- | --- |
| Whereabouts stay put | [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) | Storytelling alone must not redefine established whereabouts, distances, or travel conditions. An interrupted traveler is still on the journey. Departure alone, or a planned arrival alone, is not their position. |
| A scene is not a map | [Places, scenes and cinematic presentation](../../../../docs/product/gameplay/continuity.md#places-scenes-and-cinematic-presentation) | The initial scene representation is a bounded scene frame, not a map or a universal entity system. A place earns durable identity when later correctness depends on it. |
| Scale belongs to the world | [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) | An abstract world may have connections without metric distance. Equal-looking cells on different maps are not equal distances. A diagrammatic position is not a travel distance. Underwater cells, sparse sectors, and special links are choices of that world. |
| The cube map is a candidate | [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) | A coarse uniform 3D cube map is not a required format. An interactive map is deferred. |
| An exceptional transition is explicit | [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) | A teleport or other exceptional transition is an explicit change, not a silent correction of contradictory prose. |
| Changing the view does not move someone else | [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) | Leaving a map, or switching realm, must not relocate another character or delete their surroundings. Shared-play acceptance remains Proposed/Blocked. |
| Labels do not silently change a calculation | [Space, movement and maps](../../../../docs/product/gameplay/continuity.md#space-movement-and-maps) | A route description can be narrative context. If a quality changes a duration or a difficulty, that effect needs an explicit supported rule. |
| Pace is not distance | [Travel duration and progress](../../../../docs/product/gameplay/time-and-autonomy.md#travel-duration-and-progress) | Fictional travel duration and real waiting time stay separate. Changing presentation pace does not change distances or movement capabilities. Paused real time does not create fictional travel progress. |
| No universal movement formula | [Travel duration and progress](../../../../docs/product/gameplay/time-and-autonomy.md#travel-duration-and-progress) | Elapsed duration is not universally proportional to distance. Straight-line interpolation is not the rule. The movement and progress rule remains to be designed. |
| A wait is not a traversal | [Implemented entry and honest limits](../../../../docs/product/gameplay/rules.md#implemented-entry-and-honest-limits) | `clock-wait.v1` is a literal wait. A separate traversal family is not that process. A literal wait and travel are different process meanings. |
| The clock is fictional seconds | [Calendars label accepted time](../../../../docs/technical/engine/calendars-and-world-time.md#calendars-label-accepted-time) | A calendar projects a label from the canonical fictional-second coordinate. It does not grant idle time, and it does not validate an activity. Changing pace changes eligible real waiting, not the fictional position already reached. |
| A map can be lore | [Campaign bootstrap](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap) | Maps, places, quests, and plots are content roles, not universal engine tables. A place can stay ordinary lore until executable movement needs a validated definition. Bootstrap does not create a place file merely because another story might use one. |
| No required geography | [Flexible settings and protagonists](../../../../docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists), [Non-negotiables](../../../../docs/product/experience/principles.md#non-negotiables) | The core must not require a geography or a map. Unusual bodies remain valid. |

The [spatial model boundary](../../../../docs/technical/platform/data-and-persistence.md#spatial-model-boundary) says spatial storage is not implemented. It withholds a map table, a coordinate schema, and a pathfinding library. It also lists behavioral requirements for a future journey record. Those requirements are not a settled schema, and this page does not settle them.

## Open choices

Each row is unratified. Naming it here does not select it.

| Open choice | What stays unchosen |
| --- | --- |
| Distance source | Whether a duration comes from an authored connection, a measured grid, a discrete hop, or no metric at all. The Vvardenfell 600–1,800 second anchor and one fixture's 900 second wait are not a shared distance rule. |
| Visibility | Which spatial facts a character knows, and which map drawing may be hidden, replaced, or omitted. Retained facts and a current view already have different lifetimes. No visibility mechanic is selected. |
| Map identity | Whether a map has a stable identity and revision, and how a second local map relates to a region. A descriptive page, a media reference, and a structured topology are all still only content roles. |
| Travel ETA | How an arrival time is derived, shown, and invalidated. An admitted fictional duration is not a computed ETA. A pace change recalculates real waiting for an admitted action. It does not rewrite the fictional duration. |
| Teleportation | How an exceptional transition is admitted, what it skips, and which planned arrivals it invalidates. The selected text only requires that the change be explicit. |
| Concurrent position | How two actors can be at places, or between places, at the same fictional time so that proximity and rescue fit both. The small-group case is an ambition. Its live acceptance is Proposed/Blocked. |
| Relation to the world clock | How journey progress, if a world admits any, advances in fictional seconds, and how a deadline, a pause, or a calendar label meets that progress. A calendar name does not move the traveler. The movement rule that would bind progress to the clock is undesigned. |

The smallest representation that can show an interrupted journey without a universal map stays unanswered. The catalogue leaves that choice open. This page does not pick it.

## Inspected records

This inspection does not add an effect, a column, or a schema. Source was read at `b3113814` and was not executed again.

| Record | What the source shows | Still open |
| --- | --- | --- |
| Seyda Neen plan `travel-toward-balmora` | The fixture offers the plan when the character fact `location` is `seyda-neen` and `balmora-route-known` is true. The process is `clock-wait.v1` for 900 fictional seconds, labeled "Road travelled". Completion sets that same fact to `balmora-road`. | The fact write happens with completion. The plan does not store a route id, a coordinate, or a position between the two labels. It is not a traversal family. |
| `clock-wait.v1` | A literal wait records elapsed fictional seconds against a required duration. The displayed estimate does not award progress. | Elapsed wait is not distance traveled. A different clock presentation does not change how many fictional seconds the wait has already consumed. |
| Campaign `location` | The campaign row has a nullable text column, initialized null, and the campaign view projects that string. This read found no travel writer for the column. | A nullable label is not a map reference and not a journey record. |
| Vvardenfell Markdown | The route page and the duration anchors are prose in a content package. Package import publishes documents. It does not compile a route graph from those pages. | A prose map does not become an executable route. |

The package route is [Who owns which promise](../../../../docs/technical/storyteller/context-and-memory.md#who-owns-which-promise). The contract itself is [Canonical documents and packages](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). This page does not rewrite either.

## Refused ratification

This proposal does not publish a selected maps page. It does not add a route planner, a coordinate schema, a pathfinding library, a teleport effect, or a travel formula. A later owner may ratify a distinct player promise and then choose an owner. Until that acceptance, the selected headings above remain the rules.

Packet: [DOC34](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/documentation/2026-11-18--doc34-space-travel-and-location/CHANGE.md).
