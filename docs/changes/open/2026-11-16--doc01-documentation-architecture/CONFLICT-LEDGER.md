# DOC01 | P1 conflict ledger (named baseline contradictions)

**Status:** opened during P1 on branch `docs/doc01-architecture` @ selection HEAD `0a0692f6`.  
**Rule:** do not silently pick a winner. Correct status against Change archive + source evidence, or leave **owner-gated**.

| ID | Competing sources | Observed contradiction | Working resolution (P1) | Gate |
| --- | --- | --- | --- | --- |
| C1 | `docs/programs/engine/README.md` opening vs final § | Opening (reconciled 2026-11-15): ENG01…ENG03-narrow/C1/C2 **Done**. Final paragraph still said “ENG01 alone is design-ready… No implementation or live validation is claimed.” | **Closed 2026-11-16:** final § rewritten to defer to opening Status + Change queue; old handoff is evidence-only. | Closed |
| C2 | `docs/programs/engine/decisions/eng03-narrow-capture-v1.md` vs engine README + archive | Decision banner said **“Implementation: not executed.”** while archive/README/source show narrow path Done. | **Closed 2026-11-16:** banner corrected to landed narrow path; full ENG03 stays Proposed. Contract text still merges into `technical/engine` / concurrency in later fold. | Status closed; body merge open |
| C3 | `docs/programs/experience/system/presentation-runtime.md` vs experience README / PX archive | File opened “Documentation only; no implementation authorized…” while PX Done + post-PX calibration existed. | **Closed 2026-11-16:** canonical [technical/client/presentation-runtime](../../../technical/client/presentation-runtime.md) + legacy stub; stale banner retired; limitation kept. | Closed |
| C4 | `AGENTS.md` forensic trial bootstrap vs Change queue | AGENTS first screen launched expired forensic trial as cold-start. | **Closed 2026-11-16:** AGENTS rewritten to STATUS + Change queue + subject owners; trial material → evidence. | Closed |
| C5 | `docs/product/storytelling/*` vs `docs/programs/storyteller/vision-and-quality-constitution.md` (+ target-operating-model) | Two product-facing narrative authorities. | **Closed 2026-11-16 (G2):** merged into `docs/product/storyteller/*` per [STORYTELLER-CLAIM-COMPARE](STORYTELLER-CLAIM-COMPARE.md) + [G2-PRIORITY-CERTIFY](G2-PRIORITY-CERTIFY.md); unproven quality stays target/STATUS. | Closed |
| C6 | `docs/product/journeys/player-experience.md` vs `docs/programs/experience/{flows,patterns,spaces,foundations}` | Multiple player-journey owners / formats. | **Closed 2026-11-16 (G2):** recomposed under `docs/product/experience/*`; program formats soft-retired. | Closed |
| C7 | `docs/technical/*` engine/Storyteller contracts vs `docs/programs/engine|storyteller|observability/technical` | Dual technical trees by wave. | **Closed for engine+OBS owner maps 2026-11-16 (G2):** `technical/engine|platform|observability|storyteller`. Deep OBS/Admin essays still open under G2 residual. | Map closed; deep essays open |
| C8 | Owner-retained `docs/history/initiatives/2026-09-24--01-30--canon-invention-policy` | Dormant policy must not be discarded or silently accepted. | **Preserved 2026-11-16:** copied to `work/designs/open/canon-invention-policy/` with draft README; history path stubbed. | Preserved (draft) |

## Source spot-checks still required before closing C2

Before rewriting ENG03-narrow status language in permanent docs, confirm capture symbols / Change archive receipts still match current HEAD (local, no paid providers). Record command + SHA in P3 notes.
