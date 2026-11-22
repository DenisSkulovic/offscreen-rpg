# FIN02 | Extensible multi-provider cost and metering contracts

**Status: PROPOSED, NOT CURSOR-READY.** Future architecture for OpenRouter now and possible paid image generation or other vendors later. This is **normalization**, not payment processing, new game features or reconciliation itself.

## Owner requirement

Future external providers will meter different things: input/output and cached/reasoning tokens, image size/resolution/count, duration, per-request minimums, storage, tool/research jobs or other unit types. We need one financially safe core while allowing **provider-specific input, pricing, evidence and retry semantics**. Never assume that all services return usage immediately, or that a model's advertised current price equals its historical invoice charge.

## Proposed boundaries

- Define a typed `BillableProviderOperation` identity with platform/account liable payer, parent story/task/mission/attempt, external request identifier when supplied, provider and route/model/product SKU, price revision, consent/grant and hard cap; always pin that identity **before possible paid dispatch**.
- Provider adapters state supported capabilities, auth and reliability class, metering units, expected usage/evidence freshness, pricing precision/currency, provider request-correlation semantics and charge-on-failure/unknown semantics. An image-generation invocation might cost by completed image or input dimensions, not tokens; there must be no fake token conversion.
- One trusted pricing/maximum-charge calculator and one normalized cost-evidence envelope can feed the **existing** funding/usage reserve/settle engine and FIN01 provider reconciliation. Adapter errors fail closed, and unknown upper cost must prevent an unapproved dispatch. Keep source metadata versioned; store both provider-native units and normalized monetary values/rounding.
- Separate provider internal expense from player entitlement/quota and any future commercial customer invoice or credit balance. Do not promise a 1:1 customer charge equals vendor cost. A provider rebate or tax does not silently rewrite a historical user's entitlement.
- Keep model/tool routing capability and provider health in the existing route-policy world; [PROV01](../2026-11-22--prov01-provider-health-outage-and-routing/CHANGE.md) handles operational failures, and [CFG01](../2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md) controls policy/eligible routes. No giant plugin framework or untrusted dynamic scripts unless actual second-provider integration demonstrates need.

## Concrete future proofs

Pure fake adapters for (a) token-metered LLM, (b) fixed/unit-metered generated images and (c) delayed-usage async job. Assert conservative max-charge calculation, exact currency/units, unknown/failure liability, immutable pricing across route retirement, no user-controlled price, no precision loss, and no double charge for duplicated callback. OpenRouter remains the only investigated real source until evidence supports another; **do not build image generation itself** in this Change.

**Gate:** reconcile actual provider pricing and usage interfaces with FIN01 and WR10/WR11 after source integration, then define smallest stable interfaces rather than prebuilding hypothetical implementations. No paid requests or provider accounts authorized.
