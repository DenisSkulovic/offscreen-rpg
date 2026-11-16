# ENG03-C1 | Capture committed finite-action narration off-lock

**State: Done for core path (2026-11-14); residual design-tightening still open.** Evidence: [eng03-c1-committed-capture-2026-11-14](../../../../../../docs/programs/engine/evidence/eng03-c1-committed-capture-2026-11-14.md). **Parent full ENG03:** remains Proposed. **Scope:** settled `gameActionReceipt.generationId` initially null only. Pending-consequence Done path unchanged.

**Authority:** [strict committed-action capture DTO and source table](../../../../../../docs/programs/engine/decisions/eng03-committed-action-capture-v1.md); [full purpose migration sequence](../../../../../../docs/programs/engine/decisions/eng03-capture-migration-sequence.md); [ENG03-M measured pending lock amplification](../../../../../../docs/programs/engine/evidence/eng03-lock-measurement-2026-11-14.md).

## What shipped

- Strict `CommittedActionContextCaptureV1` (`purpose=consequence` / `sourceKind=action-receipt`) beside pending capture.
- Stage 1 SQL-only freeze + provisional G + receipt.generationId=G + hold transfer + durable wake (no DocumentStore under lock).
- Stage 2 off-lock CAS materialize + promote same G to ordinary `consequence` task.
- Stage 3 C1 publication fence; legacy under-lock `admitActionNarration` DocumentStore path removed for this case.
- Provider-free unit + disposable live proofs; ENG03-narrow suite still green.

## Residual gaps vs latest design branch

Closed in harden pass (2026-11-14):

1. **Lock order:** unlocked receipt preflight → story lock → receipt `FOR UPDATE`.
2. **Execution ownership fence:** require `gameActionExecution.state='settled'` and `preparationGenerationId=NULL`.

Closed by [ENG03-C1-R](../../../../../../work/changes/archive/2026-11/eng/2026-11-15--eng03-c1-provisional-recovery/CHANGE.md) (2026-11-15):

3. **Provisional G status:** reads force `canRetry=false`; held exhausted uses operator blocker.
4. **Exhausted-attempt rearm:** application-private same-G rearm with durable audit epoch.

## Cursor first screen (original)

> **Goal:** create a second **strict capture purpose**, not a second capture coordinator. Replace the remaining story-locked DocumentStore read for a settled gameActionReceipt (no earlier speculative generation).
>
> **Keep one G:** campaignConsequenceTopic → short story-lock SQL freeze + provisional G → immutable CAS outside lock → promote same G → fenced publication.

## Allowlist / non-goals

Unchanged from design: no game physics changes, no pending-capture rewrite, no interrupted/activity/world/report/continuation/opening, no paid provider, no full ENG03 mega-rewrite.
