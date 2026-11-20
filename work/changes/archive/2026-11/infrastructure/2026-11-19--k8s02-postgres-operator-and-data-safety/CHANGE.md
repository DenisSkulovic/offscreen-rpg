# K8S02 | CloudNativePG single-primary deployment with durable storage and recovery proof

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [deployment contract](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../../../.agents/references/change-work-unit-standard.md), reinspected at `4962e373` before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** Deleting a Pod does not delete committed row; deleting cluster does NOT claim to preserve local-path volumes; no secrets in Git or unguarded destroy.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** CloudNativePG-managed isolated application PostgreSQL survives an ordinary Pod replacement; documented data lifecycle and recovery boundaries.
- **Current-source baseline:** Reinspected at `4962e373` on branch `change/k8s02-cnpg`. ARCH01 and K8S01 are Done. The game remains on Compose.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** Authorized for this worktree only. One primary, local-path storage, and a Pod-replacement smoke. Not a game-database migration and not a three-replica claim.

## Outcome and motivation

CloudNativePG-managed isolated application PostgreSQL survives an ordinary Pod replacement; documented data lifecycle and recovery boundaries.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../../../docs/technical/platform/topology.md), [delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Pin CloudNativePG in `infra/kubernetes/lab/cnpg/operator.pin`, `infra/kubernetes/lab/cnpg/install.sh`, `infra/kubernetes/lab/cnpg/namespace.yaml`, `infra/kubernetes/lab/cnpg/cluster.yaml`, and `infra/kubernetes/lab/cnpg/smoke.sh`. One instance in `lab-postgres`, `local-path` storage, and resource requests and limits that fit this machine. Credentials are generated at runtime and are not stored in Git.
- **Documentation (first class):** CREATE `docs/runbooks/kubernetes-postgres.md` and link it from `docs/runbooks/README.md`. Add `docs/technical/platform/deployment-and-compatibility.md#disposable-cloudnativepg-proof`. The data-lifecycle statement stays in the runbook. This packet does not edit `docs/technical/platform/topology.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/README.md`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, or `work/changes/ledger/`.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** K8S01; ARCH01 storage contract; backup/destroy semantics agreed.

## Acceptance and discriminating negative proof

- **Normal:** Insert test row, kill/recreate DB Pod, read back; capture PVC lifecycle; simulate missing volume in disposable test and distinguish backup restore from replica recovery.
- **Negative:** Deleting a Pod does not delete committed row; deleting cluster does NOT claim to preserve local-path volumes; no secrets in Git or unguarded destroy.
- **Validation:** Capture commands/outputs, actual versions and resources; reproducible smoke and teardown tests; before/after authoritative claim inventory; doc link/anchor health and `pnpm wiki:change-guard --mode plan` / `--mode close` when applicable. Never invent green results.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in `docs/product/foundations/vision.md` | `docs/product/README.md` | Negative: do not treat a database operator as a promised feature |
| Technical | changed: `docs/technical/platform/deployment-and-compatibility.md#disposable-cloudnativepg-proof` records this disposable single-primary proof and its recovery limit | `docs/technical/platform/topology.md#distributed-learning-target`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md` | Pod replacement keeps a committed row. Cluster deletion does not keep local-path volumes. |
| Code | changed: `infra/kubernetes/lab/cnpg/install.sh`, `infra/kubernetes/lab/cnpg/smoke.sh`, `infra/kubernetes/lab/cnpg/cluster.yaml`, `infra/kubernetes/lab/cnpg/namespace.yaml`, and `infra/kubernetes/lab/cnpg/operator.pin`. Negative: no game migration, no three-replica claim, and no credential file in Git | `compose.yaml` | Local kind smoke plus deletion of the primary Pod |
| Related | changed: CREATE `docs/runbooks/kubernetes-postgres.md` and link it from `docs/runbooks/README.md` | `docs/runbooks/kubernetes-lab.md` | Data lifecycle stays in the new runbook |

## Handoff and next action

- Proof and ledger are complete on baseline `4962e373`. Archive this packet under `work/changes/archive/2026-11/other/`.
- No successor is selected.

## Checks actually run

- `infra/kubernetes/lab/up.sh` created `offscreen-lab`. Both nodes became Ready. The API published `127.0.0.1:6443` only. MemAvailable was 9795972 KiB before create and 9443480 KiB after.
- `infra/kubernetes/lab/cnpg/install.sh` checked SHA-256 `ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c`, applied CloudNativePG 1.30.2, and reached `Cluster in healthy state` for `lab-pg` with `instances: 1`. The operator image was `ghcr.io/cloudnative-pg/cloudnative-pg:1.30.2`. The operand image was `ghcr.io/cloudnative-pg/postgresql:18.7-system-trixie`. Claim `lab-pg-1` was Bound on `local-path`.
- `infra/kubernetes/lab/cnpg/smoke.sh` committed `pod-replace-ok`, deleted Pod `lab-pg-1`, and read `pod-replace-ok` back. Pod uid changed from `53f42a09-0b94-4156-b8bf-53dff7984370` to `89f7ea2f-2fe6-431a-8ee2-103368c9954e`. PVC uid stayed `e9db926f-d183-476e-b714-906503d9d3a0`. Server version was `18.7 (Debian 18.7-1.pgdg13+2)`. Postgres limits were 500m CPU and 768Mi memory. MemAvailable during the smoke was 8893884 KiB.
- kubectl client v1.37.2, server v1.37.0, kind v0.33.0, Docker 29.9.3. Release 1.30.2 lists Kubernetes 1.34 through 1.36. This node is v1.37.0, and the operator became ready anyway. That does not extend the published support list.
- Services `lab-pg-rw`, `lab-pg-ro`, and `lab-pg-r` were ClusterIP. Secret names `lab-pg-app`, `lab-pg-ca`, `lab-pg-replication`, and `lab-pg-server` existed in `lab-postgres`. Their values were not printed. No credential was written under `infra/kubernetes/lab/cnpg/`.
- `infra/kubernetes/lab/down.sh` deleted `offscreen-lab`. `kind get clusters` reported no clusters. `kubectl config get-contexts` printed nothing. No `offscreen-lab` container remained.
- After delete, `docker volume inspect` still found `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`, plus anonymous volume `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`. MemTotal stayed 12249872 kB. MemAvailable was 9963180 kB.
- `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-19--k8s02-postgres-operator-and-data-safety` returned ok with no findings. `pnpm wiki:change-guard --mode close --base 4962e373` returned ok. Close also reported citation-candidate warnings for pages that already link to the deployment page or the runbook index. Those pages were not edited. No forbidden canonical file was taken.
- No model call. No game package was edited. `compose.yaml` was not edited. `docs/technical/platform/topology.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/README.md`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/` were not edited.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/deployment-and-compatibility.md#disposable-cloudnativepg-proof | Technical | changed: the laboratory subsection now records one local primary, and that a Pod deletion keeps a committed row while a kind deletion drops local-path volumes | infra/kubernetes/lab/cnpg/smoke.sh and infra/kubernetes/lab/cnpg/cluster.yaml; inspected compose.yaml at 4962e373 | fixture-tested | Instances stayed 1. Deleting the kind cluster is not a backup or a restore | Points at docs/runbooks/kubernetes-postgres.md#recovery-limit |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | Technical | unchanged: hosted-release advice and the kind procedure stay. The new proof is the subsection under this section | no source behavior changed in the game; inspected compose.yaml at 4962e373 | reviewed | The kind cluster still does not satisfy the hosted release | No new claim on that heading |
| docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | Technical | unchanged: the hosted release still requires managed PostgreSQL and a demonstrated restore | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | The deleted kind primary is not that restore | No new claim on that heading |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | unchanged: this packet leaves the laboratory table with its other owner. The runbook holds the pod-replacement proof | no source behavior changed in the game; inspected compose.yaml at 4962e373 | reviewed | This packet does not claim three replicas and does not rewrite that table | No edit by this packet |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | unchanged: PostgreSQL still owns committed story state. The lab lifecycle is in the Postgres runbook | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | The marker row is not a story record, and cluster deletion is not a game-database backup | No edit |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged: the game outbox and Temporal delivery were not replaced by this primary | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | lab-pg has no game worker and no Temporal service | No edit |
| docs/technical/README.md#technical-contracts | Technical | unchanged: the deployment question still points at the deployment page. This packet adds no index row | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | The index does not say the game database moved to kind | No edit |
| docs/product/foundations/vision.md#what-this-page-selects | Product | unchanged: the lab adds no player-facing promise and this page was not edited | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | A kind primary is not a new mechanic | No product edit |
| docs/runbooks/kubernetes-postgres.md#recovery-limit | Related | changed: the runbook owns the install, smoke, and delete commands, and the recovery limit | infra/kubernetes/lab/cnpg/install.sh and infra/kubernetes/lab/cnpg/smoke.sh; no game source behavior changed | fixture-tested | The PVC uid stayed the same after a new Pod uid, and down.sh left the Compose volumes in place | Linked from docs/runbooks/README.md#runbooks |
| docs/runbooks/kubernetes-lab.md#what-this-procedure-is | Related | unchanged: the kind create and delete procedure stays the cluster owner. This packet does not edit that runbook | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | The kind DNS smoke is not the Postgres row check | No edit |
| STATUS.md | Related | unchanged: another batch owner holds this file. This packet does not record a game deployment there | no game source behavior changed; inspected compose.yaml at 4962e373 | reviewed | Compose remains the game database, and this packet does not mark the game as deployed on Kubernetes | No edit |
| work/changes/README.md | Related | unchanged: this packet does not edit the queue index. The open-table link still names the pre-archive leaf until that owner updates it | no source behavior changed; inspected compose.yaml at 4962e373 | reviewed | Archiving this packet does not select another Change | Index link left in place |
