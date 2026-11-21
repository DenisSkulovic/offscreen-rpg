# MA11 | observed source and boundaries

Inspected snapshot 6dd12761. scripts/repo-tools/module-graph-core.mjs exports applicationDomain(filePath), stronglyConnectedComponents, runtimeCycles and typeOnlyCycles. runtimeCycles includes runtime/reexport/dynamic but not type-only. module-graph.mjs near lines 188–265 computes package and domain SCCs; classifySpecifier near 537–625 maps import specifiers and enforces undeclared-production-import / unknown-export-subpath; classifyRelative around lines 623–624 currently obtains domains from applicationDomain. module-graph.test.mjs has synthetic Application package fixtures that MUST remain valid even when the real package is retired.

New exact domains:
- packages/story-engine/src/stories/** -> story-engine:authority.stories
- packages/story-engine/src/campaign/** -> story-engine:authority.campaign
- packages/story-engine/src/storyteller/** -> story-engine:writer
- packages/story-engine/src/generations/** -> story-engine:generation
- packages/lab-support/src/** -> lab-support:outer (cross-layer only)
Exclude dist, test and docs, classify normalized POSIX/Windows paths.

**Five known source→target exception edges, pre-MA09 ONLY:** stories/resolution.ts → storyteller/admission.ts; campaign/narration.ts → storyteller/context-capture.ts; campaign/narration.ts → storyteller/capture-materialization.ts; campaign/reports.ts → storyteller/context-capture.ts; campaign/narrative-intent-settlement.ts → storyteller/writer-continuation.ts. No wildcard exemption: introducing a sixth edge fails immediately. MA09 must remove these edges and their exceptions at integration, not keep an eternal ignore list.

Original relative-file SCC candidates, unverified runtime/type split: generations/{index,scripted-openings} with storyteller/{dispatch-review,openings,records}; storyteller/{writer-child-custody,writer-mission-custody,writer-mission-store}; campaign/{action-executions,narrative-intent-settlement}. WR09A may modify custody module; do not assert fixed number of runtime SCCs until AST classification. Report real members and edge kinds.

Other work ownership: MA10 may modify scripts/repo-tools/focused-integration.mjs, knowledge-health.mjs, storyteller-playability.mjs, storyteller-live-comparison.mjs and plan-storyteller-saved-repair.mjs, but NOT module-graph*; WR09A only provider/DB/custody paths. No collision.

### Actual parser data shape and file-level correctness

`scripts/repo-tools/module-graph.mjs:buildModuleGraph(input)` gets `{baselineSha,packages,sources,typescript,exists}`; it iterates `collectSpecifiers` AST results and uses `classifySpecifier` → `classifyRelative` for relative edges. `resolveRelative(file,specifier,fileSet,exists)` already maps NodeNext `.js` to TS sources. Current `domainEdges` is an **Application-only cross-domain edge array**. Extending it without new file-level arrays would fail to detect same-domain source-file cycles; leave it for backwards compatibility. Build separate Engine file/domain arrays, report fields and tests as specified in EXECUTION.

`renderHuman` and `unavailableReport` must receive the new fields; `renderMermaid` remains backward-compatible. Existing `runtimeCycles` treats `runtime,reexport,dynamic` as runtime while `typeOnlyCycles` treats `type-only` separately. `subpathIsExported` and `pushMismatch` are the existing hard-fail paths; do not weaken them to satisfy MA08's two known dependency errors.
