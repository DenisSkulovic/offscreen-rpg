# SA06 evidence | need-aware recipe selection

**Date:** 2026-11-14. **Change:** [SA06](../../../../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa06-adaptive-recipe/CHANGE.md). **Provider spend:** none.

## What landed

- `assessTaskEvidenceNeed` — structured `task-evidence-need.v1` (no prose/LLM classifier)
- `selectAdmittedRecipeIntent` / `decideAdmittedRecipe` — intersects need with effective usage policy
- `prepareAdmittedStorytellerTask` uses adaptive selection when `creativeInput` is omitted; freezes `resources.recipeDecision`
- Optional `recipeDecision` on `storyteller-resources.v2` (old tasks remain readable)

## Decision rules (v1)

| Need | Policy | Recipe |
| --- | --- | --- |
| No structured investigation | rounds ≥ 2 | `repairable-turn` |
| No structured investigation | rounds = 1 | `single-turn` |
| Missing exact / older entity / creative preference | reads+rounds authorized | `memory-exploration.v1` |
| Missing mandatory/exact source | reads unauthorized | **hold** `storyteller_evidence_unavailable` |
| High allowance, no need | any | still single/repairable (no spend-up) |
| Explicit `creativeInput` | any | caller override (no auto decision) |

## Proof

`packages/application/test/adaptive-recipe.test.mjs` 4/4 · `@offscreen/storyteller` 48/48

| Case | Result |
| --- | --- |
| Simple dialogue + rich policy | repairable, not exploration |
| Same + missing relationship ref | memory-exploration |
| Missing source, maxReads=0 | hold |
| “do five research rounds” purpose text | ignored without structured refs |

## Unknowns

- Live connected quality of adaptive exploration vs one-shot
- Full admission path wiring of richer evidence-need from SQL context (defaults from captured context only)
- SA03 still owns activity-query efficiency
