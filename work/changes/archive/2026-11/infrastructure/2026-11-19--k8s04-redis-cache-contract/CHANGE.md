# K8S04 | Redis disposable cache on Kubernetes with explicit loss behavior

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** The owner authorized this packet for one executor on branch `change/k8s04-redis`. The write set is the lab Redis manifests, `docs/runbooks/kubernetes-redis.md`, the Redis boundary, and this packet. Queue indexes owned by other agents stay untouched.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [Redis boundary](../../../../../../docs/technical/platform/persistence-and-caching.md#redis-boundary), [Kubernetes lab](../../../../../../docs/runbooks/kubernetes-lab.md), inspected at `b7b7479d`.
>
> **Primary governing contract:** Redis is optional acceleration. PostgreSQL remains the authoritative record. The lab instance is not the game and is not a durable workflow or payment lock.
>
> **Known trap:** Restart/flush must never be interpreted as loss of authoritative game state; no passwords embedded in committed files.
>
> **Scope/permission:** Infrastructure-only, on the local disposable kind lab. No product code, payment calls, or provider spend. Do not edit topology, deployment, execution, data, the technical or runbook indexes, STATUS, ROADMAP, or the changes ledger.

## Target alignment

- **Outcome:** Redis available as optional acceleration, with the application database remaining the authoritative state.
- **Current-source baseline:** `b7b7479d` on branch `change/k8s04-redis`. The kind lab from K8S01 is already in that commit. Compose Redis is the same image tag, with snapshots and the append-only file disabled.
- **End-state relationship:** This is one independently reviewable slice of the educational laboratory: one ClusterIP Redis with a cap, a probe, and a loss smoke. It is not service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route.
- **Readiness:** The local smoke passed and the cluster was deleted. The observed commands are in [Kubernetes Redis](../../../../../../docs/runbooks/kubernetes-redis.md#observed-local-run).

## Outcome and motivation

One disposable Redis on the kind cluster, with a nonpublic Service, resource caps, and a health probe. The smoke shows TTL expiry, flush, and connection loss. A restart or flush is a cache miss, not a lost story.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Redis boundary](../../../../../../docs/technical/platform/persistence-and-caching.md#redis-boundary) is the cache rule this Change edits. [Current topology](../../../../../../docs/technical/platform/topology.md) already says Redis is not application authority. [Delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../../../docs/technical/platform/data-and-persistence.md), and [execution](../../../../../../docs/technical/platform/execution-and-delivery.md) stay as they are because other agents own those pages.
- **Evidence:** `compose.yaml` Redis service and `infra/kubernetes/lab/` from `b7b7479d`. No game manifest was applied. No paid provider call.
- **Open decisions:** Production authentication, high availability, and capacity stay out of this lab. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** `infra/kubernetes/lab/redis/redis.yaml`, `infra/kubernetes/lab/redis/client.yaml`, and `infra/kubernetes/lab/redis/smoke.sh`. One Redis Deployment, ClusterIP Service, resource caps, and `redis-cli ping`. Smoke TTL, flush, and connection loss. Do not use Redis for durable workflows or payment locks.
- **Documentation:** `docs/technical/platform/persistence-and-caching.md#redis-boundary` and new `docs/runbooks/kubernetes-redis.md`. The boundary states that a restart or flush is not loss of authoritative game state.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets, and edits to `docs/technical/README.md`, `docs/runbooks/README.md`, `docs/technical/platform/topology.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/deployment-and-compatibility.md`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/`.
- **Dependencies:** K8S01 kind lab in this baseline; available memory. ARCH01's cache rule is already on the Redis boundary.

## Acceptance and discriminating negative proof

- **Normal:** Set/get/expiry, deliberate flush, and a connection loss while the only pod is scaled to zero, then recovery with a cache miss. Service type ClusterIP. Memory and CPU limits present. Liveness probe is `redis-cli ping`.
- **Negative:** Restart/flush must never be interpreted as loss of authoritative game state; no passwords embedded in committed files. The smoke must not start a game, PostgreSQL, Temporal, or a worker. A key that survives restart fails the smoke.
- **Validation:** Commands, versions, and results are in `docs/runbooks/kubernetes-redis.md`. `pnpm wiki:change-guard --mode plan` and `--mode close` are run against this open packet before archive. No paid provider call.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab, or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in docs/product/foundations/vision.md | docs/product/README.md | Negative: do not treat a service name as a promised feature |
| Technical | changed: docs/technical/platform/persistence-and-caching.md#redis-boundary now says a restart, flush, or lost connection drops cache entries only, and that Redis is not a durable workflow store or a payment lock. The lab Service is ClusterIP acceleration and is not wired to the game. | docs/technical/platform/topology.md, docs/technical/platform/data-and-persistence.md, docs/technical/platform/execution-and-delivery.md, docs/technical/platform/deployment-and-compatibility.md | Those pages stay in place. Their existing sentences already keep PostgreSQL and Temporal as the record. |
| Code | changed: infra/kubernetes/lab/redis/redis.yaml, infra/kubernetes/lab/redis/client.yaml, and infra/kubernetes/lab/redis/smoke.sh; negative: no application or business code, and a key must not survive flush or restart | compose.yaml, infra/kubernetes/lab/up.sh | Local smoke plus the connection-loss failure |
| Related | changed: docs/runbooks/kubernetes-redis.md records the procedure and the smoke. The runbook index, STATUS.md, and work/changes/README.md are left to the agents that own them. | docs/runbooks/kubernetes-lab.md | Diff-backed evidence after the smoke |

## Handoff and next action

- The smoke passed. This packet is archived under `work/changes/archive/2026-11/other/` after the close guard.
- `work/changes/README.md` still points at the open path. That index is owned by another agent, so this executor does not edit it.
- No successor Change is selected.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | Technical | changed: a restart, flush, or lost connection drops cache entries only, and Redis is not a durable workflow store or a payment lock. The lab process is ClusterIP acceleration and is not wired to the game. | docs/technical/platform/persistence-and-caching.md and infra/kubernetes/lab/redis/redis.yaml and infra/kubernetes/lab/redis/smoke.sh against parent b7b7479d | tested | GET after TTL, FLUSHALL, and pod replacement was empty. The manifest has no authentication material. A missing key is a cache miss, not a lost story. | docs/runbooks/kubernetes-redis.md#observed-local-run |
| docs/runbooks/kubernetes-redis.md#observed-local-run | Related | changed: the procedure records one ClusterIP Redis, the caps, the ping probe, and the local smoke that passed after image import | docs/runbooks/kubernetes-redis.md and infra/kubernetes/lab/redis/smoke.sh against parent b7b7479d | tested | The first kind-load attempt failed before Redis existed and was not recorded as success. No game pod was started. | linked from docs/technical/platform/persistence-and-caching.md#redis-boundary |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | unchanged: the page already says Redis is not application authority, and this Change leaves that sentence in place | docs/technical/platform/topology.md at b7b7479d | reviewed | A running lab Redis is not the deployed game | existing link to the Redis boundary |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | Technical | unchanged: the hosted release and the educational lab stay separate, and this smoke does not become a hosted deployment | docs/technical/platform/deployment-and-compatibility.md at b7b7479d | reviewed | The cluster was deleted after the smoke. No production claim. | lab procedure stays on the runbook |
| docs/technical/platform/deployment-and-compatibility.md#local-development | Technical | unchanged: Compose remains the local development route and Redis stays optional there | docs/technical/platform/deployment-and-compatibility.md at b7b7479d | reviewed | The lab Service was not pointed at the game or at Compose | no edit |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | unchanged: caches stay delegated to the Redis boundary and SQL stays the record | docs/technical/platform/data-and-persistence.md at b7b7479d | reviewed | A flush was not recorded as a lost story | existing cache row |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged: Temporal and the outbox remain durable delivery. Redis received no workflow or payment work. | docs/technical/platform/execution-and-delivery.md at b7b7479d | reviewed | The smoke started no worker and no Temporal pod | no edit |
| docs/product/foundations/vision.md | Product | unchanged: the lab adds no player-facing mechanic or feature promise | docs/product/foundations/vision.md at b7b7479d | reviewed | A service name is not a new player promise | no edit |
| docs/technical/README.md#technical-contracts | Related | unchanged: the cache question still says optional acceleration and PostgreSQL remains the record | docs/technical/README.md at b7b7479d | reviewed | The index was not edited into a player feature | existing question link |
| docs/runbooks/README.md | Related | unchanged: the new procedure is reached from the Redis boundary, and the runbook index stays with its owner | docs/runbooks/README.md at b7b7479d | reviewed | The index was not rewritten to put Redis in the game | boundary link only |
| docs/runbooks/release-restore-readiness.md#checklist | Related | unchanged: counting Redis in a consistent recovery set stays explicitly blocked | docs/runbooks/release-restore-readiness.md at b7b7479d | reviewed | A cache flush is not a restore of the story | existing checklist row |
| docs/decisions/README.md#locator | Related | unchanged: the locator still points at the Redis boundary and this Change adds no ADR | docs/decisions/README.md at b7b7479d | reviewed | A lab manifest is not a new decision record | no edit |
| STATUS.md#capability-coverage | Related | unchanged: demonstrated game coverage is not this deleted lab, and the status page stays with its owner | STATUS.md at b7b7479d | reviewed | A deleted lab cluster is not a capability-coverage pass | no edit |
| work/changes/README.md | Related | unchanged: the queue index stays with the coordinating agent | work/changes/README.md at b7b7479d | reviewed | This executor did not select a successor Change | inbound open-path link left in place |
