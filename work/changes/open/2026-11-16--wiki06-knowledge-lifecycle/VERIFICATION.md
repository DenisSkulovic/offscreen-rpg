# WIKI06 | Acceptance and negative controls

No script or agent rule has yet been changed by this packet. The following tests are requirements, not performed evidence.

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
