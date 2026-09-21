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

- Current phase and exact next action: X2; give each accepted private request a stable round/request identity so delivery after a crash reuses its stored result rather than repeating reads, then make exhaustion and stale-root outcomes durable.
- Base/reviewed Git revision and relevant uncommitted changes: `c316cdf`; X1 adds the generation-owned exploration artifact, final-round controller, final-candidate replay, baseline schema update, focused database-backed integration path, QA catalogue version 15 and maintained technical traces.
- Actual checks/results for this revision: database, application and API-integration TypeScript builds pass. The focused disposable-database start-package case passes: the existing provider-free Greywake path exercises real canonical search/source reads, while the new integration path stores a private round, accepts a final candidate and returns it on re-entry without invoking its source again.
- Unresolved findings/blockers: normal generation/provider execution does not yet feed exploration rounds or promote the stored final candidate into generation output/publication. A crash between a read and artifact update may recompute read-only work; duplicate request reuse, durable exhaustion/stale-root outcomes and invalid-final repair remain X2.
- Provider spend and accounting certainty: $0; no provider call.
