# SIM01 | Realistic deterministic no-paid-call model provider simulator

**State: PROPOSED; not Cursor-ready.** Separate from K8S10 small fake driver and CH01 Chamber scenario setup. This Change simulates the MODEL PROVIDER boundary, not the game engine.

## Owner outcome
A test-only transport honors the existing prepared provider wire and delivery result contract. Instead of OpenRouter, it delivers schema-valid predetermined tool calls, Library reads and final narrative proposals, selected by scenario/step/seed. The rest of the genuine system still runs through normal player API, GA, SQL funding/custody, outbox, Temporal, tool ledger and publication. One reusable scripted story can be instantiated for many isolated owner/story IDs.

## Controlled realism
Support configurable deterministic think-time and jitter, tail latency, pre-send failure, after-send ambiguous timeout, malformed result, rejection, lost acknowledgement and bounded concurrency. Use seeded random schedules so a run is repeatable; record precise request/result hashes. If the actual integrated transport is non-streaming, do NOT assume streamed OpenRouter chunks; streaming is conditional on a real supported contract. Fake token/price telemetry should exercise existing budgets without implying actual external provider billing.

## Safety and evidence
Hard test-mode fence: no real model credentials, no external OpenRouter transport and an explicit tripwire/deny on attempted paid sends. A simulator outage must not trigger live-provider fallback. Differentiate simulated cost from actual spend in reports. Prove no second provider send after unknown response, same tool-call ID has one effect, and valid scenes appear through ordinary authenticated reads. The provider is simulated, but orchestration is REAL.

## Dependencies / limits
After WR10/WR11 provider interface is final and before LOAD01. Reuse existing provider transport/Contracts and Chamber scripted fixture owners. No separate production provider gateway or new billing ledger, no live inference and no cluster mutation authorized by this proposal.
