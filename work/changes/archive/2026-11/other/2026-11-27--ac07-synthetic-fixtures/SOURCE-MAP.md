# AC07 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- R10 POC `vercel.model.mjs`: fake V4 `specificationVersion`, provider/modelId, supportedUrls {}, doGenerate, content tool-call (JSON input) or text, finishReason/usage/warnings; doStream/embedding/image throw. `common.mjs` historical fixture path and marker; counter is evidence only, not decision. Do not modify POC.
- Native plugin `AiSdkPlugin` accepts `{modelProvider,download,mcpClientFactories?}`; pinned plugin.ts lines 15–36, activities.ts 316–328, 543–584: default download may run before doGenerate; explicit async rejecting hook mandatory. `invokeModel` plugin heartbeat and abortSignal already provided. Model/tool fixtures use actual Activity Context.current().info, independent identity/receipt. Test-only inputs, no production credentials or file reads.
- AC03 public contracts and ID helper. AC05/06 planned request shape stable; AC07 writes only test fixtures and pure offline tests, not runtime files/host Workflow adapter; AC08 binds them. No TS build needed at this stage. Test `definitions.ts` compiled by Temporal bundler later; MJS tool fixture uses frozen equivalent definitions as data from `scenarios.mjs` or shared literal data module to avoid drift. Choose `scenarios.mjs` as single fixture truth with definition IDs/tool names/strings; definitions.ts imports typed literal data via test-local TS import with explicit narrow types or shared static declarations. Do not import Worker-side model/tools into Workflow bundle.

## Write boundary

- `packages/ai/agent-core/test/fixtures/definitions.ts`
- `packages/ai/agent-core/test/fixtures/model.mjs`
- `packages/ai/agent-core/test/fixtures/tools.mjs`
- `packages/ai/agent-core/test/fixtures/scenarios.mjs`
- `packages/ai/agent-core/test/fixtures.test.mjs`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../README.md) governs cross-Change locks.
