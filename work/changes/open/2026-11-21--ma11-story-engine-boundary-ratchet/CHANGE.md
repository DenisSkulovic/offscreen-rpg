# MA11 | Make Story Engine's real internal module boundaries enforceable

**Status: READY FOR INDEPENDENT CURSOR LANE C, subject to source/branch guard.** Inspected MA08 source `6dd1276131a813f694ec3bccf4f9062ad3708208` on `undertaking/storyteller-workshop`. No production TypeScript, SQL, providers, package names or runtime logic change in this Change. **Two existing host manifests are corrected** to declare runtime dependencies accurately; the graph checker and tests are the other owned edits.

## Source-grounded problem

`scripts/repo-tools/module-graph-core.mjs:applicationDomain` currently classifies `packages/application/src/**`, a mostly obsolete facade. `module-graph.mjs:classifyRelative` only emits *cross-domain* legacy Application edges, discarding same-domain file edges. Therefore an internally cyclical `packages/story-engine/src/stories/**` or Writer module cannot be diagnosed from its domain graph. A clean package DAG is not proof of a properly layered engine.

## Selected output and law

Keep `SCHEMA='offscreen.module-graph.v1'` and existing `domainEdges`, package checks and synthetic Application test fixtures fully backward-compatible. Add a **separate**, sorted `storyEngineFileEdges` list of every resolved production Story Engine relative import **including same-domain**, a `storyEngineDomainEdges` list of cross-domain imports, plus runtime/type-only SCC arrays for file and domain graphs. Use existing TypeScript AST `collectSpecifiers`, NodeNext `resolveRelative`, `runtimeCycles` and `typeOnlyCycles`; no regex import parser or invented source cycles.

Enforce:
- A **new** Story Authority (`stories|campaign`) → Writer implementation (`storyteller`) runtime import/reexport/dynamic literal fails. Exactly **five** verified pre-MA09 directed source→target pairs are recorded as **visible named debt**, not a wildcard exemption. MA09 must remove these exact edges and retire their exceptions.
- Production Story Engine → Lab Support and pure Game/Contracts → Story Engine/Lab Support runtime imports fail. Normal Writer → Authority publication and type-only neutral interfaces are allowed.
- All existing undeclared workspace import, unknown subpath, package-cycle hard failures remain hard. MA08 had two known errors: `apps/api/src/app.ts` runtime-imports `@offscreen/game-authority/application` while `@offscreen/game-authority` is only in API devDependencies; `apps/game-authority/src/launch-put.ts` runtime-imports `@offscreen/storyteller/tasks` while Storyteller is only in GA devDependencies. MA11 **promotes these exact two to `dependencies`** with no source edits and proves the errors disappear; it must not hide checker errors or claim unknown failures are fixed.
- Graph cycles within a single authority domain are diagnostics, not automatic errors. A local SCC count does not justify extra npm packages or changing transactional code.

**Exclusive writes:** `scripts/repo-tools/module-graph-core.mjs`, `module-graph.mjs`, `module-graph.test.mjs`, optional focused `scripts/repo-tools/test-fixtures/**`, **plus exactly two host manifests** `apps/api/package.json` and `apps/game-authority/package.json` to correct known runtime imports mistakenly listed under devDependencies. No production TS changes, no `packages/**`, other app/tool manifests, `pnpm-lock.yaml`, `work/**`, `docs/**`, root scripts or dependency upgrades. MA10 deletes Application/moves tests; WR09A changes DB/custody/provider. Worktrees are source-disjoint.

**Acceptance:** old graph tests still pass, new file-level runtime/type SCCs and allowed debt are truthfully measured, new forbidden edge fails, legitimate Writer→Authority/type imports do not fail, and existing baseline errors are not muted. Only fake AST fixtures and read-only current source graph. No protected DB/provider calls.

**Integration:** one independent tested branch and receipt for Cursor A (MA10) custodian, no self-merge while sibling Changes run. [Source map](SOURCE-MAP.md) · [exact algorithm](EXECUTION.md) · [tasks](TASKS.md) · [proof](PROOF.md).
