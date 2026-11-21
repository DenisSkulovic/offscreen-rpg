# MA02 | invert the Cache → Application type dependency

**State:** Planner-ready algorithm. **Kind:** code, dependency ownership correction, no user behavior. **Integration target:** `undertaking/storyteller-workshop`. Branch: `change/ma02-cache-port-inversion`. **Safe peer:** MA03 if package manifests/lockfile commits are serialized by one custodian.

**Planning source baseline:** re-inspected source from provided checkout at `dac6b69813b52ecb1f202158791deaa3b7ea89d7`, 2026-11-21; live branch HEAD must still be checked at dispatch. Remote source inspected; no compiler/test execution. Execution starts when the owner commissions this Change.

**Branch rule:** A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: this Change integrates on the active `undertaking/storyteller-workshop` branch. Use a linked worktree and `change/ma02-cache-port-inversion` from that HEAD. Leave the primary checkout on its current branch. Revalidate named source anchors against that HEAD, preserve in-flight Writer work, and integrate only into `undertaking/storyteller-workshop`. Commissioning this Change does not start its siblings.

**Evidence:** `packages/cache/src/index.ts` imports `type ReadCache` from `@offscreen/application/cache`, so `packages/cache/package.json` declares a dependency on the huge `@offscreen/application` package merely to implement a Redis adapter. The port's definition is `packages/application/src/cache/read-cache.ts`, 32 lines, with `ReadCache`, `ReadCacheWrite`, `CacheIncident`, `ReadCacheOptions`, `disabledReadCache`. Domain/app must not be the lowest level consumed by infrastructure.

**Chosen solution:** Move only `ReadCacheWrite`, `ReadCache`, and `disabledReadCache` (NOT application-specific `CacheIncident` / `ReadCacheOptions`) as the *contract and neutral disabled adapter* to the already shared `@offscreen/contracts/read-cache` (new explicit subpath); re-export the same names from `@offscreen/application/cache` for compatibility. Change the Redis adapter to import the type from `@offscreen/contracts/read-cache`; `@offscreen/cache` now depends on contracts and not application. Do not add a new micro-package, alter Redis timeout behavior, cache keys/permissions or data formats.

**Proof:** same structural types, unchanged optional cache semantics, no `cache → application` package edge, stable old consumers, typecheck/build all touched consumers. [Source](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
