# ENG03-C2 | Interrupted-action capture (2026-11-15)

**Change:** [ENG03-C2](../../../../../../work/changes/archive/2026-11/eng/2026-11-15--eng03-c2-interrupted-action-capture/CHANGE.md)
**Design:** [interrupted-action capture V1](../../../../../../work/designs/parked/engine-studies/decisions/eng03-interrupted-action-capture-v1.md)
**Provider spend:** zero.

## What landed

- Strict `InterruptedActionContextCaptureV1` (`purpose=consequence`, `sourceKind=action-interrupted`) beside C1/pending; purpose+sourceKind parse/pointer discriminant.
- Stage 1 `captureInterruptedActionNarration`: SQL-only freeze under story lock; provisional `storyteller.context-capture.v1` G; link `campaignConsequence.generationId`; hold transfer; durable wake. **No DocumentStore under lock.** No `gameActionReceipt`.
- Stage 2 materialization builds ordinary `task=consequence` with one factual interrupted receipt (`offer:null`, no roll/effects); same G promote.
- Stage 3 publication fence for interrupted companion (execution interrupted, event match, absent success receipt, post-interrupt digest).
- Removed under-lock `admitActionInterruptedNarration` DocumentStore path.

## Lock proof (injected CAS delay)

| Metric | 500ms CAS inject |
| --- | --- |
| Stage-1 prepare | ~28ms |
| Same-story contender wait during Stage-1 | ~9ms |
| Stage-2 materialize | ~2065ms (observes CAS) |

Stage-1 hold does not scale with DocumentStore delay; CAS cost is off-lock.

## Proof

| Check | Result |
| --- | --- |
| Unit: interrupted schema + parse discriminant + digest negative | pass |
| Live: interrupt → Stage1 → Stage2 same G / factual consequence | pass |
| Live: Stage-1 vs CAS delay lock proof | pass |
| Live: duplicate prepare one G / no success receipt | pass |
| Live: ENG01 interrupt regression (DocumentStore wired) | pass |
| Live: ENG03-C1 regression | pass |

```text
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/eng03-context-capture.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/eng03-c2-interrupted-capture.live.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/eng01-item-transfer.live.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/eng03-c1-committed-capture.live.test.mjs
```

Disposable sandbox Postgres via `provisionDisposableSandboxDatabase`; `pnpm infra:up` for compose.

## Not authorized / not done

ENG03 priorities 3–6 (activity / world / reports / continuation / opening). Remaining GM packets Proposed. No paid provider.
