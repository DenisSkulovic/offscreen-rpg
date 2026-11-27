# OBS-D03 | Bounded operation custody

**State:** OWNER-RELEASED — OFFLINE SOURCE ONLY (dependency-gated); independent readiness verdict not yet PASS. **Kind:** CONTRACT (source implementation). **Inspected source:** main `e7a6eed5789401737701d2bff38a1b54ec3085d4` (prior inspected source and intervening docs-only observability edits; recheck affected anchors). **Integration:** `implementation/observability-developer`. The OBS-D03 source branch is already merged there. Do not recreate `integration/observability-developer`. The planner owns the packet.

## Outcome
Cooperative observability writers share a stable lock and durable pending intent; failed, cancelled or ambiguous owned process cannot authorize later writes or clear another record.

Authority: [accepted R5 contract](././././docs/technical/platform/observability-native-infrastructure.md), [design](./././designs/open/observability-developer/README.md), [programme acceptance](./././designs/open/observability-developer/ACCEPTANCE.md). [Pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) defended D01 only; all other staged boundaries remain unratified. Dependencies: D02 full tuple; D04 consumes strict exclusive owned record and finalization; D05 consumes foreground process primitive. Existing joint certification binds until affected revised boundary is defended and accepted. Owner's explicit release authorizes offline implementation only; no live operation, deployment, spend or main merge.

## Scope and exclusions
Own P/custody.mjs, P/forward.mjs owned primitive only, P/exec-owned.py, P/install.mjs mutation result wiring and named custody/forward/install fixtures. D05 owns actual forwarding; D10 owns fixed restoration capability and operation-specific disruption finalization. No generic upgrade engine, global process kill or reset.

## Source release and remaining proof

Stable lock/record compare, inherited FD/parent death and cancellation tests; stop if a write can proceed after uncertainty or foreign ownership can clear a record.

Owner directed immediate release of this frozen candidate for reversible offline implementation despite outstanding independent review. This is not a READY verdict or canonical ratification. Prior G0 rejection and unreviewed G1–G7 remain visible; no architecture choice delegated. Parent checks predecessor receipt, local ownership and named anchors, runs focused positive/negative tests, and reports actual blockers with exact source evidence. No broad review or repeated approval before dispatch. When this Change's own source gate passes, archive its packet on the implementation branch and record the joint A1–A12/V01–V12 obligations on the Design. Do not mark those joint gates passed. No live activation or main merge.

[TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). The implementation coordinator owns the diff, focused proof, archival, commit, serialized source join and clean worktree retirement when the Change-level gate passes. The acceptance lead and owner own joint A1–A12/V01–V12 proof. Pending joint acceptance does not mark the Change Done, does not keep its packet in open, and does not retain the worktree after the permitted source join.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#identity-and-lock; record stable lock, exact ensure record, bounded child custody realization; no new authority | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/custody.mjs, forward.mjs, exec-owned.py, install.mjs and mapped tests; negative: foreign/replaced pending, cancelled or unclosed child allows clear/write | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: OBS-D02 is already on `implementation/observability-developer`. OBS-D03 is already merged there too. Do not start it again from the retired integration ref. Design-level A1–A12/V01–V12 acceptance remains pending. Do not join main. Do not start another Change.
