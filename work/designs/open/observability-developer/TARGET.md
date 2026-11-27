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

## Remaining material decisions (not delegated)

| Decision | Affected outcome | Resolution before commission |
| --- | --- | --- |
| Staged certification/integration | All successor closure; D01 first | Preserve every A/V predicate and final integrated proof, but permit separately safe narrow integrations after their required proof. Proposed only; independent design review and owner acceptance required. Until then the R5 single-candidate gate binds. |
| Absolute deadlines and owned process cancellation | D02–D07, D09–D11 where relevant | Reconcile actual bounded read/process/lock semantics and budgets using existing Linux primitives; verify feasible phase arithmetic and failure behavior. No generic scheduler or success after timeout. |
| Fresh bounded metric timestamps across retained stores | D08 | Pinned D3/D4 experiments, actual raw query samples and single-writer custody; evaluate proposed durable allocation watermark against rollback and delayed ingestion. Preserve exact freshness and bounded series; no new run label or acceptance weakening. |
| Isolated A9 failure mechanism | D11 | Accepted real quota failure remains binding unless a separately ratified admission rejection demonstrates the same public installer failure/retained pending/repeat-refusal predicates. Verify actual Helm history and owner-only fixture custody. |
| Exact Grafana service/target port and pinned Collector render | D04/D05/D09 and related proof | Verify actual pinned render and loopback wiring; do not invent ports or claim live success. |

Prior read-only feasibility observation (/tmp/offscreen-obs-batch.aF0Wnxi8): five rev1 deployed, storage metadata and old Collector checksum/owned Pod chain observed, three claims, six host ports vacant, no pending, Linux Python 3.12.3/util-linux 2.39.3/prctl support and approximately 10 GiB available. Historical evidence only; no current resource or upgrade claim.

D01 parity-only artifact migration needs no new topology decision and can be prepared now. Commission remains gated by independent readiness, worktree collision check and applicable certification authority. No downstream unresolved mechanism is assigned to its executor.
