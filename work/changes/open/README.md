# Open Changes | current sprint / execution horizon

## Developer observability | current sprint (2026-11-27)

The owner-released offline Changes are the [observability-developer group](observability-developer/README.md). That index owns the dependency graph and execution status. Independent readiness and changed-authority review remain outstanding. No real cluster or paid operations, constituent main merge, or live certification. [Release and acceptance](../../designs/open/observability-developer/ACCEPTANCE.md#owner-released-offline-source-assembly-not-certification).


[RABBITMQ-NATIVE](2026-11-26--rabbitmq-native/CHANGE.md): owner-accepted R10, source-only commission; live acceptance and join held.

[GATEWAY-NATIVE](2026-11-26--gateway-native-baseline/CHANGE.md): owner-selected local gateway renewal, source-only ready upon dispatch; live and join held. Independent committee waived for this scope. No queue change.

[REDIS-NATIVE](2026-11-26--redis-native-baseline/CHANGE.md): T08a–T08d source corrections implemented on `change/redis-native-baseline-renewal`; isolated lifecycle/fault/idempotency and measured preservation passed; structural integration authorized; residual assurance and canonical cutover open. INF60 cancelled. No queue change.

## Database platform redesign

[Ten prepared Change packets](../README.md#database-platform-redesign) · [Dependency DAG and ownership](../../undertakings/storyteller-workshop/DB-PARALLEL.md). DB01–DB09 are Done source-only and archived. DB10 source scope Done and archived; outstanding live SQL proof transferred to VER04. All new Changes branch from and join main. No further planner promotion for dependency-gated successors. Check predecessor source receipts and active ownership before dispatch. VER04 live SQL proof requires explicit disposable permission. No global queue change.

**Final-wave conditional commission (2026-11-24):** Owner commissioned DO06 and DO07 now. DO06 may execute after DO05 integrates (DO03 already integrated); DO04 need not land first. DO07 may execute only after all six extractions integrate and no live residual module remains. Each assigned parent checks predecessor receipts and exact source/export postconditions on latest undertaking HEAD before editing; if they pass, no further planner release or approval is needed. Genuine semantic contradictions remain stop conditions. Coordinate joins with DO04 wave B custodian while active; otherwise the sole remaining parent owns its join. No global queue change, no new proof or completion credit.

## Cache platform parallel waves

[Full catalog](../README.md#cache-platform-redesign) · [Frozen contracts and ownership](../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). All eight owner-commissioned; DO07 and Documents predecessors verified. CACHE01, CACHE02, CACHE03, CACHE05, CACHE06A, and CACHE06B are Done source-only. CACHE04 source is joined and its SQL suite remains NOT-RUN. CACHE07 source harness is implemented; live proof remains NOT-RUN until explicit disposable local Docker Redis authorization. No further release required when gates pass. No queue change.

## Near-term domain ownership sequence (2026-11-24)

**Wave B release (2026-11-24):** DO01–DO05 integrated source-only. DO04 was the wave B custodian. Wave B is joined. Separate linked worktrees, local lockfiles, no independent undertaking pushes. Shared files: residual contracts manifest, lockfile, ESLint config, graph rules and shared docs; merge by owned keys/rules, regenerate lockfile and run combined affected proofs. No mapped direct consumer file overlap. DO05 must remove its two remaining Storyteller old imports and manifest dependency before adding the transitional reverse edge from residual evaluation. DO04 owns private protocol guard; DO05 owns narrow residual evaluation exception. DO06 and DO07 are integrated source-only. The contracts workspace is removed. No cluster, provider, DB mutation, Documents or CACHE scope.

| Change | Dependency | Status |
| --- | --- | --- |
| [DO01 Cache port](../archive/2026-11/platform-operations/2026-11-24--do01-cache-port/CHANGE.md) | None | Done, source-only |
| [DO02 Admin / identity / usage](../archive/2026-11/platform-operations/2026-11-24--do02-admin-identity-usage/CHANGE.md) | None | Done, source-only |
| [DO03 Story interface](../archive/2026-11/platform-operations/2026-11-24--do03-story-interface/CHANGE.md) | Documents settled | Done, source-only |
| [DO04 Authority protocol](../archive/2026-11/platform-operations/2026-11-24--do04-authority-protocol/CHANGE.md) | DO03 | Done, source-only |
| [DO05 Storyteller / engine](../archive/2026-11/platform-operations/2026-11-24--do05-storyteller-engine-ownership/CHANGE.md) | DO02 + DO03 | Done, source-only |
| [DO06 Lab ownership](../archive/2026-11/platform-operations/2026-11-24--do06-lab-ownership/CHANGE.md) | DO03 + DO05 | Done / source-only |
[Retirement program](../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) · [Parallel execution rules](../../designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md).

**Purpose:** All Changes intended for the current sprint belong here, including Proposed, planner-blocked, dependency-gated, Ready, commissioned, in-progress and acceptance-pending Changes. There is no arbitrary cap on the number of current Changes; keep each Change bounded. A folder in open is not necessarily Ready or automatically commissioned. The one global default selector is [work/QUEUE.md](../../QUEUE.md); explicit owner commissions can exist separately.

[Backlog by domain](../backlog/README.md) · [Change catalog](../README.md) · [Terminal archive](../archive/README.md) · [Storyteller undertaking](../../undertakings/storyteller-workshop/OVERVIEW.md)

## Current / immediate work

**2026-11-23 source-only commissions:** [TURN03-R2C scripted player-smoke composition](../archive/2026-11/storyteller/2026-11-23--turn03-r2c-scripted-smoke-composition/CHANGE.md) is archived Done at injected-trace tier, 9/9. [TURN03-R2D](../archive/2026-11/storyteller/2026-11-23--turn03-r2d-causal-sql-observer/CHANGE.md) is archived Done at injected-query tier, 6/6. Neither produces cross-Pod PASS. R2A and R2B remain archived Done at source-only tier. Parent TURN03 cancelled; legacy operator not commissioned.


**2026-11-23:** [TURN03-R2A secure HTTP transport](../archive/2026-11/storyteller/2026-11-23--turn03-r2a-secure-http-transport/CHANGE.md) is Done as an injected fake-fetch check. It is not a live login or cross-Pod PASS. [TURN03-R2B pinned fixture verifier](../archive/2026-11/storyteller/2026-11-23--turn03-r2b-pinned-fixture-verifier/CHANGE.md) is Done as an injected read-only check. [TURN03-R2D causal SQL observer](../archive/2026-11/storyteller/2026-11-23--turn03-r2d-causal-sql-observer/CHANGE.md) is Done as an injected read-only query check, 6/6. It is not a live database read or cross-Pod PASS. Parent [TURN03](../archive/2026-11/distributed/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) is cancelled (legacy acceptance retired).


| Change | Why it remains open |
| --- | --- |
| [CL01 terminal player](2026-11-22--cl01-terminal-player-client/CHANGE.md) | Historical next-wave dependency; redesign determines current applicability |

## Existing incomplete or terminal-reconciliation obligations

| Change | Why NOT moved to backlog/archive blindly |
| --- | --- |

**Promotion:** move a deferred [backlog](../backlog/README.md) Change here as soon as the owner makes it part of the current execution horizon, even before source/readiness review or commission. Refresh source/dependencies and verify readiness before dispatch. **Retirement:** only verified Done/Cancelled moves to [archive](../archive/README.md) with evidence/ledger. Move unfinished work back to backlog only when genuinely deferred by owner decision, not simply because it is blocked or later in the current sprint.

- [LIB08 bounded local object reads](../archive/2026-11/platform-operations/2026-11-24--lib08-local-object-bounded-read/CHANGE.md): Done, source-only.

## Infrastructure ownership cleanup (INF01–INF05)

Sequential source-only batch; INF01–INF05 Done. Live cluster NOT-RUN. [Plan](../../undertakings/storyteller-workshop/INF-PARALLEL.md).
- [INF01](../archive/2026-11/platform-operations/2026-11-23--inf01-infra-ownership-map/CHANGE.md): Done. Ownership atlas guard; no runtime moves.
- [INF02](../archive/2026-11/platform-operations/2026-11-23--inf02-dev-environment-manager-boundary/CHANGE.md): Done. Dev manager under tools/dev-environments. Live cluster NOT-RUN.
- [INF03](../archive/2026-11/platform-operations/2026-11-23--inf03-application-workload-layout/CHANGE.md): Done. Cluster, workload and environment layout. Live cluster NOT-RUN.
- [INF04](../archive/2026-11/platform-operations/2026-11-23--inf04-image-and-tilt-ownership/CHANGE.md): Done. Image build and Tilt ownership. Live cluster NOT-RUN.
- [INF05](../archive/2026-11/platform-operations/2026-11-23--inf05-platform-and-verification-separation/CHANGE.md): Done. Platform and verification separation. Live cluster NOT-RUN.

- [INF06](../archive/2026-11/platform-operations/2026-11-24--inf06-cluster-foundation-normalization/CHANGE.md): Done. Shared Kind create primitive and explicit release destroy. Live cluster NOT-RUN.

## Unified verification programme (2026-11-25)

[VER01–VER05 execution program](../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [Normative verification contract](../../../docs/technical/platform/verification-programmes.md). [VER01](../archive/2026-11/platform-operations/2026-11-25--ver01-unified-verification-runner/CHANGE.md) source Done (live NOT-RUN). [VER02](../archive/2026-11/platform-operations/2026-11-25--ver02-owned-postgres-verification-resource/CHANGE.md) source Done (live Docker NOT-RUN). [VER03](../archive/2026-11/platform-operations/2026-11-25--ver03-db-admission-workloads/CHANGE.md) source Done (live admission/stress NOT-RUN). [VER06](../archive/2026-11/platform-operations/2026-11-25--ver06-cache-resource-and-harness/CHANGE.md) source Done (owned Redis + harness migration; live Redis NOT-RUN). VER04 and VER05 deferred to platform-operations backlog; no current commission. VER05 retains VER04 source prerequisite. DB work continues; live resources separately authorized. No global queue change.

## Infrastructure reconciliation (2026-11-25)

INF38 deferred to platform backlog. [INF49](../archive/2026-11/platform-operations/2026-11-24--inf49-monitor-composition/CHANGE.md) composition source Done (live install NOT-RUN). [INF50](../archive/2026-11/platform-operations/2026-11-24--inf50-infrastructure-correctness/CHANGE.md) residual regression source Done (live NOT-RUN). [INF47](../archive/2026-11/platform-operations/2026-11-24--inf47-historical-observability-queries/CHANGE.md) historical CLI source Done (live query NOT-RUN). [INF52](../archive/2026-11/platform-operations/2026-11-25--inf52-owned-lifecycle-verification/CHANGE.md) source Done (live NOT-RUN); INF38 gates selective scenarios only. INF29 superseded; residual proof in capability catalog. INF51 archived source-only. INF48 backlog. See [consolidation](../../undertakings/storyteller-workshop/CONSOLIDATION.md). No live permission or global queue change.

## Cache reconciliation (2026-11-25)

Original CACHE01–07 eight Changes archived; CACHE08 source Done and archived. CACHE04/CACHE08 source Done; CACHE07 superseded; live acceptance remains NOT-RUN. [Verification programme](../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md). [VER06](../archive/2026-11/platform-operations/2026-11-25--ver06-cache-resource-and-harness/CHANGE.md) source Done; VER07 and VER08 deferred to platform-operations backlog; no current commission. VER08 retains VER07 source prerequisite and CACHE04 application acceptance obligations. Use `pnpm verify package cache`; no legacy live command, no global queue change.

## Redis infrastructure source wave (2026-11-25)

- [INF58 Redis chart configuration and rollout identity](../archive/2026-11/platform-operations/2026-11-25--inf58-redis-chart-configuration/CHANGE.md) — Done (source); live NOT-RUN.
- [INF59 Redis installer safety and readiness](../archive/2026-11/platform-operations/2026-11-25--inf59-redis-reconciliation-safety/CHANGE.md) — Done (source); live NOT-RUN.

[Decisions and dependency graph](../../undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md). No live authorization or global queue change.

## Cache craftsmanship wave
CACHE09, CACHE10, CACHE11 and CQ06 archived Done (source). CACHE12 held for planner migration; no global queue change.

## Database craftsmanship wave
- DB11 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--db11-db-navigation/CHANGE.md).
- DB12 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--db12-db-transaction-outcomes/CHANGE.md).
- DB13 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--db13-db-migration-runner/CHANGE.md).
No live authorization or queue change; DBOPS01 remains separate.

## Database operations wave
- DBOPS03 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--dbops03-db-operation-catalog/CHANGE.md).
- DBOPS04 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--dbops04-db-operation-ledger/CHANGE.md).
- DBOPS05 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--dbops05-db-batched-operations/CHANGE.md).
- DBOPS06 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--dbops06-schema-change-review/CHANGE.md).
No global queue change or live permission; DBOPS01 metadata and release proof remain separate.

## Temporal infrastructure (2026-11-25)

- INF61 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--inf61-temporal-chart-ownership/CHANGE.md).
- INF62 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--inf62-temporal-bootstrap-verification/CHANGE.md).
- INF63 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--inf63-temporal-explicit-ownership/CHANGE.md).

[Programme and later gates](../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md).

## Temporal corrective wave
- INF70 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--inf70-temporal-sql-authentication/CHANGE.md).
- INF71 archived Done (source): [packet](../archive/2026-11/platform-operations/2026-11-25--inf71-temporal-execution-refusals/CHANGE.md).
