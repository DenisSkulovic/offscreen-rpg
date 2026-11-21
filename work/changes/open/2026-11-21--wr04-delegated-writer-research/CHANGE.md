# WR04 | real independent research contexts for the Writer

> **New post-P3 successor plan (2026-11-21):** [POST-P3-EXECUTION.md](POST-P3-EXECUTION.md) contains the updated, outcome-sized implementation and bounded proof. **CONDITIONAL / NOT YET CURSOR-READY.** Do not dispatch until the three P3-A/B/C outcomes are actually integrated and the relevant source contracts are rechecked. The obsolete pre-MA06A TASKS below remain non-executable; a planner must promote the new plan with exact landed anchors and independent readiness evidence. Integration stays on undertaking/storyteller-workshop; no paid provider authorization.


> **Execution readiness audit (2026-11-21): PLANNER-BLOCKED, NOT CURSOR-READY.** Source-grounded G0–G7 review is recorded in [PROOF.md](PROOF.md); exact observed code gaps and ChatGPT-owned corrective decisions are in [SOURCE-MAP.md](SOURCE-MAP.md). The existing TASKS are *design placeholders*, not dispatchable child instructions. Do not reinterpret `PLANNER-READY AFTER` as approval; only reissue precise T-IDs against landed predecessor code and audit every one before commission. The integration target remains `undertaking/storyteller-workshop`; `main` untouched. No provider spend, destructive DB or live deployment is authorized by this packet.


**State:** Proposed / PLANNER-BLOCKED for implementation, independently reviewed 2026-11-21. **Kind:** implementation. **Dependencies:** WR03. **Outcome:** the parent Storyteller can launch and join **separate model contexts** for narrow Library research/editorial questions, without leaking branch knowledge or delegating canon authority. Optional when useful, never a mandatory performance tax.

**Undertaking branch rule:** this Change belongs to **Storyteller Workshop**. Create `change/wr04-research` from the then-current `undertaking/storyteller-workshop` HEAD **before code edits**. Work through all T-IDs on this Change branch, then squash-integrate into the undertaking branch and delete the temporary branch; dedicated linked worktree mandatory even when alone; preserve the primary checkout's active branch. Do **not** merge this Change directly into `main`. Rebase/refresh from the undertaking branch before beginning if earlier WR work has landed.

**Original planning baseline (historical; current source re-audit in SOURCE-MAP):** GitHub `0d423b687c9a0a84d45dfe20823d7d313651ea25` (2026-11-21), broad source review of uploaded `09d5820bcafe`; current worktree unknown. Reinspect named symbols before editing. **Execution owner: Cursor, not ChatGPT.** No model-spend, database migration, kind cluster mutation or new work selection is authorized merely by this packet. [Program](../../../undertakings/storyteller-workshop/PROGRAM.md) · [Current queue](../../../QUEUE.md).

## Cursor first-screen route

**DEPTH=PATCH-L, agent/controller spending owner.** Start with `packages/application/src/storyteller/{memory-exploration-controller,memory-provider-runtime,budget,execution}.ts`, `packages/storyteller/src/tasks/{resources,task-contracts}.ts`, `packages/db/src/schema/storyteller.ts`. Inspect WR03 captured mission and tool facade first. **Do not simulate “subagents” by asking the parent model to play different roles in the same context.**

## Approved behavior

- Parent can request 1+ **separate task contexts** with narrow question, frozen source Library root, inherited-or-restricted privacy, skill/recipe pin, tool scope and a **reserved finite cost allowance**. The experimental route may limit practical concurrency, but don't bake a legacy three-round ceiling into the target. One parent may join parallel child findings in deterministic request order and independently verify exact evidence handles.
- Children use **read-only** Library/search/skill tools. They may return isolated candidate notes/critical commentary **as proposals**, never mutate shared Workdesk/canon or start external side effects. Any accepted child drafting requires explicit parent adoption with revision fence. No unlimited recursive fan-out; grants for further child delegation must be explicit, not inferred from Markdown skills.
- Each child has independent paid-attempt custody, delivery/uncertain status and cost accounting under the captured parent operation. Reserved child spend cannot exceed parent effective user policy; failed/uncertain child does not get uncharged re-dispatch. Parent can continue without child only under explicit quality/required-evidence policy, not pretending missing research succeeded.
- Join returns concise sourced claims, cited source-object hashes, gaps and contradictions; the parent must be able to open original passages rather than treating a child synthesis as canonical truth. Source retrieval and caches are branch/root scoped.

## Acceptance

**Normal:** 200-scene Mira/faction case splits two independent source-heavy questions into two actual isolated scripted/model contexts, each with its own tools, independent transcript, precise source roots and reported spending; parent synthesizes a coherent proposal without feeding every source passage into its initial context. **Negative:** child attempts a prohibited private read or tool/grant escalation; parent cancels while child is unsettled; one child returns a source from a sibling branch or an invented citation. All fail/hold correctly without public text contamination or duplicate cost.

Use `packages/application/test/long-story-memory-evaluation.test.mjs` plus focused provider-free child dispatch/join/crash tests and a separately approved low-budget provider test. No uncontrolled real spend. **Exclude:** general microservice framework, permanent NPC agents, arbitrary recursion, direct child publication. **Integration fence:** WR03 owns main controller files until closed; WR04 should not run concurrently with WR03 edits. **Docs:** operation/controller, context/recall, model route/budgets, observability; update actual STATUS only after executable joins exist.


## Readiness finding (source audit 2026-11-21)

**Not authorized for Cursor PATCH:** Step engine context qualification, child budget SQL migration/custody, enforced read-only tool dispatcher and evidence revalidation are not frozen. WR03 is already Done; a predecessor label does not decide these interfaces. The technical intent is preserved, but the packet's current child tasks must be replaced by verified, bounded algorithms with exact path/symbol ownership, commands and discriminating negatives. A ChatGPT planner must perform the repair, then independently re-audit G0–G7. Do not ask the paid Cursor parent to perform the missing design. Review does **not** mean any implementation tests passed.
