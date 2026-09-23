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

- Current phase and exact next action: X3 has now exercised both decision branches live. With sufficient initial evidence, Sol returned `ready_to_answer` and completed a valid native-schema scene. After correcting the benchmark so its target fact was genuinely unloaded, Sol returned `needs_context`, the application performed one canonical lexical read, and the native final used and cited the returned evidence. That final was truncated at the evenly split 1,024-token ceiling. The operation now assigns 256 tokens to compact decisions and 1,792 to the final without changing its 2,048-token total. Inspect and commit this allocation checkpoint; a later single confirmation run is optional, not required to justify the deterministic fix.
- Base/reviewed Git revision and relevant uncommitted changes: base `1996fb9`; this slice corrects the Greywake evaluation fixture and generated-token allocation in the provider runtime and provider-free projection. Private packets/reports remain temporary local evidence.
- Actual checks/results for this revision: the corrected live run used exactly two settled calls, one retrieval read, zero reasoning, zero repair/retry/fallback, and USD 0.021172. The decision requested the missing hiding place; the final named “beneath the blue ledger,” cited the retrieved relationship and identity records, offered four distinct choices including withdrawal, and proposed a revision-fenced relationship update. It failed `invalid_output` only because provider finish reason was `length` at 1,024 tokens. Application build and 17/17 tests pass, Chamber builds, and fresh provider-free packets prove the new 256/1,792 allocation, absent initial answer, retrieved final answer and zero attempts.
- Unresolved findings/blockers: the allocation fix is not live-confirmed, and one good retrieval decision is not a reliability estimate. The facade still maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. Mechanical action plans still lack the narrative-choice dependency sidecar needed for focused successor retrieval.
- Provider spend and accounting certainty: the same-turn sufficient-context operation cost USD 0.023903; the corrected retrieval operation cost USD 0.021172. A duplicate local evaluation identity stopped before dispatch and cost zero. Fresh account usage is USD 0.467996196 with USD 9.532003804 remaining; paid usage for 2026-09-23 is USD 0.166230. All provider work is stopped for this checkpoint.
