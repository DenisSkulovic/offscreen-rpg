# DOC04 | Retire shadow knowledge and converge real authority

**Status:** Proposed. **Audit and bounded design prepared; NOT selected or implemented.**  
**Audited HEAD:** `main@6a555604155f3765c843d57b0a2b6a7aa9a34cec`, 2026-11-16.  
**Kind:** documentation and knowledge-health repair, not product or runtime development.  
**Owner decision still required:** whether to execute DOC04 as the selected Change; no other Change is selected.  
**Protected:** the **complete `work/changes/archive/`** with all original paths/bytes, including DOC01–DOC03.

## Decision, in one screen

**Stop rebuilding folder structures.** The canonical `docs/` hierarchy is adequate. What remains wrong is the simultaneous existence of (1) old pseudo-authoritative studies and one-time handoffs in HEAD; (2) current active designs with broken references; (3) historical evidence presented as binding technical design; (4) a few technically mixed normative documents. DOC03 solved several problems but parked ~1 MB of mixed old studies instead of completing no-loss content reconciliation.

**End state:** one current product norm, one selected technical authority, one dated capability/evidence path, one named unapproved design gate, and one permanent completed Change archive. No generic DOC01/DOC03/legacy subtrees promoted to active knowledge. Historical preliminary program drafts normally recoverable by Git, not HEAD. A fresh ChatGPT should never land on a parked old program specification unless explicitly investigating its history.

Read [AUDIT.md](AUDIT.md) for independent evidence and counts, then [VERIFICATION.md](VERIFICATION.md) for hard acceptance gates.

## Scope and execution, after owner selection

**D0: Pin and classify.** Record current HEAD, preserve concurrent changes, run baseline docs checks, and generate an explicit **content-unit inventory** for all 96 baseline parked design documents, 22 open design documents, 108 retained-observation files, 5 legacy-engineering items, 7 session files and important canonical cross-links. Do not copy entire retired docs into a new DOC04 Change packet. Inventory cells: source path/blob SHA/heading, unique substantive claim and counterexample, approval versus observed status, current canonical owner or open gate or evidence proof or Git-only rationale, incoming consumers and reviewer. Record terminal Change archive SHAs as protected.

**D1: First protect legitimate current product/technical content.** Read from approved end-state product and technical docs **first**. Compare every old study containing “selected/accepted/recommended architecture” to the actual owner. Promote only *unique* selected mechanics, reliability negatives and options. A selected but not implemented feature remains a selected target, not silently accepted gameplay. Actual unsettled standing life, group time, canon invention, free intent, prediction fences and player replay remain topic-named proposals. No new rights, rules, model spending, or architecture choices invented during cleanup.

**D2: Retire the generic parked studies and expired handoffs.** The 24-file Engine, 49-file Experience and five-file Storyteller parked studies are not automatically exempt from deletion simply because DOC03 added noncanonical banners. Reconcile all headings; remove redundant copies from HEAD once their useful selected claims reside in `docs/`, unresolved work has a named open/parked topic, and historical provenance is recoverable through the original Git commit or preserved completed Changes. Expired `work/designs/parked/expired-handoffs/` files should normally be **Git-only**, with a one-line history index if genuine external crossreferences require it. Never put old Handoff/FINAL-HANDOFF under `evidence` as a substitute. **No new generic parked-studies directory.**

**D3: Fix active unresolved-design navigation.** Repair all 10 observed broken local links in `work/designs/open/` (including `product-open-questions.md`, `free-intent-future.md`, `player-replay-experience-v1.md`, `decision-delegation.md`, `time-and-truth.md`, and `vision-reconciliation.md`). Review all 22 open files for redundant essays, superseded instructions and genuine owner decisions. A real proposal needs a decisive question, current accepted baseline, ranked alternatives/tradeoffs, owner/gate, and precise evidence needed; merge closely overlapping plans where they do not have independent update triggers.

**D4: Eliminate the remaining false authority and mixed-domain seams.** `docs/technical/platform/identities-and-access.md` must not name `evidence/inspections/.../targets/react-next.md` as the binding F1–F15 implementation design; route to `docs/technical/client/architecture.md`. Review React/SSR/Query/SSE/shared-play/return/media sections against current real client/product owners; promote *unique* rules then remove duplicated platform authority. Similarly review `platform/deployment-and-compatibility.md` with Lab/runbooks/STATUS/evidence, and `storyteller/context-and-memory.md` with controller and request-context-and-cost owners. **Do not split by arbitrary file size; split/merge only independent responsibility and revision trigger.** Correct lingering status/proof claims rather than converting selected future to current implementation.

**D5: Garden research, observations and sessions.** Clean `research/engineering-manuals.md` and `research/legacy-engineering/` stale “DOC01 G5 retained until P6” wording, classify retained manual contents: one maintained expert reference, reusable procedure, dated actual run/audit, or Git-only duplicate. Resolve the 108-file `evidence/inspections/doc01-retained-observations/` source-era tree into dated meaningful evidence, with no invented result and no second historical spec archive. `work/sessions/legacy-minutes/` should be evaluated for conversation-only material versus unique decisions; promote durable owner choices, keep brief continuity policy, retire redundancy to Git while respecting actual owner-retained material. Authored scenarios should stay only if they provide independent reusable narrative acceptance cases or tests.

**D6: Fix presentation of the docs themselves.** Replace the **212 malformed `§` pseudo-code delimiter characters** in `docs/technical/lab/experiment-protocol.md` with valid Markdown formatting after checking actual code examples. Do not blindly replace mathematical/legal § uses elsewhere. Validate cross-link anchors after moving selected headings. Remove stale historical “until P6” claims on active research routers and false “program” first-read recommendations.

**D7: Strengthen the right verification boundary.** Existing checker covers `docs/` but misses `work/designs/open/`. Add deterministic local relative-path + heading verification for **maintained active designs and their actual immediate indexes**, plus historical content checks scoped narrowly enough not to rewrite completed Change archive. Identify and report parked material left by explicit owner exception; do not demand broken historical links be rewritten before deleting those historical copies. Detect custom URL schemes and nested parentheses correctly, and do not mistake `thread:the-warning` for a missing file. Negative fixtures must fail three currently broken links in `work/designs/open/product-open-questions.md` and a false `evidence/` technical-owner declaration. A green link checker must not be sold as proof of semantic completeness.

**D8: Independent acceptance and archive.** Run [VERIFICATION.md](VERIFICATION.md) questions in a new reader context and report **real answers/citations and status**, not only “20/20 passed.” Compare before/after navigation failures with measured data, including an adversarial old parked spec. Capture exact checked tree SHA, tests and exit codes; make all claims no stronger than source evidence. Recheck full completed Change archive SHA invariance and add the new DOC04 packet to it only after the gates pass.

## Explicit exclusions and guardrails

- **No runtime/gameplay/frontend/backend source edits** to make documentation correct; code discrepancies become separately scoped future Changes.
- No paid providers, secret access, production requests, cloud deployments, non-disposable databases, destructive trials, new spending policy, new permissions, owner-unapproved product choices or speculative runtime proofs.
- Do not delete any unique accepted design claim, real experiment needed for reproducing a failure, attribution/legal notice, owner-protected dormant canon-invention, source-proven pending Change, or the terminal Change archive.
- Do not keep a known redundant 50 KB essay or expired Cursor handoff just because it feels safer. Git version history is the normal archive for abandoned preimplementation artifacts. The owner deliberately protects **completed Change packets**, not every intermediate historical document.
- Do not silently alter old archived Change content to repair its references; those are dated records at their original commit.
- Work on an isolated branch; do not override another Cursor session. Keep `work/changes/README.md` Current change = none until owner selects DOC04.

## Why this is not DOC01–DOC03 all over again

DOC01 invented the shape. DOC02 moved selected authority. DOC03 corrected key status and moved mixed old content. **DOC04 is a deletion-and-fidelity pass with no taxonomy innovation allowed.** Success means obsolete material actually disappears from the active tree without loss of selected meaning, and every active route tells the right story. A 96-file “parked” box with one disclaimer per file **fails**.

If complete claim reconciliation cannot be demonstrated, keep DOC04 **Blocked**, don't mark it Done with a “Git preserves everything” waiver. Where a particular disputed product decision needs the owner, create one precise gate; don't hold the entire cleanup hostage to approving a new mechanic.

## Copyable Cursor handoff after owner approval

> Implement DOC04 from `work/changes/open/2026-11-16--doc04-shadow-knowledge-retirement/CHANGE.md` against fresh `main`. This is **not another documentation rearrangement**. Preserve all completed Change packets. Reconcile unique selected clauses and negative cases before deleting redundant parked Engine/Experience/Storyteller studies and old handoffs from HEAD. Repair the 10 broken links in active designs, eliminate the evidence-as-binding React target, clean outdated research/legacy and session material, and correct genuinely mixed normative owners without mechanical splits. Add active work/designs link verification and adversarial fresh-reader answers. No runtime code, provider, deploy or unapproved policy changes. Do not close DOC04 unless the old shadow bible is substantively retired, not moved again.
