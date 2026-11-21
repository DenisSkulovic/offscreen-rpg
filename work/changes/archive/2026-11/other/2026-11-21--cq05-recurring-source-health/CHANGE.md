# CQ05 | recurring code-structure health and growth signals

**State:** Done (2026-11-21). **Kind:** repository tooling + governance. **Priority:** P1 after security CQ01 when convenient; structurally independent of CQ01–CQ04 and WR03–WR08. **Reference/integration:** `undertaking/storyteller-workshop`. **Change branch:** `change/cq05-source-health` in its own linked Git worktree, never switch the primary checkout.

**Inspected baseline:** `2680de6f4b6b3fc9c08ab6b63d31cdb13b778ca3` (2026-11-21) by current remote Git tree. `packages/application/src/storyteller/` contains **63 direct .ts files, zero subdirectories, 741,865 bytes**. Its `context-capture.ts` is 3,078 lines and `capture-materialization.ts` 1,612 lines; `writer-loop.ts` is 780 lines and now committed. Nearby application `campaign/` has 29 direct source files; `stories/` 21. A file's size alone is **review evidence, not a correctness verdict**.

**Why:** The existing `pnpm repo:maintenance` checks work/document lifecycle; `pnpm repo:code-quality:changed` checks changed-file formatting and ESLint, not architectural growth. Neither alerts when a module evolves from ~100 into ~1,000 lines or a directory becomes a 63-file flat grab bag. Human code ownership must not silently decay.

**Selected end-state:** A deterministic read-only `pnpm repo:code-health` with compact human view and machine-readable JSON; show directory shape, largest production source files, approximate AST function complexity, type escape hatches, and incremental growth relative to an explicit Git base. Emit **review signals**, not automatic architectural conclusions. A new `--strict-new --base <ref>` mode fails only *newly introduced* high-severity threshold crossings, not legacy Storyteller debt. No online service, paid API, destructive action or auto-generated work folder. Findings flow through the existing [code-craft remediation program](../../../designs/open/code-architecture-health/README.md) and the established Change/Task lifecycle.

**Safety/limits:** Exclude generated, migration, `dist`, coverage, test fixtures and test files from architectural complexity measurements (tests remain separately linted). Use TypeScript compiler AST for function/node counts rather than brace-count regex. Preserve existing `lint:quality` and `repo:code-quality:changed`; don't turn every legacy warning into a permanent blocking build. Snapshot reflects the current working tree, including new files; missing/shallow Git baseline is **unavailable**, not zero growth.

**Existing authority:** [code craftsmanship](../../../../.agents/rules/code-quality.md), [maintenance lifecycle](../../../../WORKFLOW.md#10-maintenance-audits-and-retirement), [repository structure](../../../../REPOSITORY-STRUCTURE.md#6-housekeeping-procedure-by-zone). Source health is a *new metric/tool*, not new game behavior or a new repository work type.

**Done:** deterministic tests of baseline and threshold semantics, actual local run on real tracked files, output corroborated against `git ls-files` and important line counts, zero source mutation and clear review-only default. Code and docs audit receipts must distinguish observed failures from heuristic warnings. No hidden telemetry or tool calls outside local Git/filesystem.

[Source](SOURCE-MAP.md) · [Algorithm](EXECUTION.md) · [Proof](PROOF.md) · [Executor queue](TASKS.md).

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged because this Change adds a read-only repository report and does not alter gameplay, persistence, or provider behavior | scripts/repo-tools/code-health.mjs and scripts/repo-tools/code-health-core.mjs @ 66a37abeb30033a637ce81e83f6fe557b317624d plus this Change | source-observed | the command has no `--write` path and a real run left `git status` limited to the new tool files | N/A |
| Structural-growth review | .agents/rules/code-quality.md | changed: the checker is a runnable command with review bands and a strict-new exit that ignores legacy debt | .agents/rules/code-quality.md @ 66a37abeb30033a637ce81e83f6fe557b317624d plus this Change | source-observed | type-escape counts stay inventory and do not become vulnerability findings | heading updated in place |
| Maintenance, audits and retirement | WORKFLOW.md | changed: closure now names `pnpm repo:code-health --base` as the comparison to run | WORKFLOW.md @ 66a37abeb30033a637ce81e83f6fe557b317624d plus this Change | source-observed | the cadence is manual; no scheduler or auto-created Change folder was added | heading updated in place |
| Housekeeping procedure by zone | REPOSITORY-STRUCTURE.md | changed: the safe scan list includes `pnpm repo:code-health` and states that exit 2 is an unavailable baseline | REPOSITORY-STRUCTURE.md @ 66a37abeb30033a637ce81e83f6fe557b317624d plus this Change | source-observed | default mode still exits 0 for an existing 63-file Storyteller directory | heading updated in place |

## Evidence

`node --test scripts/repo-tools/code-health.test.mjs`: 28 pass / 0 fail. Prettier and `eslint.quality.config.mjs` passed on the three new scripts. Provider spend: no call. Application typecheck not run; no application source changed.

Local report on worktree HEAD `66a37abeb30033a637ce81e83f6fe557b317624d`: schema `offscreen.code-health.v1`, 499 production files, `packages/application/src/storyteller` direct files 63, bytes 741865, child source directories 0. `git ls-files` counted the same 63 direct production files. `wc -l` matched context-capture.ts 3077, capture-materialization.ts 1611, writer-loop.ts 779. Two JSON runs were byte-identical. `pnpm repo:code-health --strict-new --base undertaking/storyteller-workshop` exited 0 with `baselineAvailable` true and `strictRegressions` 0. A missing baseline exits 2 in the fixture tests. The scan did not format or rewrite production source.

Closeout paths: package.json, scripts/repo-tools/code-health.mjs, scripts/repo-tools/code-health-core.mjs, scripts/repo-tools/code-health.test.mjs, .agents/rules/code-quality.md, AGENTS.md, WORKFLOW.md, REPOSITORY-STRUCTURE.md, work/designs/open/code-architecture-health/README.md, work/changes/README.md, work/changes/ledger/2026-11.md, work/changes/archive/2026-11/README.md.
