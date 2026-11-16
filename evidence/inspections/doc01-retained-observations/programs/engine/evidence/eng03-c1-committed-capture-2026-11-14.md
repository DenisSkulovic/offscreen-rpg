# ENG03-C1 | Committed finite-action capture (2026-11-14)

**Change:** [ENG03-C1](../../../../../../work/changes/archive/2026-11/eng/2026-11-14--eng03-committed-action-capture/CHANGE.md)
**Design:** [committed-action capture V1](../../../../../../work/designs/parked/engine-studies/decisions/eng03-committed-action-capture-v1.md)
**Provider spend:** zero.

## What landed

- Strict `CommittedActionContextCaptureV1` (`purpose=consequence`, `sourceKind=action-receipt`) beside pending capture; shared pointer discriminant and `parseContextCapture`.
- Stage 1 `captureCommittedActionNarration`: SQL-only freeze under story lock; provisional `storyteller.context-capture.v1` G; receipt.generationId=G; hold transfer; durable `campaignConsequenceTopic` wake. **No DocumentStore under lock.**
- Stage 2 materialization reuses narrow lease/CAS promote path; builds ordinary `task=consequence` for the **same G**.
- Stage 3 publication fence for C1 companion rows (receipt + post-settlement digest + root/scene/settings).
- Removed legacy under-lock `admitActionNarration` DocumentStore path for null-generation receipts.

## Proof

| Check | Result |
| --- | --- |
| Unit: committed schema accept + digest negative | pass |
| Unit: pending capture still green | pass |
| Live: null-generation receipt → Stage1 → Stage2 same G / consequence task | pass |
| Live: capture purpose ≠ pending-consequence | pass |
| Live: ENG03-narrow suite (7) regression | pass |

```text
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/eng03-context-capture.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/eng03-c1-committed-capture.live.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/eng03-narrow-capture.live.test.mjs
```

Disposable sandbox Postgres via `provisionDisposableSandboxDatabase`; `pnpm infra:up` for compose.

## Not authorized / not done

Priorities 2–6 of the ENG03 migration sequence (interrupted / activity / world / reports / continuation / opening). Full ENG03 remains Proposed. No paid provider.
