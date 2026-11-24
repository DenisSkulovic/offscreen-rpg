# Kubernetes content bootstrap

One importer Job and one reader Job on the [Kubernetes lab](kubernetes-lab.md) cluster. The jobs publish and read the pinned Seyda Neen fixture in the store from [Kubernetes object storage](kubernetes-object-storage.md). This is not the game, not the Nest API, not the worker, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

A local `fixture-pin.json` from [Content package authoring](content-package-authoring.md#commands) is not this proof. Import still publishes a package manifest only. It does not create a campaign. A start package is not a successful opening candidate.

## What this procedure is

`infra/verification/release-acceptance/content-bootstrap/smoke.sh` requires an installed store from [Kubernetes object storage](kubernetes-object-storage.md). It does not apply store manifests or create `object-store-s3`. The bucket is `lab-objects`. The Service is `object-store.lab-objects.svc.cluster.local` on port 8333, ClusterIP only.

The smoke then runs two Jobs in `lab-content-bootstrap`:

- `fixture-importer` runs `scripts/repo-tools/import-pinned-fixture.mjs --s3` against that store. It checks the pinned world, rule, and start checksums. It does not write `fixture-pin.json`.
- `fixture-reader` is a different Pod. It runs `scripts/repo-tools/read-pinned-fixture.mjs --s3` and must return those same three hashes.

The importer Job is deleted before the reader runs, so the reader cannot be reading a file from the importer container.

Game Authority and Storyteller are not started. The Nest API and the worker are not applied.

## Credentials

The store admin Secret `object-store-s3` in `lab-objects` comes from `infra/platform/object-storage/install.sh`. The smoke reads it only while creating or verifying `content-importer-s3`. That importer Secret is create-only: an existing Secret with the same bytes is reused; a byte mismatch is refused. The reader Job reads `content-reader-s3`. When that Secret already exists, the smoke reuses it and does not reconfigure the store. When both the reader Secret and a confirmed-absent `content-reader` identity are missing, the smoke adds the identity with `s3.configure` and the action `Read` on `lab-objects`, then creates `content-reader-s3`. If identity state is ambiguous, the smoke refuses instead of overwriting credentials. A failed reader configure leaves partial state and requires explicit repair; this smoke does not blind-rotate keys. None of those values are written into Git. The smoke refuses to run if this directory contains a Secret manifest or an `AKIA` literal.

## What the jobs must show

- The reader world, rule, and start hashes equal the importer hashes, and those hashes equal the trusted pins.
- The importer reports `pinPath=null` and `campaignCreated=false`.
- A missing object hash fails closed inside the reader process.
- Each Job mounts one emptyDir at `/tmp`. That volume is client scratch. It is not a claim, and it is not shared between the Jobs.

## What it must not do

- Do not treat a Ready Pod as proof. The reader has to return the same hashes.
- Do not treat a local `fixture-pin.json` as this proof.
- Do not point the Nest API, the worker, or Compose at this Service.
- Do not edit `infra/platform/object-storage/`. SeaweedFS 4.54 stays the store.
- Do not edit `kind.yaml`, `up.sh`, `destroy.sh`, or `lib.sh` unless a printed failure names them.
- Do not publish a NodePort or a LoadBalancer. Do not publish on `0.0.0.0` or `[::]`.
- Do not put an access key or a secret key in Git.
- Do not create a campaign row. Do not treat a start package as an opening candidate.
- Do not delete Docker volumes outside this cluster. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain after `down.sh`. A clone that has neither volume is valid.

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

Create the cluster with `infra/clusters/kind/release/up.sh` first. Then, from the repository root, using context `kind-offscreen-release`:

```bash
infra/clusters/kind/release/up.sh
infra/platform/object-storage/install.sh
infra/verification/release-acceptance/content-bootstrap/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-release
```

Hold `/tmp/offscreen-k8s-cluster.lock` from `up.sh` through `down.sh`. If the cluster already exists, stop. Do not delete a cluster this shell did not create.

When local Docker already has SeaweedFS and the bootstrap image, the smoke loads each image onto every kind node with `kind load docker-image`. A `docker save | docker exec -i ctr import` loop is not used: that loop can consume the node list and leave the worker without the image. On 2026-11-20 that loop left `offscreen-lab-content-bootstrap:boot02` off `offscreen-release-worker`, and the importer stayed `ErrImageNeverPull` until `kind load` put the image on both nodes.

## Failure

If the read-only identity cannot be added, or partial reader state needs repair, leave the Change unproven. Do not give the reader the writer Secret and call that least privilege. Do not set `OFFSCREEN_CONTENT_BOOTSTRAP_FAULT_INJECTION` unless a separately authorized repair procedure says so.

If the reader hashes differ, the proof failed.

If the Service is not ClusterIP, the smoke stops.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

If `up.sh` says MemAvailable is below 4 GiB, stop. Do not raise the WSL cap.

## Observed local run

Machine: MemAvailable was 6066936 kB before create, 5983168 kB when `up.sh` checked, 5505344 kB after the cluster was ready, 5485084 kB at the smoke check. kind v0.33.0, node image `kindest/node:v1.37.0`. The API container published `127.0.0.1:6443` only.

Commands, from the repository root, in one shell holding `/tmp/offscreen-k8s-cluster.lock` (pid 188308):

```bash
infra/clusters/kind/release/up.sh
infra/platform/object-storage/install.sh
infra/verification/release-acceptance/content-bootstrap/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-release
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

`down.sh` then removed `offscreen-release`. `kind get clusters` reported no clusters. These volumes were still present: `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`. No Secret value was printed, and no credential was written under `infra/kubernetes/lab/content-bootstrap/`. No model call was made. The Nest API and the worker were not applied.

Deleting that kind cluster does not preserve the local-path files and is not a backup. The objects survived an importer Pod deletion only. They did not survive the cluster deletion.

## Integration handoff (BOOT03, TURN02)

BOOT02 stops after immutable package objects exist in the shared lab store and a **separate** Pod can read the same three root hashes after the importer Pod is gone. That 2026-11-19 proof is recorded in [Observed local run](#observed-local-run) above; this section does not add new cluster evidence and does not claim a campaign, opening candidate, or story start from S3 alone.

### Exact manifests and store path

| Artifact | Path or value |
| --- | --- |
| Bootstrap namespace | `lab-content-bootstrap` — `infra/verification/release-acceptance/content-bootstrap/namespace.yaml` |
| Object-store namespace | `lab-objects` — installed by `infra/platform/object-storage/install.sh` before this smoke runs |
| Importer Job | `fixture-importer` — `infra/verification/release-acceptance/content-bootstrap/importer-job.yaml` |
| Reader Job | `fixture-reader` — `infra/verification/release-acceptance/content-bootstrap/reader-job.yaml` |
| Orchestration | `infra/verification/release-acceptance/content-bootstrap/smoke.sh` |
| S3 endpoint | `http://object-store.lab-objects.svc.cluster.local:8333` |
| Bucket | `lab-objects` |
| Importer entrypoint | `scripts/repo-tools/import-pinned-fixture.mjs --s3` (writer credentials: Secret `content-importer-s3`) |
| Reader entrypoint | `scripts/repo-tools/read-pinned-fixture.mjs --s3` (read-only credentials: Secret `content-reader-s3`) |
| Job image pin | `offscreen-lab-content-bootstrap:boot02` — built from `infra/verification/release-acceptance/content-bootstrap/Dockerfile`, digest recorded in [Observed local run](#observed-local-run) |

Pinned content-addressed roots (package manifests), identical on import and read:

| Package | Root hash |
| --- | --- |
| World | `5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9` |
| Rule | `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab` |
| Start | `e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813` |

Importer and reader Jobs set `OFFSCREEN_DOCUMENT_STORE=s3` and the endpoint, bucket, and path-style flags shown in those manifests. They mount only an `emptyDir` at `/tmp` for client scratch. They do not mount a repository `content/` directory, do not write `fixture-pin.json` on `--s3`, and must report `campaignCreated=false`.

### What downstream Changes own

| Owner | Responsibility | Boundary |
| --- | --- | --- |
| [TURN02](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--turn02-compose-real-kubernetes-application-release/TASKS.md) | Run the importer **once** per release overlay, then wire API, GA, and worker Pods to read the **same** S3 endpoint, bucket, and root hashes at runtime | Release must not bundle arbitrary `content/` trees into runtime images or re-import on every Pod start. TURN02 **T01** in that TASKS file loads the default rule manifest by content hash from the imported store instead of `importRulePackageDirectory` from a local path |
| [BOOT03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--boot03-game-authority-start-admission/TASKS.md) | After pins are readable in the real store, admit a **succeeded Storyteller-kind** opening candidate and commit start through Game Authority | Import does not create an owned candidate. A start package root is not a successful opening candidate. Story start is not claimed from the importer or reader Jobs |

Do not treat BOOT02's reader Job as a substitute for BOOT03 integration tests or for TURN02's authenticated application release. Do not point Compose at the disposable lab store unless a separately authorized proof says so.

### Accepted Pod proof already on record (2026-11-19)

The following satisfied BOOT02's discriminating positive case without starting the game:

- Importer Pod uid `1d177268-8810-4b3f-aad1-55008659034a`, then that Job was deleted
- Reader Pod uid `b23c0b53-6741-49ab-ae13-ae3e922da128` while the importer Pod was absent; `match=yes`, same three hashes
- `pinPath=null` and `campaignCreated=false` on both paths
- Lock pid `188308` on `/tmp/offscreen-k8s-cluster.lock`; baseline `93d57ca6` on branch `change/boot02-cluster-pin`

A new Pod run is required only when importer image or Job manifests change materially (BOOT02 **T03** in [BOOT02 TASKS](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--boot02-published-fixture-package-s3-job/TASKS.md)).
