# DOC01 | Structural and semantic-risk audit of current /docs

**Evidence basis:** GitHub `main@8cec56e1262e5493020d9da2ba163264398ad667` (2026-11-16). Structural census covered every tracked docs path (all 483 files / 176 directories). Content review covered navigation owners, harness policy, selected representative product/technical/engineering/program/Change/evaluation files and repo tooling. **This is not a false claim of 483 complete semantic document reviews.** Exact unreviewed sections must be handled by Cursor using [FILE-DISPOSITION.md](FILE-DISPOSITION.md) and the migration gate.

## 1. Measurements, not vibes

| Location / class | Files | Bytes | Structural meaning |
| --- | ---: | ---: | --- |
| Entire `docs/` | **483** | **6,510,447** | 477 .md, 3 PNG, 3 JSON; 176 tracked directories |
| `programs/` | **270** | **4,481,430** | 68.8% of all bytes; mixed product, technical, decision, evidence, handoff |
| `programs/observability/` | 74 | **2,417,835** | Includes 1,586,834-byte PNG and evaluation packets |
| `programs/experience/` | 79 | 968,647 | UX/product, design system/technical, research, visual proofs |
| `programs/engine/` | 45 | 458,326 | Technical architecture, decisions, dated reviews and handoffs |
| `programs/admin/` | 47 | 454,646 | Staff product plus 13 nested technical docs and dated implementation notes |
| `programs/storyteller/` | 24 | 181,099 | Product constitution, technical agent design, evidence and handoff |
| `technical/` | 36 | 624,858 | Technical authority *already exists outside the five programs* |
| `engineering/` | 25 | 434,496 | Standards, target contracts, agent research, source audits, QA, evidence and tool guides |
| `changes/` | 121 | 582,402 | 111 files within archive; eight nonterminal packet folders |
| `product/` | 12 | 159,699 | Permanent product bible; excludes most Admin/UX/Storyteller product work |
| `history/` | 14 | 166,166 | Daily minutes, legacy dossiers and legal attribution |
| `operations/` | 2 | 39,891 | One long local development procedure plus router |
| `docs/` root | 3 | 21,505 | Router, progress reporting, open-question list |

**Other exact measurements:** median docs file = 8,626 bytes; the three PNGs together account for **1,813,698 bytes** (27.9% of the tree); `docs/history/minutes/2026-11-12.md` alone is 71,042 bytes. All five programs contain `evidence/`; all five contain `handoff/` (12 explicitly nested handoff files altogether). The filename `CHANGE.md` appears 117 times, by design of the current packet convention, which says nothing about semantic duplicates by itself. The filename `implementation-program.md` appears in four programs.

**Structural heuristic only:** 232 files / 3,280,204 bytes match a path containing `handoff`, `evaluations`, `evidence`, `audits`, `minutes` or `archive` (or an explicit HANDOFF/AUDIT/CHECKPOINT/RUN-LOG filename). This is *not* a claim that every one should be deleted: the problem is **lifecycle classification**, not a blanket byte quota.

The complete raw path inventory and provisional disposition are in [DIRECTORY-REGISTER.md](DIRECTORY-REGISTER.md) and [FILE-DISPOSITION.md](FILE-DISPOSITION.md). Future commits necessarily alter live counts; compare to the pinned baseline, not an unversioned `main`.

## 2. Confirmed failures from file content

### F1. One subject has two or more maintained authority locations (high)

- `docs/product/storytelling/storytelling.md` describes the game's narrative behavior, while `docs/programs/storyteller/vision-and-quality-constitution.md` and `target-operating-model.md` describe a revised narrative product and runtime destination. `docs/technical/storyteller-runtime.md` already owns runtime contracts, while the Storyteller program has `context-and-retrieval.md`, `prompt-tools-and-models.md` and effort/runtime design. These may contain *different* useful information, but readers cannot determine the only authoritative version by path.
- `docs/product/journeys/player-experience.md` and `docs/programs/experience/{flows,patterns,spaces,foundations,system}/` cover the same player-facing questions, with some system documents describing technical Next/presentation mechanics.
- `docs/technical/architecture.md`, `rules-and-activities.md`, `execution.md`, `storyteller-runtime.md` coexist with `docs/programs/engine/` target contracts and 16 nested decisions. This is a hierarchy of old and new documentation *waves*, not a single owner topology.
- `docs/programs/admin/` holds staff product requirements and `docs/programs/admin/technical/` holds 13 technical documents, *outside* the official product and technical roots. Observability's technical target does the same in a second program.
- `docs/engineering/targets/react-next.md` and `chamber-laboratory.md` are selected engineering/technical destinations outside the `technical/` owner tree.

**Result:** ambiguous routing and duplicated status/accountability. **Consequence:** agents can implement one credible contract while silently violating another. **Corrective operation:** compare claims, assign one norm owner, split cross-domain paragraphs, and convert secondary copies to links or evidence.

### F2. Contradictory / stale implementation banners (confirmed concrete examples, high)

- `docs/programs/engine/README.md` opens with **ENG03-narrow Done** yet ends by describing **ENG01 alone** as design-ready for authorization, despite ENG01 being Done in the same opening. These appear to be unswept phase-boundary statements.
- `docs/programs/engine/decisions/eng03-narrow-capture-v1.md` says **“Implementation: not executed”**, while the engine index says ENG03-narrow is Done. Design acceptance and actual code must be reverified and corrected, rather than assuming either sentence wins automatically.
- `docs/programs/experience/system/presentation-runtime.md` opens **“Documentation only; no implementation authorized by this file”** while its next paragraph discusses post-PX01–PX04 implementation and a calibration plan; `experience/README.md` now says PX01–PX07 Done. The first statement may originally have been a scope warning, but its presentation as a status banner is liable to mislead.
- `AGENTS.md` begins with a specific **2026-11-15 forensic trial** and points to `programs/observability/handoff/` as the current follow-up. A startup contract should not carry yesterday's campaign launch instructions.

**Result:** the reader cannot reliably infer what is designed vs actually shipped. **Corrective operation:** make `STATUS.md` the dated current-state dashboard; keep normative documents focused on obligations, with only necessary compatibility/status distinctions; move receipts to `evidence/`.

### F3. Temporary execution records are treated as permanent documentation (high)

`programs/{admin,engine,experience,observability,storyteller}/handoff/` contains first-wave Cursor instructions, postwave handoffs, and one-off trial start files. Forensic evaluations contain `CHECKPOINT.md`, `RUN-LOG.md`, duplicate `FINAL-HANDOFF.md` style documents and phase scripts. `changes/archive/2026-11/<program>/<packet>/CHANGE.md` retains completed packets as a nested full-length execution archive.

These files can be valuable historical **evidence or provenance**, but their original procedural purpose is expired. A current coding agent finding an old “start here” file may act on a dead permission/status assumption. **Corrective operation:** extract durable decisions/observations; retain the identifying commit and a concise finished-work ledger; remove relays and checkpoints from maintained knowledge. Do not erase legally/operationally significant evidence.

### F4. Daily chat continuity is mixed with durable history (medium/high)

`history/minutes/` holds five dated logs plus an index, totaling 122,835 bytes; a single day consumes 71 KB. The daily-minutes rule in `.agents/rules/session-minutes.md` requires extensive remarks and handoff capture, so this grows without a defined promotion/expiry process. It preserves context across chats, but indefinitely storing session prose as browseable documentation creates a second, stale view of work.

**Corrective operation:** after promotion of owner decisions and future obligations, keep short rolling continuity in `work/sessions/`, with no permanent “everything said” archive in `docs/`. Meaningful accepted decision histories go to `docs/decisions/`; source traces to `evidence/`; rejected/obsolete talk remains in Git history.

### F5. Methodological categories are confused (high)

- `engineering/` mixes coding-agent development rules, a 40 KB LLM-agent research field manual, technical engine model, a 35 KB React target, QA journeys, and a live POC proof.
- `technical/playthroughs/` contains 15 authored technical/story examples. They are scenarios or test vectors, **not technical authority merely by path**.
- `history/legal/rules-attribution.md` contains legal attribution, which has nothing to do with chronological initiative history.
- `observability/evidence/assets/obs07-support-situation-synthetic.png` is a 1.59 MB screenshot of a synthetic UI, not an authoritative definition of how staff investigation must work.
- `docs/questions.md` interleaves unresolved choices with historical POC defaults, and points to legacy initiatives in a way a reader must contextualize.

**Corrective operation:** distinguish content by *what question it answers*, approval status, retention and intended reader. A properly classified test scenario can still belong to the repo, just not as a normative technical spec.

### F6. Navigation indexes are simultaneously catalog, status dashboard and historical handoff (medium)

`docs/README.md` has several multi-row tables mixing current state, research, programs, terminal changes and history. Program readmes often repeat packet Done/Proposed statuses and give older execution instructions. The same status is echoed in `docs/progress.md`, `docs/changes/README.md`, `TODO.md` and even `AGENTS.md`.

The existing layered-retrieval standard correctly discourages dumping large files into agent context, but it models the **current** program and engineering tree as stable routes. Optimization of reading behavior cannot solve contradictory ownership. **Corrective operation:** a small domain map, single `STATUS.md`, one `ROADMAP.md`, one work-selection register.

### F7. Checks preserve syntactic links, not semantic integrity (high)

The inspected `scripts/check_docs.py` verifies local Markdown targets and headings. `scripts/repo-tools/docs-health.mjs` measures `PLAN.md` checkpoint length and missing Done reconciliation ledgers. Both have value; neither checks unique authority, expired handoff files, target/spec divergence, approved-vs-proposed claims, document lifecycle, or whether a source is correctly classified.

`docs/changes/archive/README.md` even contains malformed display escape text (`\\text`) and the phrase `ode scripts/repo-tools/archive-changes.mjs`, illustrating that a current process can keep formally present but weakly maintained routing pages.

**Corrective operation:** add deterministic taxonomy/registry/reference checks **and** a human/agent semantic migration ledger. Do not mistake automated lint for proof that product or technical decisions are correct.

## 3. Folder-by-folder family disposition

**Exact leaf-by-leaf coverage** is in the exhaustive directory register. This table explains why each *family* of directories exists today and why it loses or retains that shape. All 176 baseline tracked folders are inherited by one of these rules.

| Existing family | Verdict | Rationale and treatment |
| --- | --- | --- |
| `docs/product/{foundations,journeys,storytelling}` | **Preserve authority, reshape topics** | Directly normative product content remains; `journeys` splits gameplay behavior vs frontend experience; `storytelling` merges with Storyteller program's accepted product requirements |
| `docs/technical/` | **Preserve authority, split owners** | 21 flat technical docs cover distinct subjects but several mix platform/game/client boundaries; move by correctness owner, preserving actual invariants |
| `docs/technical/playthroughs/` | **Eliminate as technical subtree** | Separate benchmark acceptance cases from executable scenarios/fixtures; preserve representative orthogonal cases |
| `docs/engineering/targets/` | **Eliminate** | React and Chamber engineering targets are technical design owners; promote to `technical/client` and `technical/lab` |
| `docs/engineering/audits/`, `evidence/` | **Eliminate from docs** | Dated code snapshots and convergence reports belong to revision-bound `evidence/inspections/` |
| `docs/engineering/` flat | **Dissolve** | Agent operating policy to `.agents`, research to `research`, current source maps beside code, QA cases to product/tests, proof to evidence, standards to runbooks |
| `docs/operations/` | **Rename/rewrite** | Maintain human repeatable runbooks, not a redundant operations routing category |
| `docs/programs/admin/` flat | **Dissolve, promote** | Staff product under `product/admin`; adversarial reviews and unapproved policy alternatives are evidence/draft/decisions, not a parallel product bible |
| `docs/programs/admin/technical/` | **Dissolve, promote** | Technical staff-control contracts to `technical/admin`; source-baseline/review documents to dated evidence |
| `docs/programs/admin/evidence/`, `handoff/` | **Remove from docs** | AD01–08 receipts to evidence; first-wave executable relay retired after ledger reconciliation |
| `docs/programs/engine/` flat | **Dissolve, promote** | Engine targets to `technical/engine`; product-derived intent to `product/gameplay` without copying |
| `docs/programs/engine/decisions/` | **Reconcile contract and rationale** | Split selected invariant into `technical/engine`; durable accepted alternative choice into `decisions/`; unapproved alternatives into work |
| `docs/programs/engine/evidence/`, `handoff/` | **Remove from docs** | Dated source reviews to `evidence/inspections`; handoffs expire |
| `docs/programs/experience/{foundations,flows,patterns,spaces}` | **Consolidate by subject** | Player UX owns outcomes, but current subfolders represent design-document format; combine flow/pattern/space where one user question needs all three |
| `docs/programs/experience/system/` | **Split** | Player-facing visual language to `product/experience`; runtime components/state/rendering to `technical/client` |
| `docs/programs/experience/{prototypes,decisions}` | **Classify** | Approved decision rationale to ADR; only reusable benchmark examples and actual fixtures retained; do not treat hypothetical screen as delivered UI |
| `docs/programs/experience/evidence/`, `renders/`, `handoff/` | **Remove from docs** | Visual proof/reviews under evidence or test snapshots, expired relay removed |
| `docs/programs/observability/` flat | **Split product audiences** | Player replay to `product/experience`; staff investigator jobs to `product/admin`; no broad new product layer called “observability” |
| `docs/programs/observability/technical/` | **Promote/reconcile** | Evidence architecture under `technical/observability`, staff grant boundary under `technical/admin` |
| `docs/programs/observability/{evidence,evaluations,handoff}` | **Remove from docs** | Separate real receipts and private retention from old evaluation plans and Cursor relays; keep provenance manifest, not a live launcher |
| `docs/programs/storyteller/` flat | **Split** | Constitution/quality to product, inference/agent loop/tool economics to technical, alternatives to ADR/research |
| `docs/programs/storyteller/{evidence,handoff}` | **Remove from docs** | Dated flow audits and SA receipts to evidence; old executor prompts expire |
| `docs/changes/open/` and packet leaves | **Move to `work/changes/open/`** | One bounded work identity is useful, but it is not permanent canonical knowledge |
| `docs/changes/archive/YYYY-MM/<program>/<packet>` | **Replace with compact ledger + Git** | Three path levels encode historical date/team rather than subject ownership; preserve receipts and authoritative decisions elsewhere |
| `docs/history/initiatives/` | **Disperse and retire** | Dormant owner-retained canon-invention work remains protected in `work/designs`; collapsed historic registers no longer need permanent directory |
| `docs/history/minutes/` | **Time-bound session continuity** | Replace indefinite detailed Markdown archives with short rolling `work/sessions`; promote real decisions |
| `docs/history/legal/` | **Move to root NOTICE** | Legal notice deserves a stable legal document, not history taxonomy |
| Root `docs/progress.md`, `docs/questions.md` | **Eliminate after reconciliation** | One dated `STATUS.md`; unresolved decisions beside the impacted topic or active design gate |

**Why not retain five `programs/` under a new name?** A program is an implementation-planning *event* or coordinating effort, not a subject with stable authority. A “program” can necessarily contain product, architecture, evidence and handoff, which means it recreates the same mixed-lifecycle problem regardless of filename. This is the strongest reason for removing that category altogether.

## 4. Competing migration options and selection

| Option | Short-term cost | Long-term result | Decision |
| --- | --- | --- | --- |
| Rename/flatten existing `programs/` | Low | Retains cross-type mixed authority; cosmetic shuffle | **Reject** |
| Keep programs but add better indexes and tags | Moderate | Adds another governance layer, stale banners still possible | **Reject** |
| Keep all completed packet/evaluation/handoff text under `archive/` | Low | Permanent search noise and infinite archive growth | **Reject** |
| Delete all old handoffs/audits/evaluations immediately | Low | Destroys unique decisions and proof, unsafe | **Reject** |
| Canonical product/technical domain owners + ADR rationale + lifecycle isolation of work/evidence | High one-time semantic migration | Clear authority, bounded maintenance, traceable history | **Select** |
| One giant mega-doc per product/engine/UX | Low directory count | Poor section discoverability; huge independent revision conflicts | **Reject** |

This is a **substantive rewrite**. Moving 483 files while retaining 483 near-identical bodies would fail.

## 5. What evidence would overturn this design?

The chosen shape must survive a cold-reader comparison. If agents reliably locate the correct norm faster and more accurately through a substantially different organization (e.g. topic-first directories containing both product and technical contracts with explicit file roles), and that organization has no duplicated authority or retention leak, the taxonomy can be revised. Product-first hierarchy itself is the owner's nonnegotiable requirement; the specific folder names are not sacred.

Test with the question suite in [VERIFICATION.md](VERIFICATION.md), compare both correctness and routing cost, and document any case where the proposed placement creates an ambiguous or longer path.

**Audit conclusion:** the observed problem is not “too many bytes” or “too many folders” alone. It is a mismatched **authority × subject × lifecycle** model. The migration must solve all three dimensions and prove it with semantic reconciliation and a cold-reader test.
