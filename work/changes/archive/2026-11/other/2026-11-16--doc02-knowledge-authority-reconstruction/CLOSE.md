# DOC02 close receipt

**State:** Done (2026-11-16).  
**Implementation commit:** `2fc35a2d2f063bf3a595416da4d8e1ebb326a494` on `docs/doc02-knowledge-authority`.  
**Parent before that commit:** `58005060`.  
**Baseline the audit measured:** `cda7444e7bb8910e228164cb97a17b504f7c2415`.  
**Provider spend:** none. Game runtime was not edited.

## Retrieval study

An independent fresh chat answered Q01–Q18 from the tree and did not open [RETRIEVAL-SELF-CHECK.md](RETRIEVAL-SELF-CHECK.md), the snapshot, or an essay folder. The authority conclusions on Q01, Q02, Q05, Q06, Q08, Q11, Q12, Q14, Q17, and Q18 were correct: no silent time, narration does not transfer items, the reasoning loop is a selected target, raw prompts are not granted, LiveOps does not rewrite history, the Turn Capsule is proposed, full ENG03 is not Done, nonhuman forms do not invent a humanoid inventory, agent cost and provider cost are separate, and DOC02 was the only Selected Change.

There was no earlier fresh-chat run. This close does not claim a measured improvement against a baseline.

The planted adversarial pack (a legacy Admin essay, a synthetic OBS07 run, and ENG03-narrow evidence handed to the reader as bait) was not run. The study still refused those wrong conclusions on Q06 and Q12.

## What replaced the second bible

| Removed from authority | Where the answer lives |
| --- | --- |
| Admin and Observability essay folders | `docs/product/admin/` and `docs/technical/observability/` |
| 312-file snapshot as a source | `evidence/inspections/doc01-legacy-snapshot/MANIFEST.md` |
| Unique dated notes | `evidence/inspections/doc01-retained-observations/` |
| Design not promoted | `work/designs/open/doc01-unpromoted-design/` |

Ten promotions, source heading to canonical heading:

1. Pace rule → `docs/product/gameplay/time-and-autonomy.md` # Pace
2. Prose does not transfer an item → `docs/product/gameplay/rules.md` # Authority split
3. Two loops, not an always-on model → `docs/technical/storyteller/operation-and-controller.md` # Two loops
4. Turn Evidence Capsule → `docs/technical/observability/identities-and-evidence.md` # Turn Evidence Capsule
5. Modular monolith, not LLM-led chat → `docs/technical/engine/selected-architecture.md` and `docs/decisions/D-0001--modular-engine.md`
6. SSR QueryClient ownership → `docs/technical/client/state-and-server-boundary.md` # Ownership
7. Tier C raw prompts stay conditional → `docs/product/admin/ai-engineering-and-investigation.md` # Disclosure is not one permission
8. Refund is not an allowance → `docs/product/admin/commercial-and-trust.md`
9. Reconstruction does not rerun the game → `docs/technical/observability/investigation-and-reconstruction.md` # Reconstruction steps
10. C1 and C2 only → `docs/technical/engine/concurrency-and-recovery.md`

## Checks on the implementation commit

`python scripts/check_docs.py`: 196 files, 0 problems. `node scripts/repo-tools/knowledge-health.mjs`: ok. `pnpm repo:docs-health`: taxonomy ok, knowledge-health ok. Historical Done packets missing a reconciliation ledger stayed an advisory, and this close did not rewrite them.

## Still not accepted

Shared play, player replay, production Support grants, raw-prompt access, LiveOps kill switch, and full ENG03. QA-SF01 and OBS00-B stay Blocked and were not selected.
