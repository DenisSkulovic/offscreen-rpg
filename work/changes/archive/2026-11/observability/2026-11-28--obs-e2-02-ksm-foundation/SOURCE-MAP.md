# OBS-E2-02 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- Base `values/prometheus.yaml`: parent RBAC, KSM, node-exporter and general discovery disabled; self and collector are the only jobs.
- `vendor/prometheus-31.0.0.tgz` bundles KSM 9.1.0 / 2.20.0; exact chart specimens in EVIDENCE. Do not fetch dependencies at runtime.
- `locks/images.tsv`: strict five E1 image rows; separate E2 helper lock prevents changing the historical input. `TARGET.md` sections 1–2 own exact KSM collectors, privileges and budgets.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
