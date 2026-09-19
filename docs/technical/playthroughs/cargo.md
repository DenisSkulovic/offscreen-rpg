# Space cargo: the worker, vehicle and reward recipient differ

Companion to the sixteen-hour cargo benchmark in [playthroughs](../../playthroughs.md). All transport, inventory and delivery-contract behavior here is target design. It is not provided by the current numeric-quantity effects alone.

## CG-01: accept a delivery with visible commitments

Scene:

> The sealed medical crates are aboard. Flight control can clear you for the outer station now, but the contract pays on handover, not departure.

Options: depart on the accepted route, inspect the contract/cargo, or decline before departure. Choosing inspection might expose established facts without a check; negotiating a better payment would need supported terms, difficulty and failure stakes. No generic “talk” button should mint a new price or grant the reward.

Fixture: one tick = one fictional minute and costs one real minute. Route length 960 units, one per eligible tick: sixteen real hours. Ship fuel starts at 96 units; one six-unit consumption occurs per completed sixty-tick cruise segment. All quantities and interval arithmetic are illustrative. Cargo is bound to ship S, contract beneficiary is captain C, navigation participant is an admitted pilot/autopilot, and the route target is the destination station.

These are separate identities. A character going to sleep must not magically stop a permitted autopilot, and replacing a pilot must not transfer ownership of the cargo or payment. The capacity model must state whether autonomous cruise requires any continuing character attention; it cannot assume every activity uses a humanoid's universal “primary slot.”

## CG-02: cruise without paid filler

A supported departure/navigation check uses Intelligence plus navigation modifier +3, DC 12. Fixed draw 11 gives 14: accept the successful course-setting receipt. It does not complete the route. The exact applicability/skill declaration must be present; do not infer it from the word “captain.”

Each sixty-tick segment commits route progress and fuel usage once. At tick 360: route progress 360/960, fuel 60, cargo still aboard, payment zero. No per-minute LLM call and no need to simulate every crew member's meals. A failed required fuel condition blocks further travel rather than allowing negative fuel with a poetic explanation.

Do not repeatedly charge the same segment after a workflow retry. If consumption is intended at departure or continuously instead, that requires a different explicit captured cost rule; cancelling halfway must follow it. This fixture charges completed segments and deliberately makes no claim about finer-scale propulsion physics.

## CG-03: a distress signal at tick 360

An occurrence draw 2 against threshold 2 produces the selected event branch. The scene is grounded in an admitted distress signal, not a guarantee that the source is honest:

> A narrow-band message breaks through the engine hum. Someone beyond the direct route is asking for a tow. Answering is not the same as committing to the detour.

Public intentions:

- “Continue the contracted route”: decline the interruption, resume remaining 600 units; do not erase the signal from history.
- “Ask for position and condition”: a supported communication/information action. It must not consume the fuel for a detour before the player accepts one.
- “Divert to investigate”: available only with an admitted alternate route, fuel sufficiency and visible contract risk. A new path changes the estimate and relevant terms.

In the main branch the player chooses continue. Resolve its immediate receipt and D narration; cruise resumes at tick 360. Time held for response earns no travel under the first solo policy. The station cannot mark the shipment delivered just because sixteen wall hours have elapsed since departure.

## CG-04: cancel, pause or leave the bridge

Alternative branch at tick 360: cancel delivery/travel. Thirty-six units of fuel already consumed do not return; cargo stays on S; current position is the route position, not the departure station. Returning needs a separately admitted route and enough fuel. Cancelling the contract may have a supported penalty; none may be invented by the next paragraph.

Pausing a solo campaign instead preserves the current plan and stops its permitted clock. Leaving the bridge suspends a pilot role, not necessarily autonomous ship movement. These examples expose why work and participation must differ; a single boolean `character.isBusy` cannot express them honestly.

If autopilot and pilot both claim exclusive ship control, allocation must reject the overlap or represent a supported handoff. Another actor may perform maintenance concurrently only when its requirements/capacity permit it. No free contribution occurs merely because a crew name exists in the scene.

## CG-05: arrival is not yet payment

At tick 960, after sixteen segments, fuel is zero under the fixture and the ship is at the destination with cargo still aboard. Arrival commits once. A separate accepted handover checks cargo identity/condition and recipient authority, transfers it and grants the contract's illustrative 12 credits once. If handover is assured by accepted terms it can be automatic; no compulsory die roll is needed just to lengthen the scene.

If cargo was lost during a supported encounter, reaching the station must not pay the delivery as if it survived. Nor may a generated celebratory report create a replacement shipment. Contract fulfillment and travel completion are different predicates.

The ending can be factual, generated report-only, or interactive negotiation under a selected policy. A late report uses the arrival snapshot and cannot move the ship back after another departure.

Cost after plan admission: quiet cruise/handover Q; one distress scene and one response E + D; optional arrival report R separately. The ship becomes valuable through persistent location, costs, ownership and remembered choices—not by receiving a new dramatic description every hour.
