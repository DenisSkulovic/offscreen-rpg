# Storyteller creative exploration

Status: Agreed
Approval: The owner confirmed continued implementation on 2026-09-21 after reviewing the proposed distinction between factual retrieval and bounded creative exploration.

## Intended outcome

The Storyteller can do more than retrieve facts it already knows to ask for. When a turn deserves it, it can explore a vast campaign for surprising but fitting callbacks, contrasts, relationships, motifs, unresolved tensions and possible developments, then converge on one grounded turn. A cheap or quiet game may skip this work completely; a richer posture may spend more bounded inference and retrieval effort on creative breadth.

Success is not “the model read more text.” The player should experience turns that feel perceptive, specific and causally connected to their history without stale facts, arbitrary twists or relentless escalation.

## Representative flow

After a long quiet stretch, the player returns to Greywake and chooses to repair fishing nets. Exact context supplies the current quay, character state and selected activity. Ordinary retrieval finds the repaired bridge and Mira's unresolved favor. Creative exploration then asks several different questions: what old detail could gain new meaning here; which unresolved relationship can intersect this routine without forcing a quest; what contrast or echo fits the campaign's current direction; and what distant eligible memory would be surprising but coherent?

The system returns compact, source-linked discovery leads rather than a corpus dump. The Storyteller may inspect the original promise and an old storm passage, sketch a few private directions—Mira quietly asking for help, the repaired bridge changing local trade, or the storm-damaged token resurfacing—and select one. The published turn still permits fishing and does not declare an unadmitted possibility true.

With creative exploration disabled, the same turn uses exact/current context and remains valid but less ambitious. In a microbe world, the lenses seek environmental recurrence, adaptation, gradients and unresolved pressures rather than people, quests or human themes. A no-grand-narrative campaign is allowed to find texture or resonance without manufacturing an arc.

If exploration finds nothing useful, exceeds its budget, encounters partial index coverage or produces only incompatible ideas, the Storyteller falls back to the grounded ordinary turn. Retry reuses persisted requests/results and cannot multiply brainstorming spend.

## Scope and boundaries

Included:

- an explicit distinction between evidence retrieval and creative discovery;
- compact orientation over themes, tensions, motifs, relationships, changes, open possibilities and unusual eligible details, all navigable back to canonical sources;
- bounded creative lenses such as echo, contrast, consequence, relationship, dormant thread, setting affordance, thematic resonance and controlled serendipity;
- adaptive local, associative, relational and global discovery behind one application-owned recipe;
- a private diverge-then-converge workflow: discover leads, inspect evidence, form a small set of candidate directions and choose/compose one final result;
- source-linked private `story spark`/direction artifacts that clearly separate observed evidence, inferred connection and proposed possibility;
- configurable off/minimal/balanced/rich postures governing rounds, searches, breadth, candidate directions, context, latency and spend;
- replayable traces and fork-based comparison from the same story position;
- stage-separated evaluation of discovery, evidence grounding, direction diversity, final use and human/player preference.

Boundaries:

- Current mechanical state, canon, branch/visibility rules and committed consequences remain deterministic authority.
- A retrieved relation is evidence only if admitted by a source. A model-inferred association is a lower-authority discovery aid. A candidate direction is not a fact.
- The system does not store private chain-of-thought. It stores bounded, inspectable outputs: queries, leads, source references, concise connection claims, candidate directions and selection outcome.
- Creative exploration is not mandatory on every turn, not synonymous with escalating stakes, and not permission to override a no-grand-narrative setting.
- This feature does not adopt GraphRAG, a vector database, multi-agent brainstorming, recursive summaries or an LLM judge by default. Each is an optional technique only if it wins under the same corpus, final-context and cost constraints.
- Player preference and “wow” cannot be reduced to retrieval recall. Structural evaluators diagnose failures; human comparison and actual play remain the taste gate.

## Acceptance

- From one fixed long-story checkpoint, ordinary factual retrieval and creative exploration produce observably different artifacts: the latter surfaces at least three materially different, source-navigable directions without changing canon.
- At least one accepted direction depends on a useful connection spread across multiple distant sources that a single literal top-k query misses.
- The final turn cites the evidence it actually uses and distinguishes established facts from interpretation and new possibility.
- Quiet, directed, no-grand-narrative and abstract/nonhuman fixtures use the same generic exploration contract without mandatory quests, people, calendars, geography or escalation.
- Off/minimal/balanced/rich recipes produce inspectable cost/quality trade-offs. Zero disables all extra calls and falls back cleanly; no omitted allowance means unlimited work.
- Controlled serendipity cannot cross branch, visibility or authority boundaries, and cannot displace required current facts from the final packet.
- Crash/retry resumes persisted work without repeating model calls or reads; partial/no-useful discovery remains explicit.
- Fork-based blind review compares multiple directions from the same canonical checkpoint. Review records specificity, coherence, surprise, restraint, continuity payoff and desire-to-continue; no single automatic score certifies quality.
- A connected playthrough demonstrates discovery → exact evidence → private alternatives → selected candidate → ordinary validation/publication. Scripted fixtures establish plumbing only, not creativity.

## Decisions still needed

- Which smallest first lens set provides useful diversity without prompting several cosmetic variations of the same beat.
- Whether the first POC generates candidate directions inside the final Storyteller round or uses one separately metered private ideation round. The answer should follow fixed-budget comparisons, not architectural preference.
- What lightweight derived orientation is worth maintaining before episodic cards and explicit links are complete; generated themes or inferred edges must never become required authority.

## Owning specifications

[Storytelling](../../storytelling.md), [long-story memory](../../engineering/long-story-memory-and-retrieval.md), [context and cost](../../technical/context-and-cost.md), [Storyteller agency and taste](../2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md), [memory exploration](../2026-09-21--10-55--storyteller-memory-exploration/FEATURE.md), [relational/global synthesis](../2026-09-21--10-55--relational-and-global-story-synthesis/FEATURE.md), and [QA journeys](../../engineering/qa-journeys.md).

Research basis: [Tree of Thoughts](https://arxiv.org/abs/2305.10601) demonstrates bounded generation/evaluation of alternate reasoning paths, including a creative-writing task; [Dramatron](https://arxiv.org/abs/2209.14958) demonstrates hierarchical narrative planning while reporting long-range-coherence and co-creative limitations; [GraphRAG](https://www.microsoft.com/en-us/research/publication/from-local-to-global-a-graph-rag-approach-to-query-focused-summarization/) demonstrates global query-focused synthesis and diversity over large corpora; [DRIFT](https://www.microsoft.com/en-us/research/blog/introducing-drift-search-combining-global-and-local-search-methods-to-improve-quality-and-efficiency/) combines broad orientation with iterative local follow-up. These motivate experiments, not automatic adoption.
