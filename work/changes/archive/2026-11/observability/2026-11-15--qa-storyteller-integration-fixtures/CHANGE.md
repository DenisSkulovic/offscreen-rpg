# QA-SF01 | Restore honest focused Storyteller/story-resolution integration checks

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Done (2026-11-18). Disposable offscreen_auth_test: storyteller 33 with 0 failures, story-resolution 8 with 0 failures, and admin-situation 3 with 0 failures. The fifty-five second expectation stayed. No model call.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Disposition | Owner | Negative |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/gameplay/time-and-autonomy.md#mechanical-activities already keeps instant play inside decision boundaries | docs/product/gameplay/time-and-autonomy.md | A world deadline is not moved to zero |
| Technical | changed: docs/technical/engine/mechanics-and-capabilities.md#admitted-action-and-time records that instant settlement stops at a controlling obligation | docs/technical/engine/mechanics-and-capabilities.md | A later check at that second stays unapplied |
| Code | changed: packages/application/src/campaign/activities.ts stops at the obligation, packages/application/src/storyteller/window-accounting.ts reads the database clock as an instant, and packages/application/src/storyteller/budget.ts allows an unfinished memory round to continue. Negative: a succeeded result still cannot keep the operation open | packages/application/src/campaign/activities.ts | The fifty-five second expectation stays |
| Related | changed: work/changes/README.md records this repair and leaves HK03 unselected | work/changes/README.md | Queue selection is not permission to split the suite |

**Source evidence:** [Cursor forensic run log S0/S1](../../../../../../evidence/inspections/doc01-retained-observations/programs/observability/evaluations/2026-11-15--connected-forensic-trial/RUN-LOG.md), [independent review](../../../../../../evidence/runs/observability-program-2026-11-15/independent-connected-trial-review-2026-11-15.md), [test runner safety](../../../../../../tools/api-integration/test/README.md).

## Source-specific problems

1. `pnpm test:focus -- storyteller`: **6/33 pass, 27 fail** in Cursor report. `tools/api-integration/test/storyteller.integration.ts` contains `time.id='simulation-gameSeconds'` in multiple `CampaignStart` fixtures. The active `time.id` schema uses `/^[a-z0-9][a-z0-9.-]{0,99}$/`: capital `S` makes the fixture invalid. Other failing cases (notably custom-calendar `0 != 55`) need their own test assertion/engine diagnosis **after** the ID type issue is fixed.
2. `pnpm test:focus -- story-resolution`: **7/8 pass**; `tools/api-integration/test/helpers/app-integration.ts` cleanup/fixture teardown hits `storyteller_execution_stage_generation_id_fk` after OBS02 introduced stage rows. The test suite is still valuable; cleanup needs to respect new FK ownership (or proper cascade with an explicitly reviewed test-only meaning).

**These are not evidence all actual Storyteller gameplay is broken.** Equally, it is unacceptable to call the full integration boundary healthy while the suite is red.

## Narrow implementation

- Inspect the owning time schema, *then* change invalid **test fixture ID** from camelCase `simulation-gameSeconds` to a valid lowercase slug, preserving its intended fictional-second semantics; do **not** relax production input schema merely for old tests.
- Run the **entire focused storyteller suite**, capture the new failure set. Investigate the 55-day calendar case with actual `worldTime`/`gameSecond` source; preserve expected 55 and any meaningful world-obligation contract. If the expected result is wrong under accepted semantics, document source and review rather than simply adjusting assertion to 0.
- Fix only the **disposable integration teardown**: stage rows reference `generation` via restrict FK, so deleting generation may require deleting dependent `storyteller_execution_stage` in test cleanup/related fixture service **in the correct order**. Do not change production FK to cascade or delete user narrative evidence for testing convenience.
- Check other newly added OBS03 provenance/dispatch review FKs for the same teardown; the selected source fix must not leave the next test with a different blocked deletion.
- Run in a disposable `offscreen_auth_test` database only. `pnpm test:focus` **destroys/recreates this database** each invocation; read safety script and do not overlap suites.

## Actual tests and evidence required

~~~sh
pnpm test:focus -- storyteller
pnpm test:focus -- story-resolution
pnpm test:focus -- admin-situation
~~~

Record initial vs final test counts, exact commands/time and remaining failing test names (if any); a new state-machine failure is a legitimate issue requiring separate source review, not an invitation to loosen expectations. Check original timetick/55-calendar assertion, stage/capture idempotency and original cleanup. Confirm no provider outbound network or account use.

**Done** requires the two previously red named suites pass without relaxing production validation/foreign keys or skipping the problematic cases. If a genuine gameplay bug is exposed, leave `Verifying/Blocked` with an exact failure/repro and ask owner for a new bounded runtime Change. Do not mark green by removing tests.

**Out of scope:** model spend, OBS00-B/C/L, a new agent framework, production data, a state migration, and a full-repo format. Selection stays explicit. The only database this packet may touch is disposable.

## Receipt

Instant settlement now stops the campaign clock at a controlling obligation's due game second and leaves the later check unapplied. A world-event report accepts a journey with no current offer. A rolling usage window reads `clock_timestamp()` as an instant. An unfinished memory round may continue; a succeeded generation still cannot. A rejected review names its attempt. A granted repair round is inside the memory round ceiling. The journal control in the browser case opens Contents, then Journal.

Owners: packages/application/src/campaign/activities.ts, packages/application/src/campaign/reports.ts, packages/application/src/storyteller/window-accounting.ts, packages/application/src/storyteller/budget.ts, packages/application/src/storyteller/task-admission.ts, packages/application/src/storyteller/dispatch-review.ts, tools/api-integration/test/storyteller.integration.ts, tools/api-integration/test/helpers/app-integration.ts, docs/technical/engine/mechanics-and-capabilities.md, docs/technical/storyteller/operation-and-controller.md.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/gameplay/time-and-autonomy.md#mechanical-activities | product | unchanged because instant play already stays inside decision boundaries | docs/product/gameplay/time-and-autonomy.md at fe45f5aad69db5de631ed612ff6c2c23a01de29f | source-observed | the fifty-five second expectation stayed | the heading stayed in place |
| docs/technical/engine/mechanics-and-capabilities.md#admitted-action-and-time | technical | changed: instant settlement stops at a controlling obligation and leaves the later check unapplied | packages/application/src/campaign/activities.ts dirty against fe45f5aad69db5de631ed612ff6c2c23a01de29f | fixture-tested | the sixty-day check stays unapplied | the heading stayed in place |
| docs/technical/storyteller/operation-and-controller.md#current-prototype-runtime | technical | changed: an unfinished memory round may continue and a succeeded generation still cannot | packages/application/src/storyteller/budget.ts dirty against fe45f5aad69db5de631ed612ff6c2c23a01de29f | fixture-tested | a succeeded result still cannot keep the operation open | the heading stayed in place |
| packages/application/src/storyteller/window-accounting.ts | code | changed: the database clock is read as an instant before a rolling window compares it | packages/application/src/storyteller/window-accounting.ts dirty against fe45f5aad69db5de631ed612ff6c2c23a01de29f | fixture-tested | one of two shared-cap reservations is refused | the window limits stayed |
| packages/application/src/campaign/reports.ts | code | changed: a world-event report keeps a null offer when the journey has consumed its menu | packages/application/src/campaign/reports.ts dirty against fe45f5aad69db5de631ed612ff6c2c23a01de29f | fixture-tested | the winter report still records game second 20 | the report hook stayed |
| packages/application/src/storyteller/task-admission.ts | code | changed: a granted repair round fits inside the memory round ceiling the policy already allows | packages/application/src/storyteller/task-admission.ts dirty against fe45f5aad69db5de631ed612ff6c2c23a01de29f | fixture-tested | a policy of two rounds does not grow a third | the recipe ceiling stayed at three |
| packages/application/src/storyteller/dispatch-review.ts | code | changed: a rejected review names the attempt so the failed generation shape stays valid | packages/application/src/storyteller/dispatch-review.ts dirty against fe45f5aad69db5de631ed612ff6c2c23a01de29f | fixture-tested | a rejected review still does not dispatch | the check constraint stayed |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/README.md because the design index counts this repair as finished
exception: work/designs/open/backlog-convergence-2026-11-18/README.md because the backlog map records that this repair is finished
exception: work/designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md because the handoff marks this item finished
exception: STATUS.md because the status page no longer calls this packet blocked
exception: tools/api-integration/test/storyteller.integration.ts because the suite opens Journal and releases the uncertain admission block after its own assertion
exception: tools/api-integration/test/helpers/app-integration.ts because inline accounting can stop the worker an earlier case left running
exception: work/changes/archive/2026-11/other/2026-11-17--hk03-storyteller-test-boundaries/CHANGE.md because its link follows this packet into the archive
