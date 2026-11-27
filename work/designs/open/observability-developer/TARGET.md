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

## Contract routes

- [Artifact ownership](../../../../docs/technical/platform/observability-native-infrastructure.md#artifact-ownership) and [maintained geography](R5-GEOGRAPHY.md).
- [Telemetry topology and trust](../../../../docs/technical/platform/observability-native-infrastructure.md#telemetry-topology-and-trust) and [developer v1 contract](../../../../docs/technical/platform/observability-native-infrastructure.md#developer-v1-contract).
- [Lifecycle](LIFECYCLE.md) and [proof safety](R5-PROOF-CONTRACT.md).
- [Acceptance](ACCEPTANCE.md), [certification continuity](R5-CERTIFICATION.md), and [implementation packet](../../../changes/open/2026-11-27--observability-developer/CHANGE.md).

No actual application enrollment, public exposure, generic migration, release mutation or automatic recovery. Original native acceptance obligations transfer to the single successor, not a second active packet. Independent defense pass 02 and prior rationale are preserved at [the accepted candidate](https://github.com/DenisSkulovic/offscreen-rpg/tree/06306ace3717841f36ad0952cf7664afbd6fcd4a/work/designs/open/observability-developer/) and [pre-consolidation TARGET.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/d4a2fa4307e5484f1520efa31954f7e7d240de27/work/designs/open/observability-developer/TARGET.md).
