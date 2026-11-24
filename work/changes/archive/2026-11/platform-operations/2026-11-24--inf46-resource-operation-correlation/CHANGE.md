# INF46 | Persistent infrastructure operation and phase correlation

**State: Done. Kind: implementation. Profile: CONTRACT.** Source-only. Integrated on `undertaking/storyteller-workshop`. Started at `2ce6bfca0b65b9b7db471571f9f531ed9cd393cd` (packet baseline `fb8f5bfb` had moved). Live host correlation NOT RUN.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| Operation and phase correlation | docs/technical/platform/workstation-observability.md | unchanged contract; source writer and startup/CLI spans now fixture-tested; live correlation still separate | infra/monitoring/operation-event.mjs | source-inspected; node --test 8+15+18 PASS | secret-like names refused; missing monitor is a no-op; refusal records failure without changing the exit code | status sentence updated |
| Capability catalog MON-07 | infra/verification/CAPABILITIES.md | evidence column records source fixtures; live observation remains open | infra/monitoring/tests/operation-event.test.mjs | fixture-tested | live host correlation NOT RUN | catalog row updated |
| Product behavior | docs/product | unchanged because this is workstation infrastructure, not player-facing play | n/a | source-inspected | no product route edited | N/A |

Integration undertaking/storyteller-workshop; source baseline fb8f5bfb950721202f712870d4a3cc15b7946d40. Source implementation commissioned by owner on 2026-11-24. No live host package install/service activation, elevated access, WSL restart, Docker/Kind mutation or cluster workload starts implied. Source tests use temporary fixtures and injected command runners. Existing INF29 live corrective work independent. Separate Change worktree and guard; parent integrates one bounded T-ID at a time, no broad delegated investigation; preserve shared package/docs joins. Runtime host visibility/version facts verified by bounded operator acceptance, not guessed, unavailable coverage honest. Use Python stdlib companion and vendor native Netdata; no new DB/dashboard/controller, no app data or credentials. Architecture/semantics in [workstation observability](../../../../docs/technical/platform/workstation-observability.md); permanent capability proof in [catalog](../../../../infra/verification/CAPABILITIES.md).

First dispatch T01 after predecessor gate. Source acceptance only, live separately authorized. No automatic next Change dispatch.
