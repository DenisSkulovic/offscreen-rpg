# OBS-D02 | Frozen target identity

**State:** Proposed / PLANNER-BLOCKED; current sprint, not commissioned. **Kind:** CONTRACT (source implementation). **Inspected integration baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef` (affected source unchanged since audit at 792f529e). **Owner:** ChatGPT planner; human integration custodian. Dedicated `change/obs-d02-target-identity` branch/worktree from verified commissioned reference, not created now.

## Outcome
Every admitted observability operation binds to the verified local Kind target and actual created namespace UID; mismatch or uncertain read cannot authorize the next write.

Authority: [accepted R5 contract](../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../designs/open/observability-developer/README.md), [programme acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md). [Pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) defended D01 only; all other staged boundaries remain unratified. Dependencies: D01 exact descriptor/path receipt; D03 consumes frozen tuple. Existing public callers must remain safe until D04 migration.. Existing joint certification binds until affected revised boundary is defended and accepted. Open placement does not authorize source work, deployment, proof, spend or merge.

## Scope and exclusions
Own P/identity.mjs, scoped read defaults in P/artifacts.mjs and P/install.mjs, corresponding identity/install/readiness/diagnostic-worker fixtures and V/tests/proof.test.mjs identity fields. Common target guard read-only; no global command redesign, new policy, release mutation or upgrade.

## Remaining planner gate

F08 numeric choice and owner assignment specified; independent ratification, local identity shape/trace evidence, coordinated source-route authority and readiness remain. OD-07 owner exclusion is a live/cutover gate, not Cursor compatibility design.

These are candidate implementation cards, not PLANNER-READY. Before commission resolve named decisions, reconcile actual predecessor source/receipts and shared owners, independently audit G0–G7 and each child context, obtain commission and verify local worktree collision. No Cursor architecture discovery. No public activation or unsafe legacy route; all applicable OD-05–07 conditions and original A/V predicates retained.

## Route
[TASKS](TASKS.md) (3 serial assignments); [SOURCE-MAP](SOURCE-MAP.md); [EXECUTION](EXECUTION.md); [PROOF](PROOF.md). Estimated active Cursor work 10–15 min, not measured; reconsider partition before commission if over ceiling or nonbounded context. Parent verifies owned diff and focused tests, commits exact receipt. Heavy acceptance ChatGPT/owner. No next Change automatically.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#identity-and-lock; record frozen target/actual created UID realization; do not certify live identity | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/identity.mjs, artifacts.mjs, install.mjs and mapped tests; negative: changed CA/UID/endpoint or uncertain create authorizes next write | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## Conditional first dispatch

Proposed target integration/observability-developer (explicit owner authority required; otherwise held). Dedicated branch change/obs-d02-target-identity. Prerequisite: D01 exact parity receipt. After ratification, READY/dependency-gated review and explicit bundle commission, check predecessor receipt and source postconditions, run branch guard `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D02 --target integration/observability-developer`, dispatch T01, continue serial own cards. No actual cluster operations in source assembly. Custodian joins offline source receipt to candidate only under approved joint route, never marks Done before final acceptance.
