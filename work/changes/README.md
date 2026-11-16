# Work changes | selection queue

**DOC01 selection owner.** Packets still physically live under `docs/changes/` until G3 packet move completes; this file owns **Current change** for `pnpm repo:brief`.

Current change: [DOC01 Rebuild the documentation knowledge architecture](../../docs/changes/open/2026-11-16--doc01-documentation-architecture/CHANGE.md)

**Current status:** DOC01 Selected — P6 soft-retire done; hard delete blocked by [no-loss gate](../../docs/changes/open/2026-11-16--doc01-documentation-architecture/P6-NO-LOSS-GATE.md).

## Layout

| Path | Role |
| --- | --- |
| [ledger/](ledger/) | Compact closed-work index (109 packets in 2026-11) |
| `open/` | Future home for non-terminal packets |
| [docs/changes/](../../docs/changes/README.md) | Physical open/ + archive packets (legacy path during migration) |

QA-SF01 and other open packets remain listed in the docs/changes open table until moved.
