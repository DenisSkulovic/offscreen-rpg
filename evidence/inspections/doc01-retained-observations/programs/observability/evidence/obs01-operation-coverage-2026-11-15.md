# OBS01 | Campaign operation coverage before first attempt (2026-11-15)

**Change:** [OBS01](../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs01-operation-coverage/CHANGE.md)
**Provider spend:** zero.

## What landed

- `listCampaignOperations` / campaign health union durable G from `story_resolution`, `story_passage.source_generation_id`, `campaign_report`, `storyteller_context_capture`, and `storyteller_attempt` (never `generation.ownerId` alone).
- Optional `attemptCoverage: recorded | none-recorded` on `RedactedOperationV1`.
- Stable composite cursor `(updatedAt, generationId)`.
- Held/blocked capture failure mapped to safe `safeFailureCode` without raw dumps.

## Proof

| Check | Result |
| --- | --- |
| Unit: projection + cursor | pass |
| Live: held provisional G without attempt listed once; cross-story isolation; campaign health pending | pass |

```text
pnpm --filter @offscreen/contracts exec tsc -b --force
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/admin-diagnostics.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/obs01-operation-coverage.live.test.mjs
```
