# Kubernetes observability

Disposable OpenTelemetry collector on the [Kubernetes lab](kubernetes-lab.md) cluster. This is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

The game observer remains planned. [Recommendation](../technical/platform/topology.md#recommendation) still lists OpenTelemetry and Langfuse as proposed, and [Observability](../technical/platform/deployment-and-compatibility.md#observability) still has no proof that an observer of the game is deployed. This page records one synthetic lab slice. A ready collector does not mean the game is traced.

## What this procedure is

Install one pinned core collector in `lab-a`, plus two synthetic HTTP processes named `hop-a` and `hop-b`. `hop-a` calls `hop-b` and both export OTLP/HTTP to the collector. The collector's debug exporter prints the trace. There is no Prometheus, Grafana, Loki, Tempo, or Jaeger in this slice. Nothing here is the API, a Temporal worker, or a Storyteller.

The shared kind configuration does not publish a workload port. This procedure does not change that file. Every Service is ClusterIP. The host does not port-forward the collector.

## What it must not do

- Do not read a ready collector as coverage of the game. The synthetic hops are the only clients, and only the calls this smoke makes are exported.
- Do not put a player identifier, story text, prompt, or secret in a label, attribute, or log body. `operation.id` is a generated `lab-op-` value with sixteen hex characters. The failure metric's only attribute is `failure.signal=second_hop_missing`.
- Do not install the game, PostgreSQL, Redis, RabbitMQ, or Temporal on this collector.
- Do not publish a workload on `0.0.0.0` or `[::]`. Do not create a NodePort or LoadBalancer Service.
- Do not put a token or password in the manifest. The collector config has no exporter credentials.
- Do not delete Docker volumes outside this cluster. If `offscreen-rpg_postgres-data` or `offscreen-rpg_temporal-data` already exist, they must remain after `down.sh`. A clone that has neither volume is valid.

## Pins

| Piece | Pin |
| --- | --- |
| Collector | `otel/opentelemetry-collector` `0.165.0`, digest `sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73` |
| Collector memory limit | 192Mi, with the process limiter at 96 MiB |
| Synthetic image | `python:3.12-alpine`, digest `sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89` |
| Hop memory limit | 64Mi each |
| Export | OTLP/HTTP to `otel-collector:4318`, debug exporter, batch timeout 200ms |

The collector image runs as uid 10001. Each hop runs as uid 65534. Both root filesystems are read-only.

## Two-hop trace

`GET /call` on `hop-a` generates a trace id and an operation id, then calls `GET /hop` on `hop-b` with a W3C `traceparent`. `hop-b` exports a server span named `synthetic.hop_b` whose parent is the `hop-a` span. `hop-a` then exports a client span named `synthetic.hop_a`. Both spans carry the same trace id and the same `operation.id`.

That is one trace across two processes. It is not a trace of every request, and it is not a trace of play.

## Missing second hop

The smoke scales `hop-b` to zero and waits until that pod is gone and the Service has no endpoints. A terminating pod can still answer after the endpoints list is already empty, so that answer is not the failure signal. The recorded `/call` does not retry the hop. `hop-a` exports three records that share the new operation id:

- a client span with status `Error` and `failure.signal=second_hop_missing`
- a log whose body is `second_hop_missing`
- one monotonic counter point named `synthetic_second_hop_missing`

The counter point does not carry `operation.id`. The error trace does not include a `synthetic.hop_b` span. No second hop was contacted.

## Create, smoke, and delete

Hold the shared cluster lock for the whole sequence. If `up.sh` says the cluster already exists, stop. Do not delete a cluster this shell did not create.

```bash
exec 9>/tmp/offscreen-k8s-cluster.lock
flock 9
infra/kubernetes/lab/up.sh
infra/kubernetes/lab/observability/install.sh
infra/kubernetes/lab/observability/smoke.sh
infra/kubernetes/lab/down.sh
```

`install.sh` and `smoke.sh` take no arguments. They use `kubectl --context kind-offscreen-lab`. `down.sh` deletes the kind cluster. It does not delete Compose volumes.

## Failure

If the collector Deployment does not become Available, read its events and leave the Change unproven. Do not treat a written manifest as a collected trace.

If the success log has no parent span, or the missing-hop log still contains `synthetic.hop_b` for that trace id, the smoke fails.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

## Observed local run

On 2026-11-19 two locked shells each created `offscreen-lab` and deleted it. Host tools were Docker 29.9.3, kind v0.33.0, and kubectl client v1.37.2. The node image was `kindest/node:v1.37.0` (Kubernetes v1.37.0, containerd 2.3.4). MemTotal was 12249872 kB. No paid provider call was made.

The first shell installed the collector and recorded one two-hop trace, `a22a50083d043cc913e7973cf19b7cf9`, with hop-a span `6588436e2638dc87` parenting hop-b span `93a9b03a0e5315c2` and operation id `lab-op-9556b04ddc5d2f44`. The missing-hop call was made while the hop-b pod was still terminating. That call still returned `two-hop` for trace `b6527be7912c7861c7e56cd6e6404ed3`. The failure metric was absent, the smoke exited 1, and `down.sh` deleted that cluster. An endpoints list that is already empty is not proof that the second process is gone.

The second shell is the proof. `install.sh` printed `otelcol version 0.165.0`. The running collector imageID was `docker.io/otel/opentelemetry-collector@sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73`. All three Services were `ClusterIP`. The kind containers published `127.0.0.1:6443` only.

`smoke.sh` then showed:

- `GET /call` returned `two-hop` for trace `2e023d6798ea76492be2d34a51fcc819`, hop-a span `5ebb85484368ca00`, hop-b span `2e9d3992e1d78938`, operation id `lab-op-388b4896361f77b7`. The collector log contained both span names, and the hop-b parent id was the hop-a span. That log did not yet contain `second_hop_missing`.
- After `hop-b` reached zero pods and no endpoints, the next `/call` returned `second_hop_missing` for trace `a53d284c589bfd00a3cf48624ec0b332`, span `843cc64bb71f730a`, operation id `lab-op-97be9954dfca3fb1`. The collector log contained that trace with status `Error`, the log body `second_hop_missing`, and the counter `synthetic_second_hop_missing`. The counter record did not carry `operation.id`. That trace did not name `synthetic.hop_b`.

Those two calls are the exported calls. This does not mean any other request was traced, and it does not mean the game was traced.

MemAvailable was 9036868 kB before the proof create, 8777056 kB after the nodes were ready, 8671788 kB during the smoke, and 9397328 kB after delete. `docker stats` showed the control plane at 695.8MiB and the worker at 273MiB. `down.sh` removed `offscreen-lab`. `kind get clusters` then listed none. These volumes were present before and after: `offscreen-rpg_postgres-data`, `offscreen-rpg_temporal-data`, `4a4eb6ed5b672961f32560c6b1bd2de67acdf2102c4a168371b003aa3917b3ae`, and `d153382368c28ea4cedc4d528099bddd86a7b3f6d9297722ad7775b58d7f3ae2`.
