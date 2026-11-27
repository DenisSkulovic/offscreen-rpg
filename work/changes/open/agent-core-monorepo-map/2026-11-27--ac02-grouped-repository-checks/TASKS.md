# AC02 | task queue
Base SHA: `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; latest: recheck target `implementation/agent-core-monorepo-map`.
Change state: Proposed; selected task: none; prerequisites: None.
Contract owners: [Agent Core](../../../../../docs/technical/platform/agent-core.md#review-findings-and-follow-through), [package map](../../../../../packages/README.md).
Tasks: T01 → T02 → T03. Serial within this Change; no parallel children required. Cross-Change concurrency in [group schedule](../README.md). Parent owns staging, closure and join. No live/paid operations. All cards are proposed for independent readiness, not dispatch authorization.

## T01 | Scan owned grouped source | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `scripts/repo-tools/module-graph.mjs`, `scripts/repo-tools/module-graph.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: scripts/repo-tools/module-graph.mjs::scanModuleGraph,listWorkspaceSources,isWorkspaceSource,loadPackages,packageForFile; scripts/repo-tools/module-graph.test.mjs::packageRecord and CLI fixture; scripts/repo-tools/README.md#known-limitations.
Algorithm: Load package records before listing source; pass records into listWorkspaceSources and isWorkspaceSource; keep repo scripts exception and generated/dist/.d.ts filters, then require a manifest-owned `${directory}/src/` prefix and .ts/.tsx. No arbitrary recursive scan. Reject duplicate package name across distinct dirs and duplicate dirs deterministically in loadPackages with existing manifest-unreadable route. Keep domain rules untouched. Add actual temp Git repo with `git init`, staged manifest/config/source and one commit (local fixture author); call exported scanModuleGraph with explicit root. Assert grouped undeclared import is diagnosed, then declared import resolved, README placeholder not a package, duplicate name fail closed. Keep existing injected graph tests.
Test: `pnpm repo:module-graph:test` at AC02 join.
Negative: Negative must go through real file enumeration, not a buildModuleGraph-only fixture.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T02 | Close grouped affected-manifest gap | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `scripts/repo-tools/affected-check.mjs`, `scripts/repo-tools/affected-check.test.mjs`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: scripts/repo-tools/affected-check.mjs::isWorkspacePackageManifest,decideAffectedScope; scripts/repo-tools/affected-check.test.mjs::deleted package manifest,package rename; packages/README.md#organization-and-e1-migration-boundary.
Algorithm: Extend exact manifest classifier to packages/(domain|ai|commerce|platform|foundation)/<leaf>/package.json alongside existing flat apps/packages/tools. No broadening to arbitrary depth, preserve normalized separators. Add grouped deletion/rename in temp-independent unit cases, verify full scope and exact reason. Existing docs/root/global/affected classification unchanged.
Test: `node --test scripts/repo-tools/affected-check.test.mjs` at join.
Negative: Grouped delete and both sides of rename select full; ordinary grouped source remains affected; non-family deep package-like path not a recognized manifest.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.

## T03 | Recognize grouped exported knowledge | PROPOSED

DEPTH=PATCH

Requires: None beyond Change prerequisites.
May write: `scripts/repo-tools/wiki-core/model.mjs`, `scripts/repo-tools/wiki-core/content-health-self-test.mjs`, `scripts/repo-tools/README.md`.
Must not write: sibling Change paths, production consumers, other manifests/lockfile unless explicitly named, shared runtime resources; parent owns closure.
Read: scripts/repo-tools/wiki-core/model.mjs::classifyPackageExport,classifyCommandAuthority,classifyKnowledgeBoundary; scripts/repo-tools/wiki-core/content-health-self-test.mjs; scripts/repo-tools/README.md#known-limitations.
Algorithm: Extend only the generic package path expressions to optional one recognized family segment. Preserve existing named persistence paths, route and content behavior. Add direct classifyKnowledgeBoundary tests for grouped manifest with exports, grouped src/index.ts export, grouped command schema and negative unrecognized nested path/test file. README records AC-M01 actual focused proof after join; document affected-check and knowledge classifier gap dispositions with evidence, not claim full E1 certification.
Test: `pnpm wiki:content-health --self-test` at join.
Negative: Old and grouped exports recognized; unrelated deep path/test not recognized. No change to named schema authorities.
Stop: Material source/contract mismatch, unexpected scope expansion, or assigned check failure after focused diagnosis.
Receipt: exact touched paths, diff/postcondition, assigned commands and actual results or NOT RUN/downstream owner, unexpected contradiction and durable finding destination.
