# OBS-D11 | Isolated partial-install verification

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Actual public installer fails at Loki after successful Prometheus, retains exact state and durable fence; repeat refuses without mutation.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 safety/classifier, D07 session; D10 independent, shared write owners serialized.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
V/partial-install.mjs, proof-host/proof, P/custody.mjs read-only inspect, infra/verification/diagnostic-engine.mjs optional bounded process runner and tests. Owner-only fault fixture; no production bypass or runtime policy creation/deletion.

## Planner gate
Accepted quota vs admission-policy candidate A9 mechanism, pinned feasibility, F08 outer process containment and exact isolated target; OD-06/07 exclusion. No working dev.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 10–15 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (3 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.
