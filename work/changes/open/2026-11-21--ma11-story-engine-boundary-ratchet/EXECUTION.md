# MA11 | selected implementation

1. Add a pure storyEngineDomain(filePath) in module-graph-core.mjs. It returns one of four fully qualified Engine domains or null, handles Windows slashes, only exact packages/story-engine/src/domain/deep-file paths, and preserves existing applicationDomain API for synthetic tests. Add isolated tests.
2. Extend module-graph.mjs's AST relative-import resolution to construct Engine file nodes and directed import edges with kind, line number, source and target. Retain existing package graph outputs; add namespaced stable Engine report data. Use existing runtimeCycles/typeOnlyCycles to expose both member lists. Keep file-level and domain-level graphs distinct, as domain SCCs alone can be misleading.
3. Enforce scoped ownership: a new runtime/reexport/dynamic Story Authority stories/campaign → Writer implementation import is error unless it matches exactly one of the five transitional pairs recorded in SOURCE-MAP. Those five are visible warnings, not green invisibility. Engine→Lab runtime import is error; pure Contracts/Game→Story Engine import is error. Do not disallow type-only neutral contract imports or Writer→Authority authorized publication. Do not disable existing undeclared-production-import and unknown-export-subpath errors.
4. Add synthetic checks: one new forbidden sixth backedge fails; known exception warns; ordinary Writer→Authority edge permitted; two runtime nodes form runtime SCC; two type-only nodes form only type-only SCC; old Application fixture tests unchanged. Existing baseline graph may still fail two undeclared imports: report rather than suppress.
5. One parent prepares branch receipt with exact commands/counts. No package manifest, product runtime or shared global doc edits. One integration custodian joins after siblings and reruns combined graph.

**Stop:** the graph can only pass by hiding baseline errors; tests require rewriting runtime code; or a new production import creates a circular package dependency. Escalate exact file/edge, not a general architecture debate.

## Revision 2 | precise existing AST data flow and chosen report schema

The existing implementation is **not** a generic black box. `scripts/repo-tools/module-graph.mjs:buildModuleGraph` iterates sorted `input.sources`, calls `collectSpecifiers(typescript,file,source.text)`, and funnels each AST edge through `classifySpecifier`. Relative edges go to `classifyRelative`; it calls `resolveRelative(file,specifier.specifier,fileSet,exists)`. That resolver already maps emitted NodeNext `.js` to actual TypeScript `.ts` filenames. `classifyRelative` currently appends only **cross-domain** Application edges to `domainEdges`. **It intentionally discards same-domain edges**, so using domainEdges for file SCCs would be false. Do not approximate SCC by domain nodes.

**Select additive, backward-compatible report fields** (keep `SCHEMA='offscreen.module-graph.v1'`, existing `domainEdges`, `domainRuntimeSccs`, and error codes stable):
```js
storyEngineFileEdges: Array<{
  from: string, to: string, fromFile: string,
  specifier: string, line: number,
  kind: 'runtime'|'type-only'|'reexport'|'dynamic'
}>,
storyEngineDomainEdges: Array<{
  from: string, to: string, fromFile: string, toFile: string,
  specifier: string, line: number, kind: string
}>,
storyEngineRuntimeFileSccs: string[][],
storyEngineTypeOnlyFileSccs: string[][],
storyEngineRuntimeDomainSccs: string[][],
storyEngineTypeOnlyDomainSccs: string[][]
```
All arrays lexicographically stable with `sortRecords`; unchanged `sourceEdges` is cross-package and *not* a replacement for internal relative edges. New `storyEngineFileEdges` includes **same-domain and cross-domain** imports, excluding paths outside `packages/story-engine/src/**` and test/generated sources. New `storyEngineDomainEdges` includes only edges with **different** Story Engine logical domain, so domain SCCs are meaningful. For file SCCs, construct nodes from actual sorted Story Engine source filenames and call existing `runtimeCycles(nodes, storyEngineFileEdges.map(plainEdge))` and `typeOnlyCycles(...)`; **do not** derive file nodes only from edges (or isolated modules vanish from counts). `unavailableReport` receives empty defaults for all six fields. `renderHuman` adds bounded summary counts + capped edge evidence; `renderMermaid` keeps old behavior unless an explicitly chosen new flag is defined (none selected here). Preserve 12-item summary caps.

### Exact classification and policy insertion

- `module-graph-core.mjs`: export `storyEngineDomain(filePath)`. Normalize backslash to slash, anchor at path segments `packages/story-engine/src/<domain>/<file>` for four allowed domains, exclude `dist`, `test`, `generated`; do not accidentally match `packages/story-engine-evil`. Return fully scoped namespace, or null.
- `buildModuleGraph`: define `storyEngineFileEdges` and `storyEngineDomainEdges` next to legacy `domainEdges`; pass both through `classifySpecifier`. `classifyRelative`: after `resolveRelative` and before old Application-domain early return, classify Engine source+target even if same domain. Append file edge, append domain edge when differing. Enforce authority→Writer import law from the actual **resolved** target filename and AST kind, not a raw string like `../storyteller`.
- Transitional debt allowlist exactly five `fromFile -> resolved` pairs from SOURCE-MAP, stored in module-graph.mjs as a static `Set`, not inferred by grepping. For `runtime|reexport|dynamic` from authority.stories/authority.campaign to story-engine:writer: if pair is allowlisted, `warnings.push({code:'authority-writer-debt',message:'file:line -> target'})`; else `errors.push({code:'forbidden-authority-writer-import',message:'file:line -> target',file,specifier})`. Type-only edges are reported separately and do not become runtime backedges. A sixth path fails without editing any allowed list.
- `classifySpecifier` for **resolved workspace package imports**: if `production` and AST kind runtime/reexport/dynamic and `owner.name==='@offscreen/story-engine'` with `target.name==='@offscreen/lab-support'`, error `forbidden-engine-to-lab`. If `owner.name` in `@offscreen/contracts`, `@offscreen/game` and target is Story Engine or lab-support, error `forbidden-pure-to-application`. **Do not accidentally reject type-only neutral contract dependencies**, and leave current `unknown-export-subpath`, `undeclared-production-import` policy untouched. When the destination package is absent from a synthetic graph fixture, do not fabricate it; tests must explicitly include fixture manifests for both ends.
- **Test fixtures** use `buildModuleGraph({baselineSha:'test',packages,sources,typescript,exists:()=>false})` with real `typescript` imported by the existing test; actual `.ts` source files listed in `sources` so `resolveRelative` works with NodeNext `.js` specifiers. Build two same-domain files `stories/a.ts` and `stories/b.ts` importing one another; assert `storyEngineRuntimeFileSccs` contains pair while `storyEngineRuntimeDomainSccs` is empty. Change both to `import type` and assert runtime pair absent/type-only pair present. Build a permitted backedge to `storyteller/admission.ts` with actual pair `stories/resolution.ts` and verify warning, then an otherwise identical new `stories/surprise.ts` and verify hard error. Assert old Application synthetic tests still pass.
- **Baseline errors:** MA08's two known `undeclared-production-import` failures are NOT a reason to suppress validation; result remains `fail` until actual callers/manifests corrected separately. A new Engine-only reporter should still expose real SCCs even if the package graph is failing.

**Task owner map:** T01 adds classifier+classifier unit tests; T02 changes `classifyRelative`, `classifySpecifier`, report object and unavailableReport, then specific synthetic fixtures; T03 runs existing test script plus synthetic negatives and verifies exit code 1 for injected forbidden import. No TypeScript package source writes. This eliminates the implementation design choices about graph representation, domain vs file nodes, warning format and exception policy.
