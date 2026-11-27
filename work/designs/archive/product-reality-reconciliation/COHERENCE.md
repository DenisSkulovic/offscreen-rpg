# Coherence review | where appealing features collide

**Purpose:** diagnose interactions between product commitments, not assess every idea independently. These questions require either a clear scope decision or a cheap differentiating experiment. Recommendations below are the auditor's *default*, not already ratified product policy.

## 1. What is the actual game loop?

The fantasy is an autonomous living story. The source-supported kernel is much narrower: present a bounded situation, offer meaningful action, execute approved rules/elapsed time, keep exact consequences, create a new bounded situation when warranted. That is the most plausible first game.

**Recommended solo vertical slice:** one authored starting location, one primary character with a limited rule set, one nontrivial NPC, one meaningful transferable object/resource, two immediate decisions, one finite work/wait commitment, one optional interrupt, one return after the browser is closed, one callback to an earlier promise. Play 20–30 turns with **no maps, no multiplayer, no unbounded autonomy, no auto-generated world economy, no generative scene images**.

The app does not need to predict an arbitrarily long future. It needs to give a player a reason to care, remain truthful between interactions and return the correct consequence. Evaluate whether the user would voluntarily continue, not whether the entire schema is admired by developers.

## 2. D&D mechanics versus arbitrary beings/worlds

`gameplay/rules.md` makes a versioned d20 skill/check subset foundational, while `worlds-and-characters.md` keeps bodiless and microscopic forms viable. Applicability flags stop invalid rolls but don't explain what *meaningful actions* and failure look like for a microbe, or how six attributes affect an unbounded world ontology. This is a **design-space explosion** problem, not a TypeScript abstraction problem.

**Default:** the engine must not hardcode human body/economy/geography, but **the first content pack may absolutely be narrow and humanoid**. Use one deliberately unusual form as a separate adversarial test of incorrect assumptions, not as a mandate that all rulesets are equally complete.

## 3. Player freedom versus finite authored options

`actions-and-commitments.md:29–33` forbids the engine from manufacturing choices from physical opportunity. That prevents nonsensical auto-generated verbs, but it makes the Storyteller the creative bottleneck. More callbacks and customized actions imply more inference. Strict menus improve deterministic correctness while potentially making play feel like a choose-your-own-adventure book.

**Default:** accept menus for V0, but test whether players repeatedly try to do something reasonable that the menu omits. Count how many accepted choices actually alter resources, time, relationships or upcoming decisions; do not mistake cosmetic wording diversity for agency. An eventual free-intent path needs its own safety/cost/proposal contract.

## 4. "Life of its own" versus consent and inactivity

`vision.md` desires autonomous living characters; `time-and-autonomy.md#pace` rightly forbids fictional progress without accepted work. This is not a technical contradiction if marketed carefully, but it *is* a product tension: a player may expect the character to live while absent, when actually the accepted work queue or the world is frozen.

**Default:** promise **consequential offscreen progression of already accepted work**, not autonomous intelligence making personal decisions. This is still meaningfully different from ChatGPT narration and dramatically cheaper.

## 5. Map, place, journey and scene are four different authorities

The source currently distinguishes world truth, staging and visual camera. Good. But no chosen route topology, distance model or movement interpolation exists. The 3D cube option adds storage, cardinality, coordinate/scale, pathfinding, encounter placement, line-of-sight and synchronization questions that a story-focused POC has not earned.

Compare three implementations in an **offline design spike**, with the SAME interruption story:

| Candidate | Data needed | Correctness we can prove | Hidden cost |
| --- | --- | --- | --- |
| No spatial engine | current named-place/relative whereabouts + saved departure/target/progress description | no unexplained arrival; one actor location state | broad movement requests still require Storyteller judgment |
| Minimal directed place graph | stable places, edges with admitted travel duration/conditions, active leg + remaining time | departure, interrupted-leg, reroute and arrival can be deterministic | graph authoring and source-of-truth ownership |
| Uniform 3D cube grid | cells, scale, per-cell environment, links, obstacles, transitions and mixed-world semantics | spatial path constraints, if designed | content explosion, tooling and visualization |

**Default:** no map for solo V0; use named-place + activity state. If a route-specific acceptance fails without topology, test a **tiny place graph**, not a 3D grid. Do not add map UI as a substitute for semantics.

## 6. World-state ownership: too much truth for one creative model

A generated sentence may mention nine patrons, a gemstone, a promise, a rumor, and a door. All details could become consequential later. Recording every noun makes entity state and prompts balloon; recording none loses continuity. The core challenge is not just storage: **selecting what to promote and later retrieve**.

**Default:** maintain typed exact state for resources, commitments, positions when modeled, and selected identity ties. Preserve original passages so important detail isn't destroyed. Let the model propose *small* source-backed descriptive changes, but gate by bounded policy and reject contradictions. Do not treat every named entity as a new actor, and do not force semantic extraction/embedding on each passage.

## 7. Memory retrieval versus invention and cost

Canonical files offer inspectability, not semantic comprehension. Lexical search may miss paraphrases; vector search may retrieve plausible wrong people; agentic loops may spend additional rounds to get the right passage and still misinterpret it. Larger context can preserve nuance but repeats expensive bytes; lossy summaries can lose key details. These are competing failure mechanisms.

**Default:** compare **(A) exact current state + active scene + bounded source notes**, **(B) deterministic source-scoped lexical retrieval**, **(C) optional bounded evidence-tool exploration** on the same day-30/return and irrelevant-scene cases. Add semantic retrieval only after it beats the measured baseline on correct source discovery and does not worsen unsupported claims or cost. The **2026-11-17 Cognee decision applies only to coding-agent repository knowledge** and is not a negative gameplay benchmark.

## 8. Structured mechanical promises versus creative judgment

An LLM must author plausible choices, DCs and rule-valid effects in a restrictive schema. The larger the generality, the bigger and more fragile the schema; multiple round trips and repair attempts may undermine quality and cost. `request-context-and-cost.md:169` records roughly 24 KB of schema for one activity-consequence request in a provider-free audit. This is actual prompt surface area, not proof that a good narrative is generated.

**Default:** fix a few supported action families and target explicit plans rather than dynamically generating universal mechanics. Validate no invented effects. But additionally human-rate prose naturalness, meaningful choice, surprise without contradiction, and emotional continuity. A perfectly typed boring game is still boring.

## 9. Persistent local time versus shared-world concurrency

Shared pause/choice/knowledge means changes by one participant can invalidate another's prepared work and private context. Even one wizard in an apple held by a companion creates causality across scenes. This is a distributed state coordination product in its own right.

**Default:** solo V0, clearly bounded co-op as a later independent vertical slice. Do not add multiplayer as an incidental "one more person" toggle, or let the first-playable heading imply a ready collaboration contract.

## 10. Cinematic expression versus repeated inference

The selected Book POC is tractable. Asking the Storyteller to author scene direction/art every turn introduces extra output schemas, media costs, visual consistency and moderation considerations, while not fixing gameplay. Conditional DIR03 is correctly held.

**Default:** complete the static/stable Book and minimal deterministic semantic tokens. Use static assets or non-LLM presentation where possible; do not tie visual progress to a model-art cost multiplier.

## 11. Administration before the player product

The Admin charter models a company with finance, marketing, LiveOps, Trust, support and hundreds of cases. Its authority safety constraints are worth retaining. But broad implementation is not evidence that anyone wants to play.

**Default:** keep development forensics, spending stops, result inspection and a tiny operator path. Store the rest as a coherent later company-operating hypothesis without advertising it as an MVP dependency.

## 12. First CV demo versus earned hours

The near-term portfolio target needs a visitor to see a meaningful consequence almost immediately. The intended main-game loop derives satisfaction from work and travel that actually consume time. A demo cannot silently turn every elapsed-hour promise into instant rewards and then claim production mechanics have been demonstrated.

**Default:** one truthful fast onboarding decision followed by a visible timed commitment; provide a **clearly labeled accelerated demo clock** backed by the same deterministic mechanic. Never hide the acceleration. The human demo must validate that a normal-mode wait and restart persist.

## Explicit proposed decisions for the owner

1. Make the **solo, source-grounded 20–30-turn session** the first playability milestone; co-op moves to a later validation program.
2. Limit first-playable world content to one authored small setting and typed actions. Keep engine form-neutral where cheap, but stop using arbitrary worlds as the initial success criterion.
3. Choose no interactive map / no 3D cube schema for V0. Require only truthful whereabouts; open a tiny graph spike if/when two-location travel makes it necessary.
4. Prohibit unattended discretionary NPC/player decisions; only preaccepted work progresses.
5. Treat agentic memory and creative initiative as optional experiments, not baseline dependencies.
6. Separate playable quality and unit/architecture correctness; both have to pass.

These are **recommendations**, not existing product choices. Cursor should not silently install them as canon without the specified ratification Change.
