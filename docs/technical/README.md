# Technical contracts | find the right owner

This is a **routing index**, not another technical specification. Product bible: [docs/product](../product/README.md). Observed status: [progress](../progress.md) → `STATUS.md` after DOC01 cutover. Source maps: package READMEs.

**DOC01 P3:** canonical owners live in the subject folders below. Flat `docs/technical/*.md` files remain **compatibility stubs** until P5. Program technical trees under `docs/programs/*/technical/` are inputs to reconcile—not parallel authority forever.

## Platform

| Question | Owner |
| --- | --- |
| Application topology / stack | [platform/topology](platform/topology.md) |
| Identities, sessions, access | [platform/identities-and-access](platform/identities-and-access.md) |
| Data and persistence | [platform/data-and-persistence](platform/data-and-persistence.md) |
| Execution and delivery | [platform/execution-and-delivery](platform/execution-and-delivery.md) |
| Spending and entitlements | [platform/spending-and-entitlements](platform/spending-and-entitlements.md) |
| Deployment and compatibility | [platform/deployment-and-compatibility](platform/deployment-and-compatibility.md) |

## Engine

| Question | Owner |
| --- | --- |
| Authority and transitions | [engine/authority-and-transitions](engine/authority-and-transitions.md) |
| Mechanics and capabilities | [engine/mechanics-and-capabilities](engine/mechanics-and-capabilities.md) |
| Chronology and activities | [engine/chronology-and-activities](engine/chronology-and-activities.md) |
| Lifecycle and compatibility | [engine/lifecycle-and-compatibility](engine/lifecycle-and-compatibility.md) |
| Concurrency and recovery | [engine/concurrency-and-recovery](engine/concurrency-and-recovery.md) |

Also still readable until fold: [ticks-and-tags](ticks-and-tags.md), [calendars-and-world-time](calendars-and-world-time.md), [persistence-and-caching](persistence-and-caching.md).

## Storyteller (in-game)

| Question | Owner |
| --- | --- |
| Operation and controller | [storyteller/operation-and-controller](storyteller/operation-and-controller.md) |
| Context and memory | [storyteller/context-and-memory](storyteller/context-and-memory.md) |
| Request context and cost | [storyteller/request-context-and-cost](storyteller/request-context-and-cost.md) |
| Prompts and tools | [storyteller/prompts-and-tools](storyteller/prompts-and-tools.md) |
| Generation and publication | [storyteller/generation-and-publication](storyteller/generation-and-publication.md) |
| Provider boundary | [storyteller/provider-boundary](storyteller/provider-boundary.md) |

Also until fold: [story-settings](story-settings.md), [notifications](notifications.md). Flat [context-and-cost](context-and-cost.md) is a stub.

## Client

| Question | Owner |
| --- | --- |
| React/Next architecture | [client/architecture](client/architecture.md) |
| State / server boundary | [client/state-and-server-boundary](client/state-and-server-boundary.md) |
| Interaction contracts | [client/interaction-contracts](client/interaction-contracts.md) |
| Presentation runtime | [client/presentation-runtime](client/presentation-runtime.md) |
| A11y and performance | [client/accessibility-and-performance](client/accessibility-and-performance.md) |

## Admin (staff technical)

| Question | Owner |
| --- | --- |
| Topology and authorization | [admin/topology-and-authorization](admin/topology-and-authorization.md) |
| Investigation and privacy | [admin/investigation-and-privacy](admin/investigation-and-privacy.md) |
| Commands and audit | [admin/commands-and-audit](admin/commands-and-audit.md) |
| Console and read models | [admin/console-and-read-models](admin/console-and-read-models.md) |

## Observability

| Question | Owner |
| --- | --- |
| Identities and evidence | [observability/identities-and-evidence](observability/identities-and-evidence.md) |
| Capture and provenance | [observability/capture-and-provenance](observability/capture-and-provenance.md) |
| Investigation and reconstruction | [observability/investigation-and-reconstruction](observability/investigation-and-reconstruction.md) |
| Retention and access | [observability/retention-and-access](observability/retention-and-access.md) |
| Telemetry and diagnostics | [observability/telemetry-and-diagnostics](observability/telemetry-and-diagnostics.md) |

## Lab

| Question | Owner |
| --- | --- |
| Chamber and fixtures | [lab/chamber-and-fixtures](lab/chamber-and-fixtures.md) |
| Experiment protocol | [lab/experiment-protocol](lab/experiment-protocol.md) |

## Examples (not technical authority by path)

[Technical playthrough atlas](playthroughs/README.md) — scenarios/examples; DOC01 will historicize as evidence/examples in P4.
