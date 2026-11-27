# OBS-D11 | Isolated partial-install verification

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Actual public installer fails at Loki after successful Prometheus, retains exact state and durable fence; repeat refuses without mutation.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 safety/classifier, D07 session; D10 independent, shared write owners serialized.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
V/partial-install.mjs, proof-host/proof, P/custody.mjs read-only inspect, infra/verification/diagnostic-engine.mjs optional bounded process runner and tests. Owner-only fault fixture; no production bypass or runtime policy creation/deletion.

## Planner gate

F08 first/repeat and outer process schedule specified; D11 sole runner extension owner. A9 admission rejection candidate still requires pinned feasibility and independent ratification (accepted quota remains binding). Isolated target permission and readiness remain.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 10–15 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (3 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#certification-continuity; record independently accepted A9 mechanism and retained failure/refusal only | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/verification/smoke/observability/partial-install.mjs, proof-host.mjs, proof.mjs, infra/platform/observability/custody.mjs, infra/verification/diagnostic-engine.mjs and mapped tests; negative: later release, wrong target, changed pending or repeat write earns acceptance | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## Conditional first dispatch

Proposed target integration/observability-developer (explicit owner authority required; otherwise held). Dedicated branch change/obs-d11-partial-install-proof. Prerequisite: D10 source join for shared owners; D07 session, D04 inventory and D03 custody receipts. After ratification, READY/dependency-gated review and explicit bundle commission, check predecessor receipt and source postconditions, run branch guard `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D11 --target integration/observability-developer`, dispatch T01, continue serial own cards. No actual cluster operations in source assembly. Custodian joins offline source receipt to candidate only under approved joint route, never marks Done before final acceptance.
