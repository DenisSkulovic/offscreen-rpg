# Roadmap

Owner strategy. Not an implementation queue. The only code selection is [work/changes](work/changes/README.md). What is demonstrated is [STATUS](STATUS.md).

Offscreen RPG is an engineering portfolio and a development laboratory. The near-term bar is architecture, tests and failure modes the owner can defend. It is not a race to acquire players. Gameplay expansion and visual redesign wait for a separate authorization.

## Current owner priority | 2026-11-19: distributed architecture laboratory

**For the coming development sessions, the primary focus is Kubernetes infrastructure, deliberate service separation, event-driven communication, operations and ultimately measurable resilience under failures and load.** This supersedes documentation/wiki improvement as the *active initiative*, not the obligation to maintain documentation.

The recent documentation/wiki consolidation push is **complete for its bounded achieved batches and paused as a standalone focus**, not a claim that all documentation is finished or defect-free. The repository still requires documentation as a first-class part of every Change, with link/impact guards and truthful evidence. New technical architectural discoveries should update canonical specifications before or alongside code. Do not archive or cancel unrelated unfinished documentation Changes by declaration.

**Product alignment:** [Vision](docs/product/foundations/vision.md#the-d-d-foundation) and [gameplay rules](docs/product/gameplay/rules.md#world-independent-foundation) take precedence over teaching-diagram service names. This is a text-first, world-neutral D&D-style game with an LLM Storyteller as DM. Dice, time, admitted mechanical effects, relevant character resources and continuity-relevant world facts are authoritatively recorded by the engine. Items/equipment may be tracked when established by play; they do not imply an economy, trade simulator, universal ledger of every object, or a microbe carrying gold. Optional image generation and commercial billing are platform capabilities, not game-world mechanics.

**Selected gameplay invariant for future architecture:** Every committed scene is a durable historical state checkpoint, faithfully reviewable in the Living Book and branchable into an independent story from **any** scene. This includes relevant historical possessions/equipment or other resources, world facts, character capabilities, fictional clock and commitments. There is no mandatory economy or universal inventory, but there must be no later-state contamination on a historical fork. Current POC journal and current-only validated fork are partial implementations; any-scene state reconstruction/fork is **not yet built**. See [vision](docs/product/foundations/vision.md#scene-history-and-alternate-continuities), [journal](docs/product/experience/return-and-journal.md#scene-checkpoints-review-and-forks--long-term-target), [lifecycle](docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities), and [persistence](docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology). ARCH02 must account for this consistency requirement before service extraction.

**Storyteller knowledge and branchability:** The [selected memory promise](docs/product/storyteller/memory-and-continuity.md#branch-scoped-knowledge--selected-long-term-invariant-2026-11-19) is that a model acting as DM receives only the relevant, historically valid branch-scoped knowledge. A committed scene pairs recoverable mechanical state with an exact canon/document root, allowing faithful inspection and any-scene forks without contamination from later parent/sibling facts. Versioned Markdown/JSON and immutable content are canonical representations; bounded application-mediated retrieval is the interface. Cognee/graph/vector indexes are optional rebuildable candidates, not game authority or prerequisite infrastructure. [ARCH03](work/changes/archive/2026-11/other/2026-11-19--arch03-branch-scoped-storyteller-knowledge/CHANGE.md) records the fork-scoped retrieval contract. It is not a built reconstruction. **The legacy Cognee rejection was for coding-agent repo memory, not a game-memory evaluation.**

**Training outcome:** The owner can inspect and explain every introduced component, its alternatives, responsibility, failure modes and operational behavior, rather than simply delegate whole-system architecture to coding agents. Build infrastructure in small demonstrable slices with actual runtime evidence. Failures/stress tests become first-class exercises once the relevant components exist, not theoretical diagrams masquerading as proof.

**Target, not current implementation:** Kubernetes kind lab, PostgreSQL via CloudNativePG, RabbitMQ, Redis cache, Temporal, S3-compatible object storage, Gateway API edge, observable web/API and selectively separated responsibilities grounded in the D&D-like game: deterministic rules and committed world facts, Storyteller/DM generation, optional media generation, player delivery and platform billing/entitlements where justified. **No gameplay Economy service or mandatory inventory simulation.** ARCH02 decides deployable boundaries before K8S08 scaffolds them. Contract-first service ownership; commands/events/workflows deliberately distinguished. The historical modular-monolith recommendation in [D-0001](docs/decisions/D-0001--modular-engine.md) remains the current implementation. [ARCH01](work/changes/archive/2026-11/other/2026-11-19--arch01-distributed-target-contract/CHANGE.md) reconciled the educational laboratory as an additional target. [ARCH02](work/changes/archive/2026-11/other/2026-11-19--arch02-service-ownership-and-event-contracts/CHANGE.md) records the ownership and event guarantees. The active candidate [Change program](work/changes/README.md#distributed-architecture-laboratory-new-2026-11-19) is the execution queue.

**Near-term stages:**
1. ARCH01 has ratified the target and current boundary. ARCH02 still has to ratify message and service ownership.
2. Build reproducible kind foundation, Postgres, messaging, cache, storage, Temporal and Gateway API edge (K8S01–06, K8S09). Strict local resource budgets and no silent volume destruction.
3. Build one observable cross-service vertical slice and independently scalable service skeletons (K8S07–08).
4. Deliberately inject crashes, network faults, duplicates, ordering problems and load; measure recovery and correctness (K8S10). Increase resilience architecture only when a failure experiment demonstrates why.
5. Migrate real game capabilities later via separately designed Changes, preserving product truths and paid-provider boundaries.

**Currently NOT claimed:** microservices implemented, actual availability guarantees, highly available local databases/brokers, production-ready Temporal, production ingress security, demonstrated stress tolerance, completed platform migration.

## Distributed turn POC | gap-to-implementation program

[One real distributed Storyteller turn](work/designs/open/distributed-turn-poc/README.md) defines the **first integration milestone** after the infrastructure substrate. Its [gap register](work/designs/open/distributed-turn-poc/GAPS.md) covers runtime packaging, cross-service ownership, RabbitMQ/Temporal choreography, S3-backed canonical publication, scene checkpoints/historical forks, campaign bootstrap, role-scoped Storyteller context, browser reconciliation and actual Kubernetes proof. Existing components are reusable but not automatically interconnected. Plan the missing source-level Changes over subsequent design passes before assigning them to Cursor. K8S service skeletons alone do not fulfill this milestone.

The register explicitly **defers but retains** scene image generation, full usage/entitlement/Stripe commercialization, external notifications, richer memory indexing/Code Mode, expanded D&D systems, shared play and full chaos/load/HA work. Minimal per-attempt usage/cost accounting and safe provider authorization remain required if the POC invokes a real paid model.

## Selected and still binding

- Product and technical contracts outrank code. A selected future design is not an implementation claim.
- The client campaign uses the accepted React, Next.js and TanStack Query stack in [D-0002](docs/decisions/D-0002--react-next-client.md).
- The engine working target remains the modular monolith in [D-0001](docs/decisions/D-0001--modular-engine.md). ARCH01 kept that as the current implementation. Full short-lock refactor remains an open Change, not a finished program.
- An educational distributed laboratory is an additional selected target in [Distributed learning target](docs/technical/platform/topology.md#distributed-learning-target). It is not the current runtime, not a production deployment, and not permission to extract game services. Only a selected Change may execute it. K8S01 proved a disposable kind cluster and then deleted it.
- Chamber is a developer laboratory for valid fixtures and controlled faults. It is not a player feature and not proof of live play.
- In-game model spend and coding-agent spend are different budgets. Neither is authorized by this page.

Current execution rule: no Change runs unless it is the selected packet. Shared play, player replay, production Support grants and several Admin operating policies remain proposed.
