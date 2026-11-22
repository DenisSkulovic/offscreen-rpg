# DXK09 | Cursor execution route and readiness gates

**Owner-commissioned, staged:** T01a, T01b, T02 and T06a code is integrated on `undertaking/storyteller-workshop` with focused unit tests only. Live Docker image build, cluster provisioning, OAuth and four-stack proof are **not** done. **T03, T04, T05 and T07 remain planner-held** until their source/host contracts are settled. Do not treat this Change as Done. The parent may start on `change/dxk09-elastic-dev-env` from actual `undertaking/storyteller-workshop` HEAD; integrate into that undertaking only. Do not mistake a commissioned initial stage for authorization to provision/modify live clusters or mark the whole Change Done. One parent owns infrastructure/Tilt code; children get *one small task at a time*.

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

## T07 | Four-way full-stack and elastic capacity acceptance | PLANNER HOLD (after T01–T06)

**Read:** `PROOF.md`, launcher, actual backing provisioner, `docs/runbooks/local-development.md`.
**Edit:** tests, runbook, evidence report, status reconciliation; no production feature code.
**Algorithm:** two then four simultaneous full-stack worktrees; separate signed-in provider-free stories; fifth/tenth provisionability and dynamic identities; measure memory, CPU, Docker context, build and edit-to-ready throughput, Postgres connections, slowest app and restart.
**Positive:** four concurrent workflows with zero cross-interference, release lab running independently; safe stop and restart, no manual k8s repair.
**Negative:** overload refuses before partial provisioning, cross-tenant and cross-source operations denied, compile failures don't show READY.
**Stop:** target host cannot support four complete slots; record measured bottleneck, keep Change open and return capacity decision. No performance-number invention.

## Integration and evidence

Parent coordinates small children sequentially, runs focused tests each stage, documents exact source/runtime fingerprint and only merges confirmed edits. T01/T02/T06a may be separately committed into integration after their bounded gates, but **whole DXK09 remains open** until T03–T07 live proof passes. Bring new structural evidence back to ChatGPT before unlocking planner-held tasks, rather than requesting ordinary micro-approvals.

## Mandatory post-foundation correction before T03

**T01a compatibility follow-up:** Current `load-dev-image.sh` uses `docker build --ignorefile`, not listed in Docker's Buildx options. The unit test `dev-docker-context.test.mjs` positively asserts that string. Commission a *bounded* correction, only if local `docker build --help` does not support it: adopt `infra/kubernetes/lab/dev/Dockerfile.dockerignore` (Docker's documented convention), remove the nonportable flag, align `dev-docker-context.mjs` and its tests with the actual file, and verify file-context exclusion. Test with the real Docker builder once WSL/Docker responds; do not mark full T01a proof from string matching alone. If the Docker CLI/daemon hangs, capture the exact client/daemon boundary and stop rather than launching long repeating builds. This is **Ready as a focused correction**, independent of T03/T04.

**Planner narrowing for T03:** `object-storage/store.yaml` is SeaweedFS 4.54 `weed mini` with one global S3 key. Avoid reusing `object-storage/smoke.sh` credential path for worktree apps. T03 must create/enforce per-slot S3 identities and verify deny-on-other-bucket on the *actual chosen server* before any release from PLANNER HOLD. `packages/db/src/config.ts` has default `DB_POOL_MAX=5`; choose a measured connection budget for app consumers and migrations rather than copying CNPG's `max_connections=20` into an elastic cluster.

**Planner narrowing for T04:** per-slot `APP_ORIGIN` and secret are insufficient when all ports use `127.0.0.1`: cookies ignore port. Add deterministic per-slot `advanced.cookiePrefix` to the existing Better Auth configuration, after checking version-specific 1.7.5 support and all cookie readers. Prove simultaneous GitHub OAuth sign-in/out in two ports and prevent both login-state and session-cookie collisions. Do not hand cookie naming/redirect architecture to a Composer child to figure out.
