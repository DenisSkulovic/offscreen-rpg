# Workflows: durable Temporal coordination

`@offscreen/workflows` contains deterministic Temporal workflow definitions and stable workflow/signal identity helpers. It schedules and coordinates **application Activities**. It does not read PostgreSQL, call OpenRouter, decide dice/results or publish gameplay state. The [execution contract](../../docs/technical/execution.md) owns intended retry and delivery semantics.

## Find the workflow

| Question | Symbol in [index.ts](src/index.ts) | Companion |
| --- | --- | --- |
| Scripted opening/continuation | `scriptedOpeningV1`, `scriptedContinuationV1` | [worker Activities](../../apps/worker/src/activities/index.ts) |
| Controlled time interval and deadline | `storyIntervalV1`, `storyDecisionV1` | Accepted story state |
| Storyteller generation | `storytellerV1` | Application Storyteller runtime via worker |
| Campaign progress, finite action and result | `campaignActivityV1`, `campaignActionV1`, `campaignConsequenceV1` | Application campaign operations |
| Names, IDs, signals and Activity types | [contracts.ts](src/contracts.ts) | `*WorkflowType`, `*WorkflowId`, `intervalChangedSignal` |

[Outbox dispatch](../../apps/worker/src/outbox/dispatch.ts) maps committed notices to workflow starts/signals. The [worker Activity adapter](../../apps/worker/src/activities/index.ts) delegates real work to application operations; business idempotency must survive duplicate wake-ups and worker restarts. Workflow code itself must stay replay-safe and deterministic.

The package manifest offers `build` and `typecheck`, with **no package-local test script**. A successful compilation is not proof of crash recovery; use a representative [technical execution trace](../../docs/technical/playthroughs/README.md) and application/integration evidence when needed.
