# INF11 | Temporal and safe schema lifecycle

**State: Done**

**Status: Done. Kind: implementation. Profile: STATE.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `6df54cc215bee4ab21b6d7b3215a491e08a52e93` (packet inspection `66ed7551` had moved; INF09 symbols still present). Depends: INF09 (Done). Source-only. Live cluster NOT-RUN.

Touched paths: `docs/runbooks/kubernetes-temporal.md`, `infra/platform/common/render.mjs`, `infra/platform/temporal/chart/`, `infra/platform/temporal/dev-bootstrap.mjs`, `infra/platform/temporal/dev-host-probe.mjs`, `infra/platform/temporal/release-install.mjs`, `infra/platform/temporal/schema-policy.mjs`, `infra/platform/temporal/install.sh`, `infra/platform/temporal/tests/`, `infra/verification/smoke/temporal/smoke.sh`, `tools/dev-environments/src/adapters/dev-temporal-bootstrap.mjs`, `tools/dev-environments/src/adapters/dev-temporal-host-probe.mjs`, `tools/dev-environments/test/dev-temporal-bootstrap.test.mjs`, `work/changes/README.md`, `work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Temporal chart and pinned identities | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | changed: six manifests are chart sections; server 1.32.2, Postgres 17.11, ports, Secret name, and PVC size stay | infra/platform/temporal/chart | source-observed | release-only admin refused on dev; placeholder images and unknown section fail; no password literals | N/A |
| Create-once schema lifecycle | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | changed: bootstrap decisions use absent/present/unreadable and Job conditions | infra/platform/temporal/schema-policy.mjs | source-observed | unreadable, foreign, missing Secret, failed Job, partial schema, and unhealthy server refuse with no delete | N/A |
| Dev and release consumers | docs/runbooks/kubernetes-temporal.md | changed: bootstrap, probe, and release install render chart sections; smoke owns worker setup | infra/platform/temporal/dev-bootstrap.mjs | source-observed | unreadable PVC writes nothing; secret conflict reobserves; failed schema is not replayed | N/A |
| Product behavior | docs/product/README.md | unchanged: this Change is local platform source and does not change player-facing rules | no source behavior changed | source-observed | live apply remains outside this Change | N/A |

Exclusive owner: infra/platform/temporal; dev-temporal bootstrap/probe/CLI/tests; Temporal smoke. Outcome: Temporal chart; Create-once state machine; Lifecycle consumers. Preserve runtime identities and existing data. [Batch contract](../../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
