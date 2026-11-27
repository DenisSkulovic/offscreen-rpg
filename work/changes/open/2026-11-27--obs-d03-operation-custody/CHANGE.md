# OBS-D03 | Bounded operation custody

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT (source implementation). **Inspected integration baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef` (affected source unchanged since audit at 792f529e). **Owner:** ChatGPT planner; human integration custodian. Dedicated `change/obs-d03-operation-custody` branch/worktree from verified commissioned reference, not created now.

## Outcome
Cooperative observability writers share a stable lock and durable pending intent; failed, cancelled or ambiguous owned process cannot authorize later writes or clear another record.

Authority: [accepted R5 contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [programme acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md). [Pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) defended D01 only; all other staged boundaries remain unratified. Dependencies: D02 full tuple; D04 consumes strict exclusive owned record and finalization; D05 consumes foreground process primitive.. Existing joint certification binds until affected revised boundary is defended and accepted. Open placement does not authorize source work, deployment, proof, spend or merge.

## Scope and exclusions
Own P/custody.mjs, P/forward.mjs owned primitive only, P/exec-owned.py, P/install.mjs mutation result wiring and named custody/forward/install fixtures. D05 owns actual forwarding; D10 owns fixed restoration capability and operation-specific disruption finalization. No generic upgrade engine, global process kill or reset.

## Remaining planner gate

F08 schedule and OD-07 exclusion selected; independent ratification and Linux direct-exec/FD proof, packet readiness remain. D03 owns ensure validator only; D06/D10 their operations.

These are candidate implementation cards, not PLANNER-READY. Before commission resolve named decisions, reconcile actual predecessor source/receipts and shared owners, independently audit G0–G7 and each child context, obtain commission and verify local worktree collision. No Cursor architecture discovery. No public activation or unsafe legacy route; all applicable OD-05–07 conditions and original A/V predicates retained.

## Route
[TASKS](TASKS.md) (3 serial assignments); [SOURCE-MAP](SOURCE-MAP.md); [EXECUTION](EXECUTION.md); [PROOF](PROOF.md). Estimated active Cursor work 10–15 min, not measured; reconsider partition before commission if over ceiling or nonbounded context. Parent verifies owned diff and focused tests, commits exact receipt. Heavy acceptance ChatGPT/owner. No next Change automatically.
