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

- Current phase and exact next action: X2; implement one budget-sharing invalid-final repair, then connect the accepted final candidate to ordinary generation completion without creating a second inference.
- Base/reviewed Git revision and relevant uncommitted changes: base `6eb0156`; terminal provider-round failures now invoke the same idempotent liability-free operation closure before artifact failure persistence. This closes a confirmed-unsent authority denial after its reservation is released, while rejected review has no operation to close and known provider failure is already complete. Review rejection and authority denial retain the exact request/classification and replay without provider transport.
- Actual checks/results for this revision: targeted formatting, application build and API-integration typecheck pass. The focused disposable-database fake-provider case now passes rejected held review with zero attempts/calls and confirmed-unsent authority denial with a zero charge, zero reservation and completed operation. Existing hold/release, success, known-failed, stale-root closure and uncertain replay assertions still pass. No provider call occurred.
- Unresolved findings/blockers: normal generation execution does not promote the stored final candidate into generation output/publication. The first facade implementation maps evidence questions to lexical search and possibility questions to one broad-discovery route; evaluated adaptive routing remains later work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Invalid-final repair remains X2.
- Provider spend and accounting certainty: $0; no provider call.
