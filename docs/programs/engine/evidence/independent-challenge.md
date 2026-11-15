# Independent challenge | could our preferred engine still be the wrong one?

**Status:** adversarial architectural review. We should be more skeptical of our new proposed "capability-oriented modular monolith" than of an existing source file simply because we invented the phrase. Each alternative is ranked by **product evidence**, not how fashionable it sounds.

## Hypothesis H1 | The existing engine is already enough for most gameplay

**Argument:** D&D has a core set of checks and actions. The Storyteller can narrate any world; `quantity.change`/`fact.set` plus a few item effects may express every *mechanically important* thing a POC needs. A capability registry may add indirection, version explosions and artificial classifications that make imaginative play harder.

**What would favor it:** a year-long human/microbe/magic playthrough runs meaningfully on existing effects with modest additional fixtures and no contradictory fake state; players accept the limited causal vocabulary and feel real freedom.

**What currently weakens it:** core mandatory HP/scores, separate narrative item transfer, no typed containment/form/relationship rules, no general custom-intent or multi-actor control. These aren't just missing CSS: the engine cannot enforce certain natural outcomes.

**Judgment:** existing foundation should be preserved, but **not enough as a permanent engine**. Build only one or two clearly needed capability families before designing a registry API.

## H2 | “World-neutral capabilities” will erase the D&D identity

**Argument:** Generic effect/ability plugins can make the engine abstract and sterile. D&D abilities, checks, resources and failure probability are core to the original game promise. A world without Strength still needs meaningful rules, not a bland "apply value" call.

**Evidence:** the vision explicitly makes D&D-style checks foundational across many activities, while selectively limiting which abilities apply to a given form. The correct engine needs a **strong D&D rules package**, plus applicability/optional world dimensions, not the removal of D&D.

**Judgment:** **serious risk**. Any capability abstraction that reduces this to generic attribute patches fails. Tests should include real d20/proficiency, specific D&D adjudication and a microbe with altered applicability in the *same* engine.

## H3 | A universal actor/identity model forces world simulation

**Argument:** If every named person gets an Actor row, the game becomes a population simulator, with relationships, schedules and agents we never needed. Sparse fiction is the product's strength.

**Design countermeasure:** materialize only **causally significant** people/items/relationships, preserve lighter descriptive canon and untracked background. A world can contain a thousand vaguely mentioned villagers and only five stable trackable entities. Dynamic IDs are tools for consistency, not census requirements.

**Judgment:** strong warning. Do not implement a universal actor table until one concrete identity/permission feature demands it.

## H4 | PostgreSQL + immutable documents may be a split-brain source of truth

**Argument:** Today the Storyteller can propose document changes while SQL owns mechanics. If a player owns a key in SQL but canonical prose documents say the key is elsewhere, what is true? If the SQL root points at missing object storage, which source wins?

**Countermeasure:** assign **authority by fact type**, not by storage vendor. Mechanical ownership and time derive from SQL receipts/state; original published narrative sources are immutable CAS; descriptive truth claims and memory have authority/visibility metadata. Stage files then atomically commit SQL pointer, reconcile orphans/missing objects, never privately overwrite a roll.

**What would disprove:** a current connected test repeatedly publishes contradictory mechanics/document updates without detection. In that case the current split is more serious than a clean diagram suggests.

**Judgment:** **highest-priority architecture integration review**, because it threatens both fun and correctness.

## H5 | The Storyteller may be too constrained to be a good DM

**Argument:** A strict schema/limited effect vocabulary can force the AI to ignore plausible player intentions. It may be technically correct yet boring. Even if we add typed capabilities, no human can anticipate every imaginative attempt.

**Counterargument:** an unbounded LLM can author fresh content and propose interpretations, but verified effects remain typed. The middle-ground is reviewable interpretation, a rule adapter registry and *explicit unsupported outcome* when no safe effect family exists. A good product should eventually let many novel intentions succeed via combinations of known rules.

**Open hard problem:** compositional rules might become overly expensive to admit or require excessive model calls for each tiny action. We should test player-intent coverage/cost before building a grand proposal language.

**Judgment:** **highest gameplay quality risk** alongside long-term memory. A clever deterministic kernel is not a DM.

## H6 | Boundary-driven execution may make the world feel dead

**Argument:** The game currently advances only accepted time. If the player leaves for a day and no work is active, the world freezes. A fictional life could feel fake, and no number of correct receipts changes that.

**Alternatives:** automatic world clock vs bounded standing routine vs safe delegated choice. The UX program's [temporal philosophy](../../experience/foundations/temporal-philosophy.md) recommends bounded standing life over unrestricted ticking. We must preserve current deliberate-time correctness while experimenting with **permissions that create felt autonomy**.

**Judgment:** product risk, not mere technical debt. The engine target must embrace legitimate unattended life, but cannot silently choose fights, money or relationships.

## H7 | A story-row lock might be perfectly sufficient for the product

**Argument:** Most stories will have one or a few players and sparse events. A hot shared-world 100-player scenario might never be built, so designing fine-grained actor locks is wasted effort. The current lock guarantees consistency.

**What would favor retaining it:** actual 2- or 3-player shared-story concurrency benchmark demonstrates acceptable p95 and no long provider work inside lock. A 100-player scenario has no accepted time/agency product semantics yet.

**Judgment:** **keep now**. Only evolve granularity after actual shared actor/time policy and a measurable hot spot exist. Designing for many independent stories is different from optimizing one globally shared world.

## H8 | Full event sourcing would make history easier

**Argument:** A long-lived game with time, choices, relationships and changing rules needs canonical events. Why not derive state entirely by replaying them?

**Downside:** arbitrary evolving rules and document revisions complicate historical reducer semantics; every new event version requires replay-compatible upcasters and potentially enormous long-story rebuild work. Current SQL state/receipts already protect strong invariants.

**Recommendation:** **causal committed event journal + current authoritative projections**, with source links, optional diagnostic replay. Revisit event sourcing if a truly event-native domain and stable replay/version model emerge.

**Judgment:** not selected; the desire for a Journal does not justify replacing the write-side engine.

## H9 | A distributed microservice architecture is the correct portfolio signal

**Argument:** Hiring companies want architects who know scale, service boundaries, messaging and Kubernetes. A small Nest monolith looks less sophisticated.

**Counterargument:** technical maturity appears in constraints, operational traces, transaction semantics, error recovery, storage contracts, measured capacity and versioned rollout. A dozen services with unclear authority and unreliable distributed effects **would be worse engineering**, not more impressive. A modular monolith can horizontally scale API/worker processes while keeping SQL atomicity.

**Judgment:** reject speculative service splitting. Demonstrate a *design for scale* with real load numbers and seams before physically splitting.

## H10 | The data model will be impossible to evolve without a rewrite

**Argument:** Wide JSONB on Campaign plus versioned canonical documents and several nearly overlapping effects are a migration nightmare. Maybe now, as a pre-POC, is the best time to throw the old model away.

**For:** no significant production users/data, so large corrections are cheaper now. A holistic redesigned actor/capability model could simplify future work more than a hundred compatibility shims.

**Against:** the current transactional and provider work is already intricate and likely contains valuable implicit invariants. A rewrite can introduce double-pay/clock/spend regressions that take months to reestablish. The new target itself hasn't been proven with multiple real worlds yet.

**Judgment:** reserve the right to **rewrite a specific domain module** with a migration/negative-test proof, rather than force every module into a hand-preserving refactor. In other words, protect invariants, not existing lines of code.

## H11 | Our documents can become an expensive fiction of progress

**Argument:** A 200KB engine roadmap is not a better game. It can give coding agents conflicting targets, overwhelm token context and create paralysis while the actual Storyteller still can't remember a person.

**Countermeasure:** short front-door index, one canonical owner per product decision, source-adjacent maps, Proposed versus selected Changes, no duplication of legacy features. After design convergence, hand Cursor **one bounded Change** with 2–5 source owners, a concrete user outcome and one decisive negative test.

**Judgment:** real risk. This first pass should create **no ready code ticket** and the next pass should reduce contradictions rather than multiply abstractions.

## What may reverse the current overall recommendation?

- A robust connected test shows the existing rule semantics already cover materially diverse worlds, making capability refactor low value.
- Human participants prefer a freeform fiction engine with fewer deterministic effects and find enforced realism an obstacle, changing the game thesis.
- Thousands-of-stories load already behaves flawlessly, so cache/worker refactors can wait; if real shared-world contention dominates, actor-scoped architecture becomes urgent.
- The current canonical-document runtime is already multi-replica and portable with a fully proven adapter, reducing storage priority.
- Long-term memory tests show source-level recall and continuity reliability at acceptable spend, making product breadth the next priority.

**Current most likely model:** preserve existing durable core, redesign missing world/action/authority/long-memory *capabilities*, and add scale/release foundations where real invariants demand them. **Confidence: moderate**, because source has been inspected without full connected traces or human play.
