# ENG03-narrow | Provider-free proof (2026-11-14)

**Change:** [ENG03-narrow pending capture](../../../changes/archive/2026-11/eng/2026-11-14--eng03-narrow-pending-capture/CHANGE.md)  
**Provider spend:** zero (scripted offline execution; no model calls).

## What landed

- `ContextCaptureV1` + provisional `storyteller.context-capture.v1` generation
- Additive `storyteller_context_capture` migration `0003_eng03_context_capture`
- Stage 1 under action lock: SQL snapshot only (no DocumentStore)
- Stage 2 off-lock: CAS load → promote same G → `storyteller.profiled.v1` + storytellerTopic
- Settlement wake routes provisional G to `campaignConsequenceTopic`
- Publication companion fences when a capture row exists (jsonb-safe deep equality)

## Commands run

```text
pnpm --filter @offscreen/db build
pnpm --filter @offscreen/application build
pnpm infra:up
pnpm --filter @offscreen/application exec node --test test/eng03-context-capture.test.mjs test/eng03-narrow-capture.live.test.mjs
```

## Results (11/11 pass)

| Check | Result |
| --- | --- |
| Unit: ContextCaptureV1 accept + digest negative | pass |
| Unit: legacy pending-consequence decode without capture row | pass |
| Live: Stage 1 no DocumentStore under action lock | pass |
| Live: settle before Stage 2 → same G promote | pass |
| Live: settle during Stage 2 CAS delay → same G; settle ≪ CAS delay | pass |
| Live: promote → no publish before receipt → settle → publish exact G | pass |
| Live: duplicate materialization wakes → one ready G | pass |
| Live: missing CAS → not ready; generation stays provisional | pass |
| Live: 0/250/2000ms CAS inject does not scale action-lock hold | pass |

### Short-lock re-baseline (raw medians, ms)

| Injected CAS delay | actionHoldMedian | unrelatedMedian |
| --- | --- | --- |
| 0 | ~29 | ~2 |
| 250 | ~29 | ~4 |
| 2000 | ~28 | ~4 |

Previous ENG03-M baseline showed ~8s hold growth at 2000ms inject under the old in-lock DocumentStore path. Narrow path keeps action hold ~30ms across the matrix.

## Scope notes

- Interrupt / post-spend retirement remains on the existing ENG01 + hold paths; this packet does not add a second paid generation.
- Full ENG03 rewrite stays Proposed.
