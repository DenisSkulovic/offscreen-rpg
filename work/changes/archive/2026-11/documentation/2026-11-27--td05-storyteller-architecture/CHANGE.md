# TD05 | Storyteller architecture

**State:** Done — source joined to `implementation/technical-documentation-renewal`; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `a28693dcefe80a3242a870ed03a6c144b47f1ac7` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. No runtime changes between original snapshot and this planning base. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../../designs/archive/technical-documentation-renewal/README.md) · [Group](../../../../../designs/archive/technical-documentation-renewal/implementation-record/README.md).

**Release:** [group readiness and dispatch](../../../../../designs/archive/technical-documentation-renewal/implementation-record/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

6 bounded editorial tasks; parent reads [TASKS](TASKS.md), selected task and [PROOF](PROOF.md); source map is planner evidence. Each task has disjoint write ownership; isolated workers may execute at most two at once, parent owns staging, join and final semantic proof. No concurrent writes to active AC/OBS/native owners. Local construction independent of other domain Changes, subject to group transfer boundary and actual ownership. Downstream: TD10; PD01/PD02/PD05 transfers.

## Target and write set

Rewrite the following owners into selected requirements/guarantees, legacy realization and actual evidence with correct authority. Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

- `docs/technical/storyteller/canonical-documents-and-packages.md`
- `docs/technical/storyteller/context-and-memory.md`
- `docs/technical/storyteller/context-selection-and-recall.md`
- `docs/technical/storyteller/operation-and-controller.md`
- `packages/storyteller/README.md`
- `docs/technical/storyteller/generation-and-publication.md`
- `docs/technical/storyteller/prompts-and-tools.md`
- `docs/technical/storyteller/provider-boundary.md`
- `docs/technical/storyteller/request-context-and-cost.md`
- `docs/technical/storyteller/versioned-settings.md`

No new finding; preserve the accepted Design and scoped evidence.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Dependents | Proof |
| --- | --- | --- | --- |
| Product | Unchanged; preserve accepted intent and stable product heading links | named TASKS anchors, group transfers | before/after semantic comparison |
| Technical | Changed only listed owners; selected guarantees and stored-format compatibility remain | source routes and canonical owners in SOURCE-MAP | source and scope negatives |
| Code | Unchanged: DOC only, no schema, API, runtime/config/fixture edits | existing source anchors are evidence only | actual diff |
| Related | Shared indexes, STATUS, Atlas and runbooks owned by integration or other Changes; no write here | group integration TD10; PD01/PD02/PD05 transfers | report exact affected routes for join |

## Closure

May write only listed paths and own packet closure artifacts. Recheck current branch, HEAD, dirty paths and protected ownership before dispatch. No Ready or commission granted by this file. [PROOF](PROOF.md) gates Change join; group joint acceptance remains. On commissioned completion archive packet before reporting, under current branch/target lock policy.

## Closure receipt

Page commit `f1529e800e8e1358962158f8752cc8e461ee5c74`. Changed: the nine `docs/technical/storyteller/` owners and `packages/storyteller/README.md` (no other paths).

**Checks.** `git diff --check` PASS. `check_docs.py` 96 -> 92 problems (the four stale `packages/application` links in `packages/storyteller/README.md` removed; no new problem). `docs-health.mjs` 3 violations, identical to baseline. Link health is not semantic proof. No runtime tests, provider, cluster or DB (NOT RUN by design).

**Transfers landed.** PD01 concepts -> operation-and-controller "Execution and storage concepts: dated realization of the vocabulary" (under Current prototype runtime; generation-and-publication links it). PD02 rules Executable library shape -> prompts-and-tools "Executable rules library shape (bounded mechanism)" (under Selected compilation and tool contract). PD02 continuity Context and cost -> context-selection-and-recall "Storyteller-facing memory tools". PD05 -> versioned-settings "Recorded legacy product observation: editor boundary" (under Current adapters). Product copies untouched.

**Structural moves.** context-and-memory reduced to an owner table plus one-line routes (all headings kept). generation-and-publication: three overlapping "retained" guarantee blocks merged without losing a refusal; WR09B moved beside WR11 and both scoped as legacy; scripted claim/save seam moved in from operation page. Memory protocol and persisted-controller paragraphs moved from operation-and-controller to context-selection-and-recall "Exploration protocol and persisted controller". Indexes-are-not-authority and prompts fork negative/task-pack restatements replaced by links to their owners. Import-only-publishes-manifest fact moved to Campaign bootstrap.

**Semantic negatives.** T01: inherited manifest keeps ancestor bytes (Inherited manifest campaign id, alternative 1 rejected); index never truth (Indexes are not authority; context-and-memory Role); no duplicate owner (Selected requirements and current realization). T02: snippet is a lead (Selected requirements; What source enters this task); index scoped to branch (Indexes are rebuildable aids); exact identity required (Selected requirements). T03: Agent Core not runtime (Reading order; package absent at baseline); WR03 is dated fixture, later writer-research source exists (Current prototype runtime); packages/application deleted (README table); round is not scene (Current prototype runtime, Execution and storage concepts). T04: saved response checked at fence; model output not self-publishing; replay no resend (page lead; Scene publication fence; Remote task custody). T05: dry-run not a call; missing usage unknown (provider-boundary lead, Safety boundaries); prefix is not a hit (request-context lead); prompt cannot mint tool (prompts-and-tools lead). T06: save never rewrites captured plan (Captured revision and a later edit); absent permission not a grant (Canon invention policy); API route not editor qualification (editor boundary Source scope).

**Deferred findings.** Medium: the product-page copies and the technical receivers now coexist until PD07 (destination: group register, custodian). Medium: request-context-and-cost and canonical-documents remain long; further condensation deferred (destination: this page set own sections). Low: historical `packages/application` test paths in generation-and-publication evidence prose are retained as dated provenance; the WR10 link `work/changes/open/2026-11-22--wr10...` was already broken at baseline.

## Reconciliation ledger

| Affected claim/heading | Authority | Target delta | Source delta & SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/storyteller/*` (9 pages), `packages/storyteller/README.md` | technical | changed: owner table for context-and-memory, merged publication guarantees, controller/memory moves, stale links corrected | page `f1529e800`; story-engine recovery/context/publication inspected | source-inspected docs diff | answered in Closure receipt | headings unchanged |
| PD01/PD02/PD05 transfer rows → operation-and-controller, prompts-and-tools, context-selection-and-recall, versioned-settings | technical | changed: frozen facts landed with provenance | `f1529e800` | source-inspected | answered | product copies stay until PD07 |
| Deferred: provider-boundary and request-context-and-cost thinner restructuring | technical | Medium, destination these pages | n/a | n/a | n/a | group register |
| Joint semantic acceptance and transfer completeness | technical | unchanged | none | NOT RUN (TD10 and Design) | n/a | group register |
