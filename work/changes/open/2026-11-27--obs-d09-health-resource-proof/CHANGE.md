# OBS-D09 | Authenticated health and resource observation

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Real authenticated Grafana datasource health and meaningful role-scoped CPU/memory/Collector samples replace unwired and zero-cadence defaults.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D05 and D07 session, may prepare before D08 to enable A6.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
V/resources.mjs, resource-observation.py, proof-host identity projection, proof.mjs gate, focused tests; shared forwards/auth, no raw node dump or capacity claim.

## Planner gate

F08 health/resources schedule and gate enablement selected; actual Grafana port, exact node profile, independent ratification and readiness remain.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 5–10 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (2 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#proof-ownership-and-safety; record real authenticated datasource and role-scoped sampling path; no capacity claim | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/verification/smoke/observability/resources.mjs, resource-observation.py, proof-host.mjs, proof.mjs and mapped tests; negative: missing/zero/stale samples or failed authentication yields green | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## Conditional first dispatch

Proposed target integration/observability-developer (explicit owner authority required; otherwise held). Dedicated branch change/obs-d09-health-resource-proof. Prerequisite: D08 source join; D07 session and D05 forwards receipts. After ratification, READY/dependency-gated review and explicit bundle commission, check predecessor receipt and source postconditions, run branch guard `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D09 --target integration/observability-developer`, dispatch T01, continue serial own cards. No actual cluster operations in source assembly. Custodian joins offline source receipt to candidate only under approved joint route, never marks Done before final acceptance.
