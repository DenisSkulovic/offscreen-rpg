# Storyteller architecture alternatives | what should be replaced, what should survive?

**Status: comparative design decision, 2026-11-14.** This evaluates end states against the [original vision](../vision.md), independently of POC folder layout. Selected target: [bounded task-adaptive Storyteller](target-operating-model.md). Existing technical baseline: [code-flow audit](evidence/current-flow-audit-2026-11-14.md). Not executable code or a promise that one architecture is aesthetically superior in every story.

## The questions that actually discriminate designs

Does the option allow an ordinary character's slow life, emotionally significant quietness, exact source memory, supported unpredictable situations, diverse characters and rules, bounded spending/latency, many sleeping stories and replayable committed truth? Can the user still control consequences and style? Does a model failure strand life, or merely delay its own descriptive contribution?

Compare on **playability, safety, source correctness, economics and longevity**, not “number of agents.”

| Candidate | Creative potential | Authority/economics | Verdict |
| --- | --- | --- | --- |
| **A. Ever-growing permanent model chat per campaign** | Easy seeming continuity, conversational familiarity | Context grows; compaction can distort canon; expensive idle/session state; fragile restart, unclear attribution | **Reject** as truth owner. May use optional chat-like *user experience*, never permanent canonical LLM transcript |
| **B. One-shot model on every player click** | Simple, predictable, cheap per response | Misses old memory, opportunity strategy; could send bloated prompt every time; no flexible evidence investigation | **Keep as fast lane**, reject as exclusive long-term narrator |
| **C. One autonomous AI per NPC/world subsystem** | Illusion of many minds and emergent behavior | Massive uncontrolled costs/concurrency, conflicting source authority, no participant consent, hallucinated economy/world events | **Reject as default**, only possible bounded simulation modules after typed actor/permission mechanics and evidence |
| **D. General recursive multi-agent planner / tool-calling framework** | Broad, potentially impressive research | Fanout, re-transmission, nested budgets and conflicts, huge failure surface; framework-driven rather than game-driven | **Defer**. Require matched concrete quality/cost win and scoped child task before adoption |
| **E. Deterministic game engine + source-grounded adaptive bounded Storyteller** | Different task depths, long memory, quiet no-cost play, profile-specific creativity and later measured director | Existing causal authority can survive; requires rigorous source selection, tool contracts, loop/cost tracing and player quality evaluation | **Selected** |
| **F. Fully scripted event-template game with optional LLM prose only** | Excellent mechanical control/cost, can guarantee certain UX | Restricts unusual worlds/custom intentions/creative possibility; risks feeling canned | Useful **fallback**/demo and local prepared opportunities, not entire product vision |

## Why E wins, and what could change that judgment

**Story truth is not a prompt.** Time, item holder, accepted effects and player control must stay in domain state even if a future model gets much smarter. This favors deterministic authority in every candidate. E adds bounded evidence investigation and creative choice *when value requires it*, without making every character a prompt-completion.

**Richness is not proportional to agent count.** A one-shot given the right three sources may write better fiction than six agents sharing irrelevant summaries. The actual baseline has a real two-tool memory loop, but historical evaluation does not prove it increases sustained player interest. We should keep cheap work and measure optional research.

**Not all work is narration.** A ten-hour work shift can settle bounded checks with zero LLM calls, followed by one permitted consequence scene. A model job that takes 45 seconds should not change fictional time merely because it was processing. E makes this separation central.

**Maintainability over months.** Each generation is a captured task bound to source/revision/route/payer. Old task format can be replayed or held; game history exists independently. An opaque long provider thread cannot offer that strong a contract.

**When a rewrite is justified:** if the current task/result schemas can't support profile-faithful quiet/long-memory/world-neutral options without incompatible assumptions, replace the **prompt compiler/creative proposal layer**. If the current retrieval index can't handle 2,000 scenes, replace its index implementation behind a source-contract boundary. If application orchestration truly cannot preserve one generation/hold under parallel replicas, replace it only after a controlled causal migration. These are not reasons to delete successful receipts, canonical roots, actor ownership, funding windows or read privacy.

## Diagnostic falsifiers

E may fail if a 10–15-turn owner study finds it produces formulaic choices despite correct evidence; if exact source memory is not retrievable within plausible cost; if route policy gives neither sufficient output nor bounded latency; if plan validation rejects too much realistic player action; or if a more structured *world-domain* design is necessary for the target characters. Those failures trigger new product/game-mechanics decisions or a stronger source selector, not automatic adoption of a multi-agent framework.

**Promotion gate for optional subagents:** a specified specialist question cannot be answered with current deterministic/serial read tools, a bounded one-child experiment improves end-to-end accepted player quality under the **same total funding/source authority**, and replay/failures do not worsen. No recursive fanout without a separate product/expense decision.

**Promotion gate for compaction:** task-local working context genuinely exceeds bounded few-round strategy, a compacted optional artifact improves model use without losing required source identity, and no authoritative game fact moves into an opaque summary. Ordinary game turns never need compaction of entire campaign.

## Selected end state

A modular-monolith game with durable accepted actions/time/receipts, immutable current and historical source, task-specific versioned prompt and output contracts, simple one-shot fast lane, an optional **serious read-only evidence loop**, bounded creative-direction work, and a measured human-quality feedback cycle.

That architecture can serve radically different fictional worlds, ordinary lives and user-selected narration policies without pretending that the LLM is an omniscient world simulator. **It's an adaptive storyteller sitting atop a real game, not an AI agent disguised as a game.**
