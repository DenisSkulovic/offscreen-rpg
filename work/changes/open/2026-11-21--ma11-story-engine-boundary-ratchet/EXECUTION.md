# MA11 | exact source-level algorithm and report contract

## 1. Classifier (pure helper)

Add exported `storyEngineDomain(filePath)` in `module-graph-core.mjs`. Normalize `\\`→`/`; recognize exactly `packages/story-engine/src/<stories|campaign|storyteller|generations>/<source-file>` in path segments (no tests/generated/dist); return the four namespaced domain values in SOURCE-MAP. Do not modify `applicationDomain` or Tarjan helpers. Test POSIX/Windows paths, invalid lookalike packages and domain-index direct source files.

## 2. Additive report fields (keep schema v1)

Keep existing report, `domainEdges`, `sourceEdges`, package SCC/error logic and `SCHEMA='offscreen.module-graph.v1'`. Add:
```ts
storyEngineFileEdges: Array<{
  from:string; to:string; fromFile:string;
  specifier:string; line:number;
  kind:'runtime'|'type-only'|'reexport'|'dynamic'
}>;
storyEngineDomainEdges: Array<{
  from:string; to:string; fromFile:string; toFile:string;
  specifier:string; line:number; kind:string
}>;
storyEngineRuntimeFileSccs: string[][];
storyEngineTypeOnlyFileSccs: string[][];
storyEngineRuntimeDomainSccs: string[][];
storyEngineTypeOnlyDomainSccs: string[][];
```
New `storyEngineFileEdges` receives **all resolved relative imports within Engine**, even if from/to are in the same logical domain. `from/to` are exact source-file paths (for SCC), not the domain name. Only edges between differing Engine domains enter `storyEngineDomainEdges` (from/to namespaced domains). Collect actual file nodes from `input.sources` in Engine, **not only endpoints**, then `runtimeCycles(nodes, edges.map(plainEdge))` and `typeOnlyCycles`. Reuse existing AST import-kind detection: dynamic literal and reexport count runtime, `import type` / `export type` remain type-only. Add these arrays to `unavailableReport` as empty; sort with existing `sortRecords` and stable SCC helpers. `renderHuman` adds bounded counts and capped evidence; `renderMermaid` keeps its old output. New reporting must remain available even when unrelated package errors set result FAIL.

**Exact insertion:** In `buildModuleGraph` initialize and pass both new edge arrays via `classifySpecifier` to `classifyRelative`. After `resolveRelative`, if from and resolved target are both Engine production TS/TSX files, push file edge (including same-domain); when `storyEngineDomain(from)!==storyEngineDomain(to)`, push domain edge. Then continue current Application-domain logic unchanged. Do not use `sourceEdges` for intra-package relative edges because it currently records workspace package specifiers.

## 3. Narrow import policy

For **runtime, reexport or dynamic** `stories|campaign → storyteller` resolved relative import, test exact `fromFile + '\0' + toFile` membership in a static `Set` with the five SOURCE-MAP pairs. Allowed exact pair emits `warnings.push({code:'authority-writer-debt',message:'<file>:<line> -> <target>'})`. Any new pair emits hard `errors.push({code:'forbidden-authority-writer-import',message,file,specifier})` and mismatch if consistent with existing checker. Type-only neutral interfaces do **not** fail. No wildcard or "ignore all existing cycles" condition.

For **resolved workspace package imports**, extend `classifySpecifier` only when `production` and runtime-kind: `owner.name==='@offscreen/story-engine'` + `target.name==='@offscreen/lab-support'` → `forbidden-engine-to-lab`; `owner.name==='@offscreen/contracts'|'@offscreen/game'` importing either Story Engine or Lab → `forbidden-pure-to-application`. Keep existing unknown-workspace, undeclared-production-import and unknown-export-subpath failures. If a cross-package relative escape is encountered, reject it via existing source path ownership rather than treating it as a legitimate public import. Do not modify product source imports.

## 4. Synthetic fixtures and commands

Build fixtures directly with `buildModuleGraph({baselineSha:'test',packages,sources,typescript,exists:()=>false})` using the same TypeScript import loaded by existing tests, manifest objects as current test convention, and `.js` specifiers resolved to listed `.ts` paths. **Runtime same-domain:** `packages/story-engine/src/stories/a.ts` imports `./b.js`; `b.ts` imports `./a.js`; expect `storyEngineRuntimeFileSccs` contains both; domain SCC empty. **Type-only counterpart:** same files `import type` each other, runtime file SCC absent, type-only SCC contains both. **Known debt:** `stories/resolution.ts → storyteller/admission.ts` warns; **sixth new edge:** `stories/new.ts → storyteller/admission.ts` fails. Type-only edge never raises runtime violation. Engine→Lab and Game→Engine package runtime edges fail. Old Application synthetic tests and schema/report fields remain intact.

**After graph tests, perform two manifest-only corrections**: API `apps/api/package.json` moves `@offscreen/game-authority` from `devDependencies` to `dependencies`, because `apps/api/src/app.ts` imports and calls `createGameAuthoritySeam` at runtime in embedded mode. Game Authority `apps/game-authority/package.json` moves `@offscreen/storyteller` from `devDependencies` to `dependencies`, because `apps/game-authority/src/launch-put.ts` imports Writer task validation values at runtime. Both retain `workspace:*` and one unique entry. Shared lockfile change belongs to MA10 custodian. Run `node --test scripts/repo-tools/module-graph.test.mjs` and `pnpm repo:module-graph` from root plus host typechecks, `git diff --check` and changed-file quality. The two specifically known undeclared errors should disappear from correct declarations, **without changing the checker**; any different errors remain FAIL and are reported accurately. No SQL, provider or protected resources.

**Stop:** implementation would require editing a real Engine/runtime module, hiding existing hard dependency errors, or changing the report schema incompatibly. Do not redesign package ownership.
