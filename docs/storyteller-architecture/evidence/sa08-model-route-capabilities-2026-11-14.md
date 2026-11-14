# SA08 evidence | model route capabilities

**Date:** 2026-11-14. **Change:** [SA08](../../changes/2026-11-14--sa08-model-route-capabilities/CHANGE.md). **Provider spend:** none.

## What landed

- `model-route-capabilities.v1` — truthful matrix from captured policy (reasoning disabled, provider-reported-only cache, no fallbacks/plugins)
- `model-route-packet-report.v1` — packet bytes/hashes, optional prefix potential, usage/cost only when supplied; `estimatedInputTokens` always null
- Adapter assert: OpenRouter body must keep `reasoning.enabled=false`; price-unknown routes fail closed on packet report
- Request audit embeds `routeCapabilities`; `pnpm storyteller:packet-audit` emits route fixtures

## Proof

`@offscreen/storyteller` 49/49 · `pnpm storyteller:packet-audit` (route capabilities: 3; transport none; spend $0)

| Case | Result |
| --- | --- |
| priced cold/warm continuity packets | Warm prefix potential 9847B; `cachedTokens` still null; unknowns include `prefixBytesAreNotProviderCacheHits` |
| not-priced route | `storyteller_route_price_unknown` |
| captured usage fixture | cached 100 / write 200 / calculated 7000 microusd; no transport |
| reasoning enabled in body | assert rejects |

## Unknowns

- Live cold/warm provider cache hit rates (needs separate paid permission)
- Bounded reasoning mode on a proven commercial route (still unsupported; adapter hard-off)
- Explicit prompt-cache / session pinning opt-in (not authorized)
