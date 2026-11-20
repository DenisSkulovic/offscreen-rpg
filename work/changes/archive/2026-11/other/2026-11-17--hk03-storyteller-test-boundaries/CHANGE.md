# HK03 | Split the Storyteller integration giant by independently runnable invariants

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: reproduce and localize two historical child test failures, not weaken assertions. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Done (2026-11-20). Isolated-family `test:storyteller` is the acceptance suite. Two consecutive runs: **44/44 PASS** (12 parents + 32 named cases, 0 skipped). Chamber retry and worker-replay passed in their own WORKER sessions. Provider recovery is MANUAL. Legacy shared session is `test:storyteller:profiled` only. Global Temporal retry/timeout changes were reverted.

## Cursor first-screen brief

`tools/api-integration/test/storyteller.integration.ts` was **5,232 lines**, one top-level `test('profiled storyteller...')` with **32 nested `await t.test` cases** under one shared `withAppIntegration` setup. Related large but separate files: `start-package.integration.ts` and `packages/storyteller/test/storyteller.test.ts`. They stayed untouched.

Baseline before the move, counted from `d3ad620b`: **33** node tests in this file (1 profiled parent + 32 nested cases). After the move the profiled file still awaits the same **32** case names in the same order, so the profiled count stays **33**. No case was left in the original file. A focused file registers its own parent test only when that file is the node:test entry.

## What moved

The shared opening, `candidate`, `mechanicalCandidate`, and `choose` helpers moved unchanged into `tools/api-integration/test/storyteller-suite.ts`. The profiled test still creates one capture store, one Chamber storyteller control, one app session, and one `first` story, then awaits the families below. That keeps the shared story, the unscoped allocation read, the uncertain-attempt cleanup, and the worker stop or restart in their original order.

Each family file also calls `registerProfiledStoryteller`. Importing the file from the diagnostic profiled orchestrator does not register a second run. `test:storyteller` now runs the twelve family files serially (`--test-concurrency=1`) in separately owned sessions. `test:storyteller:profiled` keeps the legacy shared session as a named diagnostic. MANUAL families do not start the outbox worker; WORKER families use a per-session Temporal task queue.

| File | Cases |
| --- | --- |
| `tools/api-integration/test/storyteller-imported-start.integration.ts` | imported abstract start publishes one root and one obligation across retry; mechanical opening and three consequences reshape plans from committed state; microbe completes three mechanical turns through the shared finite-action path |
| `tools/api-integration/test/storyteller-journey-schedule.integration.ts` | active journey re-reads postponed and cancelled schedules before a stale wake settles; custom-calendar winter interrupts a sixty-day journey at day fifty-five and publishes a replacement scene |
| `tools/api-integration/test/storyteller-preparation-hold.integration.ts` | failed preparation preserves the committed outcome and intent-owned clock hold; Chamber failure holds time until the same generation is retried; early preparation stays private while its finite action is paused; a due world boundary prevents finite-action overlap |
| `tools/api-integration/test/storyteller-activity-admission.integration.ts` | selecting earned work admits a durable process without paying its reward; routine activity progress does not manufacture narrative passages; boundary prerequisites block work before another attempt or reward |
| `tools/api-integration/test/storyteller-accepted-plan.integration.ts` | accepted finite plan starts each authorized successor without generation; scene handoff requires explicit player re-entry into an accepted plan; accepted horizon prevents a later activity from starting; changed prerequisites block the accepted successor without starting it; cancelling pending plan entries leaves current work running |
| `tools/api-integration/test/storyteller-activity-settlement.integration.ts` | Seyda warehouse shift advances thirty fictional minutes and pays once; clock wait completes from eligible time without rolling or earning work points; failed optional reporting preserves the factual result and current authority |
| `tools/api-integration/test/storyteller-publication-context.integration.ts` | captured selection, ownership, duplicate publication and distinct intentions; memory outlives recent window, timed arrival uses same source and notes; saved output survives publication failure and arrival notes wait for arrival; malformed source fails without publication; explicit recovery reuses intention |
| `tools/api-integration/test/storyteller-provider-budget.integration.ts` | concurrent reservations obey a shared cap and duplicate settlement is harmless; multiple dispatch slices consume one operation envelope |
| `tools/api-integration/test/storyteller-memory-exploration.integration.ts` | memory exploration uses reviewed provider attempts and settles its final round |
| `tools/api-integration/test/storyteller-provider-recovery.integration.ts` | fake provider accounting settles once and unknown dispatch is never repeated; over-reservation settlement stops only the paying funding account; provider recovery retries only work proven unsent |
| `tools/api-integration/test/storyteller-worker-replay.integration.ts` | worker restart and activity replay settle one finite action exactly once |
| `tools/api-integration/test/storyteller-browser-creation.integration.ts` | browser selects a profile, starts, chooses, reloads and finds live story |

The profiled orchestrator is `tools/api-integration/test/storyteller.integration.ts`. The shared helper is `tools/api-integration/test/storyteller-suite.ts`.

No case had to stay behind. Moving a case into its own `withAppIntegration` would have changed the shared session. Calling the moved function from the original session does not.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | unchanged: no product page is edited and this split adds no player-facing promise | Inspect the diff for product pages |
| Technical | unchanged: no technical page is edited and Storyteller guarantees are not rewritten | Inspect the diff for technical pages |
| Code | changed: `tools/api-integration/test/storyteller.integration.ts` awaits the same 32 cases in the original order. Negative: a case that is not awaited would disappear from the profiled suite | Syntax check, case-text comparison against `d3ad620b` |
| Related | changed: test:storyteller runs twelve serial family files; test:storyteller:profiled is diagnostic; local-integration-tests runbook records the split | Read package.json scripts and the runbook heading |

## Proof / negatives

- **Normal:** the profiled file and the moved modules contain the same 32 case names and the same case text as `d3ad620b`. `test:storyteller` still loads the profiled file.
- **Negative:** each moved case is awaited by the profiled test. A failing assertion in a moved family would fail that suite. No assertion, fixture, or helper was edited to make a case pass. The failing-assertion injection was not executed.
- **Operational:** no provider was called. The profiled suite ran once on 2026-11-19 and failed, as recorded below. Cluster `offscreen-lab` was not started. Volumes `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were not deleted. `offscreen`, `offscreen_story_local`, and `offscreen_chamber` were not reset.
- **Review:** the shared stack lives in one helper. Each behavior family is a separate module. The profiled test is the ordered session.

## Suite run | 2026-11-19

`pnpm --filter @offscreen/api-integration test:storyteller` with `DATABASE_TEST_URL` naming disposable `offscreen_auth_test` on local Compose Postgres. `STORYTELLER_LIVE_ENABLED` was false. No provider credential was present. Source at the run was `4a556223`.

node:test reported **33** tests, **30** passed, **3** failed, 0 cancelled, 0 skipped, in 59928.898942 ms. The parent test failed. Of the 32 nested cases, **30 passed and 2 failed**.

| Failed case | Observed error |
| --- | --- |
| imported abstract start publishes one root and one obligation across retry | `ENOENT` on `realpath` of `tools/api-integration/content/rules/srd-5.2.1-subset`. The filter script uses that package directory as the working directory. The rules package is present at the repository `content/rules/srd-5.2.1-subset`. |
| mechanical opening and three consequences reshape plans from committed state | `assert.ok(snapshot.campaign?.offer?.nodes.length)` was false. The actual length was 0. |

The other 30 nested cases passed, including the browser case. This is not a green run.

Compose Temporal was down. `pnpm infra:up` started it, and the health check passed. Postgres was already healthy and was not recreated. `offscreen_auth_test` already existed and was not dropped. Ports 3001 and 3100 were free and were not cleared. `tsc` for `@offscreen/api-integration` exited 2 because `storyteller-browser-creation.integration.ts` imports `assert` twice. The emitted JavaScript kept one import, and the suite command ran that output. The behavior files were not edited.

## Isolated browser-creation | 2026-11-20

`cd tools/api-integration && STORYTELLER_LIVE_ENABLED=false DATABASE_TEST_URL=postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_auth_test node --test dist/test/storyteller-browser-creation.integration.js` against disposable `offscreen_auth_test`. Ports 3001/3100 were free. Compose Postgres/Temporal were already up. No DROP DATABASE. No provider call. Gary’s heading assertion was not weakened.

Working-tree publication path: `commitStoryContinuation` publishes continuity notes after `insertStagedSceneCheckpointSelector`; integration teardown deletes `story_scene_checkpoint` before `story_passage`. Structured `storyteller_publication.failure_code` is `publication_blocked:<StoryError.code>[:reason]` when publication is swallowed.

node:test reported **2** tests, **2** passed, **0** failed, process exit **0**, ~34944 ms. Inner case `browser selects a profile, starts, chooses, reloads and finds live story` passed (~31727 ms). No cleanup `AggregateError`. This is **not** a green `test:storyteller` run.

Earlier isolated FAIL on the same file (same day) stored `storyteller_publication.state=blocked` with `failure_code=publication_blocked:conflict:stale_story_revision` while generation `succeeded` and Temporal `COMPLETED`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged: this split relocates existing integration cases and does not change gameplay or Storyteller rules | tools/api-integration/test/storyteller.integration.ts compared with d3ad620b | source-observed | No product or technical page was edited, and no assertion was rewritten to turn a case green | N/A |
| tools/api-integration/test/storyteller.integration.ts profiled suite | test discovery | unchanged: the profiled test still awaits all 32 moved cases in the original order, and test:storyteller still loads this file | tools/api-integration/package.json | source-observed | A case that is not awaited would disappear from the profiled command | N/A |
| profiled Storyteller integration result | API integration tests | changed: the profiled command ran once after the split and failed. 33 tests, 30 passed, 3 failed. Two nested cases failed and the parent failed with them. Not a green run and not Done | tools/api-integration/test/storyteller.integration.ts at 4a556223, run against offscreen_auth_test | executed | A missing rules path from the api-integration working directory fails the imported start. An empty campaign offer fails the mechanical opening. The other 30 nested cases passed. No provider was called, and the named volumes were not deleted | N/A |
| isolated browser-creation family | API integration tests | changed: isolated `storyteller-browser-creation.integration.js` passed 2/2 exit 0 on 2026-11-20 after notes-after-checkpoint commit order and checkpoint-before-passage teardown. Profiled `test:storyteller` was not re-run. Packet stays Implementing | tools/api-integration/test/storyteller-browser-creation.integration.ts; packages/application/src/stories/continuation.ts; tools/api-integration/test/helpers/app-integration.ts; uncommitted on 42b994dc | executed | A `stale_story_revision` publication_blocked row with generation succeeded and Temporal COMPLETED is a rolled-back seq-2, not a UI-only miss. Teardown that deletes `story_passage` while `story_scene_checkpoint` remains fails with FK AggregateError after a green inner case | N/A |
| mechanical opening three-turn fixture | API integration tests | changed (documented exception to byte-identical relocation): the loop no longer takes `nodes[0]`, which could legally reach `parcel-secured` and an empty plan array. Sequence is `take-cover`, `leave-cover`, `calm-gary`. Round-2 offer asserts both real D20 outcomes. Gameplay rules and the nonempty-offer assertion were not weakened | tools/api-integration/test/storyteller-imported-start.integration.ts; pineappleConsequence in packages/storyteller/src/fixtures/mechanical/pineapple.ts | executed | Isolated imported-start 4/4 PASS. Profiled mechanical opening PASS. Empty nodes after `draw-parcel-closer` is no longer reachable in this case. Other outcomes of `calm-gary` fail the test | N/A |
| profiled suite after fixture correction | API integration tests | unchanged Goal: 33/33 not met. `pnpm --filter @offscreen/api-integration test:storyteller` on offscreen_auth_test: 33 tests, 30 passed, 3 failed, 0 skipped | storyteller-preparation-hold.integration.ts:178 (`resolution.blocker` expected `{kind:generation, recovery:retry}`, actual null); storyteller-worker-replay.integration.ts:142 (`gameSecond` expected +5, actual 0) | executed | Mechanical opening is not among the failures. Isolated worker-replay nested case PASS when run alone. No provider call. wiki:health remaining errors are unrelated | N/A |
| shared-session worker stalls (2026-11-20, unclosed) | API integration tests | superseded: the shared-session 33/33 gate was withdrawn. Isolated family sessions are the Goal | see CHANGE.md "Shared-session stall diagnosis" | executed | Shared-session flake is not treated as a gameplay bug. Assertions were not weakened | N/A |
| isolated-family acceptance suite | API integration tests | changed: `test:storyteller` runs 12 serial family files with `--test-concurrency=1`. MANUAL vs WORKER is explicit. Unique Temporal task queue per WORKER session. Worker errors are recorded, not swallowed. Unproven scheduleToStartTimeout and eager-activity override reverted | two consecutive runs, 44 tests 44 pass 0 skip, offscreen_auth_test, STORYTELLER_LIVE_ENABLED=false | executed | A missing family file would drop named cases. Parallel families collide on 3001/3100. Provider-recovery does not start the shared worker. wiki:health remaining errors are unrelated | docs/runbooks/local-integration-tests.md; tools/api-integration/README.md; package.json scripts |

## Fixture-stabilization exception (2026-11-20)

The original HK03 move was byte-identical case relocation. ChatGPT later showed that `offer.nodes[0]` can legally play `take-cover` → `inspect-from-cover` → `draw-parcel-closer`, after which `pineappleConsequence` returns `[]`. This test file now names those three actions. That is a fixture correction, not a gameplay rewrite.

## Shared-session stall diagnosis (2026-11-20, not Done)

Stopped while still flaking. Planner should treat the following as evidence, not a closed repair.

**Dumps at poll expiry (profiled log `/tmp/hk03-storyteller-2.log`):**

1. Chamber retry: control stayed `armed-failure` (revision 1, `generationId` null). Execution was `settled`, receipt `automatic`, generation `storyteller.profiled.v1` **running**, holds had the required-turn generation. Public `resolution.blocker` stayed null. Operation outbox rows were delivered. Discriminator: **scripted gate never ran**, not a missing snapshot join.
2. Worker-replay: control stayed `armed-hold`. Execution still `running`, `gameSecond` 0, no receipt. Generation was still `storyteller.context-capture.v1` **pending**. Pending outbox at expiry included **26 undelivered `storyteller.profiled.v1` notices**, plus this operation's `campaign.action.v1` and `campaign.consequence.v1` undelivered. Discriminator: **capture never promoted because relay never reached this operation's notices**.

**Also observed:** after an isolated worker-replay fail, Temporal still had `campaign-action/<noticeId>` RUNNING with history length 5: `advanceCampaignAction` **scheduled, never started**. `useWorkflowBuildId: true` on that scheduled activity. Isolated worker-replay later passed 3/3 after leftover workflows were gone, then failed again in the profiled suite.

**Edits in tree, unproven as the fix:**

- Poll-expiry dumps in the two failing cases (`inspectStorytellerProgress`).
- `scheduleToStartTimeout: '5 seconds'` on workflow `proxyActivities`.
- `maxEagerActivityReservationsPerWorkflowTask: 0` on `startRuntime`.
- Suite start now also terminates `campaign-action/`, `campaign-consequence/`, `campaign-activity/` leftovers.
- `waitForProfiledOutboxQuiet` before Chamber and before worker-replay; the wait after provider-recovery once failed with 22 still-undelivered storyteller notices while the worker had just STOPPED and no new webpack/RUNNING log followed.

**Profiled counts actually seen this session:** 30/33 (pineapple-fixed baseline), 33/33 once, 30/33 (both nested again), 31/33 (parent failed on outbox quiet-wait, worker-replay/browser never ran), 33/33 once after forcing `restartWorker` inside the quiet-wait. Not a stable green. HK03 is not archived.

## Separate candidate (not this Change)

`packages/application/src/storyteller/publication.ts` still calls `transitionStorytellerHoldToDecision` after `saveOfferPlans` even when the consequence plan array is empty. The result contract allows `state='held'` with zero plans. Do not change that under HK03. Planner question: should a zero-plan publication stay a storyteller hold instead of a decision hold with nothing selectable?
