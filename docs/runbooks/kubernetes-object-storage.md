# Kubernetes object storage

Disposable S3-compatible object store on the [Kubernetes lab](kubernetes-lab.md) cluster. This is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

The game document adapter stays on [Selected document store](../technical/platform/data-and-persistence.md#selected-document-store). Local document storage uses the configured adapter in the lab release, not this disposable SeaweedFS slice. This procedure does not point the game or the API at the lab object-store Service.

## What this procedure is

Run one SeaweedFS process in `lab-objects` behind a ClusterIP Service named `object-store` on port 8333. The process is `weed mini` with its data directory on a `local-path` persistent volume. The bucket name is `lab-objects`. `infra/platform/object-storage/install.sh` creates the Kubernetes Secret `object-store-s3` in the cluster. The access key and secret key are not written into Git. `infra/verification/smoke/object-storage/smoke.sh` reads that Secret and does not create or rotate it.

The readiness and liveness probes request `http://127.0.0.1:8333/`. With the smoke credentials, that request is refused with HTTP 403. HTTP 200 is the unauthenticated mode. The probe accepts either code so it knows the port answered. A 403 does not prove that an object can be stored. The put, get, and delete in the smoke are that proof.

`infra/verification/smoke/object-storage/smoke.sh` checks the S3 calls, then Pod replacement:

- put a random-prefix `lifecycle.txt`, get the same bytes back, delete it, and show that a later head reports the object missing
- put a random-prefix `restart.txt`, delete the store Pod after setting `OFFSCREEN_OBJECT_STORAGE_POD_DELETE_CONFIRM` to the Pod uid, and get that object back from the replacement Pod
- the persistent volume claim uid stays the same and the Pod uid changes

A container that becomes Ready is not this proof. The put, get, and delete have to succeed. The object that was deleted has to stay missing after the Pod is replaced.

## Why this store

SeaweedFS 4.54, published 2026-11-16, is the store. The image is `docker.io/chrislusf/seaweedfs:4.54`. The project is Apache-2.0 and the 4.x line is still releasing. `weed mini` serves S3 on port 8333 and keeps master, volume, and filer state under `/data`, so one claim is enough for a Pod replacement.

Garage v2.5.0, published 2026-10-24, is also maintained and can run as one node. It is AGPL-3.0. Its single-node command does not replicate, and keeping data across a restart needs a config file that splits metadata and data directories. This lab uses SeaweedFS so the image pin stays Apache-2.0 and the volume is one directory. That choice does not say Garage cannot store an object.

MinIO is not the lab store. `minio/minio` pulls are blocked in this environment, so this lab uses SeaweedFS for object-storage exercises. This cluster store does not replace the game document adapter.

## What it must not do

- Do not treat a Ready Pod as proof of S3. The smoke has to put, get, and delete an object.
- Do not treat Pod replacement as a backup. The object is on the local-path volume. Deleting the kind cluster deletes the node disk that holds that volume. There is no backup job and no second replica.
- Do not put an access key, a secret key, or a Secret manifest in Git. The installer creates the Secret and does not print it. The smoke does not create or overwrite credentials.
- Do not use a NodePort or LoadBalancer Service. Only port 8333 is on the Service. `weed mini` also listens inside the Pod for its master, filer, and admin ports. Those ports are not published on the host.
- Do not point the game or the API at this Service. `OFFSCREEN_DOCUMENT_STORE` stays unchanged.
- Do not delete Docker volumes outside this cluster. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain after `down.sh`. A clone that has neither volume is valid.

## Recovery limit

Deleting the store Pod does not delete an object that was still in the bucket. The bytes are on the persistent volume. The Deployment starts a new Pod and attaches the same claim. The smoke checks that the claim uid is unchanged and that the new Pod uid is different.

Deleting the kind cluster does not preserve local-path data and is not a backup. The provisioner stores files on the kind node disk, under `/opt/local-path-provisioner`, and `kind delete cluster` removes that node. Recreating the cluster creates an empty volume. Pod replacement and cluster deletion are different events.

## Requirements

The cluster comes from [Kubernetes lab](kubernetes-lab.md). This procedure adds two images:

| Tool or image | Pin |
| --- | --- |
| SeaweedFS | `docker.io/chrislusf/seaweedfs:4.54` |
| AWS CLI, smoke client only | `public.ecr.aws/aws-cli/aws-cli:2.31.18` |

The store container runs as uid 1000 and gid 1000, which is the `seaweed` account in that image. The memory limit is 768Mi and the CPU limit is 500m. The claim requests 2Gi on `local-path`.

## Create, smoke, and delete

Create the cluster with `infra/clusters/kind/release/up.sh` first. Then, from the repository root, using context `kind-offscreen-lab`:

```bash
infra/clusters/kind/release/up.sh
infra/platform/object-storage/install.sh
infra/verification/smoke/object-storage/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-lab
```

Hold `/tmp/offscreen-k8s-cluster.lock` from `up.sh` through `down.sh`. If the cluster already exists, stop. Do not delete a cluster this shell did not create.

When local Docker already has the two pins, the smoke saves each image and imports it into each kind node with `ctr images import`. `kind load docker-image` is not used. If the import fails, the kubelet may still pull the same pin. `install.sh` applies the platform chart through the guarded installer. The smoke applies only `infra/verification/smoke/object-storage/client.yaml`, uses a random proof key prefix under `lab-objects`, and deletes that prefix and the client Pod when it exits. Before the intentional store Pod deletion, set `OFFSCREEN_OBJECT_STORAGE_POD_DELETE_CONFIRM` to the current store Pod uid printed by the smoke. `down.sh` deletes the cluster, including the claim and the local-path files on the node. The smoke does not delete Compose volumes.

## Failure

If the store Pod stays unready, read that Pod's events and leave the Change unproven. Do not mark the store ready from a manifest that never put an object.

If the object is gone after the Pod deletion, the proof failed. Do not call the volume durable.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

If the Service is not ClusterIP, the smoke stops. Do not publish the store on a host port to make the client reach it.

## Observed local run

Machine: MemTotal 12249872 kB. MemAvailable was 9550340 kB before create, 9517960 kB when `up.sh` checked, 9080972 kB after the cluster was ready, 9076616 kB at the smoke check, and 9769684 kB after delete. Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, node image `kindest/node:v1.37.0`.

The pinned store image is `docker.io/chrislusf/seaweedfs:4.54`. The import recorded OCI index `sha256:4b42c212543a0acd4c0e675215ecdcaf62a186ef98def76c7e12701871222d15`. The running Pod reported imageID `sha256:d2dd0e2e16a2c0749be2a38eb3bda5620b9b740da3abbc877090b66c2fd9f0e4`. The smoke client image is `public.ecr.aws/aws-cli/aws-cli:2.31.18`, index `sha256:d3f5b7078a71fd7cb488719571c50abd252f4320cdf375601f2d6d40caf97b55`.

Commands, from the repository root, in one shell holding `/tmp/offscreen-k8s-cluster.lock`:

```bash
infra/clusters/kind/release/up.sh
infra/platform/object-storage/install.sh
infra/verification/smoke/object-storage/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-lab
```

Results from that run on 2026-11-19, branch `change/k8s05-object-storage`, baseline `66f82cac`:

- Service type `ClusterIP`
- memory limit `768Mi`, CPU limit `500m`
- claim `object-store-data` was Bound on `local-path`
- `PUT lifecycle.txt` returned ETag `e1afd5832b9be874504f6754b3b9e5c4`, and `GET` returned `put-ok`
- `DELETE lifecycle.txt` returned an empty body, and `HEAD` exited 254. The smoke accepts that exit only when the error names a missing object
- `PUT restart.txt` returned ETag `2a8a2e067924c021b254cfea3fb0be36`, and `GET` returned `pod-replace-ok`
- deleting Pod `object-store-7f669bcc5d-c26nc` changed the Pod uid from `51564c08-8c30-4dec-8d0c-b44aae30218d` to `2664fbf9-c2bb-4587-828e-411ad39e1070`
- the claim uid stayed `bea6e2ee-7d68-4cb4-b61d-9c7978596215`
- `GET restart.txt` after that deletion returned `pod-replace-ok`
- `HEAD lifecycle.txt` after the replacement still exited 254
- the API container published `127.0.0.1:6443` only

`down.sh` then removed `offscreen-lab`. `kind get clusters` reported no clusters. No kubectl context remained. These volumes were still present: `offscreen-rpg_postgres-data`, `offscreen-rpg_temporal-data`, `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`, and `d153382368c28ea4cedc4d528099bddd86a7b3f6d9297722ad7775b58d7f3ae2`. No Secret value was printed, and no credential was written under `infra/kubernetes/lab/object-storage/`. No model call was made. The game was not pointed at this store.

Deleting that kind cluster does not preserve the local-path files and is not a backup. The object survived a Pod deletion only. It did not survive the cluster deletion, and this run did not try to read it back after `down.sh`.
