# MA01 | workspace and source import ownership graph

**State:** Planner-ready algorithm. **Type:** developer tooling / architecture proof, no game behavior. **Integration target:** `undertaking/storyteller-workshop`. Branch: `change/ma01-workspace-import-graph`.

**Planning source baseline:** `undertaking/storyteller-workshop` HEAD `fa8e486533943e952c908c21af8d7a73aae84efa`, 2026-11-21. Remote source inspected; no compiler/test execution. Execution starts when the owner commissions this Change.

**Branch rule:** A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: this Change integrates on the active `undertaking/storyteller-workshop` branch. Use a linked worktree and `change/ma01-workspace-import-graph` from that HEAD. Leave the primary checkout on its current branch. Revalidate named source anchors against that HEAD, preserve in-flight Writer work, and integrate only into `undertaking/storyteller-workshop`. Commissioning this Change does not start its siblings.

**Observed hole:** `pnpm-workspace.yaml` selects `apps/*`, `packages/*`, `tools/*`; Turbo checks build dependencies, and `eslint.config.mjs` guards only certain packages. No source-level graph/strongly connected component scanner exists to reveal `application/stories ↔ application/storyteller` or `stories ↔ developer-tools` while one package.json masks them. Source statistics: 180 application source files across 10 top-level areas, with 63 Storyteller and 39 developer-tools files.

**Required outcome:** checked-in, read-only `pnpm repo:module-graph` and focused tests, stable JSON output and a small human summary. Report package manifest graph, source import graph and intra-application domain edges, runtime vs type-only, SCCs and missing dependency/export declarations. The tool must not create audit-dump documents or silently bless existing violations. Establish **observed baseline** first, then a precise allow/deny policy for newly extracted packages; no structural source moves in MA01. Source report emitted to stdout or explicitly ignored `out/architecture/`, not tracked `work/changes/*.md`.

**Proof:** synthetic package cycle and hidden application-domain cycle detected; type-only edges distinguished; actual source/manifest graph deterministic; no network, providers, database or primary checkout mutation. [Source map](SOURCE-MAP.md) · [Decided algorithm](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
