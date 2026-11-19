# SA07 | Add only the read operation that a real missing-evidence fixture proves necessary

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Ready. The provider-free discriminator selected one alias cue and landed it; no new tool (2026-11-19).

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

## Discriminator (2026-11-19)

Provider calls: 0. No vector database and no Cognee. No new ask/read operation.

The labelled case is `greywake.which-mira`: "Which Mira keeps the blue ledger?" The current identity `identity.mira-vale` already says Vale keeps the blue ledger. On the field-aware ask path, balanced, minimal and rich, at 200 and 2000 scenes, Vale ranked first and `identity.mira-pell` stayed inside the candidate cap because both titles share the alias Mira. That unfiltered list is the miss. `suppressAmbiguousAliasIdentities` in `packages/application/src/storyteller/lexical-story-index.ts` drops an identity whose matches are only the other identity's title alias when the other identity also matched a further cue. The hit is Vale without Pell. A query that is only "Mira", or that names both people, still returns both.

`greywake.coiled-return` ("What old obligation should shape this homecoming?") still misses `relationship.open-favor`. Those words are not aliases in the authorized favor record, so this slice does not add a tool for that paraphrase. `greywake.catch-up` still misses the same favor. Wrong story roots throw `stale-root`. A superseded body that is not the captured revision, including the word "banished", stays `no-match`. An empty overlap stays `no-match`. The ask path does not write game state.

Focused proof: `packages/application/test/sa07-alias-disambiguation.test.mjs`. The retrieval sentence is `docs/technical/storyteller/context-selection-and-recall.md#retrieval-result-contract`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/context-selection-and-recall.md#retrieval-result-contract | technical | changed: the field-aware index omits a current identity that matched only another identity's shared title alias when that other identity also matched a further query term | packages/application/src/storyteller/lexical-story-index.ts at baf75f0309821a18d555815b1fff22269a3ebdeb plus the alias suppression added in this slice | fixture-tested | Pell is in the unfiltered Mira match list and absent after the blue-ledger cue; a Mira-only query and a query that names both people still return both; banished and a paraphrase with no shared alias stay empty; a different story root throws stale-root | The retrieval-result paragraph is the owner. No queue or product route change. |
| docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do | product | unchanged: alias suppression only changes which identity candidate ask_memory returns; it does not change what the Storyteller may tell the player or authorize a world write | packages/application/test/sa07-alias-disambiguation.test.mjs | fixture-tested | The ask fixture counts only manifest reads and performs no game write; an empty result and a wrong story root stay refused | No product page edit. |
| docs/technical/storyteller/context-selection-and-recall.md#lexical-baseline-and-structured-recall | technical | unchanged: the linear baseline still requires every normalized query term and does not apply this identity-alias omission | packages/application/src/storyteller/canonical-search.ts at baf75f0309821a18d555815b1fff22269a3ebdeb | source-observed | The which-mira question still fails the linear all-terms scan: the token keeps is not the indexed token keeper. This slice leaves that reference scan alone. | No linear-baseline edit. |
