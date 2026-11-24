# INF12 | SeaweedFS and installer separation

**State: Done**

**Status: Done. Kind: implementation. Profile: STATE.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `6df54cc215bee4ab21b6d7b3215a491e08a52e93` (packet inspection `66ed7551` had moved; INF09 symbols still present). Depends: INF09 (Done). Source-only. Live cluster NOT-RUN.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| SeaweedFS chart | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | changed: local object-storage chart renders dev and release workloads | infra/platform/object-storage/chart | source-observed | unknown profile/section rejected; no Secret document | N/A |
| Guarded installer | docs/runbooks/kubernetes-object-storage.md | changed: dev bootstrap moved under the platform package; release install is guarded and does not run smoke | infra/platform/object-storage/dev-bootstrap.mjs | source-observed | reentry writes nothing; data without secret, unreadable state, and failed secret create refuse further apply | N/A |
| Verification split | docs/runbooks/kubernetes-content-bootstrap.md | changed: object smoke and content bootstrap require an installed store and do not rotate admin credentials | infra/verification/smoke/object-storage/smoke.sh | source-observed | importer mismatch, unknown reader state, and fault injection without confirmation are refused | N/A |
| Pre-chart store manifest | infra/platform/object-storage/store.yaml | unchanged: document-access smoke still applies this file, so it stays until that consumer moves | infra/verification/fixtures/document-access/smoke.sh | source-observed | object and content smokes no longer apply the store | N/A |

Exclusive owner: infra/platform/object-storage; dev-object-store bootstrap/probe/CLI/tests; object and content bootstrap smokes. Outcome: SeaweedFS chart; Guarded installer; Verification and content bootstrap split. Preserve runtime identities and existing data. [Batch contract](../../../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
