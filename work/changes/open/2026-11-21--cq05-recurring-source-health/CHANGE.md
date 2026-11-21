# CQ05 | recurring code-structure health and growth signals

**State:** Ready for owner commission. **Kind:** repository tooling + governance. **Priority:** P1 after security CQ01 when convenient; structurally independent of CQ01–CQ04 and WR03–WR08. **Reference/integration:** `undertaking/storyteller-workshop`. **Change branch:** `change/cq05-source-health` in its own linked Git worktree, never switch the primary checkout.

**Inspected baseline:** `2680de6f4b6b3fc9c08ab6b63d31cdb13b778ca3` (2026-11-21) by current remote Git tree. `packages/application/src/storyteller/` contains **63 direct .ts files, zero subdirectories, 741,865 bytes**. Its `context-capture.ts` is 3,078 lines and `capture-materialization.ts` 1,612 lines; `writer-loop.ts` is 780 lines and now committed. Nearby application `campaign/` has 29 direct source files; `stories/` 21. A file's size alone is **review evidence, not a correctness verdict**.

**Why:** The existing `pnpm repo:maintenance` checks work/document lifecycle; `pnpm repo:code-quality:changed` checks changed-file formatting and ESLint, not architectural growth. Neither alerts when a module evolves from ~100 into ~1,000 lines or a directory becomes a 63-file flat grab bag. Human code ownership must not silently decay.

**Selected end-state:** A deterministic read-only `pnpm repo:code-health` with compact human view and machine-readable JSON; show directory shape, largest production source files, approximate AST function complexity, type escape hatches, and incremental growth relative to an explicit Git base. Emit **review signals**, not automatic architectural conclusions. A new `--strict-new --base <ref>` mode fails only *newly introduced* high-severity threshold crossings, not legacy Storyteller debt. No online service, paid API, destructive action or auto-generated work folder. Findings flow through the existing [code-craft remediation program](../../CODE-CRAFT-REMEDIATION-2026-11-21.md) and the established Change/Task lifecycle.

**Safety/limits:** Exclude generated, migration, `dist`, coverage, test fixtures and test files from architectural complexity measurements (tests remain separately linted). Use TypeScript compiler AST for function/node counts rather than brace-count regex. Preserve existing `lint:quality` and `repo:code-quality:changed`; don't turn every legacy warning into a permanent blocking build. Snapshot reflects the current working tree, including new files; missing/shallow Git baseline is **unavailable**, not zero growth.

**Existing authority:** [code craftsmanship](../../../../.agents/rules/code-quality.md), [maintenance lifecycle](../../../../WORKFLOW.md#10-maintenance-audits-and-retirement), [repository structure](../../../../REPOSITORY-STRUCTURE.md#6-housekeeping-procedure-by-zone). Source health is a *new metric/tool*, not new game behavior or a new repository work type.

**Done:** deterministic tests of baseline and threshold semantics, actual local run on real tracked files, output corroborated against `git ls-files` and important line counts, zero source mutation and clear review-only default. Code and docs audit receipts must distinguish observed failures from heuristic warnings. No hidden telemetry or tool calls outside local Git/filesystem.

[Source](SOURCE-MAP.md) · [Algorithm](EXECUTION.md) · [Proof](PROOF.md) · [Executor queue](TASKS.md).
