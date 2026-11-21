# MA02 | Cursor microtasks
Precondition: owner commissions MA02 on `undertaking/modular-monolith`; independent worktree `change/ma02-cache-port-inversion`, no switching primary. Parent handles all tasks then integrates; manifests/lockfile serialized.

## T01 | Define lower-layer port
Read `packages/application/src/cache/read-cache.ts`, `packages/contracts/package.json`. Write `packages/contracts/src/read-cache.ts`, manifest and minimal contract test. Copy exact type/neutral value contract. Positive: explicit subpath builds. Negative: public `unknown` and options not widened.

## T02 | Replace imports and dependency
Read `packages/cache/src/index.ts`, `packages/cache/package.json`, `packages/application/src/cache/read-cache.ts`. Write precise import/reexport/manifest changes and lockfile update. Positive: API and application old imports compile. Negative: no `@offscreen/application` left as cache dependency; Redis behavior untouched.

## T03 | Verify and integrate
Build/typecheck affected packages, changed-file Prettier/ESLint, compare cache source behavior; optional graph report. No full DB tests. Parent reconciles docs/source receipt and squash-integrates into actual target without requesting redundant ChatGPT review.
