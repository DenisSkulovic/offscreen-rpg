# TD04 | Game engine and Game Authority

**State:** Done — source joined to implementation/technical-documentation-renewal; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `a28693dcefe80a3242a870ed03a6c144b47f1ac7` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. No runtime changes between original snapshot and this planning base. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../../../../open/technical-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../../open/technical-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

5 bounded editorial tasks; parent reads [TASKS](TASKS.md), selected task and [PROOF](PROOF.md); source map is planner evidence. Each task has disjoint write ownership; isolated workers may execute at most two at once, parent owns staging, join and final semantic proof. No concurrent writes to active AC/OBS/native owners. Local construction independent of other domain Changes, subject to group transfer boundary and actual ownership. Downstream: TD10; M01; PD02 transfers.

## Target and write set

Rewrite the following owners into selected requirements/guarantees, legacy realization and actual evidence with correct authority. Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

- `docs/technical/engine/authority-and-transitions.md`
- `docs/technical/engine/concurrency-and-recovery.md`
- `docs/technical/engine/calendars-and-world-time.md`
- `docs/technical/engine/chronology-and-activities.md`
- `docs/technical/engine/ticks-and-tags.md`
- `docs/technical/engine/mechanics-and-capabilities.md`
- `docs/technical/engine/lifecycle-and-compatibility.md`
- `docs/technical/engine/selected-architecture.md`
- `docs/decisions/D-0001--modular-engine.md`
- `packages/story-engine/README.md`

DOC-E1-M01: keep mechanical-authority prohibition and dated D-0001 choice distinct; do not revoke or newly ratify architecture.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Dependents | Proof |
| --- | --- | --- | --- |
| Product | Unchanged; preserve accepted intent and stable product heading links | named TASKS anchors, group transfers | before/after semantic comparison |
| Technical | Changed only listed owners; selected guarantees and stored-format compatibility remain | source routes and canonical owners in SOURCE-MAP | source and scope negatives |
| Code | Unchanged: DOC only, no schema, API, runtime/config/fixture edits | existing source anchors are evidence only | actual diff |
| Related | Shared indexes, STATUS, Atlas and runbooks owned by integration or other Changes; no write here | group integration TD10; M01; PD02 transfers | report exact affected routes for join |

## Closure

May write only listed paths and own packet closure artifacts. Recheck current branch, HEAD, dirty paths and protected ownership before dispatch. No Ready or commission granted by this file. [PROOF](PROOF.md) gates Change join; group joint acceptance remains. On commissioned completion archive packet before reporting, under current branch/target lock policy.

## Closure receipt

Page commit `f55b8e9de2f3a3be996337f309ecc7ebdcb51114`. Changed: the eight engine pages, `docs/decisions/D-0001--modular-engine.md`, `packages/story-engine/README.md`.

Checks: `git diff --check` clean; `check_docs.py` 96 to 94 problems (fixed the stale OBS04 and MA12 links; no new); `docs-health` unchanged at 3 pre-existing violations. Link health is not semantic proof. Runtime tests, source builds: NOT RUN.

Transfers landed: PD02 rules to `mechanics-and-capabilities.md` (Supported mechanisms and the future kernel; Persistence and known limits); PD02 time-and-autonomy to `ticks-and-tags.md` (Fixed real-second scheduling and fictional time, new h3 Existing narrative rehearsal adapter); PD02 continuity scene-frame.v1 to `mechanics-and-capabilities.md` (Opportunity boundary, unratified). Product text unchanged.

Semantic negatives (all answered from rewritten text): T01 authority-and-transitions Selected authority contract, Situation authorization, Commands recovery; concurrency Proof boundary and What C1 and C2 actually proved. T02 ticks-and-tags rehearsal adapter and header; chronology Permission to advance, Decisions with deadlines; calendars Shared settlement. T03 mechanics Supported mechanisms, Start eligibility is not ongoing validity, Persistence and known limits. T04 lifecycle Forked continuities, Start exactly the reviewed story, Workflow replay compatibility. T05 selected-architecture Package-boundary evolution criterion and Source-reality checkpoint; D-0001 Choice and Continuity.

Findings: Medium, source routes under `packages/application` in older evidence text are annotated with current paths rather than rewritten (destination: the pages' own evidence paragraphs). Low, calendars and lifecycle bodies largely retained (group register, custodian). Medium, 8 stories/campaign to storyteller reverse imports remain MA09 debt (selected-architecture).

## Reconciliation ledger

| Affected claim/heading | Authority | Target delta | Source delta & SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/engine/*` (8 pages), D-0001, `packages/story-engine/README.md` | technical | changed: selected-vs-legacy splits, stale packages/application paths corrected, MA history condensed | page `f55b8e9de`; story-engine, outbox, tools/api-lab inspected | source-inspected docs diff | answered in Closure receipt | headings unchanged |
| PD02 transfer rows → mechanics-and-capabilities, ticks-and-tags | technical | changed: frozen facts landed with provenance | `f55b8e9de` | source-inspected (20 s constant located) | answered | product copies stay until PD07 |
| Deferred: lifecycle/calendars mostly reframed; equal-tick prose; offer-reuse/dormancy notes | technical | Medium/Low, destination these pages | n/a | n/a | n/a | group register |
| Joint semantic acceptance and transfer completeness | technical | unchanged | none | NOT RUN (TD10 and Design) | n/a | group register |
