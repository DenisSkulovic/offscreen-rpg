# Change packet profiles | planner-grade research, executor-grade route cards

**Owns:** selecting planning/proof emphasis for a bounded Change, not its lifecycle, task limits or authority. [Submission standard](planning-artifact-quality.md) defines document roles and budgets.

## Principle

Plan the complete relevant source and failure surface upstream; expose only exact execution routes to Cursor. Optimize accepted correct outcomes including rework, not raw tokens. No savings claim without measurement.

## Two axes; do not invent a third Change kind

Kind: documentation or implementation per [work-unit standard](change-work-unit-standard.md). Profile: evidence emphasis, not a permission or additional lifecycle.

| Profile | Use | Required emphasis |
| --- | --- | --- |
| PATCH | Narrow known correction | Exact edit, focused positive/negative |
| CONTRACT | API/wire/schema/package/trust boundary | Callers, public exports, compatibility, authority |
| STATE | Persistence, replay, workflow, fork, money | State/identity, transaction, fences, crash/replay negatives |
| RELEASE | Images, network, secrets, migration, cluster | Artifact identity, resource/lifecycle, refusal, recovery, proof ownership |
| PROOF | Test/harness implementation | Falsifiable fixtures, executable evidence and harness negatives |
| DOC | Canonical text or policy | Claim/dependent map, semantic negative, link/heading reconciliation |

Apply multiple lenses if necessary, not extra packet layers. INTEGRATE is a coordinator duty, not an agent class. No profile authorizes protected mutation, paid calls or destructive checks. A pure evaluation without diff is not implementation.

### The executor's real unit is a microtask

Use [Composer task format](composer-first-execution.md#tasksmd-format). One narrow decided T-ID, at most seven actual assignments per Change. One parent per Change. A tiny direct edit may need only CHANGE.md. Large STATE/RELEASE scopes require safe repartition, not larger models.

## Files and ownership

[Canonical file roles](planning-artifact-quality.md#3-execution-packet-shape) and [size budgets](planning-artifact-quality.md#4-submission-scale-and-measurement) govern all profiles. Material multi-task delegation requires CHANGE, TASKS, SOURCE-MAP, PROOF; EXECUTION/INTERFACES or exact linked contracts as needed. PLAN/READINESS is current checkpoint only. A rare COORDINATION companion is justified only if actual shared locks/waves cannot fit in dispatch table; counts against aggregate budget.

No empty companions or duplicate source maps. Refresh stale facts or mark explicitly unresolved. Parent reads front door/index, child reads selected card and precise required sections; neither preloads planner corpus.

## Role division and stop rules

[Planner investigation](planner-investigation-standard.md) owns source mapping and frozen decisions; [packet design](packet-design-manual.md) owns task DAG and dispatch construction; [readiness review](packet-readiness-review.md) owns independent admission. [Parent procedure](bounded-parent-orchestration.md) owns implementation, cheap proof and acceptance handoff. ChatGPT/owner own heavy proof. Source contradiction returns to planner; targeted mechanical debugging stays local.

## Route card format (pasteable; adapt, don't pad)

Use canonical [TASKS card](composer-first-execution.md#tasksmd-format), or for one tiny route in CHANGE.md include ID/HEAD/selection, outcome, authority, anchors, exact edit/constraints, normal and negative command/cwd, stop and receipt. No duplicate card in companions or pasted research.

## Read budget, escalation, and quality loop

Use [submission budgets](planning-artifact-quality.md#4-submission-scale-and-measurement), [task format](composer-first-execution.md) and actual named anchors. Additional reads must resolve necessary local facts. If relevant contract drifts, stop for planner refresh. Keep measured evidence and limits; no Done with missing required acceptance or reconciliation.

## Example: distributed Storyteller

Historical [STORY03 packet](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md) illustrates a STATE lens: workflow custody, versioned authority/replay and stale-root/no-resend negatives. It is not a current source map or permission, and must not be copied as a whole Change without current scale/readiness review.
