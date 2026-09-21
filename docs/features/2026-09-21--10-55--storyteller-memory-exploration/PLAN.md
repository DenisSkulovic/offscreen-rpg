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

- Current phase and exact next action: X3 structural evidence is complete. Live memory evaluation remains dependent on the conservative evaluation feature's provider-output compatibility slice. The final permitted `storyteller.v6` opening probe kept meaningful prose and the correct `scene.next` placement, but nested all three required root arrays inside `scene`; prompt iteration is stopped. The new compact validation diagnostic is verified offline. Decide whether to reject this model/route or design one explicitly bounded repair operation before attempting conventional and abstract memory questions.
- Base/reviewed Git revision and relevant uncommitted changes: base `37e7403`; the reusable-start journey compares minimal and balanced retrieval at one Greywake root and runs an admitted abstract pending-consequence task through the normal two-round executor without mutating the workflow-owned generation. The current slice also repairs dispatch-review locking discovered by the live-evaluation prerequisite.
- Actual checks/results for this revision: the affected twelve-package integration build passes, disposable database reset/migration succeeds, and the focused abstract and conventional cases each pass 1/1. Balanced Greywake retrieval returns additional optional same-root leads while preserving the exact path/authority/visibility prefix seen by minimal retrieval and excluding developer-private content. The abstract provider asks one ordinary-language membrane question, receives the authored slowing-exchange fact, produces a nonhuman result without person/tavern/wage/calendar/quest defaults, and records two model rounds/one retrieval round. No external provider call occurred.
- Unresolved findings/blockers: the first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. The deterministic providers prove mechanics, not cheap-model comprehension or taste. The previously noted replay mismatch did not reproduce in the exact isolated controller case; the broad run is classified as harness/workflow interference unless a narrow reproduction proves otherwise. Three post-X3 free opening probes all failed local validation for different output-shape reasons, so another live call before choosing a compatibility/repair policy would not test memory.
- Provider spend and accounting certainty: three verified-free OpenRouter calls occurred in the shared live-evaluation prerequisite. All settled at zero microusd with matched ledger calculations and unchanged before/after provider credit snapshots; no memory-model call occurred.
