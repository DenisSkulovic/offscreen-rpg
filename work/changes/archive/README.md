# Change packet archive

Terminal Change packets (Done, Cancelled, superseded) after reconciliation. **This is a short-lived review cache**, not a permanent graveyard. The lasting record is the [monthly Change ledger](../ledger/2026-11.md), the canonical docs/code/evidence and exact Git history.

**Retention rule:** after a default **seven days since the last archive edit**, `pnpm repo:retirement` flags candidates for human review. A packet may be deleted from current HEAD only if its outcome is reconciled, the ledger includes an immutable full-SHA Git recovery locator, any unique proof has an evidence owner, and every inbound file/heading link is replaced or deliberately resolved. Do not prune by age alone, silently orphan links, or fabricate a Done state. After `git rm`, verify Markdown link deltas. No recurring background deletion runs.

**Open-folder hygiene:** terminal Done/Cancelled packets should leave `work/changes/open/` immediately after their real closure; an unresolved or blocked packet stays visible and is not hidden in archive.

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
