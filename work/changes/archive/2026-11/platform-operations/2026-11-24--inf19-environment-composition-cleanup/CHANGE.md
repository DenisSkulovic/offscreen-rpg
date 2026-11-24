# INF19 | Minimal environment composition

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline 590ba03d03324c01de07d6643232b09e32c08864; integrated on undertaking/storyteller-workshop from change/inf19-environment-composition-cleanup. Dependency: INF15 and INF16 Done. Source-only. Live cluster, Tilt, and Docker NOT-RUN.

Exclusive owner: release namespaces, teardown policy, acceptance and fixture ownership. Outcomes: Remove fixture namespace bootstrap; Reduce release teardown contract; Verification ownership and content fixture. [Batch](../../../../undertakings/storyteller-workshop/ENVIRONMENT-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact negative/positive proofs, no second deployment/receipt authority, preserve identities/data; parent integrates and archives, no successor auto-start or global queue change.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Fixture namespaces | changed: lab-a/lab-b definitions live under verification probes; cluster up does not apply them | this integration SHA | focused node tests including release up, smoke, redis/otel install, infra-layout 13 pass | foreign lab label refuses fixture apply; unreadable namespace refuses | `INF-MOVE-MAP.json` successor to `infra/verification/fixtures/probes/namespaces.yaml` |
| Teardown contract | changed: cluster identity and import-root hashes are derived; 11-object down allowlist stays explicit | `owned-app-resources.json`, `stack-lifecycle.mjs` | stack lifecycle/health/preflight/run 39 pass | extra allowlist entry and forbidden kind refuse | N/A |
| Verification fixtures | changed: acceptance preflight and Seyda Neen content-bootstrap live under `infra/verification/release-acceptance/` | moved files | preflight and fixture pins 19 pass; `bash -n` on build/smoke | old environment paths absent | successor rows in `INF-MOVE-MAP.json` |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |
