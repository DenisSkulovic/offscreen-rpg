# DOC01 | Rebuild the documentation knowledge architecture

**State:** **Selected / implementing.** 2026-11-16. **Owner:** repository owner. **Work type:** bounded code/config/docs migration with substantive semantic consolidation; this packet is a one-off bootstrap in the existing `work/changes/open/` convention. After DOC01 cutover, active Changes will live in `work/changes/open/`.

**Permission:** Owner selected DOC01 for Cursor implementation in this chat (2026-11-16). Authorized: documentation rewrite/relocation, minimum loader/agent-routing updates, P0–P7 per [MIGRATION.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/MIGRATION.md). Still forbidden: paid providers, deploy, live/non-disposable DB, gameplay/runtime refactors, silent product-approval invention, deletion before no-loss proof. QA-SF01 stays open/Blocked but is no longer Current.

## First-screen executor brief

**Outcome:** Replace the historical `/docs` accumulation with one disciplined, product-first documentation system. Eliminate the mixed `programs/`, `engineering/`, `history/` and `changes/` classes from canonical `docs/` once, and only once, their unique content has been promoted to permanent owners, active work, retained evidence, or approved decisions. Rewrite/consolidate documents by knowledge owner, not merely rename paths.

**Start here, in order:**

1. [TARGET-ARCHITECTURE.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/TARGET-ARCHITECTURE.md): ideal topology, each surviving directory's burden of proof, information/lifecycle ownership.
2. [AUDIT-BASELINE.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/AUDIT-BASELINE.md): measurements, confirmed path/authority failures and concrete contradictory status banners.
3. [DIRECTORY-REGISTER.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/DIRECTORY-REGISTER.md): **all 176** baseline tracked directories and dispositions.
4. [FILE-DISPOSITION.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/FILE-DISPOSITION.md): **all 483** baseline files (at `main@8cec56e`) and candidate routes. These routes **are not semantic certification**.
5. [MIGRATION.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/MIGRATION.md): phased read-only investigation, claim-level reconciliation, product rewrite, technical rewrite, evidence/work split, agent/tool cutover, cleanup.
6. [VERIFICATION.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/VERIFICATION.md): no-loss checks, unique-owner proof, negative tests, cold-reader benchmark and terminal review.

**Core non-negotiable:** the product bible defines *what/why*, accepted technical contracts define *guarantees*, source code is an **artifact**. No amount of neat directories licenses rewriting product intent to match vibecoded code. A design or source audit does not prove implementation. No deletion before unique decisions/negative cases are preserved.

**No mega-read for coding agents:** use the inventory programmatically, select exact headings and source when necessary. Cursor may split local execution across controlled phases; each phase must carry a small checkpoint and pass its gate before old paths are retired. Never treat “move all files then fix links later” as safe.

## Current baseline and problem

GitHub `main@8cec56e1262e5493020d9da2ba163264398ad667` on 2026-11-16: 483 files, 176 directories, 6,510,447 bytes under `docs/`; 270 files / 4,481,430 bytes under five `docs/programs/`. Permanent product/technical content is mixed with handoffs, source audits, executed trial packets, archive and dated session minutes. Status contradictions verified in engine/experience docs, and AGENTS startup points to expired trial context. Complete findings and qualifications in the audit; metrics are **not** proof of semantic duplication.

## Implementation boundaries

**In scope once specifically authorized:** rewrite/merge/split and relocate docs; create canonical product/technical/decision/runbook owners; isolate unfinished design/Change work and actual evidence/research outside `docs/`; update root `STATUS.md` and `ROADMAP.md`; repair .agents/AGENTS/CLAUDE/Cursor references and repository scripts/checkers that load or validate docs; content-index mapping; test/fixture path moves where necessary; safe Git history/retention and closing receipt.

**Out of scope:** game mechanics or product decisions, SQL/schema/runtime/API change, model behavior, paid tests, live DB, deployment, destructive provider calls, rewriting legal obligations, indiscriminate removal of unique trial evidence, and making deferred product policies “accepted” on an assistant's authority. Scope needed for a genuine runtime bug must become a separately owner-selected Change.

**Explicit owner preservation:** dormant canon-invention policy, unapproved Admin commercial/Support grant/privacy gates, partial ENG03/full short-lock, OBS00-B live entitlement, GM03/GM07, historic execution facts including negative failures. These may be drafts/evidence, never silently upgraded or lost.

## Accepted target and falsifiable completion

Not accepted until the owner reviews the design. The proposed target has `docs/{product,technical,decisions,runbooks}/` as canonical documentation, `work/{changes,designs,sessions}/` for temporary tasks, `evidence/` for dated observations, `research/` for curated nonbinding studies, `.agents/` for coding-agent guidance and source-adjacent READMEs for actual code maps. `STATUS.md` owns current demonstrated state; `ROADMAP.md` owns strategy.

**Completion requires all of the following:**

- Zero source files or substantive claims unaccounted for (all 483 + any main drift).
- Accepted product and technical invariants consolidated to **one owner per claim**, without weakening negative cases or inventing approval.
- Stale banners and identified contradictions investigated/closed; proposed vs implemented truth made honest.
- No transient folders in canonical `docs/`; no `programs/` under a fresh name.
- Correct executable link/heading paths, scripts, agent bootstrap and active queue; full checks and negative tests.
- Historical evidence, legal attribution and owner-retained dormant choices protected, with Git provenance.
- Cold-reader retrieval comparison for 18 real questions; critical authority answers correct.
- Final before/after measurements and a terminal reconciliation ledger.

**If a correctness/approval gate blocks, halt that topic and report it.** Maintaining unresolved material transparently is better than silent data loss.

## Execution sequence (once selected)

P0 frozen baseline → P1 full section-level claim/incoming-link inventory → P2 permanent **product** contract rewrite → P3 permanent **technical** contract rewrite → P4 ADR/evidence/runbook/temp work separation → P5 executable/tool/link cutover → P6 obsolete tree deletion after no-loss proof → P7 automated gardening + terminal receipt.

Read detailed phase exit gates in [MIGRATION.md](../../../../work/changes/open/2026-11-16--doc01-documentation-architecture/MIGRATION.md). Avoid shotgun edits to source runtime. The user explicitly prefers rewriting awkward old documents over accommodating the old taxonomy.

## Reconciliation ledger

**Not yet completed: Proposed.** Cursor must fill before marking Done:

| Authority / consumer | Source review | Target destination | Disposition and why | Proof / status |
| --- | --- | --- | --- | --- |
| Product foundations, gameplay, journeys, storytelling, experience and Admin | In progress (P2) | `docs/product/{foundations,gameplay,experience,storyteller,admin}/` | Gameplay + core experience/storyteller owners landed; legacy stubs; admin deferred | Partial — stubs until P5 |
| Technical current/target (including engine, client, Storyteller, Admin, OBS and Chamber) | In progress (P3) | `docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/` | Core contracts promoted; skeletons + stubs; claim merges ongoing | Partial — flat/program paths until P5 |
| Approved decisions and unresolved business policy | In progress (P4) | `docs/decisions/` + `work/designs/open/` | Scaffold + canon-invention preserved; ADRs not mass-invented | Partial |
| Historical source audits / trials / screenshots / legal attribution | In progress (P4) | `evidence/`, test snapshots, `NOTICE.md` | evidence/ scaffold; assets still in programs until writer retarget | Partial |
| Root roadmap/status + .agents/harness/tool loader | In progress (P5) | `ROADMAP.md`, `STATUS.md`, `.agents/`, scripts | STATUS/ROADMAP/AGENTS + brief/docs-health/writers updated; full queue move pending | Partial |
| All 483+ individual paths | Partial (P6 gated) | See registers + ledger | File-router dispositions done; claim certify + deletion blocked by P6-NO-LOSS-GATE | Soft-retire only |

**Execution receipt:** No code migration, link cutover, provider calls, runtime testing, deletion or docs-health result is claimed by this design-only packet. The design artifacts were written through the connected GitHub repository; Cursor must rerun actual local checks on its checkout.

## Cursor handoff request (for owner to send)

> Implement **DOC01** from `work/changes/open/2026-11-16--doc01-documentation-architecture/CHANGE.md`. Do not merely rename/move documents. Follow the complete directory/file census and content-atom reconciliation first, rewrite permanent product then technical owners, isolate temporary work/evidence, update all repo loaders and links, and pass the negative/retrieval tests. Keep an isolated branch and stop for unresolved owner approval. No paid providers, live data or gameplay refactors. Return the actual before/after evidence and reconcile the DOC01 ledger before Done.
