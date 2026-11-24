# Kubernetes document access

Two isolated verification jobs on the [Kubernetes lab](kubernetes-lab.md) cluster. The jobs share one object in the store from [Kubernetes object storage](kubernetes-object-storage.md). This is not the game, not the Nest API, not the worker, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

The game adapter stays on [Selected document store](../technical/platform/data-and-persistence.md#selected-document-store). These jobs do not set `OFFSCREEN_DOCUMENT_STORE`. They do not write a scene checkpoint, and they do not write a fork.

## What this procedure is

`infra/verification/fixtures/document-access/smoke.sh` requires the release object store from [Kubernetes object storage](kubernetes-object-storage.md) (`infra/platform/object-storage/install.sh`). It does not apply a separate store manifest or create the admin Secret `object-store-s3`. The bucket is `lab-objects`. The Service is `object-store.lab-objects.svc.cluster.local` on port 8333, ClusterIP only.

The smoke then runs two Jobs in `lab-document-access`:

- `document-writer` puts one object. The key is `objects/sha256/<first two hex>/<sha256>.json`, the same key shape as `packages/documents/src/s3-store.ts`. The bytes are `{"probe":"data05-document-access","role":"shared-object"}`.
- `document-reader` is a different Pod. It gets those bytes and checks the SHA-256.

The writer Job is deleted before the first reader runs, so the reader cannot be reading a file from the writer container. The writer Job is then created again. Its new Pod uid must differ. The reader Job runs again and must still return the same SHA-256.

Game Authority and Storyteller are not separate application entrypoints in this tree. The Nest API and the worker are not started. That integration stays pending.

## Credentials

The platform admin credentials live only in Secret `object-store-s3` in `lab-objects`, created by `install.sh`. The smoke copies those bytes into `document-writer-s3` in `lab-document-access` on first run (create-only; mismatch refuses). The reader Job reads `document-reader-s3`, a distinct read-only identity configured with `s3.configure` on the running store. None of those values are written into Git. The smoke refuses to run if this directory contains a Secret manifest or an `AKIA` literal.

The denied-read check uses the fixed names `denied-document-reader` and `denied-document-reader-secret`. Those names are not installed on the store.

## What the jobs must show

- The reader SHA-256 equals the writer SHA-256, before and after the writer Pod is replaced.
- A missing key fails, and the reader does not create `/tmp/pod-local-canonical`.
- A read with the uninstalled key fails, and it does not write the object bytes.
- The reader put of a different payload at the same key is denied, and a later get still has the original SHA-256.
- A put aimed at `http://127.0.0.1:9` fails, and the writer does not create `/tmp/pod-local-canonical` and treat it as the object.
- The reader writes a different file under `/tmp/pod-local-docs` and does not accept that file as the object it got from the store.

Each Job mounts one emptyDir at `/tmp`. That volume is client scratch. It is not a claim, and it is not shared between the Jobs.

## What it must not do

- Do not treat a Ready Pod as proof. The reader has to return the same SHA-256.
- Do not point the Nest API, the worker, or Compose at this Service.
- Do not edit `infra/platform/object-storage/`. SeaweedFS 4.54 stays the store.
- Do not publish a NodePort or a LoadBalancer. Do not publish on `0.0.0.0` or `[::]`.
- Do not put an access key or a secret key in Git.
- Do not call a failed S3 put a stored object because a local file exists.
- Do not call this pair of Jobs a historical fork, a scene checkpoint, or publication.
- Do not delete Docker volumes outside this cluster. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain after `down.sh`. A clone that has neither volume is valid.

## Recovery limit

The object lives on the store claim from the object-storage procedure. Deleting the writer Pod does not delete that object. Deleting the kind cluster does not preserve local-path data and is not a backup.

## Requirements

The cluster comes from [Kubernetes lab](kubernetes-lab.md). The store pin is the one in [Kubernetes object storage](kubernetes-object-storage.md).

| Tool or image | Pin |
| --- | --- |
| SeaweedFS | `docker.io/chrislusf/seaweedfs:4.54` |
| AWS CLI, verification jobs only | `public.ecr.aws/aws-cli/aws-cli:2.31.18` |

## Create, smoke, and delete

Create the cluster with `infra/clusters/kind/release/up.sh` first. Then, from the repository root, using context `kind-offscreen-lab`:

```bash
infra/clusters/kind/release/up.sh
infra/verification/fixtures/document-access/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-lab
```

Hold `/tmp/offscreen-k8s-cluster.lock` from `up.sh` through `down.sh`. If the cluster already exists, stop. Do not delete a cluster this shell did not create.

When local Docker already has the two pins, the smoke saves each image and imports it into each kind node with `ctr images import`. `kind load docker-image` is not used. If the import fails, the kubelet may still pull the same pin.

## Failure

If the read-only identity cannot be added, leave the Change unproven. Do not give the reader the writer Secret and call that least privilege.

If the reader hash differs, or the reader put is accepted, the proof failed.

If the Service is not ClusterIP, the smoke stops.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

## Observed local run

Machine: MemAvailable was 7745856 kB before create, 7677808 kB when `up.sh` checked, 7120724 kB after the cluster was ready, 7127240 kB at the smoke check, and 7669504 kB after delete. kind v0.33.0, kubectl client v1.37.2, node image `kindest/node:v1.37.0`. The API container published `127.0.0.1:6443` only.

Commands, from the repository root, in one shell holding `/tmp/offscreen-k8s-cluster.lock`:

```bash
infra/clusters/kind/release/up.sh
infra/verification/fixtures/document-access/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-lab
```

Results from that run on 2026-11-19, branch `change/data05-shared-object`, baseline `25d75a9a`:

- Service type `ClusterIP`
- store image `docker.io/chrislusf/seaweedfs:4.54`, import index `sha256:4b42c212543a0acd4c0e675215ecdcaf62a186ef98def76c7e12701871222d15`, running image ID `sha256:d2dd0e2e16a2c0749be2a38eb3bda5620b9b740da3abbc877090b66c2fd9f0e4`
- job image `public.ecr.aws/aws-cli/aws-cli:2.31.18`, import index `sha256:d3f5b7078a71fd7cb488719571c50abd252f4320cdf375601f2d6d40caf97b55`, running image ID `sha256:051f36d64212fb025639c2b36a2ea1fa78d29408c9e6b0a1b92b0773045a4453`
- bucket `lab-objects`
- key `objects/sha256/49/4959e7f0c4411fc6b0511056195fd9631e518f51119ad34310441f39ef08470d.json`
- SHA-256 `4959e7f0c4411fc6b0511056195fd9631e518f51119ad34310441f39ef08470d`, 57 bytes
- writer Pod uid `37bd341c-3362-4f2a-8eee-e14670f34816`, then that Job was deleted
- reader Pod uid while the writer Pod was absent: `215b213c-3946-4d5e-a2bd-aa3a10977efd`, and the SHA-256 matched
- replacement writer Pod uid `4ea0a971-13d2-4b0f-a211-b14379b30895`
- reader Pod uid after that replacement: `70f5ac52-583c-4a02-ad65-f5b6fbe31f69`, and the SHA-256 still matched
- the writer reported `failed-s3=fail-closed` and `pod-local=absent`
- the reader reported `pod-local=rejected`, `missing-key=fail-closed`, `denied-read=fail-closed`, and `second-write=denied`

`down.sh` then removed `offscreen-lab`. `kind get clusters` reported no clusters. These volumes were still present: `offscreen-rpg_postgres-data`, `offscreen-rpg_temporal-data`, `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`, and `d153382368c28ea4cedc4d528099bddd86a7b3f6d9297722ad7775b58d7f3ae2`. No Secret value was printed, and no credential was written under `infra/kubernetes/lab/document-access/`. No model call was made. The Nest API and the worker were not applied.

Deleting that kind cluster does not preserve the local-path files and is not a backup. The object survived a writer Pod deletion only. It did not survive the cluster deletion, and this run did not try to read it back after `down.sh`.

## Pending integration

`apps/api` and `apps/worker` already resolve `OFFSCREEN_DOCUMENT_STORE` in source. This procedure does not start either process, and it does not add a Deployment for them. Wiring those processes to `object-store.lab-objects.svc.cluster.local` remains pending. The rule in `packages/documents/src/document-store-config.ts` stays: S3 mode does not fall back to the local store.
