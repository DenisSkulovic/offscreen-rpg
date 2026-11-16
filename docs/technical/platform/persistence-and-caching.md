# Persistence and caching

PostgreSQL is the sole application authority. Drizzle schemas and connection lifecycle live in `@offscreen/db`; domain reads, commands and transaction boundaries live in `@offscreen/application`. API controllers, Temporal workflows and UI code call application capabilities instead of querying tables. Activity settlement, offers, rolls, story passages, outbox notices and accounting reservations remain in the same PostgreSQL transaction when their invariants require atomicity.

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

Redis never supplies command preconditions, ownership, current private offers, transaction locks, timers, outbox delivery, budget admission, provider settlement or the only copy of a record. An outage degrades eligible reads to PostgreSQL. It must not make commands fail, make stale content authoritative or turn readiness red when caching is configured as optional. Safe logs include the cache operation, projection type and failure class, not keys containing user data or cached payloads.

## Current state

The application exposes a cache port and the API optionally composes the Redis adapter from `@offscreen/cache`. Browser/API responses still use `Cache-Control: no-store`. The frequently polled story snapshot is cached only after an owner-scoped PostgreSQL identity check covering narrative/gameplay view version, current generation status/publication and the public accounting totals. A miss is rebuilt under repeatable-read isolation and stored under the identity actually observed during that build. Redis operations have short deadlines, bounded payloads and short TTLs; adapter or value failures fall back to PostgreSQL with safe structured warnings. Story lists and history stay database-backed until workload evidence supports caching them.
