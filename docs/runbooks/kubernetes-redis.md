# Kubernetes Redis

Disposable Redis on the [Kubernetes lab](kubernetes-lab.md) cluster. This is optional acceleration. It is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

The cache rule stays on [Redis boundary](../technical/platform/persistence-and-caching.md#redis-boundary). PostgreSQL remains the authoritative record.

## What this procedure is

Run one Redis process in `lab-a` behind a ClusterIP Service named `redis`. The process has a memory cap, a CPU cap, and a `redis-cli ping` liveness probe. Snapshotting and the append-only file are off, and the data directory is an emptyDir that dies with the pod.

`infra/kubernetes/lab/redis/smoke.sh` checks three losses:

- a key set with a short TTL is readable, then absent after that TTL
- `FLUSHALL` removes a key
- scaling the Deployment to zero makes the client connection fail; scaling it back to one makes `PING` succeed and the previous key stay absent

A miss after expiry, flush, or restart is the expected cache result. It is not loss of authoritative game state. This smoke never writes a story, a payment, or a workflow.

## What it must not do

- Do not treat Redis as a durable workflow store. Temporal and PostgreSQL keep that work.
- Do not use Redis as a payment lock or a settlement record.
- Do not put a password, token, or other secret in the manifest. This lab process has no authentication material in Git. The Service is ClusterIP and is not published on the host. That is a lab limit, not a production authentication design.
- Do not use a NodePort or LoadBalancer Service.
- Do not mount a PersistentVolume. A volume that survived a pod restart would look like durable cache authority.
- Do not point the game, the API, or Compose at this Service. Compose remains the local development route.
- Do not delete Docker volumes. Compose volumes, including `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`, must still be present after `down.sh`.

## Requirements

The cluster comes from [Kubernetes lab](kubernetes-lab.md). This procedure adds one image:

| Tool or image | Pin |
| --- | --- |
| Redis | `docker.io/library/redis:8.2.1-alpine` (the same tag as `compose.yaml`) |

The container runs as uid 999 and gid 1000, which is the `redis` account in that image. The memory limit is 128Mi and the CPU limit is 500m. `maxmemory` inside Redis is 32mb.

## Create, smoke, and delete

Create the cluster with `infra/kubernetes/lab/up.sh` first. Then, from the repository root, using context `kind-offscreen-lab`:

```bash
infra/kubernetes/lab/redis/smoke.sh
```

When local Docker already has `docker.io/library/redis:8.2.1-alpine`, the smoke saves that image and imports it into each kind node with `ctr images import`. `kind load docker-image` is not used: on this machine it stops with `content digest sha256:8ddf542da70dec1f3b0f91fde22f8cd4b9c816627dc39323416b295b278c010c: not found`. If the import fails, the kubelet may still pull the same pin. The smoke applies `infra/kubernetes/lab/redis/redis.yaml` and `infra/kubernetes/lab/redis/client.yaml`, runs the three checks, and deletes the Redis objects when it exits, including after a failure. It does not delete the cluster.

Delete the cluster with `infra/kubernetes/lab/down.sh` when the lab work is finished. Hold the shared cluster lock from `up.sh` through `down.sh`. If `up.sh` says the cluster already exists, stop. Do not delete a cluster this shell did not create.

## Failure

If the Redis pod stays unready, read that pod's events and leave the Change unproven. Do not mark the cache ready from a manifest that never answered `PING`.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

If the Service is not ClusterIP, the smoke stops. Do not publish Redis on a host port to make the client reach it.

## Observed local run

Machine: MemTotal 12249872 kB. Before the passing create, MemAvailable was 9758640 kB. Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, node image `kindest/node:v1.37.0`.

The pinned image is `docker.io/library/redis:8.2.1-alpine`. Docker's index digest is `sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232`. The running pod reported imageID `sha256:6f5542508b8b0f789f6d337b5eb48f86af82ef31df2f831d9e4748ed8a986bbd`. `redis-server --version` printed `Redis server v=8.2.1 sha=00000000:1 malloc=jemalloc-5.3.0 bits=64 build=f5a80511e802827d`.

Commands, from the repository root, in one shell holding `/tmp/offscreen-k8s-cluster.lock`:

```bash
infra/kubernetes/lab/up.sh
infra/kubernetes/lab/redis/smoke.sh
infra/kubernetes/lab/down.sh
```

The first attempt on 2026-11-19 created the cluster, then `kind load docker-image` failed before any Redis pod existed:

`ctr: content digest sha256:8ddf542da70dec1f3b0f91fde22f8cd4b9c816627dc39323416b295b278c010c: not found`

That shell deleted the cluster it had created. It did not treat the load error as a ready Redis.

The smoke then imported the saved image with `ctr images import` and was run again. Results from that run:

- Service type `ClusterIP`
- memory limit `128Mi`, CPU limit `500m`
- liveness probe `["redis-cli","ping"]`
- `SET lab:ttl hello EX 4` returned `OK`, `GET` returned `hello`, `TTL` was `4`, and `GET` after the wait was empty
- `FLUSHALL` returned `OK`, and `GET lab:flush` was empty
- after `scale deployment/redis --replicas=0`, `PING` exited 1 with `Could not connect to Redis at redis:6379: Connection refused`
- after scale back to one, `PING` returned `PONG` and `GET lab:restart` was empty
- the only `lab-a` pods were the Redis pod and `redis-client`
- the API container published `127.0.0.1:6443` only

The smoke deleted its Redis objects. `down.sh` then removed `offscreen-lab`. `kind get clusters` reported no clusters. These volumes were still present: `offscreen-rpg_postgres-data`, `offscreen-rpg_temporal-data`, `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`, and `d153382368c28ea4cedc4d528099bddd86a7b3f6d9297722ad7775b58d7f3ae2`. No model call was made.
