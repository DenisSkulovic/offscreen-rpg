# DOC01 | G3 packet root move

**Selection dual-root:** done earlier.  
**Physical move:** **done 2026-11-16** via `work/designs/open/doc01-migration/move-changes-to-work.mjs --apply`.

## Result

| Step | Evidence |
| --- | --- |
| `git mv` open leaves + archive tree | `work/changes/open/*`, `work/changes/archive/**` |
| Packet relative-link rewrite | 133 files (depth into `docs/` / packages) |
| Inbound `docs/changes/` → `work/changes/` | 90 files / 558 replaces |
| Relative `../changes/` under `docs/` | `rewrite-docs-relative-changes.mjs` — 135 files / 361 replaces |
| Archiver + docs-health root | `scripts/repo-tools/{archive-changes,docs-health}.mjs` → `work/changes` |
| Stub | `docs/changes/README.md` router only |
| Checks | `archive-changes --dry-run` 0 moves; `check_docs` 0 problems; `repo:brief` Current change under `work/changes/open/…` |

## Residual

Empty `docs/changes/` directory may remain untracked; do not author packets there. Historical prose mentioning the old path in soft-retired trees is OK if links resolve.
