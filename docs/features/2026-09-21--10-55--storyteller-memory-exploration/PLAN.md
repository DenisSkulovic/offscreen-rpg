# Implementation plan

Feature: [Bounded Storyteller memory exploration](FEATURE.md).
Execution scope: approved provider-neutral persisted exploration; provider dispatch still follows existing spending authority.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### X1 — Protocol and scripted round trip — completed

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

- Current phase and exact next action: X2; add the single budget-sharing invalid-final repair path, then exercise stale-root and invalid-handle classifications through the real canonical dispatcher.
- Base/reviewed Git revision and relevant uncommitted changes: `526ac3f`; X2 now persists stale-root, invalid-handle, read-limit and round-limit terminal outcomes, replays the same code without another decision, and updates QA catalogue version 17.
- Actual checks/results for this revision: database, application and API-integration TypeScript builds pass. The focused disposable-database start-package case passes after an injected post-request/pre-read crash: recovery executes the stored request, calls the scripted source only for the later final round, stores the final candidate and replays it on re-entry.
- Unresolved findings/blockers: normal generation/provider execution does not yet feed exploration rounds or promote the stored final candidate into generation output/publication. A crash after a read but before snapshot commit may recompute the same read-only lookup without double-counting it. Invalid-final repair remains X2; stale-root and invalid-handle classification are implemented but lack controller-level integration assertions.
- Provider spend and accounting certainty: $0; no provider call.
