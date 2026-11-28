# OBS-E2-07 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `values/grafana.yaml`: stateless Grafana, provisioned datasource UIDs `offscreen-metrics`, `offscreen-logs`, `offscreen-traces`, separate admin Secret.
- Vendored Grafana chart 14.6.1: `dashboardProviders`, `dashboards.offscreen.<name>.json` and checksum annotations. EVIDENCE exact chart specimens.
- TARGET section 4 specifies all eight UIDs, first panels, freshness semantics and drill-down. 08 supplies shared deterministic `--set-file` args; 07 does not edit artifacts.mjs.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
