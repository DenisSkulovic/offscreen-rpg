# Cache: optional Redis projection adapter

`@offscreen/cache` provides an **optional** Redis-backed adapter for application read caching. It is a performance dependency, not a new authority for story state, choices, billing or time. [Persistence and caching](../../docs/technical/platform/persistence-and-caching.md#redis-boundary) owns the intended behavior. The neutral port is [`@offscreen/cache-port/read-cache`](../cache-port/src/read-cache.ts) (`ReadCache`, `ReadCacheWrite`, `disabledReadCache`). Story Engine read paths import that port directly. This package depends on `@offscreen/cache-port`, not Story Engine.

## Public import paths

| Export | Import | Purpose |
| --- | --- | --- |
| `.` | `@offscreen/cache` | Legacy Redis JSON adapter surface: `createCacheAdapter`, `buildCacheAdapterFromConnection`, adapter types |
| `./core` | `@offscreen/cache/core` | Typed `CacheStore`, policy, keys, telemetry, `createDisabledStore`, `createFakeStore` |
| `./codecs` | `@offscreen/cache/codecs` | JSON and bytes codecs |
| `./redis` | `@offscreen/cache/redis` | `createRedisStore` (v1 byte envelope) |
| `./strategies` | `@offscreen/cache/strategies` | `bindCache`, `createSingleFlight`, `CacheOverloadError`, `SingleFlight` |
| `./memory` | `@offscreen/cache/memory` | Weighted in-process store and tier composition |

Package `exports` keys and emitted `dist/` paths are unchanged. VER07/VER08 and other consumers keep these public import contracts.

## Implementation owners (navigation)

| Concern | Owner modules |
| --- | --- |
| Root adapter barrel | [`src/index.ts`](src/index.ts) reexports from [`src/cache-adapter.ts`](src/cache-adapter.ts) |
| Legacy Redis JSON adapter + connection wiring | [`src/cache-adapter.ts`](src/cache-adapter.ts), [`src/runtime/`](src/runtime/) |
| Redis byte store | [`src/adapters/redis-store.ts`](src/adapters/redis-store.ts); reexported via [`src/redis/`](src/redis/) |
| Cache-aside `bindCache` | [`src/cache-aside/bind-cache.ts`](src/cache-aside/bind-cache.ts); reexported via [`src/strategies/`](src/strategies/) |
| Local single-flight (process-local coalescing, not distributed locks) | [`src/resilience/single-flight.ts`](src/resilience/single-flight.ts) |
| Origin bulkhead | [`src/resilience/bulkhead.ts`](src/resilience/bulkhead.ts) |
| Disabled store (production bypass) | [`src/core/disabled-store.ts`](src/core/disabled-store.ts) |
| Test fakes | [`src/core/test-stores.ts`](src/core/test-stores.ts) (`createFakeStore`; compatibility reexport of `createDisabledStore`) |
| Memory / tiered stores | [`src/memory/`](src/memory/) |

Behavioral package tests live under `src/*.test.ts` with behavior-based names (for example `cache-adapter.test.ts`, `single-flight.test.ts`, `bounded-cache.test.ts`). The test script builds then runs `node --test dist/*.test.js`.

## Semantics (no new guarantees)

- **Optional accelerator:** cache miss, bypass, or Redis unavailability must not change command authority or SQL truth. A missing/stopped Redis instance must not grant different command semantics.
- **Legacy root adapter:** `createCacheAdapter` still serves legacy JSON get/set and also returns a `CacheStore` on the same connection. Prefer typed `CacheStore` + `bindCache` for new work.
- **Local single-flight:** coalescing is in-process only. This package does not implement distributed locks or cross-replica flight coordination.
- **Bounded command settlement:** Redis operations use admission caps, deadlines, and actual-settlement distinctions documented in the technical owner; package tests use injected clients/fakes and are not live Redis proof.

If a public snapshot looks stale, follow the **application read projection and invalidation identity** first, then this adapter. Never "repair" correctness by assuming a Redis value overrides PostgreSQL.

## Tests and verification status

The package exposes `build`, `typecheck` and `test`. Package tests use fakes and do not start Redis. `test/distributed/` contains the historical CACHE07 harness. **Do not run its legacy live CLI**: cleanup and verdict defects found in the 2026-11-25 source audit. VER06 migrates its scenarios to the shared verification runner; VER07 owns Redis/memory acceptance, VER08 SQL-origin and actual Story Engine snapshot acceptance. CACHE08 source Done for residual Redis lifecycle, single-flight retention, tier write verdict and envelope/decode bounds defects (package tests with fakes). CACHE09 is navigation and test naming only; public contracts and runtime guarantees are unchanged. These commands are planned, not yet implemented: `pnpm verify package cache --plan`, `pnpm verify package cache --profile recovery --live`. No live Redis or SQL PASS is claimed. Consumer domain authority remains unchanged.
