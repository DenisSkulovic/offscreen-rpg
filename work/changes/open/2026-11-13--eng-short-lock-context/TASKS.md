# ENG03 | Composer dispatch plan: short-lock context

**Planner investigation:** [SOURCE-MAP.md](SOURCE-MAP.md) establishes actual source-state and forbidden shortcuts at baseline `584b594`. Cursor reads this only for the selected symbol/contradiction, not as compulsory full-context preload.

**Source baseline:** 584b594. **State stays Ready only for measured narrow capture**, not generic lock/Task migration. **Model:** Composer Standard for all selected subtasks; complex unknowns return to ChatGPT, not Grok. Canonical owner: docs/technical/engine/concurrency-and-recovery.md.

**Already landed, don't redo:** `campaign/narration.ts:preparePendingActionNarration` labels Stage 1 capture under lock without DocumentStore; `createConsequenceNarration` calls `materializePendingActionCapture(database, operationId, documentStore)` before the story-lock transaction for the supported pending action path. `storyteller/capture-materialization.ts` holds the off-lock materializer. `admission.ts:admitStorytellerInteraction` still calls `loadStorytellerContext(tx,...)` in a separate context; don't claim a repository-wide lock removal.

## T01 | Characterize one real lock I/O boundary | VERIFY PASS (2026-11-20, `ec73a535`)
**Command:** `node --test packages/application/test/eng03-narrow-capture.live.test.mjs` — **7/7 pass**, provider-free disposable Chamber.

**Lock / I/O (injected `createEng03DelayedDocumentStore`, 2000 ms immutable read on Stage 2 materialization):** Stage 1 story-lock hold median **~30.7 ms** with delay vs **~30.1 ms** with 0 ms delay (same path, no scaling with remote read). Unrelated permitted writer on the same story while capture holds lock: **~4.4 ms** wait (`lockOwnedStory` slice).

**Proven in this run (pending committed consequence path only):** `materializePendingActionCapture` runs before the story `FOR UPDATE` transaction; duplicate `prepareCampaignConsequence` → one capture generation; corrupt materialization CAS → held capture (no fabricated publish); publication remains **pending** until settlement fence (stale root / unsettled generation).

**NOT-RUN / out of scope for T01:** `admitStorytellerInteraction` → `loadStorytellerContext(tx,…)` still performs context load inside the admission transaction — not characterized or repaired here. No claim that all Storyteller source reads are off-lock.

**Read:** `campaign/narration.ts:preparePendingActionNarration/createConsequenceNarration`, `storyteller/capture-materialization.ts`, existing action narration tests. **Do:** use a disposable SQL fixture with an injected 2-second immutable-object read in the supported path; hold one transaction only as the code already does, then attempt an independent permitted writer. Capture lock wait and source identity. **Normal:** materialization does not hold story row FOR UPDATE across remote read. **Negative:** deliberately stale root/revision refuses publication; a second capture notice doesn't create a second task. **Stop:** if no safe fixture or no true slow-read injection seam, report exact missing harness. **No schema writes, provider, shared DB or broad refactor.**

## T02 | Repair a demonstrated narrow gap | PLANNER-GATED (post-T01)
**Decision gate:** planner reads actual timing, error trace and source to choose only the one case still performing document I/O under story lock. The executor gets a new explicit field/transaction algorithm and its negative after that. Do not move `loadStorytellerContext` wholesale or “optimize all Storyteller” based on a comment. T01 did **not** demonstrate a gap on the measured pending-consequence path; admission/context admission was **NOT-RUN**. If a later planner pass selects a concrete gap, executor work remains explicit — no automatic broad ENG03 migration.

## T03 | Reconcile exact status | DOC (2026-11-20)
**Canonical headings touched:** none — [concurrency and recovery](../../../../docs/technical/engine/concurrency-and-recovery.md) sentences remain true after T01 (C2 already states Stage 1 hold does not scale with injected document-store delay; “what is still not done” still applies to full ENG03 and in-tx admission reads). **DIST01 / GM03:** not edited.

**Packet updates:** this file (T01/T02/T03 receipts); [SOURCE-MAP.md](SOURCE-MAP.md) (measured boundary vs remaining admission unknown). **Change state:** not promoted to Done; parent ENG03 full refactor stays excluded per [CHANGE.md](CHANGE.md).

| Area | T01 result |
| --- | --- |
| Pending action: off-lock materialization + short Stage 1 lock | **Proven** (timing + negatives above) |
| Duplicate capture / corrupt CAS / publish fence | **Proven** (same test file) |
| `admitStorytellerInteraction` / `loadStorytellerContext` in-tx | **NOT-RUN** |
| T02 targeted repair | **NOT-RUN** (planner-gated; no demonstrated gap on measured path) |
| Activity / world / report / opening capture | **NOT-RUN** (still outside C1–C2 + this slice) |

**No Grok required.**
