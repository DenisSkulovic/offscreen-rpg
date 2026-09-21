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

- Current phase and exact next action: X3 now has both credential-free packet inspection and an explicit supervised live-memory path. `pnpm chamber:memory-evaluation-run -- --config=... --authorize=<id>` can release at most two separately manifested reviews under one zero-microusd operation, requiring fresh route verification and matched zero settlement after each round before advancing. Next obtain a fresh verified-free configuration, run the credential-free packet command against the local stack, inspect its exact request/manifest, and only then execute one deliberate live run under the same still-current route snapshot.
- Base/reviewed Git revision and relevant uncommitted changes: base `78c2393`; the current slice generalizes the memory manifest to one exact attempt, adds live supervision/reporting helpers and wires the explicit command. It does not change retrieval or publication logic.
- Actual checks/results for this revision: contracts and application builds pass, Chamber typecheck passes and all five focused live-evaluation contract tests pass. The new live command was not executed, so its database/runtime orchestration remains structurally checked rather than integrated. No external provider call or reservation occurred.
- Unresolved findings/blockers: Gate 0 intentionally creates a developer evaluation generation rather than a published playable story. The live supervisor is not yet exercised against PostgreSQL, Temporal and OpenRouter; a fresh route snapshot and packet inspection are prerequisites. The first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Deterministic providers prove mechanics, not cheap-model comprehension or taste.
- Provider spend and accounting certainty: four verified-free OpenRouter calls occurred in the shared live-evaluation prerequisite. All settled at zero microusd with matched ledger calculations and unchanged before/after provider credit snapshots; no memory-model call occurred.
