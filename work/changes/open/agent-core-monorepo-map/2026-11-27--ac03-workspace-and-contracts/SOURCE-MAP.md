# AC03 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- `pnpm-workspace.yaml` packages apps/*, packages/*, tools/* and allowBuilds; retain all existing entries and build script policy. `.npmrc` save-exact + engine-strict; root Node >=24.19 <25, pnpm 11.19.0, TypeScript 5.9.3. Root `test` invokes Turbo, whose test depends on build. Do not edit root scripts or Turbo config.
- `packages/config/package.json` exports `./typescript/base`; base ES2023 strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes. `packages/workflows/package.json` and tsconfig establish dist exports, NodeNext rootDir src. New workspace deliberately type:module. Existing `apps/worker` and `packages/workflows` use Temporal 1.24.0. Existing Zod 4.6.5 exposure is distinct; do not change other importers.
- Exact patched experiment in immutable reviewed R10 (`work/designs/open/agent-core-monorepo-map/technology-selection/experiments/p0-p1/README.md`) uses AI 7.0.183, plugin 2.0.0, Provider 4.0.39, MCP 2.0.66, Zod 4.6.7, long 5.3.2, protobufjs 8.7.1, aligned Temporal 1.24.0. Published plugin pinned source package.json has Temporal activity/client/common/plugin/worker/workflow/workflow-streams dependency ranges ^1.24.0; peer ai, provider, MCP, long, protobufjs. Keep exact plugin-scoped overrides; no global dependency upgrade. Existing root lockfile YAML importers are the comparison baseline.
- `packages/README.md` permanent map and `docs/technical/platform/agent-core.md#concrete-mission-contract` own selected meaning. No package exists yet; new source paths deliberately exact. AC06 supplies workflow export target, AC04/05 supply tests; expected incomplete tree on design branch only.

## Write boundary

- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `packages/ai/agent-core/package.json`
- `packages/ai/agent-core/tsconfig.json`
- `packages/ai/agent-core/README.md`
- `packages/ai/agent-core/src/index.ts`
- `packages/ai/agent-core/src/missions/contracts.ts`
- `packages/ai/inference/README.md`
- `packages/ai/model-routing/README.md`
- `packages/ai/ai-providers/README.md`
- `packages/domain/library/README.md`
- `packages/foundation/document-versioning/README.md`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../README.md) governs cross-Change locks.
