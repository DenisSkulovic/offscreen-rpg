# MA01 | workspace and source import ownership graph

**State:** Done. Read-only workspace and source import graph. **Type:** developer tooling / architecture proof, no game behavior. **Integration target:** `undertaking/storyteller-workshop`. Branch: `change/ma01-workspace-import-graph`.

**Planning source baseline:** `undertaking/storyteller-workshop` HEAD `fa8e486533943e952c908c21af8d7a73aae84efa`, 2026-11-21. Remote source inspected; no compiler/test execution. Execution starts when the owner commissions this Change.

**Branch rule:** A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: this Change integrates on the active `undertaking/storyteller-workshop` branch. Use a linked worktree and `change/ma01-workspace-import-graph` from that HEAD. Leave the primary checkout on its current branch. Revalidate named source anchors against that HEAD, preserve in-flight Writer work, and integrate only into `undertaking/storyteller-workshop`. Commissioning this Change does not start its siblings.

**Observed hole:** `pnpm-workspace.yaml` selects `apps/*`, `packages/*`, `tools/*`; Turbo checks build dependencies, and `eslint.config.mjs` guards only certain packages. No source-level graph/strongly connected component scanner exists to reveal `application/stories ↔ application/storyteller` or `stories ↔ developer-tools` while one package.json masks them. Source statistics: 180 application source files across 10 top-level areas, with 63 Storyteller and 39 developer-tools files.

**Required outcome:** checked-in, read-only `pnpm repo:module-graph` and focused tests, stable JSON output and a small human summary. Report package manifest graph, source import graph and intra-application domain edges, runtime vs type-only, SCCs and missing dependency/export declarations. The tool must not create audit-dump documents or silently bless existing violations. Establish **observed baseline** first, then a precise allow/deny policy for newly extracted packages; no structural source moves in MA01. Source report emitted to stdout or explicitly ignored `out/architecture/`, not tracked `work/changes/*.md`.

**Proof:** synthetic package cycle and hidden application-domain cycle detected; type-only edges distinguished; actual source/manifest graph deterministic; no network, providers, database or primary checkout mutation. [Source map](SOURCE-MAP.md) · [Decided algorithm](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged because the new command only reads manifests and TypeScript and does not alter gameplay, persistence, or provider behavior | scripts/repo-tools/module-graph.mjs and scripts/repo-tools/module-graph-core.mjs @ 7b7b2ec73fb7d4b393cf94e51e40c74905b23902 plus this Change | source-observed | a root with no Git HEAD exits 2 and the human report does not say PASS; the command has no default file write | N/A |
| Safe read-only scan | REPOSITORY-STRUCTURE.md | changed: the scan list includes `pnpm repo:module-graph` and says exit 2 is an unavailable baseline or parser | REPOSITORY-STRUCTURE.md @ 7b7b2ec73fb7d4b393cf94e51e40c74905b23902 plus this Change | source-observed | existing intra-application cycles stay observations and do not fail the command | heading updated in place |

## Evidence

`pnpm repo:module-graph:test`: 15 pass / 0 fail. Prettier and `eslint.quality.config.mjs` passed on `scripts/repo-tools/module-graph.mjs`, `scripts/repo-tools/module-graph-core.mjs`, and `scripts/repo-tools/module-graph.test.mjs`.

No provider call.

Live report on baseline `7b7b2ec73fb7d4b393cf94e51e40c74905b23902`: schema `offscreen.module-graph.v1`, 15 packages, 0 gate errors, 0 mismatches. Declared edges include `@offscreen/application` → `@offscreen/storyteller`, `@offscreen/contracts` → `@offscreen/documents`, and `@offscreen/cache` → `@offscreen/application`. Domain edges include `stories` → `storyteller`, `storyteller` → `stories`, and `stories` → `developer-tools`. One observed runtime domain cycle: campaign, developer-tools, generations, stories, storyteller. Two `--json` runs were byte-identical. `--mermaid` printed a `flowchart LR`. `pnpm repo:code-health --strict-new --base undertaking/storyteller-workshop` exited 0 with strict regressions 0.

Closeout paths: package.json, scripts/repo-tools/module-graph.mjs, scripts/repo-tools/module-graph-core.mjs, scripts/repo-tools/module-graph.test.mjs, REPOSITORY-STRUCTURE.md, work/designs/open/code-architecture-health/README.md, work/changes/README.md, work/changes/ledger/2026-11.md, work/changes/archive/2026-11/README.md, work/undertakings/modular-monolith/UNDERTAKING.md.
