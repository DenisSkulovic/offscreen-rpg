# SA10 evidence | loop failure lifecycle

**Date:** 2026-11-14. **Change:** [SA10](../../../../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa10-loop-failure-lifecycle/CHANGE.md). **Provider spend:** none. **DB:** none.

## What landed

- `loop-lifecycle.ts` — pure retry/charge/round gates matching existing recovery + memory runtime rules
- `retryStoryteller` now evaluates `evaluateStorytellerRetryGate` (no parallel FSM)
- Exported `publicReceiptRecovery`; uncertain → operator, unsent-class failures stay retryable
- Provider-free matrix tests in the packet’s named targets

## State / attempt matrix (provider-free)

| Situation | Gate / truth | Next legal action |
| --- | --- | --- |
| failed + attempt `unsent` | `confirmed-unsent` | same-intention retry |
| failed + settled invalid + repairable + open rounds | `captured-repair` | captured repair round only |
| succeeded + publication `blocked` | `publication-blocked` | requeue publication |
| generation / attempt `uncertain` | `uncertain-requires-operator` | no automatic replay |
| repairable rounds exhausted | `round-budget-exhausted` | blocked |
| settled invalid without repair recipe | `settled-without-repair` | blocked |
| duplicate retry id | idempotent no-op (DB) / gate records prior | no second resolution |
| memory final reserve round | capability `final` | no further decision reads |
| Chamber fail inject | one-shot | refresh does not invent a second fail |

## Proof

`memory-provider-runtime.test.mjs` · `storyteller-loop-lifecycle.test.mjs` · `resolution-receipt.test.mjs` · `storyteller-control.test.mjs` — 11/11 · `pnpm --filter @offscreen/application build`

## Unknowns / unproven here

- Live SQL worker crash/restart and exact outbox duplicate under disposable Postgres (not authorized this packet)
- Paid provider timeout/partial SSE envelopes
- ENG03 short-lock / CAS rewrite (excluded)
