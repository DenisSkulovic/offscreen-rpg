# ENG03 | Composer dispatch plan: short-lock context

**Source baseline:** 584b594. **State stays Ready only for measured narrow capture**, not generic lock/Task migration. **Model:** Composer Standard for all selected subtasks; complex unknowns return to ChatGPT, not Grok. Canonical owner: docs/technical/engine/concurrency-and-recovery.md.

**Already landed, don't redo:** `campaign/narration.ts:preparePendingActionNarration` labels Stage 1 capture under lock without DocumentStore; `createConsequenceNarration` calls `materializePendingActionCapture(database, operationId, documentStore)` before the story-lock transaction for the supported pending action path. `storyteller/capture-materialization.ts` holds the off-lock materializer. `admission.ts:admitStorytellerInteraction` still calls `loadStorytellerContext(tx,...)` in a separate context; don't claim a repository-wide lock removal.

## T01 | Characterize one real lock I/O boundary | PLANNER-READY, VERIFY
**Read:** `campaign/narration.ts:preparePendingActionNarration/createConsequenceNarration`, `storyteller/capture-materialization.ts`, existing action narration tests. **Do:** use a disposable SQL fixture with an injected 2-second immutable-object read in the supported path; hold one transaction only as the code already does, then attempt an independent permitted writer. Capture lock wait and source identity. **Normal:** materialization does not hold story row FOR UPDATE across remote read. **Negative:** deliberately stale root/revision refuses publication; a second capture notice doesn't create a second task. **Stop:** if no safe fixture or no true slow-read injection seam, report exact missing harness. **No schema writes, provider, shared DB or broad refactor.**

## T02 | Repair a demonstrated narrow gap | PLANNER-BLOCKED UNTIL T01
**Decision gate:** planner reads actual timing, error trace and source to choose only the one case still performing document I/O under story lock. The executor gets a new explicit field/transaction algorithm and its negative after that. Do not move `loadStorytellerContext` wholesale or “optimize all Storyteller” based on a comment. If T01 passes, mark the targeted aim verified and leave larger ENG03 unselected, rather than making work.

## T03 | Reconcile exact status | PLANNER-READY, DOC after T01
Report tested cases vs NOT-RUN, lock duration and changed technical headings. No claim that all current/historical Storyteller source reads are off-lock. **No Grok required.**
