# Decision E-D01 | First engine code must make another consequence real

**Status:** selected design direction; code not authorized. **First recommended slice:** [ENG01](../../changes/2026-11-13--eng-authoritative-item-transfer/CHANGE.md). **Next major product proof:** [ENG02](../../changes/2026-11-13--eng-optional-actor-capabilities/CHANGE.md). Source baseline main a313d0aa, Nov 13 2026.

## Start with a player's life, not package names

A player attempts to **give a trusted person their unique brass compass**. Time passes; a possible check can fail. If the attempt legitimately succeeds, the possession changes once and later scenes must remember it. That consequence needs to be real even when the Storyteller cannot prepare the next passage.

The code already supports item creation and transfer in the *narrative continuation* path through `packages/application/src/stories/persistence.ts::applyStoryItemEffects`, which updates the SQL `story_item` registry. Mechanical outcomes, however, currently use `packages/game/src/effects.ts` with `quantity.change.v1` and `fact.set.v1` on `Character`. This split is the first extension seam to address. **Do not create a new inventory beside the old one.**

## Why this change wins over the alternatives

| Candidate first move | Product evidence | Risk | Decision |
| --- | --- | --- | --- |
| Mechanically admitted unique item transfer, using existing registry | A real, timed/check-based action changes the world and stays changed | Moderate; crosses rule + SQL + receipt + Storyteller output seams | **Select first** |
| Remove mandatory HP/D&D character shape immediately | A microbe or bodiless mind exists without invented statistics | Broad and migration-heavy: Character is embedded in tasks, actions, reads, pending work | **Second, separate** |
| Move canonical I/O outside story lock | Reduced contention | Needs versioned capture and release semantics, no immediately new gameplay | Important, measure and implement independently |
| Build universal ECS/plugin system | Abstract flexibility | High complexity without a single novel player outcome | Reject for now |
| Optimize historical reads | Faster ancient stories | Narrow independent query improvement | May follow metrics or separate safe maintenance |
| Start generalized autonomy | Offscreen life | Consent, cost, actor and clock semantics still need proof | Later |

The game goal is broad, not item-centric. A unique possession transfer is a **small test of compositional authority**, not an inventory-first product roadmap.

## Two worlds, same rule semantics

**Harbor person:** “Hand Mara the brass compass.” The player has the item. The attempted transfer is admitted with a positive finite fictional duration. The item must **not** move on button click. At the due boundary, all controlling events, actual ownership and check results must be evaluated. If successful, the existing `story_item` row changes holder; the action records one source-linked effect/receipt; published narration may acknowledge it later. A duplicated command, dropped ACK or provider failure cannot duplicate or reverse the change.

**Abstract signal world:** two distributed minds can pass a **unique logical signal token**. No hand, backpack, gold, health or coordinates are intrinsic to the *ownership rule*. The existing character schema may still be imperfect during this fixture; this case proves the transfer rule is semantically neutral, **not** that all actor representations have already been generalized.

**Negative case:** if the token or compass has changed holder before the due boundary, the transfer must not take place. The engine preserves legitimate elapsed time and records a blocked/interrupted outcome under an explicit rule, not silently declares success or rerolls for free.

## Exact philosophy for ENG01

- **One canonical registry:** reuse `story_item` and its story-scoped item ID and holder CAS predicate.
- **One legitimate effect:** a versioned mechanically admitted item transfer. No new crafting, trading, arbitrary creation or new entity database.
- **No transfer at admission:** mechanical result is settled once at its earned fictional time, with current holder/offer/rules revalidation.
- **No unsafe early prediction:** today's speculative digest covers character, story facts and time, not item ownership; item-changing effects must be excluded from that optimization.
- **No silently ignored effects:** `applyOutcomeEffects(Character, ...)` must not parse an item transfer and then drop it. Introduce an explicit small character-effect/world-effect split where necessary.
- **Single semantic owner:** current narrative `item.transfer.v1` and new mechanical transfer share validation/transaction semantics, not two divergent holder rules.
- **Safe backwards compatibility:** old narrative and mechanical receipts must decode and behave identically. New effect kind can be additive if all previous payload meanings remain unchanged; bump plan envelope version only if its semantics actually change.
- **No paid Storyteller dependency for first proof:** one scripted fixture and real rule/DB/receipt tests; future generated item actions require separate output validation and evaluation.
- **No browser or global actor redesign:** the first engine Change stays behind current public DTO; UX design is separately owned by Cursor.

## Compatibility and stopping rules

A single registered holder key is **not yet a secure actor identity**. ENG01 uses stable predeclared story-local holder keys, no automatic user-control grant. The later [actor identity](actor-identity-and-ownership.md) contract solves controller permissions, containment and named entities.

Before any code, Cursor must inspect the exact action/outcome schemas, test fixture ownership, settlement transaction and old narrative transfer behavior. If this requires inventing a universal entity model, mass-migrating `Character` or rewriting Storyteller provider contracts, **stop and return to the architect** rather than quietly broadening the Change.

## Definition of meaningful proof

1. Finite attempted transfer spends **admitted** time before changing holder.
2. A failed or interrupted attempt does not confer the object.
3. A success changes one existing SQL item row once and creates an inspectable receipt.
4. Replay of the action and worker delivery does not transfer twice or roll twice.
5. An unavailable Storyteller cannot undo or fabricate the transfer.
6. Old narrative item.create/transfer remains valid and idempotent.
7. Both the harbor object and abstract token scenarios use one transfer implementation.
8. The UI's current safe public projection can reflect actual holder without exposing private plan data.
9. Old accepted work and receipts survive the additive change.
10. No provider spend or destructive tests are needed for initial verification.

**This earns one new kind of consequence.** General body-free actors, player-authored intentions and large shared worlds still require their own proofs.
