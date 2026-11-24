# DB01 | bounded Composer tasks

Base SHA fa77f2d3614ee821b8e4ad849a46a66342000132; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Freeze all table identities | PLANNER-BLOCKED until promotion

Requires: None; Cache foundation independent; coordinate shared manifest joins.
Read: packages/db/src/schema/*.ts; packages/db/src/schema/storyteller.ts; packages/db/test/schema-identity.test.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Create tools/db-migrations private workspace, explicit per-family registry modules auth, story, admin, qa, outbox; import current canonical DB schema exports. Include every table and auth relation; 71 tables from inspected declarations, 20 Writer tables. Move existing schema identity test into tool with unchanged fingerprint; add full-table identity fingerprint and diagnostic missing-table/FK/default change. Canonicalize only stable SQL config fields; render check/default/index SQL with PgDialect, not raw object identity. Capture baseline from pre-extraction schema, never regenerate expected digest to make migration pass.
Verification (root): `pnpm --filter @offscreen/db-migrations build && pnpm --filter @offscreen/db-migrations test`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Move generator composition | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/drizzle.config.ts; packages/db/package.json; scripts/repo-tools/baseline.mjs; infra/kubernetes/lab/dev/dev-sync-paths.mjs.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move Drizzle Kit config/generate script to tools/db-migrations, pinned 0.31.10, explicit registry schema source, out ../../packages/db/migrations resolved from tool cwd. Provide separate check-schema script copies migration dir to mkdtemp, writes temp config inside tool with absolute registry/out paths, runs generator non-interactively, compares all files SHA256, fails on new SQL or modified snapshot/journal, cleanup finally. Never run generator directly in tracked migration dir during proof. Update baseline.mjs filter and dev sync classification/tests for new generator config path; remove old config and generate script. Preserve migrate CLI and migration folder paths.
Verification (root): `pnpm --filter @offscreen/db-migrations check:schema; node --test infra/kubernetes/lab/dev/dev-sync-paths.test.mjs`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T03 | Neutral transaction type and policy vocabulary | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/outbox.ts; packages/db/src/database.ts; packages/db/src/index.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Extract Transaction type to src/transaction/types.ts; export root type; old outbox module reexports until DB05 rewrites callers. Define shared policy types and error/telemetry contracts in src/transaction/policy.ts and src/telemetry/types.ts (see program). No runtime behavior changes. Positive compile existing callers; negative invalid policy/label type tests.
Verification (root): `pnpm --filter @offscreen/db build && pnpm --filter @offscreen/db typecheck`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
