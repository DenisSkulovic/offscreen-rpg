# Developer observability | evolutionary design workshop

Owner: human owner + ChatGPT planner. Open investigation, 2026-11-27. Baseline main 5f5750eca2f31d92fac6bfa478d1cae7203e1815. Next review: current owner design session; decision: development producer contract and receiver/access topology, followed by occupied-service configuration transition. No implementation, live mutations, spending or release changes commissioned.

[Proposed Change](../../../changes/open/2026-11-27--observability-developer/CHANGE.md). Existing OBSERVABILITY-NATIVE remains open, with incomplete acceptance; no concurrent edits to its owned source. Existing canonical authority: [native infrastructure](../../../../docs/technical/platform/observability-native-infrastructure.md). This dossier does not supersede it until defended and promoted.

## Target and posture
Evolutionary, not clean-slate. One shared five-release development stack; preserve pinned charts/images, three retained claims, Grafana credentials, explicit service selection, bounded observation and mutation custody. Make real application-shaped operational telemetry available to WSL experiments and subsequently in-cluster development workers. Telemetry is optional, bounded, and never part of business transaction correctness. No new cluster for ordinary development acceptance.

## Evidence at kickoff
- Owner terminal: 118/118 JS focused tests on f243c373; third installation completed seven mutation phases but final observer rejected normal ContainerStatus.image. Corrected observer, owner reconciled pending under lock, public status installed, repeat ensure mutation none in 3.619s. Not a clean fresh A6 PASS.
- All five pods ready, zero restarts at observation, three 5Gi claims Bound, all five imageIDs match canonical pins. WSL host 10GiB available of 19GiB at observation, not capacity proof.
- Grafana authenticated datasources offscreen-logs, offscreen-metrics, offscreen-traces all OK; backend HTTP health positive.
- Collector specimen binds Pod IP; runtime HTTP listener 10.244.1.42:4318, port-forward tries 127.0.0.1:4318 and fails. In-cluster probe accepted all three OTLP requests, then Python logs_check argument collision prevented storage query proof. Probe namespace obs-proof-90039b35 UID ad9c2f16-5a8a-44ec-bef3-dd03f36ea871 retained; owner cleanup pending. Evidence directory .offscreen/verification/incluster-signals.1Sm41k9C.
- Source: resources.mjs queryGrafanaDatasourceHealth returns probe-not-wired without injection; runResourcesProof defaults port 0 and interval 0; resource-observation.py writes broad node summaries before filtering. signals.mjs creates Pod but invokes host Python with cluster DNS. signal-probe.py output directory fix at baseline. Do not count injected proof tests as real execution.
- Current canonical admission accepts only synthetic vocabulary. Agent telemetry enrollment is explicitly excluded. No claim of general confidentiality or authenticated producers.

## Candidate direction (not ratified)
1. Keep backend/storage topology. Dev Collector OTLP bind all interfaces inside Pod, ClusterIP and loopback-only host forwards; no hostPort, NodePort, public ingress or release change.
2. Prefer one Collector with clearly separated synthetic and development application admission. Compare separate receiver IDs/ports against conditional routing; retain synthetic privacy coverage. Resource service name is not authentication. Explicitly trusted local producers only; backend network access is not an adversarial boundary.
3. Application contract: stable resource identity, bounded operation names, typed safe attributes and structured events; no prompts/completions, tool arguments/results, credentials, SQL parameters, raw exception bodies. Keep trace/run identifiers out of metric labels; define per-metric vocabulary and bounded label values. Producer-side suppression plus fail-closed Collector validation; arbitrary strings are not intrinsically safe.
4. Explicit dev-only occupied Collector configuration transition under identity/custody. Compare bounded Helm upgrade (revision history, rollback and failure fence) against disposable observability-only reinstallation; choose after examining ownership, configuration identity and retained credentials/claims. No generic infra upgrade engine assumed. Repeated ensure must not implicitly upgrade.
5. WSL connection ownership: loopback HTTP 14318, gRPC 14317, Grafana 13000; backend query ports optional and scoped. Prefer foreground session with deterministic cleanup over background daemon unless demonstrated need. Reuse existing owned lifecycle primitives where compatible.
6. Repair real proof paths, retain original acceptance obligations or explicitly transfer with owner-approved reconciliation. Separate quick health, developer qualification, and isolated destructive certification. No new cluster as prerequisite for current POCs.

## Investigation and decision sequence
- D1 producer/telemetry envelope: actual POC SDK and Temporal emission shapes, safe fields/value vocabularies, producer trust, correlation, bounded cardinality; upstream pinned OTel 0.165.0 processor syntax and metric semantics. Decide safe minimal application pipeline.
- D2 connectivity: verify receiver binding specimen and actual loopback forwarding; inspect existing dev lifecycle/session interfaces; select foreground or owned session, port and identity rules.
- D3 occupied transition: inspect install.mjs, custody.mjs, identity.mjs, inventory.mjs, readiness.mjs, artifacts.mjs and public CLI; resolve revision/history admission, desired config identity, failure/rollback, resource preservation. Harden existing identity gaps before mutation.
- D4 executable verification: fix query signatures, real network execution, Grafana exact UID/URL health, filtered resource sampling, UID-preconditioned cleanup. No raw secrets or broad node stats in evidence. Distinguish actual data acceptance from HTTP success.
- D5 version-matched specimens and discriminating experiments, formal self-defense then fresh independent committee. Promote only accepted scope into canon and finalize packet. Owner review after D1/D2, then D3, then candidate proof.

## Provisional acceptance
Quick: structural installed, Grafana auth and exact datasource health, query all three synthetic signals.
Developer: actual WSL scripted application-shaped parent/child trace, correlated structured log, counter/gauge/histogram and bounded labels; positive query and negative sensitive-field canary; no telemetry dependence for business results; connection cleanup and collisions; resource measurements.
Transition: same cluster, namespace, Grafana Secret UID, three claim/PV identities; only intended Collector changes, pinned images preserved; repeat upgrade/no-op semantics; failed/foreign/pending identities refuse, no unapproved rollback or destructive cleanup.
Extended: clean fresh clone/install, isolated injected failure, persistence/outage and release-specific policy retain their own gates. No certification claim until corresponding proof. 
