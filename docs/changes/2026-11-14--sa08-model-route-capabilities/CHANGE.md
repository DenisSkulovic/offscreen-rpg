# SA08 | Make model route limits, caching, reasoning and billing claims explicit

**State: Proposed / design-complete 2026-11-14, provider-specific promotion conditional on measured support.** No code/paid authorization. Program [SA queue](../../storyteller-architecture/implementation-program.md).

## Cursor first-screen

> **Goal:** an admitted provider route accurately declares and enforces its JSON protocol, token/reasoning ceilings, cache billing categories, output/stream behavior and failure handling; request audit reports **actual** cache usage when provider supplies it, never assumes discounts from shared bytes.
>
> **Authority:** [route capabilities / caching](../../storyteller-architecture/prompt-tools-and-models.md#model-route-capability-manifest), [cost policy](../../storyteller-architecture/effort-cost-and-lifecycle.md), existing [usage-policy authority](../../technical/usage-policy.md).
>
> **Source:** `packages/storyteller/src/providers/openrouter.ts::buildOpenRouterRequest/inspectOpenRouterRequest/compareOpenRouterRequests`, `packages/storyteller/src/tasks/policy.ts`, `packages/application/src/storyteller/budget.ts::createStorytellerBudget`, `application/storyteller/memory-provider-runtime.ts::createMemoryProviderRoundRuntime`, current `provider-pricing` and packet-audit tests.

## Implementation contract

1. Define an internal versioned **ModelRouteCapabilities** matrix for actually configured routes (strict schema/json-object, reasoning bounds, stream, timeout, cache policy, provider/model version, measured bill categories), preferably extending existing policy instead of inventing independent permission.
2. Keep **default reasoning disabled**; the current OpenRouter request hard-codes it off. Introduce an optional bounded reasoning mode **only** on a proven route whose actual request stop and charged reasoning categories are enforceable. If no such route selected, manifest truthfully marks unsupported and the adapter remains off.
3. Make cold/cache-write/cache-read worst-case charge reservation consistent with the same route manifest; preserve existing attempt/operation window ledger and unsent/uncertain states. A cache *hit* can lower settled cost but cannot grant new request budget or permit overspending on a miss.
4. Expose a provider-packet report of exact system/user/schema bytes, stable prefix hashes, reported prompt/cached/cache-write/generated/reasoning tokens, duration, billed microusd and **unknowns**. Do not replace real tokenizer counts with bytes/4. Mark estimated reusable prefix bytes as **not a provider hit**.
5. If provider supports explicit prompt cache or session pinning, keep behind route-specific, privacy-reviewed **opt-in**, no cross-story private exposure, no global OpenRouter field copied blindly. Preserve old route/task snapshots for in-flight generations.
6. Test finish_reason length where complete valid JSON, malformed/partial streaming, provider_unavailable confirmed unsent, timeouts with uncertain billing, refusal and invalid strict schema. No automatic provider/model fallback unless already admitted.

## Acceptance / negatives

**Normal:** two same-route cold/warm fixture packets show valid exact cost categories and potentially shared prefix, and **reported cached tokens remain unknown unless a real captured response supplies them**; actual provider-compatible reasoning setting reaches the transport only if route says yes.

**Negative:** disabled reasoning route never silently reasons/bills; price unknown route fails closed; cache miss does not bypass cap; streaming transport ambiguity is not recharged; a model-selected provider/name in fiction is data only; private source hashes cannot be used to retrieve another viewer's prompt. No global model routing rewrite.

**Proof:** `pnpm storyteller:packet-audit`, `pnpm --filter @offscreen/storyteller test`, captured mocked provider envelopes, budget tests with no paid requests. **A real cold/warm experiment needs separately stated account, route, absolute dollars and no-retry permission**; not granted here. Return route matrix and exact measured vs unverified fields. **Out:** changing commercial tiers, billing integration, new inference SDK, automatic subagent spawning.
