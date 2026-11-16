# DOC01 | P6 no-loss gate (honest)

**Date:** 2026-11-16  
**HEAD at gate open:** see branch tip after P5 (`69949ede`+)  
**Rule:** do **not** delete `docs/programs|engineering|history|changes|operations` until every row below is green or explicitly owner-waived.

## Ready

| Item | Evidence |
| --- | --- |
| Canonical product map | `docs/product/{foundations,gameplay,experience,storyteller,admin}/` |
| Canonical technical map | `docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/` |
| STATUS / ROADMAP / AGENTS cutover | root files; `pnpm repo:brief` reads STATUS |
| Evidence assets retained | `evidence/runs|inspections/**` + manifests; writers retargeted |
| Canon-invention preserved | `work/designs/open/canon-invention-policy/` |
| Conflicts C1–C4, C8 | closed/preserved in CONFLICT-LEDGER |
| Archive compact index | `work/changes/ledger/2026-11.md` (109 packets) |
| File-router dispositions | 0 PENDING in local inventory (heading stubs ≠ full claim certify) |
| `check_docs` | 0 problems on current tree |
| G1 high-traffic inbound (partial) | `rewrite-inbound-canonical.mjs` + selection/session rules retargeted; remaining hits are soft-retire provenance, audits, initiatives, OBS evidence not yet copied |
| G3 selection dual-root (partial) | `work/changes/README.md` owns Current change; `brief.mjs` prefers it; `docs/changes/README.md` defers; `archive-changes.mjs` appends ledger on `--apply`. Packets still physically under `docs/changes/` |

## Blocked — keep legacy trees

| Gate | Why blocked | Exit criterion |
| --- | --- | --- |
| G1 Inbound path fanout | Residual non-docs hits (~programs evidence, history/initiatives, engineering audits/targets stubs, intentional soft-retire mentions) | Live loaders + package/.agents **mandatory** maps = 0 hits on paths that will be deleted; remaining = provenance-only or owner-waived |
| G2 Claim-level certification | Most program atoms still `[heading stub]`; dual-authority merges incomplete for Admin/OBS deep essays | Domain-by-domain `resolved=true` or explicit DROP with Git pointer |
| G3 Change packet move | Packets + archiver still rooted at `docs/changes`; only selection/ledger dual-rooted | Tooling dual-root or full move to `work/changes` with green dry-run |
| G4 History minutes / legal | Minutes not fully promoted; legal attribution must not vanish with `history/` | NOTICE/legal home + sessions promotion rule applied (writers → `work/sessions/`; content promotion still open) |
| G5 Playthroughs / research | `docs/technical/playthroughs` + engineering manuals not fully historicized to evidence/research | Explicit example/research owners + stub routers |
| G6 Taxonomy hard gate | `docs-health` taxonomy is **advisory** (LEGACY lines) | Flip to fail after deletions; negative fixture test passes |

## Allowed now (soft retirement)

- Top-level **routers** on legacy indexes stating “do not author norms here”
- Continue promoting unique sections into canonical owners
- Grow `work/changes/ledger` and `evidence/` without deleting sources
- Keep compatibility stubs on flat technical/product paths
- Selection ownership under `work/changes/`; new session notes under `work/sessions/`

## Forbidden now

- `rm -rf docs/programs` (or engineering/history/changes/operations)
- Silent DROP of unique trial negatives or owner-retained drafts
- Claiming DOC01 **Done** while G1–G6 remain red
