# Offscreen RPG | Product reality audit

**Baseline:** clean `main@ec8c652c5b0a`, exported 2026-11-18. **Scope:** every one of the 31 `docs/product` Markdown files plus relevant technical docs, `STATUS`, source routes, research experiments and the developer wiki. No live provider run, no code edits and no canonical document changes were performed.

## Judgment

The documentation has increasingly good **navigation and implementation-status labels**, but still has a serious **product-feasibility** problem. Many ambition-level ideas are described with selected-contract language before an integrated, affordable, enjoyable experience has been demonstrated. An agent can locate the correct canonical page and act on something that was only enthusiastically brainstormed.

This is not evidence that the entire product wiki is false. Many current pages explicitly say Proposed, Blocked, illustrative or not implemented. The missing distinction is more fundamental: **selected by the owner** is not **proved enjoyable, coherent, technically implementable, or economically sustainable**.

The source has 31 product Markdown pages, ~33,206 whitespace-separated words. Nine Admin pages alone occupy ~7,312 words; they are mostly long-term operating models, which is fine as *research direction*, not as POC implementation priority. The snapshot's portable wiki reports 91 of 91 canonical pages reachable and no broken internal links among 3,147 inspected. Those are navigation metrics, not correctness or feasibility scores.

## Ranked product risks

| Risk | Current source reality | Why it matters |
| --- | --- | --- |
| **1. Genuine Storyteller quality** | Normal tasks are constrained one-shots, bounded memory-exploration optional; historical six Sol generations but no 10–15-turn sustained creative proof | Mechanical correctness can coexist with boring, brittle or incoherent gameplay |
| **2. Long-life recall with finite context** | Source-linked canonical material and bounded retrieval components exist; general long-lived live recall is unproved | False identity/fact merge or missed old promise undermines the game's key differentiator |
| **3. Breadth explosion** | D&D-style subset plus arbitrary worlds/forms and many proposed activity domains | Every extra action/form/world increases validation, schema, prompt and creative burden |
| **4. Spatial and autonomy semantics** | Cube map is a candidate; travel progress is undesigned; general delegated choice/queue proposed | Map pictures and prose can look convincing while consistency is not actually enforced |
| **5. Unit economics** | One measured Sol request cost $0.023294; real repeated-turn distribution absent | Optional agent loops, high context and repair can multiply cost despite cheap waiting |
| **6. Multiplayer / Admin breadth** | Co-op acceptance blocked; large staff workflow is future charter | Both should not contaminate the solo-playable proof |

## Feasible kernel to preserve

The most defensible product is not "an LLM simulates an entire universe." It is a small real-time consequential RPG where **the application owns truth**, **the player owns decisions**, **the model authors bounded situations and prose**, and **known routine work can progress without model polling**. A player makes an intention, the engine authoritatively resolves time/state and the Storyteller narrates within that evidence. Durable original passages remain searchable, but the model isn't promised omniscience.

The first actual playability demonstration should be **one authored setting, one solo protagonist, a very small supported ruleset, one recurring person/object, one meaningful activity, one interruption or return, and ~20–30 turns**. No map, no party, no world economy, no unbounded NPC autonomy, no generated imagery. Use a human-reviewed quality rubric and an explicitly approved inference allowance. This is a *proposed* milestone, not an already ratified rewrite of the existing small-party ambition.

## Economics without melodrama

There is no basis for treating the $20 chat subscription as an API meter or claiming the RPG necessarily costs $5,000 to test. The source reports an actual call near 2.3 cents. At that *same cost per call*, 30 turns are about $0.70 before retries, retrieval, hosting and context growth. Conversely, five repeated 100k-input/4k-output rounds at hypothetical $2/M input, $10/M output cost $1.20 per accepted turn, or $1,200 per 1,000 turns. These are scenarios, not price guarantees. The real missing proof is a representative **cost per accepted enjoyable turn** and cost per dormant day.

A relevant existing AI story product, AI Dungeon, explicitly exposes context/credit limits. That does not prove Offscreen RPG's more ambitious stateful design is feasible; it demonstrates that products in this category manage inference constraints rather than pretending they don't exist. Public references: https://help.aidungeon.com/faq/what-are-tokens and https://developers.openai.com/api/docs/pricing.

## Important research correction

`research/agent-practice/COGNEE-EVALUATION-2026-11-17.md` concerns **coding agents retrieving repository architecture**, not the RPG's in-game Storyteller memory. The pilot exposed stale indices and misleading relation extraction and was not adopted. This does not establish whether Cognee would help the *game*, nor does it justify adding a new graph service. The game should first benchmark its own source-linked lexical and bounded memory route against hard return scenes.

## Recommended sequence

1. **PVAL01:** immediately prevent "selected source of truth" from being read as "proved feasible" in the two documentation entrypoints.
2. **PVAL02:** ask the owner to ratify a *solo playability milestone* separately from the currently blocked small-party ambition.
3. **PVAL03 + PVAL05:** narrow grand mechanics and restructure benchmark vignettes as tests, retaining the dreams but removing implied implementation/release obligations.
4. **PVAL04:** bind quality and cost evidence to Storyteller/memory promises; then run a separately authorized tiny live experiment after provider-free measurement.
5. **PVAL06 only if earned:** add a small structured content-impact guard so unsupported claims cannot quietly become normative. Do not create an English-language truth detector or a bureaucracy of 1,000 claim rows.

The handoff includes a **31-page disposition matrix**, a **46-claim register**, interaction/coherence analysis, transparent cost models, editorial policy and **six unselected Cursor Change packets**. See the included `work/designs/open/product-reality-reconciliation/` directory. Copy the overlay to the real repository only after checking its current HEAD and selecting one packet through the normal Change process.

**Limitations:** source-text inspection, not executed tests or a fresh live-play evaluation. Snapshot excludes historical evidence and archived packets. Current script environment lacks the repository's Node dependencies; our overlay link checker passed 36 local links, but repo `wiki:change-guard` must be run against the actual configured checkout before any Change is marked Ready or Done.