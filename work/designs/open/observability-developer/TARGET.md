# Developer observability target

Accepted R5 design, not commissioned implementation. The [canonical technical contract](../../../../docs/technical/platform/observability-native-infrastructure.md) owns all selected behavior. This design dossier retains the architectural rationale and acceptance boundary, not a second normative copy.

## Problem and alternatives

The native foundation is valuable: five independently owned Helm releases, pinned charts/images, optional profile selection, 3 retained claims, Grafana provisioning, scoped custody. Owner observed ready workloads, authenticated three datasource health, accepted synthetic OTLP submissions. But no complete synthetic backend query proof, no clean A6 pass, no general application telemetry. The permanent inputs retain experimental naming and misleading comments. Collector exact synthetic vocabulary drops actual applications and its Pod-IP receiver cannot accept kubectl port-forward's loopback connection. Install-only lifecycle and structural-only observation cannot recognize or safely evolve configuration. Actual proof defaults contain unwired datasource, incorrect host vs Pod execution, duplicate Python arguments and zero-interval/no-port resource sampling. 118 focused JS passes did not establish real usability. See DESIGN-R2 evidence, source map and acceptance matrix.

Alternatives: retain strict synthetic only (does not meet developer goal); turn existing receiver unrestricted (breaks diagnostics and release compatibility, leaks payloads); separate Collector deployment (extra resources/ownership, no need demonstrated); two distinct receiver IDs in same Collector (selected: render and pinned binary validate PASS, no new resource identity). No umbrella chart: upstream chart-native values already render/install five releases independently. No reset/reinstall: need retained backend state and credential continuity. No generic upgrade controller: only known dev Collector transition now. No persistent connection daemon: foreground process ownership sufficient. No new cluster for ordinary qualification; isolated destructive original proof remains separately gated.

## Selected architecture

| Area | Decision |
| --- | --- |
| Artifacts | Five native Helm releases; normalized values/ and locks/, exact pinned render parity |
| Telemetry | Existing strict synthetic lane; separate dev-only trusted local receiver in same Collector |
| Access | Foreground loopback-only WSL session; no daemon |
| Evolution | Explicit known-predecessor Collector-only upgrade; preserve storage and credentials; ensure never upgrades |
| Proof | Real backend query freshness, scoped resource observation, individually UID-bound diagnostic cleanup, retained namespaces |
| Release | Existing policy unchanged; no developer admission or release mutation |

## Permanent contract and implementation boundary

The [canonical technical owner](../../../../docs/technical/platform/observability-native-infrastructure.md) governs pinned artifact ownership, strict synthetic and trusted developer admission, bounded producer metrics, exact lifecycle/identity/custody, upgrade preservation, foreground process supervision, proof-resource UID custody and exact fresh backend observations. No duplicate normative architecture here. [Source map](SOURCE-MAP.md) owns maintained geography, [acceptance](ACCEPTANCE.md) owns capability and certification routing, [implementation plan](IMPLEMENTATION-PLAN.md) owns successor allocation. Release remains unchanged; no application instrumentation or automatic recovery.

## Selected implementation amendments (pending independent defense)

| Decision | Affected outcome | Resolution before commission |
| --- | --- | --- |
| Staged certification/integration | All successor closure; D01 first | Preserve every A/V predicate. D01-only offline parity exception; D02–D11 coordinated offline assembly and original joint certification. Exact route in ACCEPTANCE, pending independent defense and explicit owner acceptance. |
| Absolute deadlines and owned process cancellation | D02–D11 | D02 shared constants, D04 exact platform phase arithmetic, D07 proof schedule, operation-specific D05/D06/D09/D10/D11 allocations; choose fail-closed inclusive caps, no duplicate reserves or generic scheduler. |
| Fresh bounded metric timestamps across retained stores | D08 | Selected candidate complete session scan plus locked durable write-ahead watermark in D08 EXECUTION; pinned D3/D4 actual labels/raw query evidence required. No new dimensions or acceptance weakening. |
| Isolated A9 failure mechanism | D11 | Selected candidate owner-installed exact ValidatingAdmissionPolicy/Binding on isolated target in D11 EXECUTION; real failed Helm history marker and retained pending/repeat-refusal. Accepted quota remains binding until ratified; actual isolated feasibility required. |
| Exact Grafana service/target port and pinned Collector render | D04/D05/D09 and related proof | Verify actual pinned render and loopback wiring; do not invent ports or claim live success. |

**Planner defense of amendments:** preserve the already defended R5 component architecture. Offline assembly avoids changed defaults reaching ordinary dev with the legacy cascade or incomplete health path; old worktrees are explicitly excluded at live cutover rather than assuming Git merge revokes process authority. F08 accounts for full rechecks, inventory and close rather than timing out valid multi-step operations under predecessor caps; timeout failure never excuses identity or privacy. A single proof-writer's durable timestamp allocation covers delayed submissions invisible at the session-start scan, whereas fixed sleep cannot prove delivery and a new run label violates cardinality. Admission-policy rejection avoids a nested Helm PATH wrapper and production hook while requiring actual public Loki failure and retained fence; until pinned feasibility/defense, it is not selected canonical authority. These are concrete proposals for independent review, not runtime observations or proof waivers.

Prior read-only feasibility observation (/tmp/offscreen-obs-batch.aF0Wnxi8): five rev1 deployed, storage metadata and old Collector checksum/owned Pod chain observed, three claims, six host ports vacant, no pending, Linux Python 3.12.3/util-linux 2.39.3/prctl support and approximately 10 GiB available. Historical evidence only; no current resource or upgrade claim.

D01 parity-only artifact migration needs no new topology decision and can be prepared now. Commission remains gated by independent readiness, worktree collision check and applicable certification authority. No downstream unresolved mechanism is assigned to its executor.
