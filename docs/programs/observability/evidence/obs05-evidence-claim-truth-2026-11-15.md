# OBS05 | Evidence claim truth (v2 lineage) (2026-11-15)

**Change:** [OBS05](../../../../work/changes/archive/2026-11/observability/2026-11-15--obs05-evidence-claim-truth/CHANGE.md)  
**Provider spend:** zero.

## What landed

- Kept `storyteller-evidence-lineage.v1` fixtures/readers unchanged (including historic `model-ignored` label on v1 classifier).
- Added `createStorytellerEvidenceLineageV2` (`storyteller-evidence-lineage.v2`):
  - `packet-included-uncited` observation instead of automatic model-ignored
  - per-stage `observation`: observed / derived-from-task / unknown
  - `claimPublished` separate from generation publication status
  - `packetBinding: task-request-derived` (not actual transport bytes)

## Proof

| Check | Result |
| --- | --- |
| V1 gift/pruned/ordinary/false-citation fixtures | pass |
| V2 uncited inclusion ≠ model-ignored | pass |
| V2 pruned still selected-then-pruned | pass |

```text
pnpm --filter @offscreen/storyteller build
pnpm --filter @offscreen/storyteller exec node --test --test-name-pattern="evidence lineage|OBS05" dist/test/storyteller.test.js
```
