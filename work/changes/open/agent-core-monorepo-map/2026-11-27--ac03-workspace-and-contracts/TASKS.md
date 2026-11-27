# AC03 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: None.
Contract owners: [Agent Core](../../../../../docs/technical/platform/agent-core.md#concrete-mission-contract), [package map](../../../../../packages/README.md).
Tasks: T01 → T02 → T03. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Create workspace and dependencies | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `pnpm-workspace.yaml`, `packages/ai/agent-core/package.json`, `packages/ai/agent-core/tsconfig.json`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: pnpm-workspace.yaml; packages/config/typescript/base.json; packages/workflows/package.json and tsconfig.json; docs/technical/platform/agent-core.md#e1-source-shape.
Algorithm: Retain flat globs; add explicit five family globs. Manifest private @offscreen/agent-core 0.0.0 type module, exports `.` and `./workflow` types/default to dist/index.d.ts/.js and dist/workflow.d.ts/.js. Scripts build=tsc, typecheck=tsc --noEmit, test=node --test test/*.test.mjs, qualify=node test/qualification.mjs (explicit, never invoked by test). Dependencies: ai 7.0.183, @temporalio/vercel-ai-sdk 2.0.0, @temporalio/workflow 1.24.0, zod 4.6.7, @ai-sdk/provider 4.0.39, @ai-sdk/mcp 2.0.66, long 5.3.2, protobufjs 8.7.1 (plugin peers explicit). devDependencies @temporalio/{worker,client,activity} 1.24.0, @offscreen/config workspace:*, typescript 5.9.3, @types/node 22.20.3. In workspace yaml add parent-scoped overrides `"@temporalio/vercel-ai-sdk@2.0.0>@temporalio/<name>": "1.24.0"` for activity/client/common/plugin/worker/workflow/workflow-streams only; no global override. tsconfig extends config/typescript/base, NodeNext module/resolution, rootDir src/outDir dist, declaration true, include src/**/*.ts; test-local TS bundled separately. Do not activate other manifests.
Test: Source gate; AC03 T03 owns lock resolution.
Negative: No production app dependency, no global pin or new build-script permission, no live qualify in ordinary test.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Create pure contracts and package navigation | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `packages/ai/agent-core/src/missions/contracts.ts`, `packages/ai/agent-core/src/index.ts`, `packages/ai/agent-core/README.md`, `packages/ai/inference/README.md`, `packages/ai/model-routing/README.md`, `packages/ai/ai-providers/README.md`, `packages/domain/library/README.md`, `packages/foundation/document-versioning/README.md`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: docs/technical/platform/agent-core.md#concrete-mission-contract; docs/technical/platform/agent-core.md#intentionally-limited-resolution-and-future-gates; packages/README.md#longer-term-responsibility-candidates.
Algorithm: Implement exact AgentDefinitionV1, MissionV1, MissionOutcomeV1 shapes as reviewed; only types, no SDK import. Root index exports those types using relative .js specifier. Add `missionWorkflowId(missionId:string):string` pure helper returning `agent-core-e1-${missionId}` (export root; AC04 validates UUID; AC07/08 use same helper). Package README links selected technical contract and package map, describes build/test/explicit qualify and NOT RUN standing; actual fixtures absent until successors. Create five tiny README-only placeholder leaves with purpose, owns/excludes, example consumer, candidate status, no manifest/export/dependency. No empty commerce/platform directories just for symmetry. Grouped placement remains incremental.
Test: Source gate, AC08 final compilation/exports.
Negative: Root export closure contains only serializable types and pure ID helper, no Worker/client/model imports; exactly five manifest-free leaves.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T03 | Resolve exact new importer | PROPOSED

DEPTH=PATCH

Requires: T01 and T02 source.
May write: `pnpm-lock.yaml`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: pnpm-workspace.yaml (T01); packages/ai/agent-core/package.json (T01); pnpm-lock.yaml; docs/technical/platform/agent-core.md#selected-boundary.
Algorithm: Run lockfile-only command in this Change worktree after T01/02; preserve existing lock importers and exact direct pins. Capture pnpm version, lock hash, new importer and resolved relevant peer/Temporal versions; compare original importer mappings and no unrelated churn. Registry access is dependency metadata/install only, no AI calls; no lifecycle scripts. Do not manually edit lock, approve scripts, override other packages, upgrade Zod elsewhere or force incompatible peers. If scoped pin syntax or compatible resolution fails, return precise pnpm diagnostic to planner; do not select new versions. Parent serializes lockfile write/merge against any other manifest work.
Test: `pnpm install --lockfile-only --ignore-scripts` plus lock inspection as PROOF.
Negative: Existing importers unchanged, patched Zod in new closure, no additional Temporal SDK versions; inability to prove is a stop.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
