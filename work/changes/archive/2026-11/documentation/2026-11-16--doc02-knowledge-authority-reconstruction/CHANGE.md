# DOC02 | Reconstruct canonical knowledge authority after DOC01

**State:** **Done (2026-11-16).** Owner authorized the close after an independent fresh-chat retrieval study passed. The snapshot was not waived. Receipt: [CLOSE.md](CLOSE.md).  
**Baseline inspected:** `main@cda7444e7bb8910e228164cb97a17b504f7c2415` on 2026-11-16.  
**Owner:** repository owner.  
**Type:** bounded documentation + documentation-tool/code navigation change; **no game runtime change**.  
**Archive rule:** **KEEP `work/changes/archive/` in full.** The owner has explicitly chosen permanent retention of terminal Change dossiers. This overrides DOC01's earlier preference for ledger-only history.

## First screen: why DOC01 did not solve it

The new names are good, but the knowledge system is not yet trustworthy. The root `docs/` has 114 files (1.57 MB); `evidence/` now has 399 files (9.40 MB), including a 312-file snapshot of retired program docs. Numerous old *full documents* still exist beside new near-identical copies, labelled “compatibility stubs”. Admin accepted product detail has been reduced to short pages that point to 318 KB historical essays, while richer selected Engine/Storyteller/OBS target material remains buried under `evidence/inspections/`. Some canonical technical owners are empty skeletons. The old DOC01 “cold-reader” report mapped expected routes without measuring actual independent retrieval.

**Do not merely prune the old tree.** Correct solution: **reconstruct permanent authority from selected product/technical end-state**, preserve meaningful negative cases, quarantine unresolved proposals as explicitly open designs, and remove redundant active copies only after fact/approval reconciliation.

## Scope, order and acceptance

Start with:
1. [AUDIT.md](AUDIT.md) — current independent findings, measured duplication, specific contradictions, limits.
2. [TARGET.md](TARGET.md) — desired ChatGPT-first authority model, domain completeness and anti-goals.
3. [CURRENT-DISPOSITION.md](CURRENT-DISPOSITION.md) — complete provisional disposition for all 114 current `docs/` files.
4. [MIGRATION.md](MIGRATION.md) — phased product-first, technical-second semantic promotion; archive preserved.
5. [VERIFICATION.md](VERIFICATION.md) — must-pass factual, negative, duplicate/link and fresh-reader tests.

**Implementation sequence (after explicit owner authorization):** freeze exact HEAD, audit claim ownership against original selected designs and present source, rebuild product canon (gameplay/Storyteller/experience/Admin), rebuild technical canon (Engine/Storyteller/OBS/Admin/client/platform/lab), resolve open design gates, remove aliases/snapshots, repair indexes and agents, add guardrails, perform independent retrieval testing, issue terminal receipt.

**Authoritative hierarchy:** product what/why > technical guarantees > code as implementation artifact. Do not interpret “target” as “implemented”. Never turn a Proposed policy into Accepted because it has an elaborate Markdown essay. New implementation must follow docs; the documentation cleanup must not modify game code to make a historic description true.

**User-facing objective:** a fresh ChatGPT chat can reach an exact selected product or technical heading within ~two navigation decisions, answer a real question including one important negative case, and know which capabilities are proved, future or undecided. An archive snapshot should never be a routine first-hop source for current product design.

## Explicit boundaries

**In scope when selected:** Markdown consolidation/rewrite, new/full canonical substantive contract sections, removal of redirect stubs and redundant HEAD copies, links/anchors and indexing, clean STATUS/ROADMAP, root AGENTS/.agents rule updates, limited `scripts/check_docs.py` and `repo:docs-health`/knowledge-check tooling, promotion of genuinely dated evidence, documented historical recovery via Git, and tests for docs integrity. Preserve unrelated work.

**Forbidden:** gameplay/business policy changes, runtime engine or UI code refactors, paid model or tool calls, deployments, non-disposable DB operations, removal of unique relevant evidence, unauthorized approval of a proposed feature, or rewriting full historical Change packets to match later architecture.

**Must preserve:** all terminal Change dossiers in `work/changes/archive/`, open code-bearing Changes under `work/changes/open/`, owner-retained dormant canon-invention design, significant negative evidence from OBS/QA, and selected-but-unbuilt future architecture as explicit correct design.

## Concrete acceptance gates

- **Every current docs file** at baseline (+ later changes) receives section-level ownership and a final disposition. Filenames or count are not semantic proof.
- **Selected future architecture no longer lives only in snapshots.** Engine, Storyteller controller, Admin product, OBS evidence and selected experience belong in actual canonical owners, with status/gates preserved.
- **Old full compat documents and empty skeletons eliminated.** Legacy paths are not permanently preserved via redirects; links repaired across maintained knowledge.
- **Work/evidence classification is real:** dated observation vs research vs proposed policy vs accepted norm. No “bulk retained under inspection” as substitute for promoting authoritative text.
- **Archive stays.** No deletion/compression of terminal Changes.
- **Entry points are clean:** short routing by user question; STATUS, ROADMAP and work Change selection are unique owners; no old program links on default route.
- **Tests and an independent 18-question retrieval study** confirm correct owner, answer, negative and evidence status; a self-written expected-route table alone fails.
- **No fabricated test claims:** commands actually run and exact SHA/results recorded.

If any selected design needs further owner approval, keep its detailed proposed text in topic-owned `work/designs/open/`; mark the gap instead of moving it to an empty page or silently approving it.

## Implementation progress (not a completion claim)

Landed on branch `docs/doc02-knowledge-authority`, then archived:

- Selected engine architecture, Storyteller two-loop controller, task recipes, publication fence, ENG03 C1/C2 versus full-ENG03 honesty, Turn Capsule, client boundary contracts, and the proposed Admin authority / Player 360 / LiveOps policies now live in canonical owners. Proposed shared play and player replay live under `work/designs/open/`, not as product skeletons.
- Near-duplicate flat technical contracts and the full product journey/storytelling copies were removed after the owning pages kept the clauses. Authored playthrough traces moved to `research/authored-scenarios/`. `TODO.md`, `docs/progress.md` and `docs/questions.md` are gone. `ROADMAP.md` and `STATUS.md` are the strategy and status owners. Terminal `work/changes/archive/` was not rewritten or deleted.
- `knowledge-health` fails compatibility stubs, skeleton banners, first-hop snapshot links, flat technical leftovers, and duplicate docs blobs.
- Admin charter, commercial and trust, AI investigation, command center, and operator workflows now carry the proposed policy, including the conditional gates. Observability owners carry the capture, read, reconstruction, retention, and telemetry invariants that were only in the essays. Essay folders `admin-program-essays-2026-11` and `obs-technical-essays-2026-11` are removed. The snapshot directory is a manifest. Unique observations moved to `evidence/inspections/doc01-retained-observations/`. Unpromoted design moved to `work/designs/open/doc01-unpromoted-design/`. The section ledger is [PROMOTION-LEDGER.md](PROMOTION-LEDGER.md). The author-written Q01–Q18 sheet is [RETRIEVAL-SELF-CHECK.md](RETRIEVAL-SELF-CHECK.md). It is not an independent study.

Closed 2026-11-16. The independent study passed the authority questions. Unpromoted design remains under `work/designs/open/`, labeled as design rather than law. No baseline fresh-chat run exists, so this close does not claim a measured before/after improvement. Paragraph-level recertification of every historical sentence is not claimed; file disposition is [PROMOTION-LEDGER.md](PROMOTION-LEDGER.md) plus [CURRENT-DISPOSITION.md](CURRENT-DISPOSITION.md).

## Initial design-only receipt

**Performed in this ChatGPT audit:** read current GitHub tree and selected product/technical documents, previous target contracts, old snapshots, workflows, code navigation and DOC01 receipt. Measured current file/size/duplicate-blob patterns and sample broken links. Wrote DOC02 design/audit files under `work/changes/open/`.

**Not performed:** all-file paragraph-level audit, code mutation, tool runtime tests, independent cold-reader benchmark, provider calls, deletion, or Change selection. A complete semantic rewrite must therefore **not be marked Done** by the presence of these documents.

## Reconciliation ledger (must be completed by Cursor before Done)

| Owner | Result | Proof |
| --- | --- | --- |
| Product gameplay, Storyteller, UX and Admin | updated | Canonical pages hold the rules and the negatives. Proposed refunds, raw prompts, and production grants stayed proposed. Independent Q01–Q08 agree. |
| Technical Engine, Storyteller, Admin, OBS, client/platform/lab | updated | Selected architecture, two loops, client SSR ownership, Turn Capsule, and C1/C2 versus full ENG03 are in the technical owners. |
| Open designs and decision rationale | updated | Shared play, player replay, and unpromoted DOC01 design stay under `work/designs/open/`. They were not accepted. |
| Evidence and research | updated | Essay folders removed. Snapshot is a manifest. Unique observations are under `evidence/inspections/doc01-retained-observations/`. Recover the old tree at `cda7444e7bb8910e228164cb97a17b504f7c2415`. |
| Root routers, .agents and scripts | updated | STATUS, ROADMAP, and `knowledge-health` match this close. `check_docs.py` reported 0 problems on the implementation commit. The fresh-chat study passed. |
| Work/changes/archive | unchanged | The reconstruction did not edit or delete terminal packets. This close only adds DOC02 beside them. |

**Owner selection:** selected by the owner on 2026-11-16. Closed by the owner on 2026-11-16 after the retrieval study.

## Copyable Cursor handoff (only after owner approves)

> Historical handoff, completed. The packet now lives at `work/changes/archive/2026-11/other/2026-11-16--doc02-knowledge-authority-reconstruction/CHANGE.md`.
