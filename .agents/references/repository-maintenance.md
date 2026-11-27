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

## Interpretation and safe disposition

Derive inventory from tracked Git files and existing path/ownership rules; reuse shared parsing rather than creating a shadow status registry. Keep structural errors distinct from semantic review candidates. Partial Done is not terminal. A changed cited dependency requires review, not an automatic contract rewrite; a stable old document may be correct. Exceptions must name exact path, owner, reason and review date; no wildcard or permanent baseline hiding. Surface the few highest-value findings in brief output and retain the full report separately. Findings need an owner/disposition, not a second execution queue.

Before removing executable tooling, inspect actual imports, operational entrypoints, scripts, consumers and unique recovery capability; replace and verify required behavior first, including negative and authorization cases. For test extraction retain existing assertions, isolation and known failures; diagnostic shared sessions do not replace independent acceptance. Preserve migrations, active fixtures, thin adapters and unique evidence when consumers or authority still require them. See [repository geography and retirement](../../REPOSITORY-STRUCTURE.md). No warning authorizes mutation, deletion, provider spend or a weakened gate.
