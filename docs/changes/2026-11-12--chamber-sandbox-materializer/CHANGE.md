# Change CH04 | Isolated persisted Sandbox with safe checkpoint reset

> **Cursor start:** [application developer map](../../../packages/application/src/developer-tools/README.md) + [local launch/DB guard](../../../tools/chamber/src/README.md). **Target:** [C02/C08/C09/C12/C13](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol 3](../../technical/chamber-lab-protocol.md#3-semantic-fixtures-and-isolation), [audit H01/H03/H13](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** an ordinary story fork cannot rewind Temporal or provider effects.

**State:** Specified/Proposed; **not** permission to reset any DB. **Depends on:** CH03. **Inspected baseline:** `470a5df`.

## One code-bearing outcome

Materialize a typed fixture into a **fresh, uniquely named disposable local PostgreSQL run DB**, with an actual application command/read path and safe reset/rematerialization from the same immutable recipe. A run's state cannot contaminate another run or the owner's existing `offscreen_chamber` manual stories.

## Binding engineering decisions

- Reject nonlocal/production/ordinary DB URLs and names **before connecting or dropping anything**. Use a distinct `offscreen_chamber_run_*` pattern, explicit guard, run ID ownership, connections closed and cleanup on failure/abort.
- Reach ordinary valid states through application operations where feasible. Permit test-only semantic fixture materializers *solely* for states otherwise requiring long gameplay, validating SQL constraints, owner scope and resulting public snapshot. Never expose raw mutation in normal Nest.
- Re-materialize a clean specimen for replay; **never** try to undo a committed worker/Temporal history. A sealed, quiescent PostgreSQL template clone is **optional only after measured startup savings**, not an immediate requirement.
- First real examples: partially earned shift with valid accepted plan, and an owned-item specimen; do not implement mechanics not present in the game.

## Acceptance

**Normal:** two isolated runs from same recipe yield equivalent current state and independent IDs/DBs.  
**Negative:** cross-run updates never leak, invalid fixture rolls back, wrong/remote DB refused before destructive SQL, interrupted run leaves no owned process/connection.  
**Verification:** narrow real disposable-DB integration **only after explicit owner permission**; zero provider calls and no browser/Temporal for this Change.

**Handoff:** inspect DB guard and one real use case, implement fixture materializer/cleanup with negative safety test; don't casually run `pnpm test:focus`, which resets a different disposable DB.
