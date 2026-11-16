# DOC02 | Falsifiable completion contract

**Baseline:** `main@cda7444e7bb8910e228164cb97a17b504f7c2415`. These tests assess whether a **fresh ChatGPT investigator can correctly understand and navigate the product and target architecture**. They cannot be replaced by a directory allowlist or a list of file titles.

## A. Authority and preservation (hard gates)

| ID | Objective | Required evidence | Negative / failure condition |
| --- | --- | --- | --- |
| A1 | Every baseline canonical doc accounted for | **All 114 docs paths** in CURRENT-DISPOSITION with final action, content owner or verified drop; current HEAD additions included | Full doc with unreviewed unique heading deleted |
| A2 | Selected target design not marooned in historical evidence | Selected Engine, Storyteller, Admin, Experience and Observability targets have exact new canonical headings, acceptance state and proper negative cases | ChatGPT must read `doc01-legacy-snapshot/programs/engine/target-engine.md` to learn accepted engine architecture |
| A3 | Product bible fidelity | Actual accepted gameplay and staff product invariants present, not only summary + links | LiveOps release/compatibility policy survives only as a 15 KB old essay in evidence |
| A4 | Technical truth | Unique owner for authority, races, versioning, model dispatch, prompt source, grants and forensic reconstruction | One deep technical contract becomes a 300-byte pointer to removed program technical file |
| A5 | No invented acceptance | Every accepted/selected claim traceable to owner choice; unapproved proposals remain explicit drafts | “Proposed” authorization is changed to default staff privilege because it sits in docs |
| A6 | Differentiate design and implementation | Status and source/evidence accurately describe actually landed subsets | Full ENG03 marked Done merely because C1/C2 landed; synthetic Support grants called production-ready |
| A7 | No temporary duplicate docs | No compat full copies, no root progress/questions/TODO aliases, no technical/playthroughs mixed-authority folder | Old `technical/context-and-cost.md` still holds full 50 KB after `storyteller/request-context-and-cost.md` exists |
| A8 | Archive preservation | Every source item in `work/changes/archive/` still exists and full content remains recoverable | “Optimization” removes the completed Change archive, replaces it only with ledger, or rewrites its historical completion facts |
| A9 | Evidence integrity | Actual trials, safety failures and useful representative screenshots remain reproducible; retained media uses one asset identity/hash | Deleting a unique causal fault trace solely to reduce file count |
| A10 | No legacy snapshot in active navigation | Root docs/AGENTS/topic READMEs route to real canonical product/technical owner; explicit historical lookup can still reach Git archives | Product query goes to `evidence/inspections/doc01-legacy-snapshot/programs/` on first hop |

No waiver can turn “full text still available in an evidence snapshot” into A2/A3/A4 success. An unresolved owner decision must be an **open gate**, not a silent DROP.

## B. Required technical and product subject assertions

For each of these, owner reviewer must locate **exact heading(s)**, state a normal case and a discriminating negative case, compare with previous selected design and actual source evidence where relevant:

1. **Agency/time:** no accepted action → no fictional time, accepted routines/time and interruption semantics; no invented earnings.
2. **D&D mechanics and arbitrary forms:** source of roll authority, unavailable body parts, alternative worlds and no universal mandatory inventory.
3. **Continuity:** canonical facts, mechanical claims, exact provenance, source version and bounded retrieval.
4. **Storyteller constitution:** quiet-life noncompulsion, narrative initiative, style controls, world-neutrality and privacy.
5. **Adaptive agent design:** task-specific reasoning, optional evidence tools, stopping criteria, zero-call opportunities and loop failure handling; not an implied 24/7 AI mind.
6. **End-state engine:** modular/domain authority, typed capabilities, causal action spine, deterministic permissions and evolution path independent of POC implementation.
7. **Concurrency:** ENG03 provisional capture races, C1/C2 narrow landed vs full ENG03 Proposed, retries and idempotency.
8. **Client:** interaction semantics, Next SSR hydration, state/caching/command boundaries, presentation runtime and accessibility.
9. **Admin:** capability package semantics, staff lifecycle, Support/Player360, payer vs participant, view/assist/sandbox and production-grant absence.
10. **LiveOps:** release/compatibility and blast radius, emergency stop controls, attribution and consented experiment boundaries.
11. **Observability:** E0 evidence capture, immutable artifacts, causal identity, historical reconstruction, Turn Capsule, redaction/access tiers, erasure/retention.
12. **Chamber:** disposable valid fixtures vs actual gameplay proof, deterministic controlled faults and reproducibility.
13. **Financial and provider spend:** player entitlement vs request budget, preflight/dispatch/settlement under retries and no unauthorized paid sends.
14. **Strategy vs implementation:** product long-term vision, current engineering-portfolio priority, and one selected Change queue.

**Boundary rule:** accepted source norm must be canonical; unaccepted target must be discoverable in `work/designs/open/<topic>` with explicit owner gate; dated proof only in evidence. No “README says all covered” substitution.

## C. Evidence-based size and redundancy checks

Measure against pinned baseline **and show actual outcomes**, without promising fixed targets:

- `docs/` tracked bytes and files, separated into normative substantive, router, approved ADR and runbook; report **unique substantive contracts**, not only total size.
- The **18 known old/new full-content pairs** are no longer duplicated as active current docs. Compare old unique paragraphs before removal. A pair is finished when every unique accepted clause is present once; not when a script renamed it.
- `evidence/inspections/doc01-legacy-snapshot/` either removed from HEAD after documented provenance/unique-claim promotion, or explicit *narrow* item-by-item retention justified. A blanket “keep all 312 to be safe” fails.
- Verify and shrink **70 baseline exact-blob duplication groups** where duplicates lack independent evidentiary retention purpose. Three identical OBS07 screenshots should not remain under three active paths without documented necessary consumers. The full Change archive is **exempt**.
- Count 20 original short docs (≤1,200 bytes); do not require all to vanish, but **zero canonical skeletons that promise to fold future material** and cannot answer their declared questions.
- Count mixed “legacy” or “retired” folders outside archived Changes; every surviving one has specific retention and a query that cannot be served by a canonical owner or Git history.
- Root docs router should be shorter and more accurate than the baseline and have no primary link to old design program snapshots. A small routing hub is good; a larger hub with precise necessary routes can pass only with demonstrated query advantage.

No arbitrary output count (e.g. exactly 50 docs) will prove quality. Loss of accepted edge cases is worse than an additional well-justified 20 KB contract.

## D. Deterministic tests (actually run locally)

Run existing verification and add focused negative fixtures. Record exact git SHA, commands and exit codes; do not fabricate results:

```bash
git status --short
git ls-files docs work evidence research .agents
python scripts/check_docs.py
pnpm repo:brief
pnpm repo:docs-health
git diff --check
```

Extend the docs checker or add `scripts/repo-tools/knowledge-health.mjs` (small, deterministic, no provider). It must scan **maintained knowledge** with correctly scoped exclusions for immutable archives and binary assets, and fail these controlled fixtures:

- Add `docs/technical/engine/old-compat.md` with “compatibility stub” and duplicated contract text → fail.
- Add `docs/technical/storyteller/prompts-and-tools.md` containing only “skeleton / to be folded” → fail.
- Add a first-hop docs README link to `evidence/inspections/doc01-legacy-snapshot/programs/` → fail as active nav.
- Add a live path to a nonexistent old file under `evidence/inspections/admin-program-essays` → fail path check.
- Leave both `docs/progress.md` and root STATUS authoritative → fail alias/ownership policy.
- Add a new unrelated directory under docs without subject/authority owner → fail review gate.

**Control positives:** accepted long coherent technical spec is not flagged for byte size; a small *useful* README remains valid; a retained immutable terminal Change packet is not flagged or removed; a dated actual run manifest with unique required evidence is not penalized.

Review and fix observed link gaps in maintained evidence README files too. Earlier targeted inspection found seven invalid link occurrences across 16 sampled high-traffic files (all in the Admin essay index); do **not** claim those are the only missing links until whole active navigation scan runs.

## E. Fresh ChatGPT retrieval benchmark

**Method:** Freeze a fixed question set *before* new docs are authored. Run once against the current baseline in a genuinely fresh context and once against the final candidate using the same task wording, permissions and search capabilities. A reviewer who already authored the map cannot score its own route table as an independent test. The user can manually use a new chat as the final acceptance if needed; no paid provider test may be run by Cursor without authorization.

For each question record: first entry, exact norm owner heading and product/technical classification, correct core answer, negative edge, accepted/proposed/implemented status, evidence route, number of distinct docs read, navigation choices, incorrect historical detours and **actual** model token count only if exposed.

| ID | User question (same exact wording before & after) | Expected answer domain |
| --- | --- | --- |
| Q01 | When does fictional time advance if I open a story but don't accept an action? | Product gameplay + technical engine time |
| Q02 | Can the Storyteller decide an item transfer just by narrating it? | Engine authority and model limits |
| Q03 | What should the player see when returning after an interrupted activity? | Experience return/journal plus committed state |
| Q04 | Can my character live quietly for days without forced twists or repeated model calls? | Product storyteller + engine activities + inference |
| Q05 | Does the DM have a real reasoning loop; how does it choose more evidence reads and stop? | Selected technical Storyteller controller vs current proof |
| Q06 | Can a staff worker read any player's complete raw prompt and story evidence? | Admin policy + forensic access, production grant reality |
| Q07 | What should Player 360 show if payer, player, story owner and controlled character differ? | Admin staff product model |
| Q08 | Can LiveOps change rules and narrators for existing campaigns without rewriting history? | Admin product release policy + technical compatibility |
| Q09 | What is the selected long-term engine model, and why not an LLM-led chat system? | Target engine architecture + decision rationale |
| Q10 | Where is React/Next SSR hydration and query cache ownership defined? | Technical client |
| Q11 | What does a forensic Turn Capsule contain and what evidence did a model actually see? | Technical OBS causal/read reconstruction |
| Q12 | Is full ENG03 short-lock refactor finished, and what actually passed? | STATUS, Change/evidence, not target contract |
| Q13 | Can a player replay published history without seeing developer-only source artifacts? | Product experience replay + technical OBS access |
| Q14 | How do nonhuman forms work without mandatory HP, possessions or humanoid skills? | Gameplay rules + world capability engine |
| Q15 | How do I construct a reproducible Chamber race test without paying a model? | Technical lab + actual runbook/tests |
| Q16 | Where are unresolved canon-invention and shared-campaign decisions? | Open design gates linked from product |
| Q17 | Where are development-agent costs and in-game Storyteller provider costs governed separately? | .agents vs technical platform/storyteller |
| Q18 | Which Change, if any, may Cursor implement now? How do I find its constraints? | work/changes selection + AGENTS |

**Pass:** zero incorrect authority/permission conclusions on Q01/02/05/06/08/11/12/14/17/18; all 18 cite exact norm owner, counterexample and evidence/uncertainty class where meaningful. Expected ≤2 navigation decisions from entry to owner heading for scoped questions; cross-domain questions can need two substantive contracts. Compare measured baseline vs final wrong detours/doc reads; if no independent before-test exists, state that and **do not claim measured improvement**. Routes alone are not answers.

**Adversarial:** give reader a legacy Admin essay, completed synthetic OBS07 run and ENG03-narrow evidence. It must not conclude unrestricted Support grants or full ENG03 Done.

## F. Terminal proof bundle

Before closing DOC02, return:
- exact before/after SHAs; file/dir/bytes by authority class and why retained;
- complete 114+ file disposition with **section-level reconciliation** for material claims;
- at least ten examples of actually promoted deep rules or negatives from former archives (with source/destination heading);
- technical target comparison for Engine, Storyteller, Admin, OBS, client;
- removed full-content aliases and dead stubs; preserved Change archive counts and SHA references;
- cleanup of orphan migration tools and duplicate evidence snapshots with retention proof;
- broken-link and taxonomy checks including negative fixtures; no fabricated paid tests;
- cold-reader findings with answers and uncertainties, not only a routing cheat sheet;
- current STATUS, ROADMAP, docs routers and agent instructions consistent;
- explicit unresolved owner choices kept proposed (not buried in evidence).

**Failure:** If semantic promotion still depends on a bulk snapshot waiver, DOC02 is **Blocked**, not Done. Do not dilute this gate merely to clear a task tracker.
