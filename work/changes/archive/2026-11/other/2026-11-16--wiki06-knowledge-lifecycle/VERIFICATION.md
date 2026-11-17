# WIKI06 | Acceptance and negative controls

Executed on 2026-11-17 against dirty worktree `5be8e2a8fa42c684ec16939b9cf8928fd56e996f`. No provider call.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm wiki:change-guard --self-test` | 0 | Unratified GM07, path ratification, unchanged target, shallow checkbox, tooling row, not-run, unpaid paid-claim, owner review, missing heading, archive bytes, empty queue |
| `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-16--wiki06-knowledge-lifecycle` | 0 | No findings |
| `pnpm wiki:change-guard --mode close --change work/changes/open/2026-11-16--wiki06-knowledge-lifecycle --base 5be8e2a8` | 0 | No findings after Done. A first Done run failed because a negative-proof sentence said "not run cannot be Done"; the check now reads only the status and source cells, and the self-test still rejects a status of `not run` |
| `pnpm wiki:health` | 0 | 74/74 reachable, 0 broken paths or anchors, p50 2, p95 3. Three pre-existing dead-end warnings |
| `pnpm wiki:bench:static --self-test` | 0 | v1 and v2 fixtures passed |
| `python scripts/check_docs.py` | 0 | 229 Markdown files, 0 problems |
| `pnpm repo:docs-health` | 0 | Advisory. Historical Done packets still lack the newer ledger heading. WIKI06 plan was then given one current checkpoint |
| `git diff --check` | 0 | No whitespace errors |

The guard does not decide whether a claim is true. It did not modify `work/changes/archive/`.

The following tests are the original requirements. The fixture results above are the performed evidence.

## Must accept

- A selected future technical contract with no implementation; `STATUS` says absent. Its wiki authority remains selected.
- A narrow code improvement implementing part of a selected target with **target unchanged**, credible reason, source/readme/status updates, actual test results and negative case.
- A purely internal lint/checker Change with documented no-product-impact reason and real executable test changes.
- A design-only conversation and `Current change: none` with no implementation ledger.
- A historical Change link *as evidence of previous work*, never as present execution authorization.

## Must reject / block

- A proposed GM07 default silently inserted into accepted product wiki by a coding agent.
- A source diff changing behavior while `CHANGE.md` has only “docs updated” / “N/A” without affected headings or tier.
- A Done Change claiming a source status with no inspected path/SHA, or claiming a paid provider test that was not performed.
- Implementation ahead of product authority, followed by a wiki rewrite merely to make code appear compliant.
- A proposal under `docs/technical` promoted to selected solely because of its file path.
- Any automatic file deletion/modification in `work/changes/archive/`.
- A guard that always requires editing product pages even when the selected target did not change.

## Commands to run locally

```bash
git rev-parse HEAD
git status --short
pnpm wiki:change-guard --self-test
pnpm wiki:change-guard --mode plan --change <proposed-packet-path>
pnpm wiki:health
pnpm wiki:bench:static --self-test
python scripts/check_docs.py
pnpm repo:docs-health
git diff --check
```

Test close-mode with temporary fixture Changes on a disposable fixture tree rather than actually closing real work. Record command exits, source SHA, affected paths, fake fixture results and known blind spots. A static guard validates completeness, not claim truth. Preservation proof includes all terminal Change files and Git blob SHAs at execution baseline.

**No provider calls.** Nothing here is an excuse to run a paid model to grade wiki rules.
