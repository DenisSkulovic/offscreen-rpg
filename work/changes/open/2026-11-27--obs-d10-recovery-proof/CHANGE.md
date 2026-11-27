# OBS-D10 | Persistence and outage verification

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
Isolated backend restart and Tempo outage proof preserves data/identities, query-only replay and fresh recovery with bounded compensation.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 safety; D07 resource/session/synthetic queries; D06 projection as applicable. D11 independent.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
P/custody.mjs operation-specific validator/restoration, V/disruptions.mjs, proof-host/proof gate, focused tests. No generic restore, arbitrary patch, retry or live Cursor proof.

## Planner gate

F08 exact restart/outage/restoration arithmetic and D10-only validator ownership specified; independent ratification, isolated target permission and full readiness remain.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 10–15 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (3 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#proof-ownership-and-safety; record isolated persistence and bounded fixed compensation; retain uncertain fence | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/custody.mjs, infra/verification/smoke/observability/disruptions.mjs, proof-host.mjs, proof.mjs and mapped tests; negative: replay POST, replacement UID or uncertain restore allows retry/clear | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## Conditional first dispatch

Proposed target integration/observability-developer (explicit owner authority required; otherwise held). Dedicated branch change/obs-d10-recovery-proof. Prerequisite: D09 source join; D07 proof lifecycle, D06 projection and D03 custody receipts. After ratification, READY/dependency-gated review and explicit bundle commission, check predecessor receipt and source postconditions, run branch guard `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D10 --target integration/observability-developer`, dispatch T01, continue serial own cards. No actual cluster operations in source assembly. Custodian joins offline source receipt to candidate only under approved joint route, never marks Done before final acceptance.
