# Stateful systems and durable operations: design decisions and real consequences

**For:** backend architects, data engineers, Temporal/queue designers, API integrators, reviewers and test strategists. **Scope:** data authority, concurrency, persistence, caching, async coordination and external systems. It is **not** the game's Storyteller cost policy. Read the relevant section, not the entire manual, when the design involves shared state or uncertain effects.

**Route:** [data ownership](#1-design-the-state-and-data-lifecycle) · [SQL choice](#2-choose-concurrency-control-from-the-invariant) · [cache trade-offs](#3-caches-and-read-models-are-consistency-choices) · [async design](#4-synchronous-async-and-workflow-patterns) · [external integration](#5-third-party-protocols-are-products-to-maintain) · [operations](#6-operability-scale-and-security-are-design-inputs) · [proofs](#7-design-choices-through-concrete-cases).

## Guiding idea

Many reasonable architectures are correct **under different assumptions**. Selecting one requires describing the business result, read/write workload, consistency need, identity, life cycle, failures, scale and operational capacity. A design can pass all normal tests and still be the wrong answer for its actual use.

The central objects are not “database tables” or “queues.” They are **intents, records, revisions, projections, attempts, deadlines, ownership and externally visible effects**.

### 1. Design the state and data lifecycle

| Question                                  | Why it matters                                                     | Valid possible answers                                                      |
| ----------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Where does authoritative truth live?      | Two writers need conflict or merge semantics                       | SQL ledger; immutable document root; external provider for an external fact |
| What is the entity identity?              | Without a stable identity, updates/replays confuse objects         | Tenant+resource ID, operation ID, versioned document ID                     |
| What is the expected write frequency?     | It changes contention, storage, caching and indexing               | Rare user edit, hot inventory counter, append-only event                    |
| What reads do we need?                    | A normalized write schema may not serve search/history efficiently | SQL joins/indexes; materialized read view; bounded lexical index            |
| Is there a known schema?                  | Flexibility and validation need not be all-or-nothing              | Relational core; JSONB extension; typed document metadata                   |
| How do versions evolve?                   | Old snapshots and external messages persist                        | Schema revision, compatibility strategy, backfill, new root                 |
| What is temporary?                        | Derived read/cache indexes should be rebuildable                   | Redis cache, search index, UI state; not financial receipt                  |
| What is the retention/recovery objective? | It determines backups, deletes, audit, migration and restore       | Short cache TTL, long-lived history, regulated record                       |

**Choice space:** relational DB for interrelated transactions and constraints; document store for evolving cohesive records; immutable content-addressed documents for auditable versions; search engine for specialized retrieval; key/value cache for ephemeral read acceleration; queue for delivery coordination. One product may use several, but each new system adds ownership/invalidation/operational cost.

A “flexible” field without validation makes writes cheap but interpretation uncertain; dozens of normalized tables for rarely read descriptive fields make queries and migrations expensive. Choose the representation from _access patterns, invariant enforcement and evolution_, not a universal favorite database.

**Offscreen RPG:** [technical data](../../docs/technical/data.md) owns current SQL semantics; [canonical files](../../docs/technical/canonical-files.md) owns the file-based target. A manual must not pretend all that migration work is complete.

## 2. Choose concurrency control from the invariant

There is no universal “use transactions” recipe.

| Pattern                              | When appropriate                                                               | What it does not guarantee                                             |
| ------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Unique/exclusion constraint**      | Identity uniqueness, no overlapping ranges                                     | Correct application of side effects before insert                      |
| **Atomic conditional UPDATE**        | Claim stock/allowance or change field when a predicate holds                   | Multi-row global invariant unless the predicate/coordination covers it |
| **Optimistic version check**         | Moderate conflict, stale editing, compare-and-swap                             | Absent-row predicate or independently changed related rows             |
| **SELECT FOR UPDATE**                | Existing known resource, ordered transaction-local coordination                | Locking _nonexistent_ matching rows or remote side effects             |
| **Serializable transaction + retry** | A multi-read/predicate invariant needs transaction-level serial execution      | Guaranteed no abort; reusing stale decision outside retry              |
| **Advisory/coordination lock**       | No suitable row to lock, shared operation naming with disciplined participants | Correctness if some writer ignores protocol                            |
| **Append-only receipt/event**        | Evidence and idempotent replay are central                                     | Automatic consistent projections, correct event consumers              |
| **Workflow/lease/fence**             | Slow work spanning transactions/timeouts/crashes                               | SQL or provider exactly-once semantics by itself                       |

### Four different anomalies

1. **Lost update:** two writers read capacity 5; both write 4. Two sales but one decrement. Prefer current-row atomic arithmetic and predicate, or a correctly locked/versioned transaction.
2. **Absent-row race:** both queries return no reservation rows and attempt create. A row lock protects _existing_ records; use a uniqueness/exclusion constraint or shared coordination identity.
3. **Write skew:** two transactions each read “two doctors on call,” then remove different doctors. Both writes can succeed at snapshot isolation while violating “at least one.” Reformulate or coordinate the cross-row invariant.
4. **Deadlock:** A locks Friday then Saturday, B locks Saturday then Friday. Consistent lock ordering reduces the cycle, but application should still handle SQLSTATE `40P01` without replaying external effects.

**Design discriminant:** Are competing writers modifying one record, multiple existing records, or a **predicate over records that may not exist**? That answer changes the correct pattern more than the ORM choice.

**Serializable retry** requires new transaction and fresh reads/decision. Don't compute a stale effect outside a transaction and merely rerun the write. Never put non-idempotent external provider calls in a transaction closure that can retry.

Deep: [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [study: Transactions and isolation](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS330-relational-databases/CS330-L03-transactions-and-isolation.md).

## 3. Caches and read models are consistency choices

The first caching question should be **“which read is expensive, how stale may it be, and where will truth live?”**, not “Redis or Memcached?”

| Approach                              | Fit                                                           | Design consequence                                           |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Improve SQL/index/query or reduce N+1 | Often the best starting point                                 | No second state copy/invalidation protocol                   |
| Per-process memory cache              | Small service-local hot repeated reads                        | No cross-instance coherence; process restart forgets         |
| Shared Redis cache-aside              | Frequent reads, acceptable staleness, multiple instances      | Invalidation and stale repopulation need deliberate protocol |
| HTTP/CDN caching                      | Public/static/read-mostly content                             | Correct cache-control, auth variation and invalidation       |
| Materialized view/read projection     | Heavy aggregate/detail reads over authoritative SQL/events    | Lag, rebuild/versioning and privacy/tenant scoping           |
| Write-through cache                   | Cache needs immediate write reflection under defined contract | Partial write/error ordering must be designed                |
| Write-behind buffer                   | High write throughput with acceptable deferred durability     | Data-loss/replay/order policy and recovery complexity        |
| No cache                              | Expensive invalidation or correctness-sensitive action        | Often correct for transactional command decisions            |

**Key dimensions:** identity (tenant/user/route/version/filter), freshness (TTL or event invalidation), singleflight/thundering herd, eviction/memory growth, cold start, visibility of stale states, privacy, failure fallback, metrics.

### The invalidate-then-repopulate race

```text
T0 Reader R starts slow DB read of old version 10.
T1 Writer commits version 11 and invalidates cache.
T2 R finishes and stores old version 10 in now-empty cache.
T3 New readers repeatedly see stale version 10.
```

A short TTL reduces _duration_, not the mechanism. Possible countermeasures: versioned keys/compare-on-set, read-after-write discipline, generation fencing, delayed invalidation as a last-resort context-dependent tactic. Pick according to available version source and acceptable staleness.

### A high hit rate may still be a bad cache

A 99% hit rate says nothing about **which** 1% misses. If all misses occur on a hot key at the same instant, the DB may collapse during a stampede. If a cache leaks a previous tenant's data once, high hit rate is not a success.

**Operational question:** if Redis is unavailable, can the system safely read PostgreSQL (perhaps slower), or does it need to deny an operation to preserve a limit? A cache that silently authorizes a command is a design mistake unless explicitly specified as a consistency mechanism.

Deep: [study: Caching, freshness and invalidation](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE320-backend-services/SE320-L02-caching-trading-freshness-for-speed.md).

## 4. Synchronous, async and workflow patterns

Choose the coordination shape by duration, dependencies, deadlines, external ambiguity and recovery, not just “scale.”

| Shape                                      | When it makes sense                                                   | New responsibilities                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Synchronous request → DB transaction       | Bounded local operation whose result the caller needs now             | Conflicts, latency, timeout, auth, rollback                                           |
| API accepts request → job queue            | Longer/retryable work with separate status                            | Job identity, dedupe, progress, cancellation, worker recovery                         |
| Transactional outbox → worker              | DB commit must not lose the follow-up delivery intention              | Relay duplication, consumer idempotency, backlog observability                        |
| Temporal durable workflow + Activities     | Multi-step waits, deadlines, retries, human decisions, long lifecycle | Replay determinism, activity idempotency, versioning, history and operational service |
| Orchestrated saga / explicit state machine | Multi-system business process with compensations and partial commits  | Compensations can fail; reconciliation and manual intervention                        |
| Event fan-out / subscriptions              | Multiple independent consumers of committed facts                     | Ordering, delivery guarantees, schema evolution and lag                               |
| Background cron                            | Independent scheduled occurrence with repeatable bounded work         | Occurrence identity, timezone/DST, lease and duplicate run fencing                    |

**Subtlety:** synchronous vs async is not the same as consistent vs inconsistent. Async can preserve rigorous business guarantees under explicit state transitions; synchronous HTTP cannot guarantee completion if the caller disconnects after dispatch.

### One intent, many attempts

Idempotency key identifies the business intent (plus stable meaningful request parameters, account/tenant scope and result). An _attempt_ is one execution of that intent. Repeated delivery may produce multiple attempts without authorizing multiple effects.

A naive check-then-insert can race. Claim intent atomically and verify same-key payload matches. If the same key arrives with a different operation, **conflict**, don't silently return the old result or do new work.

### A time-based job requires a business occurrence

```text
"every day at 02:00" is not enough.
```

Which timezone? DST spring gap or repeated autumn hour? Business date or UTC instant? Catch-up after downtime? One occurrence ID must survive duplicate launches; leases/fencing stop stale workers from committing after ownership moves.

**Temporal/workflow principle:** durable orchestration is not the state authority. Activity/application must recheck current ownership and idempotency. A workflow completion is not automatically a committed game result.

Deep: [Temporal docs](https://docs.temporal.io/), [study: scheduled jobs and distributed execution](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE325-backends-in-the-wild/SE325-L03-scheduled-jobs-time-and-distributed-execution.md).

## 5. Third-party protocols are products to maintain

An external system defines another failure/meaning domain. Integration quality is more than JSON parsing.

**Decision dimensions:** provider contract stability, authentication/token refresh/rotation, webhook authenticity, pagination snapshot semantics, API rate limits, retry policy, idempotency capabilities, correlation IDs, error categorization, data provenance, operational support and migration/exit cost.

### Remote timeout is not a business failure

```text
Caller                  Provider
   |---- command --------->|
   |                       | may commit effect
   |         lost response |
   |<----- timeout --------|
   |       UNKNOWN         |
```

If the request was definitely never sent, a guarded retry may be safe. After dispatch without reliable provider identity/settlement, there may be no way to determine whether the effect occurred. **Blind retry can duplicate a charge, booking or model inference.**

Use separate states for known unsent, dispatched, result known, uncertain, reconciled, and local-publication failure. After known provider success, a failed local publication should normally retry **publishing the saved result** under current authority, not pay for a fresh provider call.

**Webhook trap:** a signed webhook is evidence about an external state; it is not an unconditional command to advance a cancelled or replaced local operation. Events may arrive late, duplicated or out of order. Bind them to current intent identity and state.

**Pagination trap:** a short page is not necessarily the last page; an opaque cursor can be tied to a query/snapshot, and a complete cursor traversal may still have a consistency gap if the dataset mutates during extraction.

Deep: [study: third-party integrations](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE325-backends-in-the-wild/SE325-L05-surviving-third-party-integrations.md), [distributed partial failures](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS430-distributed-systems/CS430-L01-distributed-systems-and-partial-failure.md).

## 6. Operability, scale and security are design inputs

**Availability and failure domain:** one failed provider must not necessarily stop other tenants, accounts or unrelated operations. Shared windows may intentionally constrain all; account-owned uncertainty must not accidentally become a platform-wide shutdown.

**Performance:** distinguish throughput, tail latency, queue lag, hot-row contention, connection pools, DB indexes, payload size, memory, event loop blocking and downstream rate limits. A new message queue doesn't fix slow SQL or CPU-bound rendering. Design after measuring where work accumulates.

**Observability:** specify correlation from API intent → accepted DB row → outbox delivery → workflow/attempt → provider evidence → publication. Log IDs, state transitions, durations and failure classes while redacting private prose/secrets. A metric named `success` needs a precise stage definition.

**Security/tenant scope:** authorization is enforced at every externally reachable command/read, not by hiding buttons. Cache keys and search indexes can leak tenant data too. Avoid external data/webhooks becoming instructions with authority; validate source and semantic constraints separately.

**Lifecycle:** backups, retention, deletes, GDPR-type requests, migrations and schema evolution can reshape the architecture. A reliable online migration may require dual-read/backfill/contract phases, not just an ALTER TABLE.

**Costs:** each service adds deploy, credentials, alerts, runbooks, tracing, dependency churn and recovery complexity. One isolated platform feature can create more operational work than all its business logic. The simple monolith is often the appropriate economic choice until measured needs change.

## 7. Design choices through concrete cases

### Case 1: Two concurrent resource claims

In one SQL transaction, both requests read "available," then write different rows. Which invariant spans those rows? A unique constraint may cover conflict identity; a shared authoritative parent lock or serializable transaction may be required for broader predicates. One normal unit test cannot prove the interleaving. Choose the technique from _the exact shared invariant_.

### Case 2: A cached story snapshot seems fresh but is older than published version

A TTL cannot alone prevent stale response repopulation. Compare cache identity/version semantics, invalidation and accepted write publication; prefer source versions or bypass for authoritative actions. Don't globally disable caching before identifying the mechanism.

### Case 3: A long-running operation has been queued twice

Possible architecture: synchronous command if bounded, or durable operation with outbox/job and status resource. Exactly-once business outcome depends on a persisted operation key/receipt, not counting how many times the worker started. Don't assume a Temporal ID is sufficient if app admission can create a new business intent.

### Case 4: An external provider timed out after request transmission

Possible actions differ: reconcile by provider correlation ID, wait for webhook/lookup, safely retry under provider-supported idempotency, or hold uncertain liability for operator action. A new attempt with a new identity is **not** automatically safe. The UI must represent unknown rather than success/failure fiction.

### Case 5: The architect proposes sharding/microservices “for future scale”

Demand a measured scaling limit, request/tenant routing scheme, cross-shard invariant, migration plan, backup recovery, team/ops capacity and latency budget. A SQL index, read projection or selective worker may solve the real bottleneck. Sharding multiplies consistency and operations questions before it solves them.

## Role deliverables and verification

| Role                       | Required contribution                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Data architect             | Truth identity, read/write workload, schema trade-offs, version/migration strategy        |
| Backend architect          | Synchronous/durable work choice, operation lifecycle, error/transport contract            |
| Async/Temporal specialist  | Delivery, retry, waits, fences, cancellation and recurrence semantics                     |
| Cache/performance reviewer | Actual bottleneck, identity, acceptable staleness, invalidation and failure fallback      |
| Security reviewer          | Tenant boundaries, authorization, secrets, external trust and abuse limits                |
| Independent critic         | One alternative design that wins under different constraints, one falsifying interleaving |
| Test strategist            | Minimal deterministic plus real DB/worker/fault-injection evidence tied to the guarantee  |

**Don't mechanically demand every consideration for every task.** Identify which design dimensions might plausibly change the choice. An expert makes the decision _conditional on the right facts_, not indefinitely complicated.

**Deeper study:** [SE330 architecture patterns](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE330-software-architecture/SE330-L02-architecture-patterns-and-their-consequences.md), [CS330 transactions](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS330-relational-databases/CS330-L03-transactions-and-isolation.md), [SE320 caching](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE320-backend-services/SE320-L02-caching-trading-freshness-for-speed.md), [CS340 data architecture workshop](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS340-data-systems-beyond-relational/CS340-L07-the-data-architecture-workshop.md), [CS430 workflows](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS430-distributed-systems/CS430-L05-designing-reliable-business-workflows.md).
