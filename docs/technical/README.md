# Technical contracts

One owner per guarantee. Product intent is [product](../product/README.md). These pages include selected future design. They are not a status report.

| Question | Owner |
| --- | --- |
| What is deployed, and who calls whom? | [Topology](platform/topology.md) |
| Who is logged in, and what may they read? | [Identities and access](platform/identities-and-access.md) |
| Where does durable state live? | [Data and persistence](platform/data-and-persistence.md) |
| How does a command survive retry? | [Execution and delivery](platform/execution-and-delivery.md) |
| Who may spend on a model call? | [Spending and entitlements](platform/spending-and-entitlements.md) |
| How does a release stay compatible? | [Deployment and compatibility](platform/deployment-and-compatibility.md) |
| How do we reach the player? | [Notifications](platform/notifications.md) |
| What engine are we building, and what did we reject? | [Selected architecture](engine/selected-architecture.md) |
| What may commit a transition today? | [Authority and transitions](engine/authority-and-transitions.md) |
| What may a rule change? | [Mechanics and capabilities](engine/mechanics-and-capabilities.md) |
| When does fictional time advance? | [Chronology and activities](engine/chronology-and-activities.md) |
| How do stories start, fork and end? | [Lifecycle](engine/lifecycle-and-compatibility.md) |
| What lock and capture behavior is proved? | [Concurrency and recovery](engine/concurrency-and-recovery.md) |
| How do calendars name the same chronology? | [Calendars](engine/calendars-and-world-time.md) |
| How do ticks and tags work? | [Ticks and tags](engine/ticks-and-tags.md) |
| What are the two Storyteller loops? | [Operation and controller](storyteller/operation-and-controller.md) |
| What may be published? | [Generation and publication](storyteller/generation-and-publication.md) |
| When does the model stop reading? | [Prompts and tools](storyteller/prompts-and-tools.md) |
| What enters one request, and what does it cost? | [Request context and cost](storyteller/request-context-and-cost.md) |
| Where does narrative canon live? | [Context and memory](storyteller/context-and-memory.md) |
| How is a provider call reserved and settled? | [Provider boundary](storyteller/provider-boundary.md) |
| How are story settings versioned? | [Versioned settings](storyteller/versioned-settings.md) |
| How do SSR, cache and commands divide? | [State and server boundary](client/state-and-server-boundary.md) |
| What is the accepted client stack? | [Architecture](client/architecture.md) |
| How do clicks and drafts behave? | [Interaction contracts](client/interaction-contracts.md) |
| What visual runtime is selected? | [Presentation runtime](client/presentation-runtime.md) |
| What accessibility and cost bars apply? | [Accessibility and performance](client/accessibility-and-performance.md) |
| What may a staff grant do? | [Admin topology](admin/topology-and-authorization.md) |
| What may an investigation reveal? | [Investigation and privacy](admin/investigation-and-privacy.md) |
| What is a forensic turn capsule? | [Identities and evidence](observability/identities-and-evidence.md#turn-evidence-capsule) |
| How is a Chamber fixture not a gameplay proof? | [Chamber and fixtures](lab/chamber-and-fixtures.md) |

Accepted trade-offs that are not the norm itself: [decisions](../decisions/README.md).
