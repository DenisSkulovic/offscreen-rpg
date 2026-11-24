# Kubernetes Temporal

Disposable Temporal server on the [kind lab](kubernetes-lab.md). This is not the Compose development server, not a game workflow, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

Compose still runs Temporal's development server for the game. This procedure does not replace that process and does not point the game at the lab server.

## What this procedure is

Install Temporal server 1.32.2 into the existing `offscreen-lab` cluster, with PostgreSQL 17.11 on a `local-path` claim in namespace `lab-temporal`. The server process is `temporal-server --config-file /tmp/temporal-config.yaml --allow-no-auth start`. It listens inside the pod and is reached through a ClusterIP Service. History and visibility use databases `temporal` and `temporal_visibility` on that claim. Four history shards are set in the rendered config.

The database password is created in memory at install time and stored only in Secret `temporal-db`. The server script writes it into `/tmp/temporal-config.yaml` inside the container. No password is committed.

A separate worker image runs one toy workflow, `labOnce`, on task queue `lab-once`. The workflow inserts one row into database `lab`, then waits on a 90-second timer. That workflow is not a game workflow. The game packages are not mounted into the worker.

The server container limits are 700m CPU and 768Mi memory. PostgreSQL limits are 500m CPU and 384Mi memory. The worker limits are 500m CPU and 640Mi memory. There is no authorizer. `--allow-no-auth` is a lab limit, not a production authentication design.

Platform install manifests live in `infra/platform/temporal/`. Verification scripts and the toy worker live under `infra/verification/smoke/temporal/`. Run them from the repository root after `infra/clusters/kind/release/up.sh`.

## What it must not do

- Do not call this cluster a production Temporal cluster. One process holds frontend, history, matching, and the internal worker. There is no second replica and no authorizer.
- Do not describe this process as Temporal's development server. Compose still uses that mode. This lab server reads and writes PostgreSQL.
- Do not point Compose, the game worker, or the game database at `lab-temporal`.
- Do not put a password or a rendered server config in Git.
- Do not publish a workload on `0.0.0.0` or `[::]`. `bindOnIP` is inside the pod network. A NodePort or LoadBalancer Service fails the check. The API server stays on `127.0.0.1`.
- Do not delete Docker volumes outside this cluster. `down.sh` may drop only the volumes attached to `offscreen-lab` node containers. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain. A clone that has neither volume is valid.
- Do not treat deletion of the kind cluster as a backup of workflow history.

## Recovery limit

The smoke starts `labOnce`, waits until the activity has completed and the timer has started, then scales the worker to zero. The workflow stays running. It then deletes the Temporal server pod. The new pod is a different uid. The PostgreSQL claim uid stays the same, and `temporal workflow show` still returns the same run id with the timer event. The worker is scaled back to one. The same run completes once. The insert in `lab_effect` stays at one row, because replay does not run a completed activity again.

Deleting the kind cluster does not preserve local-path volumes. The provisioner stores files on the kind node disk, and `kind delete cluster` removes that node. There is no backup job and no second history replica. Recreating the cluster creates an empty volume. A replaced server pod and a deleted cluster are different events.

## Create, probe, and delete

```bash
infra/clusters/kind/release/up.sh
infra/platform/temporal/install.sh
infra/verification/smoke/temporal/smoke.sh
infra/clusters/kind/release/down.sh
```

`install.sh` and `smoke.sh` take no arguments. `smoke.sh` does not delete the cluster or the claim. `down.sh` deletes the whole kind cluster, including the server, the worker, PostgreSQL, and the local-path files on the node.

Hold the shared cluster lock from `up.sh` through `down.sh`. If `up.sh` says the cluster already exists, stop. Do not delete a cluster this shell did not create.

## Failure

If the server deployment does not become ready, or the schema job does not complete, stop. Do not raise the WSL memory cap and do not delete Compose volumes to free space. Leave the Change unproven.

If the smoke says the history run id changed, the timer event disappeared, the workflow completed while the worker was stopped, or `lab_effect` is not one row, the proof failed.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

## Observed local run

On 2026-11-19, from branch `change/k8s06-temporal` at baseline `66f82cac`, one shell held `/tmp/offscreen-k8s-cluster.lock`, created `offscreen-lab` only after that name was absent, and deleted that same cluster before it released the lock.

Machine: MemTotal 12249872 kB. MemAvailable was 8443232 KiB before create, 7302676 KiB at the start of the smoke, and 8052748 KiB after delete. Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, node image `kindest/node:v1.37.0`.

Pinned images: `docker.io/temporalio/server:1.32.2` digest `sha256:7bf69188a6232fea14869b9cef3d94aa82a1601d99517f7e86c71f22da4e0670`, `docker.io/temporalio/admin-tools:1.32.2` digest `sha256:4a95866efba29d7e17ab012df5232795e8b0ad0f7d5f9d1ec4df321f7792a754`, and `docker.io/library/postgres:17.11-bookworm` digest `sha256:665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994`. The worker image was built locally as `offscreen-lab-temporal-worker:k8s06` from Node 22 and `@temporalio/worker` 1.24.0.

Commands, from the repository root:

```bash
infra/clusters/kind/release/up.sh
infra/platform/temporal/install.sh
infra/verification/smoke/temporal/smoke.sh
infra/clusters/kind/release/down.sh
```

The server command was `temporal-server --config-file /tmp/temporal-config.yaml --allow-no-auth start`. `temporal-server --version` printed `temporal version 1.32.2`. The admin CLI printed `temporal version 1.10.0 (Server 1.32.2, UI 2.56.1)`. Postgres printed `postgres (PostgreSQL) 17.11 (Debian 17.11-1.pgdg12+2)`. Cluster health was `SERVING`. Claim `temporal-postgres` was Bound on `local-path`. Both Services were ClusterIP. The API container published `127.0.0.1:6443` only.

`labOnce` run `01a1f508-38d1-7089-b20e-5ae1ca74a044` on task queue `lab-once` completed its activity and started its timer while the status was still `RUNNING`. `lab_effect` had one row. The worker was scaled to zero. The server pod uid changed from `23b8fa1e-77b5-43ce-a604-1baf606537c9` to `f992a343-45f8-4181-9378-687e3902b31a`. The claim uid stayed `c72d384b-11c3-42a3-b8f0-4276962f1653`. After the new server was `SERVING`, the same run id was still `RUNNING` and the history still had one `TimerStarted`. `lab_effect` was still one row. The worker was scaled back to one. The same run completed. The history had one `ActivityTaskCompleted`, one `TimerFired`, and one `WorkflowExecutionCompleted`. The result text was `finished-once`. The workflow list contained one execution. `lab_effect` stayed one row.

`down.sh` then removed `offscreen-lab`. No kind cluster remained. `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were still present. No Secret value was printed, and no password was written under `infra/kubernetes/lab/temporal/`. No model call was made. The game was not pointed at this server. This run is a disposable lab, not the Compose development server, and not a production cluster. Deleting the kind cluster did not keep the workflow history.
