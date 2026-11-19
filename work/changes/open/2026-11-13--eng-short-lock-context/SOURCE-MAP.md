# ENG03 | exact lock/capture source investigation

**Inspected:** 584b594, 2026-11-20 review of source and previous ENG03 packet. No lock profiler was executed; no conclusion about milliseconds is claimed.

## What is already implemented

- `packages/application/src/campaign/actions.ts` invokes `preparePendingActionNarration` while admitting a finite action under story authority; `campaign/narration.ts:preparePendingActionNarration` calls **`capturePendingActionNarration(tx,current,...)`** with no DocumentStore. The receipt keeps `preparationGenerationId`.
- `campaign/narration.ts:createConsequenceNarration` first invokes `materializePendingActionCapture(database,operationId,documentStore)` **outside** its subsequent `database.db.transaction`. Within that transaction, it does receipt preflight, then locks story and receipt, checks `current.revision===receipt.baseRevision` and the terminal execution, then performs SQL-only `captureCommittedActionNarration`.
- `packages/application/src/storyteller/context-capture.ts` freezes versioned story/actor/passages/roots; `storyteller/capture-materialization.ts` loads pinned material and saves/holds through a source-checked CAS. A finished capture is **not** permission to publish after a stale story root.
- `packages/application/src/storyteller/admission.ts:admitStorytellerInteraction` still calls `loadStorytellerContext(tx,...)` inside the admission path. This is a **different** context class and may include source loading; do not claim universal off-lock behavior from pending-action code.
- Publication calls `packages/application/src/storyteller/publication.ts:publishStorytellerResult` after staging immutable objects, then checks current source under transaction. The old ENG03 packet's generic “move context outside lock” intent is **already partially achieved** for two selected paths.

## The actual unknown worth measuring

We need precise **which call** still causes external S3 read while holding a story `FOR UPDATE`, with an injected slow read and an unrelated permitted transaction's measured wait. A story-level business conflict is valid and cannot be eliminated merely by reducing lock time. Profiler must name operationId/storyId, start/end of TX, immutable read, lock acquisition and unrelated writer wait. No remote model, no payment.

**Source inspection for a focused test:** `campaign/narration.ts:createConsequenceNarration`, `storyteller/admission.ts:admitStorytellerInteraction`, `storyteller/context.ts:loadStorytellerContext`, `storyteller/capture-materialization.ts:materializePendingActionCapture`, `storyteller/publication.ts`. To characterize a specific SQL lock path, capture it via approved disposable PG; a mocked delay without a real row lock is not a lock-duration measurement.

**Risk:** if `loadStorytellerContext` depends on mutable facts read within the transaction, an off-lock rewrite must first freeze exact versions and recheck them; no `await Promise.all` trick changes that. A response for historical settled event and a current authoritative scene have different staleness policies. Any future edit needs that purpose-specific contract, not a blanket `same root` assertion.

**Selected immediate task:** [TASKS T01](TASKS.md#t01--characterize-one-real-lock-io-boundary--planner-ready-verify). General migration stays deferred until measurement.
