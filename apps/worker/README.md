# Worker: Temporal Activities and durable outbox delivery

## Known limitations and security follow-up

**Zod dependency triage (2026-11-27):** the independent Agent Core E1 review identified `apps/worker/package.json` pinned to 4.6.5 at [5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe](https://github.com/DenisSkulovic/offscreen-rpg/blob/5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe/apps/worker/package.json). The isolated E1 npm audit reported [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), high severity for versions below 4.6.6 (memory exhaustion validating oversized constrained collections); E1 tested 4.6.7 successfully. Worker exposure, actual resolved pnpm dependencies and other affected packages remain untriaged. Prioritize separate repository-wide dependency/exposure triage, targeted compatible upgrades and focused regression checks; do not infer a production exploit or cleared security gate from the isolated experiment. This is not an E1-introduced defect or an authorization to change the Worker in E1. Keep the real security severity and any required exposure gate; update this record after verified resolution.

`@offscreen/worker` connects accepted database notices to Temporal workflows and runs Activity adapters over **application operations**. Workflow timing, outbox delivery and committed business effects are different responsibilities. See the [technical execution contract](../../docs/technical/platform/execution-and-delivery.md). When the question is which record to read before anyone retries, start at [Uncertain work recovery](../../docs/runbooks/uncertain-work-recovery.md). That guide does not change the exact-once fence below.

## Route a failure to its owner

| Question | First source | Continue to |
| --- | --- | --- |
| Who starts/stops Temporal connections and worker processes? | [bootstrap/main.ts](src/bootstrap/main.ts), [runtime/index.ts](src/runtime/index.ts) `startRuntime` | Connection/shutdown under [runtime/connections.ts](src/runtime/connections.ts) |
| Which outbox notice maps to which workflow? | [outbox/dispatch.ts](src/outbox/dispatch.ts) `selectNoticeDispatch`, `deliverOutboxNotice` | [workflow type/ID contracts](../../packages/workflows/src/contracts.ts) |
| What polls and relays committed notices? | [outbox/relay.ts](src/outbox/relay.ts) | the Story Engine outbox owner |
| Where are actual Temporal Activity callbacks? | [activities/index.ts](src/activities/index.ts) `createWorkerActivities` | Application stories/campaign/Storyteller use cases |
| Which component owns timers and replay? | [Workflows package](../../packages/workflows/README.md) | Pure Temporal workflow coordination |
| Why did a provider request not retry? | [Story Engine Storyteller runtime](../../packages/story-engine/README.md) | [Provider dispatch/review contract](../../docs/technical/storyteller/provider-boundary.md) |

## Exact-once business effects vs repeatable delivery

The outbox may deliver a notice again; a Temporal workflow/Activity can be retried after a crash. **Only an application-owned persistent operation ID, expected revision and transaction fence can prevent duplicate game effects.** Do not infer that "Temporal ran once" means the reward or clock was committed once. A model timeout *after dispatch* leaves billability uncertain; it cannot be retried for free.

Importing [runtime/index.ts](src/runtime/index.ts) does not connect automatically. The package scripts include `build`, `typecheck`, `test`, `start` and `dev`. Focused worker tests under [test/](test) cover relay and connection behavior, not every end-to-end failure. The broader QA/trace path is in [code navigation](../../docs/README.md). Do not start workers, enable providers or reset a database as part of routine documentation verification.
