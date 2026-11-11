# Caching and performance: a decision manual for faster, correct systems

**Roles:** performance architect, backend/React engineer, database specialist, caching designer, operational reviewer and test strategist. **Trigger:** slow or expensive path, new cache proposal, throughput/latency target, stale UI, read-model choice, Redis incident, request waterfall, memory or contention. Not a mandatory primer for routine code edits.

**Navigate:** [start with a budget](#1-define-performance-in-terms-of-workload-and-user-outcome) · [diagnose first](#2-identify-the-bottleneck-before-changing-the-architecture) · [cache options](#3-choose-a-cache-location-and-consistency-contract) · [invalidation](#4-freshness-invalidation-and-race-design) · [Redis realities](#5-redis-is-an-operational-system-not-just-a-map) · [other optimizations](#6-performance-is-more-than-caching) · [validation](#7-design-and-measurement-receipt).

## Engineering premise

Caching trades **memory, duplicated state, complexity and potential staleness** for fewer or faster computations and reads. Performance engineering optimizes *the path and workload that matters*, not a method because it sounds slow or a subsystem because it's currently fashionable.

A high cache hit ratio can hide a severe hot-key stampede. A 100-ms endpoint can be terrible if the UI issues twenty sequential requests. One missing SQL index can make a Redis deployment look attractive. The right optimization depends on bottleneck, consistency, concurrency, growth and operational tolerance.

## 1. Define performance in terms of workload and user outcome

| Dimension | Questions to answer | Consequence |
| --- | --- | --- |
| Target outcome | Fast first scene? Timely action completion? Low provider spend? | Different critical path and metrics |
| Workload | Requests/sec, concurrent users, bytes, key distributions, reads/writes? | Hot spots and cache working set differ |
| Latency | p50/p95/p99, client total, server processing, background delay? | Averages hide rare but painful stalls |
| Capacity | CPU, heap, DB pool, locks, queue, provider rate/concurrency? | Scale the constrained resource, not every service |
| Data staleness | May a public read lag? What about a command? | Some data can be cached; some must be revalidated |
| Reliability | What happens if cache/storage/proxy fails? | Graceful slow fallback versus fail-closed behavior |
| Cost | Cache instances, network calls, bytes, extra queries, invalidation complexity | A faster read may cost more infrastructure/human work |
| Evolution | Dataset size, cardinality, hot keys and version churn? | Prefetch/write-through can become wasteful |

Set *representative scenarios* before numeric targets. A local pre-POC may need comfortable interactive latency rather than a production SLO invented by the agent. If the requirement is unspecified, measure first and propose a conditional budget.

**Useful distinction:** latency per request vs throughput vs saturation vs user-perceived response. A system can have low CPU and awful latency due to I/O, DB locks or downstream queueing. The bottleneck may move after the first optimization.

## 2. Identify the bottleneck before changing the architecture

Work backward from an actual slow end-to-end path:

1. Browser: long tasks, hydration, giant JS bundle, repeated renders, images, layout/reflow, client waterfalls.
2. HTTP/proxy: TLS/connect latency, caching misses, retry amplification, buffering and timeouts.
3. Node/API: event-loop blocking, serialization, synchronous CPU, too many concurrent promises, auth/session reads.
4. DB: query planning, missing/wrong indexes, N+1, lock waits, pool queueing, large sorts, replicas.
5. Cache: remote Redis network round trips, key distribution, miss storms, eviction or stale reads.
6. Worker/Temporal: accepted queue versus completion, activity concurrency, retry backlog.
7. External provider: rate/cost ceilings and uncertain results; not under ordinary SQL control.

**A new service does not eliminate its dependency's latency.** A cache doesn't fix expensive writes or business operations that must hit the authoritative DB. Increasing Node replicas can worsen DB pool contention. Faster SQL can shift the bottleneck to serialization or rendering.

### What evidence matters?

- Trace request ID through key stages; compare slow versus normal examples.
- For SQL, inspect the actual query plan, row counts, buffer reads, join and sort choices.
- For Node, measure event-loop delay/CPU/heap where the workload suggests blocking; don't diagnose from memory percentage alone.
- For frontend, use browser Performance/React profiling and network waterfall rather than random memoization.
- For queues, measure arrival/completion rates, oldest-item age and retry counts, not just length at one instant.
- If missing telemetry prevents attribution, a **small diagnostic instrumentation slice** may be worth more than optimization code.

**Prioritize** by observed contribution to user outcome, frequency, severity and change/operating cost. Optimize dominant terms on the actual critical path, not whichever component has a large file.

## 3. Choose a cache location and consistency contract

| Approach | Fit | Trade-offs |
| --- | --- | --- |
| No cache, indexed SQL/query improvement | Small/medium data or correctness-sensitive reads | DB work stays visible; may already meet target |
| Per-process memory | Repeated local immutable/static metadata, single instance | Restart/scale-out incoherence, unbounded heap unless limited |
| Redis shared cache-aside | Repeated expensive reads across instances, rebuildable values | Extra service/network, invalidation, stampede, staleness, tenant-key safety |
| HTTP browser/proxy/CDN | Public or immutable representations, repeat consumers | Cache keys, Vary, private data leaks, invalidation and client age |
| Server-side Next fetch/request memoization | Repeated reads within rendering/request lifetime | Version/framework semantics, scope and authenticated cache safety |
| Client query cache | Navigational server state with known identity and freshness | Stale UI, cache key identity, invalidations, logout isolation |
| Materialized DB/read projection | Expensive joins, statistics or derived views, predictable refresh | Lag/rebuild, storage and write amplification |
| Precomputation/read-through | Expensive stable computation often reused | Cold-start and wasted computation for unused keys |
| Write-through/write-behind | Specific consistency/performance patterns | Two-write failures, deferred durability and replay ordering |

There isn't one universal "cached layer" for all data. A published immutable story passage may be cached by revision; a live action eligibility/usage quota needs authority checking at the owning operation. A derived story snapshot can have a short-lived cache but no separate right to commit mechanics.

### Cache identity is part of security and correctness

A cache key is an equivalence claim: “these reads may return the same value.” Variables such as tenant/user, story, selected revision, locale, query filters and permission scope may distinguish otherwise identical-looking resources. Do not blindly concatenate user-controlled strings; use structured, bounded key construction.

**Not all caches need tenant IDs inside keys** if isolation is guaranteed by physical namespace/cache instance or authorization-aware upstream design. The key invariant is *no accidental cross-authority sharing*. On logout/switch-user, client-private caches require deliberate partition or eviction.

## 4. Freshness, invalidation and race design

### Cache-aside and the delayed reader

```text
T0 R starts reading old DB version 10.
T1 W commits version 11.
T2 W invalidates cached value.
T3 R finishes old read and stores version 10 after invalidation.
T4 New readers see v10 even though invalidation succeeded.
```

**"Invalidate on write" is necessary in many designs but not sufficient for arbitrary concurrent readers.** TTL bounds how long a stale value remains, not whether stale repopulation can happen. Correctness approaches differ:

- **Version-aware keys/read:** include immutable source version, or accept only a value matching current version.
- **Generation token / fenced cache publication:** reader caches only if no newer generation won.
- **Write-through ordered publication:** server controls sequence and source identity; complexity increases.
- **Short TTL or stale-while-revalidate:** acceptable only when staleness is an intentional user contract.
- **Bypass cache for authority:** often best for commands and eligibility checks.

The correct solution depends on whether version metadata is cheap/reliable, whether writes are rare, and how stale a read may be.

### Stampedes, penetration and avalanche

- **Stampede:** many readers miss same hot key simultaneously; single-flight, bounded distributed coordination, early refresh or serve-stale can help.
- **Avalanche:** many keys expire together; TTL jitter and staggered warming can smooth spikes.
- **Penetration:** clients repeatedly request nonexistent keys; negative caching can help but risks masking creation of a previously absent resource.
- **Hot-key concentration:** even a 99% overall hit rate may conceal one dominant origin bottleneck; measure by key family and traffic distribution.
- **Write/read race after invalidation:** old reader repopulates stale data; version/fencing design above.

Be explicit about **where singleflight applies**: in-process deduplication protects one Node instance, not every replica; distributed lock has expiry/fencing failure modes and may be more expensive than a carefully bounded origin fallback.

### Three freshness promises

1. **Immutable by identity:** hash/revision-based content can be cached long if identity truly changes when bytes change.
2. **Eventually fresh projection:** TTL/event invalidation with documented lag and refresh behavior.
3. **Current authoritative decision:** bypass or revalidate against the owner at commit time.

Don't conflate these. A stale search result may be acceptable; a stale financial balance authorizing a new spend usually is not.

## 5. Redis is an operational system, not just a map

[Redis cache-aside documentation](https://redis.io/docs/latest/develop/use-cases/cache-aside/) describes standard cache-aside access and misses. [Redis eviction documentation](https://redis.io/docs/latest/reference/eviction/) distinguishes maxmemory policies. Design should consider **what data is disposable**.

| Redis choice | Relevant conditions | Failure/operational cost |
| --- | --- | --- |
| allkeys-lru | Recency-correlated hot working set | Approximation may evict frequently used but briefly cold keys |
| allkeys-lfu | Repeated-frequency-heavy access | Warm-up and changing workload patterns |
| volatile policies | Mix of keys with explicit expiry | Keys without TTL can block eviction eligibility |
| noeviction | Cache should refuse new keys when full | Writes fail; ensure fallback and alert |
| TTL and expiration | Bound the lifetime of cached representations | Expiration is not eviction; mass expiry amplifies misses |
| Persistence/AOF/RDB | Redis holds recoverable-but-valued data beyond ordinary cache | Durability/restore/perf configuration; don't accidentally turn cache into sole authority |
| Shared instance | Fewer services for small project | Resource interference between cache, sessions, rate limits or queue state |

**Key distinction:** maxmemory is not a physical guarantee that process RSS, replication buffers or allocator overhead stay below the host limit. A “free memory” dashboard may be misleading. Check key counts, sizes, hot keys, fragmentation, evictions/expiration, latency and fallback cost.

**Failure policy:** if Redis disappears, can the application safely read SQL (slower), return a stale public value, or must it reject an operation that depends on a limit? Choice is an **availability-versus-correctness** decision, not a universal “fail open gracefully.”

An extra cache increases remote traffic on every miss/hit and introduces new credentials, version/serialization concerns, connection pools and monitoring. For a one-developer pre-POC, use it only if it reduces more cost/complexity than it adds.

## 6. Performance is more than caching

### Database

Prefer query/index analysis before read replicas, sharding or dedicated search. Relevant options: rewrite N+1/fan-out, pagination/keyset, projected columns, composite/partial indexes, materialized views, partitioning for real large workloads, connection pool management. Beware query plan variation with skewed parameters and stale statistics. Indexes improve reads but add write overhead and migration risk.

### Node and async execution

Node handles I/O concurrency well, but synchronous CPU, large JSON parsing/stringify, unbounded promise fan-out and regex backtracking can block the event loop. A worker thread or background job can isolate expensive CPU/long tasks; it brings serialization/worker lifecycle cost. Backpressure and concurrency limits often matter more than adding threads.

### Browser/React

Distinguish network waterfall, server-render delay, hydration, JS parse, layout and React render cost. Use profiling to find expensive components or broad invalidations; memoization and virtualization are conditional. Server/client component split changes bundle weight, security and data fetching. Image/font choices affect load, layout and readability. A visually attractive heavy screen can have poor interactive performance.

### Capacity and tail latency

Service rate, concurrent occupancy and queueing are different. If a request takes 30 seconds, even low arrival rates can saturate a small worker pool. As utilization nears effective capacity, p95/p99 can grow rapidly. Choose deadline-aware queueing, admission control, load shedding, bulkheads or capacity expansion by criticality and workload, not a fixed global timeout increase.

### Optimization economics

Performance gains have opportunity cost. A cache that saves 5 ms on occasional requests but requires hours maintaining invalidation and privacy guards is a bad trade for a pre-POC. A 300-ms UI delay on every action could matter much more. Record **measured before/after**, operational costs, and whether you accidentally changed semantic behavior.

## 7. Design and measurement receipt

Before proposing a cache or optimization, the role should provide:

| Item | Expected evidence |
| --- | --- |
| User-relevant symptom | Which operation, scenario and percentile/size/throughput |
| Hypotheses | 2–3 realistic bottlenecks and discriminating measurements |
| Candidate approaches | No-new-cache optimization and at least one other credible choice |
| Consistency / ownership | What data is authoritative, identity/version and acceptable staleness |
| Concurrency / failure | Stampede, stale reader, cross-tenant key and Redis outage policy if relevant |
| Resource costs | Memory, network, DB work, operational complexity, billing |
| Verification | Correctness under reorder/failure plus representative measured improvement |
| Reversal condition | Which benchmark or changed workload would make another approach win |

**Three realistic exercises:**

- **Cache invalidation race:** reader started before writer and populates after invalidation; prove the selected strategy doesn't publish obsolete version if strong freshness is required.
- **Hot key at midnight:** 500 clients miss after simultaneous expiry; show actual origin load with and without singleflight/jitter.
- **High hit ratio, slow page:** Redis hit rate is 99%, but client has a waterfall of 20 requests and DB lock waits on one endpoint; identify why a cache-centric “fix” isn't the answer.

**Project owners:** [persistence and caching](../../docs/technical/persistence-and-caching.md), [cache adapter](../../packages/cache/README.md), [application guide](../../packages/application/README.md), [web workspace](../../apps/web/README.md), [observability knowledge](observability-and-production-diagnostics.md).

**Deep study:** [SE320 caching and consistency](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE320-backend-services/SE320-L02-caching-trading-freshness-for-speed.md), [SE335 Redis production forensics](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE335-queues-caches-production-diagnostics/SE335-L01-redis-in-production-memory-latency-and-cache-failures.md), [SE240 frontend performance](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE240-frontend-engineering/SE240-L05-performance-why-fast-code-can-feel-slow.md). Primary: [Redis cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/), [Redis eviction](https://redis.io/docs/latest/reference/eviction/).

**Status:** professional knowledge for a coding-agent design role, not permission to introduce Redis, change memory settings, run load tests or deploy infrastructure.
