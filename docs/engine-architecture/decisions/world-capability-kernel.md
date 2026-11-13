# Architecture decision study | one world-neutral kernel, several kinds of gameplay

**Status:** selected *conceptual approach*, not a finalized cross-world schema or authorization to refactor `Character`. Source: [`game/state.ts`](../../../packages/game/src/state.ts), [`game/effects.ts`](../../../packages/game/src/effects.ts), [`game/checks.ts`](../../../packages/game/src/checks.ts), [`game/activities.ts`](../../../packages/game/src/activities.ts), [`game/immediate-actions.ts`](../../../packages/game/src/immediate-actions.ts).

## The decision is a gameplay decision first

The dream includes ordinary human life, a fantasy warrior, magic, microbial worlds and abstract entities. The engine should support **meaningful actions with consistent consequences**, not merely let the model narrate anything.

That does **not** necessarily mean every ruleset is fully interchangeable or user-programmable. The game has a D&D-style mechanical backbone. The right abstraction preserves its useful checks while not requiring every world to have HP, a backpack, a currency or Euclidean travel.

## Four competing models

| Model | Attractive property | Problem for the dream | Verdict |
| --- | --- | --- | --- |
| **One universal Character schema with optional flags** | Easy current SQL/query/UI and one check function | Eventually hundreds of irrelevant fields, inconsistent absence, a humanoid model smuggled into every form | **Reject as permanent shape** |
| **Unstructured fact/quantity map + LLM interpretation** | Can narratively represent anything immediately | Cannot authoritatively enforce scarce items, transformations, relationships or location conflicts; no typed evolution | **Reject as sole mechanics engine** |
| **Fully generic ECS + dynamic world-rule scripts** | Powerful extensibility, potentially ideal for physical simulations | Security/runtime/versioning burden; forces simulation model onto narrative worlds; arbitrary scripts in world packages dangerous | **Do not select** absent concrete game |
| **Small typed rule kernel + statically registered optional capabilities** | Explicit mechanical meaning, bounded effects, world-neutral presence, evolvable versions | Needs careful identity/state/contract composition, avoids one magical universal validator | **Preferred target** |

**Important exception:** a specific tactical, physics-heavy world might eventually choose an ECS as *one implemented world module*. It is not the base engine of every possible fictional life.

## Kernel responsibilities, independent of any world

- story, situation, participant and controlling actor identity;
- revision/authorization, immutable submitted intention and accepted command receipt;
- fictional clock and admitted long-duration execution;
- deterministic outcome and random evidence;
- typed effect application, prerequisite and conflict checking;
- ordered canonical history and source attribution;
- Storyteller candidate validation vs committed gameplay;
- public vs private knowledge and rules versioning.

The kernel should not know a microbe's nutrient system or a wizard's containment magic. Those are **capabilities**, implemented once each as rule semantics and opted into by supported worlds.

## Capability families and cross-world mapping

A minimal core may support **general bounded quantities**, **D&D checks** and **admitted wait/work**. These are already partially implemented. Other families could be:

| Family | Human fantasy example | Nonhuman/abstract example | A different invariant it brings |
| --- | --- | --- | --- |
| **Possession and transfer** | Unique sword changes holder | Unique signal token changes logical owner | Exactly one holder under conflict; no invented item |
| **Form and applicable abilities** | Wizard turns into a rat | Microbe adapts new membrane | Valid actions and checks change with body/form; prior receipt remains |
| **Spatial/containment relation** | Goblin carries an apple containing a wizard | A distributed mind inhabits a subnet | Nested relations, targetability and scope, not necessarily coordinates |
| **Relationships and claims** | Innkeeper recognizes a promise | Two signals gain established association | Source-grounded identities/knowledge; numeric affinity only when a rule needs it |
| **Travel/exposure** | Journey across road under danger | Migrate across nutrient gradient | Progress is defined by specific topology and conditions, not seconds = distance |
| **Risk/recovery** | Wound, medicine, fatigue | Organism stability/field coherence | Form-dependent consequence and risk policy |

None of these requires one global inventory table and HP widget.

## Avoid the “everything is a plugin” trap

The first implementation should add **one** genuinely new capability family into the current pure rules/SQL/public-read pipeline. Only after **two** divergent families are working should we decide whether a shared registry abstraction reduces repeated logic.

Candidate milestone A: a single **scarce item transfer as a mechanical effect**, using stable actor/holder identity and conflict protection (there is already a separate narrative item transfer path; we should unify semantics rather than create a second inventory).

Candidate milestone B: **optional form/capability state**, with a microbial or abstract-entity fixture in which HP is absent, a meaningful d20/sensing check is still possible, and changing form revalidates actions.

**Crucial:** those are vertical slices, not a simultaneous broad Character migration. Data migration, old campaign readers and current UX are separate compatibility gates.

## How a rule family is admitted

Conceptual **compiled** handler contract:
- versioned kind and validated definition schema;
- applicability to the *actual* actor/capability;
- explicit source/read dependencies for eligibility;
- pure resolve/effect transition with captured RNG input;
- compact immutable receipt and negative case;
- persistence/read projection boundaries and event provenance;
- no external provider, SQL or file I/O inside pure policy;
- pinned old version policy for in-flight actions.

This does not authorize evaluating code provided by an LLM or a world document. User-authored world **data** can configure known, safe parameters. Supporting a brand-new rule algorithm remains a code/versioned-package change.

## Authoring and Storyteller implications

The Storyteller should be told **which capabilities are legal**, what they mean, relevant actor state and what evidence is available. It can propose a plausible attempt using known capabilities, plus clarification when uncertain. The domain validator is the authority.

That pipeline must not turn every free-text request into a denial. A few well-designed primitives can combine to cover many actions: inspect an item, move it, follow a route, make a check, set a legitimate social claim. The first human test corpus should distinguish *creative vocabulary* from *distinct mechanical families*.

## Two worked transformations

### The microbe

Current `Character` requires six numerical scores and HP, even when abilities are marked inapplicable. End-state actor has no compulsory HP, form permits “sense gradient” as a rule-backed check and “absorb energy” as a timed action with explicit positive/negative outcomes. A change in environment may interrupt. No default money, arms or map.

**Tests:** use actual existing D&D-style math if this world chose that rule subset; do not equate an absent HP with infinite HP; effects must not create undeclared items; changing membrane capabilities invalidates stale prepared actions.

### The wizard in an apple

The actor has a magical form-state transition and a **containment relation**: wizard inside apple; apple held by a goblin. Changing the goblin's possession has consequences for wizard's location and valid options, but is not the same as instantaneously moving the wizard to world coordinates.

**Tests:** item transfers respect current holder, location cannot silently detach from containment, and a player cannot make the goblin bite without a valid authored/attempted action. Existing saved work/rolls survive the transformation as historical records.

## Migration semantics

A legacy SRD `Character` may migrate to an actor envelope containing explicit `srd-abilities` and `health` capability state; the old public reader can remain until new read DTOs are separately approved. **Don't use blank defaults** for missing capability state. Each old work/roll captures the exact old rules version; migration may change how current state is represented but not rewrite its past outcome.

Before migration, prove a round trip for:
1. one current SRD human;
2. a character with zero applicable Strength;
3. an actor with no HP at all;
4. one interrupted activity across a form change;
5. one old captured action still settling under its pinned rule.

## What would reverse the choice?

If a rich ordinary-life narrative can deliver durable agency through the existing `fact` and `quantity` effects without ever needing stronger transfer/target/identity invariants, the new capability family may be lower priority. Conversely, if supporting a creative action demands dozens of special-case validators, the suggested kernel abstraction is not sufficient and may need a richer rule algebra.

**Conclusion:** do not change the folder structure before proving a concrete *new lawful kind of action*. This is an engine design to serve the player, not an abstraction exercise.
