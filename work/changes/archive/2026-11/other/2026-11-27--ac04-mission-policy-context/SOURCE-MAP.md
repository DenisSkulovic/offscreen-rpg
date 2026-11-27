# AC04 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- New code only under named paths. Predecessor `src/missions/contracts.ts` and root `src/index.ts::missionWorkflowId` exact interface from AC03. No legacy Storyteller internals consulted or imported.
- Permanent `docs/technical/platform/agent-core.md#concrete-mission-contract` and `#deterministic-fixture-and-result-rules` govern behavior; `INTERFACES.md` here defines internal function shapes. AC05 registry passes trusted names, AC06 calls validation/context/ledger; AC07/08 use immutable fixture definitions. No Temporal dependency in these pure modules.
- Use TS NodeNext and strict types, no implicit any / unsafe assertion. Offline `node:test` MJS tests import built dist path; no Temporal client, Worker or environment required. AC08 owns executing maintained package tests after complete build.

## Write boundary

- `packages/ai/agent-core/src/missions/validate.ts`
- `packages/ai/agent-core/src/context/assemble.ts`
- `packages/ai/agent-core/src/policy/limits.ts`
- `packages/ai/agent-core/test/admission.test.mjs`
- `packages/ai/agent-core/test/limits.test.mjs`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../README.md) governs cross-Change locks.
