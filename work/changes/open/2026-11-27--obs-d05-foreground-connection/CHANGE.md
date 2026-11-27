# OBS-D05 | Foreground WSL connection

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Fixed dev-only loopback access to developer OTLP and Grafana with optional query endpoints; cleanup only owned children.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02 identity, D03 custody/process, D04 classifier; actual pinned Grafana render.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
P/forward.mjs forwarding orchestration, new connect.mjs, package.json obs:connect, tests/forward.test.mjs. No daemon, arbitrary targets, public ingress or SDK.

## Planner gate
Pinned Grafana Service/targetPort and F08 startup/periodic/termination caps; OD-05–07 affected route/cross-version closure.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 5–10 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (2 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.
