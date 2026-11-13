# Monorepo and ownership | reshape by responsibility, not folder aesthetics

**Status:** architecture recommendation and module audit, not an instruction to move files now. Under the [engine target](target-engine.md) and [source audit](evidence/source-audit.md). The pre-POC monorepo contains independent apps and pure packages; this is a strength to preserve.

## What should remain conceptually one deployable?

**Recommendation: TypeScript modular monolith** with separable web, API and worker processes, shared packages, PostgreSQL and a Temporal service. This is already close to current physical topology. Do **not** split into business microservices merely to demonstrate expertise. A portfolio can demonstrate high-grade modularity, versioning, traceability, observability, scalability and failover without twenty independent network services.

**Reason:** most game commands require atomic coordination of actor permissions, offer versions, time, items, progress, world obligations, outbox and charged operations. Splitting these into services too early replaces one readable SQL transaction with a distributed saga whose business invariants are harder to prove.

## The important source boundary map

| Existing owner | What is legitimately owned | Architectural risk | Direction |
| --- | --- | --- | --- |
| `@offscreen/game` | Zod rule schemas, pure checks/effects/time/offers/activities | Limited effect vocabulary and mandatory character fields | Evolve into small versioned *supported* capability handlers, keeping pure resolution |
| `@offscreen/contracts` | Versioned public/transport schemas | Too many internal mechanics fields leaked to client if one schema reused | Separate public-safe projections from private admission/evidence |
| `@offscreen/application` | Coordinated use cases, SQL transactions, gameplay state, Storyteller admission/publication | Many cross-slice operations; changing activity may touch story and narrator modules | Retain obvious facade but organize by command/aggregate ownership and typed policy seams |
| `@offscreen/db` | Schema, migrations, DB lifecycle | Wide campaign JSON and story-wide lock remain hot future units | Track actor/scene identities and indexes when domain contract requires |
| `@offscreen/storyteller` | Content profiles, bounded task payloads, provider adapters, output validation | Generated mechanics can't express desired world actions yet | Keep candidate-only role, improve contract composition and evaluation |
| `@offscreen/documents` | Immutable document/manifests/CAS and imports | Local-only adapter; mixed source ownership needs integration hardening | Storage-neutral interface, shared object adapter, integrity/recovery |
| `@offscreen/workflows` | Durable deterministic timing/workflow definitions | Long history and worker rollout compatibility, task queue class isolation | Versioning/Continue-As-New/semantically bounded activities |
| `apps/api` | HTTP/auth/SSE and application wiring | Public projection cost, SSE fanout; all auth scope starts at viewer | Keep thin API, no game effects in controller |
| `apps/worker` | Outbox dispatch and Temporal Activity bindings | One queue/concurrency preset, mix of IO-heavy/short tasks | Fair separately configurable queues/pools as measurement justifies |
| `apps/web` | Player views and command adapters | Parallel UX refactor in progress | Do not touch or redefine from engine design; consume stable public DTOs |

No new top-level package is a badge of progress. An additional package should be justified by independent code ownership/dependency constraints, not the presence of three related files.

## Recommended logical ownership after evolution

\`\`\`text
packages/game/                           pure, framework-free policies
  core: identities, checks, time rules
  capabilities: optional typed resource/form/position/item/social primitives
  admission: validate proposed action/condition and produce lawful transition

packages/application/                    transactional domain/application layer
  story: situation publication, membership, revisions, historical source roots
  agency: actor-controlled intention/consent, accepted plans and decisions
  execution: admitted work, clock/event settlement, receipts, obligations
  storyteller: captured tasks, evidence/context, cost, publication
  history: source-linked causal journal and viewer read projection
  service ports: DocumentStore, model provider, cache, notifications, time

packages/db/                             schema + actual transaction infrastructure
packages/documents/                      immutable artifact formats and storage ports
packages/storyteller/                     bounded creative/proposal/data contracts
packages/workflows/                       deterministic wake/coordinator workflows
apps/api/ apps/worker/ apps/web/          transport/deployment adapters
\`\`\`

This is **conceptual**, not a proposed direct rename of every current path. The existing `campaign`/`stories` groups can be incrementally reorganized as scopes settle. A wholesale move can make Git diffs unreadable and break Cursor's parallel UI work for no player benefit.

## The four kinds of coupling to monitor

1. **Compile-time:** wrong package import direction, e.g. pure rules depending on DB/provider.
2. **Business invariants:** one accepted action requires multiple rows to settle atomically. This coupling is **intentional**; don't split it across service boundaries.
3. **Temporal/concurrency:** accepted plan, due event and available offer share a decision/clock boundary. Name its owner, tests and priority, not separate hidden schedulers.
4. **Human/change coupling:** implementing an item transfer requires modifying a task schema, source loader, validation, rules, three DB files, read DTO and UI. That may be legitimate end-to-end work, but repeated boilerplate/fan-out is a refactor signal.

Track representative **change paths** instead of using file count or line count as the sole indicator:
- new rule capability;
- new Storyteller task purpose;
- new item/fact operation;
- new actor/player permission;
- new public source projection;
- new event/notification;
- new worker queue;
- new storage adapter.

For each, count concrete owner files and explain which touches are conceptually necessary versus incidental. Optimize high-frequency change paths.

## Suggested dependency rule

\`\`\`text
apps and composition  ──> application, contracts, adapters
application           ──> pure game, storyteller contracts, db, documents
storyteller contract  ──> independent schemas/context DTOs
pure game             ──> no application, DB, Nest, provider, Temporal
workflows             ──> activity interfaces + deterministic Temporal SDK only
browser               ──> public DTOs, never hidden plans, SQL or secrets
\`\`\`

If the application and Storyteller need to share a captured evidence type, define it in the **smallest neutral contract owner**. Avoid cyclic imports and interface packages with zero independent purpose. Prefer compile-/lint-enforced dependency direction and source-adjacent maps.

## One important anti-pattern in complex monoliths

A shared “story engine” class that imports every module, decides all options, clocks, cost, memory, provider dispatch and publication will become impossible to audit even if it's split over 300 single-method files. **Facade composition is fine; business logic as one coordinator is not.**

The current `createStories` facade assembles operations from many source-adjacent modules; that's not intrinsically wrong. Review the individual **transaction ownership and end-to-end change path**, not whether a constructor has fifteen imports.

## Potential strategic boundary decisions

### Rule-capability family / actor state

High priority. If new world shapes cannot be added without patching global character schemas and every output codec, introduce a small typed capability registry that is discoverable by the Storyteller's task recipes. This does **not** require dynamic loading of custom code from a world package.

### Canonical state vs immutable documents

High priority. Transactional current mechanics and player permissions should remain PostgreSQL-authoritative. Immutable documents are excellent for prose, long-form lore, pinned world/rules **definitions**, export and source-linked memory. Avoid migrating hot mutable mechanical counters into object files as sole write authority without an independently demonstrated consistency/operational benefit. A portable **exported projection/snapshot** can preserve human readability without making file CAS the business lock.

### Storyteller memory/creative exploration

Medium-high priority. Current bounded retrieval/controller code is nontrivial; isolate phases (orientation/search, evidence reading, packing, proposal, validation) through meaningful interfaces and fail reasons, **not** one wrapper per 50-line function. Avoid rebuilding the entire Storyteller package until a real trace identifies a harmful dependency/quality bottleneck.

### Durable workflow orchestration

Medium-high priority. Workflow code should stay small/deterministic and focused on timers/safe retries. Versioned deployment, bounded history and queue isolation may be urgent for hosted persistence; they're not a reason to move rule semantics into Temporal.

### Read/caching/broadcast

Conditional performance work. Measure actual SQL read and SSE behavior first. Change the read query, projection or broker only at a bounded user/ops outcome. Adding Redis/streaming layers without a baseline is not architecture.

## Development and deployment boundaries are different

A monolith can deploy:
- API replicas independently for HTTP/SSE;
- worker replicas dedicated to model IO or timer settlement (once queue/Activity compatibility is configured);
- a managed PostgreSQL with one authoritative primary;
- a shared immutable object storage adapter;
- optional Redis read cache;
- Temporal server/namespace;
- static/SSR web separately.

This topology is sufficiently “serious” for a portfolio while retaining one codebase and transaction-oriented domain. A future true shared-world hot spot may justify extracting one service *after* a stable business protocol and measured contention show it's useful.

## Refactor rule

Every move must have a **behavioral or architecture invariant** to prove: “The rules core can be imported with no Node/DB dependencies,” “A new form-change rule touches only one capability family plus wire contract,” “API and worker replicas read the same immutable object hash,” or “Different worker versions can finish the same admitted task without changing effects.”

A PR that only relocates files, adds empty abstractions and makes code navigation harder **is not engine progress**.
