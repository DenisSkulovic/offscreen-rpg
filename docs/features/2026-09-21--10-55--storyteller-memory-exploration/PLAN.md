# Implementation plan

Feature: [Bounded Storyteller memory exploration](FEATURE.md).
Execution scope: approved provider-neutral persisted exploration; provider dispatch still follows existing spending authority.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### X1 — Protocol and scripted round trip — completed

- Outcome: result union distinguishes `needs_context` from final publication; task recipes declare supported operations and cumulative limits. The provider-facing contract exposes `ask_memory` with at most two ordinary-language questions plus optional `read_memory` handles. Backend-shaped operations remain dispatcher primitives, not model-facing cognitive overhead.
- Owners: Storyteller task/result schemas and prompts; application execution/admission/recovery; existing canonical read/search operations.
- A context request publishes nothing. Validate task-local handles, authorization, visibility and captured root before dispatching reads.
- Return compact grouped findings with stable handles, source/coverage status, truncation and correctable empty/error states. Do not make the model select ranking algorithms, indexes, file families or backend filters that application policy can select deterministically.
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

- Current phase and exact next action: X2; persist deterministic per-round attempt/review identity, then add the single budget-sharing invalid-final repair path before normal provider connection.
- Base/reviewed Git revision and relevant uncommitted changes: base `1c4ba99`; the model-facing protocol and canonical dispatcher now accept at most two ordinary-language `ask_memory` evidence/possibility questions plus `read_memory` over explicit `m#` current-record and `x#` exact-source handles. Packet-local `s#` values remain provenance citations, avoiding an ambiguous dual use. Backend operation and lens choices remain internal trace details.
- Actual checks/results for this revision: Storyteller, application and API-integration TypeScript builds pass; focused Storyteller schema and provider-free long-story dispatcher tests pass 1/1 each. The disposable-database crash/replay controller case also passes 1/1 through the conversational request contract. No provider call occurred.
- Unresolved findings/blockers: normal generation/provider execution does not yet feed exploration rounds or promote the stored final candidate into generation output/publication. The first facade implementation maps evidence questions to lexical search and possibility questions to one broad-discovery route; evaluated adaptive registry/semantic/relational routing remains later work. A crash after a read but before snapshot commit may recompute the same read-only lookup without double-counting it. Invalid-final repair remains X2; stale-root and invalid-handle classification are implemented but lack controller-level integration assertions.
- Provider spend and accounting certainty: $0; no provider call.
