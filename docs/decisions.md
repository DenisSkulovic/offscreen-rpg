# Project decisions

Updated: 2026-09-17. Product baseline v0.01. This is a chronological decision history: later explicit supersessions govern. D061 advances the phase; old product-only instructions below are historical.

## Confirmed by Denis

| ID | Decision |
| --- | --- |
| D001 | Start fresh. Reuse only the broad playable-RPG dream, with no old code, detailed ideas, technologies, or architecture carried forward. |
| D002 | Define a D&D-style harness: code manages most state and mechanics; LLMs narrate and make decisions. |
| D003 | Support multiple AI providers/models and configurable expenditure. Large-world continuity must not depend on a giant prompt. |
| D004 | Work on definition and documents now; no package scaffolding or implementation yet. |
| D005 | Keep project documentation synced through Google Drive. |
| D006 | Keep costs central for assistant work, development, and eventual play. |
| D007 | UI is later; image generation is a potential future extension. |

## Additional direction confirmed by Denis

| ID | Decision |
| --- | --- |
| D008 | Work in dependency order: product documentation, then technical documentation, then code. Current scope is product only. |
| D009 | Start with a concise product cornerstone, then map the future documentation library, then elaborate it through ongoing discussion. |
| D010 | The harness is setting-independent: worlds may begin undefined, emerge during play, be custom, or draw on established fictional settings. |
| D011 | The experience is primarily text-based. Affordable models must support development/testing; broad provider/model support remains the ambition. |
| D012 | Remain aware of technology capabilities and limitations without defining technical solutions yet. |

## Earned progression — confirmed by Denis

D013 (qualified by D022 below): The defining play style makes advancement require real player investment, particularly time and attention. The narrator must not grant high-tier equipment or equivalent progression through a few minutes of accommodating conversation. This is a core product direction, not merely optional pacing. Exact durations, passive rewards, and attention requirements remain open. “Pay” refers to player investment, not monetary purchases.

## New direction proposed by Denis: time as a resource

Initial direction included real elapsed-time play, short-term plans and protection from absence. The current direction permits ongoing autonomous life and configurable risk, notifications and time; explicit pause remains protective. Earlier blanket absence protection and short-plan-only autonomy are superseded by D017–D019 below. Example durations are illustrative, not approved balancing. Details and tradeoffs are drafted in [time, presence, and autonomy](product/experience/time-presence-and-autonomy.md); whole-campaign pause is confirmed below; D022 confirms configurable speed changes and instant-time alternatives, while exact rates and locks remain open.

## Single-player living world — confirmed by Denis

- D014: Single-player game. The entire world is paused or progressing at a configured rate. Both user pause and automatic pause on certain events freeze world progression. Specific triggers and rates remain open.
- D015: The harness is a complete persistent game managing data, state and mechanics. LLMs supply relatively inexpensive narration, decisions and generated content within it.
- D016: Support lives unfolding over weeks of real play, including ordinary livelihoods, relationships, travel and changing roles. Events arise from player initiative and from the surrounding world. Seyda Neen and Gondor are illustrative fantasies, not fixed settings or mandatory starting conditions.

## Autonomy and risk clarification — confirmed by Denis

- D017: D&D and a dungeon master are the principal roleplaying inspiration, with extended time governed by the game clock. No official edition is selected.
- D018: Support moving between direct control and configurable autonomy, including ongoing routines across days of absence. This supersedes mandatory short-plan-only autonomy.
- D019: Configurable consequences may include robbery, total possession loss and death during unattended running play. Casual/nonfatal and hardcore/ironman styles are intended. Event notifications can offer timed intervention, followed by autonomous decisions on expiry. This supersedes universal loss protection during absence. Explicit manual pause still freezes everything; pause-and-wait remains a configurable policy, not the universal default.

Default settings, response-window clock behavior, autonomy permissions and exact ironman rules remain undecided.

## Assistant setup choices, reversible

- A small linked Markdown knowledge base in projects/rpg-harness.
- Compact entry brief and task-specific reads; no new documentation service.
- Current sources are product/PRODUCT_VISION.md, DOCUMENTATION_TREE.md, and WORKFLOW.md. Earlier exploratory product and technical proposals are archived, not adopted.
- DOCUMENTATION_TREE.md owns the library inventory; optional topic coverage does not commit features or future writing.
- Git is deferred for now; revisit for baselines or parallel work.
- No product brand selected by the folder name.

## Still proposals

The cornerstone is a working baseline for elaboration; the revised library map is an assistant proposal requested by Denis. Character count, D&D edition/source scope, player authorial control, cost modes, and first-release scope remain undecided. Archived pipeline and memory designs are not active requirements.

## Not chosen

Stack; providers/models; storage/retrieval products; budgets; setting; D&D edition and source scope; licensing approach; deployment; launch date. Multiplayer is excluded by the confirmed single-player direction.

Record future accepted decisions here with rationale and consequences. Supersede old decisions explicitly rather than leaving conflicting instructions.

## Character fallibility — confirmed by Denis

D020: Trust in autonomous judgment is intentionally uncertain. Intelligence, personality and flaws can produce foolish decisions with real consequences. This supersedes the assistant’s assumption that the character should reliably choose sensibly or protect player interests. Exact trait mechanics and the relationship to explicit player orders remain undecided.

## D&D foundation and configurable time — confirmed by Denis

- D021: Reuse D&D mechanics broadly as the actual rules foundation. This supersedes treating D&D as merely stylistic inspiration or recommending a custom rules substitute. Edition/source scope and first-release coverage remain open.
- D022: Time investment defines the central experience, but optional accelerated and effectively instantaneous time passage are supported. Flexible campaigns may change speed during play; Ironman-style modes can lock selected settings. This qualifies D013 and supersedes a blanket prohibition on removing real waiting. Other game requirements remain governed by the active rules. Exact settings and defaults are open.

## Documentation tooling — assistant decision requested by Denis

Use Markdown, the library map, topic metadata and local keyword/section search now. Defer embeddings, vector services and hosted knowledge-base tools. Reconsider ranked full-text or hybrid retrieval only against concrete retrieval failures. See [documentation tooling](DOCUMENTATION_TOOLING.md). No runtime game technology is selected by this choice.

## Multiple decision-timing styles — user direction

D023: Support configurable play styles including continuous progression, waiting for player decisions, and timed choices with a default/autonomous fallback. A simpler first-release subset is appropriate; exact styles, defaults, timer duration and MVP selection remain open. This is separate from world pace. Ten seconds is illustrative.

## Preserve alternatives before MVP scoping

D024: Record options, forks and tradeoffs during product exploration. Do not prematurely solidify every choice. At MVP scoping/implementation planning, identify what to implement, postpone or cancel; resolve only what is necessary for the work being implemented. Unselected alternatives remain visible and are not promises to build everything.

## Proposed direction: identity constrains direct control

Denis proposes that the player’s choices should be restricted by the character’s capabilities and personality even under direct control. Record as a direction under exploration; hard restrictions, resistance/costs, contextual exceptions and character growth remain unresolved. See DOC-CHARACTER-IDENTITY. The fisherman illustration is not committed content.

## Plans and autonomous adherence — confirmed by Denis

D025: An autonomous character can depart from or abandon the player’s plan due to personality, desires or changing motivation, including after initially committing to it. The player may only discover this upon returning. Plans are not guaranteed execution. The drinking/work illustration does not prescribe content or mechanics. Detailed influence, permissions and notifications remain open.

## Plans versus unfolding circumstances — confirmed by Denis

D026: External world events can interrupt, invalidate or transform a player plan independently of character willingness. World changes and character responses may compound over an unattended period. The actual history, not the intended schedule, determines outcomes. Listed mining/war/illness examples illustrate breadth; they are not a committed event catalogue.

## Character within unfolding history — user clarification

D027: The world is an unfolding history in which the character participates; world and personal developments can influence each other. The Dwarf Fortress analogy expresses this relationship, not a commitment to centuries of pre-generation, exhaustive simulation or a particular setup duration. Sparse starts and global pause remain intact. Historical-generation approaches are open alternatives.

## Explicit mechanics and selective model use — user clarification

D028: The harness needs clearly defined entities and substantial non-LLM game mechanics, rather than relying on vague descriptions and frequent model adjudication. Routine actions and progression should resolve through game rules; model calls should be selective for narration, content and decisions that warrant them. Procedurally generated content can vary within defined mechanics. Work quantity, rate and character modifiers are a candidate illustration, not an adopted formula or replacement for D&D. Exact entities, action contracts, decision policies and call budgets remain to be defined. See PRINC-009 in [product principles](product/foundations/product-principles.md).
## Multiple explicit game systems and broad inspiration — user direction

D029: Define the product as a set of interacting game systems, including work, travel and combat, rather than leaving their operation to narration. Explore useful mechanics and patterns from other games, including but not limited to Rimworld. This extends D028 and does not supersede the D&D foundation in D021. The systems map is a proposed decomposition, not acceptance of every listed feature or a first-release scope. Exact borrowed mechanics require evaluation before adoption.

## Review direction and first-playable emphasis — 2026-09-16

- D030: Denis reiterates that unattended life should use very limited paid inference, with explicit game logic for routine work and selective hybrid logic/LLM decision nodes. Player spending preferences may influence call frequency and model quality. A week away costing a few cents, roughly half a dollar, a dollar or somewhat more are illustrative affordability ambitions, not selected caps or verified forecasts. Multiple models/providers remain intended flexibility; OpenRouter is a candidate mentioned in brainstorming, not a selected vendor.
- D031: Asked which first-playable experience would most strongly make him return, Denis selected: “A character living between visits, with a small but playable adventure loop.” This establishes emphasis only. The detailed slice in DOC-RELEASE-SCOPE is an assistant recommendation awaiting relevant product decisions.
- Working clarification: recorded owner decisions establish direction; generated elaborations remain proposals until agreed. The assistant owns document maintenance and must surface consequential choices rather than infer blanket approval of generated drafts.

The audit's proposed budget-exhaustion policy, model-role allocation, initial clock profile, source baseline and release placements are not accepted by these entries. See TASKS.md for the next decisions.

## Changing circumstances and unattended experience — user direction

D032: Asked about continuous activity/notifications while the computer is off versus catch-up on return, Denis favors a configurable experience, depending on gameplay style and changing circumstances: how much autonomy to allow and how much contact he wants or can attend to. This supports adjustable autonomy and notification preferences rather than one permanently fixed unattended experience. It does not select infrastructure, require every availability mechanism in the MVP, settle default values or override deliberate campaign locks. Exact transition behavior and available runtime remain open.

## Mechanical flexibility across worlds, embodiments and scales

D033: Denis makes mechanical generality a core platform requirement. Worlds can span antiquity, medieval and modern life, vehicles and firearms, space and intergalactic travel, magic and mixtures. An inhabited character need not be humanoid or a person: birds and microscopic organisms are explicit examples. A campaign may cross these domains and scales during play. The flexibility must affect actual capabilities, interactions, time and consequences, not only names and narration. D&D plus time plus LLM remains the foundation; the exact boundary between adopted D&D behavior, configurable content and required extensions must be resolved explicitly. This rules out silently hard-coding a medieval humanoid worldview, but does not constitute evidence that arbitrary generated mechanics already work.

D034: Starting such a campaign should be fast and simple for the player. Denis proposes LLM-assisted generation of the world, relevant entities and appropriate mechanics from a natural-language premise. The simple setup goal is confirmed; a particular generation pipeline, runtime-generated code or unlimited automatic mechanic synthesis is not selected. Gandalf mining asteroids then confronting viruses at microscopic scale is a cross-domain test illustration, not required bundled content or a claim of canon fidelity. Initial powers are valid setup choices under a defined campaign contract; earned progression governs subsequent play and must not force every starting character to be weak.

## Applied reviews — user working instruction

D035: Reviews must implement all valid text edits in the authoritative documentation, not end as standalone review Markdown files. Keep substantive proposed behavior in its owning topic and only genuine user choices in the active queue. No standalone review report is required or retained unless Denis asks. This does not turn unselected product defaults into accepted decisions.

## Concrete web-platform MVP direction

D036: Denis clarifies that this is a SaaS-style web platform and a quickly deliverable GitHub project demonstrating full-stack and AI/agentic engineering, not a conventional game-engine project. Preserve single-player campaigns; this does not select multiplayer, subscriptions, billing, hosting vendors or a software stack. Credible architecture should support the playable slice rather than delay it with optional infrastructure.

D037: Start with a simplified square-grid map. Locations can carry terrain and other relevant metadata, contain sublocations and actors, and connect through travel that progresses with ticks and configured game speed. Keep the underlying product concepts extensible to vertical levels, other topologies, space and large distances; initial square geometry is not a universal law of every world. Richer spatial forms remain later scope.

D038: The initial reference experience is generated everyday life: ask to be a kwama egg miner on Vvardenfell, receive a simplified playable map, selected and procedural NPCs, some groups, travel/work, visible possessions and currency, phone notifications and simple choices such as travel to a city or enter a tavern. This makes timely phone contact part of the initial direction, superseding the earlier assistant suggestion to defer it. Names, ten-hour shifts and five septims are illustrative, not verified lore, adopted balance or mandatory starting content. Limited trade is a candidate. Dialogue may be omitted to reduce cost; code narration or small model contributions are acceptable.

D039: Explore efficient generation, bounded context, caching and useful modern tooling as part of the engineering value. World setup may be relatively inference-heavy, but no cost dominance is proven. GPU/KV caching is an investigation candidate, not a committed MVP dependency. No repository creation, deployment or technology choice is silently made by these product updates.

## Portfolio purpose and autonomous livelihood — user clarification

D040: The primary delivery goal is a GitHub showcase demonstrating senior fullstack engineering. Product judgment, abstraction, credible architecture, modern tooling and optimized AI integration are central success criteria, alongside enjoyable play. A minimally functional toy is insufficient. This prioritizes demonstrable engineering depth without selecting technologies or requiring speculative infrastructure. Exact target roles and stack preferences remain unselected; do not infer them from the project genre.

D041: Narrow the first experience toward a Tamagotchi-like character living in a generated world, with configurable routines and reports. The fisherman in Seyda Neen illustrates locations/sublocations, NPCs, sleep, fishing, tavern visits, buying food and selling fish, and unattended income/expenses over many fictional days. Thirty days, 100 septims earned, 90 spent and 10 remaining are accounting illustrations, not balance promises. Exchange and recurring expenses illustrate possible routine consequences; this example does not select a profession or require its particular mechanics. Their initial depth remains proposed, as do rumors and drunkenness. Complexity can grow after this coherent organism works. Broader adventure remains direction, not a prerequisite for this first slice.

D042: Denis explicitly clarifies that the fisherman is only an example; fishing must not become a core mechanic. Correct the assistant’s over-specific interpretation of D041. The core is generic supported activities, configurable routines and their persistent consequences/reports. Professions, settings and activity catalogues are content examples, not selected release requirements. This same rule applies to the miner and future brainstorming examples.

## Generating a world and directing its unfolding life

D043: Denis identifies interconnected world generation and ongoing simulation as technically interesting portfolio areas. Procedural structure can combine with LLM-authored lore/content, while characters move, time advances and events/decisions resolve under pause, resume and speed controls. Dwarf Fortress/Rimworld are inspiration, not selected algorithms, lore or civilization-simulation requirements. A DM-like agent that introduces and develops storylines is a candidate worth defining; its precise authority and first-release depth remain proposals.

D044: Developments can occur during real-life absence, including consequential surprises discovered through notifications later. The overnight kidnapping illustrates that appeal; it does not select fishing, bandits, kidnapping, combat/captivity systems or universal permission to resolve danger unattended. Active campaign autonomy/risk/pause settings govern whether a particular event proceeds, chooses an authorized default or waits. Preserve D042's example-versus-requirement distinction.

## Storyteller-driven incidents and selectable styles

D045: Denis selects storyteller-driven incident origination as the intended alternative to requiring a deeply simulated world to independently produce interesting events. An LLM-based storyteller may introduce an incident and necessary compatible participants/content without an existing faction leadership decision or simulated causal prehistory. Existing routines, facts and mechanics persist; consequences of introduced incidents must be real and consistent. This clarifies D043 and supersedes any assistant implication that all incidents must emerge from already simulated actors. RimWorld is the analogy, not a mandate to copy its exact implementation.

D046: Offer different storyteller styles/presets as a product direction. Exact presets, names, first-release count, settings and switching defaults are unselected. Styles can differ in pacing, unpredictability, tone and follow-through; LLM-based authorship is intended, with bounded costs and logic remaining available for scheduling, validation, resolution and fallback. No dedicated agent/model per NPC or storyteller preset is required.

## Rich content, selective persistence and simulation

D047: Denis explicitly moves away from generating and simulating exhaustive complex worlds. Rich lore, characters and factions remain important, but individuals need not exist in data until relevant, and established characters need not continuously perform off-screen routines. Storytellers abstract the unspecified activity while preserving consequential state and history. Rich world content, persistent entities and active simulation are distinct responsibilities.

D048: Recurring characters and objects must retain continuity across long gaps. The illustrative sale of a golden spear to Bob, followed days later by Bob returning with it in an attack, requires persistent identity, transfer history and compatible subsequent facts, not daily simulation of Bob. Bob, the spear, the father and the attack are examples, not required content or a selected family/combat feature. An irrelevant unintroduced miner Steve need not be individually generated or simulated at all.

## Everyday life, story and timed opportunities to intervene

D049: Denis reiterates that both unfolding story and Tamagotchi-like character life are central. Quiet routine reports are valid alongside disruptive storyteller incidents; the game need not manufacture major drama on every visit. The spaceman, radar, pizzas and space crabs are illustrations, not selected setting, activity or incident mechanics.

D050: The desired interaction includes a phone invitation with a limited real-time response window, followed by an automatic character decision if unanswered, influenced by dice and personality within permitted autonomy. Fifteen minutes is illustrative, not a selected universal timeout. This brings timed intervention into the proposed initial experience instead of leaving it categorically for later. Exact defaults, risk permissions, clock behavior and outage handling remain draft contracts in DOC-INTERVENTION.

## Attachment, tonal range and unfolding incidents

D051: Denis's successive examples clarify incidents with multiple stages: a player gives a brief instruction, returns to real life, and later receives an update with new consequences and another decision. A selected action need not end an incident or guarantee safety. Meaningful injury or loss may already have occurred when an invitation arrives, within the active campaign permissions. Five/ten-minute intervals, hiding, space creatures and limb loss are examples, not required content or timing defaults.

D052: Routine observed over real-life days should build attachment to the character and their relationships. Storytellers can create comedy, absurdity, horror or tragedy against that ordinary life. The talking tree and violent loss of a spouse illustrate emotional range and consequential surprises, not required family, dismemberment or specific event systems. Do not flatten this into universally safe play or require every serious event to be preventable through a notification. Particular violence, presentation intensity and initial coverage remain configurable/proposed rather than universal defaults.

## Story-centered surfaces, returning to a life and player initiative

D053: Denis proposes messaging integrations such as Slack or WhatsApp as possible game interfaces, with a browser experience as another surface. No provider or channel-first release is selected. Reject a sprawling management UI as the design target: story, events and the current situation are central, with creative presentation and contextual access to locations, items and characters. This revises assumptions that every phone interaction must open a custom web screen; it does not remove the senior fullstack quality goal.

D054: Character-centered attention and knowledge are proposed as the default presentation approach. Show what matters in the present situation, while keeping relevant known history accessible. Offer a focused chronology and current-state recap, including return after months of pause. Optional inexpensive images are an exploration candidate, not a selected provider, price promise or required image pipeline.

D055: The player can initiate and interrupt actions outside storyteller invitations: change travel, use an available item, stop or remain idle. Ordinary mechanics can produce consequences over time without a storyteller choosing each one; storytellers can introduce additional developments. Desert travel, a teleportation totem, exposure, death and rescue illustrate this interplay, not required content or fixed time-to-harm. Stopping the character's action is distinct from pausing the world.

## Office-day companion as a reference use case

D056: Denis identifies personal entertainment during an office day as a compelling use case: create an ongoing character and receive occasional Slack updates ranging from amusing observations to urgent, consequential situations with a few response options. Brief involvement should coexist with ordinary work and autonomous continuation. Slack is now a concrete reference channel, still not an explicit launch/vendor selection. Diveman Dave, unusual fish, the attack, three choices and ten minutes are illustrations, not required content, counts or defaults. This is personal single-player entertainment, not a selected workplace-team or corporate-product direction.

## Variable story intensity and optional participation

D057: Denis clarifies the defining experience: story intensity can vary from uneventful routine/travel to sustained danger and back. Storyteller settings govern pacing and developments, while the player can exercise meaningful agency when desired. Under delegated running play, ordinary nonresponse should not halt the story; it progresses through permitted autonomous choices unless the player pauses. This supersedes assistant proposals that routinely freeze the world awaiting input. It does not authorize bypassing hard permissions or inventing unsupported outcomes; exceptional safety/recovery stops and optional explicit pause policies remain distinct from ordinary nonresponse.

D058: Input style remains an explicit open decision: free-text intention, contextual choices, or a hybrid. A range of roughly 10–15 actions illustrates sufficient diversity, not a fixed visible button count. Actions should allow serious, absurd, ineffective or foolish intentions where supported, with actual consequences and meaningful differences. The medieval archer, battle, looting, limb loss, death and ten-minute reports are examples, not required content or timing. The player need not intervene at each story stage.

## Story-first world materialization

D059: Denis confirms that the product is not a bottom-up Dwarf Fortress-style simulation intended to model enormous populations until interesting events happen to emerge. The storyteller deliberately originates worthwhile developments and materializes only the entities, places and facts needed for current play, continuity or already-committed consequences. An irrelevant distant farmer requires no individual record or computation merely because the fictional world implies that he exists. This strengthens and clarifies D045 and D047 rather than replacing authoritative mechanics.

D060: The intended analogy is a human dungeon master: maintain a bounded campaign situation, important cast, unresolved threads and a larger plan where useful, while improvising compatible detail when it becomes relevant. Newly authored content becomes durable when admitted into play. The storyteller may fill unspecified gaps, but cannot contradict established facts, retroactively evade a resolved consequence or narrate unsupported state changes. Database technology and schema style remain technical decisions; this product direction does not itself select MongoDB or rule out relational storage.

## Product baseline and transition to building

D061: Denis requests a final reconciliation and tidy-up of the product documents as baseline v0.01, so the following session can produce technical documentation and then an MVP implementation for hands-on experimentation with mechanics, storyteller context and tools. This closes open-ended product exploration for this pass and supersedes D004/D008's product-only phase restriction for the requested subsequent work. It does not select a stack, provider, budget, channel, detailed balancing defaults or every existing proposal. The release-scope document consolidates the working boundary; TASKS owns the small remaining technical-design gates. Baseline completion is not an implementation or gameplay-validation claim.

## Public repository and documentation authority — 2026-09-17

D062: Denis requests extraction of the project documents into a fresh GitHub repository and explicitly selects public visibility. Git becomes authoritative for active project docs and future code; the previous synced folder remains a historical snapshot. Personal workspace material and superseded early explorations are excluded from the public import. Offscreen RPG (`offscreen-rpg`) is the assistant-selected descriptive working name, not a trademark or availability claim. This migration implements repository infrastructure, not the game.

D063: Denis reiterates that the game will have a UI: simple, visual and sensory, centered on story and current situation. Offscreen continuity does not mean chat-only play or absence of a browser interface; a quiet on-screen scene is legitimate. Messaging remains a candidate complementary surface.

## Lightweight progression review — 2026-09-17

D064: Denis explicitly requests reopening product mechanics before technical design, questioning dedicated work/travel/trade/needs systems and proposing chronology-driven progression with storyteller adjudication. This authorizes applying simplification findings to the actual docs and supersedes treating v0.01 as frozen against further product discussion. He explicitly states this is brainstorming: neither the “beads” metaphor, a database representation, free-form inventory, numeric timing examples nor an almost-entirely-LLM rule system is selected by the message. Assess alternatives and surface tradeoffs; do not encode illustrative content as required mechanics.

The current revision therefore removes assistant-inferred subsystem prerequisites and marks a lighter story-progression contract as a proposal. It reopens grid necessity (D037), D&D breadth (D021/D033), inventory precision and fictional/real-time mapping without claiming those earlier decisions have been silently rejected. Exact bargaining/check/timing and budget defaults remain open. Specific provocative incidents are not required content or adopted outcome rules.
