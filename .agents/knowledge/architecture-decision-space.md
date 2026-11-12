# Software architecture: design space and consequences

**For:** product-to-technical architects, backend/frontend solution designers, independent design critics and senior reviewers. **Not:** a mandated architecture style or a copy of the Offscreen RPG technical specification. Use when a decision crosses components, changes responsibilities or has a consequential long-term cost. No need for a trivial local edit.

**Quick route:** [frame the decision](#1-design-the-problem-before-the-solution) · [architecture patterns](#2-architectural-patterns-solve-different-problems) · [boundary decisions](#3-ownership-cohesion-and-change-coupling) · [data and communication](#4-data-communication-and-deployment-choices) · [change economics](#5-reversibility-evolution-and-delivery-economics) · [decision examples](#6-case-studies-that-defeat-automatic-answers) · [role obligations](#7-how-roles-use-this-manual).

## Central model

**Architecture is the distribution of responsibilities and consequences.** A pattern is a tool for containing a specific kind of change, failure, complexity, scale or coordination cost. It is not an award you win for naming hexagonal architecture, CQRS, events or microservices.

A strong architect keeps a set of plausible designs alive long enough to discover what **actually discriminates** between them. A solution can be technically correct but expensive for this workload, difficult to operate, awkward for the developer, hard to evolve or inconsistent with the intended product.

### 1. Design the problem before the solution

Before proposing a subsystem or pattern, record the relevant _decision variables_, not every variable known to computer science:

| Dimension                | Decision-defining question                                        | Example of why it changes the architecture                                    |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Outcome                  | What visible/user/business result must exist?                     | A notification is not a requirement for a distributed event bus               |
| Invariants               | What may never be false, even under concurrency?                  | One reward per accepted action requires authoritative receipt identity        |
| Workload                 | Request rate, fan-out, burstiness, input size, hot keys?          | A read-heavy catalogue and transactional inventory need different read models |
| Consistency              | Which observations must be immediately current, which may lag?    | Async search indexing is acceptable; a booking confirmation cannot be guessed |
| Latency and availability | Is the action interactive? How much waiting/failure is tolerable? | A long export may need a durable job, not a longer HTTP timeout               |
| Lifetime                 | Seconds, sessions, months, years? How is state retired?           | Temporal workflows and user-editing drafts don't share a lifecycle            |
| Access and privacy       | Tenants/users/scopes, trust boundaries, auditability?             | Global cache without tenant identity risks cross-owner disclosure             |
| Change pressure          | Which requirements are likely to change independently?            | Profile creativity can evolve without changing deterministic game rules       |
| Operations               | Who deploys, diagnoses, migrates, backs up, rolls back?           | Five services create work even at zero customer traffic                       |
| Constraints              | Repo size, available engineers, existing stack, budget, on-call?  | A solo pre-POC shouldn't inherit a large-company distributed platform         |
| Uncertainty              | Which choices are known, reversible, speculative?                 | An adapter may preserve a valuable option; a generic plugin framework may not |

Turn vague qualities into scenarios: **“When two browser tabs submit the same action with the same intent ID, one receipt exists and the second observes the original result.”** That's a stronger architecture input than "high reliability." Don't invent a performance SLO if one hasn't been specified.

### Quality attributes conflict

Lower latency can require duplication or caching, which harms freshness; stronger synchronous consistency can add contention; more independently deployable services add network failure and operational work; stronger generality adds cognitive overhead. **The dimensions interact.**

For a candidate design, record which quality it improves, **what gets worse**, how serious that regression is for this product, and what measurement would change your mind. If a choice improves no relevant quality enough to pay its cost, reject it.

## 2. Architectural patterns solve different problems

These are **not mutually exclusive entire architectures**. A modular monolith may use feature slices, ports/adapters for selected integrations, DDD language in its core domain and async outbox delivery. Combine patterns only when each solves a separate concrete need.

| Approach                                                            | Why it exists / best-fitting conditions                                                              | Cost, trade-off and misuse                                                                                          |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Simple modules/functions**                                        | Small coherent behavior, few callers, stable interfaces                                              | A perfectly good default; don't create a four-layer framework for one function                                      |
| **Classic layers** (transport → application → domain → persistence) | Repeated cross-cutting boundaries, clear dependency direction, central policy ownership              | Layers can become pass-through boilerplate or force one feature across many directories                             |
| **Vertical feature slices**                                         | Change and investigation primarily follow a use case; helps teams/agents locate whole flows          | Duplicated cross-cutting domain policy if every slice reimplements the same rule                                    |
| **Ports and adapters / hexagonal**                                  | Core business decisions should be testable independently of DB, provider or HTTP and adapters change | One interface per concrete class is fake abstraction; introduce ports where dependency substitution pays            |
| **Clean architecture dependency rule**                              | Protect high-value policy from unstable frameworks and delivery mechanisms                           | Excess purity creates wrappers and mapping code that obscure one small operation                                    |
| **DDD bounded contexts**                                            | Domain vocabulary and invariants genuinely differ across business capabilities                       | Overapplying DDD invents aggregates/entities for every DTO and adds translation cost                                |
| **Aggregates and transaction boundaries**                           | Several facts must be changed consistently as one business operation                                 | One giant aggregate is a contention bottleneck; cross-aggregate consistency needs explicit protocol                 |
| **Modular monolith**                                                | Independent conceptual boundaries without independent deployment needs                               | Modules still need import discipline; careless circular dependencies produce a distributed-monolith mindset locally |
| **Microservices**                                                   | Independent deploy/scale/failure/team boundaries produce measurable benefit                          | Remote calls, tracing, latency, versioning, consistency, deployments and incident burden                            |
| **Event-driven integration**                                        | Downstream consumers may react after a committed fact without blocking primary operation             | Delivery may repeat/reorder; diagnostics and state convergence become harder                                        |
| **CQRS / materialized projections**                                 | Reads and writes have genuinely different models/loads/permission needs                              | Synchronization, rebuild, lag, privacy/version issues; often a normal query is enough                               |
| **State machine / workflow engine**                                 | Long-lived multi-step operations, deadlines, retries, human waits, recovery                          | Coordination state must be explicit; workflow engine never replaces business authority                              |
| **Synchronous request/response**                                    | User needs an immediate authoritative answer and bounded work fits request lifetime                  | Tight dependency coupling and latency; not good for long/uncertain external work                                    |

**Design test:** if an agent's recommendation is “use microservices for scalability,” demand the specific bottleneck, independent scaling dimension, ownership boundary, latency/failure budget and operations model. If it is “use hexagonal architecture for testability,” demand the actual unstable dependency or test seam. No buzzword gets a free pass.

### The four different reasons to create a boundary

- **Change boundary:** two responsibilities evolve at different rates or for different reasons.
- **Consistency boundary:** state must be admitted/settled atomically under one authority.
- **Failure boundary:** a dependency may fail separately and should degrade/hold independently.
- **Ownership boundary:** distinct teams, permissions or product domains need different autonomy.

A good boundary may satisfy several, but optimizing one can hurt another. Example: move a DB operation to a remote service to isolate deployment, and you lose the convenience of a single local SQL transaction.

## 3. Ownership, cohesion and change coupling

A module should contain behavior that changes together; its dependencies should not force unrelated consumers to understand its internals.

**Cohesion is about responsibility, not line count.** A long cohesive schema can be healthy; eight tiny pass-through files can be much harder for a coding agent to understand than one focused module.

### Coupling has multiple forms

- **Structural coupling:** package A imports many internals from B; changing B ripples through consumers.
- **Data coupling:** multiple modules interpret/modify one shape or shared table without a single owner.
- **Temporal coupling:** operations must execute in a fragile order (“call this first and then that”).
- **Behavioral coupling:** consumers rely on unwritten side effects or conventions.
- **Operational coupling:** several services must deploy/upgrade together despite separate repositories.

Before extracting a service/helper, ask: _which future change becomes easier, what new coordination does the extraction create, and where can an independent agent now find the behavior?_

### Dependency direction

HTTP controllers map external requests and auth context; application operations coordinate ownership and transactions; pure domain policy decides valid transitions; adapters isolate storage/providers. The principle is **higher-value policy should not depend on replaceable delivery details**. But a separate dependency-injection container or interface for every file is not a requirement.

**Compare three options for a proposed extraction:**

1. Keep the cohesive module, improve names/tests/navigation.
2. Extract a pure policy or adapter at a real reason-to-change boundary.
3. Relocate responsibility into the right owner, adjusting callers and contracts.

Choose by present and forecast change cost, not a style rule. A refactor must not silently alter behavior or become a side quest during harness work.

## 4. Data, communication and deployment choices

### Source-of-truth first

For every important data family say which system owns truth and whether other copies are **read projections, materializations, indexes, caches, history, drafts or external observations**. Different representations may be justified for different consumers, but disagreement/rebuild must have an explicit policy.

| Need                                                        | Likely starting choice                                                    | Revisit when                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Transactionally consistent relations, constraints, commands | PostgreSQL relational model and reviewed schema                           | Query/workload/access needs justify another data model                       |
| Variable descriptive JSON at bounded scale                  | JSONB / immutable documents with typed envelope and validation            | Independent identities, query workload or schema evolution justify splitting |
| Fast derived read, rebuildable on failure                   | Query optimization first, optional cache/projection                       | Measured read bottleneck and acceptable staleness exist                      |
| Flexible text search                                        | PostgreSQL search / dedicated index according to volume and ranking needs | Recall, scale, freshness and relevance prove it useful                       |
| Durable long-lived external work                            | Outbox + worker / workflow coordinator                                    | Atomicity, retry windows, deadlines and complexity justify it                |
| Immediate low-latency decision                              | In-process app operation/SQL transaction                                  | Long I/O or independently failing work violates request budget               |

**Avoid false dichotomies:** SQL vs document is not a single global choice; a transactional ledger and versioned narrative documents can coexist with explicit ownership. A cache is not a database-of-record because reads happen quickly. An event is not a command simply because both contain JSON.

### Sync vs async

Use synchronous calls where completion is bounded and the caller needs the result _now_. Use async work where waiting exceeds request lifetimes, retries/outages must survive crashes, or consumers need decoupled processing. Asynchrony introduces status resources, identity, ordering, cancellation and observability requirements. The UI cannot safely label “done” from “queued.”

### Deployment and scaling

First locate the actual bottleneck: SQL indexes, hot transaction locks, request waterfalls, provider latency, CPU-bound JS, excessive events, frontend bundle cost, scheduler backlog or shared resource contention. Scaling a monolith horizontally may be enough. Splitting services before finding the bottleneck relocates complexity rather than removing it.

## 5. Reversibility, evolution and delivery economics

**Change cost matters more than abstract elegance.** A design that an agent can safely modify in a 30-minute bounded slice is often better for a solo evolving project than a theoretically purer architecture requiring several coordinated migrations.

- **Reversible decisions:** naming, small module layout, optional cache adapter. Keep decisions cheap; don't write an ADR for each.
- **Hard-to-reverse decisions:** data ownership, public protocol, persisted format, state transitions, multi-tenant identity, vendor lock-in. Document rationale, rejected alternative and migration/rollback strategy.
- **Hotspots:** prioritize modules that change often _and_ cause errors/extra exploration. File size alone is a weak signal.
- **Migration:** separate schema additions, data backfill, dual-read/compatibility period, cutover, retirement and rollback where a deployed system requires it. Pre-POC can sometimes change freely, but not at the expense of saved user state.
- **Build vs buy:** include maintenance, version churn, operations, billing, licensing and integration overhead, not just initial LOC.
- **Verification cost:** architecture should permit cheap pure tests for local policy and realistic integration evidence for cross-system guarantees.

An ADR is valuable when a future agent would otherwise relitigate a consequential choice. A one-line note explaining why a minor private helper exists is not an ADR.

## 6. Case studies that defeat automatic answers

### Case A: “The Storyteller needs memory. Add a vector database.”

**Possible reality:** the missing fact has an exact current identity or a prior explicit cue. A semantic search may return a stale/contradictory version while the actual requirement is revision-aware source lookup.

**Competing designs:** exact canonical handle/section reads; lexical index; hybrid search; embedding retrieval; linked episode synthesis. Decide from lookup queries, corpus scale, relevance/recall goals, version invalidation and source provenance. Search is only one stage: discovery → selected current version → full evidence → request packing → model admission.

**Relevant spec:** [canonical files](../../docs/technical/canonical-files.md) and [long-story research](../../docs/engineering/long-story-memory-and-retrieval.md). This case is _not_ permission to change the game agent now.

### Case B: “The same components appear on several screens. Put all state in global Context.”

Maybe the components share _presentation_ state; maybe they show cached server data; maybe some values should live in the URL; maybe each feature's editable draft must remain separate. Map ownership, identity, lifetime and update frequency first. Too much context can also rerender unrelated consumers.

**Options:** props/local state; feature store; context; query cache; URL state; server component data. Compare distribution/consistency cost, not only prop drilling. See [frontend state manual](frontend-state-and-async.md).

### Case C: “The worker can retry, so build an event-driven service.”

A retry can duplicate a business effect unless a stable durable operation/receipt fence exists. But forcing all commands into long-lived workflows may add needless orchestration for simple synchronous checks. Compare app transaction, outbox/worker, workflow engine and event subscription by the lifecycle, side effect and recovery requirement.

**Relevant knowledge:** [durable operations](durable-operations.md). A scheduler is not a substitute for the state owner.

### Case D: “Split the 1,000-line module.”

First ask which responsibilities are changing together, whether one transaction should remain contiguous, where agent navigation breaks, and whether extracted modules create a maze. **Option zero** (keep and improve navigation) must compete with extraction. Clean source structure is not a product feature.

## 7. How roles use this manual

| Role                    | What to produce before committing to a design                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Product strategist / UX | Clear outcome, quality priorities and constraints; not a nominated technical pattern                |
| Solution architect      | 2–3 credible alternatives, selection criteria, ownership diagram, trade-offs, reversibility         |
| Data architect          | Truth/identity model, data access and query patterns, constraints and migration considerations      |
| Frontend architect      | State owner/lifetime, server/client boundary, feature cohesion and user-state semantics             |
| Backend architect       | Use-case boundaries, synchronous vs durable async, failure/ops costs and compatibility              |
| Design challenger       | One credible omitted option and a changed-constraint case that could reverse the recommendation     |
| Test strategist         | Tests that distinguish chosen design from plausible defective alternatives                          |
| Implementer             | Approved contract and small responsible slice, not an invitation to choose a different architecture |

**Role receipt:** decision and scope → considered alternatives and criteria → chosen owner/contract → key interaction costs → falsifying case → verification strategy → unresolved human decision.

**Deep study / sources:** [SE330 Architecture art](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE330-software-architecture/SE330-L01-the-art-of-software-architecture.md), [SE330 Patterns and consequences](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE330-software-architecture/SE330-L02-architecture-patterns-and-their-consequences.md), [SE330 Evolution](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE330-software-architecture/SE330-L03-maintaining-and-evolving-real-software.md), [data workshop](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS340-data-systems-beyond-relational/CS340-L07-the-data-architecture-workshop.md). These are deeper explanations, not required next reads for every task.
