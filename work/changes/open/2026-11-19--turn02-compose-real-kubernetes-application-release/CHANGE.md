# TURN02 | Compose one reproducible Kubernetes release for real application services

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) contains bounded subagent assignments and exact failure/stop tests; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) reconciles dependencies and program order. **Default Cursor parent and child: Composer 2.5 Standard.** This packet's delegation: pinned S3 bootstrap, real images and one serialized cluster join. Existing state, owner selection and spend/cluster gates remain authoritative; no automatic Grok escalation or broad child research. A prepared task is not a passing proof.

**State:** Selected. **T01 pinned-manifest startup suite VERIFY PASS** @ `ec73a535` (2026-11-20); **T02 API/GA image slice copied onto MAIN** @ `ec73a535` (2026-11-20); **T03 Next image built locally** on `9fa937cf` (2026-11-20); **T04 overlay applied** on `kind-offscreen-lab` (2026-11-20): migration Job succeeded, Next, Nest, and Game Authority Ready, pinned fixture imported; one scripted `storytellerDistributedV1` completed through execute and publish; signed-in browser **NOT-RUN**; **not Done**; **no Kubernetes application release claimed**.  
**Kind:** implementation  
**Execution:** Not in the active Cursor batch; owner or authorized orchestrator must select this Change separately.  
**Program:** [D5 full release and acceptance](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

**Packet profile:** `RELEASE` (ChatGPT-inspected baseline `584b594`). [SOURCE-MAP.md](SOURCE-MAP.md) names actual entrypoints, listener/hostname blockers, local rule import at API startup, same-origin auth and S3 pins. [EXECUTION.md](EXECUTION.md) is the dependency-ordered execution route; Cursor's child reads only the narrow section it is implementing. These are planning documents, not Kubernetes proof.\n\n**Source-level preflight blockers:** (1) Next and API/GA default to loopback listener inside Pods; explicit `0.0.0.0` release config required. (2) Nest still imports a local rules directory whenever the S3 store is active; the real Pod needs a validated pinned S3 rule-manifest reference instead. (3) Next `/api` rewrite and SSR have separate origins and the OAuth browser origin must match one loopback forwarded host. These are documented in SOURCE-MAP and must be fixed/tested before cold release.\n\n## Precisely bounded outcome

Compose one reproducible Kubernetes release for real application services. This Change exists to join the previously planned bounded slices, not to reimplement them under new names.

**Prerequisites:** proven required K8S substrate, K8S11 web/API integration, DIST03 GA private boundary and BOOT03 start, BOOT02 pinned content import, DATA04/05 checkpoint and shared S3 wiring, STORY02/03 custody and executor split, and TURN03's deterministic acceptance fixture specification. **DIST05 and TURN01 were cancelled/absorbed; they are not missing implementation predecessors. DIST04 Rabbit-derived consumer is optional, not on this release's critical path.** Recheck exact current source at selection.

## Source-based implementation / documentation work

Create/reconcile one lab release profile using existing infra/kubernetes/lab/ and existing K8S8/9/11 manifests where already available. Build/load pinned images for Next, Nest, Game Authority, outbox→direct-Temporal relay, Temporal control and separate Storyteller worker. Add RabbitMQ derived-consumer workload **only when separately selected**. Configure one migration Job, S3 package-import Job, least-privilege Secrets/service credentials, single public origin, internal DNS, readiness/startup, resource limits and deterministic fake provider default. Surface cluster-wide dependency health and a non-destructive down/cleanup preserving unrelated Compose data. Do not duplicate service skeleton manifests or add a second setup framework. Under WSL memory pressure choose a reproducible reduced local profile, not invented HA. Add a dry-run/service-DNS smoke and integration-run entrypoint for TURN03, not assert end-to-end game success in this packet.

**Owned source and canonical documents:** infra/kubernetes/lab/ overlays and scripts, existing app image/build definitions, necessary env/bootstrap configuration, docs/runbooks/kubernetes-lab.md and actual deployment/compatibility technical owner, no new product mechanics.

**Preserve existing source responsibilities:** `apps/web` Next SSR/React + client SSE, `apps/api` Nest authenticated HTTP, `packages/application` existing admitted commands, `packages/documents` immutable local/S3 formats, `packages/db` SQL authority and outbox, `packages/workflows` Temporal workflows, `packages/storyteller` bounded validated DM tasks. Do not duplicate these modules merely to make a new harness. All source files and migrations must be rechecked at latest HEAD before implementation; current repo state may have changed on Cursor branches.

## Acceptance / negative proofs

Fresh kind after safe teardown → migrations once → pinned package import → real app Pods ready, Next SSR/Nest authenticated /api path, direct SQL-outbox→Temporal connectivity, shared S3 exact read across distinct workloads, explicit readiness and measured memory. Unauthorized public GA endpoint absent. No plain-text secrets, Pod-local fallback, duplicate migration runner, shared namespace collision or false HA claim.

No Pod Ready, mocked adapter-only test or local Compose smoke may be represented as a complete kind E2E unless the source and command logs demonstrate it. Report exact commands, IDs, state and object hashes, source commit/image digests, integration status and not-run tests.

## Parallel scheduling and collision control

Research/image builds parallel with source-independent DATA/STORY implementation, but live cluster operations and Gateway/Helm/root manifests have one integrator. Coordinate existing K8S08/K8S11/BOOT02/DATA05 ownership, avoid double implementation.

Shared SQL migration sequences, Kubernetes Gateway, canonical docs and final acceptance fixtures require a single integration owner. Worktrees isolate independent research/builds, not override prerequisites. No automatic successor; Proposed means not authorized.

## Out of scope

Image generation, live multiplayer, Stripe/subscription billing, production customer usage reconciliation, Cognee/vector/graph adoption, arbitrary Code Mode, full ruleset implementation, paid provider access except when TURN04 is individually authorized, cloud HA and full chaos/load program. The complete fake POC **includes** historically forkable scenes and source-faithful canonical state; do not relax this to “two passages displayed”.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended owner and effect | Closure requirement |
| --- | --- | --- |
| Product | unchanged because this slice edits no product page and adds no gameplay | Source-faithful criteria, no economy or image requirement |
| Technical | unchanged because this slice edits no technical page; the live pods are a lab proof, not a rewritten deployment contract | Exact normal/negative contract and runtime facts |
| Code | changed: `packages/cache/src/index.ts`, `infra/kubernetes/lab/app-release/overlay/authority.yaml`, and `infra/kubernetes/lab/app-release/prepare-runtime-tree.sh` let this lab release boot. Negative: worker manifests still reject `DATABASE_URL`, and an API image without `packages/db/migrations/meta/_journal.json` fails image closure | Source tests, integration evidence and no silent skipped gates |
| Related | changed: `work/changes/open/2026-11-19--turn02-compose-real-kubernetes-application-release/CHANGE.md` records the live apply and one scripted distributed Storyteller run that saved and published | Wiki/link guards and truthful status |

## T01 VERIFY receipt (pinned default rules startup, 2026-11-20 @ `ec73a535`)

**Proved on MAIN** @ `ec73a535` (documentation-only receipt this turn; no `apps/api` source edit): after `pnpm run build`, `apps/api/test/default-rules-startup.test.mjs` — **5/5 PASS**.

**Positive (unit scope):** pinned S3 manifest path resolves default rules **without** local source-directory import.

**Negative (unit scope):** conflicting hash+source configuration rejected; invalid pinned hash rejected before manifest lookup; missing manifest fails closed; Compose-style directory import when hash unset **PASS**.

**NOT-RUN:** Nest process boot against a real S3 endpoint; full API listen/ready on release port (suite does **not** use port **3001**). Real Pod/S3 bootstrap remains for T04+ cluster proof.

**Done eligibility:** **No.** T03–T06, cluster integrator work, and ledger closure guards remain open. **T04** stays **gated** until **T03**. This receipt does not promote the Change to Done and does not claim a reproducible Kubernetes release.

## T02 PATCH receipt (API/GA images, 2026-11-20 @ `ec73a535`)

**Proved in worktree** `/home/dskul/projects/offscreen-rpg-turn02-t02`, then **copied onto MAIN** (packet docs only in this turn; game paths untracked until owner commit): `infra/kubernetes/lab/app-release/Dockerfile.api`, `Dockerfile.game-authority`, `build.sh`, `prepare-runtime-tree.sh`, supporting shims, and smoke tests under `infra/kubernetes/lab/app-release/test/` — **5/5 PASS** (`dockerfile-guard`, `image-closure`, `pod-bind-smoke` including loopback sibling negative).

**Positive (local smoke only):** frozen workspace-root image build path; compiled runtime closure; Pod-interface bind with `API_HOST` / `GAME_AUTHORITY_HOST=0.0.0.0` in release image env.

**Negative (asserted in smoke):** `content/` tree **not** staged into images (`build.sh` rsync exclude); **loopback bind not reachable from a sibling container** (discriminating pod-bind case).

**NOT-RUN:** kind image load, migration Job, overlay apply, Pod Ready, authenticated edge, or any end-to-end Kubernetes game path. **`Dockerfile.web` (T03) on MAIN was not overwritten** by this slice.

**Done eligibility:** **No.** T03–T06, cluster integrator work, and ledger closure guards remain open (T01 verified separately). This receipt does not promote the Change to Done and does not claim a reproducible Kubernetes release.

## T03 PATCH receipt (Next image and internal origins, 2026-11-20)

**Proved on top of** `c832593a`: `Dockerfile.web` pins `node:24.19.0-bookworm-slim` to the same digest as the API image. The runner sets `HOSTNAME=0.0.0.0` and both `API_PROXY_ORIGIN` and `API_INTERNAL_ORIGIN` to `http://game-api.lab-edge.svc.cluster.local:3001`. Local `dev` and `start` stay on `127.0.0.1`. `releasePodAllowsSsr` blocks Pod SSR before `fetch` when that origin is loopback or differs from `API_PROXY_ORIGIN`.

**Positive (static/unit):** `node --test` rewrite + dockerfile-guard **8/8 PASS**. `vitest` `api-origin.test.ts` and `nest-reader.test.ts` **11/11 PASS**. Matching lab Service origin still forwards the session cookie.

**Positive (local image, 2026-11-20, source `9fa937cf`):** `bash infra/kubernetes/lab/app-release/build-web.sh` exit 0 in 42s. Image `offscreen-lab-game-web:turn02` id `sha256:749f69f1865fb8f8cdb1dd1a4ef5d5433462491ae5505db7da0448645d4f93f0`. Runner env: `HOSTNAME=0.0.0.0`, `API_PROXY_ORIGIN` and `API_INTERNAL_ORIGIN` both `http://game-api.lab-edge.svc.cluster.local:3001`. Extracted `apps/web/.next/routes-manifest.json` destination: `http://game-api.lab-edge.svc.cluster.local:3001/api/:path*`. In-image VERIFY step exited 0.

**Negative:** Pod `nestFetch` throws `NestTransientError` status 0 and does not call `fetch` for loopback or a mismatched origin. Dockerfile guard rejects a `content/` copy and a secret build arg on `Dockerfile.web`. `assertReleaseRewriteNotLoopback` accepted the extracted destination. A second image build with a loopback origin was **NOT-RUN**.

**NOT-RUN:** kind load, Pod Ready, and authenticated browser SSR. The local image unblocks T04 source work. No Kubernetes application release is claimed.

## T04 PATCH receipt (app release overlay, 2026-11-20)

**Landed:** `infra/kubernetes/lab/app-release/overlay/{edge,authority,workers,migrate}.yaml` and `install.sh`. Next and Nest are ClusterIP Services in `lab-edge`. HTTPRoute `game-edge-routes` sends `/api` to `game-api` and `/` to `game-web`. Game Authority is ClusterIP in `lab-authority` and is not a Gateway backend. It reads `DATABASE_URL` from secret `game-db` because its bootstrap calls `readDatabaseConfig`. Control and executor are separate Deployments and have no database env. Migration is Job `game-migrate`, not an API startup command. `offscreen.rpg/chaos-eligible=true` is only on the five app Deployments. `gateway/routes.yaml` still contains `synthetic-api`. The API image also copies `packages/db/migrations`, and `@offscreen/cache` parses only `REDIS_*` keys.

**Positive (static):** `node --test infra/kubernetes/lab/app-release/test/overlay-guard.test.mjs` **8/8 PASS**.

**Positive (local worker image, 2026-11-20):** `bash infra/kubernetes/lab/app-release/build-worker.sh` exit 0. Image `offscreen-lab-app-release-worker:turn02` id `sha256:84227fe0974ee3b415bb6a71bfbeaeb3b467e0d320121d234518be07fd0c67d6`. Both `control-main.js` and `executor-main.js` are in the image. `content/` is absent. Image env has no `DATABASE_URL`. Dockerfile guard **4/4 PASS**.

**Negative:** Worker Deployments no longer probe TCP 8080. A running Node process is not evidence that a Temporal queue is being polled.

**Lab substrate (2026-11-20, source `3c4696f8`):** `up.sh` exit 0. Context `kind-offscreen-lab` is the only context; no foreign context was switched. `cnpg/install.sh` exit 0, `lab-pg` phase `Cluster in healthy state`, secret `lab-pg-app` present, 1 instance. `object-storage/smoke.sh` exit 0: put, get, delete, and the object survived Pod replacement; Service `object-store` is ClusterIP. `temporal/install.sh` exit 0: Temporal 1.32.2 SERVING, Service `temporal-server` ClusterIP port 7233. `gateway/install.sh` exit 0: Gateway `lab-edge` Programmed=True. Synthetic `lab-edge-routes` is still installed. Compose volumes `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` remained. MemAvailable after the substrate was 5072372 KiB.

**Live apply (2026-11-20):** `bash infra/kubernetes/lab/app-release/install.sh` exit 0. Job `game-migrate` succeeded and logged `Database migrations applied.` Pods Ready with 0 restarts: `game-web-854ff6c9d4-sm4jk`, `game-api-54479686b8-jbbts` (`Nest application successfully started`), `game-authority-5dcb6679d9-7bfn6` (`game-authority.listening`), `game-control-7865855c67-qjk4c`, `game-executor-666cc97597-x5ccj`. `game-control` created a workflow bundle that includes `packages/workflows/dist/index.js` and is `RUNNING` on queue `control`. It did not log `No workflows registered`. `game-executor` is `RUNNING` on `storyteller-execute-v1` and logged `No workflows registered, not polling for workflow tasks`. That warning is the activity-only design in `apps/worker/src/runtime/execution.ts`: the execution runtime passes activities and has no `workflowsPath`, and `apps/worker/test/storyteller-worker-split.test.ts` requires that absence. The executor log does not contain `No activities registered`. API image `offscreen-lab-app-release-api:turn02` id `sha256:f53f20b53cdc71d80c18c25722584126ab5973e12543674607ec16741d4f6ffc`; kind import id `sha256:74f8efbd92a06976bdcdb3b09447e42bec22b1668a30b8601eda6516cc2e87c5`. Fixture importer logged the pinned world, rule, and start hashes, including rule `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab`. HTTPRoutes `game-edge-routes` and `lab-edge-routes` are both `Accepted=True`. `gateway/routes.yaml` has an empty diff. Secrets `game-db` and `game-runtime` exist in the cluster and were not printed.

**Earlier failures on this apply, now fixed in the running image:** the first migration Job exited 1 because the API image lacked `packages/db/migrations`; the next API crash was a Zod parse of the full process env in `createCacheAdapter`; after that image loaded, startup threw `DocumentStorageError('missing')` until the pinned fixture was imported into the existing `lab-objects` bucket. `content-bootstrap/smoke.sh` was not the proof: it stops when secret `object-store-s3` already exists. The importer Job used a copy of that existing secret.

**Activity handoff (2026-11-20):** `temporal workflow start` of type `storytellerDistributedV1`, id `storyteller/336b1c7e-a29b-43bd-b26b-d076b2e5b739`, task queue `control`, from `temporal-admin`. Run `01a1f98e-72fe-7ebb-9c64-6f2e157761f6` was picked up by the control worker. Activity `executeFrozenStoryteller` ran on worker identity `1@game-executor-666cc97597-x5ccj`. The executor log says `Activity failed` with `StorytellerTaskCustodyTransportError: unauthorized`. The workflow closed `FAILED` after five attempts. No provider call was made. The generation id was a probe, not an admitted story.

**Why that probe was unauthorized:** that Game Authority image had no `GAME_AUTHORITY_EXECUTOR_TOKEN` string in `main.js` or `server.js`, and `authority.yaml` did not set it. The release env shim also dropped the control and executor tokens before `main`. Both are now on the allowlist, and `authority.yaml` passes `game-authority-executor-token` from `game-runtime`.

**Scripted handoff (2026-11-20):** Game Authority image `offscreen-lab-app-release-ga:turn02` id `sha256:e3037ca55d1489f5395e080e4992809b8a54092cf99fa285cf455febc4101ec2`, kind import `sha256:49e083210842d707068fc657ddd76953d2a1fe292579304bc189b1576a0aa987`. Pod `game-authority-b5fb6dcf9-jgtt8` logged `game-authority.listening`. A scripted `storyteller.profiled.v1` generation `96244611-b4bc-4ffd-b011-7da8642a9528` was inserted in the lab database. Workflow `storyteller/96244611-b4bc-4ffd-b011-7da8642a9528` run `01a1f995-5fbe-79cc-b49d-8bf33c6c7ede` completed. History scheduled and completed `executeFrozenStoryteller`, then `publishSavedStoryteller`. The generation row is `succeeded` with an attempt and output. `storyteller_publication` is `published`. `storyteller_attempt` has one row. No provider call was made.

**T05 POC open access (2026-11-20, `5f76bdf7`+):** Lab POC sign-in is **not** required when API `POC_OPEN_ACCESS=1` on loopback `APP_ORIGIN`; the fixed local player is intentional. GitHub OAuth and DXK03 are **not** the current gate for opening the lab game. Staff/admin remains session-gated.

**T05 verify (2026-11-20, `5f76bdf7`, pre-PATCH):** NOT-RUN. Unauthenticated `GET /api/stories` to `game-api` returned 401. Signed-in Next SSR, SSE, and owner isolation were not run.

**T05 next choice (2026-11-20):** action `d75ff7f6-def8-4def-8da7-6733169c5526` returned 200. The warehouse shift is 1800 fictional seconds. Lab pace was set to 120 fictional seconds per real second so the check finishes in about 15 real seconds. Story `939fd053-567e-4639-9531-52ed04e02039` then reached revision **4**, title **Work the warehouse shift**, game second **1860**, with a new player-choice hold. The next action `54922fd4-d7d9-4f55-8c8f-2903136136fd` (`travel-toward-balmora`, 900 fictional seconds at the same pace) reached revision **6**, title **Travel toward Balmora**, location `balmora-road`, game second **2760**. Action `cd12f9f9-172e-4c88-a267-b3bf078768cc` (`continue-north`) settled at game second **3660**, then stayed unnarrated until `game-relay` received the lab object store and the failed capture was promoted. The story then reached revision **7**, title **Continue north**. A later action `dcc90d44-0e58-452c-b9f9-cf0c11deddd1` published on its own to revision **8** at game second **4560**. Public `GET /internal/v1/health/live` is **404** while the private Game Authority health route is **200**. `POC_OPEN_ACCESS=0` makes `GET /api/me` **401**; the lab flag is restored to `1` and that route is **200** again.

**NOT-RUN:** full signed-in browser vertical after open access (SSR/SSE/owner isolation). Gateway overlap of `/` and `/api` between the synthetic route and `game-edge-routes` is unresolved. **No Kubernetes application release is claimed.**

## Reconciliation ledger (complete before Done)

| Authority | Target claim / no-op | Inspected source SHA and diff | Normal proof | Negative proof | Source link |
| --- | --- | --- | --- | --- | --- |
| Product | unchanged | `ec73a535`; no product page edit | N/A | N/A | open |
| `apps/api` default-rules bootstrap (packet evidence only; canonical technical owners unreconciled) | open; pinned-manifest startup behavior recorded, not deployment doc closure | `ec73a535`; `default-rules-startup.test.mjs` exercised post-build | post-`pnpm run build` suite **5/5** | conflicting hash+source, invalid hash, missing manifest; Compose path when hash unset **PASS** | [TASKS.md](TASKS.md) T01 |
| [deployment-and-compatibility](../../../../docs/technical/platform/deployment-and-compatibility.md) | open; T02 lab image build only (not reconciled this slice) | `ec73a535`; `infra/kubernetes/lab/app-release/Dockerfile.{api,game-authority}`, `build.sh` on MAIN (untracked until commit) | worktree + MAIN smoke **5/5** | `content/` not in image; loopback sibling unreachable; kind **NOT-RUN** | [TASKS.md](TASKS.md) T02 |
| Data/Storyteller/fork | review/reconcile pending T04+ | Pending | Pending | Pending | open |
| Change packet receipt | no product or technical page rewritten this turn | packet docs after the scripted handoff | workflow `storyteller/96244611-b4bc-4ffd-b011-7da8642a9528` completed; generation `succeeded`; publication `published`; one attempt | the earlier probe `336b1c7e-a29b-43bd-b26b-d076b2e5b739` failed unauthorized before the executor token was wired; browser login **NOT-RUN**; synthetic and real HTTPRoutes both Accepted | [CHANGE.md](CHANGE.md) T04 section |

**Guard (2026-11-20):** `pnpm wiki:change-guard --mode plan --change` this packet — run after ledger edits; close mode still blocked until T06 cluster proof.

Complete ledger, run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, archive only actual results, and repair inbound links. No automatic next Change.
