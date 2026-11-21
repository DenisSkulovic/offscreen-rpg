# WR04 | real independent research contexts for the Writer

**State:** Proposed. **Kind:** implementation. **Dependencies:** WR03. **Outcome:** the parent Storyteller can launch and join **separate model contexts** for narrow Library research/editorial questions, without leaking branch knowledge or delegating canon authority. Optional when useful, never a mandatory performance tax.

**Undertaking branch rule:** this Change belongs to **Storyteller Workshop**. Create its isolated worktree/temporary branch from the current head of `undertaking/storyteller-workshop`; after acceptance, merge/reconcile the complete Change back into `undertaking/storyteller-workshop`, then remove the temporary branch/worktree. Do **not** merge this Change directly into `main`. Rebase/refresh from the undertaking branch before beginning if earlier WR work has landed.

**Planning baseline:** GitHub `0d423b687c9a0a84d45dfe20823d7d313651ea25` (2026-11-21), broad source review of uploaded `09d5820bcafe`; current worktree unknown. Reinspect named symbols before editing. **Execution owner: Cursor, not ChatGPT.** No model-spend, database migration, kind cluster mutation or new work selection is authorized merely by this packet. [Program](../../WRITER-IMPLEMENTATION-2026-11-21.md) · [Current queue](../../../QUEUE.md).

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
