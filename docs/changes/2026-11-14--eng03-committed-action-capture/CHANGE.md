# ENG03-C1 | Capture committed finite-action narration off-lock

**State: Done for core path (2026-11-14); residual design-tightening still open.** Evidence: [eng03-c1-committed-capture-2026-11-14](../../engine-architecture/evidence/eng03-c1-committed-capture-2026-11-14.md). **Parent full ENG03:** remains Proposed. **Scope:** settled `gameActionReceipt.generationId` initially null only. Pending-consequence Done path unchanged.

**Authority:** [strict committed-action capture DTO and source table](../../engine-architecture/decisions/eng03-committed-action-capture-v1.md); [full purpose migration sequence](../../engine-architecture/decisions/eng03-capture-migration-sequence.md); [ENG03-M measured pending lock amplification](../../engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md).

## What shipped

- Strict `CommittedActionContextCaptureV1` (`purpose=consequence` / `sourceKind=action-receipt`) beside pending capture.
- Stage 1 SQL-only freeze + provisional G + receipt.generationId=G + hold transfer + durable wake (no DocumentStore under lock).
- Stage 2 off-lock CAS materialize + promote same G to ordinary `consequence` task.
- Stage 3 C1 publication fence; legacy under-lock `admitActionNarration` DocumentStore path removed for this case.
- Provider-free unit + disposable live proofs; ENG03-narrow suite still green.

## Residual gaps vs latest design branch (not Done)

Latest `design/eng03-followon-committed-action-2026-11-14` still requires before calling C1 complete against the hardened contract:

1. **Lock order:** story lock before receipt `FOR UPDATE` (do not keep receipt-first ordering).
2. **Execution ownership fence:** matching `gameActionExecution.state='settled'` and `preparationGenerationId=NULL` (protect pending G).
3. **Provisional G status:** reads must not offer ordinary Storyteller retry for provisional capture kind; `canRetry=false` until promoted.
4. **Exhausted-attempt rearm:** explicit same-G operator rearm after bounded CAS exhaustion (no second paid G).

Track these as the next ENG03 follow-up slice (C1-harden), not as priorities 2–6.

## Cursor first screen (original)

> **Goal:** create a second **strict capture purpose**, not a second capture coordinator. Replace the remaining story-locked DocumentStore read for a settled gameActionReceipt (no earlier speculative generation).
>
> **Keep one G:** campaignConsequenceTopic → short story-lock SQL freeze + provisional G → immutable CAS outside lock → promote same G → fenced publication.

## Allowlist / non-goals

Unchanged from design: no game physics changes, no pending-capture rewrite, no interrupted/activity/world/report/continuation/opening, no paid provider, no full ENG03 mega-rewrite.
