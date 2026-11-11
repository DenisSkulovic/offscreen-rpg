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
- At each model boundary, project a compact, non-authoritative budget status: current round, whether another context request is permitted, remaining reads/rounds and the protected final-output ceiling. The runtime, not the model, enforces these limits. Exact rendered-token preflight is adapter-specific; retain conservative byte/token ceilings when the active adapter has no verified tokenizer/counting facility.
- Checks: loop attempt, malformed request, unavailable source, partial index, crash after reads, duplicate delivery and final invalid-output repair.
- Exit: recovery never repeats accepted mechanics, loses accounting or silently changes evidence.

### X3 — Connected return and configurable recipes

- Outcome: Greywake and abstract-world turns exercise no-tool, minimal retrieval and richer bounded recipes through ordinary task construction.
- Capture section sizes, search/read reasons, omission, rounds, latency and attributable spend.
- Exit: the same canon yields appropriately bounded working sets across cost postures and owner inspection shows exactly what was used.

## Current checkpoint

- **State:** Bounded X1/X2 exploration and X3's decision branches were exercised in September. The application enforces round/read/byte/output and cost envelopes. Ordinary play remains on the captured one-shot recipe when sufficient context is already present.
- **Next:** During selected connected gameplay, invoke exploration only when a specific turn genuinely lacks relevant evidence. Inspect exact retrieval, current-version selection, final packing, admission, publication and player-visible result; do not buy another isolated Greywake replay.
- **Evidence:** A missing-key case found “beneath the blue ledger” through one lexical read but the final was truncated by its 1,024-token cap. The later 256/1,792 split completed a final yet failed private semantic admission. This does **not** prove reliable long-story recall.
- **Limits:** Adaptive routing, detailed model-facing remaining allowance and provider-exact token preflight remain measured future work; serialized byte measurements are not actual tokenizer counts.
- **See:** [connected exploration evidence](../../engineering/long-story-memory-and-retrieval.md#connected-exploration-evidence--september-2026) and [full dated investigation in Git history](https://github.com/DenisSkulovic/offscreen-rpg/blob/07c2067b272023a6f45bae61cd0f2279cb8cd08a/docs/features/2026-09-21--10-55--storyteller-memory-exploration/PLAN.md).
- **Verification/spend:** Prior runs settled historically; no fresh model call or check and no verified current balance.
