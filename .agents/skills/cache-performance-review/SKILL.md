---
name: cache-performance-review
description: Analyze or design caching, Redis, SQL/query optimization, Node/React latency, concurrency and capacity decisions from workload evidence rather than automatically introducing infrastructure. Read-only design review.
---

# Caching and performance architecture

**Trigger:** reported slowdown, DB/Redis query load, stale read problem, new cache/projection, hot key, request waterfall, resource saturation or performance refactor with meaningful trade-offs. Not a generic instruction to optimize all code.

1. Define the actual **user-observable performance goal** and workload. Distinguish latency percentiles, throughput, concurrent occupancy, data size and staleness semantics. Ask for a measurement plan when no baseline exists; do not invent SLOs.
2. Consult the relevant section of [Caching and performance](../../knowledge/caching-and-performance.md). Map alternatives: no cache + query/index improvement, in-process, Redis, HTTP/CDN, client query cache, materialized view and durable async; choose by access patterns and consistency.
3. Trace the actual path via [code navigation](../../../docs/engineering/code-navigation.md), [cache adapter](../../../packages/cache/README.md), [persistence contract](../../../docs/technical/persistence-and-caching.md) or affected web feature. Keep source reads focused on the suspected bottleneck.
4. If cache proposed, state authoritative source, cache identity/tenant scope, invalidation, stale reader/TTL, stampede, outage fallback, eviction/memory and operational cost. If no cache proposed, name why it wouldn't help.
5. Compare hypotheses using one discriminating measure and negative correctness case (stale version repopulation or tenant leak, when relevant). A high hit rate or p50 improvement alone is not enough.
6. Output: `symptom and baseline | likely bottlenecks | plausible options | chosen bottleneck-first approach | freshness/failure/operability | measure-and-regress plan | unresolved uncertainty`.

**Permission:** read-only, no load test, Redis deployment, configuration change, package install or game-code edit unless a separately authorized executor task exists.
