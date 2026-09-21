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

- Current phase and exact next action: X3; compare minimal and balanced request/evidence traces at the same Greywake checkpoint, then run the abstract-world no-human-default contrast before considering a deliberately authorized free model.
- Base/reviewed Git revision and relevant uncommitted changes: base `65be069`; the conventional reusable-start journey now sends its admitted return task through the normal two-round memory executor and ordinary publication fence.
- Actual checks/results for this revision: the affected twelve-package integration build passes, the disposable database reset/migration succeeds, and the focused conventional-start case passes 1/1. Its deterministic fake provider asks one ordinary-language evidence question, receives the current collapsed-road/cliff-stairs evidence rather than obsolete route text, publishes that correction, records two model rounds/one retrieval round/positive request sizes/at least one evidence item, and settles zero microusd. No external provider call occurred.
- Unresolved findings/blockers: balanced-versus-minimal trace comparison and the abstract-world connected contrast remain. The first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. The deterministic provider proves mechanics, not cheap-model comprehension or taste.
- Provider spend and accounting certainty: $0; no provider call.
