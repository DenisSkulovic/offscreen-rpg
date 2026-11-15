# Offscreen RPG | Engine architecture destination

**Status (reconciled 2026-11-15):** product-first architecture design completed 2026-11-13; **postwave implementation landed**. **Done:** ENG01, ENG02 (envelope), ENG04, ENG05 (local S3Mock), ENG06 (local replay/restart), ENG08, ENG09, ENG03-M, ENG03-narrow, ENG03-C1 (+ harden/C1-R), ENG03-C2. **Partial:** full ENG03 (priorities 3–6 still Proposed). **Cancelled:** ENG07. Selection authority: [docs/changes/README.md](../../changes/README.md). Desired engine still comes from product vision — landed slices do not declare the engine “complete.”

**Program truth:** [implementation program](implementation-program.md). Postwave review: [audit](evidence/postwave-implementation-review.md). ENG05/06 contracts: [CAS](decisions/eng05-shared-cas-contract.md), [Temporal](decisions/eng06-temporal-compatibility-policy.md). ENG03: [instrument-first](decisions/eng03-instrument-before-refactor.md) → [narrow](decisions/eng03-narrow-capture-v1.md) / [C1](decisions/eng03-committed-action-capture-v1.md) / [C2 evidence](evidence/eng03-c2-interrupted-capture-2026-11-15.md) — **not** full short-lock refactor Done.

**Storyteller program (separate):** [storyteller-architecture](../storyteller/README.md) owns model reasoning/narration packets (SA Done vs gameplay quality unproved). Engine docs do not authorize Storyteller or UX Changes.

## Read by question, not by file count

| If deciding... | Start here |
| --- | --- |
| What game are we really building, independent of current code? | [Product-derived engine brief](product-derived-requirements.md) |
| What architecture would serve that game for years? | [Target operating model and alternatives](target-engine.md) |
| What are the non-negotiable game truths? | [Domain authority, identity and transitions](domain-authority.md) |
| What is the current engine actually able to prove? | [Source-grounded audit and problem register](evidence/source-audit.md), [full causal transition trace](evidence/causal-transition-review.md) |
| Why wouldn't we simply rewrite the whole monorepo? | [Module/dependency evolution](module-boundaries.md) |
| How do time and independent background activity work at scale? | [Time and execution design](time-and-execution.md), [future-result dependency fences](decisions/prediction-dependency-fences.md) |
| How do arbitrary characters and worlds have meaningful rules? | [World and mechanics evolution](world-and-rules.md), [capability alternatives](decisions/world-capability-kernel.md), [selected first gameplay proof](decisions/first-gameplay-slice.md), [identity](decisions/actor-identity-and-ownership.md) |
| How does the Storyteller have creativity without lying about the world? | [Storyteller and authority](storyteller-and-memory.md), [short-lock context capture](decisions/context-capture-and-locks.md) |
| How can months-long stories survive updates and changes? | [Compatibility, rollout and migrations](evolution-and-release.md), [mechanical vs descriptive canon ownership](decisions/canon-compatibility-and-migration.md) |
| How do we claim architectural readiness for 1,000+ stories? | [Scale/cost/performance hypotheses](scale-and-load.md), [read-growth/availability audit](evidence/read-growth-and-availability.md) |
| How do we verify the dream, not only deterministic functions? | [Testing and game-quality evidence](evidence/verification-strategy.md), [final design-readiness review](evidence/final-readiness-review.md) |
| What should be redesigned first, and what should NOT be touched? | **[Selected engine implementation program](implementation-program.md)** → **[first Cursor handoff](handoff/first-engine-wave.md)**; [original architecture investigation](architecture-program.md) |

**Document relationship:** the original [vision](../../product/foundations/vision.md), [gameplay](../../product/foundations/gameplay.md), [time/autonomy](../../product/journeys/time-and-autonomy.md), [continuity](../../product/storytelling/continuity-and-consequences.md), [storytelling](../../product/storytelling/storytelling.md) and [player experience](../../product/journeys/player-experience.md) supply product intent. Existing [technical architecture](../../technical/architecture.md), [engine map](../../engineering/engine-model.md), source maps, code and tests supply evidence of today's design and its implementation. This folder develops a recommended **new end state**; disagreement with maintained rules or source is called out as a decision, **never quietly overridden**.

## High-level conclusion from first inspection

The engine is **not automatically worthless** because it was vibecoded. The source shows several potentially good decisions already: pure game policies, PostgreSQL transaction authority, immutable intent/receipt identities, explicit fictional-time boundaries, Temporal workflows with small references, transactional outbox, generation/publication separation and bounded model spending.

**But technical correctness does not answer the product question.** Today's rule vocabulary is narrow (quantity/fact effects, contribution/wait work, one campaign clock, one active solo decision), the broad AI DM remains unproved, relevant world identity/history is still being developed, nonresponse autonomy and group play are incomplete, and current local immutable document storage is not a horizontally scalable deployment adapter. A new 10,000-player benchmark will not magically make an inert 10,000-character simulation into a great RPG.

The first recommendation is **retain a modular monolith and strict authority core while redesigning its extensibility seams around product capabilities**. Do **not** jump to microservices, Kafka, Kubernetes or a new AI framework because the repository is large. Do **not** lock into today's JSON effect vocabulary as the permanent game model either.

## What counts as completed evidence

| Class | May claim | May **not** claim |
| --- | --- | --- |
| Product target | A coherent desired fantasy and tested design hypothesis | Existing runtime support |
| Source inspection | Exact code path, schema, limits, obvious invariants | Working horizontal deployment or production performance |
| Pure deterministic test | Game policy on a specified fixture | DB atomicity, provider behavior or fun |
| DB + worker integration | Committed state, exactly-once effects, real deadline behavior under a tested schedule | Months-long narrative continuity, many-player scale |
| Bounded real-model evaluation | Observed generation behavior/cost on a sampled corpus | General creativity or all arbitrary worlds |
| Load/release/fault test | Measured load capacity and failure handling for a declared scenario | Unlimited scale |
| Human playthrough | Comprehension, agency, attachment, confusion for real participants | Exact transaction invariants |

## Working method across future long design turns

1. **Dream first:** use adversarial stories (quiet life, travel, microbe, distributed mind, shared party, loss, 1,000 independent stories) to define what the engine must make possible.
2. **Architecture alternatives:** choose boundaries and consistency/temporal models based on these stories, not familiar patterns.
3. **Source audit:** inspect code/DB/Temporal/docs/knowledge against requirements. Distinguish observed fact, likely risk and unverified concern.
4. **Convergence:** document non-optional invariants, recommended module ownership, planned migrations and explicit rejected options.
5. **Bounded Changes:** only once a slice has a chosen target, technical owner, feasibility and a normal+negative proof. The owner authorizes one; Cursor executes it with minimal context.
6. **Review actual evidence:** future engine tests, workflow traces, live Storyteller evaluations and load profiles determine whether the target is being achieved.

**Final design handoff is prepared.** The source investigation, adversarial alternatives, first cross-world capability proof, legacy compatibility policy and bounded ENG01–ENG07 dossier queue have converged. [ENG01](../../changes/archive/2026-11/eng/2026-11-13--eng-authoritative-item-transfer/CHANGE.md) alone is **design-ready for owner authorization**. All other packets are Proposed. No implementation or live validation is claimed. See [handoff](handoff/first-engine-wave.md). The UX work remains independent.
