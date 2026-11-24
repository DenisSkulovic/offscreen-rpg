# INF17 | Consolidate dev Tilt and image loading

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Integrated `76f97b6a` on undertaking/storyteller-workshop. Dependency: INF08 Done. Source-only. Live Tilt, Docker, and Kubernetes NOT-RUN.

Exclusive owner: root Tiltfile; infra/dev sync and loader; development image loader. Outcomes: Collapse slot loader entrypoint; Dev-only sync/rebuild contract; Single root Tilt graph. [Batch](../../../../../../undertakings/storyteller-workshop/ENVIRONMENT-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact negative/positive proofs, no second deployment/receipt authority, preserve identities/data; parent integrates and archives, no successor auto-start or global queue change.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Dev Tilt graph | changed: one root `Tiltfile`; nested `infra/dev/Tiltfile` deleted | `76f97b6a` | focused tilt, split, and layout tests pass | no warm-release fallback, no nested include, one render before `k8s_yaml` | developer-environments and dev-worktree runbook |
| Dev image load | changed: `load-dev-slot-image.sh --tilt-ref` only | `76f97b6a` | loader tests 14 pass | mismatched slot and malformed refs refuse before fake Docker | successor map to the slot loader |
| Dev sync | changed: `infra/images/development/sync-plan.mjs` | `76f97b6a` | sync-plan tests 13 pass | docs and release-only paths are none; dependency source rebuilds | successor map from `dev-sync-paths` |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |
| Live cluster | unchanged because source-only | no cluster call | NOT-RUN | N/A | N/A |
