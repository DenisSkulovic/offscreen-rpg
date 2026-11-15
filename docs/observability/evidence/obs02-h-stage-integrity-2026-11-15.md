# OBS02-H | Stage integrity across rearm/lease (2026-11-15)

**Change:** [OBS02-H](../../changes/2026-11-15--obs02-h-stage-integrity/CHANGE.md)  
**Provider spend:** zero.

## What landed

- Materialization start co-committed with lease claim; keys include `(epoch, attempt)`.
- Terminal release uses lease CAS `RETURNING`; losers get `lease-lost` and write no authoritative held/failed stage.
- `recordExecutionStage` conflicts on same key with divergent substantive fields.
- Stable list order: `createdAt`, then `id`.

## Proof

| Case | Result |
| --- | --- |
| Identical retry no-op; divergent failureClass conflicts | pass |
| Stale lease release → no terminal stage; live lease unchanged | pass |
| Epoch 0 then rearm epoch 1: six distinct starts, two held keys | pass |
| OBS02 regression suite | pass |

```text
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/obs02-h-stage-integrity.live.test.mjs test/obs02-execution-stages.live.test.mjs
```
