# INF14 | Optional Redis and RabbitMQ

**State: Done**

**Status: Done. Kind: implementation. Profile: STATE.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `6df54cc215bee4ab21b6d7b3215a491e08a52e93` (packet inspection `66ed7551` had moved; INF09 common render API present). Depends: INF09 (Done). Source-only. Live cluster NOT-RUN.

Touched paths: `docs/runbooks/kubernetes-redis.md`, `docs/runbooks/kubernetes-rabbitmq.md`, `infra/platform/common/render.mjs`, `infra/platform/redis/chart/`, `infra/platform/redis/install.sh`, `infra/platform/redis/tests/render.test.mjs`, `infra/verification/smoke/redis/smoke.sh`, `infra/verification/smoke/redis/smoke-preflight.mjs`, `infra/verification/smoke/redis/smoke-fence.test.mjs`, `infra/platform/rabbitmq/chart/`, `infra/platform/rabbitmq/install.sh`, `infra/platform/rabbitmq/release-install.mjs`, `infra/platform/rabbitmq/tests/`, removed `infra/platform/redis/redis.yaml`, `infra/platform/rabbitmq/broker.yaml`, `infra/platform/rabbitmq/namespace.yaml`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Optional Redis chart and smoke fence | docs/runbooks/kubernetes-redis.md | changed: release chart replaces the flat manifest; unauthenticated instance stays isolated and disposable | infra/platform/redis/chart/templates/redis.yaml | source-observed | dev profile refuses; existing or unreadable redis objects cause zero writes | N/A |
| RabbitMQ lifecycle | docs/runbooks/kubernetes-rabbitmq.md | changed: chart plus guarded installer; identities, vendor bytes, and definitions stay | infra/platform/rabbitmq/release-install.mjs | source-observed | bad digest, foreign broker, missing secret with data, changed definitions, and failed webhook refuse without the forbidden mutation | N/A |
| Optional boundary | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | unchanged: Redis and RabbitMQ stay optional and are not application runtimes | docs/runbooks/kubernetes-redis.md | source-observed | no application env or package wiring in this Change | N/A |
| Product behavior | docs/product | unchanged because no player-facing behavior was selected | no source behavior changed | source-observed | live apply remains outside this Change | N/A |

Exclusive owner: infra/platform/redis,rabbitmq; matching smokes/runbooks. Outcome: Redis optional chart and smoke fence; RabbitMQ lifecycle; Optional boundary and proof. Preserve runtime identities and existing data. [Batch contract](../../../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
