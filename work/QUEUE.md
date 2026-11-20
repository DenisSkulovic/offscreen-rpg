# Work selection | single current-work authority

**Morning-first-campaign navigation, 2026-11-20:** [source-backed audit, mechanism ladder, and finite Cursor waves](designs/open/first-campaign-readiness-2026-11-20/README.md). The selector below remains `none` because a planning audit is not an executor selection. When the owner explicitly requests Cursor execution, select existing STORY03 and its new T07 (then T08/T09), provider-free, in a bounded batch. Do not turn this link into automatic authorization for live model calls or cluster deletion.


Current work: [BOOT03](changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md)

This is the **one active selection pointer** for independently tracked work. [Vocabulary and routing](WORK-TAXONOMY.md) · [Change catalog](changes/README.md) · [Standalone Task catalog](tasks/README.md) · [Open designs](designs/README.md).

Use exactly one `Current work:` line near the top. Valid values are `none`, a Markdown link to `changes/open/<leaf>/CHANGE.md`, or a Markdown link to `tasks/open/<leaf>/TASK.md`. Examples (illustrative, **not selected**): `[BOOT03](changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md)` and `[task](tasks/open/YYYY-MM-DD--slug/TASK.md)`. No `TASKS.md#Txx` or open design is a top-level selection.

**Selection is not execution permission.** The selected item must still be Ready for its particular authorized scope and meet environment, cost, destructive-op, data privacy, actor and dependency constraints. One selected Change may have a bounded Composer T-ID, but that T-ID remains inside the Change. One selected standalone Task has one exact operator action/receipt. Explicit approved batch handoffs may coordinate disjoint work without introducing another global selector. `none` is valid, including during planning-only audits.

## Where to look

| Intention | Index | Authority |
| --- | --- | --- |
| Modify implementation or ratified documents | [Changes](changes/README.md) | Each `CHANGE.md`, with optional Composer `TASKS.md` |
| Execute independently tracked verification, migration or maintenance | [Tasks](tasks/README.md) | Each `TASK.md` with prerequisites, scope, stops and evidence |
| Resolve an unknown or design choice | [Designs](designs/README.md) | Open study; not automatically executable |
| Read concluded investigations | [Research](../research/README.md) | Non-normative findings |
| Assess actual successful/failed runs | [Evidence](../evidence/README.md) | Dated reproducible observations |
| Know shipped/observed capability | [STATUS](../STATUS.md) | Demonstrated implementation only |

## Cursor dispatch

**Finite parent control:** a named user-authorized batch is a temporary schedule, **not** another selector or an unlimited license to run all Ready tasks. Follow [bounded parent orchestration](../.agents/references/bounded-parent-orchestration.md): normally 2–5 T-IDs or one risky join, then an integrated test/reconciliation/commit checkpoint and a parent report/stop. A Done T-ID leaves its parent Change open until the Change's actual acceptance is proved; completed Changes should be archived in the same batch window, not forgotten.

Start with this pointer, then the selected packet, then **one** T-ID when the selection is a Change. Composer Standard remains the normal parent/child model. An unresolved technical decision goes back to ChatGPT for source-backed investigation; do not turn it into a paid Grok investigation by default. [Economical work rule](../.agents/references/composer-first-execution.md) · [current backlog handoff](changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md).

## Transition

The previous `Current change:` line in the Change catalog is retired as an independent selector. The maintenance scanner and repository brief must read **this file**, not infer selection from a Change-only index. Open Change packets remain in `work/changes/open/` until each packet's independently verifiable Goal is proved. WORK01 is Done and archived. No standalone Task is selected.
