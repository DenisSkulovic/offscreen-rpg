# AC08 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- All predecessors source joined: public root contracts/ID, Workflow-safe executeMission, statically bound schemas/tools, pure fixture data/model/Activity. `test/mission.workflow.ts` is test-local adapter, not production workflow registration. Root test=Turbo; new test script matches *.test.mjs only; `qualify` invokes qualification.mjs, not test. No edit root scripts or app manifests.
- Existing `infra/platform/temporal/namespaces.mjs::describeTemporalNamespace/createTemporalNamespace`, `infra/platform/common/profile.mjs::readPlatformProfile` own operator namespace setup; original `p0-p1/run.mjs` has loopback, explicit namespace and bounded credential-free environment. Existing dev profile `kind-offscreen-dev`, namespace `offscreen-dev-temporal`, svc temporal-frontend:7233, admin health. No automatic cluster ensure or namespace cleanup. Only owner creates namespace after explicit permission; no default/release/production/game slot. Use operator-run command in PROOF.
- SDK `Worker.create`, `worker.run()`, `shutdown()`, `Worker.runReplayHistory({workflowsPath,plugins},history,workflowId)` empirically demonstrated R10. `Client.workflow.start`, `getHandle/fetchHistory`, cancellation, actual history; use known task queue/run IDs, duplicate rejection via WorkflowIdReusePolicy REJECT_DUPLICATE / conflict FAIL (verify exact SDK exports). History event attributes activityTaskScheduled/Completed, map scheduledEventId to actual Activity identity; not count process memory alone.
- Existing `infra/images/common/workspace-graph.mjs::workspaceGraph` supports modes; compare output against immutable pre-E1 baseline; release `warm-path.test.mjs` is deterministic source/classifier proof. `image-closure.test.mjs::ensureBuilt/imageReady` builds or reuses tags, invokes Docker, and the pinned Node test can run containers even when `APP_RELEASE_SKIP_DOCKER=1`; explicitly excluded from assigned proof. Exact source comparison and four-app builds/typechecks remain required; module graph and affected/wiki tests owned by earlier Changes. Existing root lockfile and app manifests must remain unchanged except added new importer and resolution. Separate baseline Worker Zod issue remains documented; no claim E1 fixes it. Final technical owner must record exact source revision, evidence status and limits. No broad production acceptance or data mutation.

## Write boundary

- `packages/ai/agent-core/tsconfig.test.json`
- `packages/ai/agent-core/test/mission.workflow.ts`
- `packages/ai/agent-core/test/qualification.mjs`
- `packages/ai/agent-core/test/qualification-scenarios.mjs`
- `packages/ai/agent-core/test/qualification-recovery.mjs`
- `packages/ai/agent-core/test/qualification.test.mjs`
- `packages/ai/agent-core/README.md`
- `docs/technical/platform/agent-core.md`
- `packages/README.md`
- `scripts/repo-tools/README.md`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../../../../../designs/archive/agent-core-monorepo-map/implementation-record/README.md) governs cross-Change locks.
