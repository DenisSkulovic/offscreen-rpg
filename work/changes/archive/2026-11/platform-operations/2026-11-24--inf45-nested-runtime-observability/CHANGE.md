# INF45 | Docker and Kubernetes attribution across WSL boundaries

**State: Done. Kind: implementation. Profile: CONTRACT.** Source-only. Integrated on `undertaking/storyteller-workshop`. Started at `2ce6bfca0b65b9b7db471571f9f531ed9cd393cd` (packet baseline `fb8f5bfb` had moved). Live nested Docker/Kind/cgroup visibility NOT RUN.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| Nested runtime attribution | docs/technical/platform/workstation-observability.md | unchanged contract; source companion now implements Docker/Kind discovery, kubelet/pod/events, read-only cgroup peaks; live visibility still separate | infra/monitoring/runtime.py, kube.py, cgroup_probe.sh | source-inspected; unittest discover 107/107 PASS (48 new INF45) | foreign kube context blocks probes; malicious/non-hex IDs refused; ambiguous cgroup gap; no secret fields | status sentence updated |
| Capability catalog MON-04 | infra/verification/CAPABILITIES.md | evidence column records source fixtures; live observation remains open | infra/monitoring/tests/test_{runtime,kube,cgroup}.py | fixture-tested 18+14+16 PASS | docker absent, 403/410 gaps, cross-target refusal | catalog row updated |
| Operator install surface | docs/runbooks/workstation-observability.md | unchanged because install/activation path unchanged; nested modules land under existing install tree | infra/monitoring/README.md | source-inspected | no live apply/start | README module table |
| Product behavior | docs/product | unchanged because this is workstation infrastructure, not player-facing play | n/a | source-inspected | no product route edited | N/A |

Integration undertaking/storyteller-workshop; source baseline fb8f5bfb950721202f712870d4a3cc15b7946d40. Source implementation commissioned by owner on 2026-11-24. No live host package install/service activation, elevated access, WSL restart, Docker/Kind mutation or cluster workload starts implied. Source tests use temporary fixtures and injected command runners. Existing INF29 live corrective work independent. Separate Change worktree and guard; parent integrates one bounded T-ID at a time, no broad delegated investigation; preserve shared package/docs joins. Runtime host visibility/version facts verified by bounded operator acceptance, not guessed, unavailable coverage honest. Use Python stdlib companion and vendor native Netdata; no new DB/dashboard/controller, no app data or credentials. Architecture/semantics in [workstation observability](../../../../docs/technical/platform/workstation-observability.md); permanent capability proof in [catalog](../../../../infra/verification/CAPABILITIES.md).

First dispatch T01 after predecessor gate. Source acceptance only, live separately authorized. No automatic next Change dispatch.
