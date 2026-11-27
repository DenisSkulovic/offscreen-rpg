# observability-developer | execution index

Operational coordination for the Developer Observability Design. This file is not a Change.

| | |
| --- | --- |
| Design | [observability-developer](../../../designs/open/observability-developer/README.md) |
| Outcome | Offline source assembly of the accepted native developer-observability stack |
| Implementation branch | `implementation/observability-developer` |
| Commission | Owner-released offline source for OBS-D01–OBS-D11. No real cluster, container experiment, paid call, constituent merge to main, or live certification |
| Design acceptance | [A1–A12 and V01–V12](../../../designs/open/observability-developer/ACCEPTANCE.md#owner-released-offline-source-assembly-not-certification) remain open. OD-07, the D08 and D11 feasibility gates, and fresh-install versus occupied-upgrade acceptance stay there |

Historical card mapping stays in the [implementation plan](../../../designs/open/observability-developer/IMPLEMENTATION-PLAN.md). Do not recreate `integration/observability-developer`.

## Change register

Status below was checked against this branch at `9257d223`, then reconciled with the grouping merge. D01–D03 source is joined and their packets are still open. D04 source is joined and its packet is archived at `e692e40d`.

| Change | Outcome | Source predecessors and postconditions | Collision | Status |
| --- | --- | --- | --- | --- |
| [OBS-D01](2026-11-27--obs-d01-native-artifacts/CHANGE.md) | Native artifact normalization | None. Local census and baseline descriptor/values paths | `artifacts.mjs`, `install.mjs` with D02 | Source joined `141ce563`. Packet open |
| [OBS-D02](2026-11-27--obs-d02-target-identity/CHANGE.md) | Frozen target identity | D01 normalized descriptor and values paths | `artifacts.mjs`, `install.mjs` with D01; `install.mjs` with D03 | Source joined `d2a5628b`. Packet open |
| [OBS-D03](2026-11-27--obs-d03-operation-custody/CHANGE.md) | Operation custody | D02 frozen identity tuple | `install.mjs` with D02 | Source joined `638b9cf3`. Packet open |
| [OBS-D04](../../../archive/2026-11/observability/2026-11-27--obs-d04-collector-topology/CHANGE.md) | Collector topology and classifier | D01, D02 and D03 | Installer, receipt and caller migration inside this Change | Source joined and archived at `9257d223` |
| [OBS-D05](../../../archive/2026-11/observability/2026-11-27--obs-d05-foreground-connection/CHANGE.md) | Foreground connection | D03 forward primitive and D04 classifier and ports | `package.json`, `artifacts.mjs` with D06 | Source joined. Packet archived. Joint A1–A12/V01–V12 pending |
| [OBS-D06](2026-11-27--obs-d06-collector-upgrade/CHANGE.md) | Known-predecessor upgrade | D03 custody and D04 classifier. Does not require D05 | `package.json`, `artifacts.mjs` with D05; `custody.mjs` with D10 | Eligible |
| [OBS-D07](2026-11-27--obs-d07-synthetic-proof/CHANGE.md) | Synthetic proof ownership | D04 | May run beside D05 or D06 when those files stay disjoint | Eligible |
| [OBS-D08](2026-11-27--obs-d08-developer-signal-proof/CHANGE.md) | Developer signal proof | D05 and D07 for source. D06 is the occupied-upgrade acceptance path only | `proof.mjs`, `proof-host.mjs`, `proof.test.mjs` with D09, D10 and D11 | Waiting on D07 |
| [OBS-D09](2026-11-27--obs-d09-health-resource-proof/CHANGE.md) | Health and resource proof | D05 and D07. Does not require D08 | Same proof files as D08, D10 and D11 | Waiting on D07 |
| [OBS-D10](2026-11-27--obs-d10-recovery-proof/CHANGE.md) | Recovery proof | D04 readiness and D07 proof resources. Does not require D08 or D09 | `custody.mjs` with D06; proof files with D08, D09 and D11 | Waiting on D07 |
| [OBS-D11](2026-11-27--obs-d11-partial-install-proof/CHANGE.md) | Partial-install proof | D04 and D07's refusal of the direct partial-install executable. Does not require D08, D09 or D10 | Proof files with D08, D09 and D10. A9 feasibility is a live-acceptance gate | Waiting on D07 |

## Parallel execution

Eligible now, from the current implementation tip: OBS-D06 and OBS-D07. OBS-D05 source is joined.

Safe concurrent combinations:

- D05 with D07
- D06 with D07

D05 and D06 do not run together. D08–D11 do not run together. D06 and D10 do not run together. Any other pair whose source predecessors have joined, and whose collision cell is empty, may run together. This is not a wave order.

The critical path that remains is D05 and D07, then D08. D06, D09, D10 and D11 are not on that path except where a collision or an acceptance dependency says so.

## Integration and closure

Constituent Changes join `implementation/observability-developer` through `scripts/repo-tools/change-lifecycle.mjs`. Joins are serialized. No constituent publishes this Design to main.

Change-level closure archives that packet and records the remaining joint obligations on the Design without marking them passed. Design acceptance stays in [ACCEPTANCE.md](../../../designs/open/observability-developer/ACCEPTANCE.md). When the last open constituent is archived, retire this directory and keep this register with the Design. Do not mark the Design complete before that acceptance passes.
