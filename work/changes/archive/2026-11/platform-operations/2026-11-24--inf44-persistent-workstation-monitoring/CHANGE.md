# INF44 | Persistent local workstation flight recorder

**State: Done. Kind: implementation. Profile: STATE.** Source-only. Integrated on `undertaking/storyteller-workshop`. Started at `c0993339d0b19796d6de4ad963bf2bdc90cedfd5` (packet baseline `fb8f5bfb` had moved). Live host install NOT RUN.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| Workstation flight recorder semantics | docs/technical/platform/workstation-observability.md | unchanged contract; source companion now implemented for memory windows, safe processes, JSONL storage, and install plan; live activation still separate | infra/monitoring | source-inspected; unittest discover 59/59 PASS | secret argv absent from JSONL; foreign config and port collision blocked; disk-full fast-fail; short pulse missed | status sentence updated |
| Capability catalog MON-01–03, MON-05–06 | infra/verification/CAPABILITIES.md | evidence column records source fixtures; live observation remains open | infra/monitoring/tests | fixture-tested | live service, /proc, and OOM not run | catalog rows updated |
| Operator install | docs/runbooks/workstation-observability.md | plan default, explicit apply, no automatic daemon start | infra/monitoring/install.sh | test_install.py 7/7 PASS | --apply without confirm refused; no sudo or systemctl start in fixtures | runbook updated |
| Product behavior | docs/product | unchanged because this is workstation infrastructure, not player-facing play | n/a | source-inspected | no product route edited | N/A |

Integration undertaking/storyteller-workshop; source baseline fb8f5bfb950721202f712870d4a3cc15b7946d40. Source implementation commissioned by owner on 2026-11-24. No live host package install/service activation, elevated access, WSL restart, Docker/Kind mutation or cluster workload starts implied. Source tests use temporary fixtures and injected command runners. Existing INF29 live corrective work independent. Separate Change worktree and guard; parent integrates one bounded T-ID at a time, no broad delegated investigation; preserve shared package/docs joins. Runtime host visibility/version facts verified by bounded operator acceptance, not guessed, unavailable coverage honest. Use Python stdlib companion and vendor native Netdata; no new DB/dashboard/controller, no app data or credentials. Architecture/semantics in [workstation observability](../../../../docs/technical/platform/workstation-observability.md); permanent capability proof in [catalog](../../../../infra/verification/CAPABILITIES.md).

First dispatch T01 after predecessor gate. Source acceptance only, live separately authorized. No automatic next Change dispatch.
