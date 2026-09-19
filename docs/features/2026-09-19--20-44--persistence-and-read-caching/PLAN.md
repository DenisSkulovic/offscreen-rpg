# Persistence and read-caching implementation plan

Feature: [Persistence ownership and safe read caching](FEATURE.md).
Execution scope: approved architecture audit and implementation. No hosted cache, provider call or production deployment.
Implementation owner: Codex for the current requested pass.

## P1 — Ownership and projection identity (implemented)

- Outcome: document the actual Drizzle ownership, define the cache port and make snapshot freshness an explicit compact database projection.
- Owners: `docs/technical/persistence-and-caching.md`, application README, story read/persistence modules and shared runtime logging.
- Keep domain transactions local. Introduce no generic repository abstraction. The identity must cover every value included in the public snapshot or conservatively miss the cache.
- Add focused injected-cache evidence for hit, version miss, malformed value, wrong owner and unavailable cache.
- Exit: application reads are cache-capable without importing Redis and remain correct with caching disabled.

## P2 — Optional Redis adapter and composition (implemented)

- Outcome: one infrastructure package owns connection lifecycle, bounded JSON operations, timeouts and safe failure classification.
- Compose it optionally in the API and local stack. No worker dependency is needed until a worker owns a cacheable read.
- Configuration is explicit; absent Redis configuration selects the disabled cache. Readiness does not fail solely because optional caching is unavailable.
- Exit: local injected/Redis runs share one application contract and cache outage falls back to PostgreSQL.

## P3 — Measurement and additional projections (queued)

- Measure snapshot query/cache latency, hit rate, payload size and database load under Chamber polling.
- Add list/history caching only if evidence justifies it and each projection has a complete freshness identity. Do not cache writes or authorization.
- Exit: keep, tune or remove each cache from evidence; document any new projection owner.

## Current checkpoint

- Current phase and exact next action: P3 is evidence-driven and queued; first commit the implemented P1/P2 slice, then measure before caching another projection.
- Base/reviewed Git revision and relevant uncommitted changes: base `a66deec`; P1/P2 implementation and documentation are uncommitted.
- Actual checks/results for this revision; checks not run: application, cache, API and integration workspaces compile. A real local Redis set/get/expiry adapter probe passed. Full story/browser suites were not run.
- Unresolved findings/blockers: cache hit-rate and latency under Chamber polling are unmeasured; list/history remain deliberately uncached. The snapshot identity adds one compact authoritative query on every read.
- Provider spend and accounting certainty: $0; no provider calls; cumulative OpenRouter usage unverified.
