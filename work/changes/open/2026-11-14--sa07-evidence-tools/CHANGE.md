# SA07 | Add only the read operation that a real missing-evidence fixture proves necessary

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Ready for provider-free corpus discriminator and one demonstrated remedy (2026-11-18); new tool only if actually needed.

## Cursor first-screen

> **Goal:** a Storyteller may ask one safe question about a known entity/relationship/contradictory source (or a pinned rule fragment) that cannot be efficiently answered by current ask_memory/read_memory, and get a small exact authorized answer. The application owns retrieval implementation and its work budget.
>
> **Authority:** [tool semantics](../../../../docs/technical/storyteller/prompts-and-tools.md#selected-compilation-and-tool-contract), [source access and proof](../../../../docs/technical/storyteller/context-and-memory.md), [constitution](../../../../docs/product/storyteller/behavior-and-quality.md).
>
> **Source:** `packages/storyteller/src/tasks/memory-exploration.ts::memoryExplorationOperationSchema`, `packages/application/src/storyteller/memory-exploration.ts::createCanonicalMemoryExplorer`, `application/storyteller/canonical-search.ts`, `application/storyteller/lexical-story-index.ts`, `memory-exploration-controller.ts::runMemoryExploration`.

## Selection gate and scope

**Before changing source**, run the maintained labelled 12-case and expanded 200/2000-scene corpus on the current approved ask/read interface. Choose exactly **one** counterexample (e.g. ambiguous aliases, two people with same name, known gift relation, or pinned rule evidence) whose answer is present in authorized source but unavailable under affordable current work. If current deterministic direct cue/alias retrieval fixes it with no new model tool, **do that** and close this packet as superseded.

If a new tool is genuinely needed, choose one versioned read-only semantic function, with strict inputs, exact scoped source root, visibility, result caps, no-match/partial/stale/denied status and output-provenance. A model may never supply arbitrary SQL, file path, world effect, actor authorization, new payer, or future hidden plan. App internal fanout is bounded and counted against the **existing** operation read/byte/time envelope. No newly funded separate specialist agent.

Maintain structured JSON `needs_context` transport compatibility; native provider function-calling requires a separate protocol experiment and isn't the definition of completion.

## Acceptance / negative

**Normal:** selected missing-evidence case obtains an exact current source, lowers wrong/omitted-candidate cases without exceeding the same read and final packet limit; ordinary one-shot unchanged. Record baseline vs new candidate recall/precision and final-included handle, not just “tool returned success”.

**Negative:** wrong story/fork/root, source superseded, private unseen fact, no index, denied handle, empty result, out-of-bounds byte and repeated read all return typed safe status; zero game mutations, no newly paid call unless explicitly part of already captured round. Offscreen task snapshots replay old two-tool requests exactly.

**Proof:** provider-free corpus, `pnpm memory:index-benchmark`, targeted application memory controller tests, permitted disposable SQL only with explicit consent. If no discriminating improvement, **cancel without tool code**. **Out:** general tool registry/framework, subagents, vector DB procurement, actor/item mechanics, model web browsing.
