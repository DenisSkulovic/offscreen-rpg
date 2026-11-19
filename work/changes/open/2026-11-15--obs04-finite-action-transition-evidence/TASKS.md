# OBS04 | Composer dispatch: atomic finite-action evidence

**Source baseline:** 584b594. **State:** Ready for E0 bounded evidence, not permission for a generic forensic event-sourcing framework. **Default:** Composer Standard. Canonical owner: docs/technical/engine/chronology-and-activities.md.

**Existing source:** `packages/application/src/campaign/action-execution-transition.ts:decideActionExecutionTransition` returns typed waiting/interrupted/settled facts; `campaign/action-executions.ts:settleActionExecution` runs under the story transaction, `recordActionExecutionEvent` inserts a unique execution revision and `appendPublicStoryEvent` for terminal cases. `packages/db/src/schema/campaign.ts` already has `game_action_execution_event` and `game_action_execution_event_revision` uniqueness. The missing requirement is **evidence richness**, not “create an event table.” A new table/migration is NOT justified until exact absent before/after values are proven.

## T01 | Existing evidence inventory, test-only | PLANNER-READY, VERIFY
**Read:** above source symbols, `packages/db/src/schema/campaign.ts:gameActionExecutionEvent`, `campaign/follow-up-intents.ts`, `campaign/holds.ts`, action test harness. **Positive:** one settled and one interruption path record exactly one event and one linked public source ID under the commit. **Negative:** same operation retried/rolled after terminal event yields no extra revision/event/transfer. Use approved disposable PG only; do not run a migration.

## T02 | E0 missing fields, if demonstrated | PLANNER-BLOCKED UNTIL SOURCE PROOF
Planner compares actual event/receipt snapshot against requested canonical evidence (before/after clock, item ownership, obligation, source passage) and chooses the **smallest missing typed datum**. Then Composer may add one field/index and one transactional write + rollback test. Do not duplicate values inferable from immutable receipt or invent new tenant-wide event store. One schema migration owner.

## T03 | Close/hold correctly | PLANNER-READY
Record event source identity, SQL proof tier and NOT-RUN migration. An event description in docs is not a new persisted fact. **No Grok substitute for this measurement.**
