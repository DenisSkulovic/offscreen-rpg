# Cache: optional Redis projection adapter

`@offscreen/cache` provides an **optional** Redis-backed adapter for application read caching. It is a performance dependency, not a new authority for story state, choices, billing or time. [Persistence and caching](../../docs/technical/platform/persistence-and-caching.md#redis-boundary) owns the intended behavior. The neutral port is [`@offscreen/cache-port/read-cache`](../cache-port/src/read-cache.ts) (`ReadCache`, `ReadCacheWrite`, `disabledReadCache`). Story Engine read paths import that port directly. This package depends on `@offscreen/cache-port`, not Story Engine.

## Find and reason about the adapter

[The root implementation](src/index.ts) exports `createCacheAdapter`, `CacheAdapter` and `CacheAdapterIncident`. Its configuration validates `REDIS_URL`, a key prefix, connect timeout and operation timeout. The adapter's incident callback reports failures without making cached data authoritative. `createCacheAdapter` also returns `store`, a `CacheStore` on the same connection. `./redis` exports `createRedisStore` for the v1 byte envelope.

If a public snapshot looks stale, follow the **application read projection and invalidation identity** first, then this adapter. Never "repair" correctness by assuming a Redis value overrides PostgreSQL. A missing/stopped Redis instance must not grant different command semantics.

The package exposes `build`, `typecheck` and `test`. `./core` and `./codecs` are the CACHE01 typed foundation. `./redis` is the CACHE02 byte store. `./strategies` is CACHE03 `bindCache` with single-flight and an origin bulkhead. `./memory` is the CACHE05 weighted memory store and tier composition. The root export keeps the legacy Redis JSON adapter. Those tests use fakes and do not start Redis. `test/distributed/` is the CACHE07 harness: unit tests refuse a live run unless `CACHE07_ALLOW_DISPOSABLE_REDIS=1` and `--live` are both set. That live command has not been run, so this package is not distributed Redis proof. Consumer read/invalidation tests still own integration behavior.
