# MA10A | bounded tool-only executor route

T01 **Story Engine domain classifier.** Reads `scripts/repo-tools/{module-graph-core.mjs,module-graph.test.mjs}`. Writes those two files only. Add storyEngineDomain with scoped identity, keep applicationDomain unchanged. Positive: exact path tests; negative wrong package paths null. Stop: existing report depends on colliding implicit domain IDs.

T02 **AST scanner and view.** Reads `module-graph.mjs` near package/domain SCCs and resolved-file edge implementation; `module-graph-core.mjs`. Writes module-graph.mjs only. Classify internal Story Engine edges using existing TS parser and runtime/type flags. Supplement render/report backwards compat. Positive: synthetic cycle view; negative type-only cycle not runtime, pre-MA09 debt does not newly fail. Stop: would require changing existing hard-fail policy.

T03 **Tests/receipt.** Reads `module-graph.test.mjs`, `module-graph.mjs`. Writes tests and optional contained fixtures only. Run `node --test scripts/repo-tools/module-graph.test.mjs`; `pnpm repo:module-graph`, explain pre-existing baseline errors; `git diff --check`, changed-file quality. Do not edit any shared package/ledger/lockfile. Parent hands SHA/receipt to custodian, no successor auto-start.
