# DXK09 | Source-grounded failure map and unresolved seams

**Source inspected:** `undertaking/storyteller-workshop@f6abb22b68cb` GitHub files; no workstation process/WSL resource access, no live cluster tests. Historical Cursor terminal excerpts provided by owner are observations, **not** proof of current host state. Do not infer environment success or actual 503 cause.

| Failure observed | Source anchor and finding | DXK09 owner / solution | Not solved merely by namespace isolation |
| --- | --- | --- | --- |
| `invalid file request apps/api/node_modules/@better-auth/drizzle-adapter` | `infra/kubernetes/lab/dev/Dockerfile` copies monorepo `apps/packages/tools`; `dev/tilt/load-dev-image.sh` calls root-context `docker build ... .`; root `.dockerignore` absent from inspected GitHub ref | T01 build-context exclusion, pnpm install within image, clean-build and dirty-worktree regression | Yes |
| 2+ GB Docker context | Same Dockerfile and root context; terminal report `transferring context` 2+ GB, actual bytes not independently captured | T01 measure context and shrink; preserve needed manifests | Yes |
| Speculative Docker cache pollution, forced serialization | `TURBO_FILTER` occurs after pnpm install in Dockerfile; shared dependency layer can be correct. `load-dev-image.sh` imports to hardcoded two Kind nodes one at a time because prior WSL vsock failures | T01/T05 preserve safe layer reuse; measure build/import contention; serialize image loads only if required | Yes |
| Wrong Tilt CLI arity, manual resource triggers and `kubectl -n a,b` misuse | `dev/Tiltfile` declares six resources; `dev-tilt.mjs` polls fixed namespace map; no worktree-aware status command | T05 coherent CLI and structured diagnostics, no user/agent manual readiness loops | Yes |
| Source synced but stale `dist` / process | `dev/Tiltfile` `custom_build` and `sync`; game workers use `pnpm ... run dev:*` and TypeScript watches, health primarily deployment availability | T01/T05 compiler-process-runtime freshness receipt and fail-closed desired-version status | Yes |
| `tsc` OOM and slow worker return | `dev/workers.yaml` has three separately watching workers with 2Gi memory **limits** each, `NODE_OPTIONS=--max-old-space-size=1536`; limits are not measured usage | T01 actual compiler profiling, T07 memory budget/build topology | Yes |
| Shared runtime despite multiple Git worktrees | `scripts/repo-tools/dev-tilt.mjs`: fixed ports `3000`/`10350`, shared PID file; root Tiltfile and `dev/Tiltfile`: `kind-offscreen-lab` and fixed namespaces/images | T02/T03/T04/T05 dynamic worktree registry and full tenant isolation | Yes |
| Dev vs cold-release replaces same deployments | `app-release/install.sh` and dev Tilt target `kind-offscreen-lab`, same application footprint | T03 independent dev cluster, T06 guarded release-lab smoke that coexists without dev stop/restore | Yes |
| Dev tenants can exhaust Postgres connections | `infra/kubernetes/lab/cnpg/cluster.yaml`: `max_connections: "20"`, 1 primary and 768Mi limit in lab; app API/GA/relay use DB | T03/T07 app pool inspection and connection budget, sizing/timeout negative tests | Yes |
| S3 copied admin credentials | `app-release/install.sh` copies `lab-objects/object-store-s3` access key into `game-runtime` when absent | T03 must use truly scoped per-bucket identities, not copy admin key to every dev tenant | Yes |
| Per-slot OAuth origin unclear | `apps/api/src/modules/auth/config.ts` validates `APP_ORIGIN` and GitHub keys, `auth.ts` assigns Better Auth `baseURL` and trusted origin; exact callback path `/api/auth/callback/github` | T04 dynamic localhost origin, real two-port callback proof; GitHub now documents loopback redirect port flexibility | Yes |
| Cold release writer-plan 503 / no scene 2 | TURN03 current execution/proof, Game Authority writer-plan call returned HTTP 503. No observed diagnosis identifying code vs config vs deployment | T06 reproducible release runner / logs only; **TURN03 must still fix actual writer behavior** | **NO: substantive product/release defect remains** |

## Exact existing owners to read before implementation

- **Build:** `infra/kubernetes/lab/dev/Dockerfile`, `infra/kubernetes/lab/dev/Tiltfile`, `infra/kubernetes/lab/dev/tilt/load-dev-image.sh`, `infra/kubernetes/lab/dev/dev-sync-paths.mjs`, `infra/kubernetes/lab/app-release/select-affected-images.mjs`, `scripts/repo-tools/dev-tilt.mjs` and its tests.
- **Infrastructure:** `infra/kubernetes/lab/{lib.sh,up.sh,kind.yaml}`, `infra/kubernetes/lab/cnpg/{install.sh,cluster.yaml}`, `infra/kubernetes/lab/temporal/{install.sh,namespace-job.yaml,server.yaml}`, verified actual object store installer (not yet located by this connector read).
- **Application rendering:** `infra/kubernetes/lab/dev/{web.yaml,api.yaml,authority.yaml,workers.yaml}`. All use fixed namespaces and release-lab backing addresses; worker YAML has a single Temporal namespace `default`.
- **Auth:** `apps/api/src/modules/auth/{config.ts,auth.ts}`; `docs/runbooks/local-development.md` records current GitHub OAuth app localhost callback.
- **Release:** `infra/kubernetes/lab/app-release/install.sh`, `infra/kubernetes/lab/dev/tilt/build-release-images.sh`, `work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/TURN03-CURRENT-EXECUTION.md`.

## Committed architecture versus missing verification

**Selected:** dynamic allocation, shared server with tenant-level data, separate dev Kind, one template graph, source→compiler→runtime version evidence, independent release runner, GitHub loopback redirect rather than a custom OAuth broker.

**PLANNER BLOCKERS before T03/T04:** actual object-store provisioning implementation and enforceable scoped-bucket credential mechanism; exact CNPG app-pool/tenant-grant/bootstrap path and connection pressure; concrete safe dev-only bootstrap manifests; actual host resource measurements; live GitHub loopback two-port/Better Auth callback and token behavior. Source files inspected here are *insufficient* to assert those live/provider properties. Architecture disagreements return to ChatGPT with source evidence. Pure T01/T02 and bounded T06 runner code need not wait for live deployment.

**External reference:** GitHub OAuth authorization docs, Loopback redirect URLs (current 2026), state `redirect_uri` may use a different local port from registered loopback callback; GitHub also imposes OAuth token creation/rotation limits. Docker build cache guidance favors excluding node_modules and isolating mutable sources, not blanket disabling caches.
