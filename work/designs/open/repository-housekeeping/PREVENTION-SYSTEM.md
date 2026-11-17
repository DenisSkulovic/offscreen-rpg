# Repository maintenance control plane | target design | 2026-11-17

**Design state:** Accepted problem/desired outcome from owner; implementation is **not yet landed**. This document is a non-normative implementation design in `work/`, not a new game product authority. The existing [audit](AUDIT-2026-11-17.md) found specific debris. This document explains why it accumulated and how to keep the repo self-maintaining. Source basis: lean `4e42bd7` plus live GitHub checks of `main@b876318`; before implementation compare latest HEAD. No runtime check on full HEAD was performed here.

## Thesis

**The repo must remember what the agent cannot.** A Change closing successfully is not evidence that its siblings, indexes, STATUS, historic drafts, tests or examples were considered. A graph check only proves the graph it actually scanned. A coding instruction only runs if that agent reads, understands and remembers it. Build cheap, deterministic feedback at each transition: inventory → route → state → dependency impact → review/retirement → CI/brief. Let a human decide semantic truth; never let an old file disappear silently.

## Root causes, not blame

1. **Coverage is narrower than repository ownership.** `scripts/repo-tools/wiki-core/model.mjs::collectMaintainedPages` scans root routers, `docs`, `work/designs/open`, `work/changes/open` and source READMEs. Its directed reachability/error gate covers **canonical `docs/` only**; other active pages are parsed for links but are not required to be reachable from their own entry router. Research, evidence, archived work, most agent references, and executable scripts have other lifecycle rules or no comparable inventory. “74/74 reachable” was about canonical pages, not the whole repository.
2. **Overlapping tools lack a unified closeout signal.** `wiki:content-health` is heuristic advisory; `repo:docs-health` reviews checkpoints/ledgers but does not assert active-index ownership; `wiki:change-guard` checks a selected reconciliation ledger; `scripts/check_docs.py` validates navigation links in defined scopes. None guarantees that *every tracked active control document* is routed and reconsidered after relevant code changes.
3. **Lifecycle is distributed in free text.** `work/changes/README.md` owns selection, each `CHANGE.md` declares state, archival buckets indicate terminal work, `STATUS.md` describes realization, and design indexes summarize proposals. Synchronization is manual. Example: `repo:docs-health` currently calls `Done for A; B blocked` a terminal Done packet. A naive grep for `Done` is unsafe.
4. **CI runs the wrong subset.** `.github/workflows/docs.yml` filters primarily `docs/**` and READMEs; edits to arbitrary `work/changes/**` or `research/**` do not necessarily trigger its checks. The code workflow always runs a classifier, but does not replace lifecycle health. A weekly maintenance signal is absent.
5. **Old work never receives a mandatory disposition.** Completed WIKI/HAR studies still appear with proposed language in `work/designs/README.md`; `work/README.md` mentions an already-transitional “P5 cutover”. A retained `work/designs/open/legacy-initiatives-index/` is cited elsewhere yet not routed by the active design index. The latter may deserve *historical reclassification*, not deletion.
6. **Freshness is not causal.** Current content checks notice strings such as “not yet implemented”, but lack a `git`-backed cross-reference between changed source and affected owner docs. Conversely a stable product contract may be correct after months: elapsed time alone is not corruption.

## Ownership: derived inventory, not a second bible

Use `git ls-files` to enumerate tracked Markdown and recognized executable work surfaces, reusing `wiki-core/markdown.mjs`, `model.mjs` and `paths.mjs` for document edges/path classification. Do **not** create a second Markdown parser, copy canonical requirements into a fresh index, invent a shadow status database or adopt Cognee/embedding search. **Classification can use path convention + narrow local metadata**, but the registry is *derived* from the repository on each run.

| Artifact class | Entry route / owner | Lifecycle expectation | Garbage decision |
| --- | --- | --- | --- |
| Canonical product/technical/decision/runbook | `docs/README.md` directed hierarchy | All canonical pages reachable, resolvable, and owned; current target and reality explicitly distinct | Never auto-delete; revise via ratification |
| Active Changes + PLAN/proof | `work/changes/README.md` → each open `CHANGE.md` | Every packet has a valid state, is discoverable, and has one lifecycle location; selected change resolves correctly | Terminal work archived **with** links and ledger; partial Done is not terminal |
| Active designs | `work/designs/README.md` → dossier entry/index, then descendants | Discoverable as active, or explicitly moved/retained as historical; proposals not presented as selected truth | Reclassify/archive on conclusion, preserve unique decisions |
| Root orientation and statuses | `README.md`, `AGENTS.md`, `STATUS.md`, `ROADMAP.md`, `ENGINEERING.md`, current Change queue | One owner per question; summary references actual owner and current selection; unusually placed `CURRENT/STATUS/TODO/ROADMAP` documents flagged | Merge/move or clearly scope; no competing “current truth” |
| Source-adjacent READMEs | Nearest `apps/packages/tools/**/README.md` and canonical technical owner | Actual symbol/entrypoint names remain valid; source changes yield impact-review candidates | Repair after actual boundary changes; no mechanical file-age edits |
| Research, retained history, evidence and archive | `research/README.md`, `evidence/README.md`, archive ledgers / manifests | A **collection-level** route and status/evidence provenance; no requirement that each historical file be linked as active | Retain unique reproducible evidence; delete expired duplicates only with disposition |
| Source scripts and developer tooling | `package.json` scripts, owning README, import/test references | Discoverable operational entrypoint or explicit helper/import; risky unowned mutation CLIs reviewed | Flag likely orphans; never delete by grep-only proof |

A new tracked Markdown outside the recognized classes should appear as **unclassified** even if its name is unusual. Familiar names such as `TODO.md`, `STATUS.md`, `HANDOFF.md` are *higher-risk hints*, not an exhaustive blacklist.

## Four independent detectors

### A. Route and lifecycle integrity (deterministic gate)

- Reuse wiki graph to compute directed discoverability **per class**, not one undifferentiated root. Fail for missing index route to a newly added active Change or active design dossier, invalid selected CHANGE target, whole-packet Done/Cancelled still under `open/`, active packet under `archive/`, or broken local owned links. Do not use vague string matching for state: parse the single declared state and distinguish `Done for A; B blocked` from terminal `Done`.
- Detect unowned/unclassified new docs, accidental parallel status files, nonexistent owners and owner status contradictions. Report a reason and suggested owning router.
- For baseline legacy anomalies, emit an issue with explicit disposition work rather than silently exempting all historical content. No broad permanent allowlists. Any exception has owner, reason, path and expiry/review date; exceptions themselves expire/fail.

### B. Dependency-aware freshness (candidate, not invented truth)

- `git` commit history provides last-change SHA/date for active docs, source READMEs and **linked source paths/symbol evidence**. Use current SHA; report missing or shallow history as unavailable rather than “fresh”. Track linked source files via existing parsed Markdown edges plus conservative literal path references.
- Signal `needs-revalidation` if a cited source/entrypoint changed since the owning doc's last reviewed version; source edits may be unrelated, so this is a review candidate, **not a claim the contract is false**. A Change ledger can record `unchanged + why` or `updated` and point to relevant headings/tests; semantically unsafe changes still require human judgment.
- Inactivity alone: age buckets (for example 14/30/60/90 days) for active Changes/designs and high-impact root/status pages; indicate last review and whether dependencies changed. Never use age alone to auto-archive, fail a build, or reorder a game's product rules.
- Separate `unchanged-and-reviewed`, `unreviewed-impact`, `inactive-open-work`, `stale-claim-suspected` and `unknown-provenance`.

### C. Closure and cross-source reconciliation

- Before a code-bearing Change reaches Done, run existing `wiki:change-guard` + new lifecycle guard. Check the work packet's declared outcome against `work/changes/README.md`, `STATUS.md`/source, nearest README and canon pointers. The scripts validate **presence, paths, stated disposition and source-receipt consistency**; never pretend to prove factual correctness of prose.
- An archived Change is not an active promise. Move or retain concluded design dossiers only after inbound/backlink inventory and decision/evidence routing; write a short disposition instead of a redundant copy of the entire study.
- Trim living dashboards. `STATUS.md` should contain current capability/proof boundaries, not a chronological transcript of all experiments. `work/changes/README.md` should remain an actionable current queue, not a second archive catalog. The detailed history stays in existing archive/ledger/research/evidence owners.

### D. Feedback and triggers (agent-visible, cheap)

| Trigger | Action | Failure policy |
| --- | --- | --- |
| Local `pnpm repo:brief` or opt-in `pnpm repo:brief --health` | Surface **top 3 actionable** issues with exact paths and owning command; never dump a giant report into an agent context | Read-only; quick; explain when not run |
| `pnpm repo:maintenance` | Full local read-only report, JSON artifacts under ignored `out/`, counts by class/severity, source revision | Exit nonzero for deterministic structural violations in strict mode; warnings are review work |
| PR/push | Node/Python deterministic check, prior self-tests, full Git history for freshness where needed; triggers for work/research/scripts as well as code | Block **new** high-confidence integrity failures; preserve unrelated existing failures and no hidden provider calls |
| Weekly scheduled GitHub workflow | Full report incl aged open work, drifting dependencies, control-file anomalies; summary and downloadable artifact | Raises visible review debt, with deduplicated issue/owner process if workflow summary alone proves invisible |
| Change-close / archive | Command checks selected target, declared state, ledger, index and source/doc reconciliation | Refuse terminal Done if objective criteria fail; semantic claims still require reviewer |

**Avoid notification theater:** do not print 200 stale warnings every session. Rank by active impact, changed dependency, potential false authority and age; show three in `repo:brief`, keep full structured report in `out/`. A warning must have a disposition path. For recurring warnings use a bounded owner-owned review docket with TTL, not indefinite `ignore` comments.

## Implementation sequence and dependencies

1. **HK02** (already ready): fix known Change/research docs CI link-scope and stale lifecycle prose.
2. **HK06**: derived inventory, active route/lifecycle gates, fixture-based classification, structured read-only report. Reuse wiki parsing, no semantic age decisions.
3. **HK07**: Git dependency/age impact overlay and actionable ranking; negative tests for stale-but-correct and newer-source-than-doc; zero paid models.
4. **HK08**: integrate push/PR/weekly/brief/Change-close, rehome duplicated status history, and make new violations block with tested baseline.
5. **HK01/HK05** follow safety/UI gates for actual deletions; **HK03/HK04** remain risky refactors unrelated to the maintenance control plane.

**Never conflate the tools:** `wiki:health` remains canonical wiki integrity, `wiki:content-health` remains candidate semantics, `wiki:change-guard` remains per-Change reconciliation, and `repo:maintenance` is the *orchestrator/coverage and lifecycle view*, not four competing owners.

## Acceptance and measured failure demonstrations

- Introduce a previously unknown active Change `CHANGE.md` **without** adding it to the queue → fail, with path and fix. Add the link → pass.
- Leave a terminal `Done` packet under `open/` → fail. Mark a partial `Done for A; B blocked` → **do not** falsely classify as terminal.
- Create an orphan control page with an arbitrary filename → surface unknown owner; a new `TODO.md` outside known routers is not silently accepted.
- Unlink an active design dossier → fail or produce explicit grandfathered baseline issue, **not** counted as reachable because another history footnote mentions it. A linked historic source in research may remain legitimately off the active queue.
- Modify a code owner cited by a maintained source map without reviewing the map → candidate with two SHAs; reviewing it with `unchanged because …` clears the recorded review debt. A 100-day unchanged contract with no related source movement is **not** mislabeled false.
- Flip selected `Current change` to missing/archived path → fail; `none` is valid.
- Verify path-filter fixture: Change-only edit actually triggers the maintenance job, and the heavy code/integration matrix is **not** accidentally imposed by housekeeping. Validate JSON schema, no secrets, no provider calls, no DB state writes, and predictable execution time.
- Test on **complete clean Git checkout**, not the lean exported ZIP: that ZIP intentionally excludes archive/evidence trees, so missing historical links there are not full-repo defects.
- Run a fixed negative suite to ensure each detector can fail when seeded; **a report that always shows green proves nothing**.

## What this does NOT attempt

No auto-editing documentation to align with observed code; no AI deciding whether a game specification is true; no model/embedding dependency; no automatic age-based deletion; no forced renaming of every Markdown file; no new universal database; no resurrecting rejected Cognee tooling; no expensive repo scan on every tool call. Preserve product/technical authority, safety gates and existing linked historical evidence.
