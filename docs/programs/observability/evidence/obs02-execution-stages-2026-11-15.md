# OBS02 | Runtime Storyteller stage receipts (2026-11-15)

**Change:** [OBS02](../../../changes/archive/2026-11/observability/2026-11-15--obs02-runtime-storyteller-evidence/CHANGE.md)  
**Provider spend:** zero. Scripted / provider-disabled disposable SQL only.

## What landed

- Additive `storyteller_execution_stage` (migration `0010_obs02_execution_stage`).
- `recordExecutionStage` / `listExecutionStages` with idempotent UNIQUE `(generation_id, stage, idempotency_key)`.
- Real-boundary writers: context capture (`cause-captured`), materialization start/complete/held, scripted execution (`task-prepared`, `stage-skipped`, `validation-settled`), publication (`publication-decided`).
- No narrative text in stage rows; no provider dispatch stages on scripted path.

## Proof

| Scenario | Result |
| --- | --- |
| Scripted consequence cause→task→validation→publication | pass |
| Held CAS-unavailable capture: no task/model/publication stages | pass |
| Duplicate delivery / stage insert idempotent; foreign G empty | pass |

```text
pnpm --filter @offscreen/db build
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/obs02-execution-stages.live.test.mjs
```

## Out of scope (still)

Admin timeline UI, OTel, paid provider rounds, memory-agent stages, OBS00-B authority.
