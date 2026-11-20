# DOC03 | Third independent audit of the knowledge foundation

**Status:** design-only third audit, 2026-11-16. **Frozen subject:** `main@68736c02c500fc83337c9f6bdd00343cffa4246d`, after DOC02 was marked Done. This is **not** an audit of how politely Cursor complied with DOC02; it assesses the repository as a future ChatGPT knowledge interface. No game code or canonical specifications were modified during this investigation.

## Executive judgment

**DOC02 materially improved the canonical `docs/` layer. It did not finish the wider knowledge system.** It now has topical product/technical authority, real Admin and Storyteller substance, and a useful question router. The most important remaining defects are **incorrect temporal/approval classification, source-versus-target drift, old agent guidance, and improperly retained design/evidence material**. Repeating a large-scale move without resolving those facts would be a fourth cosmetic migration.

The selected response is not to design a brand-new taxonomy. Keep the valid product/technical domains; rigorously reconcile **what is current, what is selected, what is proposed, and what is only history**. Remove old DOC01 machinery, leftover one-off handoffs, and duplicate actual evidence **only after** checking unique claims and provenance. **The entire terminal Change archive is to remain permanently intact.**

## 1. Frozen complete-tree measurements

| Surface | Files | Git-tree bytes | Main question |
| --- | ---: | ---: | --- |
| `docs/` | **74** | **947,507** | Are those the complete approved product/technical owners? |
| `work/` | **292** | **2,161,331** | Are active designs genuinely active, not mixed legacy? |
| `work/designs/` | **130** | see below | Why does the open design tree still include nearly 1 MB of old program work? |
| `evidence/` | **181** | **6,674,009** | Is material actual dated proof, or a retained old document collection? |
| `research/` | **26** | **333,234** | Is this sourced research or internal authored fixtures/old code audits? |
| `.agents/` | **57** | **469,355** | Are foundational agent operating rules actually consistent with repository reality? |

Further exact partitions at this SHA:

- `docs/` has **16** tracked directories: 2 decision records, the product and technical domain folders, and runbooks. This is a sensible **candidate** tree but not proof of correct content ownership.
- `work/designs/open/doc01-unpromoted-design/`: **95 files / 996,369 bytes**. Within its `programs/` branch: Engine **25 / 299,129 bytes**; Experience **60 / 624,612**; Storyteller **5 / 56,459**; Observability **1 / 12,962**, plus a program index.
- `work/designs/open/doc01-migration/`: **25 files / 82,760 bytes**, including **18 old migration scripts / 72,698 bytes**, despite DOC01 and DOC02 being Done.
- `evidence/inspections/doc01-retained-observations/`: **140 files / 3,035,698 bytes**, including old handoffs, dated minutes, AI-development manuals, source audits and copies of run artifacts.
- `evidence/runs/`: **35 files / 3,410,025 bytes**, including two copies of the same large Support screenshot and repeated run receipts.
- `research/authored-scenarios/`: **15 files / 154,987 bytes**. Authored game examples, not external engineering/scientific research.
- `research/legacy-engineering/`: **5 files / 122,150 bytes**: old QA journeys, frontend playbook, connected POC proof, memory study, router.
- `work/changes/archive/`: **149 files / 977,552 bytes**. **Permanently retain**, explicitly exempt from cleanup/dedup ambitions.

Exact Git blob census: **15 groups of byte-identical blobs**, **3,479,264 additional path-listed bytes** beyond one path per blob. One **1,586,834-byte** synthetic OBS07 screenshot is tracked *three* times. Also repeated UX PNGs, three copies of one QA-SF01 report, and copied JSON receipts. Git blob storage may deduplicate identical content, but search/navigation and checkout still encounter redundant paths. Never delete the only test-valid or uniquely referenced copy without checking dependencies.

## 2. High-confidence failures grounded in actual current files

### F01 — Open-design class is being used as an unresolved DOC01 attic (critical)

`work/designs/open/doc01-unpromoted-design/` is not a topic, a coherent approval status or an active design. Its README describes old files as “open or historical design”, which are categorically different lifecycles. Examples found inside:

- `programs/experience/system/presentation-language.md`: **“selected design contract”** (14,080 bytes), while `docs/technical/client/presentation-runtime.md` still refers to it for detailed presentation language.
- `programs/storyteller/prompt-tools-and-models.md`: **“selected desired architecture”** (13,774 bytes), while `docs/technical/storyteller/prompts-and-tools.md` is 5,005 bytes and its owner question overlaps.
- `programs/engine/decisions/world-capability-kernel.md`: selected conceptual approach, not finalized schema. Belongs as a section of selected architecture + genuine unresolved gate, not under a folder named DOC01.
- `programs/engine/decisions/eng05-shared-cas-contract.md`: selected detailed ENG05 design from 2026-11-13; ENG05 later landed. This is not an indefinitely open new design proposal.
- `programs/engine/decisions/eng03-committed-action-capture-v1.md`: a 36 KB conditional implementation-grade design whose pre-implementation banner describes a then-unverified commit; this must be reconciled with C1/C2 landed evidence, not silently treated as an open new Change.
- `programs/experience/foundations/temporal-philosophy.md`: a genuine unratified *alternative product decision study* with a concrete challenge to strict commitment-bound time. It belongs to a *named unresolved product choice*, not the same status as a selected rendering contract.
- `programs/experience/flows/shared-story-collaboration.md`: genuinely future and unsettled group-policy design, which should connect to a dedicated shared-play gate.
- `programs/experience/decisions/gm01-custom-intent-policy-v1.md`: recommended proving slice with completed GM01/GM02 Change references. Its intended status must be checked against those completed slices.

**Direct comparison:** for four representative old design → canonical target pairs (presentation language → client presentation, Storyteller prompt tools → current prompts/tools, world capability kernel → engine selected architecture, temporal philosophy → gameplay time), a six-content-word shingle comparison returned **0 shared six-word shingles**. This metric does not prove those concepts are missing, but it strongly cautions against claiming they were semantically promoted. Review claims, variants, negative cases and decisions manually.

**Required resolution:** classify all 95 files by *actual approval state and knowledge role*. Selected accepted technical constraints go into existing canonical owners; legitimately unsettled domain proposals move to named topical active/parked design folders; completed implementation specifications already live in the retained Change archive; dead handoffs/retrospective phase programs are Git-only after claim extraction. The DOC01 root folder must disappear, not become a smaller DOC03 legacy box.

### F02 — “Evidence” includes old handoffs, minutes and engineering theory (critical)

The 140-file retained-observations collection contains:
- `engineering/agentic-systems-field-manual.md` (40.8 KB), `coding-agent-knowledge.md` and `coding-agent-target-standard.md`: procedural/reference knowledge, **not an observation**.
- `history/minutes/2026-11-12.md` (~71 KB) and other daily minutes: dated conversation context, not durable product or scientific evidence.
- `programs/*/handoff/` and `observability/evaluations/*/FINAL-HANDOFF.md`: expired executor instructions, not current run proofs.
- genuine dated ENG/OBS/UX source audits, measured trials and binary screenshots: **actual evidence**, worth retaining when they have source revision, method, negative findings and a usable consumer.

This retained tree still imitates the deleted `programs/` hierarchy and mixes epistemic classes. Removing it *after reviewing unique legal, source and test content* is valid; preserving all as “evidence” is not. Never hard-delete unique published evidence just to improve counts.

### F03 — Current implementation status contradicts completed Changes and source maps (critical)

**Concrete, cross-checked examples:**

1. `docs/technical/platform/identities-and-access.md` states SSE was selected but “**not implemented yet**.” Yet W16/W17 archived Changes are **Done**, `apps/web/src/features/play/README.md` identifies live `useStoryLiveUpdates`, `story-update-stream.ts`, EventSource/Query invalidation, and `apps/web/src/shared/api/README.md` documents SSE-aware snapshot reads. A current contract can still differentiate production-grade/live proof, but “not implemented” contradicts tracked code.
2. `docs/technical/lab/chamber-and-fixtures.md` says selected **future implementation**, “**not implemented or authorized for source edits**,” and `docs/technical/lab/experiment-protocol.md` says “code remains unchanged.” CH01 and CH08 archived packets report Done, `packages/application/src/developer-tools/README.md` enumerates actual CH01–CH11 Lab modules, and `apps/api/src/modules/stories/chamber-lab-controller.ts` exists. Some specific lab lanes remain constrained, but blanket “not implemented” is wrong.
3. `apps/web/README.md` says source maps describe current code, “not TanStack/RHF/SSE as already implemented,” while its deeper Play and Shared Query READMEs plus `authenticated-query-provider.tsx` show Query/SSE functionality exists.
4. `packages/application/src/developer-tools/README.md` opens with a stale **2026-11-12 pre-CH baseline** saying no generic scenario runner and Chamber target not implemented, but later in the same file lists LabRun, test fault controls and workbench with CH01–CH11.
5. `.agents/rules/documentation.md` and `.agents/references/documentation-navigation-standard.md` say `scripts/check_docs.py` doesn't scan nested source READMEs or heading anchors and speak of W22 as future. Inspected Python **does** recursively scan nested source READMEs and check anchors; W22 Change is in archive marked Done.

**This is a structural management defect, not simply prose proofreading.** Implementation-status assertions are duplicated across normative pages, source maps, guidebooks and AGENTS. The current `STATUS.md` cannot practically track every tiny feature alone. Need one supported **capability/coverage ledger** with actual evidence, plus substantive contracts with target and scope, without broad stale banners.

### F04 — The founder-level vision implies unanswered automatic behavior still requiring permission (high)

`docs/product/foundations/vision.md` says “unanswered choices normally lead to an autonomous response” and describes leaving the character to act according to personality. However `docs/product/gameplay/time-and-autonomy.md` is explicit: no accepted execution means no fictional progress; a timed default requires prior authorization; `work/changes/archive/2026-11/experience/2026-11-13--gm-delegated-decision/CHANGE.md` is **Proposed/not Ready** with unresolved exact consent, safe fallback, pause race and 20-minute policy.

The vision can express an ambition, but that opening passage does not clearly distinguish a long-term desired autonomy product from today's *accepted rules*. `product/experience/return-and-journal.md` says the chronology includes “autonomous choices” without making their preauthorization visible. A fresh reader might believe a global automatic-decision policy already exists. **Fix by clarifying scope and accepted consent boundaries at the original product owner**, not by pretending the aspiration is wrong.

A narrower `chamber.v4` timed default fixture exists and is not equivalent to general GM07 player-consented delegation. The distinction must be explicit.

### F05 — Normative contracts still carry old source-era phase promises (high)

Several current technical documents are largely implementation-era integration contracts and historical progress records:
- `docs/technical/engine/authority-and-transitions.md` begins “Connected solo gameplay: implementation contract” with specific shipped subset and a once-nearest correction.
- `docs/technical/platform/deployment-and-compatibility.md` mixes deployment target, local setup, Chamber, first connected POC acceptance, historical release plan, QA, future K8s and implementation order.
- `docs/technical/platform/identities-and-access.md` mixes Next/React client architecture, HTTP/SSE, authentication, multiplayer product policy, return UX and media.
- `docs/technical/storyteller/context-and-memory.md` (~62 KB) includes both source-format authority, an “Agent working cycle”, memory retrieval and current limited coverage, overlapping operating-controller and cost documents.

These are not automatically bad by byte count; they **fail independent owner/revision tests when a section’s rightful owner and status is elsewhere**. Split *claims* by reasons to change, not arbitrarily by a file-size cap. Preserve precise SQL/locking/outbox/exception constraints that are still current.

### F06 — The docs homepage is better, but foundational agent instructions lag (high)

`docs/README.md` is now 2.8 KB and routes actual questions well, a genuine improvement. But:
- Root `AGENTS.md` still says the DOC01 cutover will happen and that forensic program evidence will later be moved.
- `.agents/README.md` still calls the Change path “migrating”, claims `docs/history/minutes/` will persist until P6 and labels DOC01 taxonomy advisory.
- `work/changes/README.md` calls itself a “DOC01 selection owner”, despite DOC02 complete.
- `work/designs/README.md` advertises `doc01-migration/` as active but omits the **95-file** unpromoted-design subtree and the player-replay/shared-play draft folders.
- `work/designs/open/product-open-questions.md` says “See legacy body (compatibility stub): a label of `docs/questions.md` targeting `./product-open-questions.md` (its own file)”; the link points back to **itself**, though old docs/questions was deleted.
- `.agents/HARNESS.md` has a self-referential “coding-agent target standard” link and describes W20/W21 as future despite their archive status.

A generated link checker can pass all of these because syntax-valid links and Markdown paragraphs do not establish **semantic truth**.

### F07 — The existing checkers do not cover the actual knowledge system (high)

`scripts/check_docs.py` scans root/doc/agent Markdown plus **nested README.md** in app/package/tools. It does not scan all `work/`, `evidence/` or `research/`, and it cannot flag a self-link when its destination exists. `scripts/repo-tools/knowledge-health.mjs` bans a few phrases and forbidden paths, checks duplicate blobs only inside `docs/`, and inspects six primary entrypoints. It does not inspect status contradictions, design approval state, open design expiry, `.agents` stale process claims, or identical evidence assets in multiple run folders. `repo:docs-health` focuses on Change checkpoints and shallow taxonomy.

Thus the fact they pass **does not refute** F01–F06. Add targeted checks for hard invariants, not an expensive “AI must read everything on every edit” linter.

### F08 — Evidence and research material have redundant or mismatched locations (medium/high)

- Exact blob duplicates include the OBS07 screenshot tracked in **three** paths, UX renders twice, QA-SF01 report **three** times, and S1/S2/S3 JSON trials twice.
- `research/legacy-engineering/connected-poc-proof.md` is dated proof, not research; `frontend-execution-playbook.md` is an engineer procedure/skill; `qa-journeys.md` is a QA case library. Classify rather than retaining a “legacy” generic drawer.
- `research/authored-scenarios/` (15 files / 155 KB) contains internally authored gameplay examples. Keep only useful orthogonal illustrative/benchmark examples, preferably under a clear nonnormative example/case identity; do not label them executable tests or independent research.
- `work/designs/open/legacy-initiatives-index/` is a dated classification register and a parked summary, not actively reviewed decisions. `canon-invention-policy/` is explicitly owner-retained and must survive under a correct nonterminal/parked status.

### F09 — DOC02 retrieval proof is useful but insufficient as a permanent acceptance regime (medium/high)

The DOC02 CLOSE receipt **reports** an independent fresh-chat Q01–Q18 pass. I found the author’s self-check and the close summary, but not a durable complete independent question/answer transcript or a baseline comparison in the DOC02 packet. The close explicitly says there was **no earlier fresh-chat baseline** and that the planted adversarial pack was **not run**. Therefore the pass should be reported as one **claimed independent successful session**, not verified longitudinal improvement in retrieval robustness.

Future validation must test not only whether readers can find the *right folder*, but whether an adversarially plausible obsolete document can lead them to an incorrect implementation or authorization claim. The stale SSE/Chamber status and open selected documents are precisely such counterexamples.

## 3. What has demonstrably improved

Do not repeat DOC01's verdict mechanically. DOC02:
- reduced canonical `docs/` from 114 to **74** files and removed full alias copies;
- built a direct question-oriented `docs/README.md`;
- supplied substantive Admin product contracts (not just 500-byte page shells);
- promoted the selected long-term engine and bounded Storyteller target to named technical docs;
- added accepted rationale records D-0001/D-0002;
- removed the indiscriminate 312-file DOC01 snapshot from HEAD, leaving a Git recovery manifest;
- retained terminal Change dossiers and preserved the explicit difference between selected targets and many implementation limits.

These gains are real. DOC03 must **not** replace them with another folder shuffle.

## 4. Why DOC02 nevertheless reached Done

Its acceptance gate emphasized the central `docs/` canonical file paths and removal of duplicates/essays. It did not require all *other searchable surfaces* to have correct lifecycle classification. It also allowed old process and source-adjacent maps to remain stale if the global STATUS was current. DOC02 made the norm easier to locate, but did not ensure **every first-hop or nearby document tells the same truth**. A successful one-time reader run cannot enforce future drift resistance without ownership and maintenance triggers.

The correct next program is **documentation integrity and lifecycle convergence**, not a fourth total taxonomy invention.

## 5. Audit method and limits

Read the **complete current Git tree**, current central routers, the DOC02 CLOSE/self-check/ledger introductions, current product/technical owner introductions and headings across all major domains, representative older design bodies, developer tool/source maps, key archived W/CH Changes, and documentation checker source. Used textual six-word-shingle checks on selected proposed design/canonical pairs and Git blob SHA grouping for *exact* duplicates. This is a strong **structural and diagnostic content audit**, not a false claim of paragraph-by-paragraph review of all 74+95+140 files or local test execution. The DOC03 execution plan requires deeper semantic claim review before destructive pruning.

**No local `pnpm`/Python checks ran in this assistant session**, because the connected GitHub read surface does not execute the user's checkout. Existing code/change packets corroborate specific status contradictions; they are not fresh runtime test results.

Next documents: [TARGET.md](./TARGET.md) for the independent end state, [REGISTER.md](./REGISTER.md) for complete path census, [MIGRATION.md](./MIGRATION.md) for implementation/proof, and [CHANGE.md](./CHANGE.md) for executable scope.
