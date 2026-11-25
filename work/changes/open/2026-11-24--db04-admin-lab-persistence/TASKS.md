# DB04 | bounded Composer tasks

Base SHA 7322b6f1a6df6f5ae612763b9786563dca2989eb; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Move Admin schema | PLANNER-BLOCKED until promotion

Requires: DB03; coordinate DB05 test/import ownership; DB04/05 may overlap only if exact changed files disjoint.
Read: packages/db/src/schema/admin.ts; packages/admin/src/access.ts; packages/admin/src/session.ts; packages/admin/src/case-writes.ts; packages/admin/test/admin-session.test.mjs.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move exact schema to packages/admin/src/persistence/schema.ts; import user/session from identity leaf; internal imports relative, external consumers @offscreen/admin/persistence/schema. Add explicit export and identity direct dep. Registry admin module consumes new export. Delete old DB export/file; preserve staff/actor/session constraints and audit semantics.
Verification (root): `pnpm exec turbo run build typecheck --filter=@offscreen/admin...; pnpm --filter @offscreen/admin test`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Move QA schema | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/schema/qa.ts; packages/lab-support/src/qa-journeys.ts; packages/lab-support/package.json.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move exact QA tables to packages/lab-support/src/persistence/schema.ts, identity FK from leaf, local use relative. External test consumers use explicit lab persistence export. Registry QA module consumes it. Remove residual temporary DB dependency on identity leaf after no declarations import it; do not grant production API lab runtime edge.
Verification (root): `pnpm exec turbo run build typecheck --filter=@offscreen/lab-support...; pnpm --filter @offscreen/db-migrations check:schema`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
