# Change packet archive

Terminal Change packets (Done, Cancelled, superseded) after the Reconciliation ledger.

## Layout

\	ext
archive/
  YYYY-MM/
    <program>/          # admin | chamber | eng | experience | observability | storyteller | web | other
      YYYY-MM-DD--slug/
\\n
**Create** new work under work/changes/open/. **Retire** with git mv into this tree (or ode scripts/repo-tools/archive-changes.mjs --apply for batch moves). Permanent product/technical owners remain the bible; this archive is execution history only.

## Months

| Month | Index |
| --- | --- |
| 2026-11 | [2026-11/README.md](../../../work/changes/archive/2026-11/README.md) |


- [BOOK01 Living Book shell, Done](2026-11/other/2026-11-17--book01-reader-shell-poc/CHANGE.md) (2026-11-18 archival, bounded POC).
- [BOOK02 original Journal reader, Done](2026-11/other/2026-11-17--book02-original-journal-reader/CHANGE.md) (2026-11-18 archival).
