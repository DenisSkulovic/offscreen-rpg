# AC01 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- `infra/images/common/workspace-graph.mjs`: `WORKSPACE_ROOTS`, `loadWorkspaceIndex`, `workspaceClosure`, `workspaceGraph`, `selectWorkspaceImages`. Closure follows workspace:* only; runtime dependencies/optionalDependencies, build additionally dev/peer. Existing duplicate-name throw and sorting must survive. `normalizeRelative` guards path traversal. Keep four IMAGE_APP entries unchanged.
- `infra/images/development/sync-plan.mjs`: `workspaceDirForPath`, `isWorkspaceDependencySourcePath`, `isAppManifestOrTsconfig`, `isUnsafeDevSyncPath`, `resolveDevSync`, `rebuildPathsForImage`; root-wide inputs and DB migrations are explicitly special. Only app source may live sync. Existing public `isUnsafeDevSyncPath(file)` calls in its test are retained via optional root default. `rebuildPathsForImage` already consumes closure dirs.
- Release `production-workspace-closure.mjs` delegates runtime closure; `select-affected-images.mjs` uses build graph/prefix selection, but `WORKSPACE_MANIFEST_RE` / `requiresFullImageRebuild` miss grouped manifests. Extend only the classifier; `warm-path.test.mjs` already has a deterministic manifest regression test. No Docker or release execution. Dev `Dockerfile` copies `packages` recursively; `image-plan.mjs::DEV_IMAGE_COPY_DIRS/isDevImageCopyInput/listContextFiles` fingerprints recursively, no edit. DB path consumers remain flat.
- Existing tests `workspace-graph.test.mjs::writeWorkspace`, duplicate/missing dependency and closure mode; `sync-plan.test.mjs` asserts app source sync, package source rebuild, root lock and migrations rebuild, docs/release excluded. Use tmp manifests for grouped cases; no real Docker, Tilt, cluster or existing manifest edit.

## Write boundary

- `infra/images/common/workspace-graph.mjs`
- `infra/images/common/workspace-graph.test.mjs`
- `infra/images/development/sync-plan.mjs`
- `infra/images/development/sync-plan.test.mjs`
- `infra/images/release/select-affected-images.mjs`
- `infra/images/release/test/warm-path.test.mjs`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../../../../../designs/archive/agent-core-monorepo-map/implementation-record/README.md) governs cross-Change locks.
