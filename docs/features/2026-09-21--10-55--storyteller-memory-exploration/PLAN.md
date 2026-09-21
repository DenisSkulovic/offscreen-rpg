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

- Current phase and exact next action: X3 structural evidence and its multi-round accounting boundary are complete. The sibling `memory-evaluation-packet.v1` configuration, `memory-live-evaluation.v1` first-round manifest/preflight and Chamber authority projection are implemented without weakening the ordinary evaluator. Next add a credential-free `chamber:memory-evaluation-packet` command that applies that captured route to the existing Greywake Gate-0 task and writes the manifest; release/reporting remains a later explicit slice.
- Base/reviewed Git revision and relevant uncommitted changes: base `ca9e49f`; the reusable-start journey compares minimal and balanced retrieval at one Greywake root and runs an admitted abstract pending-consequence task through the normal two-round executor without mutating the workflow-owned generation. The current working slice aligns the shared opening prompt/provider schema as `storyteller.v7`; it does not change memory execution.
- Actual checks/results for this revision: the strict memory evaluation contract accepts exactly two rounds, one read, one in-flight call, zero optional inference/reasoning categories and a verified-zero-price route; it separately captures per-round token/serialized limits, cumulative input/generated limits and retained evidence bytes. Manifest construction caps the first attempt's byte-derived reservation at the route/request token ceiling and binds generation, attempt and hash. Credential-free preflight rechecks hold, identity, route validity, zero pricing, packet limits, accounting and trace readiness but cannot release. Contracts/application builds and Chamber typecheck pass; all five focused live-evaluation tests pass. No external provider call or reservation occurred.
- Unresolved findings/blockers: Gate 0 intentionally creates a developer evaluation generation rather than a published playable story, and it holds the first round before retrieval, so it proves packet construction and review ownership rather than end-to-end relevance. Live memory release/reporting is not yet authorized or connected to the evaluation command. The first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Deterministic providers prove mechanics, not cheap-model comprehension or taste.
- Provider spend and accounting certainty: four verified-free OpenRouter calls occurred in the shared live-evaluation prerequisite. All settled at zero microusd with matched ledger calculations and unchanged before/after provider credit snapshots; no memory-model call occurred.
