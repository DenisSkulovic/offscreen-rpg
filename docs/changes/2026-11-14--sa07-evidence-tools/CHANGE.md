# SA07 | Add only the read operation that a real missing-evidence fixture proves necessary

**State: Proposed / CONDITIONALLY READY after SA04–SA06 + a labelled oracle failure. Not executable solely because named in program.** No code authorization. This packet is a **capability seam with a measured stop gate**, not a mandate to add 20 tools.

## Cursor first-screen

> **Goal:** a Storyteller may ask one safe question about a known entity/relationship/contradictory source (or a pinned rule fragment) that cannot be efficiently answered by current ask_memory/read_memory, and get a small exact authorized answer. The application owns retrieval implementation and its work budget.
>
> **Authority:** [tool semantics](../../storyteller-architecture/prompt-tools-and-models.md#model-facing-tools-few-semantic-bounded), [source access and proof](../../storyteller-architecture/context-and-retrieval.md#tool-interface-for-model-facing-investigation), [constitution](../../storyteller-architecture/vision-and-quality-constitution.md).
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
