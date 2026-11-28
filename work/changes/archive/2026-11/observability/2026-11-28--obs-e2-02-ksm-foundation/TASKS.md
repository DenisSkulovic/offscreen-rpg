# OBS-E2-02 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PROPOSED — native specimen and construction rows frozen; independent readiness pending. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02; selected: none.

## T01 | Enable only KSM in dev overlay | PROPOSED (readiness pending)
DEPTH=PATCH
Requires: 01 integrated; frozen G1 chart/pin/permissions and exact observed coverage rows in NATIVE-INPUTS; conditional Job/list/degradation proof assigned to G5.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/locks/e2-images.tsv
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/prometheus.yaml; bundled chart values/templates; Design TARGET.md sections 1–2
Algorithm: Write the overlay with KSM 1 replica Recreate, exact fullname, 8080/8081, ten named collectors, no label/annotation allowlists, no sidecar or API permissions beyond list/watch selected objects. Keep parent rbac.create false; use explicit dedicated Prometheus service account and no token until an enrolled discovery job requires it. Set KSM resources 50m/64Mi and 128Mi limit; immutable pin from G1 (tag and image.sha). Keep all base storage/retention/OTLP settings. Separate helper lock header `role\timmutable-reference`, role `kube-state-metrics`, verified canonical reference; 05 adds redis-exporter row. No placeholder digest.
Test: Source gate only: reviewed values diff and G1 record; 08 renders exact artifact.
Negative: No arbitrary annotation scrape, Secrets/ConfigMaps, remote write, host mounts, node exporter or unexpected chart grant.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Bound self and inventory scraping | PROPOSED (readiness pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/coverage/inventory.json; infra/platform/observability/tests/e2-collection.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/prometheus.yaml; TARGET.md sections 1–2 and 4; verified KSM metric family contract
Algorithm: Set 30s/10s scrape policy, sample/label/length/target limits per TARGET; explicit KSM object and self jobs (`kube-state-metrics`, `kube-state-metrics-self`), exact static endpoints, family-specific metric/label allowlists from the frozen table (include conditional list_total self family; do not infer absent family is zero) with stable cluster/env/component labels and retained inventory dimensions. Keep existing Prometheus/collector jobs and their existing semantics; no generic labelmap. Write the frozen KSM/system inventory rows in coverage/inventory.json (no resource metric claim yet); add config fixture assertions for selected jobs/collectors/negative privileges.
Test: node --test infra/platform/observability/tests/e2-collection.test.mjs
Negative: Unknown collector, copied annotation labels, enabled generic scrape jobs, malformed pin or duplicate target/job fail.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
