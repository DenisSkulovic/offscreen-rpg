# Work selection | single current-work authority

**Direction:** [implementation roadmap](IMPLEMENTATION-ROADMAP.md) owns priorities; the single `Current work:` line below owns default selection. Historical Change statuses belong in the catalogs/ledgers. Explicit owner-commissioned Change chats may run independently of this selector, but must preserve resource and integration ownership. No implicit paid model spend or unsafe cluster authorization.

Current work: none

This is the **one active selection pointer** for independently tracked work. The current themed integration envelope, when one exists, is recorded separately under [Undertakings](undertakings/README.md) and never selects execution by itself. [Vocabulary and routing](WORK-TAXONOMY.md) · [Change catalog](changes/README.md) · [Standalone Task catalog](tasks/README.md) · [Open designs](designs/README.md).

Use exactly one `Current work:` line near the top. Valid values are `none`, a Markdown link to `changes/open/<leaf>/CHANGE.md`, or a Markdown link to `tasks/open/<leaf>/TASK.md`. Examples (illustrative, **not selected**): a Markdown link to an existing open `changes/open/<leaf>/CHANGE.md` or `tasks/open/<leaf>/TASK.md`. Do not copy placeholder paths into the selector. No `TASKS.md#Txx` or open design is a top-level selection.

**Selection is not execution permission.** The selected item must still be Ready for its particular authorized scope and meet environment, cost, destructive-op, data privacy, actor and dependency constraints. One selected Change may have a bounded Composer T-ID, but that T-ID remains inside the Change. One selected standalone Task has one exact operator action/receipt. Explicit approved batch handoffs may coordinate disjoint work without introducing another global selector. `none` is valid, including during planning-only audits.

## Where to look

| Intention | Index | Authority |
| --- | --- | --- |
| Modify implementation or ratified documents | [Changes](changes/README.md) | Each `CHANGE.md`, with optional Composer `TASKS.md` |
| Execute independently tracked verification, migration or maintenance | [Tasks](tasks/README.md) | Each `TASK.md` with prerequisites, scope, stops and evidence |
| Resolve an unknown or design choice | [Designs](designs/README.md) | Open study; not automatically executable |
| Understand the current themed integration push | [Undertakings](undertakings/README.md) | Coordination envelope only; never a work selector |
| Read concluded investigations | [Research](../research/README.md) | Non-normative findings |
| Assess actual successful/failed runs | [Evidence](../evidence/README.md) | Dated reproducible observations |
| Know shipped/observed capability | [STATUS](../STATUS.md) | Demonstrated implementation only |

## Cursor dispatch

**Finite parent control:** a named user-authorized batch is a temporary schedule, not another selector or permission to drain all Ready Changes. Checkpoint after 2–5 T-IDs; a **full dedicated Change commission continues within the same Change**, while a batch-only commission stops at its agreed boundary. Follow [parent policy](../.agents/references/bounded-parent-orchestration.md). A Done T-ID leaves its parent Change open until the Change's actual acceptance is proved; completed Changes should be archived in the same batch window, not forgotten.

Start with this pointer, then the selected packet, then **one** T-ID when the selection is a Change. Composer Standard remains the normal parent/child model. An unresolved technical decision goes back to ChatGPT for source-backed investigation; do not turn it into a paid Grok investigation by default. [Economical work rule](../.agents/references/composer-first-execution.md) · [current backlog handoff](changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md).

## Transition

The previous `Current change:` line in the Change catalog is retired as an independent selector. The maintenance scanner and repository brief must read **this file**, not infer selection from a Change-only index. Open Change packets remain in `work/changes/open/` until each packet's independently verifiable Goal is proved. WORK01 is Done and archived. WR02 and WR03 are Done and archived. No successor Change is selected. No standalone Task is selected.
