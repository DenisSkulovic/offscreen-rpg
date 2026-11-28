# OBS-E2-05 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PROPOSED — native inputs frozen; dependency-gated on 02 and independent readiness. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02; selected: none.

## T01 | Define fixed exporter | PROPOSED (dependency-gated; not commissioned)
DEPTH=PATCH
Requires: 02 joined; Frozen v1.97.0 pin, flags, exact endpoint/labels/coverage in NATIVE-INPUTS owner replacement specimen; independent readiness and commission required.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/locks/e2-images.tsv
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml; G1/G3 Redis evidence; TARGET sections 1–3
Algorithm: Add exact release-owned `obs-redis-exporter` Deployment and ClusterIP Service via parent extraManifests, one container `redis-exporter` using G1 canonical immutable image, fixed Redis service target, validated flags exactly as frozen: `--disable-scrape-endpoint`, `--config-command=-`, `--disable-exporting-key-values`, `--export-client-list=false`, `--check-keys=`, `--check-single-keys=`, `--check-streams=`, `--exclude-slowlog-metrics`, `--exclude-commandlog-metrics`. No API token, host access, extra sidecars or public port. 50m/64Mi request,128Mi memory cap. Use HTTP 9121 `/metrics`, static internal Service 9121. Set `automountServiceAccountToken: false` on Pod. Preserve existing extraManifests and add lock row redis-exporter.
Test: Source gate; 08 exact render and image verification.
Negative: No dynamic target, script/key scanning, unpinned image, mutation authority or Redis service modification.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Add cache job and coverage | PROPOSED (dependency-gated; not commissioned)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/coverage/redis.json; infra/platform/observability/tests/e2-collection.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml; G3 exact Redis families; group coverage contract
Algorithm: Static `redis-exporter` job, 30s/10s, 5k cap, fixed internal endpoint and exact family keep regex from frozen Redis declaration; native families have no label keys. No blanket redis_* collection or label dropping that aliases series. Materialize exact frozen coverage JSON from NATIVE-INPUTS, reserve messaging dashboard panels 701–709; distinguish scrape and backend availability, current observations and undefined hit ratio. Verify fixed arguments, no optional scan flags, and missing backend distinct from scrape health.
Test: node --test infra/platform/observability/tests/e2-collection.test.mjs
Negative: A scrape-successful exporter reporting Redis down cannot display healthy; no arbitrary target endpoint or high-cardinality key labels.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
