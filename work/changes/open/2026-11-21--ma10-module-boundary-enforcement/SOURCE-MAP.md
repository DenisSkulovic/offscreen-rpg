# MA10 source map | inspected 6dd12761

**Actual source evidence:** `packages/application/src` is 152 small TS forwarding files (~10 KiB), `packages/application/test` contains **112** `.mjs` files. MA08 moved 39 lab modules into `@offscreen/lab-support`, drafts into Story Engine, DB outbox relay into DB, logging into runtime-logging. No production host/tool package imports Application. Tests are the blocker, not legitimate remaining runtime ownership.

**Test mapping:** original 112 have 68 files with at least one `../dist/developer-tools` reference, 2 remaining files primarily referencing legacy outbox/admin, and 42 without those lab/owner references. The sets are a diagnostic classification, **not** permission to drop combined engine+lab tests. `../dist/developer-tools/index.js` appears 59 times; `../dist/stories/index.js` 30; `../dist/stories/initialization.js` 27; `../dist/campaign/settings.js` 23; `../dist/stories/passage-documents.js` 16; `../dist/storyteller/records.js` 15. Cross-owner tests include `p3b-writer-provider-custody.integration.test.mjs`, `wr03-writer-loop.integration.test.mjs`, `wr04-writer-research.test.mjs`, `eng03-t05-historical-report-capture.live.test.mjs`, `eng03-resolution-lock-measurement.live.test.mjs` and `ma06a-story-engine-compatibility.test.mjs`. Do not let 'live' file names hide the negative tests from the migration ledger.

**Destination:** `tools/api-integration/legacy-engine-tests` is still three directory levels under repo root, preserving `resolve(here,'../../..')` used by fixtures. Test local `../dist` must be replaced by `../../../packages/<owner>/dist`; do not blindly replace unrelated `../` fixtures. `tools/api-integration/package.json` already lists `@offscreen/story-engine`, `@offscreen/lab-support`, `@offscreen/admin`, `@offscreen/db`, and others, with Node test scripts on compiled `dist/test/*.test.js`. Add a separate `test:legacy-engine` runner for moved raw MJS; **do not add MJS to existing TypeScript compiler test glob**.

**Non-App code still using a removed build:** `apps/worker/test/eng06-worker-restart.live.test.ts` imports legacy stories/campaign/fixtures dist, `apps/worker/test/gm07-temporal-relay.live.test.ts` points to old dist. Scripts `scripts/repo-tools/{focused-integration,storyteller-playability,storyteller-live-comparison,plan-storyteller-saved-repair}.mjs` have legacy run/build paths; `scripts/repo-tools/knowledge-health.mjs` has obsolete literal `packages/application/src/developer-tools/README.md` expected path. Source comments in `packages/game/src/immediate-actions.ts` and Storyteller fixture are NOT runtime imports. Checker unit tests containing deliberately synthetic old Application package paths are NOT real consumers and belong to MA11.

**Critical compatibility-only test:** `ma06a-story-engine-compatibility.test.mjs` uses `createRequire` on `packages/application/package.json`, walks old Application forwarding source and tests 81+ legacy import specifiers. On retirement, replace its *obsolete* identity/forwarder claims with equivalent tests asserting (a) Application workspace/manifest absent, (b) real Story Engine + Lab direct imports resolve correctly, (c) new AST source graph refuses application runtime imports and (d) mapped test source paths are resolvable. `ma05b-outbox-compat.test.mjs` should check DB-owned `enqueue` identity via DB public export rather than asserting a deleted Application function; `admin-compat.test.mjs` should verify Admin direct exports and contracts-owned holds identity without Application aliases. Preserve other positive/negative assertions.

**Own existing tests untouched by MA10:** `scripts/repo-tools/module-graph.test.mjs` (MA11), provider/SQL in `story-engine/src` (WR09A), Story Authority capture (MA09). If a moved test exercises WR09A new pointer schema, do not update that assertion in this lane. MA10 moves its original fixture unchanged except import paths; WR09A owns additional tests in a noncolliding new basename.

**Deletion preflight:** scan literal import/export/require, TypeScript test type imports and script spawn strings, manifests and lockfile, root/turbo scripts, knowledge path references. Verify full 112-mapping receipt BEFORE deleting Application and its tsconfig/manifest. No new package or broad Story Engine public wildcard added to support test-only deep reads.

## Source-verified exhaustive migration exceptions (6dd12761)

**Actual test inventory: 112 `*.test.mjs`, partitioned by filename and execution capability: 76 ordinary tests, 22 `*.live.test.mjs` tests, 14 `*.integration.test.mjs` tests.** All 112 must migrate, but **never** run the combined 112-file glob as the default proof: that includes disposable database, process-spawn and sandbox tests.

### Non-`../dist` relative imports that need exact source rewriting

The destination `tools/api-integration/legacy-engine-tests` is still exactly three directories beneath repo root, so `resolve(here,'../../..')` and existing `../../../apps/**` or `../../../scripts/**` references remain valid.

**BUT** references that were siblings of `packages/application` now point to a *different* directory and must change:
- Four files use `new URL('../../db/package.json', import.meta.url)`: `obs00-b-current-authority-loader.integration.test.mjs`, `obs00-b-dispatch-authority.integration.test.mjs`, `saved-repair-plan.integration.test.mjs`, `saved-repair-apply.integration.test.mjs`. Change URL to `../../../packages/db/package.json` so `createRequire` resolves `pg` from the real DB package.
- Both OBS00-B integration tests also refer to `new URL('../../db/migrations', import.meta.url)`; change to `../../../packages/db/migrations`.
- `eng03-lock-measurement.live.test.mjs` refers to `../../docs/engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md`; change to `../../../docs/engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md` *if that file is actually retained*, otherwise preserve its existing explicit NOT RUN condition.
- `delegated-decision.test.mjs` references `../src/campaign/delegated-decision.ts`; remap to `../../../packages/story-engine/src/campaign/delegated-decision.ts`.
- `saved-repair-apply.integration.test.mjs` references `../src/storyteller/saved-repair-apply.ts`; remap to Story Engine `src/storyteller`.
- `saved-response-inspection.test.mjs` references `../src/storyteller/saved-response-inspection.ts`; remap likewise.
- `library-navigation.test.mjs` has a literal `../people/mira.md` document path; **retain it unchanged** (it is a logical fixture path, not a Node module import).
- `wr07b-joined-play.integration.test.mjs` uses `@offscreen/application/stories` directly, replace with `@offscreen/story-engine/stories` (not just `../dist` mapping). Search and replace all other `@offscreen/application` specifiers including `require` and `import()`.

Other root-relative tests using `createRequire` include `ma06a-story-engine-compatibility.test.mjs` and the five SQL tests above. The MA06A test's `createRequire` intentionally points at the Application manifest, which **must be replaced** by `packages/story-engine/package.json`; delete only its obsolete forwarder identity assertions and keep/rewrite its graph/source negative coverage. Two other identity-only files are `ma05b-outbox-compat.test.mjs` and `admin-compat.test.mjs`.

### Test runner contract (no hidden SQL)

Add `tools/api-integration/scripts/run-legacy-engine-tests.mjs` with a CLI mode `unit|integration|live`, enumerate the moved directory using `readdirSync`, lexically sorted:
- unit: names ending `.test.mjs` EXCLUDING `.live.test.mjs` and `.integration.test.mjs` = **76**; invoked by `pnpm --filter @offscreen/api-integration test:legacy-engine:unit`, no database precondition claimed;
- integration: `*.integration.test.mjs` = **14**, explicitly require known disposable DB/fixture setup or execute only named scripts with their existing setup semantics;
- live: `*.live.test.mjs` = **22**, require named disposable environment or are recorded NOT RUN.
Use `spawnSync(process.execPath,['--test','--test-concurrency=1',...chosenAbsolutePaths],{stdio:'inherit',cwd:repoRoot,env:process.env})`. Exit with child's status. Never import a test module into the runner (it can mutate SQL at module evaluation). Modes integration/live must default-deny if the *exact* known disposable context isn't present; individual tests with their own provisioning have separate explicit invocation routes and retain their existing consent gates. Avoid a single auto-running 112-test script attached to `pnpm -r test`.

For source truth verify `packages/admin/tsconfig.json` emits `dist/<file>.js`, `packages/lab-support/tsconfig.json` emits `dist/<file>.js`, `packages/story-engine` uses `dist/<domain>/...`, and `@offscreen/db/outbox` maps to `dist/src/outbox.js`; do not guess paths by string substitution for DB/Logging.

### Deletion proof

After importing/rebuilding moved tests, enumerate **exactly 112 unique old basenames and 112 unique relocated basenames**, compare sorted strings and check all 76 unit tests can be discovered; compare TAP test assertions and skip counts before/after on equivalent build artifacts where runnable. Existing source test failures due to a missing local DB remain NOT RUN/FAIL as appropriate, not PASS. Scan executables *and* manifest references before deleting `packages/application`. Script and data *literals* from synthetic graph/trace fixtures should not be rewritten as runtime imports.
