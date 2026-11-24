# DB10 | bounded Composer tasks

Base SHA fa77f2d3614ee821b8e4ad849a46a66342000132; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Enforce final graph | PLANNER-BLOCKED until promotion

Requires: DB02–DB09 integrated; Cache waves joined; authorized disposable proof resources.
Read: scripts/repo-tools/module-graph.mjs; scripts/repo-tools/module-graph.test.mjs; eslint.config.mjs; infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Reject DB domain workspace imports and retired schema subpaths, identity/story schema leaves runtime imports except Drizzle/identity, browser/workflows/SQL-free executor transitive SQL closure. Add fixtures per negative. Reconcile direct manifests, lock, package READMEs/SQL-OWNERSHIP; require no residual old alias. Existing migration asset paths unchanged.
Verification (root): `node --test scripts/repo-tools/module-graph.test.mjs; pnpm repo:module-graph; pnpm exec turbo run build typecheck`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Integrated SQL evidence | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/test/database.integration.ts; packages/db/test/obs00-current-authority.migration.integration.ts; packages/db/test/wr05s-scene-checkpoint-schema.integration.ts; packages/db/test/wr07l-launch-ledger.integration.ts; tools/api-integration/test/stories-core.integration.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Prove disposable migration lock/rollback/hash refusal, managed saturation/recovery, serializable concurrent conflict, rollback/read-only/lock timeout, no duplicated effects. Use owned database test path; no shared tenant or live cluster authorization inferred. Verify zero generated DDL and exact tracked migration bytes. Record actual commands, cases and NOT RUN; DBOPS01/02 retain mixed version and operational proof.
Verification (root): `pnpm --filter @offscreen/db-migrations check:schema; pnpm --filter @offscreen/db test:integration only with DATABASE_TEST_URL explicitly authorized; affected integration fixtures pinned before release`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
