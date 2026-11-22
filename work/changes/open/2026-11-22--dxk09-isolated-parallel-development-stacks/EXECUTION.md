# DXK09 | Selected execution algorithm and dependency fences

## Identity and tenancy
Operator allocates explicit slots `s01..s04` (not branch-name-only hashing). Normalize canonical realpath of repo worktree. Write slot lease in ignored OS user runtime directory using exclusive create; lease records {schemaVersion, slot, canonicalWorktree, process identity, context, namespace, ports}. On replay with same identity allow idempotent attach; reject different worktree or live unknown PID. Reclaim only if verified dead and no foreign owner resources. Derive `offscreen-dev-sXX`, dedicated DB `offscreen_dev_sXX`, bucket `offscreen-dev-sXX`, Temporal namespace `offscreen-dev-sXX`, and distinct random slot auth/GA credentials. These are configuration outputs, not guest-submitted names.

Use slot ports:
| slot | game | API | Tilt |
| --- | ---: | ---: | ---: |
| s01 | 31010 | 31110 | 10410 |
| s02 | 31020 | 31120 | 10420 |
| s03 | 31030 | 31130 | 10430 |
| s04 | 31040 | 31140 | 10440 |

All binds 127.0.0.1; internal container ports stay 3000/3001/3002. Don't advertise ready until services, database migration, object storage, worker/Temporal and authenticated route checks pass. Persist lease on controlled start and release it on graceful stop only if exact owner still matches; crash leaves stale lease to validate.

## Cluster
A dedicated `kind-offscreen-dev` cluster with distinct loopback API server port (e.g. 6444 if unoccupied), independent context and no writes to `kind-offscreen-lab`. Shared infra is installed once, then logical tenants created per slot. Check node capacity and available memory before every new stack. Never copy/relabel release manifests with unsafe unbounded substitution. Release runbooks and acceptance stay unchanged.

## Provision and boot
Stage A preflight: verify correct user context/cluster ownership, port availability, disk and memory, slot lease, no foreign resources. Stage B install/create shared infrastructure once under dev-only manifests. Stage C provision dedicated SQL database/user, S3 bucket/limited credentials, Temporal namespace, and per-slot Secrets. Stage D apply only app workloads labeled by the exact slot, run per-database migrations, validate expected content root, start per-slot Tilt with one worktree as sync origin, and report live URLs. Reject partial provision with actionable diagnostic and retain enough identity for safe retry; do not auto-destroy on failure.

## Stop, retry, destroy
`stop --slot`: stop only the exact matching Tilt process and scoped app Deployments/port forwards. SQL, S3, Temporal tenants persist. Re-run start with same worktree/slot keeps tenant identities and committed records. `destroy --slot --confirm offscreen-dev-sXX` is a separate optional destructive action subject to explicit owner authorization and interactive confirmation; no Change acceptance requires running it on actual data. Never target another slot or the release cluster.

## Source separation and dev updates
Create a slot-specific Tilt config per worktree without modifying shared source trees or generated files inside tracked paths; all generated config and lease material stays ignored/outside repo. Keep DXK08 `live_update` syncs, normal edit only affecting its runtime consumers. Changed lockfile/package schema triggers affected rebuild for that slot alone. Kind image load must use dev-cluster node discovery, serialized, no hardcoded release node IDs. Use per-slot Docker tags and Tilt state directories/ports so identical working source names cannot collide.

## Security
Auth via Better Auth with exact slot `APP_ORIGIN` and per-slot secrets. Require operator-provided matching GitHub OAuth registration for browser-based proof, unless an already accepted local-only provider-free identity route is separately verified; never weaken `readAuthConfig` or allow a generic dev bypass. Local loopback exposure only. Namespace and logical DB alone do **not** secure against privileged host users; treat tenancy as accident-prevention, not a multi-tenant production security boundary.

## Work dependency DAG
T01 slot pure planning/identity/port lease tests → T02 cluster-specific read-only guard and orchestration → T03 safe backing-tenant provisioning (planner source gate) → T04 manifest generation and credential binding → T05 per-slot Tilt/watch/image and launcher → T06 two-stack integration/negative proof and permanent docs. T03/T04 must not be dispatched until the remaining provisioning/auth specifics are verified and ratified by planner. Cluster creation, database mutation, S3 bucket creation, and Temporal writes during live proofs require operator-specific approval. No automatically authorized deployment from a planning file.
