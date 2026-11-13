# ENG07 | A remembered promise reaches the actual final Storyteller request

**State:** Proposed, **conditional pending source-gap confirmation**; code not authorized. **Kind:** evidence-use diagnostics/test harness and only the minimum runtime fix if required. **Authority:** [Storyteller and memory](../../engine-architecture/storyteller-and-memory.md), [verification strategy](../../engine-architecture/evidence/verification-strategy.md). **Do not duplicate existing long-story memory tests if they already prove this exact end-to-end property.**

## Cursor first-screen brief, after source review

> **Goal:** one player promise buried hundreds of passages earlier is retrieved by identity/source, appears in the **actual final serialized provider request** (not just an intermediate search result), and a grounded candidate later acknowledges it without contradicting present mechanical ownership. Make any omitted *required* source a typed observable hold, not silent model amnesia.
>
> **Start:** `packages/application/src/storyteller/canonical-knowledge.ts`, `memory-evidence-packing.ts`, `memory-evidence-use.ts`, `memory-provider-preview.ts` and `memory-exploration-controller.ts`; relevant `packages/storyteller/src/providers/*` and existing `packages/application/test/long-story-memory-evaluation.test.mjs`.
>
> **Known trap:** a memory candidate can be successfully retrieved or packed and still be dropped before dispatch because the final request exceeds byte/token limits. A “retrieved=true” metric alone is a false proof of memory.

## One selected evidence story

- Passage 30: character promises to return Mara's compass. Source-linked promise recorded.
- Passage 50: compass changes holder in the real item registry; the original history remains.
- 200+ subsequent ordinary passages and some irrelevant similarly named people.
- Current Storyteller context must select the exact promise and holder state as necessary (not every old passage).
- The **actual final request** includes source identity/revision and the relevant fact within its captured limit.
- Candidate scene may mention the promise accurately or remain neutral; it must not invent a second transfer, give a nonexistent reward or confuse two Maras.

**Success is both technical and narrative:** evidence included in exact bytes, no source contradictions, no unsupported effects, and at least one meaningful callback in a bounded evaluation corpus. Human assessment and model variability must be recorded separately from deterministic tests.

## Implementation cut

If existing tests already prove full request inclusion, **cancel/supersede** this Change and record the evidence rather than coding redundant instrumentation. Otherwise add a narrow provider-free request-audit specimen or diagnostic that correlates selected source handles with included/omitted final serializations under a known request hash. Any production logging must avoid storing private story prose or secrets.

No new search backend, embeddings/graph engine, LLM framework, automatic provider spending, endless memory agent or complete Storyteller rewrite. Provider evaluations are separately approved, cost-bounded experiments.

## Negative proof

- Missing required passage → explicit omitted/hold reason, no fabricated callback.
- Same name in two locations → source identity not swapped.
- 512KB irrelevant lore alongside a tiny promise → final request remains bounded and retains mandatory exact source.
- Retrieved source dropped at final truncation → test fails, not silently counted as remembered.
- Private future notes never appear in player-visible request audit.
- Current SQL ownership contradicts an old passage → latest canonical mechanical fact wins, with history preserved.
- A provider call that times out does not automatically spend another allowance on re-retrieval.

**Ready gate:** source review shows a real observability/correctness gap in current request assembly; owner approves narrow test-only or runtime repair. This is higher priority than adding a vector database but not an excuse to duplicate already good work.
