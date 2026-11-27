# OBS-D05 | Foreground WSL connection

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Fixed dev-only loopback access to developer OTLP and Grafana with optional query endpoints; cleanup only owned children.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02 identity, D03 custody/process, D04 classifier; actual pinned Grafana render.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
P/forward.mjs forwarding orchestration, new connect.mjs, package.json obs:connect, tests/forward.test.mjs. No daemon, arbitrary targets, public ingress or SDK.

## Planner gate

F08 preflight/startup/periodic/closure schedule selected; pinned Grafana render, independent ratification and readiness remain.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 5–10 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (2 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#foreground-access; record fixed WSL forwarding only; no signal-acceptance claim | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/forward.mjs, connect.mjs, package.json and mapped tests; negative: foreign port killed or unconfirmed child declared clean | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## Conditional first dispatch

Proposed target integration/observability-developer (explicit owner authority required; otherwise held). Dedicated branch change/obs-d05-foreground-connection. Prerequisite: D04 exact desired/predecessor classifier and D03 owned-child receipt. After ratification, READY/dependency-gated review and explicit bundle commission, check predecessor receipt and source postconditions, run branch guard `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D05 --target integration/observability-developer`, dispatch T01, continue serial own cards. No actual cluster operations in source assembly. Custodian joins offline source receipt to candidate only under approved joint route, never marks Done before final acceptance.
