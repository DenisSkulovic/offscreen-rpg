# TD02 | source and claim map

Inspected frozen main `4b621ec9708361a2304efdcff4d34bb7da2b6c88`. Heading inventory and source anchors below identify the actual owners; source existence is not live qualification. Read-only source checks, no runtime or provider operations.

## T01 | Runtime topology

Owned existing headings:

- `docs/technical/platform/topology.md`: 1: Technical architecture; 7: Who owns the boundary; 23: Recommendation; 44: Runtime shape; 71: Distributed learning target; 96: Selected lab edge; 106: Proposed service ownership; 147: Code organization; 195: Storage choices and alternatives; 203: What handles events and background work; 216: Gameplay transitions and durable follow-ups; 224: User-flow contracts; 239: Scale targets and current limits; 247: Where to go deeper; 259: Contract dependencies


Controlling/evidence anchors: `infra/workloads/profiles/development.yaml`; `infra/workloads/profiles/release.yaml`; `infra/environments/platform-plan.mjs`. Selected transformation and negative in TASKS T01.

## T02 | Deployment evidence and compatibility

Owned existing headings:

- `docs/technical/platform/deployment-and-compatibility.md`: 1: Delivery, operations and validation; 3: Environment execution (INF16–INF19 selected); 7: Backing platform (INF09–INF15 selected); 13: Application workloads (INF08 selected); 17: Container image architecture (INF07 selected); 27: Correct local incremental-check policy (DX12; local command joined); 31: Who owns the boundary; 47: Local development; 57: Scripted testing chamber; 85: First live-story POC: what the run must mean; 95: Playable portfolio release; 103: First hosted deployment; 119: Web edge checklist; 125: Kubernetes as a deliberate extension; 141: Disposable CloudNativePG proof; 145: Observability; 163: Zero-provider game-chaos design (not an implementation result); 169: Tests that demonstrate the architecture; 216: Implementation order; 228: Cold-kind acceptance versus source existence (TURN03, reselected 2026-11-22); 232: Planned real-game Pod recovery and bounded load gate (existing K8S10)


Controlling/evidence anchors: `infra/environments/infra-cli.mjs`; `infra/workloads/render.mjs`; `infra/verification/CAPABILITIES.md`. Selected transformation and negative in TASKS T02.

## T03 | Temporal platform

Owned existing headings:

- `docs/technical/platform/temporal-infrastructure.md`: 1: Local Temporal infrastructure; 5: Ownership and topology; 29: Configuration and source owners; 43: Persistence and credentials; 51: Lifecycle and evidence


Controlling/evidence anchors: `infra/platform/temporal/install.mjs`; `infra/platform/temporal/readiness.mjs`; `infra/platform/temporal/values.yaml`. Selected transformation and negative in TASKS T03.

## T04 | Deployment Atlas

Owned existing headings:

- `docs/architecture/06-runtime-and-deployment.md`: 1: 6. Kubernetes: the laboratory versus an actual game release; 5: CURRENT SOURCE: component labs and synthetic applications; 25: SELECTED TARGET: one real disposable release; 59: Startup ordering is a dependency graph, not a prayer; 77: Four source-level gotchas, already identified; 94: Proof levels are separate

- `docs/architecture/10-developer-environments.md`: 1: Developer environments | three coding agents, one workstation; 23: The idea in one minute; 59: What is running, and when?; 74: What a full application stack contains; 87: The two most important safety rules; 109: Why images and Tilt became difficult; 115: What is proven versus still ahead?; 132: Find the next layer


Controlling/evidence anchors: `docs/technical/platform/developer-environments.md`; `docs/technical/platform/topology.md`; `infra/workloads/profiles/release.yaml`. Selected transformation and negative in TASKS T04.
