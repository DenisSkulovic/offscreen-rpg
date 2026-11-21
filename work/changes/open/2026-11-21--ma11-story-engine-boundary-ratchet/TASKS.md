# MA11 | bounded Composer route, one parallel Cursor parent

Setup linked change/ma11-story-engine-boundary-ratchet worktree from current undertaking HEAD; run node scripts/repo-tools/change-branch-guard.mjs --change MA11 --target undertaking/storyteller-workshop. Parent executes T01–T03 then returns tested branch receipt for custodian integration.

T01 **Classifier**. Read scripts/repo-tools/module-graph-core.mjs and module-graph.test.mjs and packages/story-engine/src/stories/index.ts (read only). Write classifier and tests in module-graph-core.mjs + module-graph.test.mjs. Positive: 4 exact namespaces resolve. Negative: test/dist/foreign and bad path return null. Stop if overwriting old applicationDomain semantics.

T02 **AST graph and ratchet**. Read scripts/repo-tools/module-graph.mjs near classifyRelative and SCC rendering, plus packages/story-engine/src/stories/resolution.ts, packages/story-engine/src/campaign/reports.ts (read only). Write module-graph.mjs and tests. Implement five exact temporarily permitted edges and hard rejection of new backedges. Positive runtime/type split and source+line evidence. Negative sixth backedge and Engine→Lab fail. Stop if baseline errors must be muted.

T03 **Proof receipt**. Read module-graph.test.mjs and root scripts; run node --test scripts/repo-tools/module-graph.test.mjs, pnpm repo:module-graph, git diff --check, focused quality. Compare errors against MA08's existing two undeclared-import failures. Do not claim clean graph unless command actually passes. Return branch SHA and focused proof, no shared catalog/lockfile writes or own integration while parallel lanes active.

### Exact child-scope clarifications (supersede broad T02 instructions)

**T01 writes:** pure `storyEngineDomain(path)` with four exact namespaced classifications; update only `module-graph-core.mjs` and `module-graph.test.mjs`. Test Windows path, domain root vs file, invalid lookalike package, ignored test/generated paths, and unchanged `applicationDomain`.

**T02 writes:** only `module-graph.mjs` and focused tests. At `buildModuleGraph` declare `storyEngineFileEdges` and `storyEngineDomainEdges`; pass through `classifySpecifier`; in `classifyRelative` append Engine file edges for **all** internal relative imports, including within same Story Engine domain, after existing `resolveRelative`. Use separate cross-domain array for domain-only edges; create nodes from all current source files, not just edge endpoints; call existing `runtimeCycles`/`typeOnlyCycles`. Add six exact report arrays to `report` and `unavailableReport`. Write exact five-edge transitional allowlist with warning/error codes detailed in EXECUTION, and package-level Engine→Lab / pure→Engine runtime hard rules in `classifySpecifier`. Retain legacy report names/SCHEMA. No modifications to real Story Engine modules.

**T03 proof:** `node --test scripts/repo-tools/module-graph.test.mjs` from root; run `pnpm repo:module-graph` and preserve unrelated baseline failing import messages; synthetic fixture tests verify same-domain runtime cycle **is visible**, type-only cycle absent from runtime, permitted current backedge emits `authority-writer-debt`, sixth creates `forbidden-authority-writer-import`, and absent package manifest does not silently invent imports. Report actual PASS/FAIL truth.
