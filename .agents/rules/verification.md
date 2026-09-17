# Verification on this laptop

The owner's Windows laptop is slow and resource constrained. Test selection is engineering work; a full-suite run is not the default.

- Inspect the affected code and callers, then choose the smallest checks that cover the changed behavior and its real risks. State that selection in the feature plan or briefly in the work update.
- Batch a coherent phase of edits before running checks. Do not rerun typechecks, builds and suites after every file edit.
- Prefer file-scoped lint/format checks, a package build or typecheck, and selected behavioral tests. Avoid both build and typecheck when the build already checks the same TypeScript.
- Run heavyweight commands sequentially. Use bounded concurrency (for example Turbo --concurrency=1) when several packages must build. Avoid background watchers and duplicate servers during checks; stop processes started for the task.
- Broaden validation for changed shared contracts, cross-package behavior, persistence/races or release readiness. Explain the additional coverage first. A broad integration run can be warranted; laziness about finding a smaller command is not a reason.
- Inspect package scripts and test setup before filtering. Test files may only export helpers, and a parent test can still initialize PostgreSQL, Temporal and a browser despite a name filter. Do not invent a supposedly targeted command. If safe isolation is unavailable, disclose that and choose a deliberate integration run or a bounded review.
- Tests consuming compiled dist files require a fresh affected build; do not report stale test results as verification of source edits.
- Do not install replacement test frameworks, weaken checks or skip essential correctness checks merely to save time. Report checks not run and the resulting uncertainty.
- Once checks pass, repeat only for subsequent relevant changes, a failure or unresolved concern. Reuse valid results for the same revision.
- Ordinary tests must make no paid provider calls. Inspect call paths before execution and apply [Spending](spending.md).

For docs/rules-only edits, run python scripts/check_docs.py and inspect the diff; no application rebuild is needed. For a changed skill, also run its available frontmatter validator. For code, use the existing [development commands](../../docs/development.md), with file/package selection where genuinely supported.

Do not run blanket pnpm format or repository-wide autofixes. Formatting owns only the changed files. Full lint:quality remains an optional audit of existing debt, not an excuse to repair unrelated files.
