# Cache: optional Redis projection adapter

`@offscreen/cache` provides an **optional** Redis-backed adapter for application read caching. It is a performance dependency, not a new authority for story state, choices, billing or time. [Persistence and caching](../../docs/technical/persistence-and-caching.md) owns the intended behavior; application [read-cache interfaces](../application/src/cache/read-cache.ts) own the consumer contract.

## Find and reason about the adapter

[The single implementation](src/index.ts) exports `createCacheAdapter`, `CacheAdapter` and `CacheAdapterIncident`. Its configuration validates `REDIS_URL`, a key prefix, connect timeout and operation timeout. The adapter's incident callback reports failures without making cached data authoritative.

If a public snapshot looks stale, follow the **application read projection and invalidation identity** first, then this adapter. Never "repair" correctness by assuming a Redis value overrides PostgreSQL. A missing/stopped Redis instance must not grant different command semantics.

The package exposes `build` and `typecheck`, **no package-local test suite**. Cache integration belongs to the consumer's read/invalidations tests. Do not start Redis or mutate cache keys merely to inspect this README.
