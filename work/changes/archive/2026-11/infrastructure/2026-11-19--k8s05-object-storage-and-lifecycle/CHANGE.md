# K8S05 | Real S3-compatible object storage with persistent testable lifecycle

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** The owner authorized this packet for one executor on branch `change/k8s05-object-storage`. The write set is `infra/kubernetes/lab/object-storage/`, `docs/runbooks/kubernetes-object-storage.md`, and this packet. Queue indexes and platform contracts owned by other agents stay untouched.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [Selected document store](../../../../../../docs/technical/platform/data-and-persistence.md#selected-document-store), [Kubernetes lab](../../../../../../docs/runbooks/kubernetes-lab.md), inspected at `66f82cac`.
>
> **Primary governing contract:** Compose still runs `adobe/s3mock` for the local document adapter. The kind lab gets a separate S3-compatible store. The game is not switched onto it. Object storage is not the story transaction.
>
> **Known trap:** S3 compatibility cannot be asserted from successful container start alone; object storage volume deletion cannot masquerade as durable backup; no automatic production switch.
>
> **Scope/permission:** Infrastructure-only, on the local disposable kind lab. No product code, payment calls, or provider spend. Do not edit topology, deployment, execution, data, storyteller docs, the runbook index, STATUS, ROADMAP, or the changes ledger.

## Target alignment

- **Outcome:** One pinned, maintained S3-compatible store on the disposable kind cluster, with put, get, delete, and a Pod replacement that still reads the object. Compose S3Mock stays the local adapter route.
- **Current-source baseline:** `66f82cac` on branch `change/k8s05-object-storage`. K8S01 and K8S02 are in that history. `compose.yaml` still runs `adobe/s3mock:4.9.1`.
- **End-state relationship:** This is one independently reviewable slice of the educational laboratory. It is not service extraction and not a backup system.
- **Alternative considered:** Keep using Compose S3Mock as the only object store, including for Kubernetes. That mock stays for the game adapter. It does not persist a lab volume across a store Pod deletion, and MinIO pulls are already blocked in this environment. Garage v2.5.0 remains a maintained AGPL-3.0 alternative and was not deployed.
- **Readiness:** The local smoke passed and the cluster was deleted. The observed commands and digest are in [Kubernetes object storage](../../../../../../docs/runbooks/kubernetes-object-storage.md#observed-local-run).

## Outcome and motivation

Replace the idea of using Compose S3Mock as the Kubernetes object store with one documented S3-compatible store. SeaweedFS 4.54 is the selected image. The game process is not pointed at it.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Selected document store](../../../../../../docs/technical/platform/data-and-persistence.md#selected-document-store) stays the game adapter contract. [Current topology](../../../../../../docs/technical/platform/topology.md), [delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), and [execution](../../../../../../docs/technical/platform/execution-and-delivery.md) stay as they are because this executor must not edit them. Another agent is editing the data and storyteller pages.
- **Evidence:** `compose.yaml` S3Mock service and `infra/kubernetes/lab/` from `66f82cac`. No game manifest is applied. No paid provider call.
- **Open decisions:** Production authentication, high availability, capacity, and backup policy stay out of this lab. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** `infra/kubernetes/lab/object-storage/store.yaml`, `infra/kubernetes/lab/object-storage/client.yaml`, and `infra/kubernetes/lab/object-storage/smoke.sh`. One SeaweedFS Deployment, a `local-path` claim, a ClusterIP Service, and a smoke client. Put, get, and delete one object, then delete the store Pod and read a second object back.
- **Documentation:** new `docs/runbooks/kubernetes-object-storage.md`. It records the SeaweedFS choice, the smoke, and the limit that deleting the kind cluster does not preserve local-path data and is not a backup.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets, and edits to `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, storyteller docs, `docs/runbooks/README.md`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/`.
- **Dependencies:** K8S01 kind lab and K8S02 local-path proof in this baseline. The shared cluster lock. SeaweedFS 4.54 must pull.

## Acceptance and discriminating negative proof

- **Normal:** Put, get, and delete one object. Put a second object, delete the store Pod, and get that object back from the replacement Pod on the same claim. Service type ClusterIP. Memory and CPU limits present. Claim class `local-path`.
- **Negative:** S3 compatibility cannot be asserted from successful container start alone. A head of the deleted key must fail. Deleting the kind cluster does not preserve local-path data and is not a backup. No automatic production switch. The smoke must not start the game.
- **Validation:** Commands, the image digest, and results go in `docs/runbooks/kubernetes-object-storage.md` after the smoke. `pnpm wiki:change-guard --mode plan` and `--mode close` run against this open packet before archive. No paid provider call.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab, or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the lab store adds no player-facing behavior in docs/product/foundations/vision.md | docs/product/README.md | Negative: do not treat a service name as a promised feature |
| Technical | unchanged because docs/technical/platform/data-and-persistence.md#selected-document-store stays the game adapter, and this executor must not edit docs/technical/platform/topology.md, docs/technical/platform/deployment-and-compatibility.md, or docs/technical/platform/execution-and-delivery.md. Compose S3Mock remains the local route. | docs/technical/platform/topology.md#distributed-learning-target | The lab proof is the runbook, not a rewrite of those pages |
| Code | changed: infra/kubernetes/lab/object-storage/store.yaml, infra/kubernetes/lab/object-storage/client.yaml, and infra/kubernetes/lab/object-storage/smoke.sh; negative: no application or business code, and a deleted object must not remain readable | compose.yaml, infra/kubernetes/lab/up.sh | Local put/get/delete plus Pod replacement |
| Related | changed: docs/runbooks/kubernetes-object-storage.md records the procedure, the SeaweedFS pin, and the cluster-deletion limit. The runbook index, STATUS.md, and work/changes/README.md are left to the agents that own them. | docs/runbooks/kubernetes-lab.md | Diff-backed evidence after the smoke |

## Handoff and next action

- The smoke passed. This packet is archived under `work/changes/archive/2026-11/other/` after the close guard.
- `work/changes/README.md` still points at the open path. That index is owned by another agent, so this executor does not edit it.
- No successor Change is selected.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/kubernetes-object-storage.md#observed-local-run | Related | changed: the procedure records SeaweedFS 4.54, the ClusterIP Service, the local-path claim, and the smoke that put, got, and deleted an object and then read a second object after Pod deletion | docs/runbooks/kubernetes-object-storage.md and infra/kubernetes/lab/object-storage/smoke.sh against parent 66f82cac | tested | HEAD of the deleted key exited 254 before and after Pod replacement. Container start was not treated as S3 proof. Deleting the kind cluster does not preserve local-path data and is not a backup. | new runbook only |
| docs/runbooks/kubernetes-object-storage.md#recovery-limit | Related | changed: Pod replacement keeps an object on the same claim, and deleting the kind cluster does not preserve local-path data and is not a backup | docs/runbooks/kubernetes-object-storage.md and infra/kubernetes/lab/object-storage/store.yaml against parent 66f82cac | tested | The restart object survived Pod deletion. The run does not claim the object survived cluster deletion. | same runbook |
| docs/technical/platform/data-and-persistence.md#selected-document-store | Technical | unchanged: the game adapter and Compose S3Mock stay in place, and this executor does not edit that page | docs/technical/platform/data-and-persistence.md at 66f82cac | reviewed | The lab Service was not wired to OFFSCREEN_DOCUMENT_STORE. A lab bucket is not a production switch. | no edit |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | unchanged: PostgreSQL stays the durable game record, and this page stays with its owner | docs/technical/platform/data-and-persistence.md at 66f82cac | reviewed | An object in the lab bucket is not a committed story fact | no edit |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | unchanged: the page already says object storage is not the story transaction, and this Change leaves that sentence in place | docs/technical/platform/topology.md at 66f82cac | reviewed | A running lab store is not the deployed game | no edit |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | Technical | unchanged: the hosted release and the educational lab stay separate, and this smoke does not become a hosted deployment | docs/technical/platform/deployment-and-compatibility.md at 66f82cac | reviewed | The cluster was deleted after the smoke. No production claim. | lab procedure stays on the runbook |
| docs/technical/platform/deployment-and-compatibility.md#local-development | Technical | unchanged: Compose remains the local development route, including adobe/s3mock | docs/technical/platform/deployment-and-compatibility.md at 66f82cac | reviewed | The lab Service was not pointed at the game or at Compose | no edit |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged: Temporal and the outbox remain durable delivery. The object store received no workflow work. | docs/technical/platform/execution-and-delivery.md at 66f82cac | reviewed | The smoke started no worker and no Temporal pod | no edit |
| docs/product/foundations/vision.md | Product | unchanged: the lab adds no player-facing mechanic or feature promise | docs/product/foundations/vision.md at 66f82cac | reviewed | A service name is not a new player promise | no edit |
| docs/runbooks/README.md | Related | unchanged: the new procedure is reached from this packet, and the runbook index stays with its owner | docs/runbooks/README.md at 66f82cac | reviewed | The index was not rewritten to put the lab store in the game | no edit |
| STATUS.md#capability-coverage | Related | unchanged: demonstrated game coverage is not this deleted lab, and the status page stays with its owner | STATUS.md at 66f82cac | reviewed | A deleted lab cluster is not a capability-coverage pass | no edit |
| work/changes/README.md | Related | unchanged: the queue index stays with the coordinating agent | work/changes/README.md at 66f82cac | reviewed | This executor did not select a successor Change | inbound open-path link left in place |
