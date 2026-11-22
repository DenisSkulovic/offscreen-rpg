# PROV01 | External provider failure, model availability and safe route recovery

**Status: PROPOSED, NOT CURSOR-READY.** Owns external-provider **operational reliability**, not the financial ledger (FIN01) or subscription policy resolver (CFG01).

## Owner outcome

The game remains predictable when OpenRouter or a downstream model has a temporary outage, severe latency, rate limit, changed model availability, newly unsupported parameter or retired route. New requests should not stampede an unhealthy vendor, lose player story state, expose secrets or bypass the user's approved spending and quality envelope. Already dispatched/possibly sent attempts retain original identity, possible cost and recovery restrictions.

## Selected future behavior

- Observe authenticated, non-sensitive per-provider/route health evidence: dispatch errors, timeouts, rate limits, out-of-service model IDs, schema/parameter rejection and moving capacity limits. Define bounded per-route concurrency, retry-after handling, circuit-breaker/backoff, queue backpressure and explicit availability with aging data; no endless paid “health probe” loop.
- Distinguish **definitely not sent**, **possibly sent/unknown** and **confirmed received**. Only unsent requests may be retried according to pinned policy without double billing. An ambiguous response never triggers immediate blind retry, especially across Temporal Activity restarts, process crashes or failover.
- Model/route retirement affects **future** admission through published CFG01 policies; a captured possibly-sent attempt is not silently rerouted. Fallback is disabled unless an explicit account/operation authorization and compatible pricing+capability permit a **new** identity and liability. Creative consistency and context/schema support matter, not just cheapest available model.
- Player receives a safe, actionable held/retry-later status; internal staff receive provider status/causal evidence with correlation IDs and actual observed billing uncertainty. Never expose provider credentials or raw private story prompts in circuit metrics.
- A provider outage must not cause platform-wide stop for unrelated healthy providers/accounts except an explicitly scoped platform ceiling. Rate limiting and provider health decisions remain distinct from exhausted payer funding and subscription entitlement.

## Offline proof

Deterministic fake transport simulates 429/5xx, intermittent latency, model gone, parameter no longer supported, lost acknowledgement and recoveries. Verify admission gating, bounded work queues, safe local player holds and no double charge/scene/tool effect after resumption. Use [SIM01](../2026-11-22--sim01-realistic-zero-cost-provider-simulator/CHANGE.md), [LOAD01](../2026-11-22--load01-scripted-multiuser-load-and-autoscaling/CHANGE.md) and FIN01 to validate without paid calls.

**Dependencies:** actual WR10/WR11 model transport, CFG01/CFG03 eligibility and GA custody. No new model subscription or production routing enabled from this packet.
