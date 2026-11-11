# Worker: Temporal Activities and durable outbox delivery

`@offscreen/worker` connects accepted database notices to Temporal workflows and runs Activity adapters over **application operations**. Workflow timing, outbox delivery and committed business effects are different responsibilities. See the [technical execution contract](../../docs/technical/execution.md).

## Route a failure to its owner

| Question | First source | Continue to |
| --- | --- | --- |
| Who starts/stops Temporal connections and worker processes? | [bootstrap/main.ts](src/bootstrap/main.ts), [runtime/index.ts](src/runtime/index.ts) `startRuntime` | Connection/shutdown under [runtime/connections.ts](src/runtime/connections.ts) |
| Which outbox notice maps to which workflow? | [outbox/dispatch.ts](src/outbox/dispatch.ts) `selectNoticeDispatch`, `deliverOutboxNotice` | [workflow type/ID contracts](../../packages/workflows/src/contracts.ts) |
| What polls and relays committed notices? | [outbox/relay.ts](src/outbox/relay.ts) | `@offscreen/application/outbox` |
| Where are actual Temporal Activity callbacks? | [activities/index.ts](src/activities/index.ts) `createWorkerActivities` | Application stories/campaign/Storyteller use cases |
| Which component owns timers and replay? | [Workflows package](../../packages/workflows/README.md) | Pure Temporal workflow coordination |
| Why did a provider request not retry? | [Storyteller application](../../packages/application/README.md) | [Provider dispatch/review contract](../../docs/technical/provider-dispatch-review.md) |

## Exact-once business effects vs repeatable delivery

The outbox may deliver a notice again; a Temporal workflow/Activity can be retried after a crash. **Only an application-owned persistent operation ID, expected revision and transaction fence can prevent duplicate game effects.** Do not infer that "Temporal ran once" means the reward or clock was committed once. A model timeout *after dispatch* leaves billability uncertain; it cannot be retried for free.

Importing [runtime/index.ts](src/runtime/index.ts) does not connect automatically. The package scripts include `build`, `typecheck`, `test`, `start` and `dev`. Focused worker tests under [test/](test/) cover relay and connection behavior, not every end-to-end failure. The broader QA/trace path is in [code navigation](../../docs/engineering/code-navigation.md). Do not start workers, enable providers or reset a database as part of routine documentation verification.
