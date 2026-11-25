# Unified verification programme | first DB wave

Baseline 0c45ae7318295398d706511b9d702720a55c8a92 (DB03/07 archived; DB04/05/09/10 outstanding). Owner-selected 2026-11-25. [Normative contract](../../../docs/technical/platform/verification-programmes.md). Do not interrupt current DB implementation. New source-only Changes are commissioned; live runs separately authorized. Current target main.

| Change | Gate | Outcome |
| --- | --- | --- |
| [VER01](../../changes/open/2026-11-25--ver01-unified-verification-runner/CHANGE.md) | None; coordinate shared root package.json / pnpm-lock.yaml joins with active DB/infra parents. | Unified verification entrypoint and evidence runner |
| [VER02](../../changes/open/2026-11-25--ver02-owned-postgres-verification-resource/CHANGE.md) | VER01 joined; can implement while DB03–10 continue; no DB runtime API changes. | Disposable PostgreSQL resource adapter |
| [VER03](../../changes/open/2026-11-25--ver03-db-admission-workloads/CHANGE.md) | VER02 joined; DB07 joined (verified); DB09 not required for core assertions, telemetry-specific sections wait DB09. | DB programme: admission, pressure and process isolation |
| [VER04](../../changes/open/2026-11-25--ver04-db-transaction-migration-recovery-programme/CHANGE.md) | VER03 joined; DB09 source joined for telemetry/helpers; DB10 component source tests available on main (live acceptance not prerequisite). | DB programme: transactions, migration, telemetry and recovery |
| [VER05](../../changes/open/2026-11-25--ver05-db-replicated-topology-programme/CHANGE.md) | VER02/03/04 source joined. Requires verified local dev Kind and pinned CNPG operator already installed for live; no operator changes. | DB programme: replicated and independent PostgreSQL topologies |

VER01→VER02→VER03→VER04→VER05. No unnecessary parallel runner/resource edits: one verification lane while DB lane proceeds. VER01 owns root verify key and new tooling manifest; VER02 pg dependency; VER03 DB/drizzle dependencies; serial lockfile joins. DB10 remains graph/component owner, VER04 reuses compiled DB10 component tests on fresh disposable resource, live DB10 acceptance can consume verified report. INF51 owns existing infra diagnostic/provisioning, not overwritten; VER01 adapter only. Cache/other packages/apps follow same pattern later, not commissioned now.

## Source review
Inspected current main DB07 public database.ts, transaction/execute.ts, errors.ts, admission.ts and managed-client.ts; registry, actual component test and DB10 packet; existing infra diagnostic-engine, verify CLI, provisioning, CNPG pin/render/installer and readiness. Prior ZIP source baseline d08e36d used for untouched workspace paths, current main rechecked for critical seams. No code or live experiment run by planner. DB07 current COMMIT error handling and setup rollback risk are intentionally explicit experiment targets, not silent claims. Existing infra diagnostic is read-only observation, not acceptance. Current CNPG chart fixed instances=1; topology resource isolated and validated, not a change to deployment defaults.

## Evidence and lifecycle
Permanent coverage manifest/report and reusable CLI outlive Changes. Source fixtures can be joined before live proof but do not mark live guarantees Done. Required first DB acceptance report must show standard, stress, recovery, topology outcomes individually, actual resource topology and cleanup. Missing live environment remains NOT-RUN/BLOCKED. Owner may run sections repeatedly. No new global queue selection, no overall outcome percentage credit for planning. 
