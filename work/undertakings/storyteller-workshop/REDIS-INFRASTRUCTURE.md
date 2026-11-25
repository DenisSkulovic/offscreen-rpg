# Redis infrastructure | selected first wave, 2026-11-25

Baseline c5da10d8d722c3d067fbb06d84d8fd57c22faf00, main. Owner wants medium-company design with small local footprints. One default shared cache pool per environment; logical per-domain key namespaces, physical separation only for incompatible eviction, resource, latency or failure requirements. No Redis for durable business correctness; no large media bytes. PostgreSQL/Temporal/object storage remain authoritative. Existing application cache verification stays VER07/VER08; no shared fixture use.

## Source map and decisions
- chart/values.schema.json currently allows mode/namespace/section/images only; _helpers.tpl embeds eight-line config, three resource docs, 32mb maxmemory, 128Mi limit, Recreate one replica. renderPlatformDocuments uses JSON lines, namespace validation and stdinOverlay. Preserve existing baseline names and resource sizes; config changes deliberately discard cache on rollout.
- dev-install.mjs observeDevRedis reads namespace/deployment/service but not ConfigMap; executeAuthorizedDevRedis creates namespace before render refusal; observeDevRedisReady uses status replicas rather than current generation. release install.sh does not inspect child ownership before apply. Shared commands.mjs owns target/namespace checks and bounded reads; preserve existing guards and no-auth policy. Local single-writer limitation remains; no hosted-safety claim.
- infra/environments/platform-plan.mjs calls dev-install.mjs ensure/plan and release install.sh; infra-cli.mjs uses observeDevRedisReady. Existing smoke is dangerous on shared data and refuses occupied default identities; do not reuse for named pool or live application cache verification.
- Existing redis client config permits one REDIS_URL and uses createClient; no Sentinel or cluster discovery contract. Named pools are infrastructure only, no automatic app routing.

## Commission and dependency graph
- [INF58 Redis chart configuration and rollout identity](../../changes/open/2026-11-25--inf58-redis-chart-configuration/CHANGE.md): None; independent of INF59. Own chart and render tests only.
- [INF59 Redis installer safety and readiness](../../changes/open/2026-11-25--inf59-redis-reconciliation-safety/CHANGE.md): None; independent of INF58. Own install scripts and installer tests; never edit chart or render tests.
- [INF60 Named Redis pools and operator inspection](../../changes/open/2026-11-25--inf60-redis-named-cache-pools/CHANGE.md): INF58 + INF59 source integrated; their chart values/ownership APIs must match. Own named pool additions and new operator CLI only after both land.

INF58 and INF59 have disjoint source/test write owners, with INF58 parent serializing shared joins. INF60 waits both; no live resource permissions. Named pool create-only, no automatic cleanup or resize. Existing default remains intact.

## Next design gates (not commissioned, no Cursor investigation)
- Live experiment: operator chooses named pool budget and confirms local resource permission; first run read-only plans/status. We need explicit owned cleanup and UID-preconditioned deletion contract before authorizing teardown/fault experiments. No destructive shared Redis tests.
- Replication/Sentinel: choose a local isolated experiment topology, discovery client vs managed endpoint and actual failover SLO. Replicas are copies, not writable shards. Do not scale the default Deployment above 1; would create independent servers behind one Service. No automatic failover claim. Separate Redis Cluster experiment only if educational/throughput needs justify it.
- Hosted security: select managed endpoint or self-hosted platform; current Kind renderer deliberately rejects Secret docs, install paths reject auth material, and current client contract is one URL. Need concrete ACL/credential injection, TLS verification/rotation, network enforcement, and authenticated probes before commissioning production configuration. No fake hosted profile or default insecure hosted deploy. Local no-auth remains clearly bounded and not production-ready.
- Observability: extend existing platform monitoring, no parallel dashboard. Need decide exporter/pin and actual scrape discovery/labels/auth contract with observability owner; application cache metrics already owned by cache programme. Baseline INFO read-only inspection first, do not invent latency/SLO numbers.
- Immutable image pin: runbook has historical index digest; verify registry and Kind image distribution compatibility before changing all consumer pins; not part of this source wave.

No new completion credit; see [overview](OVERVIEW.md).