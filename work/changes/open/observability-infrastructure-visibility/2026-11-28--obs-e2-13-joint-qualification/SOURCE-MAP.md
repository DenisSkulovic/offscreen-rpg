# OBS-E2-13 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- Design INTEGRATION acceptance matrix and TARGET coverage/dashboards; EVIDENCE M01–M04 durable destinations. `infra/platform/observability/tests/` and `infra/verification/smoke/observability/tests/` own focused source; `infra/environments`/`infra/platform/common` own public contracts.
- `docs/technical/platform/observability-native-infrastructure.md`: Composition and data, Artifact ownership, Immutable image identity, Native lifecycle, Structural inventory and readiness, Collector configuration upgrade, Foreground access, Proof ownership and safety, Certification continuity. `docs/runbooks/kubernetes-observability.md`: Plan/ensure/status; Collector upgrade and local connection; Authorized synthetic proof. `docs/technical/platform/object-storage-infrastructure.md`: Provider and native lifecycle, Mutation custody, Acceptance and realization.
- E1 historical A/V receipt remains NOT RUN where applicable; no replay of unrelated heavy campaigns. Source regression alone insufficient for owner acceptance.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
