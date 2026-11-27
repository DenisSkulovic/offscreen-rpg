# OBS-D07 | Safe synthetic proof ownership

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Real strict diagnostic query/privacy proof with durable per-create UID ownership and no namespace cascade.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 safety and classifier, D05 owned helper as needed; may prepare on coordinated candidate before activation.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
V/proof-host.mjs, proof.mjs, signals.mjs, new proof-resources.mjs, signal-probe.py and named tests. D07 T01 also disables the legacy direct partial-install executable guard; D08–D11 gates stay disabled until own safe wiring. No cascade or host Python fallback.

## Planner gate

F08 proof schedule, public dispatcher quarantine and direct legacy wrapper refusal specified; independent ratification, UID proxy feasibility and source readiness remain. Actual A7/V09 later on coordinated candidate.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 8–12 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (3 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.
