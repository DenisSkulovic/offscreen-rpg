# DOC04 | Fourth independent knowledgebase audit

**Baseline:** `main@6a555604155f3765c843d57b0a2b6a7aa9a34cec` (2026-11-16). The full Git tree was retrieved and was not truncated. This is an **independent current-state judgment**, not a checklist comparison with DOC03. No live providers, local test processes, source edits or destructive operations were run by this ChatGPT audit.

## Verdict

**Keep the existing canonical domain topology. Retire the active shadow knowledgebase.** DOC01–DOC03 improved first-hop indexing, selected target promotions, and status distinctions. DOC03 preserved all historic Change packets and removed exact-blob duplicate evidence. But it mainly moved the DOC01 mixed source-program contents to a 1 MB `work/designs/parked/` collection, leaving a second searchable architecture, real broken navigation and superseded source-era status claims.

Do not repeat another mega-migration of `docs/`. Instead do **irreversible semantic consolidation** (only after no-loss review): promote unique still-selected claims; preserve actual evidence; keep named unresolved owner designs; then **delete redundant study/handoff copies from HEAD and rely on permanent Git history**. Terminal Change archive stays intact.

## Verified tree numbers

| Surface | Tracked files | Git-tree bytes | Finding |
| --- | ---: | ---: | --- |
| `docs/` | 74 | 960,703 | Good basic shape; remaining mixed-purpose ownership |
| `work/designs/open/` | 22 | 151,790 | 10 broken local link occurrences |
| `work/designs/parked/` | 96 | 1,009,621 | 79 broken local link occurrences; indiscriminate parked history |
| `evidence/inspections/doc01-retained-observations/` | 108 | 887,889 | Some genuine audits mixed with legacy documentation/procedure and old program tree |
| `evidence/runs/` | 31 | 1,800,685 | Reduced duplicates; maintain actual unique run artifacts and manifests |
| `work/sessions/` | 7 | 123,652 | Legacy minutes persist under active tree, not normative |
| `research/legacy-engineering/` | 5 | 122,480 | Legacy manuals and obsolete migration guidance |
| `research/authored-scenarios/` | 15 | 154,987 | Authored cases may be valuable benchmarks, not automatic research canon |
| `work/changes/archive/` | 158 | 1,066,861 | **Protected, permanently retain** |

**Preservation verified:** all **149** previously archived Change files from the DOC03 preimplementation baseline still exist at the exact same path and Git blob SHA. Only the nine DOC03 packet files increased the total to 158. Exact duplicated Git blob groups across HEAD fell to one irrelevant pair of 241-byte package tsconfigs; the DOC03 evidence-asset deduplication did succeed.

**Structural difference:** of the 74 canonical Markdown files, only **13** changed since pre-DOC03 revision `68736c02`; the other **61** are byte-for-byte unchanged. An unchanged document can be excellent, but that is not evidence that every mixed-owner contract was fundamentally reconsidered.

## F01 | Parked material remains a shadow bible (critical)

Under `work/designs/parked/` there are 24 Engine studies (~293 KB), 49 Experience studies (~525 KB), five Storyteller studies (~57 KB), 17 expired handoff files (~134 KB) and one attribution note. Many documents begin with a new “not canonical” banner but then continue with old **“selected replacement design”**, **“implementation program”**, **“read this first”** tables and 2026-11-13–15 status assertions. Some contain unique selected concepts; others are superseded by code/Changes/current norms, or merely historical handoff.

Examples:
- `work/designs/parked/engine-studies/README.md` still calls its implementation program the selected program, links a first Cursor handoff, and cites deleted `product/foundations/gameplay.md` and `product/storytelling` predecessors.
- `work/designs/parked/experience-studies/README.md` calls itself a “replacement product-experience specification,” continues to navigate old system/flow/space files, and links vanished `technical/client-and-identity.md` and `technical/story-lifecycle.md`.
- `work/designs/parked/storyteller-studies/README.md` still links old `product/storytelling/storyteller-settings.md` and `technical/context-and-cost.md` paths.
- `work/designs/parked/expired-handoffs/` contains standalone old “START HERE”, “FINAL-HANDOFF” and Cursor instructions **with missing trial artifacts**. These have no current execution authority and should generally be recoverable via Git, not listed in a current-work tree.
- `work/designs/parked/engine-studies/decisions/eng05-shared-cas-contract.md` still says **“No code authorized”** while current `STATUS.md` and source describe landed S3 adapter. The banner does not make that claim current.

**Decision:** This isn't an appropriate general-purpose permanent archive. Unlike the explicitly protected completed Change packets, these studies do not all deserve indefinite searchable HEAD residency. For each unique clause prove canonical promotion, genuinely unresolved decision, original evidence owner, or Git-only retirement, then eliminate the generic parked trees. Retain a *few* actual owner-protected dormant topical studies if independently valuable, with named question/owner/review condition, not 96 files by default.

## F02 | Known broken active and parked navigation (high)

Performed deterministic local Markdown `[label](relative-path)` destination checks on **all 96 parked Markdown files and all 22 active open design Markdown files** against the full Git tree. **89 missing-path occurrences**: 79 in parked, **10 in open**. This test checks whether the linked *file/directory* exists; it does not certify anchors, remote URLs or contextual accuracy. The reported instances are genuine plain relative-path failures, not merely a missing anchor.

Concrete examples:
- `work/designs/open/product-open-questions.md` has **three** broken links, including the accepted time rule and both GM03/GM07 Change packets. Relative `../../docs/... ` resolves incorrectly to `work/docs/...`; `../changes/open/...` resolves to `work/designs/changes/...`.
- `work/designs/open/free-intent/free-intent-future.md` points to old `product/journeys/player-experience.md` and `product/foundations/gameplay.md`.
- `work/designs/open/player-replay/player-replay-experience-v1.md` still links `../experience/README.md`, which does not exist.
- The parked Engine/Experience/Storyteller readme maps and old forensic handoffs contain dozens more bad paths. A historical file moved to a different folder cannot retain context-dependent relative links and remain a functioning navigation map.

Across the **74 canonical docs files**, I found no ordinary missing relative-file destination with the same test. One game-specific `thread:the-warning` target appears in `storyteller/context-and-memory.md`; this is a custom inline reference, not proof of a missing Markdown file. This difference is important: **canonical path integrity is improving; active and parked knowledge remains broken**.

The existing `scripts/check_docs.py` checks current docs/agent/specified README paths but not the **entire active work/designs tree**. DOC03's knowledge-health checks did not make these 10 open design failures visible. “0 documentation problems” was therefore only true for its restricted scan.

## F03 | Source of current technical authority is still inconsistent (high)

`docs/technical/platform/identities-and-access.md` still says the **“binding implementation design”** for React/Next F1–F15 is a dated file under `evidence/inspections/doc01-retained-observations/engineering/targets/react-next.md`. The current selected canonical owner is `docs/technical/client/architecture.md`. An historical evidence file must not be an authoritative target merely because it once carried the complete design.

The same technical page is titled **“Frontend, identity and shared play”** and has top-level sections for React, UI state, authentication, SSE, multiplayer product policy, returning to story, and scene media. These have several different owners/revision triggers. DOC03 corrected the SSE status sentence but did **not** reassign the conflicting sections.

`docs/technical/platform/deployment-and-compatibility.md` still owns local setup, the Chamber, first POC play, portfolio release, hosted deploy, Kubernetes, observability, testing and implementation order. `docs/technical/storyteller/context-and-memory.md` (~62 KB) includes an agent working cycle and publication design overlapping controller, source context and cost owners; `request-context-and-cost.md` (~51.6 KB) also covers retrieval, rounds and caches. Large files may be correct, but **one edited concept must not require synchronized rewrites of multiple normative descriptions**. That boundary test was not completed by DOC03.

The canonical documents remain substantive, not uniformly junk; this is a specific failure of question/authority ownership. Do not mass-split on a byte threshold. Transfer only responsibilities that have a distinct owner and maintenance trigger, preserving exact technical negative cases.

## F04 | “Legacy research” still lies about migration state (high)

`research/engineering-manuals.md` says soft-retired files remain under `docs/engineering/` **“until P6 hard delete”**, even though `docs/engineering/` was deleted in DOC01. `research/legacy-engineering/README.md` labels its contents **“RETAIN copy”** and DOC01 G5. These are *current tracked navigational documents*, not preserved immutable Change packets. Their underlying files mix old playbooks, dated POC proof, QA journeys and memory technique, and should be classified by current reusable value before redundant copies are removed.

`evidence/inspections/doc01-retained-observations/README.md` still says it contains dated handoffs, even though DOC03 relocated many to `work/designs/parked/expired-handoffs/`. The evidence tree remains a source-era `programs/` hierarchy with 108 files rather than a tight set of dated actual observations.

`work/sessions/` has 123.7 KB of old minutes despite its own README calling the directory short-lived continuity. The owner may choose a limited history retention policy; simply labeling old minutes “legacy” is not a rationale for keeping them in the always-searched working tree indefinitely.

## F05 | Canonical technical body contains malformed literal markup (medium)

`docs/technical/lab/experiment-protocol.md` contains **212 literal `§` characters** used as fake code delimiters (e.g. `§packages/contracts/src/chamber-lab.ts§`), rather than Markdown backticks. That is a real documentation readability/rendering defect. It survived DOC01–03 and is not covered by the successful link checks. Repairing it is a small focused task, but its persistence shows why file paths alone are not sufficient quality proof.

## F06 | One-time retrieval success is not an auditable knowledge-quality regime (medium)

DOC03's `CLOSE.md` **reports** an independent 20-question session and five adversarial sentences passing, with no baseline comparison. It does not contain the full independent questions-and-answers transcript, per-question source routes, wrong-detour counts, tool calls or actual measures. The receipt explicitly says `pnpm repo:brief` and `pnpm repo:docs-health` were **not re-run at close**. Do not falsely infer that the claimed pass proves semantic completeness or future drift resistance.

A fresh-chat test is useful; it is not a substitute for a reproducible durable audit that another reader can challenge. The 10 active design link defects and the evidence-as-binding-authority sentence demonstrate this gap.

## Preserve genuine DOC03 improvements

- Current source/status distinction is clearer in `STATUS.md` (although source-inspected claims remain dated).
- `AGENTS.md`, main .agents entry and the Chamber source map no longer advertise the pre-cutover future.
- Actual target definitions were promoted for selected presentation language, prompt/tool contract, world-neutral kernel and S3/CAS design.
- Canonical docs paths resolve and the overall folder structure has independent subject justification.
- Full completed Change archive preserved, exactly.
- Evidence blob duplicates cleaned up.
- Open design grouping for time/standing life, shared play and player replay is better than the old mixed DOC01 attic.

**Do not rewrite those good parts just to produce a fourth DOC architecture.**

## Audit scope honesty

All Git-tracked path names and sizes were enumerated; all **118 open/parked design Markdown files** were scanned for local path existence; all **74 canonical docs files** were inspected for local path targets, and selected normative/source documents were read for headings/body contradictions. Baseline-to-current blob changes, archive integrity and exact-blob duplicates were calculated from actual Git tree SHAs. This was not a full paragraph-by-paragraph review of all 74+118+108 document bodies and no local tests or independent fresh-chat sessions were run in this audit. The implementation must do section-level preservation checks before removal.

**Next:** [CHANGE.md](CHANGE.md) (limited corrective scope), [VERIFICATION.md](VERIFICATION.md) (falsifiable closure). Do not create another universal `docs/programs` tree or a DOC04 “legacy snapshot.”
