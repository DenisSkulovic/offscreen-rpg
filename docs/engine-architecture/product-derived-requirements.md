# Start with the dream | engine requirements independent of the pre-POC

**Status:** desired product characteristics and discriminating scenarios. Based on original [vision](../vision.md), [gameplay](../gameplay.md), [storytelling](../storytelling.md), [time](../time-and-autonomy.md), [continuity](../continuity-and-consequences.md) and [UX destination](../experience/README.md). None is a claim of implementation.

## The product in one sentence

**A personally meaningful fictional life evolves under authored rules, earned real elapsed time, a creative but bounded Storyteller, remembered consequences, and varying degrees of player participation, even when the human is away.**

This is simultaneously a game, a long-lived collaborative fiction platform and a deliberately serious engineering portfolio. The engine should facilitate all three, but must not sacrifice play for a sophisticated-looking architecture diagram.

## The ten design drivers, ordered by product consequence

| Priority | Capability | What must be demonstrably true |
| --- | --- | --- |
| **P0** | **Authentic agency** | The player can express a meaningful feasible intention, act through rules, and later see exactly what choice mattered; long term this means more than a tiny fixed button menu |
| **P0** | **Earned time and consequences** | Start ≠ completion; work, travel, recovery and checks consume admitted time, with interruption and permanent outcome constraints |
| **P0** | **Durable narrative memory** | A person, object, favor, shame, lost possession or small event can matter much later, not merely be recited in a stale summary |
| **P0** | **Storyteller creativity with authority** | AI may invent valid situations and propose actions; it cannot award resources, rewrite past effects, ignore player scope or make an impossible move true |
| **P0** | **Ordinary living** | A quiet life, exploration, social time and routines are intrinsically supported without compulsory dramatic encounters or model calls each minute |
| **P1** | **Flexible settings and actors** | A fantasy warrior, mundane shopkeeper, Roman soldier, microbe, sentient storm or abstract mind share the engine, not identical bodies/items/maps |
| **P1** | **Player absence/delegation** | Explicitly authorized routines and safe character response policies can continue while the player closes the browser; hard stop/consent bounds remain clear |
| **P1** | **Small shared party** | Two or three people can control independent characters in one coherent situation with clear authority, timing, pause and conflict semantics |
| **P1** | **Affordable, survivable runtime** | Delayed provider, dropped acknowledgment, quota, worker restart and deployment do not fake outcomes, duplicate spend or strand a character permanently |
| **P1** | **Evolution and credible scale** | Thousands of independent stories can be served by horizontally scaled stateless API/workers and controlled backing services; product versions coexist safely |

**P0/P1 refer to end-state consequence, not the immediate code sequence.** A first solo proof can omit broad intent and multiplayer while preserving the target.

## Adversarial stories the architecture must survive

### S1 | Twelve quiet months

The player lives in a village, works, saves, visits familiar people and occasionally makes choices. After 12 months of real time there may be thousands of recorded micro-outcomes and a handful of precious events. A model returns to this story with no prior chat state. **Requirement:** exact current state, stable identities, source-linked retrieval, curated relevant memory and economical run cadence; no infinite Temporal history, oversized SQL JSON arrays or 10,000 unstructured prompt messages.

### S2 | Ten real hours travelling

The player accepts a declared journey and closes the browser. At hour four, a supported event blocks the route, with already-earned partial progress. Returning at hour eight must not show arrival or erase the first four hours. **Requirement:** one committed clock frontier, causal boundaries, opportunity cost, exact interruption/hold, valid resume or reroute rules, no client-side authority.

### S3 | Microbe and abstract intelligence

A microorganism senses a nutrient gradient; elsewhere a mind exists in a distributed signal field. Neither has to possess coins, HP, 6 human-applicable abilities, pockets, a humanoid gender or a geographic street address. Yet both experience meaningful checks, risk, energy or attention, continuity and consequences. **Requirement:** rules/capability adapters with optional domains; do not reduce all worlds to generic “value” dictionaries either.

### S4 | Small, strange request

A player asks a stranger a new question the Storyteller did not pre-author. The world knows the stranger's current location and what the player's character has actually learned. **Requirement:** bounded natural-language interpretation → explanation/clarification → validated attempted action → deterministic rule/time effects → narrative; no “LLM wrote a success so it's canon.” The pre-POC's menu-only interface is not the ultimate end-state.

### S5 | Two players and one item

Two friends simultaneously attempt to claim or give away the same unique artifact while a party journey is being considered. One browser loses its acknowledgment. **Requirement:** per-actor identity, story/shared-scene authority, conflict/choice resolution, item uniqueness and one settlement. The same story-row mutex may be viable for a first small party, but cannot be advertised as large shared-world scalability.

### S6 | A dangerous choice during absence

The player agreed to a cautious character that may retreat from low-stakes danger while away, but cannot attack innocents or spend all possessions. A stranger appears; a real response window opens only when the option is published. **Requirement:** explicit versioned consent and eligible fallback, race-fenced player/default selection and provenance. A Storyteller personality profile alone cannot grant authority.

### S7 | Provider took money and never answered

The HTTP request may have reached a model provider; the process crashed before observing any response. **Requirement:** operation-level provenance, bounded reservation/charge, uncertainty state, operator or supported reconciliation and explicit user feedback. Retrying a paid request is not automatically safe; dice/resources can't reroll while narration is recovered.

### S8 | Two deployed engine versions

An established campaign pins a rule definition or Storyteller task created before a deployment. Old workflow histories continue while new code runs, and a database migration is expanding/contracting. **Requirement:** explicit compatibility matrix, versioned schemas/effects/prompts/workflow definitions, reading old data, reversible rollout, no silent changes to a running campaign.

### S9 | Thousands of mostly quiet stories

10,000 independent stories exist, many not currently moving, a subset working toward sparse next boundaries. A burst of 1,000 users reconnects after an outage. **Requirement:** event/boundary-driven execution, bounded reads/cache, connection pools, fair scheduling and backlog metrics. **No heartbeat-per-story requirement** or one model call per simulated second.

### S10 | One busy shared world

A hundred players inhabit or reference one world. They can see different local situations. Ten choose concurrently; many are merely reading. **Requirement:** scope of serialization must eventually shrink from whole world to genuinely conflicting entity/scene/clock ownership. This is an *architectural pressure test*, not a near-term guarantee.

### S11 | The cost of a cool new feature

A future programmer adds vehicle travel, trading, magical transformation, reputation, custom D&D rules or an unfamiliar life form. **Requirement:** a new capability has a bounded typed rule/effect/validation/read-model boundary, targeted tests and versioning. It should not require editing 23 unrelated files or fragile switch statements inside a giant Storyteller coordinator.

### S12 | The portfolio reviewer attempts to break it

An engineering interviewer issues duplicate commands, stops a worker at a transaction boundary, inspects a causal trace, asks about scalability and reruns a documented benchmark. **Requirement:** reproducible fixtures with authentic production policy, traceable exact-once outcomes, serious operational limits and concrete, honest load evidence, not “Kubernetes would fix it.”

## Key negative requirements

- **No constant hidden world engine:** implicit simulation of every NPC, town and item is not necessary to deliver a believable life.
- **No omnipotent free-text engine:** generative language does not have direct SQL, rule or economic authority.
- **No universal body/economy/map:** the world's shape is content and optional capability, not UI/business logic inherited from D&D's most familiar setting.
- **No universal energy/quest grind:** quiet meaningful engagement must not require artificial earning mechanics.
- **No forced chapters or scenes per turn:** Storyteller turn, scene, narrative passage, event and paid model round have different meanings.
- **No infinite autoplay or unbounded expense:** autonomy is captured, finite and auditable.
- **No microservices theater:** pre-emptive deployment boundaries are not a substitute for good domain ownership.
- **No “benchmark proves fun” fiction:** mechanics and human narrative quality require different evidence.

## Important contradictions/choices to resolve

1. **Strict no-idle clock** is the maintained POC rule. The larger dream of autonomous life suggests bounded standing routines and consented decision fallbacks. These are evolutionary mechanics, not reasons to silently make the global clock run without approval.
2. **D&D backbone** is a genuine product commitment; the arbitrary-world requirement does **not** authorize deleting D&D checks. Applicability and domain modules must coexist.
3. **Single shared clock** makes the solo proof coherent; large shared-world independent scenes may need time domains/synchronization or a different unit of serialization. Do not assume one global timeline can scale every creative scenario.
4. **Portability and canonical documents** are valuable; they must not make a transaction across object storage and PostgreSQL a hidden distributed commit.
5. **Scalable engineering quality** means measurable queue/backlog/lock/cost/compatibility behaviors, not immediate maximum capacity or 25 services.

## Product acceptance, not just unit acceptance

A real player should be able to say: “I know what my character can attempt; the world respects my effort and loss; I can leave; things I chose weeks ago matter.” If this fails, a beautiful event bus or perfect database schema is merely a well-maintained empty stage.

An engineer should be able to say: “I know who owns each fact, which operations can repeat, which versions coexist, what a worker failure means, how to widen capacity, and which measurements would refute our load assumptions.” Both are necessary.
