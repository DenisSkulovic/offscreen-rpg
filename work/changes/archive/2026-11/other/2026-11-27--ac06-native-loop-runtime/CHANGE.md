# AC06 | Native Vercel loop and Workflow-safe execution composition

**State:** READY (dependency-gated); owner-commissioned

**Kind:** implementation

**Target:** `implementation/agent-core-monorepo-map`. **Source baseline:** `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c` (main). Reviewed R10 `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Final readiness confirmed at `96f0a26904a6a6e1fb07dfac0ccad618ea634ab2`; [review and owner commission](../READINESS.md#targeted-independent-re-review--2026-11-27). Recheck actual latest target, plan guard and unrelated worktrees before dispatch. No paid/live/destructive permission. [Group schedule](../README.md).

## Outcome and authority

Generic `executeMission` admits and composes the same bounded mission contract, delegates iteration to one generateText call and exposes only a Workflow-safe entrypoint with truthful outcome/cancellation semantics.

**Gap:** R10 native specimen works and replays. The maintained runtime must generalize it without a custom loop and handle nonterminal/invalid SDK results even if wrappers were never called (AC-M02). See [source map](SOURCE-MAP.md). Primary owner: [Agent Core technical contract](../../../../../docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules); [package organization](../../../../../packages/README.md). Product promises unchanged: E1 is internal provider-free foundation, no player/game/Storyteller behavior or production deployment change. No new architectural choices, no legacy domain refactor. Preserve spending/trust/SQL/publication and existing app ownership. No real provider, protected data, migration, external tools or production activation.

## Implementation first-screen brief

2 tasks; 5–10 min active implementation, excluding dependency installation and joint proof. Prerequisites: **AC03, AC04, AC05**. Parent reads this front door and [TASKS](TASKS.md), then first eligible card and its named anchors only. The [group readiness disposition](../README.md#readiness-disposition) records the full-batch commission; dispatch only after this Change’s prerequisites hold. No additional owner approval or review required for unchanged scope. Verify predecessor archive/join receipts and exact source postconditions on the recorded implementation branch. Source postcondition and assigned focused checks; AC08 owns full joint proof. [PROOF](PROOF.md) owns assigned checks. No auto-next; one coordinator and worktree per Change.

## Planned specification and implementation delta | planned-impact.v1

Write ownership is the named T-ID files; no sibling file writes except parent-owned packet closure and target-locked catalog/ledger reconciliation. AC-M02 is implemented here; AC08 records actual negative result before updating permanent technical finding. Preserve exclusions and proof standing.

| Plane | Selected authority and exact change/no-op | Related documents/maps | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing behavior or authority changes | Existing product and Storyteller owners remain | No production consumers or effects |
| Technical | unchanged selected contract; implement [technical owner](../../../../../docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules) and reconcile only observed status/limitations | [Package map](../../../../../packages/README.md); named durable owners in TASKS | AC06 source gate, AC08 joint proof |
| Code | changed: `packages/ai/agent-core/src/loop/generate.ts`, `packages/ai/agent-core/src/runtime/execute.ts`, `packages/ai/agent-core/src/telemetry/summary.ts`, `packages/ai/agent-core/src/workflow.ts`; exact postcondition above | [Source map](SOURCE-MAP.md) | [Assigned proof](PROOF.md) and diagnostic negatives |
| Related | changed: own package/tooling README or status where assigned, otherwise unchanged because no public consumer; reconcile temporary packet/catalog at closure | [Group](../README.md), technical owner | actual source status and durable findings |

## Handoff and closure

Owner-commissioned: linked Change worktree from latest verified `implementation/agent-core-monorepo-map`; run `node scripts/repo-tools/change-branch-guard.mjs --change AC06 --target implementation/agent-core-monorepo-map --design agent-core-monorepo-map` before writes. Parent executes selected tasks, records source/assigned checks, exact SHA and outstanding proof. Stop on material contradiction or failed assigned gate; no unapproved live operations. When assigned Change gate passes, reconcile durable knowledge, complete P/T/C/Related ledger with observed evidence, archive this leaf in same commission, commit closure, integrate under target lock and verify archive present/open absent before reporting. AC08 owns joint acceptance; no constituent main merge. No false PASS; if assigned gate fails keep worktree. No new required review for Medium/Low findings. Follow current AGENTS and change lifecycle, not historical packet examples.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/agent-core.md#deterministic-fixture-and-result-rules | technical | unchanged selected contract; source realizes assigned portion | pending implementation receipt | NOT RUN | assigned in PROOF | named durable owner at closure |
| Product / existing application authority | product | unchanged: provider-free internal foundation | no app or domain changes authorized | pending diff inspection | no production exposure | no product change |
| packages/README.md / affected README | related | reconcile actual source and proof standing only | pending implementation receipt | NOT RUN | no unsupported claims | closure receipt |
