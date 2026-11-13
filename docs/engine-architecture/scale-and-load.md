# Scale and performance | serious engineering foundations without distributed theater

**Status:** hypothesis-driven portfolio/performance architecture, not measured throughput. **Product workload:** many mostly dormant independent stories, sparse admitted work, bursts of paid Storyteller tasks, returning clients and occasional contentious shared scenes. Use [architecture decisions knowledge](../../.agents/knowledge/architecture-decision-space.md), [caching](../../.agents/knowledge/caching-and-performance.md), [durable operations](../../.agents/knowledge/durable-operations.md) and [observability](../../.agents/knowledge/observability-and-production-diagnostics.md).

## Why “we will have thousands of players” changes decisions now

The architecture should permit **horizontal replicas of stateless API/web and independently scalable worker pools**, **without changing story semantics**. We do not need to provision for a thousand players today. We do need to avoid designs that assume all canonical files live on a single container, all memory state fits in one process, every story ticks every second, or every decision is owned by whichever browser responded first.

**Scalability is about workload shape, failure and operational compatibility**, not number of packages, Kubernetes manifest files or speculative RPS bragging.

## Three substantially different loads

| Workload | Primary cost | What the architecture must isolate |
| --- | --- | --- |
| **Thousands of mostly inactive stories** | Stored chronology/objects, infrequent background wakes, optional reads | Sparse boundary scheduling and cold-storage/paging; no per-story idle polling |
| **Hundreds of concurrently active independent stories** | DB commits, Temporal task throughput, Storyteller provider wait/cost, SSE connections | Worker pools, quotas, database connections, fairness and idempotent operations |
| **Many users within one shared world/situation** | Conflicting actor/entity writes, shared clock, fanout | Domain conflict scope and admitted group decisions; **not solved** by scaling workers |

A hundred separate stories can distribute across workers trivially compared with one shared story with a hundred conflicting actions. Keep those benchmarks separate.

## A hypothetical workload model, not measured capacity

Define before testing:
- `S` = stored stories; `A` = admitted activities currently progressing; `T` = average real seconds between meaningful work boundaries; `C` = concurrent open browser SSE subscriptions; `F` = average committed meaningful updates/sec; `M` = paid Storyteller tasks/sec; `R` = average model call seconds.
- Boundary demand ~ `A/T` tasks per second **on average**, but arrivals may synchronize around popular deadlines.
- If every client were polled every 2s: ~`C/2` snapshot reads/sec.
- Approximate needed concurrent model slots ~`M·R` (plus variance and backpressure). A provider's rate limit or funding is a different constraint from worker CPU.

**Illustration:** 10,000 stories, 1,000 legal running tasks, and one boundary per 600s ⇒ ~1.67 boundary evaluations/sec on average, not 10,000 tick writes/sec. A burst of 2,000 simultaneously due tasks can still spike massively and needs queue latency evidence. Do not treat this toy arithmetic as a benchmark.

## Proposed performance budgets for first real measurements

Use **scenario-based acceptance**, not “all endpoints under 100ms.” Candidate starting test conditions to refine after baseline:
- **Solo command:** reject/accept under a declared p95 latency while keeping exactly one result under 10× duplicate submissions. Measure lock wait and DB time separately from eventual Storyteller result.
- **Open current story:** paged/current data, source read, cache key and SSR; measure p50/p95/p99 and DB queries against 10, 1,000 and 10,000 passages.
- **Wake backlog:** enqueue 100/1,000 valid due events together and measure delay to durable boundary settlement. Some bounded delay is acceptable; **false clock accrual is not**.
- **Provider load:** inject slow fake transport; short timer/decision work must not queue behind long expensive model tasks.
- **SSE storm:** thousands of client reconnects across many stories; no cross-owner data, bounded memory, no DB stampede or unbounded per-notice work.
- **Hot shared story:** 2, 10, 100 simultaneous **conflicting** attempts. Correct rejected conflicts are acceptable; corrupted shared state is not.

Choose actual latency thresholds **after** source/DB capacity tests and a hosting budget. Passing under arbitrary tiny timings with all dependencies mocked would be meaningless.

## What the inspected source suggests

### 1. Single story-row serialization

Current `lockOwnedStory` / `lockStoryById` deliberately serialize accepted mutation on one story row. **This is an excellent simple concurrency policy** for solo, perhaps for a small party. It may become a hot-lock contention bottleneck in large shared worlds. The future solution isn't optimistic writes everywhere: first model who is allowed to change which actor, location, item or shared frontier, then use stable locking order and conflict scope.

An engineering benchmark should report **lock wait duration**, deadlock/retry rate and p95 accepted-action latency by hot story ID. If it passes at target party size, keep it.

### 2. Snapshot/query identity and cache

`stories/reads.ts` derives a versioned identity with authorization and an accounting aggregation. Redis may cache a result, but an expensive “is cache current?” query executed for every request can consume substantial DB resources. Measure `EXPLAIN (ANALYZE, BUFFERS)` on populated data, plus hit/miss DB query counts. Investigate a cheap committed projection version/usage aggregate **only if evidence shows a problem**, not a second mutable cache authority.

Cache keys must include **viewer authorization scope**, contract version, story identity and snapshot/projection version. A cache hit cannot bypass fresh owner checks. Redis failure must degrade to PostgreSQL, not grant stale write permission.

### 3. SSE hints/fanout

Current Nest hub receives PostgreSQL LISTEN hints and sends invalidation to authorized SSE subscribers. This is a good start; a loop over all current stream groups on every notification has potentially linear work per hint. Organize by story key/instance only when measured fanout warrants it. Better yet, coalesce same-story version hints, limit reconnect rates, and let GET fetch canonical state.

PostgreSQL NOTIFY is **not a durable message broker**. Use it for compact hints, not the sole copy of important events. Official [PostgreSQL NOTIFY documentation](https://www.postgresql.org/docs/current/sql-notify.html) describes payload and queue behavior. Durable decisions remain in SQL/outbox.

### 4. Outbox and workflow delivery

Current outbox uses short leases with `SKIP LOCKED`; a single loop claims/delivers one notice then checks the next. Keep transactional intent and idempotence. At higher load, add measured batching/multiple relay workers, lease retry/backoff/dead-letter/poison-topic handling and work-class fairness. Unknown notices should remain observable, not silently vanish.

Avoid one single FIFO queue where an indefinite slow model request can starve due clock-control activities. [Temporal worker recommendations](https://docs.temporal.io/best-practices/worker) distinguish worker pools/task queues based on workload and recommend deployment versioning and per-version resilience. Add pool separation when demand or failure tests justify it.

### 5. Document/object storage

A local filesystem CAS is excellent for Chamber and tests; multiple independent API/worker replicas require a **shared immutable storage adapter**. Use S3-compatible object storage with content-addressed keys if chosen, verify hashes on reads, stage objects **before** atomically promoting the SQL manifest root, and reconcile orphaned/under-replicated objects. [AWS S3 consistency](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) provides strong read-after-write for successfully written objects, but **does not** give a transaction spanning S3 and PostgreSQL. Define write ordering and recovery.

A deployment smoke test should start API replica A, worker B and reader C in independent containers, publish a source passage, then fetch by immutable hash from all three after the SQL root commit.

### 6. Model/provider quotas

Model traffic often dominates cost and wall-time. A single user generating 30 optional recaps must not consume all dispatch capacity while other users have pending required scenes. Introduce bounded **work classes and fairness** with per-user/story/global limits. Keep eligibility and priority as captured authority; don't let a fancy alert skip cost policy.

Track queue wait vs provider latency vs publication wait separately. Canceling an optional task isn't permission to discard a committed event or retry uncertain charges.

## A deployment shape that could scale without splitting game services

\`\`\`text
               Browser / SSR / SSE
                      |
       [stateless Next replicas]  [Nest API replicas]
                                      |
                     owner-scoped Postgres state + outbox
                                      |
                      [Temporal task service]
                         /             \
               short time/control    slow Storyteller IO
               worker pool          worker pool with budget
                         \             /
                  [shared CAS object store]
                         |
                    [derived cache]
\`\`\`

No prescriptive cloud provider or Kubernetes requirement. API and worker deploy independently, but application logic remains in one modular source product. A managed database, a shared object store and dedicated worker pools can plausibly handle significant independent-story load. A real 100-user shared scene still needs a domain actor/time model.

## Fault and resource fairness table

| Fault/load | Required behavior | Evidence |
| --- | --- | --- |
| Redis down | Correct authorized DB read without stale game permission | Cache adapter off + read/command test |
| API replica lost | Other replica reads same story/root; browser reconnects safely | Two-replica integration |
| Worker/process crash mid-effect | Retry sees committed receipt or legitimately settles once | DB+Temporal fault test |
| Slow model provider | Time-only work/decision safety unaffected where rules permit | Separate-class synthetic load |
| Shared CAS unreachable | No fabricated passage; preserve committed mechanics and retryable publication state | Object store fault test |
| Outbox relay stopped for hours | Notices are retained and later drained exactly once | Lease/backlog recovery |
| Same story hot lock | Contention visible, conflicts safe, bounded latency | Concurrent transaction benchmark |
| Massive reconnect | Bounded SSE streams, safe backoff/GET caching | Load and auth-isolation test |
| Small account trying to abuse generation | Per-account and global spend/concurrency caps | Test admission with 429/hold semantics |
| Model output huge/invalid | Bounded repair/hold, no log leak or infinite retries | Schema and budget tests |

## Operational questions to answer before “scalable” in README

- What is the **maximum sustainable** accepted boundary rate at a given machine/DB profile?
- How long after a due boundary does the **p99** settlement actually occur under burst load?
- How many active stories / SSE connections can one API instance support before latency climbs?
- How do we prevent one account or story from monopolizing model or worker slots?
- What is the slowest query at 100k published passages?
- Can API and workers independently restart against the same storage/root without data loss?
- What happens to an old in-flight Temporal workflow during a rolling code deployment?
- What is the worst-case cost (real provider money) of a valid one-hour unattended routine?
- Can we remove all derived memory indices and still rebuild exact committed truth?
- What is **not** supported, e.g., 100-person shared scene hot contention?

Honest answers and reproducible charts beat an architecture with every fashionable distributed component installed.

## Not selected until evidence

Automatic partitioning/sharding of stories, multi-region active-active, event-sourced microservices, high-frequency ECS, Kafka or RabbitMQ for every event, always-on vector DB, Kubernetes HPA and per-NPC agent replicas. Each solves a different possible future workload and has failure/cost implications. The **architectural seams** should permit them where later justified, but not require them today.
