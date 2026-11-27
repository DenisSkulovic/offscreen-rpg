# TD03 | source and claim map

Inspected main `a28693dcefe80a3242a870ed03a6c144b47f1ac7` via frozen original snapshot and documentation-only committed deltas. Source existence and historical proof, not new runtime certification. See exact sections below; all executable source unchanged.

## T01 | Durable authority and record families

Owned current headings / route:

- `docs/technical/platform/data-and-persistence.md`: Data and consistency; PostgreSQL package ownership; Who owns the durable record; Durable records; Interaction contract component; Story snapshot and chronology; Flexible without becoming untyped; Selected document store; Spatial model boundary; Quantities and ownership; Story isolation and indexes; Changes, retention and deletion; Profiled storyteller storage; Proposed service schemas and delivery records; Contract dependencies.

Controlling/current evidence anchors: `packages/db/src/database.ts#createDatabase`; `packages/story-engine/src/stories/scene-checkpoint-v2.ts#assertV2PostStateMatches`; `packages/documents/src/scene-checkpoint-schema.ts`. Selected transformation and negative are fixed in TASKS T01.

## T02 | Cache and independently useful storage

Owned current headings / route:

- `docs/technical/platform/persistence-and-caching.md`: Persistence and caching; Read models; Redis boundary; Package ownership and public API; Identity, consistency and freshness; Stores and serialization; Concurrency and origin protection; Connection lifecycle and resilience; Workload policies; Observability and operations; Current state; Engineering references.

Controlling/current evidence anchors: `packages/cache/src/cache-adapter.ts#createCacheAdapter`; `packages/cache/src/tiered-store.ts#createTieredStore`; `packages/documents/src/library-trie.ts#createLibraryTrieEdit`; `packages/documents/src/s3-store.ts#S3DocumentStore`. Selected transformation and negative are fixed in TASKS T02.

## T03 | Execution and delivery boundaries

Owned current headings / route:

- `docs/technical/platform/execution-and-delivery.md`: Story execution with Temporal; Worker lifecycle safety (OPS12; injected fakes only); Implemented opening flow; Implemented fixed interval; Implemented solo response deadline; Elapsed time and execution cadence; Game-time targets and wake-up projections; Coordination scope; Responsibility at the database boundary; Commands and durable delivery; Commands, business events, and workflows; From decision to consequence; Deadline admission and competing players; Publishing a prepared continuation; Pause, resume and changed intentions; Retry boundaries and uncertain side effects; Storyteller workflow identity; Long-lived execution and deployment; Outages and recovery; Laboratory messaging broker; Contract dependencies.

Controlling/current evidence anchors: `apps/worker/src/activities/index.ts#createWorkerActivities`; `apps/game-authority/src/launch-put.ts#createLaunchPutService`; `docs/technical/engine/chronology-and-activities.md#decisions-with-deadlines`. Selected transformation and negative are fixed in TASKS T03.


## Verified observations and limits

createDatabase returns Drizzle db, managed withClient, transaction via executeManagedTransaction, checkConnection, telemetrySnapshot, close; this is independent source evidence, not admission/SQL live PASS. createLibraryTrieEdit has copy-on-write edit, S3DocumentStore exists; createCacheAdapter and createTieredStore exist. Cache tests redis-store.test.ts, single-flight.test.ts, cache-boundary-regressions.test.ts are source evidence routes, not newly run tests. Existing v1/v2 checkpoint formats and all domain record constraints retained. Worker createWorkerActivities and launch service exist; TURN03 distributed empty-report is NOT-RUN and parent cancelled.

Keep affected typed dependencies and headings stable. Shared architecture/STATUS routes assigned to integration; any further consequential source contradiction is planner-owned, not an executor design decision.
