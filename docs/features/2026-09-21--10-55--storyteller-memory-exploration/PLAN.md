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

- Current phase and exact next action: X2; add standalone idempotent operation closure for a terminal post-settlement canonical-read failure, cover confirmed-unsent/rejected review states, then implement one budget-sharing invalid-final repair.
- Base/reviewed Git revision and relevant uncommitted changes: base `5ac77b5`; memory artifacts now distinguish resumable `held`, terminal `failed` and liability-retaining `uncertain` states. A review hold retains the exact attempt/packet and can resume after the owner-scoped release control; the control now recognizes a generation's pending memory-round attempt rather than only its one-shot attempt. Provider refusal/invalid output retains the saved delivery after known settlement, and ambiguous transport retains request/delivery evidence without redispatch. Replayed stop states return the same classification. The conversational `ask_memory`/`read_memory` contract remains unchanged.
- Actual checks/results for this revision: targeted formatting plus database/application builds and API-integration typecheck pass. The focused disposable-database fake-provider case passes for held review, exact release, successful settlement, operation completion, known invalid-output failure retaining its settled delivery, uncertain delivery retaining its liability/evidence, and no-call replay of every terminal outcome. No provider call occurred.
- Unresolved findings/blockers: confirmed-unsent authority/budget denial and rejected review use the same durable classifier but lack focused database assertions. An already-settled intermediate round followed by terminal canonical-read failure still needs a standalone idempotent operation-close method. Normal generation execution does not promote the stored final candidate into generation output/publication. The first facade implementation maps evidence questions to lexical search and possibility questions to one broad-discovery route; evaluated adaptive routing remains later work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Invalid-final repair remains X2.
- Provider spend and accounting certainty: $0; no provider call.
