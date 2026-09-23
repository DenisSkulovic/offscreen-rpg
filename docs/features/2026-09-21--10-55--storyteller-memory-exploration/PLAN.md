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

- Current phase and exact next action: X3 packet inspection and live supervision are implemented. The earlier zero-price Nex timeout was reconciled separately; the 2026-09-23 Sol Greywake comparison then supplied model evidence. One-shot guessed an unsupported fact. Native schema rejected the exploration union before inference. Under JSON-object transport the model recognized the missing evidence and asked the right factual questions, but not in the admitted `ask_memory` request shape, so the controller performed zero reads. An implicit repair consumed a second call and guessed. Repair is now an explicit immutable recipe dimension and defaults to zero. Improve and inspect the model-facing request protocol offline before another live attempt; do not add library material merely to trigger retrieval.
- Base/reviewed Git revision and relevant uncommitted changes: base `20143a9`; this slice adds the captured streaming transport through policy, live-evaluation configuration, exact packet construction, bounded parsing and QA expectations. The exact prior packet/report remain private temporary artifacts, not Git content.
- Actual checks/results for this revision: credential-free Gate 0 materialized 200 passages and 10 canonical records and held a 23,349-byte request under hash `7f12999390b272f57153c727f879db69dd3ac0737d9a365424ca4db216ed193d`; system/user messages were 5,012/5,421 characters and the output schema was 11,872 bytes. The prior live command released the same hash once and timed out after 30,020 ms; generation, memory artifact and aggregate operation became `uncertain`, with one dispatched round, zero reads and no second review or call. No response artifact was written. The current local Contracts, Storyteller and Chamber builds pass, as do all 36 Storyteller tests, including split structured SSE, final usage settlement and header identity retention; no provider request was made.
- Unresolved findings/blockers: the attempt has no provider ID, HTTP status, token counts, per-attempt charge or calculated reconciliation, so it cannot be declared settled merely because the configured endpoint was free. The first facade maps evidence questions to lexical search and possibility questions to one broad-discovery route; adaptive routing remains later evaluated work. A crash after a canonical read but before snapshot commit may recompute the same read-only lookup without double-counting it. Deterministic providers prove mechanics, not cheap-model comprehension or taste. Live Story-mode inspection also exposed a separate connected-flow gap: narrative choices can hand exact campaign/world dependencies to their successor, but mechanical action plans have no equivalent private retrieval sidecar. The ordinary mechanical path therefore cannot select the focused world pages advertised in its catalogue unless a richer memory recipe is separately admitted. Repair this generically across plan output, private persistence and successor context before claiming canonical retrieval is connected to normal play.
- Provider spend and accounting certainty: OpenRouter account totals were 10,000,000 credited and 20 used microusd immediately before and after the attempt, and still 20 used microusd at `2026-09-21T17:32:38Z`. The configured endpoint was freshly verified at zero input/output price, but the attempt itself remains accounting-unknown because transport returned no usage. All further provider work is stopped. Earlier shared evaluation still contains four separately verified-free calls; this memory attempt is not counted among them.
