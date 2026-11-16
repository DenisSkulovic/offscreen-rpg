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
| G1 high-traffic inbound (partial) | Rewrite script + maps retargeted; residuals = audits/initiatives/soft-retire provenance |
| G2 priority domains (partial) | [G2-PRIORITY-CERTIFY](G2-PRIORITY-CERTIFY.md); OBS evidence under `evidence/runs/observability-program-2026-11-15/` |
| **G3 Change packet move** | [G3-PACKET-MOVE](G3-PACKET-MOVE.md) — packets + archiver + docs-health rooted at `work/changes`; stub at `docs/changes/README.md` |
| G4 writers + legal (partial) | New sessions → `work/sessions/`; `NOTICE.md` legal home; legacy minutes readable via stub index |

## Blocked — keep legacy trees

| Gate | Why blocked | Exit criterion |
| --- | --- | --- |
| G1 Inbound path fanout | Residual non-docs hits (history/initiatives, engineering audits/targets, intentional soft-retire mentions) | Live loaders + package/.agents **mandatory** maps = 0 hits on paths that will be deleted; remaining = provenance-only or owner-waived |
| G2 Claim-level certification | Priority maps certified; Admin/OBS deep essays + atom bulk still open | Remaining domains `resolved=true` or DROP with Git pointer; no silent mass resolve |
| G4 History minutes content | Writers + NOTICE done; dated 2026-11-11…15 bodies still only under `docs/history/minutes/` | Promote nontrivial decisions or accept Git recovery + stub routers before delete |
| G5 Playthroughs / research | Playthroughs router + [research/engineering-manuals](../../../../research/engineering-manuals.md); bodies still under engineering/playthroughs | Owner waive unique headings (Git recovery) or copy remaining unique sections before delete |
| G6 Taxonomy hard gate | `docs-health` taxonomy is **advisory** (LEGACY lines) | Flip to fail after deletions; negative fixture test passes |

## Allowed now (soft retirement)

- Top-level **routers** on legacy indexes stating “do not author norms here”
- Continue promoting unique sections into canonical owners
- Grow `work/changes/ledger` and `evidence/` without deleting sources
- Keep compatibility stubs on flat technical/product paths
- Selection + packets under `work/changes/`; new session notes under `work/sessions/`

## Forbidden now

- `rm -rf docs/programs` (or engineering/history/operations) — `docs/changes` is stub-only after G3
- Silent DROP of unique trial negatives or owner-retained drafts
- Claiming DOC01 **Done** while G1–G2 / G4–G6 remain red
