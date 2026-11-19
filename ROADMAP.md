# Roadmap

Owner strategy. Not an implementation queue. The only code selection is [work/changes](work/changes/README.md). What is demonstrated is [STATUS](STATUS.md).

Offscreen RPG is an engineering portfolio and a development laboratory. The near-term bar is architecture, tests and failure modes the owner can defend. It is not a race to acquire players. Gameplay expansion and visual redesign wait for a separate authorization.

## Current owner priority | 2026-11-19: distributed architecture laboratory

**For the coming development sessions, the primary focus is Kubernetes infrastructure, deliberate service separation, event-driven communication, operations and ultimately measurable resilience under failures and load.** This supersedes documentation/wiki improvement as the *active initiative*, not the obligation to maintain documentation.

The recent documentation/wiki consolidation push is **complete for its bounded achieved batches and paused as a standalone focus**, not a claim that all documentation is finished or defect-free. The repository still requires documentation as a first-class part of every Change, with link/impact guards and truthful evidence. New technical architectural discoveries should update canonical specifications before or alongside code. Do not archive or cancel unrelated unfinished documentation Changes by declaration.

**Training outcome:** The owner can inspect and explain every introduced component, its alternatives, responsibility, failure modes and operational behavior, rather than simply delegate whole-system architecture to coding agents. Build infrastructure in small demonstrable slices with actual runtime evidence. Failures/stress tests become first-class exercises once the relevant components exist, not theoretical diagrams masquerading as proof.

**Target, not current implementation:** Kubernetes kind lab, PostgreSQL via CloudNativePG, RabbitMQ, Redis cache, Temporal, S3-compatible object storage, Gateway API edge, observable web/API and independently deployed game engine, storyteller, illustration, economy, payments and notifications. Contract-first service ownership; commands/events/workflows deliberately distinguished. The historical modular-monolith recommendation in [D-0001](docs/decisions/D-0001--modular-engine.md) remains the current source contract until [ARCH01](work/changes/open/2026-11-19--arch01-distributed-target-contract/CHANGE.md) reconciles it. [ARCH02](work/changes/open/2026-11-19--arch02-service-ownership-and-event-contracts/CHANGE.md) follows for ownership and event guarantees. The active candidate [Change program](work/changes/README.md#distributed-architecture-laboratory-new-2026-11-19) is the execution queue.

**Near-term stages:**
1. Ratify target/current boundary and message/service ownership (ARCH01, ARCH02).
2. Build reproducible kind foundation, Postgres, messaging, cache, storage, Temporal and Gateway API edge (K8S01–06, K8S09). Strict local resource budgets and no silent volume destruction.
3. Build one observable cross-service vertical slice and independently scalable service skeletons (K8S07–08).
4. Deliberately inject crashes, network faults, duplicates, ordering problems and load; measure recovery and correctness (K8S10). Increase resilience architecture only when a failure experiment demonstrates why.
5. Migrate real game capabilities later via separately designed Changes, preserving product truths and paid-provider boundaries.

**Currently NOT claimed:** microservices implemented, actual availability guarantees, highly available local databases/brokers, production-ready Temporal, production ingress security, demonstrated stress tolerance, completed platform migration.

## Selected and still binding

- Product and technical contracts outrank code. A selected future design is not an implementation claim.
- The client campaign uses the accepted React, Next.js and TanStack Query stack in [D-0002](docs/decisions/D-0002--react-next-client.md).
- The engine *current working implementation* remains a modular monolith as described in [D-0001](docs/decisions/D-0001--modular-engine.md) until reconciled. Full short-lock refactor remains an open Change, not a finished program.
- Chamber is a developer laboratory for valid fixtures and controlled faults. It is not a player feature and not proof of live play.
- In-game model spend and coding-agent spend are different budgets. Neither is authorized by this page.

Current execution rule: no Change runs unless it is the selected packet. Shared play, player replay, production Support grants and several Admin operating policies remain proposed.
