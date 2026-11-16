# DOC01 | Executable semantic migration plan for Cursor

**Design-only at handoff.** This is a sequenced *implementation procedure*, not current authorization to execute it. Once the owner selects DOC01, Cursor should perform the work in its local checkout on an isolated branch with frequent checkpoints, not by blindly moving the existing 483 files. Source evidence: [audit](AUDIT-BASELINE.md), full [directory register](DIRECTORY-REGISTER.md), full [file register](FILE-DISPOSITION.md), target [architecture](TARGET-ARCHITECTURE.md), and [acceptance](VERIFICATION.md).

## P0. Baseline and safety fence (no mutation)

1. Capture `git status --short`, `git rev-parse HEAD`, `git ls-files docs`, and a tree-size/path summary. Compare with the 2026-11-16 baseline. Cursor's checkout may have advanced since `8cec56e`; **diff the intervening commits** and add every new/removed/renamed document to the migration manifest.
2. Read `AGENTS.md`, `.agents/rules/documentation.md`, `.agents/references/documentation-navigation-standard.md`, this packet, and code-path references identified below; do **not** load 483 whole Markdown bodies into one LLM context. Use a programmatic manifest and progressive section reads.
3. Check other local work with `git status`. Do not overwrite, reset or cherry-pick other contributors' uncommitted documentation.
4. Create `docs/doc01-architecture` branch from the chosen baseline (name illustrative), or use another isolated review branch. Keep `main` safe until the complete link/path switch is reviewed.
5. Run existing checks **before migration**, recording actual outcomes and known failures, especially `python scripts/check_docs.py`, `pnpm repo:brief`, `pnpm repo:docs-health`. Do not call providers, deploy or reset non-disposable data.
6. Decide which evidence assets are sensitive. No raw user text, secrets, provider payload or private narrative moves into public documentation. Check `.gitignore` and reproducibility requirements before retaining/reuploading binary data.

**Exit:** pinned new SHA, change diff, tooling baseline, no unexplained dirty worktree, complete updated file list.

## P1. Content-atom and dependency inventory (read-only first)

**Nonoptional:** produce a temporary structured table (e.g. `work/designs/open/doc01-migration/atoms.csv` or JSONL) with **one row per substantive section/claim**, not merely one row per file. Required fields:

```text
source_path; source_blob_sha; heading_anchor; question_answered;
kind(product|technical|decision|draft|evidence|procedure|example|transient);
approval(accepted|selected|proposed|blocked|rejected|unknown);
implementation_claim(designed|inspected|fixture|live|human|none);
claim_or_invariant; candidate_owner; disposition;
target_path; target_heading; competing_sources; incoming_links;
unique_fact_preserved(true|false); evidence_ref; reviewer; resolved
```

1. Begin with [FILE-DISPOSITION.md](FILE-DISPOSITION.md); every 483 baseline files **plus** newly added upstream files must receive a file-level disposition. Do not mark a file resolved if one meaningful section remains unmapped.
2. Inventory headings for every Markdown file. For each, assign its *claims*: product requirement, technical guarantee, selected ADR rationale, deferred proposal, proof, operating procedure, example, or temporary narrative. `README` routers can be classified whole where they contain no unique decisions.
3. Build a semantic ownership matrix for all cross-cutting subjects: time, player actions, world rules, canonical files, memory, Storyteller tool loop, dispatch/spending, UI decision semantics, identity/grants, Admin cases, forensic evidence, replay, Chamber, and React/Next state. Every requirement gets **one** future owner and references all currently competing sections.
4. Use similarity methods (heading/bigram/embedding if locally available) **only to flag possible overlap**. A hash/similarity match is not proof of semantic identity. Verify key exceptions, negative cases, approval state, implementation status and exact numbers manually before collapsing.
5. Produce an explicit conflict ledger. At minimum investigate: `programs/engine/README.md` vs `programs/engine/decisions/eng03-narrow-capture-v1.md`; engine README top vs its ENG01 final sentence; the player presentation runtime's historical implementation warning vs PX status; old Admin source baseline vs actual AD code; `programs/observability/technical/` vs Staff/Engine/Storyteller technical owners.
6. Mark `docs/history/initiatives/2026-09-24--01-30--canon-invention-policy` as **explicit owner-retained dormant design**. Move to `work/designs/open/` with clear scope and no false approval. Preserve the fact of owner retention; do not silently discard it.
7. Classify all three PNGs and all three JSON trial files: executable fixture, visual snapshot, audit illustration, unique reproduction payload, or disposable artifact. Capture hashes and consumer references; use `tests/` or `evidence/` when retention warranted.
8. Capture inbound and outbound Markdown links and text-path mentions, including `AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.agents/`, `apps/`, `packages/`, `tools/`, `scripts/`, GitHub templates and release/docs checks. Static path literals in code are part of migration scope.

**Exit:** zero unassigned baseline paths, zero unidentified important sections, resolved or explicitly owner-gated source conflicts, incoming-link graph, evidence disposition and retention choices. **If approval is unknown, keep the claim as draft**, not a normative requirement.

## P2. Rewrite the permanent product bible FIRST

Build the target `docs/product/` from accepted intent, with substantive consolidation. Use its existing approved product promises as the starting authority. Do not perform a folder-for-folder copy of programs.

| Target owner | Source areas to reconcile | Mandatory distinction |
| --- | --- | --- |
| `foundations/vision.md`, `concepts.md` | existing `product/foundations`, experience thesis/platform ecosystem, Admin charter only when truly universal | Universal game/platform promise vs domain-specific staff features |
| `gameplay/rules.md`, `actions-and-commitments.md` | existing `product/foundations/{gameplay,game-rules}`, `product/journeys/time-and-autonomy`, experience mechanics patterns, engine product-derived requirements | Accepted game mechanics vs proposed future GM07/standing-life policy |
| `gameplay/time-and-autonomy.md`, `continuity.md`, `worlds-and-characters.md` | product time/continuity, `programs/experience/{patterns,foundations}`, engine world design | What should happen vs SQL/Temporal sequencing |
| `experience/principles.md`, `entry-and-onboarding.md` | product player journeys, `programs/experience/{foundations,flows,spaces}`, platform portal/home documents | Player journey contract vs code layout |
| `experience/play-and-decisions.md`, `return-and-journal.md` | experience flows/patterns/Now/Journal, product player experience, continuity | Unified player scenarios; do not keep three alternative “return” documents |
| `experience/navigation-and-stories.md`, `settings-and-accessibility.md`, `presentation.md`, `collaboration.md` | experience spaces/system/flows, notification/settings product intent | Visual/interaction promise vs presentation renderer engineering |
| `experience/replay.md` | obs `player-replay-experience-v1.md`, player history and journal | Player-authored/safe history vs staff forensic raw access |
| `storyteller/behavior-and-quality.md`, `profiles-and-settings.md`, `memory-and-continuity.md` | existing product storytelling + `programs/storyteller/vision-and-quality-constitution.md`, experience quality requirements | Narrative outcomes vs model controller technology |
| `admin/` eight proposed owners | `programs/admin/` product documents and OBS staff-facing product vision | Accepted staff goals vs unapproved financial/privacy/production grant powers |

**Rules:** preserve all owner-accepted negative constraints, safety limits, agency/time rules, error states, and illustrative normal+negative acceptance cases. Merge documents that answer the same question with the same approval/revision owner. Keep *unsettled* commercial, staff access, multi-user, model-spend or risky automation policy explicitly proposed in `work/designs/`, not made normative by rephrasing.

The existing `programs/experience/flows`, `patterns`, `spaces` and `system` directories are **formats from design process**, not the future UX navigation taxonomy. Recompose by user need: entering, choosing, being absent, returning, reading, administering a life. The target may be a different number of files than the examples in TARGET if atom analysis warrants it; justify every departure.

**Exit:** one approved product owner per normative behavior; conflicts surfaced for owner decision, not guessed; stable heading link map. Product docs may explicitly state a selected future target, but should not carry yesterday's Done packet list.

## P3. Rewrite technical contracts SECOND (not from current source alone)

Promote/reconcile technical behavior under `docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/`. The existing `docs/technical` files do not automatically win against selected newer designs. For each conflict, compare acceptance state, implementation truth and source invariants, then ratify the single contract.

| Target technical owner | Sources and required work |
| --- | --- |
| `platform/` | `technical/{architecture,data,execution,client-and-identity,persistence-and-caching,delivery-and-validation,usage-policy}` split by shared responsibility; authentication and usage entitlement must not be silently assigned to Admin or Storyteller alone |
| `engine/` | `technical/{rules-and-activities,solo-gameplay-contract,story-lifecycle,committed-time,ticks-and-tags,calendars-and-world-time}`, `programs/engine` target/decisions, ENG03 capture/CAS/Temporal contracts. Keep transactional, idempotent and source-version negatives intact |
| `storyteller/` | `technical/{storyteller-runtime,canonical-files,context-and-cost,story-settings,provider-dispatch-review}`, `programs/storyteller` agent loop/context/tools and OBS prompt provenance. Do not turn rejected/unproven tools into implemented capabilities |
| `client/` | `engineering/targets/react-next.md`, `programs/experience/system`, player-facing client portions of `technical/client-and-identity.md`, source-adjacent web maps. Keep React/Next technical destination independent of current vibecoded frontend |
| `admin/` | `programs/admin/technical` target contracts and selected OBS case-read/security rules. Separate staff permission grants from gameplay authorization; include production-grant limitation honestly |
| `observability/` | `programs/observability/technical` 20 docs plus cross-engine/Storyteller provenance owners. Consolidate by durable evidence identity, capture, read/reconstruction, access/retention and telemetry; preserve exact failure/causal semantics |
| `lab/` | `engineering/targets/chamber-laboratory.md`, `technical/chamber-lab-protocol.md` and Chamber source maps; reusable developer experiment contract, not a game product promise |

Where a current target is not accepted or remains conditional, leave it in `work/designs/open` with a clear link and decision owner rather than fabricating product sign-off. Where code evidence reveals a difference from accepted specs, **report drift** and issue/change selection, not rewriting authority to match code.

**Exit:** every technical invariant has one owner and direct product dependency; every old normative section mapped; no “postwave no code authorized” banner masquerading as present-state summary; no invented general runtime proof.

## P4. Decision records, evidence and procedures

1. **Decision records:** create stable `D-0001--slug.md` only for consequential *accepted* choices and nontrivial alternatives. State date, acceptance/owner, chosen approach, rejected serious alternatives, constraints, revisit trigger, supersedes, and permanent norm link. The ADR is rationale, not a competing specification. Consolidate e.g. selected ENG03/05/06, staff grant policy, UX interaction choices **where owner approval is evidenced**.
2. **Open designs:** retain unresolved Admin capability gates, future multiplayer/time/autonomy, unratified full ENG03, GM03/GM07, pending OBS architecture, and explicitly owner-retained canon-invention in `work/designs/open/` or a linked existing Proposed Change. Do not invent an extra implementation Change for pure research.
3. **Receipts:** migrate dated AD/ENG/GM/SA/OBS/UX implementation evidence and genuine connected trials to `evidence/inspections` or `evidence/runs`; each claim must retain inspected SHA, method, commands, environment and negative limitations. Two overlapping final reports from one trial should result in **one** run manifest with provenance references, not two current handoffs.
4. **Forensic trial:** preserve S0–S6 evidence contracts, original campaign identifiers, negative fault matrix and unproven OBS00-B condition as an evidence run manifest and bounded source/technical gaps. Old START-HERE and FINAL-HANDOFF instructions can then leave the maintained tree.
5. **Visual assets:** move retained synthetic OBS07 screenshot and UX01 renditions into actual test snapshots or bounded run assets. Put large/unrepeatable output in ignored local artifacts with a verifiable manifest/hashes when appropriate. Never break a legitimate visual-regression test or claim a retained screenshot is a live usability result.
6. **Research and agent materials:** move `engineering/agentic-systems-field-manual.md`, `long-story-memory-and-retrieval.md`, and narrative evaluation research to curated `research/storyteller/` if their sources are still relevant; move coding-agent policies to `.agents/`. Consolidate overlapping agent documentation rather than creating a parallel `research` always-on rulebook.
7. **Operations:** extract `operations/development.md` into coherent human runbooks with commands, prerequisites, safety/environment and troubleshooting. Source-local package procedures should remain beside source where necessary.
8. **Change archive:** summarize all 111 existing archive files into a compact, searchable monthly ledger plus immutable commit references. Verify that every code-bearing packet's authority reconciliation and acceptance evidence still has a permanent/evidence home. Delete full terminal folders only after this check; Git history holds their exact text.
9. **Session history:** promote nontrivial owner decisions from `history/minutes` and protect the dormant policy. Truncate rolling continuity by *promotion*, not indiscriminate deletion.

**Exit:** all observational claims carry scope and provenance; no temporary script labelled authoritative; no unapproved product decision silently accepted; no unrecoverable trial evidence lost.

## P5. Navigation and tooling cutover

Do not finalize path moves until code/tool dependencies are ready. Search the **entire tracked repository**, not just `docs/`.

**Known inspected consumers requiring path review:**

- `AGENTS.md`, `CLAUDE.md`, `.agents/HARNESS.md`, `.agents/rules/{documentation,session-minutes}.md`, `.agents/references/{documentation-navigation-standard,change-work-unit-standard}.md`, associated `.agents/skills` and `.cursor/rules`.
- `scripts/repo-tools/{brief,docs-health,archive-changes}.mjs`, `scripts/check_docs.py`, `package.json` script aliases, repo-local tests that assert file locations.
- Root `README.md`, `TODO.md` (migrate to `ROADMAP.md`), `docs/progress.md` (to `STATUS.md`), package/source-adjacent README cross-links, PR templates/workflows if referencing paths.
- All references to `docs/programs/`, `docs/engineering/`, `docs/changes/`, `docs/history/`, `docs/product/`, `docs/technical/`, `docs/operations/`, `docs/questions.md`, `docs/progress.md`.

**Required code-tool behavior:**

- `repo:brief` reads the **one** current `STATUS.md` orientation plus `work/changes/README.md` selection, not stale progress/program pages.
- `repo:docs-health` scans `work/changes/open/` and validates selection, checkpoint/reconciliation metadata. Extend with a **taxonomy rule** that fails if forbidden transient categories reappear inside canonical `docs/`, but do not mistake that for semantic proof.
- `archive-changes` closes to the compact `work/changes/ledger` path after reconciliation, not a new nested packet archive. Carefully preserve old behavior until all callers change.
- `check_docs.py` scans new canonical, `work`, `evidence`, `research` and agent files as appropriate; verifies relative path/anchor links after document rewriting. Skip only genuinely untracked/binary content, not a directory because it moved.
- `.agents` rules now enforce no duplicated norm owner, no temp file in `docs`, expiry/promote on design close, and no completed Change folder accumulation.
- All indexes and agent cold-start instructions point to **subject owners**, with no hardcoded expired trial route.

**Do not use a raw global string-replace** for Markdown links: relative depth, renamed anchors, code fences, Markdown reference-style links and plain-text paths need separate treatment. Construct the old-path/heading → new-path/heading map from the atom ledger, rewrite links contextually, then validate with the parser and manual samples.

**Exit:** zero dangling relative Markdown links, zero abandoned path literals in controlled loaders, `repo:brief` and Change archiver honor new routes; current active selection remains exactly what the owner chose.

## P6. Remove old tree only after promotion / final review

1. Freeze and review the canonical owner maps. Verify all baseline docs have a resolved file status and no unique section was stranded.
2. Commit a link-correct **cutover** (can be a series of focused commits on the isolated branch, but the reviewed merge result must contain no dead routes). During intermediate phases keep old paths or clearly labeled compatibility stubs until all incoming references have moved.
3. Remove `docs/programs`, `docs/engineering`, `docs/history`, `docs/changes`, obsolete `docs/technical/playthroughs`, `docs/operations`, `docs/progress.md`, `docs/questions.md` only after checking their migration and Git recoverability. Avoid permanent redirects and duplicates unless an external URL truly requires a migration note.
4. Update `STATUS.md` with actual **observed** state and provenance. Do not claim this documentation migration fixed or verified product runtime defects.
5. Run final automated checks and the independent cold-reader retrieval benchmark; compare to baseline without inventing token savings. Preserve unresolved decisions as open gates.
6. Write a concise terminal DOC01 receipt (source SHAs, target file list, checks, diff summary, unresolved risks, no paid spend) to `work/changes/ledger/YYYY-MM.md`. Close/remove the full DOC01 execution dossier from active tree only when its own contents have been promoted and traceably committed.

**Failure behavior:** if mid-migration claims are ambiguous, stop that domain's promotion, keep the old source and label the gate; do **not** delete, silently turn a proposal into approval, or call source truth the product bible. Unrelated source runtime failures do not justify changing product docs.

## P7. Post-migration gardening control

Add a small deterministic check that inventories `docs/` paths and flags prohibited structural classes: `programs`, `handoff`, `evidence`, `evaluations`, `minutes`, `history`, `changes`, `archive`, `audits` and unrecognized top-level namespaces. It must distinguish **filenames/paths** from prose mentioning a historical category. Flag unexpected new folders for human owner/rationale review (D1–D5 test).

At each later Change close: reconcile exact product/technical headings, update `STATUS.md` only when its summary meaningfully changes, write evidence at its dated owner, summarize the terminal packet in the ledger, and retire its work folder. A daily transcript is never the substitute for a product-design change.

## Permissions and excluded work

DOC01 authorizes **documentation relocation/rewriting and the minimum local automation/agent-routing updates required for cutover once the owner explicitly selects implementation**. It does not authorize changing gameplay API/database behavior, paid providers, deployments, live data, runtime migrations, product-promise weakening or indiscriminate evidence deletion.

**Success means a different, usable knowledge system, not 483 files at new paths.** [Acceptance tests](VERIFICATION.md) are binding.
