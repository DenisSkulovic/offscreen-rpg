# AC02 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- `scripts/repo-tools/module-graph.mjs`: `scanModuleGraph` currently lists sources before loading manifests; `listWorkspaceSources` uses git ls-files cached+untracked; `isWorkspaceSource` excludes generated/dist and .d.ts, allows non-test repo scripts, then flat-only regex. `loadPackages` reads explicit /* globs; `packageForFile` already uses longest directory prefix. `buildModuleGraph` reports undeclared workspace dependency and missing export; no change to domain-specific flat Story Engine/Application rules.
- `scripts/repo-tools/affected-check.mjs`: `isWorkspacePackageManifest`, `decideAffectedScope`; deleted or renamed manifest => full, any root-global path => full; `isWorkspaceSourcePath` already prefix-based. Only grouped manifest recognition needs edit. Existing tests cover flat delete and rename.
- `scripts/repo-tools/wiki-core/model.mjs`: `classifyPackageExport` tests flat package.json and src/index; `classifyCommandAuthority` flat src pattern. `classifyKnowledgeBoundary` composes these. Existing persisted entity paths are deliberate named owners, not generic glob; preserve. `wiki-core/content-health-self-test.mjs` is existing invoked self-test; add classifier cases there.
- `code-health-core.mjs::isInScopeSource` accepts broad packages/ prefix; `ci-change-scope.mjs` uses root prefixes; no edit. Actual scanner negative must use `scanModuleGraph` and Git fixture, not only `buildModuleGraph` with injected sources. AC01 owns image graph; no shared source path.

## Write boundary

- `scripts/repo-tools/module-graph.mjs`
- `scripts/repo-tools/module-graph.test.mjs`
- `scripts/repo-tools/affected-check.mjs`
- `scripts/repo-tools/affected-check.test.mjs`
- `scripts/repo-tools/wiki-core/model.mjs`
- `scripts/repo-tools/wiki-core/content-health-self-test.mjs`
- `scripts/repo-tools/README.md`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../README.md) governs cross-Change locks.
