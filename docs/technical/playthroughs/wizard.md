# Wizard, apple and companion: strange fiction, precise authority

Companion to the mountain/haunted-house [product playthrough](../../playthroughs.md). This is predominantly **target**, not a claim that the current narrative fixture implements authoritative transformation, containment or multiplayer. The narrative-only prepared-arrival path must not be confused with these mechanics.

## WZ-01: agree a premise and a first intention

Opening example:

> The pass bends toward the old house. Your companion adjusts their pack. A little farther up, someone is whistling behind a stone wall.

Choices: take the pass, ask the companion about another route, or remain here. The profile permits whimsical, nonlethal surprises for this fixture. That is not permission for arbitrary permanent loss or for one player to control the other's character.

For reproducibility, assume both players agree to travel. How competing intentions are collected remains open; this assumption cannot become an implicit “party leader controls everyone” implementation. Fixture clock: one tick = one fictional minute, one tick per real minute. Accepted journey requires 120 route units at one per eligible tick. The haunted house is not reached by selecting its name.

At tick 30, a scheduled encounter boundary stops the journey at 30/120. No model calls occurred during the first thirty travel ticks. The accepted occurrence policy supplies a candidate/context for the goblin scene; preparation alone does not establish the goblin in published chronology.

## WZ-02: the goblin's offer

Admitted scene:

> A goblin sits on the wall with an apple in one hand and a pear in the other. “For the road,” he says, and offers you the apple first.

Public options might be take the apple, ask why he is so generous, decline and keep distance, or try a supported hostile action. Do not display an attack option unless the selected rule subset can resolve its stated stakes. A fixture can omit it without claiming general combat is done.

Private terms for “take the apple” must be captured before the click. This fixture admits an immediate magical transformation as an assured selected outcome; no d20 is needed merely to make the choice feel game-like. The accepted campaign risk profile and visible warning should make bizarre magical consequences fair without revealing every surprise. The boundary between enjoyable surprise and arbitrary punishment needs owner evaluation.

## WZ-03: tiny, inside the apple, right now

Selection at tick 30 atomically applies the supported transformation and containment relation, then consumes the offer. Target state:

```text
wizard form: tiny; applicable capabilities revised by admitted rule
wizard containment: inside apple A, near its seed
apple A holder/location: goblin at route position 30
companion: outside apple, at the encounter location
journey: 30/120, held; not completed by the scene change
```

No five-minute activity is manufactured for an instantaneous magical change. The D task receives the already committed transformation and describes it:

> The apple's skin curves over you like a red ceiling. Beyond it, the goblin's voice is enormous. Your companion is somewhere outside.

Current limitations: character applicability is represented, but the runtime has no admitted capability-changing transformation or general containment/possession model. Writing `tiny=true` alone would not make tools, available actions, reach, movement or context consistent. This is why the example is an architecture stress case, not the next coding scope.

## WZ-04: a real wait and a possible effort

Target offer:

| Choice | Resolution family | Important distinction |
| --- | --- | --- |
| Wait and listen for up to two hours | Clock wait of at most 120 ticks | No roll needed to wait; stops earlier for an admitted event |
| Bore a small opening with an applicable spell | Contribution or immediate magic, according to the admitted spell | Cannot assume a human-sized wand or unchanged spell access after transformation |
| Call to the companion | Supported immediate communication/check | Hearing through apple skin may be uncertain; success does not teleport anyone |

The main branch selects wait at tick 30. It is bounded by a scheduled hazard at tick 90, not guaranteed to complete at tick 150. At ticks 31–89 the model is not polled for “anything yet?” A chosen environmental sensing check could produce a factual observation, but an uneventful wait need not invent rolls.

At tick 90 the admitted hazard establishes that the goblin is about to bite the apple, not that the wizard has already been swallowed or killed. A required scene holds the relevant solo/scene progression pending response. The deadline policy, if any, is real response time from publication; it is not the 60 remaining wait ticks.

Scene options must be genuinely feasible from inside: an applicable protective spell, a supported attempt to attract attention, or another grounded action. “Step aside from the goblin” is invalid while contained. A failed check preserves its committed stakes; narration cannot secretly substitute a rescue because it would be more entertaining.

## WZ-05: the companion changes the same world — alternate branch

At world tick 70, before the bite, the companion takes the apple with an admitted Dexterity check. Fixture draw 13 + 2 = 15 versus DC 12 succeeds. The transaction changes A's holder to companion. The wizard remains inside the same A; they do not become a copied character in another scene.

This invalidates the goblin-bites-held-apple precondition at tick 90. A previously prepared bite scene becomes stale and cannot publish. The wizard's location/context follows the container relation, so the companion walking away moves the apple and its occupant without the wizard performing a walking activity.

If the companion instead cuts the apple, the rule must account for its occupant and captured risk before offering the action. It cannot treat the apple as a disposable ordinary inventory item and delete the wizard indirectly. Generic relation identity, capability applicability and supported effects matter more here than a bespoke “apple module.”

For an initial domain proof, a controlled second actor's admitted command can demonstrate this ordering. Actual simultaneous players require membership, control, scene-clock and conflict policies first. The example does not choose those policies by accident.

## WZ-06: simultaneous rescue and bite

If both commands reach the same tick/revision, serial application order alone is insufficient as a product explanation unless the chosen campaign rules explicitly make it the resolution policy. Need a declared rule for priority, simultaneous intent or a bounded contest. This remains open.

Regardless of the selected rule, use one authoritative entity/containment state and receipt history; reject stale actions or settle the contest once. Do not let two separate generated scenes each claim an incompatible holder. Never let model latency choose the winner of a player race.

Pause also needs scope: the first solo campaign can freeze everything relevant, but one player in a shared story cannot be presumed able to freeze the companion indefinitely. The first POC may omit this multiplayer branch; the design must preserve the distinction rather than certify it using a single-player pause test.

## WZ-07: return and continue toward the house

Once escape/reversion is admitted, the restored character's capabilities and current position determine the next offers. A recap can say “You waited for forty minutes before your companion took the apple,” drawn from receipts, with no model required. The interrupted journey resumes only if its terms and current route position still make sense; being carried elsewhere may require a revised journey, not restoring the old cursor blindly.

One nominal branch with opening, goblin event, transformation consequence, bite event and one resolved response costs O + 2E + 2D: 26k–52k input, 4.6k–10k output under the planning envelopes, excluding exploration/retries. Waiting adds Q. The companion branch replaces the bite branch rather than being billed on top of it in every session.

This example defends the abstraction only if impossible options stay impossible, another actor's action actually matters, and a magical instant is not confused with prolonged work. It does not require implementing the entire example before a useful solo POC exists.
