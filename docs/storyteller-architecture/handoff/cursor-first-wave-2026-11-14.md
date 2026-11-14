# First Cursor handoff | Storyteller architecture renewal

**State: prepared for owner review; no Change is active.** This one-page route is for the next ChatGPT/Cursor conversation. The design branch is `design/storyteller-agent-architecture-2026-11-14`; inspected source baseline Git commit `c36aacdced67fa411ae972bc273724f641a752d2`. When implementing, **pull/rebase latest main first** and check any concurrent ENG/GM changes.

## What was decided

The original [game vision](../../vision.md) is the constitution. The current engine has a **real, optional, narrowly scoped 2–3-round memory-exploration agent** plus default one-shot/repairable Storyteller tasks. Its deterministic game authority, durable SQL/outbox, immutable canonical source, strict task and funding/attempt validation are worth keeping. The missing product capability is **need-aware, source-grounded, profile-faithful long-term Storyteller quality under bounded cost**, not the absence of LangChain, subagents or a permanent LLM thread.

Design documents:
- [vision/quality promises](../vision-and-quality-constitution.md);
- [source execution trace](../evidence/current-flow-audit-2026-11-14.md);
- [honest gap and evidence audit](../evidence/agent-capability-audit-2026-11-14.md);
- [selected end-state](../target-operating-model.md) and [rejected alternatives](../architecture-alternatives.md);
- [context/memory](../context-and-retrieval.md);
- [prompt/tools/models/cache](../prompt-tools-and-models.md);
- [tier/task effort, latency, failure and money](../effort-cost-and-lifecycle.md);
- [long-term playable evaluation](../evaluation-and-playability.md).

## Execution queue

Read [SA01–SA12 program](../implementation-program.md) **only to choose one Change**, then read that packet's first-screen brief and 2–5 named source symbols. Don't preload all specifications or run every test. The recommended first bounded sequence is:

1. **SA01**: redacted accepted-task→source→final request→provider rounds→publication/cost trace. Prefer enhancing existing packet lab and request audit, not building a parallel logging system.
2. **SA02**: remove universal “never end character's life” and fixed option-count taste from task prompts while preserving *currently nonlethal rules* and old v16 tasks.
3. **SA03/SA04**: source I/O and index efficiency, choosing by SA01 measurements. **Coordinate SA03 with full ENG03 lock capture**, which is a separate owner and already had a measurement.
4. **SA05**: explicit stored→selected→exact read→actually sent→used→published→later recalled evidence lineage.
5. **SA06**: deterministic need-aware selection between one-shot and already supported bounded memory exploration, under true effective usage and user preference.
6. **SA07–SA10**: conditional tools, model cache/route capabilities, significant descriptive memory and negative lifecycle proof. Do not bulk-implement.
7. **SA11**: repeatable provider-free 10–15-step corpus, with human taste unobserved until reviewed.
8. **SA12**: guarded live comparison tooling. Actual provider/model spending requires explicit separate consent for exact budget/route and source environment.

**All SA packets are Proposed.** A design-complete packet is not “Ready” for code until owner explicitly selects it and authorizes that scope. The repository keeps `docs/changes/README.md` `Current change: none`. Do not self-issue blanket authorization to execute twelve packets.

## What Cursor must not do

No production DB reset, paid OpenRouter/model/image call, rollout, schema migration, unspecified subagent framework, agent-controlled world-effect write, continuous world simulation by LLM, replay of uncertain paid attempt, arbitrary SQL tool, leaking private canonical/DM source in public UI, automatic GPT reasoning budget, or new payer/tier policy.

No reopening ENG09/ENG03-M/GM05/PW01 as Storyteller implementation work. GM01–GM07 own new mechanical capabilities; ENG03 owns source-lock transaction changes; PW01 owns published presentation read model; this program owns **creative work, evidence, model operation and quality**. If a needed field is absent, return a focused contract request to its owner instead of fabricating it in a prompt.

## Minimal first message to Cursor after owner approval

> Merge/reconcile the design branch with current main, inspect `docs/storyteller-architecture/handoff/cursor-first-wave-2026-11-14.md`, and implement **SA01 only**. Before editing, inspect its exact source symbols, relevant existing packet-lab/request-audit helpers and current source/branch. Use provider-free tests, no destructive DB or external OpenRouter calls. Return the redacted full-operation trace receipt with actual metrics vs unknowns, file diff, commands/tests run and a proposal for SA02. Do not choose or implement the next Change without separate instruction.

## What “done” means

**Not** that code compiles and the model outputs JSON. A meaningful milestone is that the owner can audit one actual scenario from player intention through source selection, cost and publication, then deliberately adjust effort/creative policy and observe whether a character's life becomes more coherent and worth playing. An external provider model result and 10–15-turn play remain **unproved** until explicitly executed and human-reviewed.

**On handoff:** send the index + exact selected Change, not the entire 100KB design library. The desired destination is stable; Cursor's job is controlled convergence from current source.
