# MA10 | actual source-to-owner map and test migration exceptions

**Source basis:** MA08-integrated snapshot `6dd1276131a813f694ec3bccf4f9062ad3708208`. All 112 exact test names are frozen in [TEST-INVENTORY](TEST-INVENTORY.md), not re-listed here. The old Application has ~152 forwarding TypeScript files, no legitimate remaining production host consumer, and 112 `.test.mjs` tests. `tools/api-integration/package.json` already declares Story Engine, Lab Support, Admin, DB and Documents. **Do not add an Engine→Lab dependency.**

## Test classification and safe execution

| Class | Count | Selected runner mode |
| --- | ---: | --- |
| Pure filename-unit cases, no SQL provisioning | **60** | `pure`, only default runnable subset |
| Filename-unit cases that actually provision disposable Postgres | **16** | `disposable`, explicit local disposable permission |
| `*.integration.test.mjs` | **14** | `integration`, explicit disposable/test fixture |
| `*.live.test.mjs` | **22** | `live`, explicit local capability and guard |
| **Total** | **112** | No broad automatic glob |

**The sixteen deceptive `*.test.mjs` SQL fixtures** (source code uses `createDatabase`, `provisionDisposableSandboxDatabase`): `gm07-delegated-admission`, `gm07-delegated-expiry`, `gm07-delegated-offer-capture`, `gm07-delegated-worker-path`, `gm07-delegation-policy`, `historical-fork-v2`, `historical-fork`, `library-v2-admit`, `library-v2-fork`, `scene-checkpoint-publication`, `scene-checkpoint`, `story03-generation-adoption`, `story03-notice-topic-freeze`, `story03-stale-saved-publish`, `v2-active-fork`, `wr04-writer-research`, each with suffix `.test.mjs`. Put these exact basenames in a frozen denylist for the default pure selector; no dynamic "filename ends .test.mjs means safe" logic.

**Test runner owner:** new `tools/api-integration/scripts/run-legacy-engine-tests.mjs`, package scripts `test:legacy-engine:pure|disposable|integration|live`. Check all 112 basenames exist; pure selection 60; gate other 52 *before* importing or spawning any file, use a single spawned `node --test --test-concurrency=1` process, cwd repo root. Runner must not independently authorize destructive SQL or invent `DATABASE_TEST_URL` values. Existing tests retain disposable-sandbox checks.

## Direct legacy import-path table

| Old file/specifier | New file/specifier |
| --- | --- |
| `../dist/stories/**`, `../dist/campaign/**`, `../dist/storyteller/**`, `../dist/generations/**`, `../dist/drafts/**` | `../../../packages/story-engine/dist/<same-subpath>` |
| `../dist/developer-tools/**` | `../../../packages/lab-support/dist/<same-subpath>` |
| `../dist/admin/**` | `../../../packages/admin/dist/<same-subpath>` |
| `../dist/outbox/index.js` named `enqueue` | `@offscreen/db/outbox` |
| `../dist/outbox/index.js` named `createOutbox` | `@offscreen/db/outbox-relay` |
| `../dist/runtime-logging/index.js` | `@offscreen/runtime-logging` |
| old Application cache exports | `@offscreen/contracts/read-cache` |
| `@offscreen/application/{stories,storyteller,generations,drafts,...}` | exact real owner per mapping above, including direct package, require and literal dynamic import |

**Build outputs verified:** `packages/story-engine` emits `dist/<domain>/...`; `packages/lab-support` and `packages/admin` use `rootDir:src`, `outDir:dist`; DB's outbox comes from `dist/src/outbox.js` via exported `@offscreen/db/outbox`. Do not use a generic `../../../packages/db/dist/outbox` replacement.

## Non-`../dist` relative path exceptions (must not be overlooked)

- `obs00-b-current-authority-loader.integration.test.mjs`, `obs00-b-dispatch-authority.integration.test.mjs`, `saved-repair-plan.integration.test.mjs`, `saved-repair-apply.integration.test.mjs`: all use `createRequire(new URL('../../db/package.json', import.meta.url))`. After move replace `../../db/package.json` with `../../../packages/db/package.json`.
- Both `obs00-b-*.integration.test.mjs` tests use `new URL('../../db/migrations', import.meta.url)`: replace with `../../../packages/db/migrations`.
- `eng03-lock-measurement.live.test.mjs` uses `join(process.cwd(),'../../docs/engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md')`, **NOT** an import-meta-relative path. Preserve the literal `../../docs/**` and run with `cwd=tools/api-integration` (same two-level workspace depth as original `packages/application`); then the output remains inside repo `docs/**`. Do not change it to `../../../docs`, which would escape the repository. This live evidence writer is explicitly gated.
- `delegated-decision.test.mjs`: `../src/campaign/delegated-decision.ts` → `../../../packages/story-engine/src/campaign/delegated-decision.ts`.
- `saved-repair-apply.integration.test.mjs`: `../src/storyteller/saved-repair-apply.ts` → `../../../packages/story-engine/src/storyteller/saved-repair-apply.ts`.
- `saved-response-inspection.test.mjs`: `../src/storyteller/saved-response-inspection.ts` → `../../../packages/story-engine/src/storyteller/saved-response-inspection.ts`.
- `story03-notice-topic-freeze.test.mjs`: `srcRoot = join(here, '..', 'src')` → `srcRoot = resolve(here,'../../../packages/story-engine/src')`; **add `resolve` to its existing `node:path` import**. Do not scan the API Integration source as though it were Story Engine.
- `library-navigation.test.mjs` references logical fixture `../people/mira.md`: leave its logical document path untouched. Existing `resolve(here,'../../..')` and `../../../apps/**` remain correct because new test directory is also three levels below repo root.

## Tests whose sole compatibility claims must change

- `ma06a-story-engine-compatibility.test.mjs` currently uses `createRequire` from deleted `packages/application/package.json`, traverses old `application/src` forwarders and tests 81+ historic imports. Replace those obsolete assertions with **Application workspace absent**, Story Engine has no App import/dependency, direct owned exports resolve and an injected old App import is detected. Keep useful source import negatives.
- `ma05b-outbox-compat.test.mjs`: stop comparing to deleted Application outbox function, check DB-owned `enqueue` and relay direct export/identity as applicable.
- `admin-compat.test.mjs`: check Admin direct exports and Contracts campaign-holds schema identity, without App aliases. No other tests may drop negative cases to make migration pass.

## Remaining executable consumers beyond the 112 tests

`apps/worker/test/eng06-worker-restart.live.test.ts` and `gm07-temporal-relay.live.test.ts` use old Application dist paths; `scripts/repo-tools/{focused-integration,storyteller-playability,storyteller-live-comparison,plan-storyteller-saved-repair}.mjs` spawn/use old Application paths; `knowledge-health.mjs` has stale Application developer-tools README. `tools/chamber/package.json` may still name Application in benchmark build scripts. MA10 owns those exact scripts/Worker test import edits. **Do not edit** `scripts/repo-tools/module-graph*.mjs`: MA11 owns the checker, including deliberate synthetic Application fixture strings. `agent-trace.test.mjs` and other synthetic trace strings are not runtime imports.

## Falsifiable closure

Sorted 112 old/new filenames equal; 60 pure selected without importing any SQL fixture, 52 gated retained; three compatibility-only tests replaced with meaningful direct-owner assertions; old executable imports zero; root pnpm workspace/lockfile importer absent after join; no Story Engine→Lab dependency; confirmed pure tests, database-denial/replay and source-root negatives retained. Every `NOT RUN` explicitly reported rather than called PASS.
