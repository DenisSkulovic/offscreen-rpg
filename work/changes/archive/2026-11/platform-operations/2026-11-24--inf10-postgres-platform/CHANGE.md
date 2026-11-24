# INF10 | CloudNativePG normalization

**State: Done**

**Status: Done. Kind: implementation. Profile: STATE.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `6df54cc215bee4ab21b6d7b3215a491e08a52e93` (packet inspection `66ed7551` had moved; frozen common exports still present). Depends: INF09 (Done). Source-only. Live cluster NOT-RUN.

Touched paths: `infra/platform/postgres/chart/`, `infra/platform/postgres/dev-bootstrap.mjs`, `infra/platform/postgres/dev-host-probe.mjs`, `infra/platform/postgres/release-install.mjs`, `infra/platform/postgres/install.sh`, `infra/platform/postgres/tests/`, deleted `infra/platform/postgres/cluster.yaml` and `namespace.yaml`, adapter re-exports, `docs/runbooks/kubernetes-postgres.md`, `docs/architecture/09-chaos-and-zero-token-play.md`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Dev and release CNPG identities | docs/runbooks/kubernetes-postgres.md | changed: chart render replaces flat namespace and cluster YAML; names stay `offscreen-dev-postgres`/`dev-pg` and `lab-postgres`/`lab-pg` | infra/platform/postgres/chart | source-observed | unknown profile/section and bad pin overlay rejected; no Secret docs | chaos note path updated |
| Dev ownership and readiness | tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs | changed: implementation lives under platform postgres; adapters re-export | infra/platform/postgres/dev-bootstrap.mjs | source-observed | wrong target, unreadable reads, storage drift, bad digest, and operator wait failure do not apply a cluster | N/A |
| Release create/reuse/refuse | docs/runbooks/kubernetes-postgres.md | changed: guarded `release-install.mjs` decides; matching operator skips manifest fetch | infra/platform/postgres/release-install.mjs | source-observed | foreign, mismatch, and unreadable observations do not create; matching reuse does not read the operator manifest | N/A |
| Product behavior | docs/product | unchanged: no player-facing rule changed | no product source changed | source-observed | live cluster apply remains outside this Change | N/A |

Exclusive owner: infra/platform/postgres; dev-cnpg adapters/tests; postgres runbook. Outcome: CNPG chart; Dev ownership and readiness; Release lifecycle. Preserve runtime identities and existing data. [Batch contract](../../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
