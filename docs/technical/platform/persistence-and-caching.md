# Persistence and caching

PostgreSQL is the sole application authority. Canonical SQL identity, the versioned or append-only source, and the transaction stay on [who owns the durable record](./data-and-persistence.md#who-owns-the-durable-record). This page owns caches. Drizzle schemas and connection lifecycle live in `@offscreen/db`; domain reads, commands and transaction boundaries live in `@offscreen/application`. API controllers, Temporal workflows and UI code call application capabilities instead of querying tables. Activity settlement, offers, rolls, story passages, outbox notices and accounting reservations remain in the same PostgreSQL transaction when their invariants require atomicity.

This codebase intentionally does not use a generic repository per table. A generic `saveStory()` abstraction would hide row locks, revision fences, isolation levels, joins and atomic multi-table transitions that are part of the game rules. Small persistence helpers are appropriate when several operations share the same domain invariant; raw Drizzle access is appropriate inside the owning application module when the query itself expresses that operation.

## Read models

Read modules project runtime-validated public contracts. `stories/reads.ts` builds the player snapshot under a read-only repeatable-read transaction because it spans story, passage, campaign, activity, generation and accounting data. Pagination queries retain ownership predicates and bounded limits. A read model is not command authority: commands reacquire their rows and recheck revisions under their own transaction.

Each cacheable projection needs a compact **projection identity** that changes whenever its public output can change. The identity is read from PostgreSQL with ownership enforcement before a cache lookup. Cache keys use only opaque identifiers, contract version and projection identity; never prose, labels, email addresses, credentials or private plans.

## Redis boundary

Redis is an optional acceleration layer for measured read pressure. The application depends on a narrow cache port, never a Redis SDK. Deployables own the adapter and connection lifecycle. Values are validated against the same public contract after decoding, size-bounded and short-lived.

Use version-addressed cache-aside entries rather than correctness depending on delete messages:

1. Read the owner-scoped current projection identity from PostgreSQL.
2. Read `projection-type:schema-version:owner-id:entity-id:projection-identity`.
3. Validate a hit. On miss or safe cache failure, build the projection from PostgreSQL.
4. Store only under the captured identity with a bounded TTL. If a command committed meanwhile, the store can populate only the old key; the next reader asks for the new key.

Explicit deletion may reclaim space or improve hit rate, but it is not the consistency mechanism. Pub/sub invalidation, local in-memory mirrors and distributed locks are unnecessary until measured needs justify them.

Redis never supplies command preconditions, ownership, current private offers, transaction locks, timers, outbox delivery, budget admission, provider settlement or the only copy of a record. An outage degrades eligible reads to PostgreSQL. It must not make commands fail, make stale content authoritative or turn readiness red when caching is configured as optional. A stale cache snapshot does not override the canonical SQL version. That version stays on [story snapshot and chronology](./data-and-persistence.md#story-snapshot-and-chronology). Safe logs include the cache operation, projection type and failure class, not keys containing user data or cached payloads.

A restart, a flush, or a lost connection drops cache entries only. That is not loss of authoritative game state. Do not use Redis for durable workflows or payment locks. Durable waits and delivery stay on Temporal. Spending and settlement stay in PostgreSQL, with the record on [who owns the durable record](./data-and-persistence.md#who-owns-the-durable-record). A miss after expiry, flush, or restart is the expected degraded read. When the application is using the cache port, the next read rebuilds from PostgreSQL.

The disposable Kubernetes lab may run one Redis process behind a ClusterIP Service, with a resource cap and a health probe. That process is acceleration for the lab exercise. It is not wired to the game, and it is not the Compose Redis used by local development. The procedure is [Kubernetes Redis](../../runbooks/kubernetes-redis.md).

## Current state

This section is a realization record of the cache port and the story-snapshot cache already described here. The cache rule stays in [Redis boundary](#redis-boundary).

The application exposes a cache port and the API optionally composes the Redis adapter from `@offscreen/cache`. Browser/API responses still use `Cache-Control: no-store`. The frequently polled story snapshot is cached only after an owner-scoped PostgreSQL identity check covering narrative/gameplay view version, current generation status/publication and the public accounting totals. A miss is rebuilt under repeatable-read isolation and stored under the identity actually observed during that build. Redis operations have short deadlines, bounded payloads and short TTLs; adapter or value failures fall back to PostgreSQL with safe structured warnings. Story lists and history stay database-backed until workload evidence supports caching them.
