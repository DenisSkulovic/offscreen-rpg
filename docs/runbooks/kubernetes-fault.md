> **Future real-game Chaos Lab:** [architecture overview](../architecture/09-chaos-and-zero-token-play.md), [K8S10 source and execution design](../../work/changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/EXECUTION.md). That program is **planned only**; the observed proof below is deliberately limited to one Rabbit client losing a message ACK. Do **not** use this existing forced-delete run.sh as a general random app/PG/Temporal Pod killer.\n\n# Kubernetes fault harness

One worker-loss case on the disposable broker from [Kubernetes RabbitMQ](kubernetes-rabbitmq.md). The cluster procedure is [Kubernetes lab](kubernetes-lab.md). This is a laboratory experiment. It is not the game, not a Temporal Activity, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment).

The application acceptance row for a worker that dies after a database commit stays in [Tests that demonstrate the architecture](../technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture). This procedure does not run that row. There is no game database commit and no Activity completion.

## What this procedure is

Install the existing one-replica `lab-broker`, publish one persistent message whose body is a run id, and let a client pod apply it without acknowledging. Delete that pod. The durable queue still has the message. A second client then reads it with `redelivered=1` and acknowledges it.

The runner records four labels for that run id:

- `UNAVAILABLE` — the first consumer pod is gone.
- `NOT-LOST` — the message is ready again, with zero unacknowledged messages.
- `REPLAYED` — the second delivery has `redelivered=1`.
- `NEGATIVE-FAILED-AS-REQUIRED` — an exactly-once assertion sees two `APPLY` lines and exits 1.

The second label is the difference between a dead consumer and a lost message. The third and fourth labels are the difference between a replayed delivery and a duplicated side effect. The client is not idempotent. Two `APPLY` lines mean the effect ran twice.

## What it must not do

- Do not call a passing run machine-level high availability. The broker replica count is 1. There is no standby.
- Do not call the replay an exactly-once effect. The failing assertion is the proof that the effect can happen twice.
- Do not treat this as the application case where a worker dies after a database commit and the retry returns the existing outcome.
- Do not point the game, Temporal, or Compose at this broker. A broker message is not a committed story fact.
- Do not extract a game service. The clients are `python:3.12-alpine` pods. They load `infra/verification/smoke/rabbitmq/amqp_smoke.py`.
- Do not publish a Service as NodePort or LoadBalancer. Do not raise the WSL memory cap.
- Do not delete Docker volumes. Compose volumes, including `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`, stay outside this procedure.
- Do not run this against a shared or paid cluster. The only cluster name is `offscreen-release`.

## Requirements

| Piece | Pin |
| --- | --- |
| Cluster | `offscreen-release`, created by [Kubernetes lab](kubernetes-lab.md) |
| Broker | the one-replica broker from [Kubernetes RabbitMQ](kubernetes-rabbitmq.md) |
| Queue | `lab.durable`, durable classic |
| Client image | `docker.io/library/python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89` |
| Client limits | 200m CPU, 128Mi memory |
| Runner | `infra/verification/faults/run.sh` |

`up.sh` refuses to create the cluster when MemAvailable is below 4 GiB. This machine's MemTotal stayed 12249872 kB.

## Exactly-once assertion

`infra/verification/faults/assert_exactly_once.py` exits 0 when a log has one `APPLY` line. It exits 1 for any other count. The live runner concatenates the hold apply and the replay apply, then requires exit 1 and this line:

```text
ASSERTION-FAILED duplicated side effect: expected 1 APPLY, saw 2 for <run-id>
```

If that assertion exits 0, the harness fails. A green exactly-once result would hide the duplicate.

The fixture files check the script without a cluster:

```bash
python3 infra/verification/faults/assert_exactly_once.py infra/verification/faults/fixtures/one-apply.txt
python3 infra/verification/faults/assert_exactly_once.py infra/verification/faults/fixtures/two-applies.txt
```

The first command exits 0. The second exits 1. Those files are not a cluster run.

## Create, smoke, and delete

Hold `/tmp/offscreen-k8s-cluster.lock` for the whole sequence. If `offscreen-release` already exists, stop. Do not delete a cluster this shell did not create.

```bash
exec 9>/tmp/offscreen-k8s-cluster.lock
flock 9
infra/clusters/kind/release/up.sh
infra/platform/rabbitmq/install.sh
infra/verification/faults/run.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-release
```

`run.sh` takes no arguments. It does not create or delete the cluster. It removes its client pods and script ConfigMap when it exits. The broker stays until `down.sh` deletes the cluster. `down.sh` does not delete Compose volumes.

## Failure

If `up.sh` says MemAvailable is below 4 GiB, stop. Leave the suite not run. Do not raise the WSL cap and do not delete volumes to free space.

If `lab.durable` is not empty before publish, `run.sh` stops. It does not purge the queue.

If the message is still unacknowledged or missing after the consumer pod is gone, the case failed. Unavailable and lost are different outcomes. Do not describe a missing message as a successful replay.

If the exactly-once assertion exits 0, the negative case did not fail. Do not describe that run as proof that a duplicate was detected.

If a check says a Docker volume outside the cluster disappeared, stop and do not run a broader Docker prune.

## Observed local run

2026-11-19, on this worktree, branch `change/k8s10-fault-harness`. One shell held `/tmp/offscreen-k8s-cluster.lock`, created `offscreen-release` only after that name was absent, and deleted that same cluster before it released the lock. Commands, in order: `infra/clusters/kind/release/up.sh`, `infra/platform/rabbitmq/install.sh`, `infra/verification/faults/run.sh`, `infra/clusters/kind/release/destroy.sh kind-offscreen-release`.

Versions printed by `run.sh`: Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, server v1.37.0. Broker replicas were 1. Broker pod uid `a96963db-6624-4f0a-ab16-63aa05d5c24e` was the same after the worker pod was deleted. Client image and image ID were `docker.io/library/python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89`. No paid provider call was made. No plot image was written. The memory samples below are the hardware record.

| Moment | MemAvailable KiB |
| --- | --- |
| `up.sh` start | 5672340 |
| Cluster ready | 5176444 |
| `install.sh` start | 5227024 |
| Broker ready | 5074500 |
| `run.sh` start | 5066592 |
| After worker delete | 5119604 |
| After replay ack | 5100720 |
| After `down.sh` | 6131344 |

After teardown, MemTotal was 12249872 kB.

Run id `fault-ed09a6e1b8b5c5f5`:

- Publish printed `PUBLISHED fault-ed09a6e1b8b5c5f5`. The queue was `lab.durable`, 0 messages, 0 unacknowledged.
- The hold worker pod uid was `591c23db-2e89-4a5e-92f1-d9f7309644ae`. Its log was `APPLY fault-ed09a6e1b8b5c5f5 redelivered=0`. The session transcript dropped that line because `grep -q` closed the pipe. The runner's hold log kept it. The committed `run.sh` now prints the line after that gate.
- The pod was force-deleted. The queue was then 1 message and 1 unacknowledged, then 1 message and 0 unacknowledged. The runner printed `UNAVAILABLE` for that pod uid and `NOT-LOST` for the run id.
- The drain printed `APPLY fault-ed09a6e1b8b5c5f5 redelivered=1` and `DRAIN fault-ed09a6e1b8b5c5f5 redelivered=1`. The runner printed `REPLAYED`.
- The two apply lines were `redelivered=0` and `redelivered=1` for the same run id. `assert_exactly_once.py` exited 1 with `ASSERTION-FAILED duplicated side effect: expected 1 APPLY, saw 2 for fault-ed09a6e1b8b5c5f5`. The runner printed `NEGATIVE-FAILED-AS-REQUIRED`.
- The queue was then 0 messages and 0 unacknowledged. The API containers published `127.0.0.1:6443` only.

`down.sh` deleted `offscreen-release`. `kind get clusters` then printed `No kind clusters found.` `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were still present.

The same day, before the cluster run, the one-apply fixture exited 0 and the two-apply fixture exited 1. That fixture pair is the assertion's local negative case. The cluster result above is the live one.

This pass is at-least-once redelivery on one replica. It is not machine-level high availability. It does not show a Temporal retry returning an existing database outcome.
