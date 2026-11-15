# OBS02-H | Same-G rearm/lease stage integrity, without phantom receipts

**State: Done (2026-11-15).** **Code-bearing:** source-local SQL stage receipt hardening + provider-disabled disposable DB tests. **OBS02 original pilot remains Done**; this residual integrity Change is separately verified. **Evidence:** [obs02-h](../../../../../programs/observability/evidence/obs02-h-stage-integrity-2026-11-15.md).

**Authority:** [post-OBS02 source review](../../../../../programs/observability/evidence/obs02-stage-integrity-review-2026-11-15.md), [claim-quality contract](../../../../../programs/observability/technical/evidence-claims-and-quality-v1.md), [capture crash fences](../../../../../programs/observability/technical/capture-transaction-protocol.md).

## Cursor first screen

> **One outcome:** every real context-materialization attempt across **original epoch 0 and operator rearm epoch 1** is distinguishable. A losing worker cannot write a terminal stage when its capture lease CAS did not apply. A repeated stage key with *different source facts* is reported as integrity conflict, not silently discarded.
>
> **Exact owners:** `packages/application/src/storyteller/{capture-rearm,capture-materialization,execution-stages}.ts`, `packages/db/src/schema/storyteller.ts::{storytellerContextCapture,storytellerContextCaptureRearm,storytellerExecutionStage}`, [OBS02 actual evidence](../../../../../programs/observability/evidence/obs02-execution-stages-2026-11-15.md), [ENG03-C1-R](../../eng/2026-11-15--eng03-c1-provisional-recovery/CHANGE.md).

## Landed delta

### A. Capture lease + atomic start record — Done

`claimCaptureLease` returns `rearmEpoch` and co-commits `context-materialization-started` with key `e{epoch}:a{attempt}` in the same transaction.

### B. Terminal release fence — Done

`releaseCaptureFailure` updates with `WHERE captureId AND leaseId RETURNING`. Only applied rows emit terminal stages keyed by `(epoch,attempt,state)`. Losers return `{ applied:false, reason:'lease-lost' }`.

### C. Duplicate-content integrity — Done

`recordExecutionStage` accepts identical substantive retries; divergent same-key payloads throw `ExecutionStageIntegrityError`.

### D. Stable read order — Done

`listExecutionStages` orders by `createdAt`, then `id` (tie-break only; not causal proof).

## Proven negatives

| Test | Result |
| --- | --- |
| Epoch 0 + rearm epoch 1 distinct starts/held | pass |
| Stale lease release → no terminal stage | pass |
| Divergent same-key conflict | pass |
| Identical retry no-op | pass |
| OBS02 scripted/held regression | pass |

## Exclusions honored

No new Staff privilege, raw archive, Temporal rewrite, player controls, or history backfill. Legacy OBS02 rows without epoch remain readable.
