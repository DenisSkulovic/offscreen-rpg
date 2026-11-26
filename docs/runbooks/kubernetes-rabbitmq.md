# Kubernetes RabbitMQ (native optional platform)

Optional RabbitMQ on the disposable kind clusters from [Kubernetes lab](kubernetes-lab.md). It is **not** the game, not the PostgreSQL outbox, not a shared development broker by default, and not [First hosted deployment](../technical/platform/deployment-and-delivery.md#first-hosted-deployment). Enable only when an actual consumer requirement exists and authorized live proof is in scope.

Implementation and contract: [Native RabbitMQ infrastructure](../technical/platform/rabbitmq-native-infrastructure.md). **Runtime live install, fresh release runtime, migration, and fault proof are NOT RUN** on the integration branch; source tests exist under `infra/platform/rabbitmq/tests/` and `infra/verification/smoke/rabbitmq/`.

## What the native chart installs

Render-only chart at `infra/platform/rabbitmq/chart/`: **Namespace** and **RabbitmqCluster** named `rabbitmq`.

| Profile | Kubernetes context | Broker namespace |
| --- | --- | --- |
| dev | `kind-offscreen-dev` | `offscreen-dev-rabbitmq` |
| release | `kind-offscreen-release` | `offscreen-rabbitmq` |

Both profiles are source-supported. Core dev worktree stacks and default warm release ensure **exclude** RabbitMQ unless explicitly selected (`--rabbitmq` on provisioning ensure, or direct `install.mjs` with authorization).

`install.mjs` applies pinned cert-manager v1.21.3, RabbitMQ cluster operator v2.23.3, then the namespace and cluster custom resource. No `definitions.json`, no fixed queue names, no `release-install.mjs`. Operator-generated credentials; no Git-stored broker password.

Broker image (pinned in chart): `docker.io/library/rabbitmq:4.3.4-management@sha256:eb5295d083325da5929a5ade766684d4019ffd2bce8bc7e43d6f9a05cafc8646`. Service type ClusterIP, one replica, persistence 5Gi (dev `standard`, release `local-path`).

## What it must not do

- Do not treat optional RabbitMQ as proof that production or dev messaging is wired.
- Do not call one replica high availability.
- Do not assume exactly-once processing; protocol proof uses run-scoped queue names, not application topology.
- Do not run ensure/install without explicit authorization and target context confirmation.
- Do not adopt or upgrade a legacy `messaging` / `lab-broker` installation; census returns **legacy occupied** and refuses writes.

## Source verification (no cluster mutation)

```bash
node --test infra/platform/rabbitmq/tests/*.test.mjs infra/verification/smoke/rabbitmq/proof.test.mjs
python3 -m unittest discover -s infra/verification/smoke/rabbitmq -p 'test_*.py'
```

Or `pnpm infra:verify --suite source` for registered Node groups. Bash wrapper syntax: `bash -n infra/platform/rabbitmq/install.sh infra/verification/smoke/rabbitmq/smoke.sh infra/verification/faults/run.sh`.

## Authorized live entry (owner-operated, NOT RUN here)

Live install is **not** documented as passed on current HEAD. When separately authorized:

```bash
OFFSCREEN_RABBITMQ_ENSURE=authorized node infra/platform/rabbitmq/install.mjs ensure <dev|release> <context-confirmation>
OFFSCREEN_RABBITMQ_PROOF=authorized node infra/verification/smoke/rabbitmq/proof.mjs smoke dev kind-offscreen-dev
```

Release ensure on an occupied legacy release cluster is expected to refuse with zero writes (negative acceptance). Fresh release runtime proof remains gated.

## Historical legacy lab run (2026-11-19, superseded contract)

The paragraphs below describe the **retired** `messaging` / `lab-broker` / `lab.durable` procedure. They are retained as archival evidence only, not current operator steps.

2026-11-19, under `flock` of `/tmp/offscreen-k8s-cluster.lock`. Commands: `infra/clusters/kind/release/up.sh`, legacy `infra/platform/rabbitmq/install.sh`, `infra/verification/smoke/rabbitmq/smoke.sh`, `infra/clusters/kind/release/destroy.sh kind-offscreen-release`. That smoke used namespace `messaging`, cluster `lab-broker`, queue `lab.durable`, and user `lab-client`. Do not replay that sequence as native v1 acceptance.