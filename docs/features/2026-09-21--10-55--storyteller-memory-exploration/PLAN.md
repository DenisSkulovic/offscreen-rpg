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

- Current phase and exact next action: X2; exact review/reservation/transport now share one per-dispatch request and generated-token ceiling. Connect the exploration controller's persisted attempt identity to reservation/settlement with response-before-settlement recovery, then add its one budget-sharing invalid-final repair.
- Base/reviewed Git revision and relevant uncommitted changes: base `bbd538c`; each scripted model round persists a UUID attempt ID, exact captured request/hash and raw response in the generation-owned exploration artifact before interpretation. Dispatch review rows and append-only decisions are attempt-owned rather than generation-singleton, and the provider adapter now accepts the same bounded dispatch specification used by accounting. Existing one-shot callers retain their operation-wide default. The conversational `ask_memory`/`read_memory` contract remains unchanged.
- Actual checks/results for this revision: Storyteller and application builds pass; all 35 Storyteller tests pass, including an injected transport assertion that the reviewed per-dispatch generated-token ceiling is the one serialized onto the wire. The preceding baseline, held-packet/release and crash/replay checks remain the latest persistence evidence. No provider call occurred.
- Unresolved findings/blockers: budget reservation/settlement does not yet run inside the exploration controller using the persisted round identity, so live multi-round transport remains disabled. Normal generation execution also does not promote the stored final candidate into generation output/publication. A provider response and its settlement will need one consistent recovery boundary; an ambiguous transport must retain liability rather than redispatch. The first facade implementation maps evidence questions to lexical search and possibility questions to one broad-discovery route; evaluated adaptive routing remains later work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Invalid-final repair remains X2.
- Provider spend and accounting certainty: $0; no provider call.
