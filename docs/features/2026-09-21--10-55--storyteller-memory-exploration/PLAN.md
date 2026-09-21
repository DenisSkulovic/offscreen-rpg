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

- Current phase and exact next action: X2; compose the existing budget with the controller's new persisted-delivery settlement seam, including held, unsent, known failed and uncertain outcomes, then add its one budget-sharing invalid-final repair.
- Base/reviewed Git revision and relevant uncommitted changes: base `32c3e30`; each model round persists a UUID attempt ID, exact captured request/hash and a normalized delivery containing JSON output plus optional settlement evidence. An idempotent settlement hook runs only after that delivery exists and is repeated from it after a crash without another source call. Dispatch review rows and decisions are attempt-owned, and provider review/reservation/transport share one request plus generated-token ceiling. The conversational `ask_memory`/`read_memory` contract remains unchanged.
- Actual checks/results for this revision: the application build and focused start-package integration pass after rebuilding all compiled dependencies and applying the disposable baseline. The case crashes once inside the settlement hook and once after the canonical request is saved; recovery invokes the first model source once, invokes its idempotent settlement twice from the saved delivery, completes the read, and produces/replays one final candidate. No provider call occurred.
- Unresolved findings/blockers: the actual budget adapter does not yet run through the persisted-delivery hook, so live multi-round transport remains disabled. Its composition must also close an operation when an already-settled intermediate round is followed by a terminal canonical-read failure; the current budget API has no standalone idempotent operation-close method. Normal generation execution does not promote the stored final candidate into generation output/publication. An ambiguous transport must persist a non-retryable delivery/classification and retain liability rather than redispatch. The first facade implementation maps evidence questions to lexical search and possibility questions to one broad-discovery route; evaluated adaptive routing remains later work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Invalid-final repair remains X2.
- Provider spend and accounting certainty: $0; no provider call.
