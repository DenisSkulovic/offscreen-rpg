# Kubernetes content bootstrap

One importer Job and one reader Job on the [Kubernetes lab](kubernetes-lab.md) cluster. The jobs publish and read the pinned Seyda Neen fixture in the store from [Kubernetes object storage](kubernetes-object-storage.md). This is not the game, not the Nest API, not the worker, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

A local `fixture-pin.json` from [Content package authoring](content-package-authoring.md#commands) is not this proof. Import still publishes a package manifest only. It does not create a campaign. A start package is not a successful opening candidate.

## What this procedure is

`infra/kubernetes/lab/content-bootstrap/smoke.sh` applies the existing SeaweedFS manifests in `infra/kubernetes/lab/object-storage/`. It does not edit those manifests. The bucket is `lab-objects`. The Service is `object-store.lab-objects.svc.cluster.local` on port 8333, ClusterIP only.

The smoke then runs two Jobs in `lab-content-bootstrap`:

- `fixture-importer` runs `scripts/repo-tools/import-pinned-fixture.mjs --s3` against that store. It checks the pinned world, rule, and start checksums. It does not write `fixture-pin.json`.
- `fixture-reader` is a different Pod. It runs `scripts/repo-tools/read-pinned-fixture.mjs --s3` and must return those same three hashes.

The importer Job is deleted before the reader runs, so the reader cannot be reading a file from the importer container.

Game Authority and Storyteller are not started. The Nest API and the worker are not applied.

## Credentials

The access key and the secret key are created in memory by the smoke. The store identity is the Secret `object-store-s3` in `lab-objects`. The importer Job reads `content-importer-s3` in `lab-content-bootstrap`. The reader Job reads `content-reader-s3`. The reader identity is added on the running store with `s3.configure` and the action `Read` on `lab-objects`. None of those values are written into Git. The smoke refuses to run if this directory contains a Secret manifest or an `AKIA` literal.

## What the jobs must show

- The reader world, rule, and start hashes equal the importer hashes, and those hashes equal the trusted pins.
- The importer reports `pinPath=null` and `campaignCreated=false`.
- A missing object hash fails closed inside the reader process.
- Each Job mounts one emptyDir at `/tmp`. That volume is client scratch. It is not a claim, and it is not shared between the Jobs.

## What it must not do

- Do not treat a Ready Pod as proof. The reader has to return the same hashes.
- Do not treat a local `fixture-pin.json` as this proof.
- Do not point the Nest API, the worker, or Compose at this Service.
- Do not edit `infra/kubernetes/lab/object-storage/`. SeaweedFS 4.54 stays the store.
- Do not edit `kind.yaml`, `up.sh`, `down.sh`, or `lib.sh` unless a printed failure names them.
- Do not publish a NodePort or a LoadBalancer. Do not publish on `0.0.0.0` or `[::]`.
- Do not put an access key or a secret key in Git.
- Do not create a campaign row. Do not treat a start package as an opening candidate.
- Do not delete Docker volumes. `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` must still be present after `down.sh`.

## Recovery limit

The objects live on the store claim from the object-storage procedure. Deleting the importer Pod does not delete those objects. Deleting the kind cluster does not preserve local-path data and is not a backup.

## Requirements

The cluster comes from [Kubernetes lab](kubernetes-lab.md). The store pin is the one in [Kubernetes object storage](kubernetes-object-storage.md).

| Tool or image | Pin |
| --- | --- |
| SeaweedFS | `docker.io/chrislusf/seaweedfs:4.54` |
| Node base, verification image only | `docker.io/library/node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee` |
| Lab importer/reader image | `offscreen-lab-content-bootstrap:boot02` |

## Create, smoke, and delete

Create the cluster with `infra/kubernetes/lab/up.sh` first. Then, from the repository root, using context `kind-offscreen-lab`:

```bash
infra/kubernetes/lab/up.sh
infra/kubernetes/lab/content-bootstrap/smoke.sh
infra/kubernetes/lab/down.sh
```

Hold `/tmp/offscreen-k8s-cluster.lock` from `up.sh` through `down.sh`. If the cluster already exists, stop. Do not delete a cluster this shell did not create.

When local Docker already has SeaweedFS and the bootstrap image, the smoke saves each image and imports it into each kind node with `ctr images import`. `kind load docker-image` is not used.

## Failure

If the read-only identity cannot be added, leave the Change unproven. Do not give the reader the writer Secret and call that least privilege.

If the reader hashes differ, the proof failed.

If the Service is not ClusterIP, the smoke stops.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

If `up.sh` says MemAvailable is below 4 GiB, stop. Do not raise the WSL cap.

## Observed local run

Machine: MemAvailable was 6066936 kB before create, 5983168 kB when `up.sh` checked, 5505344 kB after the cluster was ready, 5485084 kB at the smoke check. kind v0.33.0, node image `kindest/node:v1.37.0`. The API container published `127.0.0.1:6443` only.

Commands, from the repository root, in one shell holding `/tmp/offscreen-k8s-cluster.lock` (pid 188308):

```bash
infra/kubernetes/lab/up.sh
infra/kubernetes/lab/content-bootstrap/smoke.sh
infra/kubernetes/lab/down.sh
```

Results from that run on 2026-11-19, branch `change/boot02-cluster-pin`, baseline `93d57ca6`:

- Service type `ClusterIP`
- store image `docker.io/chrislusf/seaweedfs:4.54`, import index `sha256:4b42c212543a0acd4c0e675215ecdcaf62a186ef98def76c7e12701871222d15`, running image ID `sha256:d2dd0e2e16a2c0749be2a38eb3bda5620b9b740da3abbc877090b66c2fd9f0e4`
- job image `offscreen-lab-content-bootstrap:boot02`, import index `sha256:1d41b1b0629393f57352bb7da0f08ca8c1f96d5442efa44a8c4bc30e8f7ab520`
- bucket `lab-objects`
- world `5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9`
- rule `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab`
- start `e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813`
- importer Pod uid `1d177268-8810-4b3f-aad1-55008659034a`, then that Job was deleted
- reader Pod uid while the importer Pod was absent: `b23c0b53-6741-49ab-ae13-ae3e922da128`, and the three hashes matched
- importer reported `pinPath=null` and `campaignCreated=false`
- reader reported `match=yes` and `campaignCreated=false`

`down.sh` then removed `offscreen-lab`. `kind get clusters` reported no clusters. These volumes were still present: `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`. No Secret value was printed, and no credential was written under `infra/kubernetes/lab/content-bootstrap/`. No model call was made. The Nest API and the worker were not applied.

Deleting that kind cluster does not preserve the local-path files and is not a backup. The objects survived an importer Pod deletion only. They did not survive the cluster deletion.

## Pending integration

This procedure does not start `apps/api` or `apps/worker`. It does not claim the game uses the lab object store. Wiring those processes to `object-store.lab-objects.svc.cluster.local` remains pending.
