# WIKI08 | Detect false wiki content and repair the highest-risk reader traps

**State: Proposed, not selected.** Code-bearing developer-tooling Change (a local content-risk scanner + tests), bundled with **limited, source-verified wiki copy repairs**. Depends on WIKI06 authority policy and WIKI07 section routing. **No real model/provider calls, gameplay code or production operations.**
**Sources:** [independent content audit](../../../designs/open/wiki-operating-model/CONTENT-AUDIT.md), [quality evaluation](../../../designs/open/wiki-operating-model/QUALITY-AND-EXPERIMENTS.md), [truth/admission contract](../../../designs/open/wiki-operating-model/TRUTH-AND-LIFECYCLE.md).
**Observed review baseline:** `main@91c28452070c98627656fa633bde74cce24a6241`; inspect fresh current tree before editing.

## Goal

A healthy graph is not a true encyclopedia. Add **content-level review instrumentation** that catches *candidates* for stale current claims, false authority, high context friction and duplicate contracts, while avoiding the delusion that regex can prove semantics. Then fix a **named set of already-observed defects** with source/contract evidence, preserving selected future requirements and negative cases.

**Implement:**
```bash
pnpm wiki:content-health
pnpm wiki:content-health --json
pnpm wiki:content-health --changed <base-sha>
pnpm wiki:content-health --self-test
```

Default zero-model, local read-only, outputs under gitignored `out/wiki-health/<sha>/` with schema `wiki.content-health.v1`. Do not let it rewrite files.

## A. Deterministic risk detector, not a truth engine

Use WIKI01 AST and WIKI07 section indexes; produce per-issue path, line, heading, **short exact quote**, risk class, candidate severity, next evidence step, counterexample/false-positive basis and owner. At minimum:

1. **Unratified content in canonical page**: page says “proposal only,” “not selected” or relies on its file location for authority. Distinguish `selected future target, unimplemented` (valid) from `unaccepted future` (governance issue). Scanner reports `review required`, never auto-moves.
2. **Volatile realization claims:** W-series “planned / not implemented,” exact source/export commands, “CI not ready,” old source-inspected statuses. Compare known package-script names in scopes when possible; a matching script is evidence of presence, **not** proof its runtime/CI succeeds.
3. **Historical source-as-current owner:** maintained instructions whose default action routes to `research/legacy-engineering` or dated `evidence/inspections` rather than nearest current source README/skill. Allow deliberate dated evidence citation.
4. **Content economics:** huge H2/H3 blocks, very long paragraphs, missing question→subsection route, stale first-screen migration text. Configurable threshold warnings grouped per owner type, not mandatory max bytes.
5. **Duplicate/contradictory candidates:** exact/near-duplicate paragraphs and conflicting permission/status phrases across selected wiki owners. Report for human review; one semantic mismatch cannot be resolved by a naive shingle score.
6. **Source/claim link precision:** repo-relative paths inside high-risk status claims that no longer exist, heading anchors that changed, and stale references in .agents instruction files. Do not infer source truth from an unchecked backtick symbol.

Reductions in warning count are not proof of truth. Preserve waived/false-positive reasons with code/version and actual review evidence. No blanket “content health 99%” score.

## B. Finite, real content remediation tasks

### B1. Current local runbook (critical)

`docs/runbooks/local-development.md` says W01 `test:watch` and W20 `test:fast` are **not implemented**, even though `apps/web/package.json` contains both and root `package.json` contains `test:fast`. Inspect exact scripts, source/test safety and W21 CI state. Fix current command wording and constraints; remove source-era planning paragraph, **do not claim test pass without running it**. Distinguish a command's presence from its actual execution.

Replace the “chosen frontend execution playbook” pointer into `research/legacy-engineering/frontend-execution-playbook.md` with the maintained `.agents/skills/frontend-engineering/SKILL.md` / current client architecture/source README where appropriate. Promote any unique safe cache/command tip before demoting old playbook; historic research is not a current default executor.

### B2. Product first-screen de-archaeology (medium)

For `docs/product/experience/{principles,navigation-and-stories,play-and-decisions,presentation,entry-and-onboarding,settings-and-accessibility}.md` and `docs/product/storyteller/behavior-and-quality.md`, inspect old “Owner (DOC01 P2), reconciles former programs” intros. Replace with **selected present obligation / owns / does not own / useful owner route** within 5–12 lines. Preserve real product meaning, examples, restrictions and negative cases. Historical provenance stays in the preserved DOC01 Change packets; a short source note at bottom is allowed if essential. No wholesale rewrite of body text or accidental product ratification.

### B3. Historical code-map pointers (medium/high)

`docs/technical/platform/topology.md` currently directs readers to `evidence/inspections/doc01-retained-observations/engineering/code-navigation.md` for “actual entry points/current coupling.” `docs/technical/storyteller/context-and-memory.md` similarly recommends a dated engine-model inspection for the implemented boundary. Reinspect current package/source READMEs and replace active source-navigation recommendation with current owner; keep old observations only as explicitly dated evidence. Do not claim these old observations themselves were factually wrong at the time.

### B4. Expensive section navigation (high)

On `docs/technical/storyteller/context-and-memory.md` (~62 KB) and `docs/technical/storyteller/operation-and-controller.md` (~39 KB), inspect the existing sections most frequently hit by a coding agent. Split H2/H3 for **independent conceptual chunks**, improve question→heading routes and apply WIKI07 `wiki:read`; preserve every relevant rule, rejection case, source version and interleaving. Measure actual subsection excerpt bytes and exact question→section success before/after. No mass fragmenting by line limit. If owner coherence would be compromised, retain the section and rely on bounded excerpt/outline, explaining why.

### B5. Observability proposal-only canonical pages (owner governance checkpoint)

Inspect `docs/technical/observability/{capture-and-provenance,telemetry-and-diagnostics,identities-and-evidence}.md` clause by clause against selected architecture, product authority and open OBS04. Their current “proposal only/not installed/not authorized” status is **not** cured by adding a link. No silent acceptance of Grafana, raw prompt grants or the universal event writer.

**Default recommended** if unratified: move the unapproved design options to named `work/designs/open/observability/` pages (no loss, maintain exact active OBS04 and technical index links); promote individually *selected* constraints to their current technical owners. If already ratified by explicit owner authority, keep selected invariants under `docs/technical` and identify the decision; source status remains `absent` as appropriate. Do not infer ratification from a prior wiki migration or a “no code authorized” phrase. If decision evidence is insufficient, flag a precise owner gate, not a false Done verdict for the claim.

Reclassification **changes canonical page denominator** if done; report `before pages / after pages` and reachability for both. The full terminal Change archive remains byte-for-byte unchanged; inbound links to open proposals remain labeled proposed.

### B6. Current agent-rule hygiene (small)

Fix remaining fake ` symbols in `.agents/rules/documentation.md` and `.agents/references/documentation-navigation-standard.md` and stale “G3 move” / retired technical page references while already touching the rules under WIKI06/07. Do not duplicate or overwrite earlier changes; coordinate with their final diffs. This is a targeted cleanup, not another giant governance document.

## C. Reviewed claim benchmarks, not only static flags

Establish an initial **30 source- and owner-checked claims** using the [quality protocol](../../../designs/open/wiki-operating-model/QUALITY-AND-EXPERIMENTS.md): 8 high-risk authority, 8 source reality, 8 selected future target and 6 navigation/rejection. Freeze actual owner heading, source SHA/test tier, expected assertion and meaningful negative counterexample. Scanner can test paths/phrases, but human/independent reviewer must judge whether the claim is true; author-reviewed gold is not independent truth.

Report counts: critical factual mismatches; unresolved authority contradictions; historical-as-current source links; section-size warnings; claims correctly tiered / evidence missing; actual repaired cases and remaining manual review backlog. **Do not extrapolate 30 sampled claims to 100% wiki correctness.**

Perform negative/mutation fixtures: known stale W20 paragraph, proposal-only canonical intro, historical citation that is valid versus historical “binding” owner, a giant undivided section, a harmless code snippet saying “not implemented,” and a wrong permission test. The validator must avoid rewriting valid docs just to turn its own warnings green.

## D. Safe completion and exclusions

Allowed: content-risk executable+fixtures, a small package script, the limited pages B1–B4, scoped observability classification with owner review B5, and reconciliation of linked active agent rules B6. Forbidden: implementing in-game features, runtime changes, paid/provider use, global AI page rewriting, changing selected product rules, deleting archived Changes, rewriting every wiki page or treating old dates as sufficient evidence of error.

Run `pnpm wiki:health`, `pnpm wiki:bench:static` with preserved metric version, `pnpm wiki:content-health` including mutation tests, `python scripts/check_docs.py`, targeted safe checks and diff. Report exact SHA/dirty flag and actual scripts run. A failing content-claim gate remains **open/blocked** with explicit owner decision, not a quiet “everything verified.”

**WIKI08 Done means:** instrumented risk scanner validated on negative fixtures, named real stale instructions repaired, high-traffic selected pages easier to read selectively, proposal authority boundaries not falsely upgraded, source status/evidence explicit, actual measured outputs. WIKI08 does **not** claim to have independently semantically audited every paragraph in 74 pages.

Use [PLAN](PLAN.md) and [VERIFICATION](VERIFICATION.md) to implement sequentially.
