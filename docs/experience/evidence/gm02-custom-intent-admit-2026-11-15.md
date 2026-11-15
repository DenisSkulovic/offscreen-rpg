# GM02 | Admit one reviewable inspect candidate (2026-11-15)

**Change:** [GM02](../../changes/2026-11-13--gm-custom-intent-admission/CHANGE.md)  
**Policy:** [custom intent policy V1](../decisions/gm01-custom-intent-policy-v1.md)  
**Provider spend:** zero.

## What landed

- Migration `0009_gm02_custom_intent_accept`: `accepted_operation_id` + `accepted` status.
- `acceptCustomIntent` seals an automatic inspect plan, admits one finite action via existing execution/settlement path, clears decision hold.
- API `PUT /stories/:id/custom-intent-accepts/:operationId`.
- Idempotent command receipt; second accept of same candidate conflicts.

## Proof

| Check | Result |
| --- | --- |
| Live: interpret → accept → settle; +10 gameSeconds; duplicate ACK; re-accept conflict | pass |

```text
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/gm02-custom-intent-accept.live.test.mjs
```

## Not done

Play UI composer; model-assisted interpretation; other action families.
