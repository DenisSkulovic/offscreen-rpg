# OBS03 | Consequence prompt provenance sidecar (2026-11-15)

**Change:** [OBS03](../../../../work/changes/archive/2026-11/observability/2026-11-15--obs03-prompt-provenance/CHANGE.md)  
**Provider spend:** zero.

## What landed

- `storytellerPromptComponentCatalogueV1` (code-constant content SHAs; not in the compile path).
- `PromptProvenanceManifestV1` sidecar + `storyteller_prompt_provenance` (migration `0011`).
- Persist once on same-G Stage-2 promote for consequence / pending-consequence.
- Held capture before ready stores no manifest.

## Proof

| Check | Result |
| --- | --- |
| prepareStorytellerTask / OpenRouter inspect SHA unchanged with catalogue present | pass |
| Consequence sidecar components + no raw prompt text | pass |
| Promoted G: one durable manifest; held: none | pass |

```text
pnpm --filter @offscreen/storyteller build
pnpm --filter @offscreen/db build
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/obs03-prompt-provenance.test.mjs
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/obs03-prompt-provenance.live.test.mjs
```
