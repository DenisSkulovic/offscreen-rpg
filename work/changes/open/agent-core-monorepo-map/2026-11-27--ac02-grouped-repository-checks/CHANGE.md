# AC02 | Grouped source and repository knowledge checks

**State:** READY; owner-commissioned

**Kind:** implementation

**Target:** `implementation/agent-core-monorepo-map`. **Source baseline:** `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c` (main). Reviewed R10 `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Final readiness confirmed at `96f0a26904a6a6e1fb07dfac0ccad618ea634ab2`; [review and owner commission](../READINESS.md#targeted-independent-re-review--2026-11-27). Recheck actual latest target, plan guard and unrelated worktrees before dispatch. No paid/live/destructive permission. [Group schedule](../README.md).

## Outcome and authority

Repository checks discover the actual imports and package contracts of grouped leaves, fail closed on duplicate identity, and retain manifest-delete/rename conservative affected selection.

**Gap:** AC-M01: `isWorkspaceSource` matches only one-level source. Additional affected-check manifest classifier and wiki knowledge-boundary classifiers have equivalent flat-path assumptions. See [source map](SOURCE-MAP.md). Primary owner: [Agent Core technical contract](../../../../../docs/technical/platform/agent-core.md#review-findings-and-follow-through); [package organization](../../../../../packages/README.md). Product promises unchanged: E1 is internal provider-free foundation, no player/game/Storyteller behavior or production deployment change. No new architectural choices, no legacy domain refactor. Preserve spending/trust/SQL/publication and existing app ownership. No real provider, protected data, migration, external tools or production activation.

## Implementation first-screen brief

3 tasks; 5–10 min active implementation, excluding dependency installation and joint proof. Prerequisites: **None**. Parent reads this front door and [TASKS](TASKS.md), then first eligible card and its named anchors only. The [group readiness disposition](../README.md#readiness-disposition) records the full-batch commission; dispatch only after this Change’s prerequisites hold. No additional owner approval or review required for unchanged scope. Source postcondition and assigned focused checks; AC08 owns full joint proof. [PROOF](PROOF.md) owns assigned checks. No auto-next; one coordinator and worktree per Change.

## Planned specification and implementation delta | planned-impact.v1

Write ownership is the named T-ID files; no sibling file writes except parent-owned packet closure and target-locked catalog/ledger reconciliation. scripts/repo-tools/README.md#known-limitations: reconcile AC-M01 and additional classifier findings after focused proof. Keep final qualification pending in technical owner.

| Plane | Selected authority and exact change/no-op | Related documents/maps | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing behavior or authority changes | Existing product and Storyteller owners remain | No production consumers or effects |
| Technical | unchanged selected contract; implement [technical owner](../../../../../docs/technical/platform/agent-core.md#review-findings-and-follow-through) and reconcile only observed status/limitations | [Package map](../../../../../packages/README.md); named durable owners in TASKS | AC02 source gate, AC08 joint proof |
| Code | changed: `scripts/repo-tools/module-graph.mjs`, `scripts/repo-tools/module-graph.test.mjs`, `scripts/repo-tools/affected-check.mjs`, `scripts/repo-tools/affected-check.test.mjs`, `scripts/repo-tools/wiki-core/model.mjs`, `scripts/repo-tools/wiki-core/content-health-self-test.mjs`; exact postcondition above | [Source map](SOURCE-MAP.md) | [Assigned proof](PROOF.md) and diagnostic negatives |
| Related | changed: own package/tooling README or status where assigned, otherwise unchanged because no public consumer; reconcile temporary packet/catalog at closure | [Group](../README.md), technical owner | actual source status and durable findings |

## Handoff and closure

Owner-commissioned: linked Change worktree from latest verified `implementation/agent-core-monorepo-map`; run `node scripts/repo-tools/change-branch-guard.mjs --change AC02 --target implementation/agent-core-monorepo-map --design agent-core-monorepo-map` before writes. Parent executes selected tasks, records source/assigned checks, exact SHA and outstanding proof. Stop on material contradiction or failed assigned gate; no unapproved live operations. When assigned Change gate passes, reconcile durable knowledge, complete P/T/C/Related ledger with observed evidence, archive this leaf in same commission, commit closure, integrate under target lock and verify archive present/open absent before reporting. AC08 owns joint acceptance; no constituent main merge. No false PASS; if assigned gate fails keep worktree. No new required review for Medium/Low findings. Follow current AGENTS and change lifecycle, not historical packet examples.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/agent-core.md#review-findings-and-follow-through | technical | unchanged selected contract; source realizes assigned portion | pending implementation receipt | NOT RUN | assigned in PROOF | named durable owner at closure |
| Product / existing application authority | product | unchanged: provider-free internal foundation | no app or domain changes authorized | pending diff inspection | no production exposure | no product change |
| packages/README.md / affected README | related | reconcile actual source and proof standing only | pending implementation receipt | NOT RUN | no unsupported claims | closure receipt |
