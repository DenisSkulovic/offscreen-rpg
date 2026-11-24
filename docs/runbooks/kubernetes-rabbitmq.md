# Kubernetes RabbitMQ

One RabbitMQ broker on the disposable kind cluster from [Kubernetes lab](kubernetes-lab.md). This is an **optional** laboratory procedure only. It is not the game, not the PostgreSQL outbox, not a shared development broker, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment). Nothing in the application packages or dev stack consumes this broker by default. Enable it only when an actual consumer requirement exists and this lab proof is in scope. The delivery limit is [Laboratory messaging broker](../technical/platform/execution-and-delivery.md#laboratory-messaging-broker).

Chart, `release-install.mjs`, install script, vendor pins, and focused tests live in `infra/platform/rabbitmq/`. The Helm chart is `infra/platform/rabbitmq/chart/`. Only the **release** profile renders chart sections; `node infra/platform/common/cli.mjs render rabbitmq dev …` refuses with `release-only`. Dev worktree stacks do not include this broker.

## What this procedure is

Install cert-manager v1.21.3, then RabbitMQ cluster operator v2.23.3, then one `RabbitmqCluster` named `lab-broker` in namespace `messaging`. cert-manager is here because the pinned operator manifest issues webhook certificates through it. It is not a second broker.

The broker image is `docker.io/library/rabbitmq:4.3.4-management`. The Service is ClusterIP. The replica count is 1. The queue `lab.durable` is a durable classic queue in `infra/platform/rabbitmq/definitions.json`. RabbitMQ 4 imports that file only after `lab-client` exists. Importing it at boot fails, because the default vhost and the declarative user are not both present yet. The user is `lab-client`. `install.sh` generates the password into Secret `lab-broker-user` and does not store that password in Git. Guest is not the client.

The smoke publishes three persistent messages, deletes the broker pod, and reads the messages back from the same volume claim. It acks message 1, kills the consumer that has message 2 unacked, and reads message 2 again with the redelivered flag set. That second delivery is a duplicate. The smoke then shows a guest login from another pod is refused.

## What it must not do

- Do not call this high availability. One replica has no standby.
- Do not call redelivery exactly-once processing. The duplicate is the proof that the effect can happen twice.
- Do not point the game, Temporal, dev profiles, or Compose at this broker. A broker message is not a committed story fact.
- Do not treat optional lab RabbitMQ as proof that production or dev messaging is wired. Install and smoke here do not modify application env or package manifests.
- Do not publish the Service as NodePort or LoadBalancer. Do not put the password in Git.
- Do not delete Docker volumes. Compose volumes, including `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`, stay outside this procedure.
- Do not raise the WSL memory cap. The broker request is 1 GiB, below the operator default of 2 GiB, so the lab can fit the machine that already runs the kind cluster.

## Requirements

Pinned manifests, checked by sha256 before apply:

| Tool or image | Pin |
| --- | --- |
| cert-manager manifest | v1.21.3, `infra/platform/rabbitmq/vendor/cert-manager-v1.21.3.yaml`, sha256 `c04a51295adda2b1a775146751f973e787190778c7f35180861d9678876e5c74` |
| RabbitMQ cluster operator | v2.23.3, `infra/platform/rabbitmq/vendor/cluster-operator-v2.23.3.yml`, sha256 `3ccd8a7c8a7f319ff21c444f3599829242f3cc1c18ae2dedea170cfcefeb8681`, image `ghcr.io/rabbitmq/cluster-operator:2.23.3` |
| Broker image | `docker.io/library/rabbitmq:4.3.4-management` |
| Smoke client | `docker.io/library/python:3.12-alpine` |

The cluster must already exist. Create and delete it with [Kubernetes lab](kubernetes-lab.md). The storage class is `local-path`.

## Install, smoke, and delete

From the repository root, after `infra/clusters/kind/release/up.sh`:

```bash
infra/platform/rabbitmq/install.sh
infra/verification/smoke/rabbitmq/smoke.sh
infra/clusters/kind/release/destroy.sh kind-offscreen-lab
```

`install.sh` and `smoke.sh` take no arguments. `smoke.sh` removes its client pods and script ConfigMap when it exits. It leaves the broker in place until `down.sh` deletes the cluster. `down.sh` does not delete Compose volumes.

## Failure

If the broker pod stays Pending, read its events before deleting the cluster. A 1 GiB memory request that cannot schedule means the worker is full. Do not raise the request to the operator default of 2 GiB to force it, and do not raise the WSL cap.

If guest can log in from the client pod, stop. The user in Git and in the Secret must stay `lab-client`.

If message 2 does not come back with `redelivered=1` after the consumer pod is force-deleted, the crash test failed. Do not describe that run as exactly-once.

If `up.sh` was not run in this same locked shell, do not delete a cluster this procedure did not create.

## Observed local run

2026-11-19, on this worktree, under `flock` of `/tmp/offscreen-k8s-cluster.lock`. Commands, in order: `infra/clusters/kind/release/up.sh`, `infra/platform/rabbitmq/install.sh`, `infra/verification/smoke/rabbitmq/smoke.sh`, `infra/clusters/kind/release/destroy.sh kind-offscreen-lab`.

Versions printed by the smoke: Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, server v1.37.0. Operator image `ghcr.io/rabbitmq/cluster-operator:2.23.3`. Broker image `docker.io/library/rabbitmq:4.3.4-management`, image ID `docker.io/library/rabbitmq@sha256:eb5295d083325da5929a5ade766684d4019ffd2bce8bc7e43d6f9a05cafc8646`, `rabbitmqctl` version 4.3.4. Replicas 1. Service ClusterIP. The only user was `lab-client` with tag administrator. Client image `docker.io/library/python:3.12-alpine`, image ID `docker.io/library/python@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89`.

The smoke printed `PUBLISHED 1`, `PUBLISHED 2`, and `PUBLISHED 3`. After the broker pod was deleted and became Ready again, `lab.durable` was durable, classic, and held 3 messages. It printed `ACK 1 redelivered=0`. The hold wait matched `HOLD 2 redelivered=0` before the consumer pod was force-deleted. The queue then returned to 2 messages and 0 unacknowledged. The drain printed `DRAIN 2 redelivered=1` and `DRAIN 3 redelivered=0`. Guest from the client pod printed `GUEST-DENIED reset`: RabbitMQ closed the TCP connection instead of sending an AMQP close code. The smoke ended with its at-least-once, one-replica line.

`down.sh` deleted cluster `offscreen-lab`. `kind get clusters` then printed `No kind clusters found.` The volume list after teardown matched the list from before `up.sh`, including `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`. No paid provider call was made.
