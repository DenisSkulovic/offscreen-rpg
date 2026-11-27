# OBS-D06 | Explicit Collector upgrade

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
One authorized exact dev Collector rev1→rev2 transition with preserved storage/backend/credential identities; current no-op; all other states refuse.

Authority: [R5 canonical contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 frozen safety/classification, D05 forwarding; coordinated D07/D08/D09 capability proof before exposure.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
New P/upgrade.mjs, package.json obs:upgrade, tests/upgrade.test.mjs, required exact upgrade custody validator and phase. No generalized installer, rollback/uninstall, release mutation or recovery command.

## Planner gate

F08 upgrade schedule and required D06 validator selected; independent ratification, pinned render/projection review and joint live proof remain.

Candidate cards below are NOT PLANNER-READY. Before commission reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 8–12 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (2 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#collector-configuration-upgrade; record exact occupied Collector-only transition; no automatic rollback or release mutation | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/upgrade.mjs, custody.mjs, package.json and mapped tests; negative: changed claim/UID/history accepted or second mutation after uncertainty | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## Conditional first dispatch

Proposed target integration/observability-developer (explicit owner authority required; otherwise held). Dedicated branch change/obs-d06-collector-upgrade. Prerequisite: D05 forwarding, D04 classifier, D03 custody receipt. After ratification, READY/dependency-gated review and explicit bundle commission, check predecessor receipt and source postconditions, run branch guard `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D06 --target integration/observability-developer`, dispatch T01, continue serial own cards. No actual cluster operations in source assembly. Custodian joins offline source receipt to candidate only under approved joint route, never marks Done before final acceptance.
