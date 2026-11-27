# OBS-D06 | Explicit Collector upgrade

**State:** Proposed / PLANNER-BLOCKED; backlog, not commissioned. **Kind:** CONTRACT. **Inspected source baseline:** main `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`; no affected source drift from previous audit at 792f529e. **Owner:** ChatGPT planner; human integration custodian. Dedicated Change branch/worktree only after commission.

## Outcome
One authorized exact dev Collector rev1→rev2 transition with preserved storage/backend/credential identities; current no-op; all other states refuse.

Authority: [R5 canonical contract](../../../../../docs/technical/platform/observability-native-infrastructure.md), [design](../../../../designs/open/observability-developer/README.md), [acceptance](../../../../designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 frozen safety/classification, D05 forwarding; coordinated D07/D08/D09 capability proof before exposure.. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. No source commission, live operation, spend or merge.

## Scope
New P/upgrade.mjs, package.json obs:upgrade, tests/upgrade.test.mjs, operation-specific custody validator only if needed. No generalized installer, rollback/uninstall, release mutation or recovery command.

## Planner gate
F08 upgrade cap, pinned render and exact validator; OD-05 actual affected diagnostic/privacy and developer backend proof before exposure; OD-06/07 route/exclusion.

Candidate cards below are NOT PLANNER-READY. Before promotion reconcile predecessor source/receipts and exact contract, settle named decisions, verify local worktree/custody exclusion, independently review G0–G7 and child contexts, obtain commission. No unresolved mechanism delegated. Active Cursor estimate 8–12 min; not measured, reconsider excessive atomic scope. [TASKS](TASKS.md) (2 assignments) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, focused proof and commit; owner/ChatGPT own heavy proof. No auto-next or early integration.
