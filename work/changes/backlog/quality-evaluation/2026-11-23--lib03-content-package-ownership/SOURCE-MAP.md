# LIB03 | Actual source map and ownership migration

**Evidence:** uploaded repository snapshot 484fd4a0; remote `undertaking/storyteller-workshop` was one LIB01 documentation merge beyond earlier planning HEAD when researched. Recheck all paths after LIB02. Tests have NOT been executed by this planner.

| Current location / API | New owner | Reason |
| --- | --- | --- |
| `packages/documents/src/world-import.ts`: `importWorldPackage`, `readWorldImportDirectory`, `importWorldPackageDirectory`, `worldPackageImportSchema`, limits | `packages/content-packages/src/world-import.ts` | WORLD.md, world-kind/visibility defaults, normalized path and file limits are source-content policy |
| `packages/documents/src/rule-import.ts`: `importRulePackage`, `importRulePackageDirectory`, `rulePackageImportSchema`, `rulePackageSourceSchema`, limits | `packages/content-packages/src/rule-import.ts` | RULES.md, adapter/engine/license/topic/file constraints are source-content policy |
| `packages/documents/src/start-import.ts`: `importStartPackageDirectory`, `startPackageSourceSchema`, limits | `packages/content-packages/src/start-import.ts` | START.md, activation and declared schema rules are authoring policy |
| `packages/documents/src/start-instantiation.ts`: `instantiateStartPackage` | `packages/story-engine/src/stories/start-package-instantiation.ts` | Campaign identity remap, verified reference pins, provenance, root delta and activation are game-domain behavior |
| `packages/documents/src/schema.ts`: `worldPackageManifestSchema`, `rulePackageManifestSchema`, `startPackageManifestSchema`, ref schemas | **Remain Documents** | Stable on-disk storage wire codecs; LIB02 concurrently owns checkpoint extraction |
| `packages/documents/src/local-store.ts`, `s3-store.ts`, `library-index.ts`, trie/page | **Remain Documents** | Content-addressed storage, generic Library roots and verified byte persistence |
| `packages/documents/src/markdown-metadata.ts` | **Remain Documents** | Shared markdown orientation/section helper and stable ID source, no duplicate code |

## Precise caller migrations
- `apps/api/src/default-rules-startup.ts` and `apps/game-authority/src/bootstrap/main.ts`: `importRulePackageDirectory` source changes to `@offscreen/content-packages` (retain DocumentStore from documents).
- `tools/chamber/src/main.ts`: imports world/rule/start directory importers from new workspace, retain other document imports.
- `tools/api-integration/test/start-package.integration.ts`, `storyteller-imported-start.integration.ts`, `boot03-imported-start-distributed.integration.ts`, `helpers/turn03-distributed-poc-fixture.ts`: named importers from content-packages, stored-manifest schemas and store from Documents. No test identity changes.
- `packages/story-engine/src/stories/start.ts`: `instantiateStartPackage` imports from `./start-package-instantiation.js` rather than Documents; verify that no other call site exists.
- `packages/documents/test/documents.test.mjs`: mixes generic store and importer/instantiation proofs. Split importer test cases into `packages/content-packages/test/`, and start-instantiation cases into Story Engine's test surface or an existing integration test, preserving fixture setup and assertions. Do not make Documents depend (even as test dev-dependency) on content-packages/story-engine.

## Package graph
`content-packages → documents, zod`; `story-engine → documents` (already) + content-packages only if actual direct API use exists; `api`, `game-authority`, `tools/chamber`, `tools/api-integration → content-packages` (new direct dependency), retaining Documents for storage access. Update exact manifests plus lockfile with pnpm. No content-packages import from Story Engine, app runtime, tools or database; no Documents import from content-packages. Respect existing TS project references and turbo build order.

## Contract to preserve
`importWorldPackage(storage,input)` and `importRulePackage(storage,input)` yield `{rootHash,manifest}`; world directory import also returns ignoredPaths; rule directory import returns source; start directory import returns `{rootHash,manifest,source}`; `instantiateStartPackage(storage,{startRootHash,campaignId,operationId,baseRootHash?,baseRootRevision?})` returns same root, manifest and activation-shaped start data. There is **no new catalog row or service registration**.
