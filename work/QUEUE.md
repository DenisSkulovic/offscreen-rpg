# Work selection | single current-work authority

Current work: none

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

Start with this pointer, then the selected packet, then **one** T-ID when the selection is a Change. Composer Standard remains the normal parent/child model. An unresolved technical decision goes back to ChatGPT for source-backed investigation; do not turn it into a paid Grok investigation by default. [Economical work rule](../.agents/references/composer-first-execution.md) · [current backlog handoff](changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md).

## Transition

The previous `Current change:` line in the Change catalog is retired as an independent selector. The maintenance scanner and repository brief must read **this file**, not infer selection from a Change-only index. All existing 24 open Change packets retain their locations and statuses. No standalone Task has been selected by creating this infrastructure.
