# DOC01 | P1 inventory progress

**Local working store (gitignored):** `work/designs/open/doc01-migration/`  
(`work/` is in `.gitignore` by design; regenerate with the scripts below if the folder is missing.)

## Regenerators

```bash
node work/designs/open/doc01-migration/build-inventory.mjs
node work/designs/open/doc01-migration/join-disposition.mjs
node work/designs/open/doc01-migration/seed-normative-atoms.mjs
```

## Snapshot @ `0a0692f6` (first run)

| Metric | Value |
| --- | ---: |
| Tracked `docs/` files | 491 |
| Heading/asset atom rows | 4216 |
| Markdown link edges | 3736 |
| Baseline FILE-DISPOSITION rows matched | 483 |
| Paths only in DOC01 packet (post-baseline) | 8 |
| Product path atoms seeded | (see local seed output) |
| Technical path atoms seeded | (see local seed output) |

## Post-baseline paths (add to migration manifest)

All eight are this Change’s design packet under `work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/`. Disposition: **EXTRACT then RETIRE** into `work/changes/ledger/` + Git after DOC01 Done (packet is temporary by definition). Also track `CONFLICT-LEDGER.md`, this file, and copied JSON summaries if present.

## Conflict ledger

Named contradictions opened in [CONFLICT-LEDGER.md](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/CONFLICT-LEDGER.md) (C1–C8).

## Still required for P1 exit

1. Claim-level fill for seeded product/technical headings (not only path heuristics).
2. Program/engineering normative sections inventoried (priority: dual-authority subjects in audit F1).
3. Incoming-link consumers outside `docs/` (`AGENTS.md`, `.agents/`, scripts).
4. Explicit retention decisions for 3 PNG + 3 JSON assets.
5. Canon-invention dormant design marked preserve/draft.
6. Zero `PENDING` disposition on paths that will be deleted in P6 — or explicit owner gate.
