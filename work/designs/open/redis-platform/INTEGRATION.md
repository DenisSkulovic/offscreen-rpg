# Integration and cutover | R5 investigation

Baseline main b6d128061fd0eb4d30296589d9393a277b09477a. Native lifecycle specimen passed in release; selection applies to fresh local cache pools. Existing legacy objects remain unchanged. No implementation or migration permission.

## Source findings

- infra/platform/common/profile.mjs defines dev Redis namespace offscreen-dev-redis and release lab-a. Preserve both default DNS names for minimum caller impact unless owner selects migration.
- infra/platform/common/render.mjs parses the current Helm JSON-line output (parse path around lines 79-141), resolves chart profiles and stdin overlays, and restricts namespace per service. Ordinary YAML chart cannot be substituted silently; add Redis-specific native rendering route with equivalent inventory validation, leave other chart owners untouched. Inspect common CLI and render consumers before freezing exact adapter.
- infra/environments/platform-plan.mjs and infra-cli.mjs still route to legacy dev/release installers/readiness. Need one native implementation owner and compatibility adapters for public infra:plan/up/status/render, plus optional-service selection. Retire custom patch logic only after cutover.
- infra/workloads/chart/values.yaml, profiles/development.yaml and profiles/release.yaml do not expose REDIS_URL in inspected text. packages/cache/src/redis/redis-config.ts allows optional REDIS_URL. GitHub code search returned zero for known existing symbol, so not reliable; do not infer absence of callers. Need local git grep and live metadata-only workload census. No secret values.
- infra/images/release/images.pin has no Redis match in inspected text. Image distribution caller census remains open; observed digest worked in release specimen.

## Migration alternatives

1. Automatic adoption: reject. Helm metadata is not custody; immutable selector changes complicate patch and teardown semantics.
2. Parallel endpoint: keep legacy, install fresh new pool, change explicit consumer URL if needed. Prefer if continuity demanded; additional resource use and caller migration; no automatic app wiring.
3. Quiesced replacement at original endpoint: favored for unused or safely disposable cache, subject to consumer census and explicit owner authorization. Require verified target, known legacy UIDs and exact ownership, no active readers/writers or controllers that can recreate resources, empty/disposable data and permitted cache-loss impact. Never delete shared namespace. Delete only authorized exact objects with API UID/resourceVersion preconditions; no broad selector or Helm uninstall. Wait old Deployment descendants gone and Service endpoints absent; stop if partial/unreadable or unknown result. Native fresh installation follows normal admission only after complete absence. No automatic rollback or re-adoption. If interrupted, report surviving inventory and require explicit recovery. This is a candidate sequence, not a runnable migration contract.

## Next evidence (read-only)

From clean or dirty main checkout, git grep committed HEAD for REDIS_URL, redis://, redis:8.2.1, offscreen-dev-redis, relevant platform renderer references; no local untracked secrets. Inspect all matches at actual committed SHA. Live metadata-only census of deployments/statefulsets/jobs/cronjobs and pods: names, Redis env variable names, valueFrom presence, no env values; query Redis INFO clients/keyspace; do not run CLIENT LIST if it would expose unexpected names without need. Existing zero workload snapshot is not a guarantee of no future clients. Explicit quiescence and actual application/cache configuration proof required before any replacement.

Next: source integration map and observer design, determine whether local unauthenticated profile remains fixture-only or owner wants authenticated shared cache now. No secret or workload changes. Formal defense pending.
