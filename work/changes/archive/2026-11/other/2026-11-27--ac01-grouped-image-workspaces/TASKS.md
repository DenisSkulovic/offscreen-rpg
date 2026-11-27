# AC01 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: None.
Contract owners: [Agent Core](../../../../../../docs/technical/platform/agent-core.md#selected-boundary), [package map](../../../../../../packages/README.md).
Tasks: T01 → T02. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../../../../../designs/archive/agent-core-monorepo-map/implementation-record/README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Extend manifest index | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `infra/images/common/workspace-graph.mjs`, `infra/images/common/workspace-graph.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: infra/images/common/workspace-graph.mjs::loadWorkspaceIndex,workspaceClosure; infra/images/common/workspace-graph.test.mjs::writeWorkspace; packages/README.md#organization-and-e1-migration-boundary.
Algorithm: Scan exactly apps, packages, tools and packages/{domain,ai,commerce,platform,foundation} parents; retain one-level leaf scan per parent, normalize relative paths, skip manifest-absent dirs. Reject a manifest on a family directory (not a leaf); retain duplicate-name fail closed across all roots. Export `workspaceDirectoryForPath(root,file)` using indexed leaf directories, boundary-aware prefix and longest match, returning null when not owned. Keep `loadWorkspaceIndex` internal; no general glob parser or recursion. Tests create grouped runtime and build-only deps, README-only placeholder, unrelated deep directory, duplicate flat/grouped name and family manifest. Existing closure output sorting and modes unchanged.
Test: Source gate; AC01 join owns both focused test files.
Negative: Grouped leaf in correct closure, unregistered placeholder and duplicate family/name rejected; flat tests unchanged.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Resolve dev sync by leaf and release manifest classification | PROPOSED

DEPTH=PATCH

Requires: T01 source postcondition.
May write: `infra/images/development/sync-plan.mjs`, `infra/images/development/sync-plan.test.mjs`, `infra/images/release/select-affected-images.mjs`, `infra/images/release/test/warm-path.test.mjs`. These four paths are two small related classifiers and their tests, kept together to avoid an extra handoff.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: infra/images/development/sync-plan.mjs::resolveDevSync,isUnsafeDevSyncPath,rebuildPathsForImage; infra/images/development/sync-plan.test.mjs; infra/images/common/workspace-graph.mjs::workspaceDirectoryForPath (T01); infra/images/release/select-affected-images.mjs::requiresFullImageRebuild; infra/images/release/test/warm-path.test.mjs::workspace manifest edits require rebuilding every image.
Algorithm: Call shared workspaceDirectoryForPath(root,file); use actual leaf relative path for manifest/tsconfig (basename directly under leaf), non-app source, appDirs comparison. Preserve exported isUnsafeDevSyncPath(file, root=defaultRepoRoot()), root critical/migration/release/docs rules; pass root at internal call. For removed manifest, exact structural leaf manifest path (flat or named grouped family) remains unsafe even when no current index record; do not guess a consumer, root workspace/lock changes still select all. Unowned placeholder README is none; unowned nested source is not a workspace and selects no image. Unconsumed actual leaf may retain rebuild mode with empty images, never invent workload. Use test temp root with four app manifests and grouped dependency. Do not alter `IMAGE_TO_DEV_WORKLOADS`, sync directories or release build behavior. In release `WORKSPACE_MANIFEST_RE`, retain flat paths and add the exact alternative `packages/(?:domain|ai|commerce|platform|foundation)/[^/]+/package\.json` anchored to the complete path. Keep existing path normalization and conservative classification even if the leaf manifest was deleted; no filesystem existence requirement. Add assertions to the existing warm-path manifest test for grouped and flat manifests (true), grouped source, README-only paths, unrelated deep manifest and unknown family path (false). No image builds or Docker.
Test: Source gate; AC01 join command in PROOF.
Negative: Grouped dep source, package.json and tsconfig rebuild only dependent images; grouped placeholder no workload; app source still syncs; grouped leaf manifest triggers full release rebuild classification, not actual builds; unrelated deep manifest does not.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
