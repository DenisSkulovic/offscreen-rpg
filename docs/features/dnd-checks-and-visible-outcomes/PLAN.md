# D&D and storyteller repair checkpoint

## Current checkpoint

**Blocking correction:** the owner reaffirmed tick-based simulation and a properly designed tag system. The prior repair still violates both boundaries. Its millisecond game clock, hourly public/legacy fields, global `surprises`/`emphasis` enums and identity/description-only tags are not accepted architecture. Follow [Tick and tag contracts](../../technical/ticks-and-tags.md) before further implementation. The required tick/tag correction has not been implemented; do not report this slice as architecturally repaired.

- Authorized: owner requested implementation of the audit fixes on 2026-09-18.
- Base: `ae9d144`. The owner authorized review, edits, commit and push. Publish this work as an unfinished development checkpoint on `codex/mechanical-runtime-checkpoint`; it is not approved for integration into `main`.
- Implemented: captured action content, explicit opening source selection, declared fact effects, content-defined skills, shared immediate/timed resolver, independent check schedules, constrained offers and connected consequence narration through the existing execution/publication/retry machinery.
- Removed: core work/fish/coast/cross semantics, mandatory location, special profile/tag voice branches, Start-time scenario inference and instant timed-action shortcuts.
- Persistence: new nullable content migration 0017 generated, not applied. Old prototype records are retained for inspection with an explicit unsupported notice; no database reset or historical plan rewrite.
- Review: traced action admission, clock settlement, consequence publication/retry, snapshot reads, migrations and UI wiring. Fixed Start retries silently accepting changed creation lock/pace; corrected a narrative preference labelled as mechanical encounter frequency; put the package type export before its runtime fallback. Tick/tag blockers remain unresolved. No builds, tests, lint or runtime playthrough. Migration generation produced a file; it did not connect to the database or apply SQL.
- Provider spend: $0. Cumulative account usage unverified. Live inference remains disabled.

## Delivered boundary

The implementation contract is maintained in [Rules and activities](../../technical/rules-and-activities.md). Mechanical action admission captures data, checks prerequisites and records commitment. The worker resolves due checks/effects. Terminal outcomes queue a separate consequence task with mandatory receipts and captured creative context. Narration uses the same offline/provider runner, ledger, generation records, notes, revision fences and recovery as other storyteller tasks. Failed narration cannot reroll an action.

Selected content owns the character, facts, opportunities, checks and prose. The executor never interprets an action, world or profile name. Both selectable examples use the same application path. SpongeBob begins with persuasion/cover under an explicit threat; the microbe responds over ten seconds with no currency or geography. Their consequences change declared facts. A pilot's interruption and a wizard's containment fit the same schedule/fact prerequisites without adding executor branches; those are design traces, not delivered scenarios.

The six D&D abilities and HP remain selected ruleset data. Fact/quantity effects are supported primitives, not a promise of general physics. A zero-duration action is explicit; every positive duration obeys the clock. Schedule ordering is captured, and an interrupt stops later checks and completion rewards. Batches are bounded separately from fictional duration.

## Remaining feature work

The original four features remain partial. This repair establishes a connected authored mechanical slice; it does not complete arbitrary generated play.

First implement the tick/tag contract above. Also separate narration preparation failure from mechanical settlement: context assembly currently occurs inside the effects transaction, so an oversized context can roll back an otherwise valid outcome instead of retaining it behind a narration hold. The present fixtures are small, but the broader contract must handle that failure explicitly. Start recovery after a subsequent storyteller switch also still compares the mutable current profile in generic initialization; recovery should compare the captured creation identity.

1. Add a bounded opportunity/adjudication task for generated situations. Inputs should include relevant authoritative facts, capabilities, evidence and allowed effect vocabulary. Validate proposals into the existing action-content contract. Do not expand the consequence narrator into a monolithic DM or let prose grant effects.
2. Expand authored content beyond the microbe example with its independent environmental interruption and follow-up wait. Route resumption is currently a new intention, not automatic continuation of the old plan. Secret encounter disclosure and richer event tables remain unimplemented; the current event rule uses a captured d20 threshold separate from ability success.
3. Improve opportunity composition beyond six captured leaf actions and fact conjunctions. Preserve zero/one/many outcomes and finite menus without invented filler or unsupported commitments.
4. Exercise the connected preview → action → time → receipts → narration/retry path when the owner elects to run the application. Checks remain optional; no broad test campaign is a completion ritual.

Do not describe tags, model style fidelity or arbitrary-world improvisation as working merely because their data reaches a prompt. The offline narrator intentionally repeats the saved outcome summary. The owner has not authorized live evaluation.

