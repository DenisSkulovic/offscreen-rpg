# DOC01 | P7 terminal receipt

**Branch:** `docs/doc01-architecture`  
**P6/P7 HEAD (pre-archive):** `069631daf9f17d885be92732594876fdc5ddf4fa` (+ this P7 commit)  
**Baseline cited:** `main@8cec56e` (483 docs files / 176 dirs at audit)

## Before → after (docs/)

| Metric | Baseline (audit) | After P6/P7 |
| --- | --- | --- |
| Tracked Markdown under `docs/` (check_docs) | ~680 mixed | **237** canonical |
| Top-level `docs/` dirs | programs, engineering, history, changes, operations, product, technical, … | **product, technical, decisions, runbooks** |
| Change packets | `docs/changes/` | `work/changes/{open,archive,ledger}` |
| Evidence | under programs | `evidence/runs|inspections` (+ `doc01-legacy-snapshot`) |

## Canonical map

- Product: `docs/product/{foundations,gameplay,experience,storyteller,admin}/`
- Technical: `docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/` (+ playthroughs soft-retire)
- Decisions / runbooks: `docs/decisions/`, `docs/runbooks/`
- Work: `work/{changes,designs,sessions}/`
- Evidence / research: `evidence/`, `research/`

## Five semantic merges (examples)

1. Storyteller product dual-authority → `docs/product/storyteller/behavior-and-quality.md` (C5)
2. Experience journeys → `docs/product/experience/*` (C6)
3. Engine/OBS technical maps → `docs/technical/engine|observability|platform` (C7)
4. Admin product/technical maps → `docs/product/admin/*`, `docs/technical/admin/*`
5. Legal attribution → root `NOTICE.md`

## Five temporary artifacts retired

1. Live `docs/programs/**` (snapshot retained)
2. Live `docs/engineering/**` (research retain + snapshot)
3. Live `docs/history/**` (G4 waive + snapshot)
4. Live `docs/operations/**` → runbooks
5. Live `docs/changes/**` → `work/changes`

## Checks run

| Command | Result |
| --- | --- |
| `python scripts/check_docs.py` | 0 problems |
| `pnpm repo:docs-health` (STRICT default) | ok \| docs/ namespaces within allowlist |
| `pnpm repo:brief` | Current change DOC01 until archive |
| `node --test scripts/repo-tools/archive-changes.test.mjs` | pass (G3) |
| Paid providers | **none** |

## Cold reader

[P7-COLD-READER.md](P7-COLD-READER.md) — Q1–Q18 routes; adversarial Support-grant negatives held.

## Unresolved (honest, not blockers for DOC01 docs outcome)

- Production Support grant steward; OBS00-B; OBS04 E0; live creative quality unproved
- Open product basket: `work/designs/open/product-open-questions.md`
- Historical archive packets still lack Reconciliation ledger headings (docs-health advisory)

## Conflicts

[CONFLICT-LEDGER.md](CONFLICT-LEDGER.md) C1–C8 closed/preserved as recorded.
