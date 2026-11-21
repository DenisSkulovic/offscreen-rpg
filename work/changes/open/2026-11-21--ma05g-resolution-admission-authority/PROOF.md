# MA05G | proof contract and independent planner challenge

## Execution prerequisites and honest evidence

No application test has been run by this planning session. The source ZIP is an inspected snapshot; MA05F's in-flight code is not yet available for comparison. `tools/api-integration/README.md` explicitly warns that `pnpm test:focus -- <suite>` **recreates** the named disposable test DB; run only after checking its target and authorization. The application ENG03 direct-factory test uses `provisionDisposableSandboxDatabase({confirmDisposableProvision:true,applyFullMigrations:true})` and destroys its generated sandbox afterward; verify sandbox config before running. NEVER point these proofs at production, a personal dev DB, or an uncertain target. They do not require real provider spend.

Run from repository root (after builds, and only with verified authorized test environment):
- `pnpm --filter @offscreen/application build`
- `pnpm --filter @offscreen/api-integration build`
- `node --test packages/application/test/ma05g-authority-identity.test.mjs` (new; no live DB required)
- `node --test packages/application/test/story03-notice-topic-freeze.test.mjs` (includes disposable SQL)
- `node --test packages/application/test/eng03-resolution-lock-measurement.live.test.mjs` (provisions disposable DB)
- `pnpm --filter @offscreen/api-integration test:stories:resolution` (requires `DATABASE_TEST_URL` guarded disposable `offscreen_auth_test`)
- `pnpm repo:module-graph` and repository changed-file Prettier/quality lint

If the API integration suite is not independently isolated, use the repo's documented `pnpm test:focus -- story-resolution` only after explicit DB-target inspection. Do not silently switch between destructive runners.

## Discriminating acceptance matrix

| Path | Normal proof | Negative / fault proof | Exact expected effect |
| --- | --- | --- | --- |
| Source topology | New core and authority import only neutral contracts/DB/Campaign, not relative Storyteller runtime | AST/source import guard includes all static imports and reexports, not only grep on code bodies | No `../storyteller/*` reverse runtime import from either file; compatibility façade is explicit exception |
| Export parity | Runtime `admission` reexports same replay/commit references as authority; records/context/activity aliases similarly same identity | Distinct wrapper implementation masquerading as alias | `strictEqual`, shared schema/filter function object identity |
| Replay same operation | Same UUID/base revision/submission | Flip current `STORYTELLER_DISTRIBUTED_V1` after initial admission | No new generation/task/attempt; enqueue still uses persisted original frozen notice topic |
| Replay different payload | Identical UUID but changed selection/submission or base revision | Same operation ID with mismatched payload | `StoryError('conflict')`; no overwrite of original resolution or new task/outbox |
| Owner | Owned story with valid current offer | Other owner attempts same story operation | `not_found` / owner-scoped denial; no new generation/outbox or leaked state |
| Off-lock preparation | CAS read delayed while another transaction obtains story lock | Slow/missing DocumentStore, malformed/missing pinned content | Competitor lock acquisition unaffected by CAS latency; failed preparation commits no story mutations |
| Fence / racing commit | Prepared snapshot still current | Mutate story viewVersion, notes, root hash/revision, active passage, source generation, campaign settings/commitments between snapshot and commit | Conflict; transaction inserts no generation, publication, outbox or resolution and does not increment viewVersion |
| Admission task | Valid task with permitted effective usage budget | No effective usage policy, unauthorized route, zero available rounds | Existing fail-closed task preparation, no provider call and no committed task |
| Commit transaction | One generation, one publication, one story_resolution, one outbox wake and one advanced story viewVersion | Induced insert/check failure or same-base competing resolution | Atomic rollback; no partial operation, no second active base resolution |
| Scripted route | Scripted resolution still commits | Scripted same-ID changed payload or stale source | Existing scripted conflict/replay behavior unchanged; runtime port not invoked |

Tests must exercise Storyteller and scripted paths: moving the whole `resolution.ts` must not drop scripted cases. Do not substitute a static re-export test for these SQL/locking negatives.

## Separate cold-read readiness audit (G0–G7)

- **G0 PASS with concurrency caveat:** exact target `undertaking/storyteller-workshop` and snapshot source baseline inspected. MA05F is in progress; MA05G is on a separate planning branch, not commissioned. Refresh and audit again after MA05F integration.
- **G1 PASS:** admission replay/prepare/commit, direct factory use, SQL context types, task record, activity filter, story factory, test runner and DB warning inspected. No need to move giant canonical knowledge corpus to make the SQL boundary honest.
- **G2 PASS at design level:** selected authority composition and typed prepare interface; no uncertain callback-transaction ownership, no post-commit materialization, no changed cost or payload semantics. Existing scripted generations coupling is explicitly deferred, not hidden.
- **G3 PASS at design level, implementation still unverified:** T01–T04 each has specific initial anchors, write paths, algorithm, stop and focused negative/normal. T02 is one substantial SQL migration with several symbols, not one function per Change.
- **G4 PASS at design level after predecessor joins:** T01 is the first legal edit from a refreshed dedicated MA05G worktree, not the current MA05F worktree.
- **G5 PASS:** T01 → T02 → T03 → T04 serial, because shared runtime aliases, fence types, tests and build outputs overlap. One integration owner joins only after MA05F.
- **G6 NOT YET VERIFIED at runtime:** exact real test entrypoints and disposable DB requirements were inspected. No tests run here; availability/authorization of disposable DB must be checked before commission. Core SQL negative failures block Done, not silently waived.
- **G7 PASS at design level:** one meaningful behavior-preserving authority extraction, old public factory maintained; docs reconciled at close; archive and squash integrate without extra owner checkpoint; no automatic successor.

**Verdict:** **PLANNER-READY FOR FINAL HEAD REFRESH; NOT COMMISSIONED**. This is an intentionally conservative status label for *branch/concurrency drift*, not uncertainty about who should own SQL or a request for Cursor to investigate architecture. After MA05F lands, planner/integration owner must compare the actual changed files, update exact symbols if needed, perform one final G0–G7 pass and then commission the completed packet. No substantive architectural question is being delegated.