# Change packet archive

Terminal Change packets (Done, Cancelled, superseded) after the Reconciliation ledger.

## Layout

\	ext
archive/
  YYYY-MM/
    <program>/          # coarse execution domain; see current month index for active buckets
      YYYY-MM-DD--slug/
\\n
**Create** new work under `work/changes/open/`. **Retire** with `git mv` into this tree (or `node scripts/repo-tools/archive-changes.mjs --apply` for batch moves). Archive programs are coarse domains, not a mirror of every Change prefix; `other` is reserved for genuine one-offs. Permanent product/technical owners remain the bible; this archive is execution history only.

## Months

| Month | Index |
| --- | --- |
| 2026-11 | [2026-11/README.md](../../../work/changes/archive/2026-11/README.md) |


- [BOOK01 Living Book shell, Done](2026-11/experience/2026-11-17--book01-reader-shell-poc/CHANGE.md) (2026-11-18 archival, bounded POC).
- [BOOK02 original Journal reader, Done](2026-11/experience/2026-11-17--book02-original-journal-reader/CHANGE.md) (2026-11-18 archival).
