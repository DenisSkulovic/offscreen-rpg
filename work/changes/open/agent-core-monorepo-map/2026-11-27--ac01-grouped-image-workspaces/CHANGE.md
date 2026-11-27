# AC01 | Grouped workspace image and sync compatibility

**State:** READY (reviewed scope; selected small refinement pending impact confirmation)

**Kind:** implementation

**Target:** `implementation/agent-core-monorepo-map`. **Source baseline:** `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c` (main). Reviewed R10 `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. The custodian must persist the exact independent verdict and selected permanent contracts before commissioning; recheck actual latest target and unrelated worktrees. No paid/live/destructive permission. [Group schedule](../README.md).

## Outcome and authority

Existing flat and grouped leaf workspace manifests participate in the same image closure and dev-sync classification; placeholders are not workspaces and all existing app closures remain unchanged.

**Gap:** The image index scans only immediate apps/packages/tools children; dev sync derives ownership from the first two path segments. Both miss the grouped leaf ownership. Release closure and image selection depend on the common graph; release `requiresFullImageRebuild` also has a flat-only manifest classifier. See [source map](SOURCE-MAP.md). Primary owner: [Agent Core technical contract](../../../../../docs/technical/platform/agent-core.md#selected-boundary); [package organization](../../../../../packages/README.md). Product promises unchanged: E1 is internal provider-free foundation, no player/game/Storyteller behavior or production deployment change. No new architectural choices, no legacy domain refactor. Preserve spending/trust/SQL/publication and existing app ownership. No real provider, protected data, migration, external tools or production activation.

## Implementation first-screen brief

2 tasks; 5–10 min active implementation, excluding dependency installation and joint proof. Prerequisites: **None**. Parent reads this front door and [TASKS](TASKS.md), then first eligible card and its named anchors only. Use the [group readiness disposition](../README.md#readiness-disposition) and await explicit named commission; verify any pending impact confirmation before dispatch of its affected edits. Source postcondition and assigned focused checks; AC08 owns full joint proof. [PROOF](PROOF.md) owns assigned checks. No auto-next; one coordinator and worktree per Change.

## Planned specification and implementation delta | planned-impact.v1

Write ownership is the named T-ID files; no sibling file writes except parent-owned packet closure and target-locked catalog/ledger reconciliation. Update source-adjacent tooling note only if a residual limitation remains; the permanent package map and technical owner retain joint proof standing. No image contract claim beyond actual focused evidence.

| Plane | Selected authority and exact change/no-op | Related documents/maps | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing behavior or authority changes | Existing product and Storyteller owners remain | No production consumers or effects |
| Technical | unchanged selected contract; implement [technical owner](../../../../../docs/technical/platform/agent-core.md#selected-boundary) and reconcile only observed status/limitations | [Package map](../../../../../packages/README.md); named durable owners in TASKS | AC01 source gate, AC08 joint proof |
| Code | changed: `infra/images/common/workspace-graph.mjs`, `infra/images/common/workspace-graph.test.mjs`, `infra/images/development/sync-plan.mjs`, `infra/images/development/sync-plan.test.mjs`, `infra/images/release/select-affected-images.mjs`, `infra/images/release/test/warm-path.test.mjs`; exact postcondition above | [Source map](SOURCE-MAP.md) | [Assigned proof](PROOF.md) and diagnostic negatives |
| Related | changed: own package/tooling README or status where assigned, otherwise unchanged because no public consumer; reconcile temporary packet/catalog at closure | [Group](../README.md), technical owner | actual source status and durable findings |

## Handoff and closure

When explicitly commissioned: linked Change worktree from latest verified `implementation/agent-core-monorepo-map`; run `node scripts/repo-tools/change-branch-guard.mjs --change AC01 --target implementation/agent-core-monorepo-map --design agent-core-monorepo-map` before writes. Parent executes selected tasks, records source/assigned checks, exact SHA and outstanding proof. Stop on material contradiction or failed assigned gate; no unapproved live operations. When assigned Change gate passes, reconcile durable knowledge, complete P/T/C/Related ledger with observed evidence, archive this leaf in same commission, commit closure, integrate under target lock and verify archive present/open absent before reporting. AC08 owns joint acceptance; no constituent main merge. No false PASS; if assigned gate fails keep worktree. No new required review for Medium/Low findings. Follow current AGENTS and change lifecycle, not historical packet examples.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/agent-core.md#selected-boundary | technical | unchanged selected contract; source realizes assigned portion | pending implementation receipt | NOT RUN | assigned in PROOF | named durable owner at closure |
| Product / existing application authority | product | unchanged: provider-free internal foundation | no app or domain changes authorized | pending diff inspection | no production exposure | no product change |
| packages/README.md / affected README | related | reconcile actual source and proof standing only | pending implementation receipt | NOT RUN | no unsupported claims | closure receipt |
