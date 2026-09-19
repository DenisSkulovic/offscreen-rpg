# Persistence ownership and safe read caching

Status: Implementing
Approval: The owner explicitly requested a database-architecture review and properly managed Redis caching/cache busting on 2026-09-19.

## Intended outcome

Maintainers can find each database interaction at the domain operation that owns its transaction, while high-frequency player reads may use Redis without weakening PostgreSQL authority. Adding a cache must not require scattering Redis calls through commands or teaching gameplay code two sources of truth.

## Representative flow

The player reloads an unchanged story repeatedly. The API validates ownership and obtains one compact projection identity from PostgreSQL. A matching Redis entry returns the already validated public snapshot. After an activity, publication, settings change, generation-state change or accounting change, the projection identity changes; the next read cannot address the old entry and rebuilds a consistent snapshot from PostgreSQL. Old entries expire naturally.

If Redis is unavailable, malformed, slow or contains an entry for another schema version, the read falls back to PostgreSQL and emits a safe diagnostic. Commands, worker operations and timers continue normally. Redis never authorizes an action, supplies private plans, arbitrates a retry or preserves the only copy of data.

## Scope and boundaries

- Keep Drizzle access inside `@offscreen/application` domain operations and `@offscreen/db` lifecycle/schema code. API controllers and workflows receive application capabilities, not query builders.
- Preserve domain-local persistence helpers and explicit transactions. Do not add generic repositories, a unit-of-work wrapper around Drizzle, or CRUD services per table.
- Add a small cache port at the application read boundary and an optional Redis infrastructure adapter composed by deployables.
- Cache only validated public read models with owner-scoped, schema-versioned, projection-versioned keys and bounded TTLs/payloads.
- Prefer version-addressed entries over delete-based invalidation. A stale writer may populate only an old key; it cannot overwrite the key for a newer committed projection.
- Redis failures are soft for eligible reads. PostgreSQL failures remain real failures; cached data is not an offline authority mode.
- Do not cache command preconditions, story locks, current private offers/plans, provider budgets, outbox delivery, sessions, deadlines or canonical source documents in this feature.
- HTTP responses remain private and `no-store`; server-side Redis caching does not authorize browser/shared-proxy caching.

## Acceptance

1. A package-level guide identifies schema, transaction, read-projection and infrastructure-cache ownership.
2. Normal API/worker code cannot import a Redis client through the application package.
3. Repeated unchanged snapshot reads can hit an injected cache after a compact PostgreSQL identity check.
4. A changed projection identity forces a PostgreSQL rebuild without requiring synchronous key deletion.
5. Wrong-owner, malformed, oversized, expired and unavailable cache entries never bypass PostgreSQL ownership or validation.
6. Cache keys contain no player prose or credentials and values contain only the existing public snapshot contract.
7. Cache failures produce bounded safe logs and do not fail an otherwise healthy database read.
8. Local Redis is optional: the application works with the disabled adapter and the existing minimum stack remains usable.

## Decisions still needed

None for the first slice. Production Redis vendor, measured TTL and whether story-list/history projections merit caching require workload evidence and are deliberately deferred.

## Owning specifications

- [Architecture](../../technical/architecture.md)
- [Code quality](../../engineering/code-quality.md)
- [Code navigation](../../engineering/code-navigation.md)
- [Persistence and caching](../../technical/persistence-and-caching.md)

