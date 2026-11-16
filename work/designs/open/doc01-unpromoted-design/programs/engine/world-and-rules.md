# Worlds, actors and rule capabilities | expand what the game can actually do

**Status:** design target requiring further adversarial fixtures before selecting an exact public schema. Do not implement a generic world DSL or rewrite the D&D rules from this document alone.

## The tension in the dream

The game promises **D&D-style checks with meaningful consequences**, and simultaneously allows a bacterium, a Roman soldier, a sentient storm, a bodiless intelligence or a regular modern-day worker.

The wrong answers would be:
- make every being a humanoid `Character` with required HP, armor, six *applicable* abilities, inventory and gold;
- strip mechanics down to generic percentages so nonhumans can fit;
- let the AI decide arbitrary effects in prose without rule admission;
- build a huge ECS/simulation with jobs, NPC schedules and pathfinding for every setting.

**Preferred answer:** a **capability-oriented typed rules kernel**. A world/rules package can declare which *supported rule families* apply. An actor carries only relevant capability state; ability applicability is explicit, and a validated transformation can change it. New families are implemented as small pure policies with versioned definitions and explicit effect adapters.

## Two separate kinds of extensibility

1. **Content extensibility:** same supported game primitives, different nouns, premises, local opportunities, skill names and Storyteller styles. Should largely be versioned data without code changes.
2. **Mechanics extensibility:** new causal meaning, such as containment/transformations, item ownership, route geometry, damage type, cooperation or relationships. Requires an explicitly implemented, versioned rule adapter, authorization, tests, public projection and storage path. It is **not** safe to conjure it with free text or arbitrary JSON.

Confusing these creates the worst possible false promise: “You can play anything” but the rules still only know `quantity.change` and `fact.set`.

## Logical capability examples

| Capability | Example actor/world | Typed state and change | Why optional |
| --- | --- | --- | --- |
| Ability/skill check | D&D adventurer or sensed environment | Applicable ability, skill, proficiency, captured roll/difficulty | Some forms have different applicable skills |
| Bounded quantity | Money, nutrition, stability, energy | Named quantity with units/scope and validated delta | Not every world has a currency |
| Item ownership | Adventurer passes an apple to a companion | Unique item ID, holder/location, transfer precondition | A microbial gradient has no physical inventory |
| Location / containment | Wizard shrunk into a goblin's apple | Typed relation *inside apple*, known scope and form | Maps/coordinates cannot express all places |
| Health / damage | Human injury or nonhuman integrity | Applicable condition and rule effects | No universal HP HUD necessary |
| Social relation | Familiar innkeeper or negotiated trust | Stable identities, attributed source + mechanically admitted flags if needed | Cannot auto-add friendship from any conversation |
| Travel | Regional road or abstract migration | Known route/edge progress or topology-specific state | Not every world has a graph/map |
| Work/contribution | Repair, study, growth, rest | Captured task process + checks + earned progress | Work isn't a universal profession system |
| Obligation/deadline | Promise, encounter, festival | Ordered future condition and eligible event | No global calendar required |
| Character agency | Player, companion, NPC | Actor controller, permitted action class and current offer | Don't let Storyteller command another player's character |

These are *candidate domains* to be validated against actual stories, not a request to create a table for each line.

## Capability module contract (conceptual)

Each **implemented** capability family may define:
- a stable `capabilityId@version` and optional world/rule package declaration;
- private rule configuration schema and public-safe projection schema;
- actor/world applicability and invalidation rules;
- admitted attempt/effect vocabulary with bounded input/output;
- pure transition validation and resolution with explicit entropy evidence;
- persistence ownership and conflict scope;
- provenance of created/modified state;
- migration rules for old captured actions;
- test fixtures including negative, contradictory and cross-actor cases.

**Important:** Do not build a dynamic code-plugin framework until two or three genuinely different capability families reveal the need. Start with a statically compiled, discriminated-union registry. Content can reference supported capabilities by versioned ID; unrecognized/unsafe definitions fail admission.

## Formal separation: eligibility is not permission to offer

An item may be physically edible, but **the current Storyteller has not necessarily offered “Eat apple.”** The engine must not derive new available actions from every item/capability. It may check **eligibility** for authored options and reject invalid results, but cannot silently expand the player's menu.

When a custom intention interface eventually exists, the *player* can ask to eat the apple; the engine/Storyteller interpretation and rule adapter determine if it is supported under current conditions and captured policy. A typed proposal is not a granted effect.

Likewise, a known “safe action” may become ineligible if the world changed; future plans must revalidate at execution.

## Source of world truth: sparse, causal materialization

Not every mentioned human becomes a database NPC. But a named person repeatedly encountered, a traded key, a borrowed compass or a transformed form may need stable identity because later correctness depends on it.

**Policy:** materialize a world element when it is:
1. targetable by a meaningful attempt;
2. an owner/holder of a scarce object or resource;
3. party to a promise/relationship requiring later consistency;
4. an actor with independent permitted agency;
5. used as a condition/prerequisite for a future accepted action;
6. otherwise important to continuity and retrieval.

Keep private possibility, observed dialogue, inferred knowledge and hard mechanics separate. A later Storyteller may cite an old source without rewriting it.

## Stress test A: microbe sensing a nutrient gradient

- Supported sensing check, exposure condition, environmental cycle clock.
- No currency, humanoid inventory or forced geographic coordinates.
- Success/failure changes declared exposure/knowledge where relevant.
- Extended energy absorption is a process with real time/checks, not a progress bar that guarantees offspring.
- A shift in the gradient can interrupt; earned growth persists.
- The engine cannot invent an item “nutrient potion” just to reuse an inventory effect.

## Stress test B: the wizard inside the apple

- A magical effect admits **form change**, **containment relation** and **revalidated applicable abilities**.
- The goblin holding the apple is a different actor; an unchosen bite is not automatically committed by model prose.
- A later action may require relevant spell target/geometry, not a movement command to normal coordinates.
- Two human players in different positions can't issue controls on each other's behalf.
- If the actual engine doesn't yet support form/containment, proposal must fail gracefully rather than publishing contradictory canon.

## Stress test C: an ordinary small-town worker

- Spend days at a shop and meet the same colleague repeatedly.
- Earned wages use explicit resource effects, not narrator promises.
- Helping a neighbor may record a consequential fact/relationship, not obligatory numeric reputation.
- A Storyteller can write a warm exchange without scheduling a full social agent economy.
- One bad decision may lose earned property under selected risk and rules.

## Stress test D: space merchant and a shared trade

- Transfer of unique goods and funds has a consistent transactional boundary.
- A contract can reserve or conditionally consume resources only through an admitted rule.
- A late provider passage cannot move goods twice.
- Shared parties require per-actor ownership and consent, not one composite character record.

## Sequencing for actual implementation

First select **two** divergent capability families that today's engine cannot express and create real negative tests. Candidate choices: **item/identity transfer as first-class actor-facing mechanics** and **location/containment/form adaptation**. That proves generality better than adding twenty more fields to a universal character object.

**Do not immediately implement:** generic relationship graphs, arbitrary custom SQL predicates, programming language in game packages, full tactical combat, physics, NPC “brains,” city population simulation or universal map geometry. Those are separate products/capabilities when a world needs them.

## Decision still pending

We must decide which **minimal cross-world state envelope** is both semantically sound and compatible with existing stored campaigns. The current mandatory `Character` and private plan vocabulary are a useful starting evidence, not the shape to freeze forever. No rewrite is authorized until target examples and migration strategy are proved.
