# DOC02 | Rebuild knowledge authority, not paths

**State:** design prepared, proposed only. **Baseline:** `main@cda7444e7bb8910e228164cb97a17b504f7c2415`. **Intent:** repair canonical knowledge before further substantive implementation. The completed `work/changes/archive/` remains in full, per owner direction.

This is a multi-stage semantic and documentation-tool migration. Cursor should implement it in an isolated branch after owner authorization, with explicit phase reviews and no provider spend. Do **not** run bulk `rm`, perform a second mass copy or declare the migration “Done” when unique normative content lives only in evidence snapshots.

## Phase 0: freeze and independently classify the actual HEAD

- Inspect `git status`, current branch/SHA, the tree after pinned baseline, and the open Change queue. Do not overwrite concurrent work. Identify any new contract/code changes requiring reconciliation.
- Capture baseline `docs/`, `evidence/`, `work/designs/`, `research/`, `.agents/`, root README/STATUS/TODO/ROADMAP, and index consumers.
- Run existing `python scripts/check_docs.py`, `pnpm repo:brief`, `pnpm repo:docs-health`, capture exact pass/fail, known caveats and current selected Change. **Do not use prior DOC01 P7 receipts as proof**.
- Create a small independent authority graph from *owner questions*, not current paths: player action/time, world/rules, story continuity, in-game DM behavior, UI, Admin, forensic investigation, Storyteller controller, money/dispatch, state/concurrency, dev lab, code agent.
- Freeze priority source evidence: existing selected product text, target engine/Storyteller/OBS/Admin design, old technical contracts, directly observed code, source-adjacent maps, accepted owner decisions and negative tests.
- Keep Change archive and underlying Git history unchanged.

**Gate:** source revision and all affected groups enumerated. No assumptions that documentation “Done” means product scope accepted.

## Phase 1: exact claim-level authority reconstruction

Use [CURRENT-DISPOSITION.md](CURRENT-DISPOSITION.md) for all **114 current docs**, plus **all historical design files with unique possible normative content** from:
- `evidence/inspections/doc01-legacy-snapshot/programs/{admin,engine,experience,observability,storyteller}/`
- `evidence/inspections/admin-program-essays-2026-11/`
- `evidence/inspections/obs-technical-essays-2026-11/`
- legacy technical flat files, source audits and selected decisions
- open design packets and owner messages recorded in the existing Change archive

Create a working **concept/claim ledger**, one row per consequential accepted/proposed rule or independent tech invariant:

```text
claim_id, subject, question, source_sha, path, heading, exact_claim,
approval(accepted|selected|proposed|rejected|unclear),
design_epoch, implementation_observation_ref, target_owner, target_heading,
action(promote|merge|keep_draft|evidence|retire),
negative_case_preserved, incoming_references,
conflicts_and_supersession, review_state, reviewer
```

Do not use LLM similarity as a “duplicate = delete” decision. Compare semantics, exceptions, required vs optional, public vs private, approval, temporal scope and counterexamples. Rejected alternatives may be kept **only** when helpful to explain an accepted choice. A unique accepted claim cannot be “waived” merely because its original body remains in Git. Proposals that still matter must go to a genuine topic-owned open design, not a historical evidentiary drawer.

**Mandatory conflicting lines:** old runtime vs desired Storyteller agent loop; engine POC vs selected modular authority target; Admin 10 KB canon vs 318 KB essays; OBS 82 KB canon vs 329 KB essays; gameplay/experience/storytelling duplicate vocabulary; local time/committed-time/Temporal conflicts; current STATUS and embedded “not implemented” banners.

**Gate:** each source section has a defensible permanent owner, explicit draft, evidence retention or verified disposable classification. No `resolved=false` hidden in a waiver.

## Phase 2: product canon, rebuilt from the accepted destination

Work in domain order **gameplay → Storyteller → experience → Admin** (adjust order only if owner dependencies require). For each topic, write the canonical accepted product contract *before* changing technical docs, with product requirements and actual negative cases. This is not an opportunity to design or accept new product policy from imagination.

### Gameplay
Review `product/foundations/{gameplay,game-rules}`, journeys time, storytelling continuity, `product/gameplay`, the engine product-derived requirements, and old acceptance playthroughs. Establish one authority for intentions, dice/rules, time, saved continuity, nonhuman forms, long-running activities and limitations. Keep unapproved shared-play/agency/reentry proposals visible as proposals, not silent default.

### In-game Storyteller
Bring **selected product constitution** out of the legacy program into `product/storyteller`: DM creative responsibilities, ordinary-life neutrality, narrative initiative, player agency, historical truth, role of canon invention, settings and quality/negative acceptance. Where future policy is not actually accepted, preserve complete proposed design in a topic-owned `work/designs/open/` dossier and link it as deferred, instead of compressing it to “future” in a 300-byte file.

### Player experience
Use existing accepted UX program detail to complete concrete human flows: entry/demo/account, creation, Now, choosing versus inspecting, accepted waits, return/Journal, world/you, settings, narration/presentation. Make page owners deep enough to answer an actual UX implementation question. Move multiplayer/replay draft into `work/designs/open/` unless separately accepted, and keep only a brief *clearly labeled non-normative* pointer in an existing relevant product page, not separate skeleton leaves.

### Admin
Do a serious subject-by-subject acceptance review of the old long-form product material. Rebuild selected capability model, staff product charter, Player 360, case work, delegated access, operational diagnostics, LiveOps, commercial and privacy conditions, command center and cross-workspace user journeys. **Keep conditional business/policy choices conditional**; don't silently grant staff powers. A long-form proposed essay is not evidence and cannot substitute for an accepted product owner.

**Gate:** a fresh reviewer can answer each product question from canonical pages with the correct selected/proposed boundary and a normal/negative case, *without* opening old snapshot. Stop if owner approval is necessary for a consequential policy.

## Phase 3: technical canon, rebuilt from selected target and source evidence

For every subject, compare (i) product contract, (ii) **selected desired end-state architecture**, (iii) older POC contracts, (iv) current source evidence. Promote **selected future design** even when not yet implemented; record the implementation delta in STATUS/Change/evidence, not by rewriting the destination to match code.

- **Engine:** integrate `programs/engine/{target-engine,domain-authority,module-boundaries,time-and-execution,world-and-rules,evolution-and-release}` and selected decisions, with older technical action/time/canonical storage contracts. A single owner must explain the true causal spine, extensibility, repeated work, CAS recovery, event/outbox, versioning and negative interleavings. Full ENG03 remains proposed where applicable.
- **Storyteller:** integrate `programs/storyteller/{target-operating-model,context-and-retrieval,prompt-tools-and-models,effort-cost-and-lifecycle,evaluation-and-playability}`. Preserve the two-loop architecture, bounded agent controller, tool selection and stopping criteria, context snapshots, prompt constitution, model routing, publication and spending. Distinguish no-model vs single-call vs multi-round loops; never conflate desired adaptive behavior with tested implementation.
- **Admin:** review 13 previous Admin technical essays and new 4 docs; include specific grants, staff identity, cross-org/subject boundaries, audit, privacy and source-version effects.
- **Observability:** review all 20 prior technical essays including TurnEvidenceCapsule, physical artifact, reconstruction, historical prompt lineage, retention, staff read tiers and causal graph. Consolidate meaningfully by invariant rather than reducing 20 files to five brochure descriptions. Actual tests stay in evidence.
- **Client:** selected React/Next F1–F15 and presentation runtime should actually cover hydration/cache, query boundary, error/race, command flows, access/a11y/performance. Fill or merge skeletons. Player experience owns intent, technical client owns renderer.
- **Platform/lab:** correct co-ownership of identity, data, delivery and usage across Storyteller and Engine; Chamber protocol and real experiment requirements. Move uniquely substantive `calendars`, `ticks`, `notifications`, `story-settings`, `persistence-and-caching` into their actual technical owner.

**Gate:** all major technical invariants including failure/recovery/negative proof live at **one heading**; all target architectures have accurate accepted/proposed labels. The old flat document is no longer needed for anything beyond historical Git recovery.

## Phase 4: actual cleanup after semantic proof

1. Remove entire alias files `docs/product/journeys/*`, `docs/product/storytelling/*`, old duplicate `foundations/{gameplay,game-rules}.md` and `docs/technical/*.md` except README, after extracting unique text and rewriting every affected consumer. Do not leave redirect stubs.
2. Disposition `docs/technical/playthroughs/` file by file: extract orthogonal acceptance scenarios, place executable suites under tests, retain real observed runs under evidence; drop trivial or redundant prose from HEAD with exact Git links. Remove the mixed directory.
3. Remove `docs/progress.md`, `docs/questions.md`, root `TODO.md` after folding strategy into `ROADMAP.md`, factual status into `STATUS.md`, unresolved policy into genuine drafts. Do not create another pointer file.
4. Remove stale `DOC01 P2/P3/P4`, “after cutover” and obsolete migration comments from maintained canonical docs, agent rules, indexes and scripts. Do not strip accurate versioned historical context that genuinely explains a decision.
5. Remove one-off `work/designs/open/doc01-migration/` scripts from current HEAD unless promoted to real tested `scripts/` tools. Review the legacy-initiatives index and product-open-questions basket; merge real drafts or retire. Do not delete owner-retained canon-invention policy.
6. De-duplicate `evidence/inspections/doc01-legacy-snapshot/` and overlapping Admin/OBS “essay copies” **after** promotion. Remove generic snapshot copies from HEAD; Git history remains full. Preserve any original evidence records needed to reproduce a test and the *entire `work/changes/archive/` untouched*. If evidence cannot be reproduced without an asset, retain one canonical asset plus manifest/hash and point other runs to it.
7. Reclassify `research/legacy-*`: genuine dated source audits to evidence, live developer procedure to runbook/skill, current external research to curated research, dead “manual router” to deletion after links fixed. No `legacy/` graveyards by default.
8. Minimize README routing. `docs/README.md`, `docs/product/README.md`, `docs/technical/README.md` should route by actual question to exact owner/heading. Remove retired “design programs” and history from first-screen route.

**Gate:** all internal path/heading references updated, no orphaned exact facts or disputed approvals, no temporary aliases or stale owners. Full Change archive is confirmed still intact.

## Phase 5: tools and ChatGPT retrieval controls

- Extend `scripts/check_docs.py` coverage to **all maintained Markdown in `docs,work,evidence,research,.agents`** as appropriate; if historical third-party pasted material is intentionally excluded, state why and ensure it isn't in first-hop routes.
- Add a code-owned doc-catalog check that discovers canonical docs and flags: `compatibility stub`, `skeleton`, `until cutover`, legacy absolute path in live router, empty ADR namespace, and exact duplicate blobs across active non-archive docs. The failure mode is declared owner conflict, not a cap on file bytes.
- Add a retention/canonicalization check for doc snapshots and repeated media assets. Explicitly **exempt `work/changes/archive/`** from redirection, dedup or deletion rules.
- Update `scripts/repo-tools/brief.mjs` to eliminate duplicate expressions such as `work/changes/ or work/changes/`, dead docs fallback assumptions and migration-era comments. Current selection must remain unchanged unless owner explicitly selects DOC02.
- Correct `.agents/rules/documentation.md` text to describe actual `check_docs.py` coverage; ensure `AGENTS.md` and `.agents/references/documentation-navigation-standard.md` teach subject-authority navigation with no legacy first hop.
- Add a focused *fresh ChatGPT retrieval benchmark* and validate it from a fresh context or independent reviewer, not the same writer's route table. Results: exact headings, correct rule, decisive negative, approval status, evidence class, false-destination count and actual documents/steps opened.

**Gate:** ordinary exact links and source navigation work; negative tests catch duplicates/skeletons/old routes; independent benchmark actually improves with no incorrect authority claims.

## Phase 6: terminal review and permanent governance

Compare pinned and final trees: canonical file owners (not just counts), promoted selected architecture sections, source/target conflict resolutions, dropped duplicates and ghosts, exact evidence retention, Change archive intact, all commands actually executed and tests rerun. Publish a concise DOC02 receipt and update `STATUS.md` only after accurate changes landed. Archive DOC02 under existing `work/changes/archive/` (keep full dossier) after reconciliation.

**Do not claim Done** if: a long-form selected target exists only in evidence, a canonical skeleton sends the reader outside for its own answer, a DOC01 compatibility full copy remains, or the cold-reader test was not independently executed. If owner policy decisions block specific domains, label those domains explicitly incomplete and do not close them by a waiver.

### Explicit safety and work boundaries

After owner authorization, DOC02 may edit docs, repo navigation scripts and documentation tests. It **does not** authorize gameplay engine rewrites, provider calls, deployments, real database changes, product-policy acceptance, paid experimentation, data exfiltration or destruction of unique evidence. Preserve any concurrent Cursor work. Each area should converge in controlled commits with deliberate independent review and no mass-renaming detours.
