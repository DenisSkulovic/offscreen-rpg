# TD03 | Persistence and reusable primitives

**State:** Done — source joined to implementation/technical-documentation-renewal; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `a28693dcefe80a3242a870ed03a6c144b47f1ac7` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. No runtime changes between original snapshot and this planning base. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../../../../open/technical-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../../open/technical-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

3 bounded editorial tasks; parent reads [TASKS](TASKS.md), selected task and [PROOF](PROOF.md); source map is planner evidence. Each task has disjoint write ownership; isolated workers may execute at most two at once, parent owns staging, join and final semantic proof. No concurrent writes to active AC/OBS/native owners. Local construction independent of other domain Changes, subject to group transfer boundary and actual ownership. Downstream: TD10; M04.

## Target and write set

Rewrite the following owners into selected requirements/guarantees, legacy realization and actual evidence with correct authority. Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

- `docs/technical/platform/data-and-persistence.md`
- `docs/technical/platform/persistence-and-caching.md`
- `docs/technical/platform/execution-and-delivery.md`

DOC-E1-M04: preserve independently evidenced primitive maturity; do not claim current application qualification.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Dependents | Proof |
| --- | --- | --- | --- |
| Product | Unchanged; preserve accepted intent and stable product heading links | named TASKS anchors, group transfers | before/after semantic comparison |
| Technical | Changed only listed owners; selected guarantees and stored-format compatibility remain | source routes and canonical owners in SOURCE-MAP | source and scope negatives |
| Code | Unchanged: DOC only, no schema, API, runtime/config/fixture edits | existing source anchors are evidence only | actual diff |
| Related | Shared indexes, STATUS, Atlas and runbooks owned by integration or other Changes; no write here | group integration TD10; M04 | report exact affected routes for join |

## Closure

May write only listed paths and own packet closure artifacts. Recheck current branch, HEAD, dirty paths and protected ownership before dispatch. No Ready or commission granted by this file. [PROOF](PROOF.md) gates Change join; group joint acceptance remains. On commissioned completion archive packet before reporting, under current branch/target lock policy.

## Closure receipt

Page commit `92b46aaadb08277859834d9821762fead9b2913b`. Changed: `docs/technical/platform/data-and-persistence.md`, `persistence-and-caching.md`, `execution-and-delivery.md`.

Checks: `git diff --check` clean; `python3 scripts/check_docs.py` 96 problems = baseline 96 (only pre-existing links, line numbers shifted in data-and-persistence.md); `docs-health.mjs` identical to baseline. Link health is not semantic proof. No runtime, SQL, Redis, Temporal or provider check was run (NOT RUN).

Heading mapping: all original headings kept. Added only: authority lead, M04 source-evidence paragraph, binding-invariants table and Durable records index (data-and-persistence); Current state split into Source realization / Independently useful storage candidates / Evidence tiers and limits (persistence-and-caching); selected-contract-versus-local-proof paragraph, scope notes under Implemented sections, selected time authority lines, one-line Commands contract and laboratory scope (execution-and-delivery).

Transfer landed (PD03 GM07): `Implemented decision deadline` and `Implemented solo response deadline` keep their stable headings, state the narrow harmless-invitation exception (`decline-harmless-invitation.v1`, twenty real minutes) with provenance, and say it is never general delegation.

Semantic negatives: T01 dropping a legacy format is not authorized, and prose or cache cannot mutate possession (Who owns the durable record invariants table; Quantities and ownership); a staged upload is not publication (Publication fence). T02 cache loss does not change authority (Redis boundary); a Redis lease does not own a financial operation (Concurrency and origin protection); fixture/fake PASS does not certify cross-Pod restart (Current state / Evidence tiers and limits). T03 a Temporal timer or signal only prompts an SQL reread and does not commit gameplay (Selected contract versus local proof; Game-time targets); a retry returns the stored result and an uncertain effect is not resent (Commands and durable delivery; Retry boundaries); the lab broker is not authoritative game history (Laboratory messaging broker).

Deferred findings: Low, the Implemented subsections of data-and-persistence.md remain long legacy prose (destination: that page's Durable records section). Low, execution-and-delivery.md Current-runtime details in Storyteller workflow identity were not re-inspected against source (destination: group register, custodian). Pre-existing broken links in data-and-persistence.md line 183 not repaired.

## Reconstruction pass (R2)

Why: the first pass (`92b46aaad`) was annotative (+92/-10). R2 executes the card Algorithms as rewrites. Page commit `32bf254ef` (data-and-persistence.md, execution-and-delivery.md; persistence-and-caching.md unchanged in R2).

T03 executed: Commands and durable delivery now owns the delivery contract (the one-line contract absorbed the timer-is-a-hint rule); the opening paragraph's duplicate contract text became a short Selected contract and Local proof pair; Commands, business events, and workflows is a distinct classification scope that points back instead of restating; the duplicated Storyteller start/switch statements were reduced to one owner (Storyteller workflow identity); the repeated browser-time sentence in Elapsed time was removed. Implemented opening, fixed interval and solo response deadline are rewritten as dated realization with the exact relay, lease (30 s), start deadline (10 s), replay, equality and receipt conditions kept; GM07 headings and exception text kept.

T01 executed: the ten Implemented subsections state the present contract, then a one-line realization note. Historical "migration X adds..." sequence is gone. Source check: only `0020`/`0021` exist as migration files; `0003`-`0013` are original provenance names and the tables are in baseline `0000_tiny_pandemic`. The M04 createDatabase note and all headings are kept.

Source corrections (execution-and-delivery.md, read against apps/worker/src/outbox/dispatch.ts, packages/workflows/src/{index,contracts}.ts, apps/worker/src/activities/storyteller-distributed-control.ts): Storyteller topics start with `ALLOW_DUPLICATE_FAILED_ONLY`, not `REJECT_DUPLICATE` (other chamber topics keep REJECT_DUPLICATE); the distributed notice starts `storytellerDistributedV1` on the `control` queue; publish retry classes stated (stale/refused/blocked non-retryable, pending-consequence-not-settled and unavailable retry; no attempt cap; execute allows 5); a stale "STORY03 is not closed" contradicting the archived status was fixed.

Survival check: token inventory (backticked identifiers, link targets, numbers) of both pages diffed old vs new: nothing missing except the corrected `REJECT_DUPLICATE` claim; headings identical.

Checks: `git diff --check` clean; check_docs: only the two pre-existing data-and-persistence.md broken links (now line 181); docs-health adds no problem on these pages. Link health is not semantic proof. No runtime, SQL, Temporal or provider check run (NOT RUN).

Semantic answers: a legacy format may not be dropped (Who owns the durable record, invariants table); a timer or signal never commits gameplay (Commands and durable delivery, contract line; Elapsed time); a retry returns the recorded outcome and an uncertain effect is not resent (Commands and durable delivery; Retry boundaries); the lab broker is not durable game history (Laboratory messaging broker).

Deferred: Low, the packet lacks a `## Reconciliation ledger` heading that docs-health reports (first-pass omission; destination: custodian). Low, relay constants were verified in `packages/outbox/src/relay.ts`, not in the Worker package.

## Reconciliation ledger

| Affected claim/heading | Authority | Target delta | Source delta & SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/platform/data-and-persistence.md` | technical | changed: authority lead, invariants table, Implemented subsections as present contract + realization note; GM07 decision-deadline row retained | pages `92b46aaad`, R2 `32bf254ef`; migrations 0020/0021 and baseline 0000 inspected | source-inspected docs diff | answered in Closure receipt and R2 | headings unchanged |
| `docs/technical/platform/persistence-and-caching.md` | technical | changed: Current state split into realization, candidates, evidence tiers | `92b46aaad` | source-inspected | answered | headings unchanged |
| `docs/technical/platform/execution-and-delivery.md` | technical | changed: commands sections consolidated; workflow identity corrected (ALLOW_DUPLICATE_FAILED_ONLY, retry classes); GM07 solo-response row retained | R2 `32bf254ef`; apps/worker, packages/workflows, packages/outbox inspected | source-inspected | answered | headings unchanged |
| Joint semantic acceptance and transfer completeness | technical | unchanged | none | NOT RUN (TD10 and Design) | n/a | group register |
