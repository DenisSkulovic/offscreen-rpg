# DOC02 | Reconstruct canonical knowledge authority after DOC01

**State:** **Selected / implementation in progress.** Owner authorized work on 2026-11-16. Not Done until the verification gates in [VERIFICATION.md](VERIFICATION.md) pass without a snapshot waiver.  
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

Landed on branch `docs/doc02-knowledge-authority`, not archived:

- Selected engine architecture, Storyteller two-loop controller, task recipes, publication fence, ENG03 C1/C2 versus full-ENG03 honesty, Turn Capsule, client boundary contracts, and the proposed Admin authority / Player 360 / LiveOps policies now live in canonical owners. Proposed shared play and player replay live under `work/designs/open/`, not as product skeletons.
- Near-duplicate flat technical contracts and the full product journey/storytelling copies were removed after the owning pages kept the clauses. Authored playthrough traces moved to `research/authored-scenarios/`. `TODO.md`, `docs/progress.md` and `docs/questions.md` are gone. `ROADMAP.md` and `STATUS.md` are the strategy and status owners. Terminal `work/changes/archive/` was not rewritten or deleted.
- `knowledge-health` fails compatibility stubs, skeleton banners, first-hop snapshot links, flat technical leftovers, and duplicate docs blobs.
- Admin charter, commercial and trust, AI investigation, command center, and operator workflows now carry the proposed policy, including the conditional gates. Observability owners carry the capture, read, reconstruction, retention, and telemetry invariants that were only in the essays. Essay folders `admin-program-essays-2026-11` and `obs-technical-essays-2026-11` are removed. The snapshot directory is a manifest. Unique observations moved to `evidence/inspections/doc01-retained-observations/`. Unpromoted design moved to `work/designs/open/doc01-unpromoted-design/`. The section ledger is [PROMOTION-LEDGER.md](PROMOTION-LEDGER.md). The author-written Q01–Q18 sheet is [RETRIEVAL-SELF-CHECK.md](RETRIEVAL-SELF-CHECK.md). It is not an independent study.

Still open, so this Change stays **Selected** and is not Done:

- An independent fresh-chat retrieval study of Q01–Q18 has not been run. The author of the pages cannot score that study.
- Paragraph-level certification of every baseline file is not claimed. Unpromoted design remains under `work/designs/open/`, labeled as design rather than law.

## Initial design-only receipt

**Performed in this ChatGPT audit:** read current GitHub tree and selected product/technical documents, previous target contracts, old snapshots, workflows, code navigation and DOC01 receipt. Measured current file/size/duplicate-blob patterns and sample broken links. Wrote DOC02 design/audit files under `work/changes/open/`.

**Not performed:** all-file paragraph-level audit, code mutation, tool runtime tests, independent cold-reader benchmark, provider calls, deletion, or Change selection. A complete semantic rewrite must therefore **not be marked Done** by the presence of these documents.

## Reconciliation ledger (must be completed by Cursor before Done)

| Owner | Pending change | Required proof |
| --- | --- | --- |
| Product gameplay, Storyteller, UX and Admin | Promote accepted selected concepts + negative cases, retire double bibles | Section ledger and independent review |
| Technical Engine, Storyteller, Admin, OBS, client/platform/lab | Merge accepted future design and old runtime contracts, separate current-state evidence | Exact owner heading and counterexample |
| Open designs and decision rationale | Preserve unresolved gates, avoid invented acceptance | Owner decision pointer |
| Evidence and research | De-duplicate full historical snapshots and research/graveyard material without loss | Reproducibility + Git SHA/asset hash |
| Root routers, .agents and scripts | Remove stubs, stale “after cutover” language and duplicate loaders | Link test, negative checks and new-reader study |
| Work/changes/archive | **Retain all** | Full path and content inventory, before/after |

**Owner selection:** selected by the owner on 2026-11-16. Do not mark Done while the open items above remain.

## Copyable Cursor handoff (only after owner approves)

> Implement DOC02 from `work/changes/open/2026-11-16--doc02-knowledge-authority-reconstruction/CHANGE.md`. This is a semantic knowledge reconstruction, not a rename/formatting job. Begin with the pinned independent AUDIT and TARGET, classify all current docs plus prior selected program designs, rebuild accepted product then technical owner contracts in full, preserve all unresolved product choices as open designs, eliminate old copies and empty canonical skeletons after promotion, update links/scripts/agent routes, and pass the independent fresh-reader acceptance. **Leave the entire `work/changes/archive/` intact**. Work on a branch with phase gates; no paid providers, game-code refactors, live DBs or invented approvals.
