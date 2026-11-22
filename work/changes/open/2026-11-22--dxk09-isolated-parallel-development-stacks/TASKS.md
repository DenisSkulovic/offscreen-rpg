# DXK09 | Cursor execution route and readiness gates

**Owner-commissioned, staged:** T01a/T01b/T02/T06a code integrated and one real T01a Docker image build succeeded at `ca3bd03d` (123s, 9.75MB transferred, image SHA recorded in CHANGE.md). This does **not** prove runtime reload, Dev Kind, OAuth, release cold acceptance or four stacks. **T04a cookie-prefix configuration is implemented:** optional `BETTER_AUTH_COOKIE_PREFIX` is omitted by default and, when set, must match one lowercase DNS label before it is passed to `advanced.cookiePrefix`. **T03a bootstrap code is implemented and the owner-authorized live ensure created `kind-offscreen-dev` plus owned namespace `offscreen-dev-system`. T03b tenants, T04b live OAuth, T05 and T07 remain planner-held** until source/host contracts are settled. Do not treat this Change as Done. The parent may start on `change/dxk09-elastic-dev-env` from actual `undertaking/storyteller-workshop` HEAD; integrate into that undertaking only. Do not mistake a commissioned initial stage for authorization to provision/modify live clusters or mark the whole Change Done. One parent owns infrastructure/Tilt code; children get *one small task at a time*.

**Invariant:** preserve existing DXK08 and release code paths until replacement is proven. No raw `tilt down`, `kind delete`, database reset, cluster-wide cleanup, paid provider calls or cross-worktree SIGTERM. Reconcile concurrent local work before commits.

## T01 | Dev Docker context + compiler runtime foundation | READY; dispatch T01a then T01b

**Read (first):** `infra/kubernetes/lab/dev/Dockerfile`, `infra/kubernetes/lab/dev/Tiltfile`, `infra/kubernetes/lab/dev/tilt/load-dev-image.sh`, `infra/kubernetes/lab/dev/dev-sync-paths.mjs`, `apps/{api,game-authority,worker}/package.json` and focused tests. Source confirms API `tsc-watch --onSuccess node ... dist/src/main.js`, GA `tsc-watch --project tsconfig.dev.json --onSuccess node ... dist/src/bootstrap/main.js`, and three worker `tsc-watch` commands in `apps/worker/package.json`.
**Edit ownership:** **T01a** root `.dockerignore` or Dockerfile-specific ignore and dev Dockerfile/build-side focused tests. **T01b** a small watched-compilation/loaded-runtime receipt at existing process/bootstrap owners, tests, and status integration; only after T01a proof. Keep changes to each actual bootstrap/process owner narrowly scoped, no other cluster manifests.
**Algorithm:** exclude host `node_modules`, dist, Next/Turbo build caches, .git and secrets at Docker context boundary; ensure Dockerfile still receives all manifests and source; build npm packages reproducibly inside image; keep safe dependency caching. Compile/reload receipt must represent loaded compiled output, not source copy completion.
**Positive:** fresh and dependency-populated worktree Docker context/build succeed, actual app imports `@better-auth/drizzle-adapter` from container install, edit shared TS dependency → correct runtime artifact/generation; measure context bytes/build time.
**Negative:** introduced compile error yields desired-revision NOT READY, stale old runtime not misrepresented; host symlink paths never sent into context.
**Stop:** clean build still fails for an unrelated non-pnpm dependency, provide stage/log/path, no speculative mass rebuild. If compiled-output fingerprint cannot be tied to the `tsc-watch` spawned Node process without changing fundamental app lifecycle, return exact process/entrypoint evidence to planner rather than invent a daemon.

## T02 | Dynamic worktree identity/port registry | READY

**Read:** `scripts/repo-tools/dev-tilt.mjs`, `scripts/repo-tools/dev-tilt.test.mjs`, `EXECUTION.md#b-worktree-slot-allocator-no-artificial-maximum`.
**Edit ownership:** separate dev registry/allocator module and its pure tests under `scripts/repo-tools/` only.
**Algorithm:** stable canonical-path owner binding; collision-checked DNS-safe ID, atomic local registry lock, dynamic loopback port bundle, stale process reconcilable with resource UID/owner record; no direct K8s mutation in allocator.
**Positive:** 1, 4, 5, 10, 100 synthetic identities without config changes, same worktree reattaches same slot, different worktrees don't share ports.
**Negative:** concurrency allocation race, foreign listener, stale PID reused by another owner, exhausted port range and wrong worktree all refuse without process kill.
**Stop:** platform file/process identity cannot be validated, return exact conflicting API.

## T04a | Per-worktree Better Auth cookie prefix (pure config, not live OAuth) | READY

**Read:** `apps/api/src/modules/auth/config.ts`, `apps/api/src/modules/auth/auth.ts`, `tools/api-integration/test/auth-config.test.ts`, `tools/api-integration/test/auth-options.test.ts`, `apps/web/src/lib/auth-client.ts`.
**Edit:** only these auth config/options owners and focused tests; no app API route, client bypass, OAuth secrets or Kubernetes edits.
**Algorithm:** add optional `BETTER_AUTH_COOKIE_PREFIX` to validated auth config. If omitted, **preserve existing Better Auth default cookie behavior** for release/prod/current single-stack. If set, require a bounded lowercase DNS-safe unique name (e.g. `offscreen-dev-<slotId>`; exact regex must reject empty/whitespace/dots/invalid chars and excessive length). Pass it to `advanced.cookiePrefix` only when configured, alongside existing secureCookie/IP handling. The future slot renderer sets it deterministically from its allocated collision-checked ID. Never derive from TCP port, mutable Git branch name or shared global constant. This is a selected host-cookie isolation strategy because different localhost ports share browser cookie storage.
**Positive:** unchanged auth options without env; two different valid prefixes result in distinct `advanced.cookiePrefix` while keeping GitHub-only provider, exact trusted origin and secret; compile/typecheck and focused auth tests.
**Negative:** invalid explicit prefix fails auth config; no prefix may silently enable a dev bypass; passwords/token/callback values never logged. No claim of browser OAuth proof until T04b runs simultaneously on two loopback ports in one browser profile.
**Stop:** the pinned Better Auth 1.7.5 type/API rejects `cookiePrefix` or a client/SSR cookie reader assumes a fixed prefix; return exact evidence to planner rather than changing authentication architecture.

## T03a | Dedicated dev-cluster identity and guarded bootstrap **code only** | READY

**Why this is independent:** The only implementation authorized here is a safe dev-cluster *foundation* and read-only plan. It does not need the final S3/SQL/OAuth tenant details. Existing `kind-offscreen-lab` release installations remain exclusively pinned to their existing context.

**First reads:** `infra/kubernetes/lab/{kind.yaml,lib.sh,up.sh,namespaces.yaml}`, `scripts/repo-tools/dev-worktree-allocator.mjs`, `infra/kubernetes/lab/cnpg/{install.sh,cluster.yaml,operator.pin}` (read as examples, do not invoke), `infra/kubernetes/lab/temporal/install.sh` (read only). Recheck HEAD and concurrent dirty files first.

**Write ownership:** only new dev-specific, versioned Kind cluster configuration and guarded `plan` / `status` / explicitly separate `ensure` entrypoint and focused tests under `infra/kubernetes/lab/dev/`. Preserve release-lab `lib.sh`, `up.sh`, `kind.yaml`, its cluster/context, and `pnpm dev` until later T05 cutover. This task must NOT own the existing common Tenant provisioner or patch foreign manifests.

**Decided algorithm:**
1. Use the already selected **`offscreen-dev` Kind name and `kind-offscreen-dev` context**, with loopback-only API binding and nonconflicting dynamic API port (do not copy the release-lab hardcoded port 6443). Pin the existing installed Kind node image as an initial compatible baseline; no default `kubectl config use-context` side effects.
2. `plan` is strictly read-only, including Docker/Kind/Kubernetes availability/capacity observations and the intended owned cluster/context/namespaces; print source/target/refusals as structured data. `status` is strictly read-only and reports missing vs foreign resources. No implicit `kind delete` or reset path.
3. `ensure` (implemented but **not invoked by this execution grant**) must reject any preexisting same-named foreign cluster/context, non-loopback API publishing, wrong labels/UIDs or insufficient host resources **before a mutating step**. If creation is later explicitly authorized, create only the independent dev Kind and its dev-owned baseline namespace/storage, preserving pre-existing volumes and kubeconfig current context. Re-entry may adopt only resources with positively verified ownership.
4. The dev bootstrap does not import a release-pinned installer with environment variables substituting its target; CNPG, SeaweedFS and Temporal come later under T03b/c with source-checked dev-only adaptation. No app deployments or tokens at this stage.

**Positive tests:** dry-run `plan` shows `kind-offscreen-dev`, loopback and dynamic host port with no release-lab mutation; read-only status distinguishes absent/owned; controlled test adapters simulate create/re-entry, preserved kubeconfig current context, and independent namespace targeting.

**Negative tests:** foreign cluster collision, already occupied port, missing Docker/Kind, wrong Kubernetes context, failing memory preflight, stale registry owner, and a simulated partial failure all refuse without deletion or adoption of release resources; idempotent no-op when positively owned.

**Stop criteria:** Kind node image/cluster API config cannot be supported by actual pinned binaries, or inability to distinguish an owned resource from a foreign one. Return exact evidence. **No live cluster creation, test migration, or destructive change is permitted in T03a.** Owner must separately authorize the live `ensure` after reading `plan` and obtaining host capacity evidence.

## T03b-1 | Dev-only backing services bootstrap (CNPG, Temporal, S3) | READY FOR CODE, LIVE INSTALL SEPARATELY AUTHORIZED

**Source baseline:** `undertaking/storyteller-workshop@c760cbd8`. Read `infra/kubernetes/lab/dev/dev-cluster-bootstrap.mjs`, `infra/kubernetes/lab/dev/dev-cluster-host-probe.mjs`, `infra/kubernetes/lab/cnpg/{install.sh,cluster.yaml,operator.pin}`, `infra/kubernetes/lab/object-storage/{store.yaml,smoke.sh}`, `infra/kubernetes/lab/temporal/{install.sh,images.pin,postgres.yaml,schema-job.yaml,server.yaml,namespace-job.yaml}`, `infra/kubernetes/lab/lib.sh`. Do not reuse release scripts by overriding KUBECONFIG.

**Ownership:** new dev-only manifests and bounded `plan/status/ensure` under `infra/kubernetes/lab/dev/backing/`, plus focused tests. This stage installs one shared backing-service set **inside `kind-offscreen-dev` only** (app CNPG, Temporal with own persistence database, SeaweedFS), not any per-worktree applications, databases, buckets or namespaces. `kind-offscreen-lab` must not be modified, nor require a restart.

**Decided execution algorithm:**
1. Pin **explicit `--context kind-offscreen-dev` on every kubectl call**. Kind cluster must equal `offscreen-dev`, API loopback, baseline owned namespace label `offscreen.dev/owner=offscreen-dev`. Guard all mutations with exact target identity and positive existing-resource owner labels/UID checks. A missing label on an existing resource means *foreign*, not adoptable; do not delete/relabel to force ownership. No ambient current-context switch.
2. `plan` and `status` are read-only, bounded, and show resource inventory/owner, PVC status, expected images, capacity, and exact rejected conditions without printing credentials. `ensure` requires a distinct explicit authorization flag; fail closed before mutation if host memory/disk/pod-pressure signals or Docker/Kind connectivity are unhealthy. No automatic retries of unresponsive Docker.
3. Reuse pinned **CNPG 1.30.2** operator *in the dev cluster*, checking its SHA/pin and existing CRDs/webhook. Create a separate dev-owned app database cluster in a dev-specific namespace, with one primary, persistent PVC, and a measured initial resource budget. Do not simply reuse release `max_connections=20` as an N-slot limit. Begin with a **documented initial `max_connections=100` proposal** and conservative dev runtime pool cap `DB_POOL_MAX=2` (not an unverified guaranteed capacity): verify memory fit and actual connection counts before enabling four full stacks; no changes to release config. Decide/apply values only after positive capacity read. A default pool maximum is a cap, not open sockets.
4. Deploy SeaweedFS **4.54** shared dev-only `mini` with PVC, ClusterIP, and bootstrap/admin credentials generated exactly once as Kubernetes Secret, created idempotently (never silently rotate on rerun). Server credentials must remain only in the dev backing namespace, not copied to tenant app namespaces. No tenant gets S3 access in this stage. Do not run the release smoke script, which creates a single `lab-objects` bucket and global credential.
5. Deploy pinned Temporal server **1.32.2** with *separate Temporal PostgreSQL PVC*, same pinned images/health contract as release, dev-only names and namespace. On first initialization, issue a one-time schema Job, track its completion and refuse unknown already-existing conflicting Jobs; on re-entry, verify schema/version and skip destructive rerun. Never delete/replace a Temporal schema Job merely to make `apply` succeed. Create only the internal Temporal `default` namespace if required for server boot; future worktree namespaces are T03b-2. No release services/worker pools.
6. On partial failure, **retain already-created owned PVCs/secrets**, report stage and exact next safe re-entry check; no rollback that removes data. Ensure is idempotent and stage-aware. Preserve existing release status before/after and current kubectl context. Append evidence to DXK09's existing PROOF.md / evidence path without saving secrets or repeated verbose logs.

**Focused positive tests:** render deterministic dev manifests; explicit context in every command; read-only plan/status; fresh ensure with injected adapter; idempotent reentry; one-time secret/schema initialization; S3 secret not handed to apps; release state unchanged; failing component leaves its PVC and earlier services intact.

**Discriminating negatives:** existing foreign same-name Namespace/Secret/Job/PVC/operator; wrong kube context, service missing, memory insufficient, occupied API port, Docker timeout, partial schema failure, secret rerun, accidental release namespace/path, and unverified image pin all fail closed.

**Execution authorization:** **Implement code and fake-adapter tests now; do not invoke live backing-service ensure until owner sees a real read-only plan and explicitly authorizes it.** This does not authorize T03b-2 identity allocation. Stop if an existing pinned release manifest cannot be parameterized without bypassing release guards. No broad architecture research by Cursor; return exact file/function contradiction.

## T03b-2 | Per-worktree SQL/S3/Temporal tenant provisioning | PLANNER HOLD

**Selected identities:** derive stable DNS-safe tenant ID from T02 registry; allocate SQL `dev_<id>` database with unique runtime role, separate bounded migration authority, bucket `offscreen-dev-<id>` with truly bucket-scoped credentials, and unique Temporal namespace + task queues. No hardcoded worktree-count limit. Preserve tenant state on ordinary stop; destroy separate explicit operation.

**SQL:** Source `packages/db/src/config.ts` defaults pool cap 5, `packages/db/src/migrate.ts` uses a single migration `pg.Client`. Dev config should start with a lower pool cap per app role, subject to real measurements; four slots × at least three SQL consumers × max 2 = nominal 24 connections before migrations/reserve. Use CNPG v1.30 `DatabaseRole` + `Database` CRDs if compatible with pinned operator, explicitly revoke `CONNECT` from `PUBLIC`, grant only slot role; verify role A cannot CONNECT to B. DB owner/migration role must not escape its database; no unbounded privilege reuse or logged passwords.

**S3:** Source `object-storage/store.yaml` is SeaweedFS 4.54 `weed mini`; `object-storage/smoke.sh` issues a global admin credential. Candidate is `weed shell` `s3.bucket.create` + `s3.user.provision -bucket ... -role readwrite`; do not claim compatible until installed pinned dev server answers those commands and client A's GET/PUT/DELETE succeeds while access to bucket B is denied, including after an object-store restart. Credentials only to matching tenant Kubernetes Secret. If dynamic credentials do not propagate/persist, stop and return exact probe evidence; never distribute the global admin key.

**Temporal:** current `temporal/namespace-job.yaml` uses `temporal operator namespace describe/create`; use per-slot namespace and worker task queues on the new dev server, verify A workers cannot silently poll B. Temporal namespaces aren't a strong authorization boundary in an unauthenticated shared server; prevent accidental cross-routing, document trusted-local-dev threat model instead of claiming adversarial security.

**Not authorized:** tenant creation, live browser OAuth, per-slot apps, T05 lifecycle, T07 concurrency proof remain separately gated. T03b-1 must first run and prove healthy shared backends.

## T03 | Shared dev bootstrap + real per-slot SQL/S3/Temporal tenants | PLANNER HOLD

**Read:** `infra/kubernetes/lab/{lib.sh,up.sh,kind.yaml}`, `cnpg/{install.sh,cluster.yaml}`, `temporal/{install.sh,namespace-job.yaml}`, *verified* object-store installer and settings.
**Edit:** new dev-only bootstrap, tenant job/provisioner and tests under `infra/kubernetes/lab/dev/`; don't weaken release-pinned guards.
**Algorithm:** one dev Kind; shared backends; per-identity app DB/login + bounded migration credential, unique bucket and server-enforced bucket-scoped principal, Temporal namespace/queues; idempotent ownership fencing and recovery, Postgres connections sized with app pools. Explicit wrong-context refusal.
**Positive:** independent tenants migrate/read/write/execute and negative cross-credential denial.
**Negative:** wrong context, existing foreign resource, missing S3 scope or database overconnection refuse without destructive side effect.
**Stop:** exact S3/DB privilege APIs unverified, host capacity unknown. Planner must settle those, not a Composer child.

## T04 | Per-slot app graph, OAuth and credentials | PLANNER HOLD

**Read:** `infra/kubernetes/lab/dev/{Tiltfile,web.yaml,api.yaml,authority.yaml,workers.yaml}`, `apps/api/src/modules/auth/{config.ts,auth.ts}`.
**Edit:** one typed manifest renderer/graph, tests, no four/five copied files; all output generated outside git tree.
**Algorithm:** slot-local DNS/secrets/image tags; Better Auth origin on dynamic 127.0.0.1 port with existing GitHub app loopback redirect; validate exact callback/browser flow and session isolation; optional service profiles with no cross-slot service fallback.
**Positive:** two real OAuth browser sign-ins on different ports; independently rendered 5th/10th config; correct authorization and tenant data.
**Negative:** absent app config, redirect mismatch, wrong cookie, cross-slot DNS, secret leaks cannot be marked READY.
**Stop:** loopback provider flow not proven; revert to planner if provider limitation affects design.

## T05 | Worktree-relative Tilt start/status/stop + fail-closed freshness | PLANNER HOLD (depends T03/T04)

**Read:** `scripts/repo-tools/dev-tilt.mjs`, `infra/kubernetes/lab/dev/{Tiltfile,dev-sync-paths.mjs,tilt/load-dev-image.sh}`.
**Edit:** scoped per-worktree launcher, Tilt invocation and tests, no global daemon.
**Algorithm:** dynamic isolated port forwards, resource binding and image load, typed one-resource-at-a-time Tilt actions where needed, bounded readiness per app role, source/compiler/process receipt and actionable failure diagnostics. Stop targets owned Tilt/namespace only, preserving tenants.
**Positive:** A edit and reload affects only A, B's Pod/image/build/records unchanged; rapid start/status/stop in four worktrees.
**Negative:** bad arguments not passed to CLI; crashed Tilt/failed compile/wrong context/collision reports exact stage; no hijacking another process.

## T06a | Bounded release acceptance preflight/smoke runner | READY FOR NONMUTATING CODE ONLY

**Read:** `infra/kubernetes/lab/app-release/install.sh`, `infra/kubernetes/lab/dev/tilt/build-release-images.sh`, TURN03 current execution/proof helper; existing `pnpm stack:*` scripts.
**Edit:** scoped release preflight/smoke adapter and isolated unit tests (exact new paths under `infra/kubernetes/lab/app-release/`). Must reuse existing TURN03 harness, not invent a second golden scorecard.
**Algorithm:** pin commit/images/config/context, collect diagnostics, report cold provider-free story scene/recovery stage. Separate read-only preflight and explicit authorized mutating acceptance; no dev Tilt stop/restart.
**Positive:** dry-run plan and structured stage classification, dirty source/release identity mismatch refusal, no dev context interaction.
**Negative:** missing auth/env/foreign context/unknown migration returns a read-only refusal; never runs live fault suite implicitly.
**Stop:** existing TURN03 harness cannot expose needed evidence without modifying acceptance semantics, return exact signature to planner. Live acceptance remains permission gated.

## T05 lifecycle refinement | On-demand release vs default dev

**Decision:** everyday use requires only `kind-offscreen-dev`; `kind-offscreen-lab` must be configured and capable of explicit start/status/non-destructive stop for release acceptance. Dev start never implicitly starts release. A deliberate release run may request dev shutdown to free memory, but must not force it. Both clusters must have separate ownership, identity, secrets, data and endpoint routing. New environment purposes can later be added as separately configured targets.

**Hard stop before implementing cluster stop:** Kind has no established, source-proven safe suspend/resume path in this packet. Do not implement stop as `kind delete cluster`. Assess candidate node-container stop/start and recovery **in a disposable fixture only**; verify database/object-store/PVC continuity across restart and Docker Desktop/WSL lifecycle. If unsupported, return an architectural blocker to ChatGPT. Separately, app workload pause/resume may be supported without claiming cluster is stopped.

**Proof updates:** dev-only four-stack test runs with release idle; release-only cold acceptance can run while dev is deliberately stopped; repeated switch dev→release→dev preserves source-bound workloads, auth data, SQL, object data and Temporal state. Optional coexistence proof is capacity-gated, not a requirement of ordinary dev operation.

## T07 | Four-way full-stack and elastic capacity acceptance## T07 | Four-way full-stack and elastic capacity acceptance | PLANNER HOLD (after T01–T06)

**Read:** `PROOF.md`, launcher, actual backing provisioner, `docs/runbooks/local-development.md`.
**Edit:** tests, runbook, evidence report, status reconciliation; no production feature code.
**Algorithm:** two then four simultaneous full-stack worktrees; separate signed-in provider-free stories; fifth/tenth provisionability and dynamic identities; measure memory, CPU, Docker context, build and edit-to-ready throughput, Postgres connections, slowest app and restart.
**Positive:** four concurrent workflows with zero cross-interference, release lab running independently; safe stop and restart, no manual k8s repair.
**Negative:** overload refuses before partial provisioning, cross-tenant and cross-source operations denied, compile failures don't show READY.
**Stop:** target host cannot support four complete slots; record measured bottleneck, keep Change open and return capacity decision. No performance-number invention.

## Integration and evidence

Parent coordinates small children sequentially, runs focused tests each stage, documents exact source/runtime fingerprint and only merges confirmed edits. T01/T02/T06a may be separately committed into integration after their bounded gates, but **whole DXK09 remains open** until T03–T07 live proof passes. Bring new structural evidence back to ChatGPT before unlocking planner-held tasks, rather than requesting ordinary micro-approvals.

## Mandatory post-foundation correction before T03

**T01a compatibility follow-up (landed):** `docker build --help` on this host has no `--ignorefile`. The dev build now uses `infra/kubernetes/lab/dev/Dockerfile.dockerignore`. A real BuildKit transfer of the repo-root context was 9.09MB in 2.7s. That build then failed inside the image because the dev receipt used `import.meta` in CommonJS `tsc` output (`apps/game-authority/src/bootstrap/main.ts`). The receipt now hashes `OFFSCREEN_DEV_COMPILED_ENTRY` instead. A later complete build, after Docker Desktop 4.99.0 answered `docker version`, produced `offscreen-dev-context-probe:dxk09` image `sha256:23361c339b9028f4ecc6ff8a343bee0cb308f347a7c99be7f5508b4d91e30351` in 123s. BuildKit transferred 9.75MB of context in 2.7s. The image contains `apps/game-authority/dist/src/bootstrap/main.js` without `import.meta`, plus `apps/api/node_modules/@better-auth/drizzle-adapter` from the in-image install. API `dist` is absent because the Dockerfile builds `@offscreen/api^...` dependencies and leaves the app entry to the dev watcher. T03/T04 remain planner-held.

**Planner narrowing for T03:** `object-storage/store.yaml` is SeaweedFS 4.54 `weed mini` with one global S3 key. Avoid reusing `object-storage/smoke.sh` credential path for worktree apps. T03 must create/enforce per-slot S3 identities and verify deny-on-other-bucket on the *actual chosen server* before any release from PLANNER HOLD. `packages/db/src/config.ts` has default `DB_POOL_MAX=5`; choose a measured connection budget for app consumers and migrations rather than copying CNPG's `max_connections=20` into an elastic cluster.

**Planner narrowing for T04:** per-slot `APP_ORIGIN` and secret are insufficient when all ports use `127.0.0.1`: cookies ignore port. Add deterministic per-slot `advanced.cookiePrefix` to the existing Better Auth configuration, after checking version-specific 1.7.5 support and all cookie readers. Prove simultaneous GitHub OAuth sign-in/out in two ports and prevent both login-state and session-cookie collisions. Do not hand cookie naming/redirect architecture to a Composer child to figure out.
