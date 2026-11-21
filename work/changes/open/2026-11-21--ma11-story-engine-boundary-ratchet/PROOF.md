# MA11 | independent source-readiness and proof

**Source inspected:** MA08 `6dd1276131a813f694ec3bccf4f9062ad3708208`, module-graph-core, module-graph.mjs (`buildModuleGraph`, `collectSpecifiers`, `classifyRelative`, `classifySpecifier`, `resolveRelative`, report/renderers), existing unit tests and selected actual Authority→Writer importers. No implementation build or test executed by ChatGPT.

| Gate | Verdict / reason |
| --- | --- |
| G0 | PASS target/branch, distinct Change worktree, single MA10 custodian |
| G1 | PASS exact AST data flow and existing schema/errors inspected |
| G2 | PASS six additive arrays, file SCC vs domain SCC separation, exact five-pair exception law, package direction rules |
| G3 | PASS T01–T03 have exact files, inputs/outputs, focused negatives |
| G4 | PASS T01 pure classifier can begin without runtime survey |
| G5 | PASS graph-tool writes plus two explicit API/GA manifest fixes do not overlap MA10 legacy test/script or WR09A DB/Writer/provider |
| G6 | PASS *specified tests*, not executed: same-domain runtime vs type-only, new forbidden import, unchanged old failures |
| G7 | PASS one meaningful architecture checker outcome, no ungrounded purity refactor |

**Ready to implement; no test claims yet.** Required:
- Current Application synthetic fixtures still pass even after MA10 deletes real Application; schema `offscreen.module-graph.v1` and old fields unchanged.
- A 2-node **same Story Authority domain** runtime SCC appears at file level; domain level may be acyclic. Type-only pair never appears in runtime SCC; reexports/dynamic literals are runtime-kind.
- Exactly five known current Authority→Writer runtime edges each warn `authority-writer-debt`, never appear as hidden allowed green; sixth edge hard-fails `forbidden-authority-writer-import`; type-only neutral import allowed.
- Runtime Engine→Lab and Game/Contracts→Engine imports are forbidden; Writer→Authority publication allowed.
- Old unknown export, undeclared dependency, package-cycle errors remain hard; graph command may remain FAIL due to two previously recorded undeclared imports. Do not reclassify baseline FAIL as PASS. No real runtime source changes, paid provider or protected SQL.
- `node --test scripts/repo-tools/module-graph.test.mjs`, `pnpm repo:module-graph`, `git diff --check` results recorded with exact command CWD and PASS/FAIL/SKIP/NOT RUN; push tested branch to integration custodian.
