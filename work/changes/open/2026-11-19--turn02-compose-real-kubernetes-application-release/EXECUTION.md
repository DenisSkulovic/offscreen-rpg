# TURN02 | one release integrator, bounded implementation plan

**Profile:** RELEASE · **Source inspection:** `584b594` · **State:** proposed release strategy, not runnable/selected. Start [SOURCE-MAP](SOURCE-MAP.md) at the specific blocker; do not pass it wholesale to every Cursor subagent. [TURN03](../2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) is the only full-campaign gate.

## Release target

Produce **one** repeatable `infra/kubernetes/lab/app-release` overlay and a bounded `install.sh / smoke.sh / cleanup.sh` (names illustrative; adopt existing script conventions), using **actual** application binaries, not `skeletons/workloads.yaml`, while preserving all synthetic lab smokes. The local kind cluster is the sole experimental target. No cloud provisioning, cost, paid model, production HA, persistent host app volumes, or public ingress.

No container of the actual game should need the checkout `content/` directory as a volume. The one explicit exception is the trusted **importer Job**, which owns importing pinned content. The release is green only when real app services can read that store and the operator can prove which pinned manifest is selected.

## Implementation route, dependency-ordered

### Slice 1: bootstrap blockers, independent of cluster

**Owner:** one source integrator (`PATCH`); do this while image/build design proceeds read-only.

- Fix `apps/api/src/main.ts` to support `OFFSCREEN_DEFAULT_RULE_ROOT_HASH` or accepted equivalent for S3 startup. Validate the hash with existing `contentHashSchema`, call `documentStore.readRulePackageManifest(hash)`, and build the same `defaultRules` shape used today. Preserve Compose's `OFFSCREEN_DEFAULT_RULE_SOURCE` path import where no pinned S3 env requested. If both source and hash are supplied, reject inconsistent/conflicting mode rather than silently choose whichever works.
- `packages/documents/src/{s3-store,local-store}.ts` already supports `readRulePackageManifest`, no new store abstractions needed. Do not refactor `start.ts`.
- Unit integration negatives: valid imported rule pin and correct manifest; missing pin; corrupt/missing object; mismatching rule set/revision; S3 configured with no runtime source directory; legacy local source still valid. Ensure Nest calls `createApp` only with verified defaultRule reference.
- Set published rule root from the actual BOOT02 imported fixture if it is the chosen world, not the unrelated SRD local default. Check `packages/application/src/stories/start.ts` uses pinned equivalence. No code hardcoded local root for all games.

**Acceptance to move on:** API starts in S3 mode without local source tree and refuses a bad manifest. It has not proven a browser or a scene.

### Slice 2: real images, safe runtime and app contracts

**Owner:** image integrator (`PATCH`), disjoint from first step, one coordinator for workspace lockfiles.

- Build root workspace dependencies with pinned Node 24 / Corepack `pnpm@11.19.0`; use frozen lockfile, multi-stage builder, copy only compiled runtime closure. Preserve package exports, `node_modules` symlinks, Next static assets and modules needed by Next Server; do not run `pnpm install --prod` blindly inside one package without testing workspace links.
- Select real image entrypoints: `@offscreen/web` Next start (override `--hostname 0.0.0.0` inside Pod), `@offscreen/api` `dist/src/main.js`, `@offscreen/game-authority` `dist/src/bootstrap/main.js`; worker entrypoints depend on STORY03 actual control/executor split. Use existing package scripts, do not borrow `lab-once` Toy Worker.
- Avoid `ARG OPENROUTER_API_KEY`/secret in Docker build layers. Never embed the GitHub OAuth client secret, Game Authority token or S3 secret in the image. Mutable runtime config comes from protected Secret/ConfigMap.
- Generate SBOM/lockfile/image digests as available and smoke each image's startup locally against stubbed endpoints first. Do not guess release disk/RAM; report `kubectl top` if installed or Pod requests and sampled Docker stats.
- Confirm `apps/web/next.config.ts` `API_PROXY_ORIGIN` rewrite in **production build**. Next SSR's `API_INTERNAL_ORIGIN` is a separate runtime reader. Build-time env assumptions must be tested by actual `next build && next start` with distinct backend rather than blog folklore.

**Acceptance:** image starts on `0.0.0.0`, Service resolves Pod IP, initial package imports are not attempted in app runtime and no account keys appear in image/env dumps.

### Slice 3: one named network and secrets/release join

**Owner:** single `INTEGRATE` coordinator, exclusive lab cluster lock.

- Reuse `up.sh`, `lib.sh`, `cnpg`, `object-storage`, `temporal`, `gateway` and BOOT02 importer. Do not use the fake `skeletons` deployment as app. Pin installed infrastructure digests and ensure capacity before each stage, keeping cluster creator responsible for safe cleanup.
- Place Next/Nest in `lab-edge` to satisfy existing Gateway `allowedRoutes.namespaces.from: Same`, with Services named unambiguously (`game-web`, `game-api`), and route `/` and `/api` to these. Retain the synthetic Gateway smoke as separate manifest/test; don't overwrite its fixture. GA, worker and databases use ClusterIP-only internal Services/namespaces. If cross-namespace Service backend ref becomes necessary, add valid ReferenceGrant and test no accidental broad routing.
- Migration Job runs `pnpm db:migrate` **once per release**, with dedicated DB role; gate all app replicas on its success. Do not put migrations in an API or GA startup loop. Importer Job runs once with pinned content/source image; validate exact object digests from a **different** Pod using the real app's S3 credentials.
- Config env: API `API_HOST=0.0.0.0`, `API_PORT=3001`, `APP_ORIGIN=http://127.0.0.1:18080` for same loopback port-forward, `GAME_AUTHORITY_MODE=distributed` (must not omit), `GAME_AUTHORITY_ORIGIN=http://game-authority.<namespace>.svc.cluster.local:3002`, service token; GA `GAME_AUTHORITY_HOST=0.0.0.0`, matching credentials. Web `API_INTERNAL_ORIGIN` and `API_PROXY_ORIGIN` point at Nest Service, not 127 inside separate Pod. Worker `TEMPORAL_ADDRESS` resolves the lab Temporal Server (confirm namespace/actual Service name).
- Single `127.0.0.1:18080` host port forward as in `docs/runbooks/kubernetes-gateway.md`; no workload Service NodePort/LoadBalancer. Github OAuth client must accept correct callback; don't substitute an unsigned fake bearer in production app routes. Developer/test-only seed is allowed only as separately documented, locked-down test harness if genuine GitHub login isn't practical locally.
- Startup probes: public Next route and Nest lightweight health with bounded timeout; GA internal health; worker process and Task Queue poller evidence (a Node process being alive is insufficient to prove a worker is polling). Readiness must not assert successful story publication.
- Deployment Secrets/API Pod env may still have general DB access per current source. Document transitional limitation; do not call it SQL-enforced one-writer isolation. Narrow GA actor routes and service-only transport are DIST03/BOOT03/STORY03 dependencies.

**Acceptance:** one image generation/manifest revision, migrations once, imported pins from shared S3, SSR cookie authenticated, public `/api` and SSE proxy bound to one origin; no public GA, SQL, Temporal or Rabbit endpoint.

### Slice 4: minimal executable integration smoke (TURN02 only)

Build a machine-readable suite which observes: (1) app Pods by **actual** image digest, (2) Node listener via Service DNS, (3) Nest config/DB health, (4) private GA rejects wrong token and public GA returns 404, (5) importer hash read from GA Pod, (6) Next SSR/API rewrite requests reach Nest, (7) Temporal real worker task on its distinct queue, (8) environment memory and safe teardown. A completed **game scene, action, historical fork and browser SSE** belong to TURN03 and K8S11; do not mark those PASS based on a startup probe.

Use `kubectl --context kind-offscreen-lab` in every script; shared `flock 9 /tmp/offscreen-k8s-cluster.lock` covers create through down, and stop if cluster existed before this run. The release script may run in independent phases but must not race a second owner. Cache images only if validated by digest and preserve Compose volumes, existing user contexts and namespace resources.

## Join and evidence classification

| Gate | Upstream | Here | Success evidence |
| --- | --- | --- | --- |
| Content | BOOT02 imported pins; BOOT03 candidate/start | runtime rule root from S3 and shared object permissions | exact root and no runtime source directory |
| Service/API | DIST03 private story seam, BOOT03 GA start; K8S11 edge | Deploy real Nest+GA+Next, same-origin env | auth and GA transport, 401/403 negatives |
| Worker | STORY02 custody, STORY03 versioned workflow and split | Deploy control/outbox and distinct executor | polling queues + fake saved result reaching GA, not just toy workflow |
| Scene/fork | DATA04/06 checkpoint/fork | shared S3/PG and migration | TURN03 proves actual state; TURN02 cannot claim it alone |
| Broker | DIST02/04 if separately selected | optional projection consumer | failing Rabbit never makes turn unstartable or unpublished |

**Non-goal:** making RabbitMQ a compulsory Temporal adapter; the selected outbox→Temporal control path is already direct. A separate rebuildable postcommit Rabbit read-model is interesting engineering, but **not** required for the first playable scene. This implements D5's optionality and reduces critical path.

## Stop rules, not architecture roulette

If the new container cannot resolve workspace package exports, stop and correct only packaging. If the auth origin rejects a real session, stop and investigate forwarded browser origin and cookie path before changing Better Auth security policy. If an API S3 startup lacks the rule manifest, stop and fix canonical pin loading before shipping source directories. If the only working route is a direct Nest write bypassing GA, the distributed game remains FAIL. If worker polls old and new activity sets from same queue, stop and restore split/compatibility. If a function silently falls back to fake on a failed live-provider attempt, stop: paid/live permission isn't part of TURN02.

**No new Change ID:** this supplements existing TURN02/K8S11/BOOT03/STORY03 execution contracts. A reader should implement each bounded existing packet rather than opening an unowned infrastructure rewrite.
