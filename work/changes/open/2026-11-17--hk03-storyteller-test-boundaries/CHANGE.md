# HK03 | Split the Storyteller integration giant by independently runnable invariants

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Implementing (2026-11-19). The nested cases are split in source. The profiled suite was not run.

## Cursor first-screen brief

`tools/api-integration/test/storyteller.integration.ts` was **5,232 lines**, one top-level `test('profiled storyteller...')` with **32 nested `await t.test` cases** under one shared `withAppIntegration` setup. Related large but separate files: `start-package.integration.ts` and `packages/storyteller/test/storyteller.test.ts`. They stayed untouched.

Baseline before the move, counted from `d3ad620b`: **33** node tests in this file (1 profiled parent + 32 nested cases). After the move the profiled file still awaits the same **32** case names in the same order, so the profiled count stays **33**. No case was left in the original file. A focused file registers its own parent test only when that file is the node:test entry.

## What moved

The shared opening, `candidate`, `mechanicalCandidate`, and `choose` helpers moved unchanged into `tools/api-integration/test/storyteller-suite.ts`. The profiled test still creates one capture store, one Chamber storyteller control, one app session, and one `first` story, then awaits the families below. That keeps the shared story, the unscoped allocation read, the uncertain-attempt cleanup, and the worker stop or restart in their original order.

Each family file also calls `registerProfiledStoryteller`. Importing the file from the profiled suite does not register a second run. Running that file as the node:test entry boots its own session. `tools/api-integration/package.json` still points `test:storyteller` at `storyteller.integration.js`.

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
| Related | unchanged: `tools/api-integration/package.json` still runs test:storyteller against storyteller.integration.js and no runbook was edited | Read the script entry |

## Proof / negatives

- **Normal:** the profiled file and the moved modules contain the same 32 case names and the same case text as `d3ad620b`. `test:storyteller` still loads the profiled file.
- **Negative:** each moved case is awaited by the profiled test. A failing assertion in a moved family would fail that suite. No assertion, fixture, or helper was edited to make a case pass. The failing-assertion injection was not executed.
- **Operational:** no provider was called. The profiled suite was not run. Cluster `offscreen-lab` was not started or deleted. Docker Compose was not brought up or down. Volumes `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were not deleted.
- **Review:** the shared stack lives in one helper. Each behavior family is a separate module. The profiled test is the ordered session.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged: this split relocates existing integration cases and does not change gameplay or Storyteller rules | tools/api-integration/test/storyteller.integration.ts compared with d3ad620b | source-observed | No product or technical page was edited, and no assertion was rewritten to turn a case green | N/A |
| tools/api-integration/test/storyteller.integration.ts profiled suite | test discovery | unchanged: the profiled test still awaits all 32 moved cases in the original order, and test:storyteller still loads this file | tools/api-integration/package.json | source-observed | A case that is not awaited would disappear from the profiled command | N/A |
| profiled Storyteller integration result | API integration tests | unchanged: the cases were moved and the suite was not executed, so no new pass or failure is claimed | tools/api-integration/test/storyteller.integration.ts at baseline d3ad620b | not run | Cluster offscreen-lab is in use, so Postgres and Temporal were not booted for this suite | N/A |
