# Repository maintenance

Read-only checks for routes, Change lifecycle, and review candidates. A warning is not permission to edit product or technical docs. Product pages stay the bible. Technical pages stay the guarantees. This command does not call a provider, open a GitHub issue, or rewrite a file.

## Commands

- `pnpm repo:maintenance` writes a human summary and `out/maintenance/report.json`.
- `pnpm repo:maintenance --strict` exits nonzero for a missing open route, an invalid `Current work` in work/QUEUE.md, a terminal packet left in `open/`, an active packet left in `archive/`, an unclassified control document, or an expired exception. Age and freshness candidates stay warnings.
- `pnpm repo:maintenance --json` prints the same report.
- `pnpm repo:brief --health` prints the top three review candidates. `pnpm repo:brief --json` still prints the local SHA, branch, dirty paths, and selected Change. Adding `--health` to `--json` adds a `health` field.

Shallow or missing Git history is `unavailable`. That is not a zero-age freshness claim and it is not a green full-repo result.

## Close a Change

1. Fill the reconciliation ledger.
2. Run `pnpm wiki:change-guard --mode close --change <packet> --base <sha>`.
3. Run `pnpm repo:maintenance --strict`.
4. Archive a terminal packet and update the queue. `Current work: none` in work/QUEUE.md is valid. An open standalone Task must have TASK.md and its own index route; a terminal Task belongs under work/tasks/archive. The Change catalog is not a second selector.

## CI

`.github/workflows/maintenance.yml` runs the strict gate on pushes and pull requests that touch docs, work, research, evidence, status, or source. The weekly schedule and `workflow_dispatch` use full history so freshness candidates are in the artifact. The job does not install dependencies, call a model, or run the Chamber database. A docs-only or Change-only push still skips the code and integration jobs through `scripts/repo-tools/ci-change-scope.mjs`.
