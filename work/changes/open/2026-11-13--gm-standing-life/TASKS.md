# GM03 | Composer dispatch: three quiet repetitions, not autonomous life

**Baseline:** 584b594; **state:** Ready for the bounded quiet-watch slice. **Model:** Composer Standard. Canonical product: docs/product/gameplay/time-and-autonomy.md.

**Already landed:** `packages/application/src/campaign/accepted-plans.ts` exports `QUIET_REPEAT_ITERATION_LIMIT=3`, `quietRepeatableActivity`, `sameQuietRepeat`, `admitAcceptedPlanSuccessor`, plan schema with `horizonGameSecond`, `reenterAcceptedActivityPlan`. It accepts only repeatable unbounded **clock-wait.v1**, `completionFollowUp=quiet`, no checks, no effects. `campaign/accepted-plan-controls.ts` handles owner-bound cancellation and revision check; `campaign/activities.ts` drives successor. This is not generic repeatable work, resource-spending, or 24/7 NPC simulation.

## T01 | Pure finite horizon and cancellation proof | VERIFY PASS @ ec73a535
**Command:** disposable Postgres, `packages/application/test/gm03-quiet-repeat.live.test.mjs` — **6/6 PASS**. `tools/api-integration/test/storyteller-accepted-plan.integration.ts` **NOT-RUN** (parent withheld 3001/3100). **Proven in file:** three quiet waits to horizon, shorter horizon cancels pending third, interrupt at gameSecond 900, fourth admission rejected, idle and one-time-repeat admission rejected (no accrual), `cancel-pending` after one completion. **Not exercised:** altered plan, non-quiet effect, changed offer, wrong revision on cancel, active hold.

## T02 | One source-proven missing successor condition | PLANNER-BLOCKED
T01 did not surface a named successor gap in `campaign/activities.ts`. Remains blocked until a specific failure or owner-selected guard needs a patch. **Never** create an "autonomous agent", background timer or new Activity type to satisfy this packet.

## T03 | Status/source docs | DONE (documentation only)
Reconciled `docs/product/gameplay/time-and-autonomy.md#bounded-plans-for-absence`, `docs/technical/engine/authority-and-transitions.md#one-quiet-repeated-watch`, and GM03 `CHANGE.md` ledger. Comparator slice is fixture-proven; general standing life and full absence queue remain product dream. No autonomous-life claim.
