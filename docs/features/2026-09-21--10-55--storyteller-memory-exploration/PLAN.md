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

- Current phase and exact next action: X3 structural evidence is complete; design one deliberately bounded, explicitly authorized free-model probe that reuses the conventional and abstract questions and preserves the same retrieval/assembly/generation-use separation.
- Base/reviewed Git revision and relevant uncommitted changes: base `a09ff0b`; the reusable-start journey now compares minimal and balanced retrieval at one Greywake root and runs an admitted abstract pending-consequence task through the normal two-round executor without mutating the workflow-owned generation.
- Actual checks/results for this revision: the affected twelve-package integration build passes, disposable database reset/migration succeeds, and the focused abstract and conventional cases each pass 1/1. Balanced Greywake retrieval returns additional optional same-root leads while preserving the exact path/authority/visibility prefix seen by minimal retrieval and excluding developer-private content. The abstract provider asks one ordinary-language membrane question, receives the authored slowing-exchange fact, produces a nonhuman result without person/tavern/wage/calendar/quest defaults, and records two model rounds/one retrieval round. No external provider call occurred.
- Unresolved findings/blockers: the first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. The deterministic providers prove mechanics, not cheap-model comprehension or taste. The unfiltered start-package run also exposed an unrelated controller replay failure (`pending model request mismatch`) outside these two passing focused cases; do not treat it as evidence from this slice or lose it before the controller is next touched.
- Provider spend and accounting certainty: $0; no provider call.
