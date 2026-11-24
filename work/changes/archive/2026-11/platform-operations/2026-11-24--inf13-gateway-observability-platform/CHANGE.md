# INF13 | Gateway and observability fixtures

**State: Done**

**Status: Done. Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `6df54cc215bee4ab21b6d7b3215a491e08a52e93` (packet inspection `66ed7551` had moved; INF09 Done receipt present). Depends: INF09 (Done). Source-only. Live cluster NOT-RUN.

Touched paths: `infra/platform/gateway/gateway.yaml`, `infra/platform/gateway/install.sh`, `infra/platform/gateway/tests/install.test.mjs`, `infra/platform/observability/chart/**`, `infra/platform/observability/install.sh`, `infra/platform/observability/tests/{install,render}.test.mjs`, `infra/verification/smoke/gateway/{routes.yaml,setup.sh,smoke.sh,tests/setup.test.mjs}`, `infra/verification/smoke/observability/{setup.sh,smoke.sh,tests/setup.test.mjs}`, `infra/images/release/test/overlay-guard.test.mjs`, `docs/runbooks/kubernetes-gateway.md`, `docs/runbooks/kubernetes-observability.md`. Removed `infra/platform/gateway/routes.yaml`, `infra/platform/observability/collector.yaml`, `infra/platform/observability/collector-config.yaml`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Gateway fixture split | docs/runbooks/kubernetes-gateway.md | changed: platform Gateway stays in gateway.yaml; synthetic HTTPRoute is smoke-only | infra/platform/gateway/install.sh | source-observed | normal install applies no synthetic fixtures; game-edge-routes overlap and unreadable context refuse | N/A |
| Collector chart and fixture split | docs/runbooks/kubernetes-observability.md | changed: collector is a release chart; hops are smoke setup only | infra/platform/observability/chart/templates/collector.yaml | source-observed | normal install applies no hop fixtures; foreign/unreadable context refuses | N/A |
| Boundary proof | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | unchanged: pinned Traefik 42.4.1 and collector render ownership stay; INF15 still owns the shared guard join | infra/platform/gateway/install.sh | source-observed | installers do not invoke smoke or write app routes | N/A |
| Product and technical behavior | docs/technical/platform/deployment-and-compatibility.md | unchanged: source fixtures only; live apply and environment assembly stay with later proof | no product behavior changed | source-observed | live cluster apply remains outside this Change | N/A |

Exclusive owner: infra/platform/gateway,observability; matching smokes/runbooks. Outcome: Gateway fixture split; Collector chart and fixture split; Boundary proof. Preserve runtime identities and existing data. [Batch contract](../../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
