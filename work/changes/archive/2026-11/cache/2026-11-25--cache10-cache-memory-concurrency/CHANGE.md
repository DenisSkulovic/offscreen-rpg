# CACHE10 | Memory and single-flight readability

**State: Done (source implementation only).** Source proof `pnpm --filter @offscreen/cache test` 106/106 and `pnpm --filter @offscreen/cache typecheck`; live Redis/SQL acceptance remains separately gated under VER07/VER08 and is not claimed here.

Baseline main 9c2c29513a94e1ff6d1ad6a24f9baf939cfc33a6. Integration target main. Profile STANDARD. After CACHE09 source joined. Own memory and single-flight only; CACHE11 can run concurrently after CACHE09. See [source map and wave](../../../../../../undertakings/storyteller-workshop/CACHE-CRAFT.md) and [TASKS](TASKS.md).

## Outcome
Readable and navigable code without changing cache authority, public contracts, wire format, limits or runtime guarantees (CQ06 adds advisory diagnostics only).

## Execution
Dedicated change branch and linked worktree; before edits run node scripts/repo-tools/change-branch-guard.mjs --change CACHE10 --target main. Composer Standard, one bounded T-ID at a time. Parent owns closure, focused proof, changed-file Prettier/quality lint, typecheck, archive/ledger/STATUS reconciliation and squash join under current repository rules. CACHE09 parent coordinates shared joins while active, then remaining parents agree a single custodian before touching shared records; coordinate active INF60/VER parents. No live resources, provider calls, destructive Git or unrelated work. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: docs/technical/platform/persistence-and-caching.md#current-state records CACHE10 memory/single-flight/tier navigation owners without claiming live PASS or new runtime guarantees | work/undertakings/storyteller-workshop/CACHE-CRAFT.md; packages/cache/README.md | source realization only |
| Code | change: weighted LRU and memory store modules, tiered store at src/tiered-store.ts with memory barrel reexport, single-flight scalar activeGenerations and Set waiters; negative: public export keys and behavioral contracts preserved | packages/cache/README.md | fixture-tested package suite 106/106 |
| Related | changed: archive/catalog/ledger/OVERVIEW/UNDERTAKING/CACHE-CRAFT after Done; CACHE11 remains open | work/changes/README.md; work/changes/ledger/2026-11.md | catalog reconciled |

## Diff paths

packages/cache/src/memory/weighted-lru.ts packages/cache/src/memory/memory-store.ts packages/cache/src/memory/index.ts packages/cache/src/tiered-store.ts packages/cache/src/memory/tiered-store.ts packages/cache/src/resilience/single-flight.ts packages/cache/src/bounded-cache.test.ts packages/cache/src/memory-store.test.ts packages/cache/src/single-flight.test.ts packages/cache/README.md docs/technical/platform/persistence-and-caching.md work/undertakings/storyteller-workshop/CACHE-CRAFT.md work/undertakings/storyteller-workshop/OVERVIEW.md work/undertakings/storyteller-workshop/UNDERTAKING.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/cache/2026-11-25--cache10-cache-memory-concurrency/

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| packages/cache public export keys, wire format, limits and runtime guarantees | packages/cache/package.json; packages/cache/README.md | unchanged because CACHE10 is readability and module ownership only; export map and public reexports preserved | packages/cache/src/memory/index.ts packages/cache/src/strategies/index.ts @ 2d7a1671fec57c3b09adde9ec72d34cb625691f9 | fixture-tested (`pnpm --filter @offscreen/cache test` 106/106; typecheck pass) | claiming wire/format/limit changes or live PASS from this Change would be the failure | packages/cache/README.md documents split memory/single-flight/tier owners |
| Memory / tier / single-flight navigation owners | packages/cache/README.md | changed: weighted LRU, memory store and tiered store paths recorded; single-flight remains resilience/single-flight.ts | packages/cache/src/memory/weighted-lru.ts packages/cache/src/memory/memory-store.ts packages/cache/src/tiered-store.ts packages/cache/src/resilience/single-flight.ts @ 2d7a1671fec57c3b09adde9ec72d34cb625691f9 | source-observed + fixture-tested | Redis envelope and cache-adapter owners unchanged (CACHE11) | packages/cache/README.md |
| Live Redis/SQL cache acceptance | docs/technical/platform/verification-programmes.md | unchanged because this Change is source-only and VER07/VER08 own live profiles | no live harness or acceptance behavior changed @ 2d7a1671fec57c3b09adde9ec72d34cb625691f9 | source-observed | claiming live PASS from package fakes would be the failure | N/A |
| Product gameplay/auth/spend | none | unchanged because CACHE10 does not alter player authority or spend | no product-facing behavior changed @ 2d7a1671fec57c3b09adde9ec72d34cb625691f9 | source-observed | no product page rewrite authorized | N/A |

## Acceptance
All selected focused tests pass; retain existing behavioral claims and cache failure safeguards. Review diff for readable phase ownership and no new hidden coupling. Stop on exact contract contradiction, not ordinary dependency order. No live or outcome credit from source tests. Record actual SHA, test commands/counts and negative proof at closure.

**Evidence:** `pnpm --filter @offscreen/cache test` 106/106; `pnpm --filter @offscreen/cache typecheck` PASS; live NOT RUN.