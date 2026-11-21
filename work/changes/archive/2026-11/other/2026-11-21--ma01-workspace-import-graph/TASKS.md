# MA01 | bounded Cursor tasks

**Commission gate:** owner commissions MA01 on live `undertaking/storyteller-workshop`; linked worktree `change/ma01-workspace-import-graph`. Parent finishes all tasks and merges to `undertaking/storyteller-workshop` on passing required proof. Leave the primary checkout on its current branch. A separate modular-monolith branch would be the cleaner long-term home; this program stays on Storyteller Workshop.

## T01 | Graph primitives and fixtures
Read `package.json`, `pnpm-workspace.yaml`, `eslint.config.mjs`. Write pure `scripts/repo-tools/module-graph-core.mjs` and `module-graph.test.mjs`. Tarjan SCC, deterministic sorted edges, explicit runtime/type distinction. Positive: acyclic 4-node graph. Negative: 3-node cycle, type-only edges not misreported as runtime cycle. Stop on disagreement about output contract, not on ordinary TS syntax errors.

## T02 | AST import and manifest reader
Read `scripts/repo-tools/process.mjs`, application barrels and module exports. Write `scripts/repo-tools/module-graph.mjs` + tests. Enumerate workspaces and source; use TypeScript AST; classify declared dependencies and export subpaths. Positive: valid workspace import edge. Negative: undeclared and nonexistent subpath identified with source file. No broad source rewrite.

## T03 | Current graph receipt and bounded CLI
Add scripts in root `package.json`; implement `--json`, `--mermaid`, capped summary. Run on current full checkout and compare edges to SOURCE-MAP. Positive: reported real Storyteller↔story-authority cross-deps. Negative: no false PASS when parser/baseline unavailable. Include TypeScript/format/quality lint for changed scripts; commit minimal evidence. Parent closes and integrates; don't dispatch MA02 automatically.
