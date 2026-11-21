# MA11 | exact current AST tool call graph and debt inventory

**Source:** MA08-integrated `6dd1276131a813f694ec3bccf4f9062ad3708208`, repository root `scripts/repo-tools/`.

| Current symbol | Actual behavior | MA11 change |
| --- | --- | --- |
| `module-graph-core.mjs:applicationDomain(filePath)` | Recognizes legacy `packages/application/src/<domain>/<file>` only | Preserve this exported function for synthetic fixtures; add separate normalized `storyEngineDomain(filePath)` |
| `module-graph-core.mjs:runtimeCycles,typeOnlyCycles,stronglyConnectedComponents` | Tarjan on named nodes/typed edges; runtime includes runtime/reexport/dynamic, type-only separate | Reuse as-is; do not substitute domain SCC for file SCC |
| `module-graph.mjs:buildModuleGraph(input)` | Sorted `input.sources` → `collectSpecifiers` AST → `classifySpecifier`; `sourceEdges` for package references, `domainEdges` for legacy Application | Define new `storyEngineFileEdges` and `storyEngineDomainEdges` containers; include in report with SCC arrays |
| `module-graph.mjs:classifyRelative` ~606–630 | `resolveRelative(file,specifier,fileSet,exists)` turns TS NodeNext `.js` specifier into TS source. Then legacy Application-domain early return, ignores all equal-domain edges | Before old early return, append **every** resolved Engine-internal file edge; append domain edge only when Engine domains differ. Do not alter old Application behavior |
| `module-graph.mjs:classifySpecifier` ~537–606 | Resolves workspace package, export, production edge and undeclared dependency; `pushMismatch` creates hard errors | Add narrow production runtime Engine→Lab and pure→Engine/Lab rules; preserve unknown-export/undeclared errors |
| `module-graph.mjs:report,unavailableReport,renderHuman,renderMermaid` | `SCHEMA='offscreen.module-graph.v1'`, stable existing arrays, capped 12 edges in human reporter | Add six new arrays to successful and unavailable reports, bounded human summary; leave schema/mermaid/backward fields unchanged |
| `module-graph.test.mjs` | Includes old Application synthetic manifest/AST fixtures, runtime and type-only graph tests | Keep old tests; extend with same-domain runtime/file SCC, type-only file SCC, exact debt pair, sixth edge failing, package direction failures |

**Exact new namespace classifier:** for `packages/story-engine/src/stories/**` return `story-engine:authority.stories`; `campaign/**` → `story-engine:authority.campaign`; `storyteller/**` → `story-engine:writer`; `generations/**` → `story-engine:generation`. All other paths → null, including tests/dist/generated or lookalike package path. Normalize Windows backslashes and anchor actual path segments.

**Five temporarily allowed, explicitly warned directed source→resolved-target runtime edges, existing before MA09:**
1. `packages/story-engine/src/stories/resolution.ts` → `packages/story-engine/src/storyteller/admission.ts`
2. `packages/story-engine/src/campaign/narration.ts` → `packages/story-engine/src/storyteller/context-capture.ts`
3. `packages/story-engine/src/campaign/narration.ts` → `packages/story-engine/src/storyteller/capture-materialization.ts`
4. `packages/story-engine/src/campaign/reports.ts` → `packages/story-engine/src/storyteller/context-capture.ts`
5. `packages/story-engine/src/campaign/narrative-intent-settlement.ts` → `packages/story-engine/src/storyteller/writer-continuation.ts`

No source-prefix wildcard exemptions. MA09 owns the replacement of those imports with injected typed authority/Writer collaborators; MA11 only reports/enforces. Historical relative-SCC candidates: 5-module generations/storyteller, 3-module custody, 2-module campaign settlement. **Runtime-vs-type-only classification is unverified until AST graph runs.** Do not assert exact result count from old regex source observations.

**Independent ownership proof:** MA10 writes `scripts/repo-tools/{focused-integration,knowledge-health,storyteller-playability,storyteller-live-comparison,plan-storyteller-saved-repair}.mjs`, *not* `module-graph*`; WR09A writes DB and Story Engine Writer custody, *not* graph scripts. The source graph scanner reads their files but does not write them. Baseline `pnpm repo:module-graph` reported two undeclared production imports before this Change; retain any actual hard failure.
