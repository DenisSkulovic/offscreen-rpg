# LIB02 | Separate scene-checkpoint schema ownership inside Documents

**State:** Done (2026-11-23). **Profile:** PATCH/CONTRACT, behavior-preserving. **Baseline:** `undertaking/storyteller-workshop@d3752e154291156f6fa9fe1a94700e213ff17049` (packet recorded `484fd4a09d9b5f22b46a89e217380d92d056055a`; current HEAD was ahead). **Integration:** `undertaking/storyteller-workshop`. **Prerequisite:** LIB01 terminology accepted and integrated.

## Why
`packages/documents/src/schema.ts` currently combines document envelopes, world/rule/start package schemas, Library root/node schemas and scene-checkpoint v1/v2 semantics in ~1,280 lines. This forces readers of generic document shapes to traverse game-state checkpoint contracts and confuses ownership. The smallest safe correction is an *internal module decomposition* without a public schema or import change. Do not create a workspace or change schema formats.

## Chosen implementation
- Move the contiguous scene-checkpoint-only schema implementation beginning at `maximumSceneCheckpointBytes` in `packages/documents/src/schema.ts` into `packages/documents/src/scene-checkpoint-schema.ts`. Include all private helper schemas/types needed by exported `sceneCheckpointV1Schema`, `sceneCheckpointV2Schema`, `sceneCheckpointSchema` and the `SceneCheckpointV1/V2/SceneCheckpoint` types.
- Avoid a schema.ts → scene-checkpoint-schema.ts → schema.ts import cycle: first move the *definition* of `contentHashSchema` from `schema.ts` into new `hash-schema.ts` (imports `zod` only), then import it directly from `hash-schema.ts` in both `schema.ts` and `scene-checkpoint-schema.ts`. Re-export `contentHashSchema` from `schema.ts` to preserve consumers. `canonicalJson` remains in `canonical-json.ts`. Checkpoint code at this baseline references `contentHashSchema` and `canonicalJson`, not `documentEnvelopeSchema`. No duplicate runtime definitions, no imports from the facade back into the extracted module.
- Preserve the exact existing named exports of `./schema.js` by re-exporting checkpoint schemas/types from the original `schema.ts`. Preserve `packages/documents/src/index.ts` and package.json public exports unchanged.
- Preserve Zod strictness, defaults, refinements, byte ceilings, parse outputs, checkpoint v1/v2 discriminators and storage hash identity. Never rewrite the schema while moving it. No fork-mechanics behavior change.
- Do not move Library trie, importers, store adapters or public consumers in this Change. No SQL, migrations, Kubernetes, provider calls or package graph changes.

## Source / consumers verified at baseline
`packages/documents/src/schema.ts`: checkpoint schema from `maximumSceneCheckpointBytes` to checkpoint exported types; `packages/documents/src/{local-store,s3-store}.ts`: import `sceneCheckpointSchema` and types from `./schema.js`; `packages/documents/test/scene-checkpoint.test.mjs` and `library-v2-schema.test.mjs` cover schema. Cross-package runtime imports retain old published barrel.

## Acceptance
`pnpm --filter @offscreen/documents test` plus `pnpm --filter @offscreen/documents typecheck`; dependent `@offscreen/story-engine` typecheck/build at minimal necessary scope; changed-file Prettier/quality-lint. Compare fixtures before/after: a valid v1 and v2 checkpoint parse identically, malformed v1/v2 remain rejected, canonical serialization and SHA-256 of fixtures unchanged; oversized and mechanical absence checks unchanged. **Do not call source-level pass a live fork proof.**

**Stop:** if an extracted helper depends on cycle-producing source declarations, or any public export/parse result/hash must change, stop with exact import symbol rather than redesign. Finish the whole Change in its linked worktree with focused tests and integration; no approval loop for in-scope source-only movement.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| packages/documents scene-checkpoint schema ownership | code | changed: checkpoint schemas live in `scene-checkpoint-schema.ts`; `contentHashSchema` and package reference schemas are leaves so the checkpoint module does not import the schema facade | `packages/documents/src/{schema,hash-schema,package-reference-schema,scene-checkpoint-schema}.ts` from `d3752e154291156f6fa9fe1a94700e213ff17049` | fixture-tested | malformed v1/v2 and oversized payloads still throw ZodError; documents tests 49 pass, 0 fail, 2 skipped | public `./schema.js` and package barrel re-export the same names |
| Zod parse, v1/v2 discriminators, canonical SHA-256 | code | unchanged: definitions moved literally; no wire or hash formula change | same baseline; `canonical-json.ts` untouched | fixture-tested | existing v2 hash equality and bad-hash store rejection stayed green | N/A |
| product and technical documents | product / technical | unchanged: no selected behavior or storage contract changed | no product/technical doc edit | source-inspected | no fork-mechanics, migration, or public import-path change | N/A |
| work/QUEUE.md | process | unchanged: LIB02 was an owner-commissioned parallel Change | same baseline | source-inspected | Current work line left on DXK09 | catalog link moves to archive |
