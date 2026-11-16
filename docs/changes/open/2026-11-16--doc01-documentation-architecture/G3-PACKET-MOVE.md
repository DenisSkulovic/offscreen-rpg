# DOC01 | G3 packet root move (deferred)

**Selection dual-root:** **done** (`work/changes/README.md` + `brief.mjs` + ledger append).

**Physical move** `docs/changes/{open,archive}` → `work/changes/{open,archive}`: **deferred**.

## Why deferred

Packets under `docs/changes/open|archive/…` use relative links that assume a parent under `docs/` (e.g. `../../../product/…`). The same leaf depth under `work/changes/` would resolve those links into `work/product/…` unless every packet markdown is depth-rewritten (same class of work as `archive-changes.mjs` link rewrite, but tree-wide).

## Exit when resumed

1. Scripted `git mv` of `open/` and `archive/` into `work/changes/`.
2. Rewrite relative links inside moved packets (docs-rooted → `../../../../docs/…` or repo-root style).
3. Point `archive-changes.mjs` `changesRoot` at `work/changes`.
4. Rewrite inbound `docs/changes/` consumers (except historical provenance) to `work/changes/`.
5. Leave `docs/changes/README.md` as a stub router.
6. `pnpm repo:brief`, `python scripts/check_docs.py`, `node scripts/repo-tools/archive-changes.mjs --dry-run` green.

Until then, G3 stays yellow on the no-loss gate; selection ownership is already on `work/changes`.
