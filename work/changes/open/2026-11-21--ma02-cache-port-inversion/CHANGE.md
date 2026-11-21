# MA02 | invert the Cache → Application type dependency

**State:** Planner-ready algorithm; execution gated on `undertaking/modular-monolith` activation. **Kind:** code, dependency ownership correction, no user behavior. **Target:** `undertaking/modular-monolith`, `change/ma02-cache-port-inversion`. **Safe peer:** MA03 if package manifests/lockfile commits are serialized by one custodian.

**Planning source baseline:** `undertaking/storyteller-workshop` HEAD `fa8e486533943e952c908c21af8d7a73aae84efa`, 2026-11-21. Remote source inspected; no compiler/test execution. This packet is **not execution authorization** until the owner commissions it on the correct integration branch.

**Branch rule:** The planned integration branch is `undertaking/modular-monolith`, **not currently created by this plan**. Create it only from the actual post-Storyteller integrated upstream (normally updated `main`) when the Undertaking is activated. Each Change gets its own linked worktree and `change/<id>-<slug>` branch from `undertaking/modular-monolith`, with no branch switching in the user's primary checkout. Revalidate named source anchors against the target HEAD, preserve active WR work, integrate into `undertaking/modular-monolith` only, and do not infer permission to start sibling packets.

**Evidence:** `packages/cache/src/index.ts` imports `type ReadCache` from `@offscreen/application/cache`, so `packages/cache/package.json` declares a dependency on the huge `@offscreen/application` package merely to implement a Redis adapter. The port's definition is `packages/application/src/cache/read-cache.ts`, 32 lines, with `ReadCache`, `ReadCacheWrite`, `CacheIncident`, `ReadCacheOptions`, `disabledReadCache`. Domain/app must not be the lowest level consumed by infrastructure.

**Chosen solution:** Move the *contract and neutral disabled adapter* to the already shared `@offscreen/contracts/read-cache` (new explicit subpath); re-export the same names from `@offscreen/application/cache` for compatibility. Change the Redis adapter to import the type from `@offscreen/contracts/read-cache`; `@offscreen/cache` now depends on contracts and not application. Do not add a new micro-package, alter Redis timeout behavior, cache keys/permissions or data formats.

**Proof:** same structural types, unchanged optional cache semantics, no `cache → application` package edge, stable old consumers, typecheck/build all touched consumers. [Source](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
