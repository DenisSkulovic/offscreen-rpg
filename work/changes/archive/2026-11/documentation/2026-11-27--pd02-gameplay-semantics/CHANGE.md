# PD02 | Gameplay semantics

**State:** Done — source joined to `implementation/product-documentation-renewal`; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `a28693dcefe80a3242a870ed03a6c144b47f1ac7` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. No runtime changes between original snapshot and this planning base. **Target:** `implementation/product-documentation-renewal`. [Accepted Design](../../../../../designs/archive/product-documentation-renewal/README.md) · [Group](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md).

**Release:** [group readiness and dispatch](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

4 bounded editorial tasks; parent reads [TASKS](TASKS.md), selected task and [PROOF](PROOF.md); source map is planner evidence. Each task has disjoint write ownership; isolated workers may execute at most two at once, parent owns staging, join and final semantic proof. No concurrent writes to active AC/OBS/native owners. Local construction independent of other domain Changes, subject to group transfer boundary and actual ownership. Downstream: PD07; transfers to TD04 and TD05.

## Target and write set

Rewrite the following owners into selected requirements/guarantees, legacy realization and actual evidence with correct authority. Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

- `docs/product/gameplay/actions-and-commitments.md`
- `docs/product/gameplay/worlds-and-characters.md`
- `docs/product/gameplay/rules.md`
- `docs/product/gameplay/time-and-autonomy.md`
- `docs/product/gameplay/continuity.md`

No new finding; preserve the accepted Design and scoped evidence.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Dependents | Proof |
| --- | --- | --- | --- |
| Product | Selected product prose changes in listed paths; no technical choice | named TASKS anchors, group transfers | before/after semantic comparison |
| Technical | Unchanged; no deletion of unique legacy facts before technical successor on main | source routes and canonical owners in SOURCE-MAP | source and scope negatives |
| Code | Unchanged: DOC only, no schema, API, runtime/config/fixture edits | existing source anchors are evidence only | actual diff |
| Related | Shared indexes, STATUS, Atlas and runbooks owned by integration or other Changes; no write here | group integration PD07; transfers to TD04 and TD05 | report exact affected routes for join |

## Closure

May write only listed paths and own packet closure artifacts. Recheck current branch, HEAD, dirty paths and protected ownership before dispatch. No Ready or commission granted by this file. [PROOF](PROOF.md) gates Change join; group joint acceptance remains. On commissioned completion archive packet before reporting, under current branch/target lock policy.

## Closure receipt

Page commit `b5556febad7429794c3d2a4f201a19c2108d5f5a`. Changed paths: the five owned `docs/product/gameplay/` pages only (actions-and-commitments, worlds-and-characters, rules, time-and-autonomy, continuity).

Checks: `git diff --check` PASS; `python3 scripts/check_docs.py` PASS against baseline (97 lines, identical sorted set, no new problem); `docs-health.mjs` PASS against baseline (identical apart from timing lines). Link health is not semantic proof. Source and runtime proof NOT RUN (DOC only). Joint semantic acceptance NOT RUN.

Heading mapping: every original heading and anchor kept unchanged. Moved content: advantage/disadvantage paragraph moved from Executable library shape to First rules subset; ordinary-action/check-necessity paragraph moved to Choice breadth (mechanical). Authority split now separates product rights from the scoped `item.create.v1`/`item.transfer.v1` realization. Executable library shape leads with the bounded-rules requirement; recipe/compilation metadata is labelled scoped (TD05 receives).

Transfer facts preserved in place (TD04/TD05 receive; PD07 removes later): rules.md Authority split, First rules subset, Implemented entry and honest limits, Resumption, Executable library shape; time-and-autonomy.md Existing narrative rehearsal adapter; continuity.md scene-frame.v1 candidate and ask_memory/read_memory.

Semantic negatives: T01 offer never authorizes later actions (actions-and-commitments Stable meanings, Opportunity versus permission); galaxy needs no humanoid sheet (worlds-and-characters Flexible settings and protagonists); shared play not delivered (Shared play). T02 narrative never transfers ownership (rules Authority split, Product rights); unknown rules held, not improvised (Rule libraries and adapters, Executable library shape); preview not mandatory (Resumption); fixtures prove only listed fixtures (Implemented entry and honest limits). T03 latency is zero fictional time (time-and-autonomy opening, Clock, consequences and narration); faster playback keeps dice and due events (Pace); twenty seconds is a temporary adapter (Existing narrative rehearsal adapter). T04 missing context is not deletion (Knowledge and perspective); prepared future is not history (What happened, what is true, what might happen); recap cannot restore a sold spear (Six kinds of record); map view does not relocate (Space, movement and maps).

Deferred findings: Low, rules.md/time-and-autonomy.md still link technical successors that exist today but whose receiving text has not landed; destination group register (custodian) / PD07 transfer verification.

## Reconstruction pass (R2)

Why: the first pass (`b5556feba`) mostly inserted scoping sentences; an independent audit named sections still unrewritten. Page commit `8bf2297e8` (same five-page write set; worlds-and-characters left unchanged because its text was already clear and scoped).

Algorithm instructions now executed:
- T01: actions-and-commitments "Prepared local life" rewritten into prepared / player-without-inference / possible-results, with the duplicate framing sentences removed.
- T02: rules "Implemented entry and honest limits" regrouped into one dated realization note (exists / proves / stays outside); "Executable library shape" split into a requirement and a scoped realization (library, recipes, tiers) with the duplicated licensing and whole-rulebook sentences merged.
- T03: time-and-autonomy "Pause and resume" and "First playable scope" rewritten around permission to advance and player control (who may pause, four separate controls; required, timed fallback, not required).
- T04: continuity scene-frame.v1 and "Context and cost" split into requirement versus scoped candidate/realization (ask_memory/read_memory stay in place for TD05).
- Softened unsupported claims: "No model owns dice or effects" now rests on the Negative (model prose cannot settle dice or effects); "unknown rule is held or narrowed" now says a required rule or adapter that is unavailable holds or narrows the task (Rule libraries and adapters).

Survival check: every frozen transfer fact, number, identifier, anchor and link is present in place; removed text was a pure duplicate with a named surviving copy. Checks: `git diff --check` PASS; `check_docs.py` identical to baseline (96 problems); `docs-health.mjs` no new violation beyond the missing ledger below. Source/runtime NOT RUN. Link health is not semantic proof.

Semantic answers: offer never authorizes later actions (actions Stable meanings, Prepared local life); galaxy needs no humanoid sheet (worlds Flexible settings); narrative never transfers ownership (rules Authority split); unknown or unavailable rules are not improvised (Rule libraries and adapters); fixtures prove only listed fixtures (Implemented entry); latency is zero fictional time and 20 s is a temporary adapter (time opening, Existing narrative rehearsal adapter); missing context is not deletion and a recap cannot restore a sold spear (continuity Knowledge and perspective, Six kinds of record).

Deferred Low: transfer text still duplicated in product pages until TD04/TD05 land (PD07).

## Reconciliation ledger

| Obligation | Outcome |
| --- | --- |
| Five product pages reconstructed | PASS (source docs diff) |
| Transfer facts kept in place for TD04/TD05 | PASS |
| Joint semantic acceptance | NOT RUN (PD07/TD10 and Design) |
