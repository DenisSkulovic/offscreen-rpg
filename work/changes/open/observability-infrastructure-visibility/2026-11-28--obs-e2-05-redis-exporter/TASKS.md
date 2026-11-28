# OBS-E2-05 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PLANNER-BLOCKED — G1 Redis pin and G3 exporter behavior. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02; selected: none.

## T01 | Define fixed exporter | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: 02 joined; G1 Redis pin; G3 v1.93.0 flags/command behavior, label policy and endpoint accepted.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/locks/e2-images.tsv
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml; G1/G3 Redis evidence; TARGET sections 1–3
Algorithm: Add exact release-owned `obs-redis-exporter` Deployment and ClusterIP Service via parent extraManifests, one container `redis-exporter` using G1 canonical immutable image, fixed Redis service target, validated flags including --disable-scrape-endpoint and --config-command=-, disable key/stream/scan/script/client-list/value collection as verified. No API token, host access, extra sidecars or public port. 50m/64Mi request,128Mi memory cap. Use explicit port/path verified at G3. Preserve existing extraManifests and add lock row redis-exporter.
Test: Source gate; 08 exact render and image verification.
Negative: No dynamic target, script/key scanning, unpinned image, mutation authority or Redis service modification.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Add cache job and coverage | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/coverage/redis.json; infra/platform/observability/tests/e2-collection.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml; G3 exact Redis families; group coverage contract
Algorithm: Static `redis-exporter` job, 30s/10s, 5k cap and proven labels. Declare separate scrape availability and Redis availability, memory, hits/misses, evictions, clients, operations per second. Verify fixed arguments, no optional scan flags, and missing backend distinct from scrape health.
Test: node --test infra/platform/observability/tests/e2-collection.test.mjs
Negative: A scrape-successful exporter reporting Redis down cannot display healthy; no arbitrary target endpoint or high-cardinality key labels.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
