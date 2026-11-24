# Kubernetes lab

Disposable local kind cluster for the [educational laboratory](../technical/platform/topology.md#distributed-learning-target). This is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

## What this procedure is

Create a two-node cluster named `offscreen-release`: one control plane and one worker. The API server listens on `127.0.0.1:6443`. Two namespaces, `lab-a` and `lab-b`, hold the probes. A pinned local-path provisioner supplies the `local-path` storage class. The probes check cluster DNS, an HTTP call from `lab-a` to `lab-b`, and a file that survives a new pod on the same claim.

Cluster lifecycle scripts live in `infra/clusters/kind/release/`; verification smokes and fixtures live under `infra/verification/` and `infra/platform/`. Run them from the repository root.

## What it must not do

- Do not delete Docker volumes outside this cluster. `down.sh` may drop only the volumes attached to `offscreen-release` node containers. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain. A clone that has neither volume is valid.
- Do not delete or switch away from a kubectl context other than `kind-offscreen-release`. The scripts pass `--context kind-offscreen-release` and restore a previous current context when one existed.
- Do not publish a workload on `0.0.0.0` or `[::]`. The only published port is the API server on `127.0.0.1`. A NodePort or LoadBalancer Service fails the check.
- Do not raise the WSL memory cap. `up.sh` refuses to start when MemAvailable is below 4 GiB. This machine's cap stayed near 12 GiB; do not edit `.wslconfig` to make the lab fit.
- Do not point the game, Temporal, or Compose at this cluster. No game manifest is applied.

## Requirements

Pinned for the 2026-11-19 run:

| Tool or image | Version |
| --- | --- |
| Docker | 29.9.3 |
| kind | v0.33.0 |
| kubectl client | v1.37.2 |
| Node image | `kindest/node:v1.37.0` (Kubernetes v1.37.0 inside the node) |
| Probe image | `docker.io/library/busybox:1.36` |
| Volume provisioner | rancher local-path-provisioner v0.0.37, copied at `infra/clusters/kind/common/local-path-storage.yaml` |

kind also installs a default StorageClass named `standard` with the same provisioner name. The probes request `local-path` explicitly so they do not depend on that default.

## Create, probe, and delete

```bash
infra/clusters/kind/release/up.sh
infra/verification/smoke/release.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-release
```

`up.sh` takes no arguments. `destroy.sh` requires exactly one confirmation argument, `kind-offscreen-release`, before any probes or cluster deletion. `smoke.sh` removes its probe pods, Service, and claim when it exits, including after a failure. It does not delete the cluster.

A second worker is not part of this procedure.

## Failure

If `up.sh` says MemAvailable is below 4 GiB, stop. Do not raise the WSL cap and do not delete volumes to free space.

If a check says a Docker volume outside the cluster disappeared, or a foreign kubectl context disappeared, stop and do not run a broader Docker prune.

If the API port is not `127.0.0.1:6443`, run `down.sh` and do not add a public bind.

If a probe pod stays Pending, read that pod's events before deleting the cluster. The volume claim waits for its first consumer, so a slow provisioner looks like a pending writer until the helper finishes.

## Observed local run

On 2026-11-19 the scripts created the cluster, saw both nodes Ready, and saw every `kube-system` pod Running. The API container published `127.0.0.1:6443` only. Smoke resolved `kubernetes.default.svc.cluster.local` and `probe.lab-b.svc.cluster.local`, received `lab-b-ok`, and read `lab-pvc-ok` from a second pod after the writer was deleted.

The cluster was deleted, created again, and smoked again. The second smoke passed. `down.sh` then removed `offscreen-release`. Afterward `kubectl config get-contexts` listed no contexts. These volumes were still present: `offscreen-rpg_postgres-data`, `offscreen-rpg_temporal-data`, and the anonymous volume `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`. MemTotal stayed 12249872 kB. MemAvailable was 9915544 kB before the first create, about 9 GiB while the cluster was up, and 10067660 kB after the final delete.

The first smoke on the recreated cluster failed before the writer retried a late volume mount. The writer command now retries that write for 30 seconds. The smoke that followed that change passed. No model call was made.

## Developer UI

The educational lab cluster is not the game application stack. For Tilt, loopback browser origins, and Headlamp on Windows against `kind-offscreen-release`, see [Kubernetes developer UI](kubernetes-developer-ui.md). Compose is unchanged.
