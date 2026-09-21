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

- Current phase and exact next action: X3 structural evidence, multi-round accounting and the credential-free live-memory packet path are complete. `pnpm chamber:memory-evaluation-packet -- --config=...` now applies the captured verified-free authority to the real Greywake Gate-0 task, rejects any admitted allowance drift, preflights the exact held attempt and writes its manifest without credentials or transport. Next implement the separate explicit live-run/reconciliation path: first-round release, bounded deterministic read when requested, second held-packet inspection/release, terminal report and immediate stop on nonzero or uncertain settlement.
- Base/reviewed Git revision and relevant uncommitted changes: base `2632c24`; the current slice adds the memory evaluation packet CLI, exact allowance evidence/matching and its permanent development/QA/dispatch-review documentation. It does not release a packet or call a model.
- Actual checks/results for this revision: targeted formatting completed; contracts and application builds plus Chamber typecheck pass. The command itself was not run because that requires a fresh current verified-free route configuration and the local database/runtime stack. No external provider call or reservation occurred.
- Unresolved findings/blockers: Gate 0 intentionally creates a developer evaluation generation rather than a published playable story, and it holds the first round before retrieval, so it proves packet construction and review ownership rather than end-to-end relevance. Live memory release/reporting is not yet authorized or connected to the evaluation command. The first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Deterministic providers prove mechanics, not cheap-model comprehension or taste.
- Provider spend and accounting certainty: four verified-free OpenRouter calls occurred in the shared live-evaluation prerequisite. All settled at zero microusd with matched ledger calculations and unchanged before/after provider credit snapshots; no memory-model call occurred.
