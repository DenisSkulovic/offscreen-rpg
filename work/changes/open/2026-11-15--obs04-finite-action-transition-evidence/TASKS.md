# OBS04 | Composer dispatch: atomic finite-action evidence

**Planner investigation:** [SOURCE-MAP.md](SOURCE-MAP.md) establishes actual source-state and forbidden shortcuts at baseline `584b594`. Cursor reads this only for the selected symbol/contradiction, not as compulsory full-context preload.

**Source baseline:** 584b594; **T01 inspected SHA:** `ec73a535`. **State:** T01 VERIFY PASS (7/7); T02 **PLANNER-BLOCKED** until smallest missing datum is named; migration **NOT-RUN**; packet open, not Done. Ready for one bounded E0 witness only after T02; not permission for a generic forensic event-sourcing framework. **Default:** Composer Standard. Canonical owner: [chronology-and-activities.md](../../../../docs/technical/engine/chronology-and-activities.md).

**Existing source:** `packages/application/src/campaign/action-execution-transition.ts:decideActionExecutionTransition` returns typed waiting/interrupted/settled facts; `campaign/action-executions.ts:settleActionExecution` runs under the story transaction, `recordActionExecutionEvent` inserts a unique execution revision and `appendPublicStoryEvent` for terminal cases. `packages/db/src/schema/campaign.ts` already has `game_action_execution_event` and `game_action_execution_event_revision` uniqueness. The missing requirement is **evidence richness**, not “create an event table.” A new table/migration is NOT justified until exact absent before/after values are proven.

## T01 | Existing evidence inventory, test-only | VERIFY PASS (`ec73a535`)

**Command:** `pnpm --filter @offscreen/application exec node --test test/item-transfer-transition.test.mjs test/world-obligation-transition.test.mjs test/eng01-item-transfer.live.test.mjs` on disposable `offscreen_chamber_run_*` Postgres for the live file only — **7/7**, 0 fail (5 pure + 2 ENG01 live SQL).

**Event source identity (terminal finite-action commit, same story transaction):**

| Durable row | Writer | Role |
| --- | --- | --- |
| `game_action_execution_event` | `recordActionExecutionEvent` in `campaign/action-executions.ts` | One append per terminal execution revision; `(execution_id, execution_revision)` unique in schema |
| `story_public_event` | `appendPublicStoryEvent` from the same helper for terminal kinds | One public projection per terminal path in exercised fixtures; **not** SQL-asserted 1:1 with execution event in this inventory |
| `game_action_receipt` | `settleActionExecution` on settled paths only | Mechanical receipt/effects; absent on interrupt-without-transfer paths exercised |

**SQL proof tier:** pure transition files **fixture-exercised**; ENG01 live file **live-observed** on disposable chamber SQL only. **Not proved here:** post-terminal transaction rollback after event insert; durable before/after witness (`transitionSequence`, typed `changed[]`, pre/post clock and hold snapshots).

## T02 | E0 missing fields, if demonstrated | PLANNER-BLOCKED UNTIL SOURCE PROOF
Planner compares actual event/receipt snapshot against requested canonical evidence (before/after clock, item ownership, obligation, source passage) and chooses the **smallest missing typed datum**. Then Composer may add one field/index and one transactional write + rollback test. Do not duplicate values inferable from immutable receipt or invent new tenant-wide event store. One schema migration owner.

## T03 | Close/hold correctly | DOC RECEIPT (2026-11-20)

**Result:** Recorded after T01 at `ec73a535` — event source identity and SQL tiers in T01 above; this receipt does not create persisted facts.

| Item | Label | Basis |
| --- | --- | --- |
| Terminal execution event + public link | source-observed under commit | 7/7 transition tests; uniqueness on execution revision; public append on terminal kinds |
| 1:1 execution-event ↔ public-event | **not SQL-asserted** | T01 inventory only; no dedicated uniqueness join test |
| Post-terminal rollback harness | **NOT-RUN** | No disposable SQL test induces rollback after terminal event insert |
| E0 `FiniteActionTransitionEvidenceV1` / migration | **NOT-RUN** | T02 blocked until planner names smallest non-inferable datum; no schema owner |
| Canonical [chronology status list](../../../../docs/technical/engine/chronology-and-activities.md) | **unchanged** | OBS04 transition witness correctly stays outside that proof boundary |

**Blocker:** T02 planner must pick the smallest missing typed datum (before/after clock, holds, obligation cause, or equivalent) without inventing a tenant-wide event store. **Packet stays open; not Done.** No Grok substitute for rollback or migration measurement.
