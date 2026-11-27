# AC05 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- `src/missions/contracts.ts` and `src/policy/limits.ts` predecessor. `src/tools/registry.ts` owns static `CapabilityBinding` and `SyntheticToolRequest`; `src/tools/dispatch.ts` owns SDK wrapper only. No plugin root or provider/Worker imports. Host supplies callback statically from test-local Workflow adapter; no user callback crosses serialized mission boundary.
- Existing Vercel specimen `vercel.workflow.ts` uses `tool({inputSchema:z.object(...),execute:readDocument})`, `proxyActivities`, native generateText. E1 generalizes without a dynamic transport/registry framework. SDK `tool`, `ToolSet`, Zod 4.6.7 used directly. `INTERFACES.md` fixes tool types and Activity envelope shared with AC07/08.
- AC06 sees invalid SDK tool calls even when wrapper skipped; AC07 independently verifies trusted Workflow identity and fixture capability/args before effects. Do not simulate real authorization or assume Activity retries are exactly-once. No domain, Library or paid dispatch.

## Write boundary

- `packages/ai/agent-core/src/tools/registry.ts`
- `packages/ai/agent-core/src/tools/dispatch.ts`
- `packages/ai/agent-core/test/registry.test.mjs`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../README.md) governs cross-Change locks.
