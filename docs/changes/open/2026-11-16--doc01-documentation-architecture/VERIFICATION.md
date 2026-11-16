# DOC01 | Acceptance, regression and falsification protocol

**Scope:** verify that the documentation system became a reliable source of truth and cheaper to navigate, not merely a prettier set of paths. Baseline `main@8cec56e`, 2026-11-16. Run this after Cursor implements [MIGRATION.md](MIGRATION.md). No paid provider calls are required or authorized.

## A. Documentary completeness and preservation: hard gate

| Test | Acceptance | Failure / negative case |
| --- | --- | --- |
| A1 Full file accounting | All **483 baseline files** and any intervening upstream additions have one resolved disposition and Git ref | A removed file with unreviewed heading or unknown owner fails |
| A2 Section-atom coverage | Every unique substantive claim/decision/constraint from old normative docs is mapped to a new section, retained draft, dated evidence, or explicitly justified retirement | Whole-file “moved” record without a section-level map fails |
| A3 Product approval | No unapproved proposal is worded as an accepted rule; product-relevant owner constraints preserved | Proposed payment/refund, access, multiplayer or Storyteller autonomy behavior silently becomes mandatory |
| A4 Technical fidelity | Deterministic authority, time/retries, spend/dispatch, staff grants, privacy, evidence lineage and version compatibility constraints survive | Removing an ENG03 race negative test as “redundant” when no equivalent exists |
| A5 Documentation evidence honesty | Tested/observed assertions name exact dated source SHA/environment/proof; untested targets are labeled proposed/selected | “All Admin Support grants exist” inferred from synthetic OBS06/07 fixture fails |
| A6 Legal/owner-retained content | NOTICE attribution and dormant canon-invention policy preserved with clear status | Both disappear during history cleanup |
| A7 Non-doc assets | All three baseline PNGs and three JSON files reviewed for consumers, privacy and retention before delete/move; retained files have link/hash manifest | Blind `rm -rf docs/programs/observability/evidence` fails |

**Required receipt:** final manifest counts by PROMOTE / MERGE / DECISION / DRAFT / EVIDENCE / PROCEDURE / DROP, with source blob SHA and target heading or Git recovery pointer. Every exception explicitly approved. Zero “TBD” dispositions after terminal completion.

## B. Unique authority and cross-domain reconciliation: hard gate

The following topics must each have exactly **one accepted product owner** (where a product promise exists), exactly **one technical invariant owner** (where an implementation guarantee exists), and evidence in its separate class:

1. Accepted action versus inspect/propose; time advance and clock authorization.
2. Background activities, interrupted work, explicit/consented autonomy and default decisions.
3. Mechanical world authority versus Storyteller proposals and narrative output.
4. Canonical documents, source versions, memory retrieval and committed consequence.
5. Provider authorization, model dispatch, exact packet, charging and retries.
6. User sessions versus staff principals, grants, case scope and impersonation boundaries.
7. Player return and journal, story replay, staff forensic investigation and protected content.
8. Client state/caching/hydration, presentation projection and UI choice semantics.
9. Chamber experiment validity versus player gameplay proof.
10. Data retention, staff investigation access and deletion/privacy behavior.
11. Game release/model/prompt evolution and historical evidence reconstruction.
12. Current implementation status/roadmap versus future architecture target.

For each topic, reviewer must inspect the new owning headings, their old competing sources, the most important negative case, and the link from adjacent documents. The link should route to authority; it should not copy the same detailed normative paragraph.

**Named baseline status contradictions to close:** engine README ENG01 and ENG03-narrow historical banners, ENG03-narrow design implementation banner, presentation-runtime PX banner, AGENTS forensic handoff placement. A correction needs source verification if it states what is actually implemented.

## C. Taxonomy and maintenance: hard gate

- `docs/` contains only `README.md`, `product/`, `technical/`, `decisions/`, and `runbooks/` (plus narrowly justified root content approved during migration). No `docs/programs/`, `docs/engineering/`, `docs/history/`, `docs/changes/`, `docs/operations/`, `docs/questions.md`, `docs/progress.md`.
- No `handoff/`, `audits/`, `evidence/`, `evaluations/`, `minutes/`, `archive/`, `CHECKPOINT.md`, `RUN-LOG.md` as *maintained canonical doc paths*. A valid source text can mention old folders in a historical/provenance link outside the canonical tree.
- Each remaining folder passes D1–D5 proof in TARGET. In particular each second-level topical folder has a named independent subject and a query that routes uniquely through it.
- `work/changes/open/` has only nonterminal packets; terminal history is compact ledger + Git pointers, not another 111-file archive.
- `work/designs/open/` only holds actual not-yet-accepted investigations with closure owner/gate. Session notes are short-lived and have promotion/expiry rule.
- `research/` content is explicitly nonnormative with source/refresh date; `.agents/` contains developer-agent operating rules; Storyteller runtime instructions belong in `technical/storyteller/`.
- Router READMEs don't duplicate technical/product text or maintain their own status chronologies. `ROADMAP.md`, `STATUS.md` and `work/changes/README.md` have distinct, nonduplicating questions and owners.

Do not set an arbitrary universal maximum file length or folder count. **Required**: demonstrate real reduction in mixed-lifecycle content and duplicated authority. If canonical `docs/` remains hundreds of files long or replaces `programs/` with five similarly mixed “domains”, an independent reviewer must explicitly reject the migration unless every retained file passes the unique-owner test.

## D. Syntax, executable tooling and negative tests: hard gate

Run locally in a disposable environment; save exact commands, exit codes, relevant stderr, SHA and any skipped reason. Suggested commands (adapt to existing package/OS scripts; do not claim they ran unless they did):

```bash
git status --short
git ls-files docs work evidence research
python scripts/check_docs.py
pnpm repo:brief
pnpm repo:docs-health
node scripts/repo-tools/archive-changes.mjs --dry-run
git grep -nE 'docs/(programs|engineering|history|changes|operations)/|docs/(progress|questions)\.md' -- '*.md' '*.mdc' '*.mjs' '*.py' '*.json'
git diff --check
```

Interpret `git grep` hits; historical references in evidence/dossiers are allowed if intentionally non-executable, but no live loader, AGENTS startup, source README, index or current Change authority may route to removed paths. Re-run heading-anchor validation, not just file-existence checks. Validate Markdown reference-style links, inline links with fragments, image links and paths from source-adjacent README files.

**Negative tests for new structural rule:** temporarily create (on a disposable branch/fixture) `docs/handoff/temp.md` and `docs/programs/README.md`; `repo:docs-health` or its new taxonomy companion must flag both. A valid new product or technical owner must not be flagged. Restore clean tree after each negative. Test `repo:brief` with (1) a selected active Change, and (2) `Current change: none`; do not coerce the existing selected packet to none merely to pass.

**Change archiver:** dry-run closing one disposable copied terminal packet; verify its entry lands in the monthly ledger and its original full dossier does not remain active. Verify no original source branch data is lost and no unrelated package code is changed. Do not run an apply mode on real packets until the review is complete.

## E. Cold-reader retrieval benchmark: paired before/after test

The design is false if it reduces file count but causes agents to find the wrong norm. Test on pinned old and new branches, using a fresh, independent agent context or a human with no preloaded map. No need for a paid model: record honest observed results if a local or owner-authorized tool is used. Each question must be answered with an **exact authoritative heading** and explicit evidence status, without opening a random past handoff.

| # | Question | Expected owner route |
| --- | --- | --- |
| Q01 | When does fictional time advance, and what if no action was accepted? | Product gameplay/time → technical engine/chronology |
| Q02 | Can an in-game model directly authorize item loss/transfer? | Product gameplay + Storyteller limits → technical engine authority |
| Q03 | What should “since last visit” show after interrupted work? | Product experience/return → client integration as needed |
| Q04 | How is a long-term quiet commitment represented without inventing time? | Product gameplay/time → engine activities |
| Q05 | How does a bounded Storyteller decide to request another evidence read? | Product Storyteller quality → technical Storyteller controller |
| Q06 | Where does exact model dispatch authorization and charging live? | Technical platform spending + technical Storyteller/provider |
| Q07 | What happens when a provider task retries after a saved output? | Technical Storyteller publication + platform execution |
| Q08 | May a Support worker inspect an unrelated player's raw narrative? | Product Admin governance → technical Admin/obs access |
| Q09 | How can a player review history without receiving developer forensic data? | Product experience/replay → technical observability |
| Q10 | Where is the React/Next SSR, caching and hydration target? | Technical client architecture + state/server contract |
| Q11 | How should a developer run a reproducible Chamber fault experiment? | Technical lab + runbooks/verification + actual tests |
| Q12 | What is the current ENG03/full short-lock status, and what was actually proven? | STATUS → work/changes → dated evidence; NOT technical target alone |
| Q13 | Can the Admin issue a production Support case grant today? | Product Admin policy → STATUS/evidence → technical Admin limitations |
| Q14 | Why was modular monolith selected instead of event-sourced microservices? | Relevant accepted decision record → technical engine/platform |
| Q15 | How do I know what Cursor is authorized to implement next? | work/changes selection → AGENTS, not an old handoff |
| Q16 | Where is the owner-retained unfinished canon-invention policy? | work/designs/open with no implementation permission |
| Q17 | Which acceptance story covers a nonhuman or unconventional world? | Product gameplay acceptance scenarios / actual tests |
| Q18 | Where are development-agent token-economics rules vs in-game Storyteller model budget? | .agents (development) versus technical Storyteller/platform (runtime) |

For **each** Q: score (a) correct owner, (b) correct normative answer, (c) correct uncertainty/proof class, (d) wrong-source detours, (e) number of substantive documents opened, (f) navigation hops, (g) model token cost *only if measured*. Critical authority/permission questions must have **zero wrong answers**. Target at most **two routing hops** to an exact authoritative section, and preferably one substantive owner read, unless cross-domain behavior genuinely requires two. Retain before/after per-question data; do not invent “70% faster” or other numerical gains.

**Adversarial test:** present Q08, Q12 and Q13 to a reader who sees an old synthetic test report first. They must not infer a production grant or complete short-lock rewrite. The new hierarchy should prevent that error with clearer authority and evidence boundaries.

## F. Delivery and review gates

| Gate | Who/what verifies | Success |
| --- | --- | --- |
| G0 Baseline | Cursor + git | Clean and pinned inputs; known drift/active work preserved |
| G1 Inventory | Cursor + independent spot-check | 483+ file routes, every meaningful claim classified, no silent unapproved promotion |
| G2 Product canon | Owner/independent spec reviewer | Unique accepted product claims, explicit unresolved choices |
| G3 Technical canon | Architecture reviewer | Unique technical owners, failure and negative cases preserved |
| G4 Historical/evidence separation | Reviewer | Reproducibility, retention and legal/owner-retained data protected |
| G5 Tool cutover | Deterministic checks | Correct loaders, paths, current queue, references and negative tests |
| G6 Retrieval benchmark | Independent fresh reader | No critical wrong answers; routing improvement measured |
| G7 Cleanup | Cursor + owner review | Old mixed tree removed; receipt written; DOC01 closed correctly |

**If any gate fails**, keep the corresponding old material in the isolated branch, record a blocker or competing interpretation, and stop before destructive cleanup. “The link checker passed” is only one condition. An abandoned unique decision is a failure even if every Markdown URL resolves.

## Final result format

Cursor must deliver: current commit/branch, before/after counts and bytes by location and class (not as the sole success metric), a short map of new canonical owners, examples of at least five **real semantic merges** and five old temporary artifacts retired, the resolved contradiction ledger, commands/results and negative tests, cold-reader comparison, protected unresolved gates, and one compact terminal DOC01 ledger record with source/target SHAs and no paid-spend claim if none occurred.

This evidence is the definition of “properly finished”. A new directory tree with many moved files but no semantic reconciliation **fails DOC01**.
