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

- Current phase and exact next action: X3 now has a durable decision/final split. While context is available the model may return only `needs_context` or `ready_to_answer`; either path reserves a separate final round whose response uses the original task's native strict schema. OpenAI transport projection represents domain-optional non-nullable fields as required-but-nullable on the wire, then removes only those synthetic null placeholders before unchanged domain validation. The exact next action is provider-free inspection of the committed diff and gameplay packet; a later paid run, if separately worthwhile, should test `needs_context -> read -> native final` and stop after that one operation. Do not add library material merely to provoke tool use.
- Base/reviewed Git revision and relevant uncommitted changes: base `aa2b269`; this slice changes the OpenAI strict-schema adapter, memory decision protocol, persisted snapshot accounting, controller transitions, tests and runtime documentation. Exact live reports and packet artifacts remain private temporary files, not Git content.
- Actual checks/results for this revision: local replay of the prior grounded Sol candidate succeeds after changing the wire-only forced `recallAs` value to `null` and applying transport normalization; both task and evidence-use validation pass. Storyteller build and 39/39 tests pass, Application build and 15/15 tests pass, API integration compiles, and the focused database-backed review/ready/final/repair integration test passes. Fresh provider-free projection held a 13,882-byte first request under hash `7f22f147a17406ab2f9e17be013f7786b7d16e17a2877c843f8b8ae4f972cac2`; it contains no final-result branch and made zero provider attempts. Its projected round-two native-schema body is 27,434 bytes under hash `4bdf00d4088445b5266f17d4219702da0a60428abdbd3d40532a511576f57643`, with the exact one-read evidence pack and the 10,845-byte final schema.
- Unresolved findings/blockers: the new native-schema normalization is covered provider-free but has not yet completed a live provider final round. The latest Sol attempt stopped on round one because the model emitted an obsolete final-wrapper shape during a JSON-object decision round; this motivated the now-enforced decision-only schema. The first facade still maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Deterministic providers prove mechanics, not model comprehension or gameplay taste. Mechanical action plans still lack the narrative-choice dependency sidecar needed for focused successor retrieval.
- Provider spend and accounting certainty: the latest Sol attempt made exactly one settled call, provider ID `gen-1790179431-hkzQrX6QkU6t3NR8AU3w`, with 2,722 prompt tokens, 577 completion tokens, 2,719 cached input tokens and a matched USD 0.006320 charge. It performed zero reads and no retry. The fresh OpenRouter account snapshot reports USD 10 total credit and USD 0.422922996 cumulative usage, leaving USD 9.577077004. Paid usage for 2026-09-23 is USD 0.121155. All further provider work is stopped for this checkpoint.
