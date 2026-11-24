# DB05 | bounded Composer tasks

Base SHA fa77f2d3614ee821b8e4ad849a46a66342000132; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Move delivery store | PLANNER-BLOCKED until promotion

Requires: DB03 and DB01 Transaction export; DB04 disjoint ownership or serialized after it.
Read: packages/db/src/schema/outbox.ts; packages/db/src/outbox.ts; packages/db/src/outbox-relay.ts; apps/worker/src/outbox/relay.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Create @offscreen/outbox with schema, enqueue, relay subpaths; move exact implementations; Transaction imported from @offscreen/db root. Keep notice identity conflict, SKIP LOCKED order, clock_timestamp lease, 30s expiry, token-fenced acknowledge. Update registry outbox module. No new delivery topics or timing changes.
Verification (root): `pnpm --filter @offscreen/outbox build`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Migrate delivery and transaction consumers | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/story-engine/src/stories/continuation.ts; packages/story-engine/src/storyteller/launch-admission.ts; packages/lab-support/src/chamber.ts; tools/api-integration/legacy-engine-tests/ma05b-outbox-compat.test.mjs.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move all type-only Transaction imports to DB root, runtime enqueue/Notice to @offscreen/outbox/enqueue, relay to /relay, table to /schema. For mixed import split exactly; update direct manifests. Remove DB outbox aliases and files. Consumer inventory pinned before release. Existing SQL behavior remains byte-equivalent except imports.
Verification (root): `pnpm exec turbo run build typecheck --filter=@offscreen/outbox...; node --test tools/api-integration/legacy-engine-tests/ma05b-outbox-compat.test.mjs after affected build; pnpm --filter @offscreen/db-migrations check:schema`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
