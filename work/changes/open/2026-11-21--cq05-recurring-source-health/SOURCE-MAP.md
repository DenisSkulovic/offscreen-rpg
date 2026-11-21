# CQ05 | source map and existing tooling

**Source baseline:** Undertaking HEAD `2680de6f`; inspection only, tests NOT RUN.

- `scripts/repo-tools/maintenance.mjs` + `maintenance-core.mjs`: read-only work/doc lifecycle checks, Git tracked list, JSON report under `out/maintenance`; **do not repurpose** to parse production code complexity.
- `scripts/repo-tools/changed-code-quality.mjs`: changed TypeScript detection and focused Prettier / `eslint.quality.config.mjs` checks; not repo-wide structural health or trend analysis.
- `scripts/repo-tools/retirement-health.mjs`: warning-only lifecycle audit; no auto-delete. Follow its evidence-not-action philosophy, not its simple directory walker for TypeScript AST.
- `scripts/repo-tools/process.mjs:root`: canonical project root; use `git -C`/execFileSync with an explicit cwd. Avoid `shell: true`.
- `package.json` pins TypeScript `5.9.3`, has root pnpm commands `repo:maintenance`, `repo:code-quality:changed`, `repo:retirement` and `repo:maintenance:test`. Add one `repo:code-health` and one focused test command without altering existing ones.
- `.agents/rules/code-quality.md`: function >roughly 60–100 substantive lines prompts human review; never mandatory extraction solely on size. Add review cadence and how to interpret numeric signals.
- `WORKFLOW.md` section 10: housekeeping and audits; `REPOSITORY-STRUCTURE.md` section 6: zone cleanup protocol. Route to the existing code-craft owner, do not duplicate another handbook.
- `work/changes/CODE-CRAFT-REMEDIATION-2026-11-21.md`: current remediation schedule; add CQ05 and candidate review of the 63-file flat Storyteller folder. No new global queue.
- Actual `packages/application/src/storyteller/index.ts`: ~39 wide barrel exports; scope/consumer review needed before future directory moves, no edits in CQ05.
- `context-capture.ts` 3,078 lines, `capture-materialization.ts` 1,612, `writer-loop.ts` 780 on committed branch. Other sizeable files: `execution.ts`, `budget.ts`, `publication.ts`; these are **risk-weighted review targets**, not an authorized rewrite.
- Comparison cohorts by Git tree: application `campaign/` 29 direct TS, `stories/` 21; `packages/storyteller/src/tasks/` 17. All counts exclude tests and generated files for apples-to-apples directory pressure.
