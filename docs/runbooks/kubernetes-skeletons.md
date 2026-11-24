# Kubernetes service skeletons

Disposable placeholder workloads on the [Kubernetes lab](kubernetes-lab.md) cluster. This is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

The selected rows are web/API, the engine, the Storyteller, and notifications. [Proposed service ownership](../technical/platform/topology.md#proposed-service-ownership) names those rows and rejects a Game Economy service. These pods do not extract that ownership. A ready pod is not a game service.

## What this procedure is

Install four synthetic processes in namespace `lab-skeletons`: `web-api`, `engine`, `storyteller`, and `notifications`. Each one is a Python process with a readiness probe and a liveness probe. Every Service is ClusterIP. The host does not port-forward them.

A synthetic command uses contract `offscreen.synthetic-command.v1` and one operation id of the form `lab-op-` plus sixteen hex characters. Web/API forwards that command to the engine and returns HTTP 202. That 202 means the edge accepted the HTTP call. It is not a commit, and it is not an SSE hint. The engine keeps the only synthetic effect for that operation id. A second delivery of the same id is visible as a second attempt and does not record a second effect.

The engine is the only process whose status says `checkpointWriter`. That flag means this placeholder will record the synthetic effect. It does not mean the process writes the game database or a scene checkpoint. The Storyteller returns `synthetic-proposal` and rejects `POST /commit`. Notifications can record one delivery for the operation id. A duplicate delivery does not apply an effect. Neither consumer writes the synthetic item holder.

## What it must not do

- Do not read four ready pods as Next, Nest, a backend-for-frontend, or a deployed game. The image is `python:3.12-alpine`. There is no WebSocket server and no Cognee process.
- Do not add a Game Economy container. The synthetic item is one fixed token, `sword-a`, used to show a holder limit. It is not an inventory, a market, or a currency.
- Do not call a model, take a payment, or write the game database. Nothing here opens PostgreSQL.
- Do not treat the older-scene check as a historical fork. `scene-older` keeps holder `holder-early` after `scene-later` records holder `holder-late`. The response limit is `contract-assertion`, and `historicalFork` is false. [Scene history and alternate continuities](../product/foundations/vision.md#scene-history-and-alternate-continuities) remains the product promise. This procedure does not implement it.
- Do not publish a workload on `0.0.0.0` or `[::]`. Do not create a NodePort, a LoadBalancer, or an Ingress.
- Do not install RabbitMQ or the collector again. This slice does not use them.
- Do not delete Docker volumes outside this cluster. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain after `down.sh`. A clone that has neither volume is valid.

## Pins

| Piece | Pin |
| --- | --- |
| Workloads | `web-api`, `engine`, `storyteller`, `notifications`, one replica each |
| Image | `python:3.12-alpine`, digest `sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89` |
| Memory limit | 64Mi for each placeholder |
| CPU limit | 100m for each placeholder |
| Service | ClusterIP on port 8080 |
| Contract | `offscreen.synthetic-command.v1` |

The node pulls the image. This procedure does not run `kind load docker-image`.

## Older scene assertion

Before any accepted command, both synthetic scenes show `sword-a` held by `holder-early`. The accepted command names `scene-later` and `holder-late`. After it is applied once:

- `scene-later` shows `holder-late`
- `scene-older` still shows `holder-early`
- `GET /contract/older-scene-holder` sets `olderHolderUnchanged` and `transferDemonstrated`, sets `historicalFork` to false, and sets `proposedForkInheritsLaterState` to false

A command that names `scene-older` is rejected. The edge returns that rejection. It does not turn the rejection into HTTP 202. This is the contract assertion. It is not evidence that a player can fork an old scene.

## Create, smoke, and delete

Hold the shared cluster lock for the whole sequence. If the cluster already exists, stop. Do not delete a cluster this shell did not create.

```bash
exec 9>/tmp/offscreen-k8s-cluster.lock
flock 9
infra/clusters/kind/release/up.sh
infra/verification/fixtures/skeletons/install.sh
infra/verification/fixtures/skeletons/smoke.sh
infra/clusters/kind/release/down.sh
```

`install.sh` and `smoke.sh` take no arguments. They use `kubectl --context kind-offscreen-lab`. `down.sh` deletes the kind cluster. It does not delete Compose volumes.

## Failure

If a placeholder Deployment does not become Available, read its events and leave the Change unproven. Do not treat a written manifest as a delivered command.

If the smoke log lacks `duplicate-delivery-no-second-effect` or `older-scene-holder-unchanged`, the smoke fails. A ready pod does not replace those lines.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

## Observed local run

On 2026-11-19 one locked shell created `offscreen-lab`, installed the four placeholders, passed the smoke, and deleted the cluster. Host tools were Docker 29.9.3, kind v0.33.0, and kubectl client v1.37.2. The node image was `kindest/node:v1.37.0` (Kubernetes v1.37.0). No paid provider call was made. `kind load docker-image` was not used. The node pulled `python:3.12-alpine` at digest `sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89`.

All four pods were `1/1` Running: `web-api`, `engine`, `storyteller`, and `notifications`. Each Service was `ClusterIP`. No Ingress and no volume claim were present. The kind containers published `127.0.0.1:6443` only.

`smoke.sh` then showed operation id `lab-op-63a4dfc2e42eb470`:

- The first delivery returned HTTP 202 with `committed` false and `engineEffectCount` 1.
- The duplicate delivery was seen (`attempts-seen:2`) and the effect count stayed 1 (`duplicate-delivery-no-second-effect`).
- `scene-older` stayed on `holder-early` after `scene-later` moved `sword-a` to `holder-late`. The log lines were `older-scene-holder-unchanged` and `historical-forks-not-implemented`.
- The Storyteller rejected commit. Notifications recorded one delivery and applied no effect.

A ready pod is not a game service. This run did not deploy Next, Nest, a model, a payment call, or the game database.

MemAvailable was 7447084 kB before create, 7409092 kB after the nodes were ready, and 7310936 kB during the smoke. `down.sh` removed `offscreen-lab`. `kind get clusters` then listed none. `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present after delete.
