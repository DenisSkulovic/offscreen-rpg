# K8S03 | RabbitMQ operator, durable queue baseline and failure demonstration

**State:** Done  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [deployment contract](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../../../.agents/references/change-work-unit-standard.md), inspected at `a00a5beb6b49`. Reinspected at `b7b7479d` before editing. The write permit for this execution is `infra/kubernetes/lab/rabbitmq/`, `docs/runbooks/kubernetes-rabbitmq.md`, a messaging section in `docs/technical/platform/execution-and-delivery.md`, and this packet.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** A consumer crash must not silently become proof of exactly-once effects; single broker must not be labeled high availability; no default guest/public credentials.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** Runnable broker with declarative users, queues and reproducible publish/consume smoke; distinguish at-least-once delivery from processing exactly once.
- **Current-source baseline:** `a00a5beb6b49` from GitHub on 2026-11-19 and repo source owners above; tools/versions and actual machine state require reinspection.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** Done after the 2026-11-19 kind smoke. The packet was Ready before that proof.

## Outcome and motivation

Runnable broker with declarative users, queues and reproducible publish/consume smoke; distinguish at-least-once delivery from processing exactly once.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../../../docs/technical/platform/topology.md), [delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Deploy pinned RabbitMQ operator and one-instance broker in messaging namespace; durable quorum semantics only when cluster size and safety permit, otherwise explicitly label single-node limitation. Test publish/ack/nack, consumer crash/redelivery, readiness, credentials and metrics. No game integration.
- **Documentation (first class):** Create messaging technical contract under docs/technical/platform or extend execution-and-delivery; record producer/consumer responsibility and limits; link from platform index.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** K8S01, ARCH01; resource budget after PostgreSQL.

## Acceptance and discriminating negative proof

- **Normal:** Run ordered IDs through durable queue; kill consumer before ack; demonstrate redelivery and duplicate-handling requirement; broker outage behavior documented.
- **Negative:** A consumer crash must not silently become proof of exactly-once effects; single broker must not be labeled high availability; no default guest/public credentials.
- **Validation:** Capture commands/outputs, actual versions and resources; reproducible smoke and teardown tests; before/after authoritative claim inventory; doc link/anchor health and `pnpm wiki:change-guard --mode plan` / `--mode close` when applicable. Never invent green results.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in `docs/product/foundations/vision.md` | `docs/product/README.md` | Negative: do not treat a service name as promised feature |
| Technical | changed: `docs/technical/platform/execution-and-delivery.md#laboratory-messaging-broker` records the single-broker lab limit. `docs/technical/platform/topology.md` and `docs/technical/platform/deployment-and-compatibility.md` stay with their owners. | `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/topology.md` | Source and safe proof from this packet |
| Code | changed: `infra/kubernetes/lab/rabbitmq/` installs one broker and a smoke that must reject a guest login. Negative: a consumer crash must not count as exactly-once effects, and one replica must not be labeled high availability. | `compose.yaml`, `infra/kubernetes/lab/up.sh` | Controlled local smoke + failure test |
| Related | changed: `docs/runbooks/kubernetes-rabbitmq.md` is the lab procedure. Index pages outside this write permit stay in place. | `docs/runbooks/kubernetes-lab.md` | Diff-backed evidence, link health |

## Document shape | shape-ops.v1

| Operation | Path | Unique meaning conserved | Heading migration |
| --- | --- | --- | --- |
| CREATE | `docs/runbooks/kubernetes-rabbitmq.md` | The runbook is the lab procedure for one broker. A broker message is not a committed story fact, a consumer crash is not exactly-once processing, and one replica is not high availability. | none |

## Handoff and next action

- Selection: the owner authorized this packet on branch `change/k8s03-rabbitmq`. `work/changes/README.md` stays with another owner, so Current change is not edited here.
- Executor: inspect current source, identify precise ownership, validate budget and guards; implement only this Change; review docs in same diff.
- Stop on any conflict with game authority, unsafe persistence, unsupported software or unverified version.
- After the 2026-11-19 proof, the ledger below is filled. Archive under `work/changes/archive/2026-11/other/` after close, and fix this packet's own relative links. `work/changes/README.md` stays with another owner.

## Diff paths

- `docs/runbooks/kubernetes-rabbitmq.md`
- `docs/technical/platform/execution-and-delivery.md`
- `infra/kubernetes/lab/rabbitmq/README.md`
- `infra/kubernetes/lab/rabbitmq/amqp_smoke.py`
- `infra/kubernetes/lab/rabbitmq/broker.yaml`
- `infra/kubernetes/lab/rabbitmq/definitions.json`
- `infra/kubernetes/lab/rabbitmq/install.sh`
- `infra/kubernetes/lab/rabbitmq/namespace.yaml`
- `infra/kubernetes/lab/rabbitmq/smoke.sh`
- `infra/kubernetes/lab/rabbitmq/vendor/cert-manager-v1.21.3.yaml`
- `infra/kubernetes/lab/rabbitmq/vendor/cluster-operator-v2.23.3.yml`

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/platform/execution-and-delivery.md#laboratory-messaging-broker` | Technical | changed: one RabbitMQ 4.3.4 replica in namespace messaging, at-least-once delivery, and a broker message is not a committed story fact | `infra/kubernetes/lab/rabbitmq/broker.yaml` and `infra/kubernetes/lab/rabbitmq/smoke.sh`, baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | live-observed | Guest from another pod printed GUEST-DENIED reset. DRAIN 2 redelivered=1, so the crash is not exactly-once. Replicas stayed 1, so this is not high availability. | `docs/runbooks/kubernetes-rabbitmq.md` links the heading. `docs/technical/README.md` was left in place. |
| `docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery` | Technical | unchanged: the game bridge stays the PostgreSQL outbox relay to Temporal, and that section still says no queue product is needed for the bridge | `docs/technical/platform/execution-and-delivery.md` at baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | source-observed | The smoke publishes lab payloads 1, 2, and 3. It does not publish a story command. | N/A |
| `docs/technical/platform/topology.md#distributed-learning-target` | Technical | unchanged: this packet does not edit that page. Its sentence that RabbitMQ remains unbuilt is now stale for the laboratory broker and stays with the page owner. The application still has no broker. | `docs/technical/platform/topology.md` at baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | source-observed | A running lab broker does not make Kubernetes or RabbitMQ the deployed game. | N/A |
| `docs/technical/platform/topology.md#what-handles-events-and-background-work` | Technical | unchanged: the application still has no separate event broker, and a laboratory broker message is still not a committed story fact | `docs/technical/platform/topology.md` at baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | source-observed | The smoke does not attach Temporal or the outbox to `lab.durable`. | N/A |
| `docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment` | Technical | unchanged: this laboratory procedure is not the first hosted deployment | `docs/technical/platform/deployment-and-compatibility.md` at baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | source-observed | The kind cluster was deleted after the smoke. That run does not satisfy the hosted release. | N/A |
| `docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension` | Technical | unchanged: practicing a local broker does not mean the game is deployed on Kubernetes | `docs/technical/platform/deployment-and-compatibility.md` at baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | source-observed | Service type stayed ClusterIP on 127.0.0.1:6443. No NodePort or LoadBalancer was created. | N/A |
| `docs/product/foundations/vision.md#what-this-page-selects` | Product | unchanged: the lab adds no player-facing behavior | `docs/product/foundations/vision.md` at baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e`; no source behavior changed for product | source-observed | A broker user name is not a promised mechanic. | N/A |
| `docs/runbooks/kubernetes-rabbitmq.md#observed-local-run` | Related | changed: the runbook records the install, the smoke, and the 2026-11-19 observed lines | `docs/runbooks/kubernetes-rabbitmq.md` and `infra/kubernetes/lab/rabbitmq/smoke.sh`, baseline `b7b7479d22a28e2b07a731693f658327c2b58a4e` | live-observed | The observed run states one replica and redelivered=1. It does not claim exactly-once processing or high availability. | `work/changes/README.md` still links this open packet and was not edited. `docs/runbooks/README.md` was not edited. |
