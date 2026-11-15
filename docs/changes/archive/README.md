# Change packet archive

Terminal Change packets (Done, Cancelled, superseded) after the Reconciliation ledger.

## Layout

\	ext
archive/
  YYYY-MM/
    <program>/          # admin | chamber | eng | experience | observability | storyteller | web | other
      YYYY-MM-DD--slug/
\\n
**Create** new work under docs/changes/open/. **Retire** with git mv into this tree (or ode scripts/repo-tools/archive-changes.mjs --apply for batch moves). Permanent product/technical owners remain the bible; this archive is execution history only.

## Months

| Month | Index |
| --- | --- |
| 2026-11 | [2026-11/README.md](2026-11/README.md) |

