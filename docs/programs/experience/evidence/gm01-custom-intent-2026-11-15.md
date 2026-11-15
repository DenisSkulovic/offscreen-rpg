# GM01 | Template-first custom intent interpretation (2026-11-15)

**Change:** [GM01](../../../changes/archive/2026-11/experience/2026-11-13--gm-custom-intent-proposal/CHANGE.md)  
**Policy:** [custom intent policy V1](../decisions/gm01-custom-intent-policy-v1.md)  
**Provider spend:** zero (`interpreter:'template.v1'`).

## What landed

- Migration `0008_gm01_custom_intent_candidate`: `story_public_inspect_target` + `custom_intent_candidate`.
- Provider-free template matcher with inspect family + reject/unsupported corpus routing.
- Authenticated `PUT /stories/:id/custom-intents/:interpretOperationId` → application `interpretCustomIntent`.
- Idempotent same-operation replay; conflict on text reuse; rate window/day caps; 5-minute candidate TTL.
- No gameSecond / revision mutation on interpret or reject.

## Proof

| Check | Result |
| --- | --- |
| Unit corpus (28 intents) security + inspect routing | pass |
| Live: reviewable inspect + idempotent replay + conflict + reject; clock unchanged | pass |
| API/application typecheck | pass |

```text
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/gm01-custom-intent-matcher.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/gm01-custom-intent.live.test.mjs
```

## Not done / next

GM02 admission of one reviewable inspect candidate into finite action receipt. Play composer UI deferred. No paid model interpretation.
