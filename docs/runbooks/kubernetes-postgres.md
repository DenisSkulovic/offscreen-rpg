# Kubernetes Postgres

Disposable CloudNativePG primary on the [kind lab](kubernetes-lab.md). This is not the game database, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

## What this procedure is

Install CloudNativePG 1.30.2 into the existing `offscreen-release` cluster, then create one PostgreSQL primary named `lab-pg` in namespace `lab-postgres`. The data volume uses the lab `local-path` storage class. Requests are 100m CPU and 256Mi memory. Limits are 500m CPU and 768Mi memory. The operand image is `ghcr.io/cloudnative-pg/postgresql:18.7-system-trixie`.

The operator manifest is downloaded from the pinned GitHub release and checked with SHA-256 `ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c` before apply. The operator Deployment image is `ghcr.io/cloudnative-pg/cloudnative-pg:1.30.2`. Release 1.30.2 lists Kubernetes 1.34, 1.35, and 1.36. This lab's node image is Kubernetes 1.37.0. The pin is the current operator release; the run below records whether that release became ready on this node.

Scripts live in `infra/platform/postgres/`. The workload manifests are no longer flat `cluster.yaml` or `namespace.yaml` files. They are rendered from `infra/platform/postgres/chart/templates/{namespace,cluster}.yaml` through `infra/platform/common/cli.mjs render postgres release …`, and `infra/platform/postgres/release-install.mjs` observes the live cluster to decide create, reuse, or refuse before any `kubectl apply`. Run from the repository root after `infra/clusters/kind/release/up.sh`.

## What it must not do

- Do not put a password, a client certificate, or a generated Secret in Git. The operator creates credentials when the primary starts. The smoke uses local peer authentication inside the Pod and does not print Secret values.
- Default baseline is one instance. Shared chart rendering and normal bootstrap (`install.sh`, dev CNPG ensure) create or reuse a compatible cluster without implicitly changing an existing instance count. Only `topology-cli.mjs ensure` changes `spec.instances` on an existing baseline. Baseline cluster names are `dev-pg` (dev) and `lab-pg` (release) only in INF53; independently named clusters belong to [INF54](../../work/changes/archive/2026-11/platform-operations/2026-11-25--inf54-postgres-owned-clusters/CHANGE.md). The historical pod-replacement smoke intentionally requires one instance. Never use it as a multi-instance failover, HA, or backup test.
- Do not point Compose, the game, or Temporal at `lab-pg`.
- Do not delete Docker volumes outside this cluster. `down.sh` may drop only the volumes attached to `offscreen-release` node containers. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain. A clone that has neither volume is valid.
- Do not publish a workload on `0.0.0.0` or `[::]`. A NodePort or LoadBalancer Service fails the check.
- Do not treat this primary as a backup or a restore of the game database.
- Do not resize the shared dev baseline `dev-pg` through ordinary agent slot startup or worktree stack scripts. Dev instance-count changes are owner-operational only. See [Local CNPG topology](../technical/platform/database-infrastructure.md#local-cnpg-topology-selected-2026-11-25).

## Recovery limit

Deleting the primary Pod does not delete a committed row. The row is on the persistent volume. The operator starts a new Pod for the same primary and attaches the same claim. The smoke checks that the claim's uid is unchanged and that the new Pod's uid is different.

Deleting the kind cluster does not preserve local-path volumes. The provisioner stores files on the kind node disk, under `/opt/local-path-provisioner`, and `kind delete cluster` removes that node. There is no backup job and no second replica to replay from. Recreating the cluster creates an empty volume. Pod replacement and cluster deletion are different events.

## Create, probe, and delete

```bash
infra/clusters/kind/release/up.sh
infra/platform/postgres/install.sh
infra/verification/smoke/postgres/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-release
```

`install.sh` and `smoke.sh` take no arguments. `smoke.sh` does not delete the cluster or the claim. `down.sh` deletes the whole kind cluster, including the operator, the primary, and the local-path files on the node.

### Release install decision

`install.sh` still owns the disposable-lab guards from `infra/clusters/kind/release/lib.sh`: it refuses foreign Docker volume loss, foreign kubectl context loss, non-loopback exposure, and sub-4 GiB `MemAvailable` before mutation. After those guards it runs `node infra/platform/common/cli.mjs target release`, downloads the checksum-pinned operator manifest from `operator.pin`, and calls `release-install.mjs install`.

`release-install.mjs` does not print Secret values, does not rotate credentials on reentry, and does not force-apply when the live namespace, Cluster, and operator already match the rendered release profile. A matching reentry waits for webhook and `lab-pg` readiness for the **observed** live instance count (not an implicit scale back to profile default). A missing namespace or Cluster creates only the absent object. An existing `lab-postgres` namespace must carry `offscreen.rpg/lab=disposable`. An existing `lab-pg` Cluster must match the pinned operand image, `local-path` storage, and `lab/lab` bootstrap identity; instance count is part of live identity on reuse, not reset by install. A matching operator skips manifest fetch and apply; a missing operator uses the checksum-verified download; a mismatched operator image refuses. Unreadable observation or foreign or mismatched resources refuse without create.

### Baseline instance topology (read and explicit scale)

Normative contract: [Local CNPG topology](../technical/platform/database-infrastructure.md#local-cnpg-topology-selected-2026-11-25). Operator for baseline clusters `dev-pg` and `lab-pg` only:

```bash
# Read-only plan / status (JSON on stdout)
node infra/platform/postgres/topology-cli.mjs plan \
  --env release --cluster lab-pg --instances 2
node infra/platform/postgres/topology-cli.mjs status \
  --env release --cluster lab-pg --instances 2

# Mutate only with exact kubectl context confirmation (operational authorization, not RBAC)
node infra/platform/postgres/topology-cli.mjs ensure \
  --env release --cluster lab-pg --instances 2 \
  --confirm-context kind-offscreen-release

# Scale-down requires an extra flag; CNPG may retire standby storage
node infra/platform/postgres/topology-cli.mjs ensure \
  --env release --cluster lab-pg --instances 1 \
  --confirm-context kind-offscreen-release \
  --allow-scale-down
```

Use `--env dev --cluster dev-pg --confirm-context kind-offscreen-dev` for the shared dev baseline. Reserve dev baseline scaling for the human owner; agents must not run dev `ensure` as part of ordinary stack startup. `plan` and `status` never mutate. `ensure` patches only `spec.instances` with a compare-and-swap JSON patch and polls shared readiness; it does not install the operator, create a missing cluster, or read Secrets. This runbook does not prove HA, backup, or failover.

### Owned independent clusters (INF54)

[INF54](../../work/changes/archive/2026-11/platform-operations/2026-11-25--inf54-postgres-owned-clusters/CHANGE.md) adds non-baseline cluster names scoped by `--owner` (run-owned DNS label, 1–24 characters). Baseline names `dev-pg` and `lab-pg` refuse `--owner`. The owner maps to namespace `offscreen-pg-<ownerId>` in the selected profile context. Rendering and reconciliation live in `infra/platform/postgres/topology.mjs`; the CLI entrypoint is `topology-cli.mjs`. A future CNPG verification resource adapter must call this shared builder only; it does not maintain a second manifest algorithm (see [verification programmes](../technical/platform/verification-programmes.md)).

Ordinary dev slot startup and worktree stack scripts keep the shared `dev-pg` endpoint. Agent verification uses explicit isolated RW/RO endpoints returned by the resource adapter for the owned run; nothing in this path rebinding application Deployments, Secrets, or Compose to an experiment cluster.

Operational example: two independent cluster names under one owner, two instances each (dual-replicated topology proof shape). Replace `RUN_ID`, cluster names, and context to match the run. `plan`/`status` are read-only; `ensure` mutates only after context confirmation.

Release (`kind-offscreen-release`):

```bash
node infra/platform/postgres/topology-cli.mjs plan \
  --env release --owner RUN_ID --cluster pg-repl-a --instances 2
node infra/platform/postgres/topology-cli.mjs plan \
  --env release --owner RUN_ID --cluster pg-repl-b --instances 2

node infra/platform/postgres/topology-cli.mjs ensure \
  --env release --owner RUN_ID --cluster pg-repl-a --instances 2 \
  --confirm-context kind-offscreen-release
node infra/platform/postgres/topology-cli.mjs ensure \
  --env release --owner RUN_ID --cluster pg-repl-b --instances 2 \
  --confirm-context kind-offscreen-release

node infra/platform/postgres/topology-cli.mjs status \
  --env release --owner RUN_ID --cluster pg-repl-a --instances 2
node infra/platform/postgres/topology-cli.mjs status \
  --env release --owner RUN_ID --cluster pg-repl-b --instances 2
```

Dev (`kind-offscreen-dev`): same flags with `--env dev`, `--confirm-context kind-offscreen-dev`, and distinct non-baseline cluster names if both environments are exercised.

JSON receipts redact secrets; use returned RW/RO hostnames for adapter connection only. Partial create leaves owned objects in place with recovery identity in the receipt; there is no implicit delete on omission. Explicit experiment cleanup belongs to the verification resource lifecycle (aligned with VER02 cleanup ledger semantics), not to ordinary stack stop. No production availability claim.

| Retired path | Successor |
| --- | --- |
| `infra/platform/postgres/namespace.yaml` | `infra/platform/postgres/chart/templates/namespace.yaml` via `cli.mjs render postgres release namespace` |
| `infra/platform/postgres/cluster.yaml` | `infra/platform/postgres/chart/templates/cluster.yaml` via `cli.mjs render postgres release cluster` and `release-install.mjs` apply decisions |

## Failure

If the operator Deployment does not become Available, or `lab-pg` does not reach `Cluster in healthy state`, stop. Do not raise the WSL memory cap and do not delete Compose volumes to free space.

If the smoke says the committed row was lost, the claim uid changed, or `instances` is not 1, the proof failed.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

## Observed local run

On 2026-11-19, from branch `change/k8s02-cnpg` at baseline `4962e373`, the scripts created `offscreen-release`, installed CloudNativePG 1.30.2, and reached `Cluster in healthy state` for `lab-pg` with `instances: 1`. The claim `lab-pg-1` was Bound on `local-path`. Postgres reported `18.7 (Debian 18.7-1.pgdg13+2)`. The primary container limits were 500m CPU and 768Mi memory. Services `lab-pg-rw`, `lab-pg-ro`, and `lab-pg-r` were ClusterIP. The API container published `127.0.0.1:6443` only.

The smoke inserted `pod-replace-ok`, deleted Pod `lab-pg-1`, and read `pod-replace-ok` from the replacement Pod. The Pod uid changed from `53f42a09-0b94-4156-b8bf-53dff7984370` to `89f7ea2f-2fe6-431a-8ee2-103368c9954e`. The PVC uid stayed `e9db926f-d183-476e-b714-906503d9d3a0`.

`down.sh` then removed `offscreen-release`. No kind cluster and no kubectl context remained. `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were still present, along with anonymous volume `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`. MemTotal stayed 12249872 kB. MemAvailable was 9795972 kB before create, 8893884 kB during the smoke, and 9963180 kB after delete.

Release 1.30.2 lists Kubernetes 1.34 through 1.36. This node was Kubernetes v1.37.0, and the operator still became ready here. That run does not add 1.37 to the project's supported list. No Secret value was printed, and no credential was written under `infra/kubernetes/lab/cnpg/`. No model call was made. The game was not pointed at this primary.
