# OBS-E2-04 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `infra/platform/postgres/chart/templates/`, `infra/platform/postgres/vendor/cnpg-1.30.2.yaml`: selected CNPG instance port 9187; exact discovered labels/protocol G3.
- Temporal vendored 1.8.0 chart, current dev profile native pods; 9090 server metrics only, frontend/history/matching/worker. No Temporal SDK metrics inferred.
- `infra/platform/rabbitmq/readiness.mjs`: prometheus port 15692; fixed aggregate endpoint.
- `values/{prometheus,loki,tempo,grafana,collector}.yaml`: existing self endpoints; exact rendered Service mapping and G3 probe evidence. TARGET section 3 is the selected contract.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.

- At `872c39b5c6bc4ebcacca3272d1c613758fc870cd` the planner separates OBS-E2-06 object-owner source from SeaweedFS enrollment. 06 `chart/templates/{deployment,service}.yaml` and owner transition source join first, then separately authorized G4b proves the actual 9327 endpoint and retains data. 04 owns only fixed Prometheus job and `coverage/seaweedfs.json` after planner freeze; no owner-side edits or independent live proof.
