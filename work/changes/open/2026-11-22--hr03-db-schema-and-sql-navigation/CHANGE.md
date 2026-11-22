# HR03 | Readable DB schemas and an honest SQL ownership map

**Profile:** STRUCTURAL/REFACTOR · **Status: READY WITH STRICT ZERO-SCHEMA-DELTA PROOF on inspected `d3ba2917`; recheck current migrations before execution.** Integration `undertaking/storyteller-workshop`. No DB migration, SQL query rewrite, production data mutation or new npm package.

## Important finding

`packages/db/src/schema/storyteller.ts` is **1,240 lines** containing **20 `pgTable` declarations** across unrelated lifecycles: context capture, budget/attempts, run policy, Writer mission/steps and publication. This is a strong human-navigation problem. But the `@offscreen/db` workspace **does not own most business SQL**. SQL/Drizzle manipulations live in Story Engine `stories/{forks,persistence,documents,reads,resolution-core}`, `campaign/{actions,settings,action-executions,persistence}`, and `storyteller/{context-capture,budget,writer-mission-custody,writer-loop,publication}`. Moving those queries into a generic DB repository package would hide **transaction/lock ownership** and risk correctness. Do not do it in a readability Change.

## Chosen schema structure

Keep the exported `@offscreen/db/storyteller-schema` **unchanged**; turn its existing `src/schema/storyteller.ts` into a small explicit export barrel, with the actual declarations in one **nested** directory:
```text
packages/db/src/schema/
  storyteller.ts            # stable existing export path, 20 named exports
  storyteller/
    capture.ts              # publication, context capture/rearm, memory exploration, dispatch review/decision
    funding.ts              # funding, run, operation, attempt, usage allocation
    execution.ts            # retry, prompt provenance, execution stage, saved repair audit
    policy.ts               # current platform policy and owner grant
    writer.ts               # Writer mission, step and child
```
Those five file roles follow actual table references (policy→funding/run, writer→operation/attempt, saved repair→attempt). There is **no schema identity, table/constraint/index/name/order/type/default/nullability or migration change**; preserve all literal builders and foreign-key callbacks. Cross-module imports must form an acyclic graph by moving declarations in the above dependency order. No new schema tables.

**Why nested:** `packages/db/drizzle.config.ts` currently scans `./src/schema/*.ts`, not recursively; only top-level barrel is discovered by the migration generator. Placing individual modules under `schema/storyteller/` avoids accidental duplicate imports from a widened glob. Verify Drizzle sees all 20 exported tables through the barrel and emits identical schema metadata, not merely that TypeScript builds. Keep every `@offscreen/db/storyteller-schema` caller unchanged.

## SQL ownership atlas, not query migration

Add `packages/db/README.md`: `@offscreen/db` owns Pool/Drizzle connection, migrations, table definitions, generic outbox relay and low-level persistence; it **does not decide** campaign authorization, story-state mutation, Writer spend or transaction boundaries. Add a short `packages/story-engine/SQL-OWNERSHIP.md`: link major query writers/reader owners by story/campaign/Writer, where authority transaction begins, where `db.transaction`/advisory locks and lease/CAS code live, what idempotency keys they preserve, and which negative tests establish current behavior. This is a **navigation map from inspected code**, not an unverified “all queries scalable” certification. Use source names, no invented repository abstraction.

**Exclusive writes:** `packages/db/src/schema/storyteller.ts` and new nested `storyteller/*.ts`, `packages/db/README.md`, `packages/story-engine/SQL-OWNERSHIP.md`, and at most one pure test/check script `packages/db/test/schema-identity.test.ts` **only if no existing source comparison mechanism can prove identity**. Do not edit other schema files, SQL migrations/meta journal, DB index/exports/config, Story Engine executable source, host apps, package manifest, auth token schema (CL01), release manifests, or shared lockfile. No new test-per-table proliferation.

**Completion:** the public table export set remains 20 and names/types identical, Drizzle extracted schema metadata and migration snapshot equivalent to baseline, no generated migration difference, all package imports build, existing financial/fork/lease/custody tests remain intact. A developer can find the real operation and transaction owner from one SQL atlas; no claim that moving schema files improves SQL behavior or scale.

[Exact table/coupling map](SOURCE-MAP.md) · [routine implementation tasks](TASKS.md) · [identity/failure proof](PROOF.md).


**Execution-wave coordination:** [HR01–HR03 post-CL01/WR11 wave](../../../undertakings/storyteller-workshop/NEXT-WAVE.md). This packet was promoted from backlog for the next execution window, not retrospectively implemented. Revalidate against the actual post-predecessor undertaking HEAD before starting a linked worktree.
