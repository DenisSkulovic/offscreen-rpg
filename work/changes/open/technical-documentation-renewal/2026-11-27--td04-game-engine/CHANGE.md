# TD04 | Game engine and Game Authority

**State:** Proposed; independent readiness pending; not commissioned. **Kind:** DOC. **Base:** `a28693dcefe80a3242a870ed03a6c144b47f1ac7` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. No runtime changes between original snapshot and this planning base. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../README.md).

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
