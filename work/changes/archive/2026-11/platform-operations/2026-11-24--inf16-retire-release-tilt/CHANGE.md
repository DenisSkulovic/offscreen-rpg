# INF16 | Retire release Tilt

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline 05d37eb4a4e47f6d7a49e1f46b503a1503c6b9da; integrated on undertaking/storyteller-workshop from change/inf16-retire-release-tilt. Dependency: INF08 Done. Source-only. Live cluster, Tilt, and Docker NOT-RUN.

Exclusive owner: release Tiltfile and release-specific source tests/runbooks. Outcomes: Delete second release writer; Release-only caller reconciliation. [Batch](../../../undertakings/storyteller-workshop/ENVIRONMENT-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact negative/positive proofs, no second deployment/receipt authority, preserve identities/data; parent integrates and archives, no successor auto-start or global queue change.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Release deploy writer | changed: release Tiltfile deleted; `install.sh` and `build-release-images.sh` remain the release authorities | this integration SHA | focused node tests 38 pass; layout inventory failure pre-existed on the base | `existsSync` false for the retired Tiltfile; no live Tilt/Docker/cluster | runbooks name build script plus `pnpm stack:up` |
| Dev Tilt graph | unchanged because INF17 owns dev consolidation | root and `infra/dev` Tiltfiles only had release-caller comments adjusted | source-inspected | dev tests still assert no release image build in the root graph | N/A |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |
