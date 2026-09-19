# Code navigation

This is a map of implemented code, not the target architecture. Read [progress](../progress.md) for current gaps, then choose one route below. Follow imports only when that route's responsibility crosses a boundary. Do not load every linked document.

To understand the intended gameplay before following code, use the [execution atlas](../technical/playthroughs/README.md). Its worked traces distinguish current source behavior from proposed rules and connect acceptance steps to owning feature phases.

For the next coding tranche, the [feature route](../features/README.md) points to a bounded file map per slice. Start with A1 rather than every outstanding feature. The [solo integration contract](../technical/solo-gameplay-contract.md) documents clock/collision defaults and the distinction between narrative sequence, mechanical state, authored choice permission and historical reports.

## Find the owner

| Question | Start here | Go deeper only when needed |
| --- | --- | --- |
| Where does a player request enter? | [API composition](../../apps/api/src/app.ts), then the relevant controller under `modules/` | [Application guide](../../packages/application/README.md) |
| Where is a screen implemented? | `apps/web/app/` owns routes; `apps/web/src/features/` owns most interaction and rendering | `stories/opening-preview.tsx` for creation; `play/campaign-play.tsx` for mechanical options |
| Who may roll or change a fact? | [Immediate-action policy](../../packages/game/src/immediate-actions.ts), [checks](../../packages/game/src/checks.ts), [effects](../../packages/game/src/effects.ts) | Application `campaign/actions.ts` and `campaign/activities.ts` own persistence and transaction boundaries |
| What does the model actually receive? | [Storyteller guide](../../packages/storyteller/README.md) | Application `storyteller/context.ts` reads storage; package `context/index.ts` bounds it; `tasks/index.ts` constructs the request |
| Why did background work not run? | [Outbox dispatch](../../apps/worker/src/outbox/dispatch.ts), then [Activity bindings](../../apps/worker/src/activities/index.ts) | `packages/workflows/src/` owns durable orchestration; application operations recheck database authority |
| Where are records and constraints? | `packages/db/src/` schema files named after their domain | Application persistence modules show how rows participate in transactions |
| Where do caching and invalidation belong? | [Persistence and caching](../technical/persistence-and-caching.md) | Application read projections own freshness identities; deployables own optional Redis adapters |
| Is a field public or private? | `packages/contracts/src/` defines transport shapes | Follow the response projection; a shared type alone does not authorize disclosing a private plan |
| Where do example worlds come from? | Application `campaign/fixtures/content/`, Storyteller `fixtures/content/`, web `app/demo/content/` | Content loaders validate data; fixtures do not demonstrate arbitrary-world generation |
| How do I explore the running POC? | [Development guide](../development.md), [manual QA workflow](qa-journeys.md) | `tools/chamber/` launches it; `tools/api-integration/` contains optional automated probes |

## Package boundaries

`packages/game` owns pure mechanical rules. `packages/contracts` owns transport validation and projections of game values. `packages/storyteller` owns profile data, bounded context, task contracts, result validation and the provider adapter. `packages/application` composes those packages with `packages/db` to admit, persist and publish operations. API and Activity workers call application operations; neither should implement a second game resolver. `packages/workflows` is the deterministic Temporal bundle, separate from Activity implementations. `packages/config` holds shared configuration. Package manifests and exports are the authority for actual dependencies; this map does not duplicate every import.

The [architecture specification](../technical/architecture.md) also describes intended infrastructure. Mention there does not imply an implemented integration.

## Terms that otherwise send readers to the wrong file

[Concepts](../concepts.md) owns domain vocabulary. In particular, a Storyteller turn, contextual scene, publication passage and model round are different things. Existing `result.scene` is an output envelope, not proof of a scene lifecycle. The game has no chapter concept.

| Term | Meaning here |
| --- | --- |
| Storyteller profile | Creative content/settings captured by a task; not an agent or a model route |
| Task | Immutable context, source revision, profile, execution policy and exact request |
| Generation | Durable execution record containing task input and eventual output |
| Publication | Separate decision to apply a saved result to the still-current story; successful generation alone is insufficient |
| Offer | Public choices plus separately persisted private plans under an offer identity |
| Finite action | Admitted automatic outcome or ability check with a fixed positive duration; persisted as an execution and resolved into one receipt only at its target tick |
| Activity | Persisted commitment with contribution or wait progress under the campaign clock; broader participation/process families remain feature work |
| Passage / arrival | Committed narrative versus a prepared future slice; arrival is not current evidence before publication |
| Chamber | Both local tooling and, currently, a wrapper used by ordinary story routes; inspect wiring rather than assuming everything with this name is developer-only |

## Reading discipline

For a change, locate its entry point, authoritative operation and output first. Then inspect only the policy, persistence and recovery branches it calls. Read tests as examples of an invariant, not as a substitute for tracing production wiring. Record a discovered cross-file invariant with its owner; leave a short link at a surprising caller. Proposed fixes belong in the active feature plan, not in comments that imply they are implemented.

Navigation maintenance follows [the working agreement](../../.agents/rules/working-agreement.md#navigation-and-durable-understanding). The two package guides below are the first deeper maps; add another only when repeated exploration demonstrates a need.

- [Application flows](../../packages/application/README.md)
- [Storyteller responsibilities](../../packages/storyteller/README.md)
