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

- Current phase and exact next action: X3 structural evidence is complete and the shared one-round provider-output blocker is resolved. `storyteller.v7` aligned the lean opening prompt/schema and one freshly verified free call produced a valid meaningful opening at matched zero charge. Extend the developer evaluation launcher to capture one of the existing conventional or abstract memory-exploration tasks and complete its Gate-0 packet/allowance/report path without dispatch; do not invent a second controller or start live memory inference from a synthetic prompt.
- Base/reviewed Git revision and relevant uncommitted changes: base `ca9e49f`; the reusable-start journey compares minimal and balanced retrieval at one Greywake root and runs an admitted abstract pending-consequence task through the normal two-round executor without mutating the workflow-owned generation. The current working slice aligns the shared opening prompt/provider schema as `storyteller.v7`; it does not change memory execution.
- Actual checks/results for this revision: Storyteller build and all 36 tests pass. The credential-free Chamber path built all 12 packages, reset its disposable database and held the exact v7 packet with zero attempts. One subsequent verified-free opening succeeded with a valid diagnostic and matched zero charge. Earlier focused abstract and conventional cases each pass 1/1: balanced Greywake retrieval adds optional same-root leads while preserving the exact path/authority/visibility prefix seen by minimal and excluding developer-private material; the abstract deterministic provider asks for and uses the membrane fact without human defaults.
- Unresolved findings/blockers: the live evaluation launcher currently captures only its opening/short-loop path, not an existing ordinary memory-exploration generation, so a live memory call would require synthetic wiring or bypass the reviewed packet boundary. The first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Deterministic providers prove mechanics, not cheap-model comprehension or taste.
- Provider spend and accounting certainty: four verified-free OpenRouter calls occurred in the shared live-evaluation prerequisite. All settled at zero microusd with matched ledger calculations and unchanged before/after provider credit snapshots; no memory-model call occurred.
