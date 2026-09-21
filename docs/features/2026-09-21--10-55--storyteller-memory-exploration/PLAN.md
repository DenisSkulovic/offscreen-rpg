# Implementation plan

Feature: [Bounded Storyteller memory exploration](FEATURE.md).
Execution scope: approved provider-neutral persisted exploration; provider dispatch still follows existing spending authority.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### X1 — Protocol and scripted round trip — protocol and canonical reads implemented

- Outcome: result union distinguishes `needs_context` from final publication; task recipes declare supported operations and cumulative limits.
- Owners: Storyteller task/result schemas and prompts; application execution/admission/recovery; existing canonical read/search operations.
- A context request publishes nothing. Validate task-local handles, authorization, visibility and captured root before dispatching reads.
- Exit: scripted search + registry batch, exact source follow-up and final result persist and replay without a provider. Status: follows E1 and L1 contracts.

### X2 — Context lifecycle and recovery

- Outcome: deduplicated retained evidence, explicit dropped/loaded status, saved round artifacts, deadline/allowance exhaustion and stale-root recovery.
- Independent reads batch; repeated normalized reads reuse artifacts; the final-answer reserve cannot be consumed by optional exploration.
- Checks: loop attempt, malformed request, unavailable source, partial index, crash after reads, duplicate delivery and final invalid-output repair.
- Exit: recovery never repeats accepted mechanics, loses accounting or silently changes evidence.

### X3 — Connected return and configurable recipes

- Outcome: Greywake and abstract-world turns exercise no-tool, minimal retrieval and richer bounded recipes through ordinary task construction.
- Capture section sizes, search/read reasons, omission, rounds, latency and attributable spend.
- Exit: the same canon yields appropriately bounded working sets across cost postures and owner inspection shows exactly what was used.

## Current checkpoint

- Current phase and exact next action: X1; wrap the canonical dispatcher in a scripted round controller that reserves/finalizes the last round and stores its snapshot through a durable application artifact.
- Base/reviewed Git revision and relevant uncommitted changes: `d1214a4`; canonical dispatcher, snapshot/replay path, focused Greywake flow and documentation are uncommitted.
- Actual checks/results for this revision: Storyteller/application builds and the focused 200-scene memory test pass. The scripted flow batches search plus registry, snapshots/restores, then batches exact current-favor inspection with its original source read and records four reads across two exploration rounds without provider access.
- Unresolved findings/blockers: snapshots are serializable values but are not yet saved in the generation/application store; no controller currently enforces final-round reservation or accepts a final Storyteller result. Duplicate request reuse and crash recovery remain X2.
- Provider spend and accounting certainty: $0; scripted implementation first.
