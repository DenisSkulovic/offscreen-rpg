# GM03 | Composer dispatch: three quiet repetitions, not autonomous life

**Baseline:** 584b594; **state:** Ready for the bounded quiet-watch slice. **Model:** Composer Standard. Canonical product: docs/product/gameplay/time-and-autonomy.md.

**Already landed:** `packages/application/src/campaign/accepted-plans.ts` exports `QUIET_REPEAT_ITERATION_LIMIT=3`, `quietRepeatableActivity`, `sameQuietRepeat`, `admitAcceptedPlanSuccessor`, plan schema with `horizonGameSecond`, `reenterAcceptedActivityPlan`. It accepts only repeatable unbounded **clock-wait.v1**, `completionFollowUp=quiet`, no checks, no effects. `campaign/accepted-plan-controls.ts` handles owner-bound cancellation and revision check; `campaign/activities.ts` drives successor. This is not generic repeatable work, resource-spending, or 24/7 NPC simulation.

## T01 | Pure finite horizon and cancellation proof | PLANNER-READY, VERIFY
**Read:** `accepted-plans.ts:quietRepeatableActivity/sameQuietRepeat`, `accepted-plan-controls.ts`, existing campaign accepted-plan and `tools/api-integration/test/storyteller-accepted-plan.integration.ts`. **Positive:** only 2–3 identical supported quiet waits admitted, cap/horizon respected. **Negative:** altered plan, non-quiet effect, repeated unique reward, changed offer, cancel revision or active hold cannot start a fourth or duplicate iteration. Report actual test runner/cwd and status; no SQL mutation unless approved disposable DB.

## T02 | One source-proven missing successor condition | PLANNER-BLOCKED UNTIL T01
If a specific failure shows `campaign/activities.ts` advances while cancelled, over horizon or under a controlling obligation, ChatGPT prepares exact guard and transaction test for one Composer patch. **Never** create an "autonomous agent", background timer or new Activity type to satisfy this packet.

## T03 | Status/source docs | PLANNER-READY AFTER PROOF
Reconcile which quiet-watch behavior is proven, what remains a product dream and where the state lives. Don't declare GM03 fully implemented because a pure comparator exists.
