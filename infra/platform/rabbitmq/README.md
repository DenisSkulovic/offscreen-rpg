# RabbitMQ platform (native v1)

Optional singleton broker on owned **dev** (`kind-offscreen-dev`) or **release** (`kind-offscreen-release`) clusters. This is not the game, not Compose, and not activated by default dev stacks or warm release ensure.

Canonical contract: [rabbitmq-native-infrastructure](../../../docs/technical/platform/rabbitmq-native-infrastructure.md). **Runtime NOT RUN** for fresh install, release proof, migration, and fault scenarios until separately authorized live acceptance.

## Layout

- `chart/` — render-only Helm chart: **Namespace** + **RabbitmqCluster** only (`namespace` and `broker` sections; no definitions, topology operator, or external secret).
- `install.mjs` — `plan|ensure|status` for dev or release with explicit context and authorization (`OFFSCREEN_RABBITMQ_ENSURE=authorized` on ensure).
- `install.sh` — no-arg release wrapper: `node install.mjs ensure release kind-offscreen-release` (does not set authorization itself).
- `vendor/` — pinned cert-manager and cluster-operator manifests (transformed at apply time).
- `tests/` — chart render, inventory, readiness, lifecycle, and install source tests (see `pnpm infra:verify --suite source`).

Dev namespace `offscreen-dev-rabbitmq`; release namespace `offscreen-rabbitmq`. Broker name `rabbitmq`. Legacy namespace `messaging` / `lab-broker` is read-only **legacy occupied**; no automatic repair.

## Operator entry

```bash
node infra/platform/rabbitmq/install.mjs plan dev kind-offscreen-dev
OFFSCREEN_RABBITMQ_ENSURE=authorized node infra/platform/rabbitmq/install.mjs ensure dev kind-offscreen-dev
node infra/platform/rabbitmq/install.mjs status release kind-offscreen-release
```

Heavy protocol proof: `infra/verification/smoke/rabbitmq/proof.mjs` (requires `OFFSCREEN_RABBITMQ_PROOF=authorized`; disruption cases need `OFFSCREEN_RABBITMQ_DISRUPTION=authorized`). Live proof **NOT RUN** in this Change.