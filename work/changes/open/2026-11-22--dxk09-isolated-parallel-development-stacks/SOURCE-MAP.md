# DXK09 | Source map, seam inventory and unresolved owner decisions

**Inspected:** `undertaking/storyteller-workshop@752ed422` via connected GitHub. No access to the live workstation/cluster measurements here. Original plan at `62c930a2` listed `s01..s04`; this revision removes that ceiling.

| Existing owner | Observed constraint | Intended adjustment |
| --- | --- | --- |
| `scripts/repo-tools/dev-tilt.mjs` | One canonical repository root, ports 3000/10350, singleton PID file, fixed workload namespace map | Separate worktree-relative launcher and dynamic slot registry/ports; preserve old path until proven |
| Root `Tiltfile` | Pins `kind-offscreen-lab` | New dev-only context/entrypoint, no release behavior change |
| `infra/kubernetes/lab/dev/Tiltfile` | Four **image types** (web/API/GA/worker), six shared deployment identities, one source root | One slot-parametric graph and build input closure; don't mistake four image types for a four-worktree limit |
| `infra/kubernetes/lab/dev/{web,api,authority,workers}.yaml` | Fixed `lab-edge`, `lab-authority`, `lab-workers`, fixed S3 bucket, Temporal `default` | Structured namespace/tenant/service references and secrets per allocated slot |
| `infra/kubernetes/lab/dev/dev-sync-paths.mjs` | Uses release selector workspace graph, unsafe path fallback | Keep this one dependency graph; prove affected-only per-slot rebuild |
| `infra/kubernetes/lab/dev/tilt/load-dev-image.sh` | Hardcodes `offscreen-lab` and two node names | Dev-only discovered nodes, slot-specific image IDs, serialized imports |
| `infra/kubernetes/lab/dev/Dockerfile` | Copies whole workspace trees, pnpm fetch/install, dependency build in image | Reproduce and fix pnpm `node_modules` context/symlink failure and clean build first |
| `scripts/repo-tools/stack-preflight.mjs` and `infra/kubernetes/lab/lib.sh` | Assert fixed release cluster/context/nodes; release `up.sh` scripts depend on them | Keep release pinning; separate audited dev-only context and capacity guard |
| `infra/kubernetes/lab/{cnpg,temporal}/install.sh` | Release-targeted installers and fixed namespaces | Use as read-only templates; design dev-only bootstrap and tenant provisioners |
| `infra/kubernetes/lab/app-release/install.sh` | Fixed release context and reuses existing game-db/game-runtime secrets | Never invoke unmodified in dev cluster; avoid cross-tenant secret adoption |
| `apps/api/src/modules/auth/{config.ts,auth.ts}` | Better Auth origin, GitHub client ID/secret, trusted-origin requirements | Ratify dynamic slot callback/origin strategy; separate sessions and signing secrets |
| `infra/kubernetes/lab/dev/workers.yaml` | Fixed `default` Temporal namespace/queues, release-lab S3/GA origins | Per-slot Temporal and route wiring, workers never poll other slots |
| Current release proof `TURN03` | Cold images and fault matrix require reliable exclusive runtime | Keep release lab independent from dev slots; DXK09 must not weaken TURN03 proof |

## Collision boundaries to prove

Cluster/context; namespace/workload labels; process/registry ownership; dynamic loopback ports; slot-tagged images; PostgreSQL database/login; bucket/scoped key; Temporal namespace/queues; Better Auth origin/secrets; migration permissions; build and process fingerprint; data-preserving stop/destroy.

## Planner-held source/host decisions

1. **Dev cluster provisioning:** select actual CNPG/Temporal/S3 installation source and fixed dev-only target; establish how to recover after partial infrastructure bootstrap without touching release.
2. **SQL:** concrete idempotent database/login creation and grant restrictions, migrations executed by a purpose-scoped principal.
3. **S3:** exact object-store bucket creation and scoped credential policy; an access-key copied from a global admin secret is not least privilege.
4. **Temporal:** concrete namespace creation/idempotent retry, worker namespace wiring, and limits of namespace-based authorization.
5. **OAuth:** prove per-slot Better Auth trusted origin/redirect handling with a scalable callback arrangement; identify what operator configuration is needed for a fifth or tenth origin.
6. **Host:** measure actual WSL RAM/CPU/disk, container memory pressure and clean/build/edit-to-ready timings with one to four stacks; do not assume four full stacks fit simply because scheduling admits four.
7. **Render:** choose the existing supported structured K8s/Tilt templating route and eliminate raw find/replace or copied manifest trees.
8. **Runtime identity:** identify exact reliable compile/reload/health/receipt hooks across web, API, Game Authority and workers; no source-only readiness.

These decisions belong to ChatGPT planning before T03/T04 readiness. Do not transfer vague architecture investigation to Cursor. No live provisioning has been run by this planning revision.
