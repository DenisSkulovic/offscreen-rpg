# DXK09 | Falsifiable operational acceptance, not paper architecture

**Source baseline:** `undertaking/storyteller-workshop@ca3bd03d`. Cursor reports one successful real Docker image build (9.75MB context, 123s, image SHA in CHANGE.md). **B01 partial PASS for one clean image build only**; remaining context/dirty-worktree regression, watcher reload, live Kubernetes, OAuth and multistack proofs are NOT RUN. The planner did not run Docker/Kind/WSL/browser. Statuses must distinguish Cursor receipt from planner-executed proof. Completion requires evidence across real worktrees, not merely generated YAML/green `kubectl get deploy`.

| Gate | Required positive result | Failure that must be detected |
| --- | --- | --- |
| B01 clean Docker context | source is reproducible from clean/dirty pnpm worktrees; actual BuildKit transfer excludes host `node_modules`; report bytes/time | invalid file request `@better-auth/drizzle-adapter`, >GB accidental context or missing manifest |
| B02 cache/dependency graph | correct affected-only build, safe shared cache hit, correct `TURBO_FILTER`; measure impact | speculative cache disable/global serialization, wrong image build, omitted dependency |
| B03 source-to-running-code | edit API and shared dependency; compile, reload process, fingerprint and health match desired source | deliberate TS compile failure and old process cannot report desired revision READY |
| L01 single-stack lifecycle | one command start/status/stop works and reports actual failure phase, existing data persists | bad Tilt arg count, namespace comma syntax, repeated manual trigger requirement, endless readiness polling |
| L02 worker readiness | actual worker boots, registers intended Temporal namespace/queues, bounded ready report and diagnostic | worker OOM, crashloop, incorrect namespace, stale dist, timeout |
| I00 dev bootstrap safety | dev-only read-only plan/status and test adapter; context and loopback port separate from release; no live `ensure` until explicit approval | wrong context/foreign same-name resources and pre-existing volume/context change refused |
| I01 elastic owner identity | allocate 1/4/5/10/100 distinct paths without changing code; reattach stable ID | fixed `s01..s04`, duplicate lease, race, reused PID, forced cross-owner stop |
| I02 resource fencing | scoped cluster/namespace/UID, unique image refs and ports, wrong-context read-only rejection | A stop/build mutates B or release; occupied port hijacked |
| I03 SQL tenancy | A/B independent schemas/migrations/sessions/outbox; 4 full stacks supported with budgeted active DB connections | A credential accesses B; dev `max_connections` exhaustion ignored |
| I04 S3 tenancy | per-slot bucket and *enforced* scoped credentials; A/B object mutations isolated | shared admin S3 credential allows A delete B |
| I05 Temporal tenancy | unique workflow namespaces/queues, real outbox→Temporal→writer side effects per tenant | A worker polls/executes B's workflow |
| I06 auth | two simultaneous real GitHub sign-ins on different loopback ports, correct session origin and secret | wrong cookie/origin, missing callback, fake dev auth ready |
| I07 concurrent work | four distinct worktrees run full-stack authenticated provider-free stories and live source updates concurrently | one slot's build/restart/stop/SQL migration changes B/C/D; services silently route across slots |
| I08 elastic growth | 5th/10th identity and tenant config succeed without config edits; live extra slot when measured capacity available | hardcoded slot ceiling or silent overcommit |
| I09 capacity | report peak RAM/CPU/disk per profile, Postgres connections, image imports, build/context, 4-stack real throughput | no-resource partial provision, OOM without diagnostic, serial work reducing throughput without reason |
| R01 release separation | release cold app image deployment and smoke can run while dev slots active, without dev stop or post-test restoration | same Pod/port/DB/Temporal or dev Tilt accidentally changed |
| R02 release runner honesty | recorded immutable release image/source, authenticated provider-free action, GA/Temporal/DB/S3 stage diagnostics | game writer HTTP503 falsely reported green, scene1 incorrectly counted as scene2 |
| R03 TURN03 compatibility | existing TURN03 golden scorecard reused; N5/N7/N8/N10 remain available for authorized real fault tests | missing/untested gates silently passed; dev namespace used for faults |
| C01 clean stop/restart | stop only slot A, retain A data, B/C/D healthy; restart A does not adopt other data | resource deletion on failure, stale PID kills foreign Tilt, losing bucket or DB |
| C02 performance regression | compare same clean-build, TS edit-to-ready, and four-slot test throughput against measured DXK08 baseline; present actual distributions | green deployment without useful latency or profiler data |

**Current dev Kind creation evidence (Cursor receipt, 2026-11-22):** `undertaking/storyteller-workshop@c760cbd8`, dev API `https://127.0.0.1:24443`, both Kind v1.37.0 nodes Ready; owned `offscreen-dev-system` namespace UID `585975ed-a71a-4b97-86de-86969f15058f`; dev node memory about 602/129 MiB and current kube context remained `kind-offscreen-lab`. No shared backing service or workload test performed in dev.

**T03b-2a code-only and future live SQL tenant acceptance:** positive ID mapping `dev-1 → dev_1`, second slot `dev-2 → dev_2`, explicit backed secret/roles/db manifests; negative identifiers/overflow, foreign K8s or SQL ownership, wrong context, unauthorized ensure. Future live trial: baseline `PUBLIC` CONNECT/TEMPORARY revoked for `postgres`/`dev`/`template1`; CNPG Database initially not connectable; role A/B own-db successful, A→B and A/B→baseline denied; no migration credential in app namespace; migrated runtime DML positive and DDL negative; second ensure retains Secret UID/password and database OID; 2+ slots concurrent; failed intermediate step leaves resources for safe reentry. **No SQL tenant created yet. No live privileged ACL changes authorized.**

**T03b-1 proof gates (NOT RUN):** Dev-only pinned CNPG, SeaweedFS and Temporal backends each healthy and retrievable after idempotent ensure; dev-specific ownership, service DNS, ready PVCs and exact image identities; no release mutation; credentials generated once, hidden; Temporal schema persistence on reentry; fail-closed foreign resources and partial failure; actual post-install resource consumption and remaining WSL headroom. Unit plan and fake-adapter proof **is not** live install proof.

**On-demand target lifecycle gates (NOT RUN):****On-demand target lifecycle gates (NOT RUN):** DEV-ONLY: start four isolated dev full stacks while release is idle; RELEASE-ONLY: explicitly start release acceptance after an optional *owner-controlled* dev pause, verify cold immutable-image smoke; RESTORE: restart dev and confirm stable slot identities, SQL/S3/Temporal/session persistence; STOP SAFETY: show non-destructive lifecycle behavior or report Kind suspension as unimplemented rather than using delete; COEXIST: only prove concurrent dev and release if host admits both, with a clear refusal otherwise. A release cluster need not be always on.

**Discriminating live scenarios:****Discriminating live scenarios:** (a) start four full stacks, each with an independent story and two successive scene publications; (b) modify shared package only in slot A while B/C/D run; (c) stop/restart A without destroying tenant; (d) induce compile failure/OOM/build failure only in A; (e) execute a cold release smoke concurrently in release lab; (f) attempt wrong SQL/S3/Temporal contexts and cross-slot operation; (g) allocate synthetic IDs 5/10/100 and verify port/bucket/name/manifest generation, plus fifth live only when resources admit.

**Turn03 boundary:** DXK09 PASS does not imply TURN03 PASS. A release story remaining scene1 with writer 503 is a failing real application/release test. N5/N7/N8/N10 remain NOT RUN until independently executed. DXK09 must make the runner repeatable and diagnostic, not suppress failures.

**Evidence receipt:** source SHA + dirty state, branch/worktree path, image IDs, Pods UID, namespace, own SQL/S3/Temporal identifiers, timing/context bytes/CPU/RAM/connections, application runtime fingerprint, before/after snapshots, failure logs and test run IDs. No secret values or provider spend. Every gate must be marked PASS/FAIL/BLOCKED/NOT RUN with actual evidence. *No live run occurred in the planning revision.*

**Closure rule:** all B/L/I/R/C gates pass on real target host, including four full concurrent stacks. If the machine genuinely cannot fit four, do not quietly reduce the target; return resource profile and selected optimization, keep Change open. No arbitrary hardcoded count ceiling.

**T04-B2 live dependency receipt (2026-11-22, source `1fd2918b`, context left on `kind-offscreen-lab`, cluster `kind-offscreen-dev`, namespace `offscreen-dev-1`):**

Process readiness is not worker readiness and neither is an end-to-end application result.

- Images: `offscreen-dev-workspace:dev-1-web` `sha256:d4dfc4ba…f81e`, `dev-1-api` `sha256:d3dbdb12…0b78`, `dev-1-authority` `sha256:98043c40…9a12`, shared worker image `dev-1-worker` `sha256:d178a341…243c` for control, executor and relay. Pods `game-web-7f9b65c8c9-f589d`, `game-api-747fd5f586-b46bd`, `game-authority-5bd9c86587-fl2nj`, `game-control-69c7bdbd7c-bjqdn`, `game-executor-6ff4486bd5-whx2h`, `game-relay-7b448698-qd5ml` were Running with restart count 0. Worker processes reached Temporal `RUNNING` about 7 seconds after pod start `2026-11-22T23:18:36Z` (executor log `23:18:42.588Z`, control `23:18:43.675Z`, relay `23:18:43.644Z`).
- Bindings: API and authority use `GAME_AUTHORITY_ORIGIN=http://game-authority.offscreen-dev-1.svc.cluster.local:3002`. Control queue env is `control`; executor env is `storyteller-execute-v1`; relay leaves the legacy queue at its source default `offscreen-local`. Temporal address and namespace are the dev server and `offscreen-dev-1`. Cookie prefix is `dev-1`. `OFFSCREEN_DOCUMENT_STORE` is unset, so `createDocumentStoreFromEnv` does not select S3 even though bucket, endpoint and scoped keys are present.
- S3 from the API process using `@aws-sdk/client-s3` resolved by `@offscreen/documents`: PUT/GET/DELETE `dxk09-t04b2-1795389881780.txt` in `offscreen-dev-1` returned 200, body match, 204. Object count stayed 2. PUT to `offscreen-dev-2` returned `AccessDenied:403`. `offscreen-dev-2` namespace does not exist. No other objects were deleted.
- Temporal `DescribeTaskQueue` in namespace `offscreen-dev-1`: `offscreen-local` workflow and activity poller `35@game-relay-7b448698-qd5ml`; `control` workflow and activity poller `35@game-control-69c7bdbd7c-bjqdn`; `storyteller-execute-v1` had no workflow poller (expected: activity-only executor) and also no activity poller at describe time. Server log at `23:23:28Z` stopped the execute-queue workflow partitions as Idle. The executor Node process was still pid 35. Queue contracts were not changed.
- Application operation: `PUT /api/stories/launch/:operationId` with `Origin: http://127.0.0.1:13100` and no cookie or bearer returned `401 Unauthorized`. `StoryPlayerIdentity.requireStoryPlayer` is the boundary. No launch, outbox, workflow, authority write, SQL story row or S3 document write was created. A terminal bearer could also satisfy that identity, but none was issued.
- Resources: no container requests or limits on the six Deployments. Metrics API unavailable, so CPU is unmeasured. cgroup `memory.current`: web 353 MiB, api 254 MiB, control 238 MiB, relay 231 MiB, executor 170 MiB, authority 142 MiB. Initial memory requests from that idle sample: web 400Mi, api 320Mi, control 280Mi, relay 280Mi, executor 220Mi, authority 180Mi. Leave CPU requests unset until a measured sample exists. PostgreSQL: `dev_1_run` on `dev_1` had 2 connections. `dev-2` was not modified.

**T04-B3 receipt:** API, Game Authority and relay now set `OFFSCREEN_DOCUMENT_STORE=s3` and the API sets `GAME_AUTHORITY_MODE=distributed`. Running processes `game-api-79868f7c5-rbz5f`, `game-authority-669666bf9d-d8xbl` and `game-relay-7ddc58c7c8-8v7jq` construct `S3DocumentStore` for `offscreen-dev-1`. A signed put/delete of `dxk09-t04b3-1795390978119.txt` returned 200 and 204. Secret UIDs were unchanged. Selecting S3 made both API and Game Authority import `content/rules/srd-5.2.1-subset`, which the dev image does not contain; startup now skips that implicit directory when it is missing. Game Authority was bound to `127.0.0.1:3002`, so the executor's custody fetch failed `ECONNREFUSED`. The slot graph now sets `GAME_AUTHORITY_HOST=0.0.0.0` and `GAME_AUTHORITY_PORT=3002`, matching the lab manifest. After that, the executor pod `game-executor-56bcfb9bcf-j9tcs` polled activity tasks on `storyteller-execute-v1` and claimed `executeFrozenStoryteller` for workflow `dxk09-t04b3-execute-4`. The activity closed with `TaskCustodyRefused` / `unknown-generation` because no story generation exists. Workflow pollers on that queue remain empty, which is the activity-only executor. Control and relay queue names were not changed. API image `sha256:0da2a394…`, authority image `sha256:9accfba5…`, worker image unchanged `sha256:d178a341…`. Focused tests: `dev-slot-app-graph.test.mjs` 3 pass, `default-rules-startup.test.mjs` 6 pass. An authenticated launch is still required before a scripted generation can be saved.

**T05 two-slot receipt (2026-11-23, branch `change/dxk09-elastic-dev-env`, base `ce8fc609`):**

Worktrees: A `/home/dskul/projects/offscreen-rpg-dxk09` owns `dev-1` / `offscreen-dev-1` / game port `13100`. B `/home/dskul/projects/offscreen-rpg-dxk09-b` on `proof/dxk09-slot-b` owns `dev-2` / `offscreen-dev-2` / game port `13104`. Allocator registry is `~/.local/state/offscreen-rpg/dev-worktree-registry`. Backing SQL and S3 for `dev-2` already existed. `dev_2` had no `drizzle.__drizzle_migrations` until `applyDevTenantMigration` applied 25 migrations. App namespace `offscreen-dev-2` was created by `projectDevSlot`. `kind-offscreen-lab` was not modified.

Slot images loaded into `kind-offscreen-dev`: `offscreen-dev-workspace:dev-2-web` `sha256:930947c6` was the earlier dev-1 web rebuild; dev-2 web/api/authority/worker were built by `load-dev-slot-image.sh` and kind-loaded. After Tilt attached, web deployments ran `offscreen-dev-workspace:tilt-build-1795394042` (A) and `tilt-build-1795394043` (B). API, authority and worker stayed on `dev-1-*` and `dev-2-*`.

Frontend markers, served together: A `DXK09 ORANGE` at `http://127.0.0.1:13100/sign-in`, B `DXK09 BLUE` at `http://127.0.0.1:13104/sign-in`. Tilt copied A's change to `DXK09 GREEN` into pod `game-web-df4894f46-vh784` as one file. B's change to `DXK09 PURPLE` was visible in 1161 ms while A stayed GREEN. Marker lines were removed from both `apps/web/app/sign-in/page.tsx` files afterward. The first Tilt attach did roll pods once because it applied the live Deployments.

API: `dev-1` `game-api` command is now `tsc` then `tsc --watch` plus `node --watch-path=dist`. Copying a log line into pod `game-api-7df9c4d6cd-46lwj` reloaded pid 129 in about 2 seconds and logged `dxk09-api-gen-2`. `dev-2` stayed `game-api-6d5897547c-9rg5w`. `tsc --noEmitOnError` on the type error exited 1 with `TS2322`. Freshness evaluation returned `ready: false`, `compile_error`, stale generation `stale-before-error`. Restoring the file made `tsc` exit 0 and the same pod start pid 165 at `2026-11-23T00:42:20Z`. The in-pod watcher does not pass `--noEmitOnError`, so it emitted once before the receipt refused READY. Tilt was watching web only, so the API file was copied in rather than synced by Tilt.

Stop and restart: `pnpm dev:stop` in A killed Tilt pid `290803` and scaled the six `offscreen-dev-1` deployments to 0. B Tilt pid `290871` stayed alive, B replicas stayed 1, and `http://127.0.0.1:13104/sign-in` returned 200. Scaling A back to 1 kept secret UIDs `dev-1-app 2f764272-070c-41ee-b545-27183954dbc6`, `dev-1-run-auth b4be75be-2e27-426a-b2da-34abe148080e`, `dev-1-s3 58484c86-93ef-41f4-9f6b-984ef865054c`. Images stayed the A tags, not B's `tilt-build-1795394043`. `dev_1` still had 25 migrations, 1 user and 2 sessions. Both sign-in URLs returned 200 after the restart.

Focused tests at this receipt: `dev-slot-app-graph.test.mjs` 3 pass, `dev-slot-project.test.mjs` included in the 6-test run, `dev-sql-tenant-grants.test.mjs` 5 pass, `dev-tilt.test.mjs` scale/stop cases pass. Whole DXK09 is not done: four-stack proof, two-browser OAuth, and a provider-free story saved through the executor remain open. Tilt API sync and `--noEmitOnError` on the live watcher remain open.

**T05 hardening code receipt (2026-11-23, worktree `/home/dskul/projects/offscreen-rpg-dxk09-t05`, base `e7f9e1f7`):**

`stopDevSession` and `replaceOwnedDevSessionTilt` call `assessOwnedProcess`. A SIGTERM is sent only when the PID is alive and `/proc/<pid>/stat` start ticks equal the ticks stored in `.offscreen/dev-session.json`. Missing ticks and a reused PID are not signalled. Tests: `dev-process-identity.test.mjs` 2 pass; `dev-tilt.test.mjs` includes both the mismatch and the matching-start cases; full file 21 pass. The rendered `game-api` command now uses `tsc --noEmitOnError` and `tsc --watch --noEmitOnError`. `dev-slot-app-graph.test.mjs` 3 pass. `.gitignore` already lists `.offscreen/dev-session.json`.

Unattended third-worktree acceptance: **NOT RUN**. `pnpm dev` still does not provision SQL, S3, Temporal, migrations, images or port-forwards. `dev:status` still reads local receipts, not the Pod-loaded generation. No third worktree was created for this receipt, and no live slot was restarted onto the new API command.

**Cold-slot coordinator (2026-11-23):** `reconcileDevSlot` orders allocate, cluster health, SQL, migration, S3, Temporal, projection, then images, and it refuses workloads when an earlier phase fails. Unit tests cover a new slot, reentry, partial SQL/S3/Temporal failure, foreign cluster, secret refusal, occupied port, stale process, low memory, one-worktree concurrent allocation, and credential redaction. `pnpm dev` calls `reconcileOwnedDevSlot` before Tilt. That live binding refuses before tenant mutation because the Drizzle migration runner is not bound. Third-worktree acceptance was not started. dev-1 and dev-2 were not changed.

**Live runner binding (code, not yet a five-slot run):** `applyDevTenantMigration` accepts `kind-offscreen-dev-sql-migration-live` for any allocated slot and still accepts the older dev-1 proof token. `migrateOwnedDevSlot` calls that function as the slot migration role. `ensureOwnedSlotImages` builds only missing `web`/`api`/`authority`/`worker` images through `load-dev-slot-image.sh` into `kind-offscreen-dev`. `pnpm dev` starts Tilt with `--context kind-offscreen-dev`. Focused tests: grants 6 pass, startup coordinator 7 pass. The five-environment Headlamp experiment was not run in this commit.

## T05-FU environment-first identity acceptance (selected 2026-11-23; NOT RUN)

The historical T02 worktree-keyed allocator and T05 two-worktree trials remain valid evidence of their then-current implementation. This follow-up is **not proven** by those receipts. [Executor plan](TASKS.md#t05-fu--environment-identity-independent-of-source-checkout) is the selected contract; successful completion requires: (1) read-only and crash-safe v1→v2 migration with dev-1/dev-2 exact slot/UID/port/lease preservation, negative collision/foreign cases; (2) default + explicit instance start/status/stop with correct PID/start-time/slot checks, no foreign process signals; (3) simultaneous two-instance use of one checkout, isolated Tilt sessions/Pod compilation and truthful loaded-generation status; (4) new slot cold startup without manual SQL/S3/Temporal/images; (5) capacity-admitted sequential attempts for three new slots with measured memory/connection headroom; (6) isolated compile-error/recovery and stop/restart retaining tenants. A safe capacity refusal records an honest limitation, not five-stack PASS. No paid model, dev tenant deletion or release-cluster mutation. This is **additional** to existing DXK09 release, provider-free, OAuth and four-full-stack gates, not a substitute.

## T05-IMG artifact reuse gate (selected 2026-11-23; IMG01 code only)

**IMG01 (2026-11-23, pure tests, no Docker/Kind mutation):** `fingerprintDevImageContext` hashes the nonignored build-context bytes, the dev Dockerfile, its ignore file, the pinned `FROM` digest and the role `TURBO_FILTER`. Directory paths, slot ids and Git HEAD are not inputs. `planSlotImageArtifact` returns hit only when one compatible digest is present on both `control-plane` and `worker`. A local tag, a missing node, a null fingerprint, conflicting digests or metadata whose declared fingerprint differs from the recorded fingerprint are misses. The live `ensureOwnedSlotImages` path still builds a missing slot tag; it does not yet retag or skip a build from this plan. That alias/load behavior is IMG02 and was not run. No image was built, deleted or loaded for this receipt.

**IMG02 (2026-11-23):** The dev Dockerfile runs one Turbo invocation for `@offscreen/web^...`, `@offscreen/api^...`, `@offscreen/game-authority^...` and `@offscreen/worker^...`. `planUnionImageUse` treats the four slot tags as aliases of that fingerprint. `load-dev-slot-image.sh` flocks per fingerprint, builds only on a label miss, tags the slot aliases, and kind-loads a node only when that tag is absent. Slot Tilt calls that loader instead of building four role images. Focused tests: 16 pass. Live Docker/Kind proof was NOT RUN: about 3.8 GiB was available and dev-1 through dev-4 were already running. Release Dockerfiles were not edited.

**FU01 (2026-11-23, fixture registries only):** Registry v2 is `{ version: 2, nextSequence, environmentsById, defaultEnvironmentByCheckout }`. `convertRegistryV1ToV2` copies slot ids, sequence, cluster, namespace, ports, process identity, resource UIDs, leases and the checkout association. `migrateRegistryV1ToV2` locks, validates, writes `owners.json.v1-backup`, then replaces the fixture only when `authorizeCutover` is true and the root is not the live host registry. v1 `allocateDevWorktreeOwner` is unchanged. The machine-local registry was not opened. Focused proof: 8 new tests pass (4 positive, 4 negative) and the existing 18 allocator tests still pass. Host cutover is NOT RUN and remains FU02.

**FU02 (2026-11-23):** `pnpm dev` still starts the checkout default through the existing worktree session. `pnpm dev:new` and `pnpm dev -- --instance dev-N` resolve the record, then refuse `startup-not-yet-bound` without starting Tilt or changing workloads. Status and stop accept `--instance`; without it they stay on the checkout default. Unknown ids and conflicting flags refuse. Sessions for an explicit id live under the ignored `dev-environment-sessions` directory beside the registry, keyed by `dev-N`. A legacy `.offscreen/dev-session.json` is copied only when slot, checkout, namespace, ports and both PID start times match; the original file stays. Stop signals and scales only after that ownership check. `cutoverAuthorizedLiveRegistry` is a separate live entrypoint and still refuses the FU01 migrator on the host root. Focused proof: 7 new session tests and the existing tilt/registry tests pass (36 in the combined run). Live cutover was NOT RUN: dev-1 and dev-2 have registry records and HTTP 200, but no legacy session file whose PID and start ticks can be verified. dev-3 and dev-4 session files were inspected and left in place. Recovery if a future cutover succeeds: `rollbackLiveRegistryCutover` restores `owners.json.v1-backup` only while the current file hash still equals the cutover receipt.

A new `dev-N` is **not** a new source image by definition. Required acceptance for [T05-IMG](TASKS.md#t05-img--reuse-build-artifacts-across-slots-not-slot-specific-rebuilds): two distinct slot IDs supplied from identical effective Docker build contexts reuse one immutable image digest, with zero extra image builds for the second slot; all six role commands run using the union-built image; each node has a verified loaded image; changed included source or build inputs trigger a new artifact; excluded local credentials are neither hashed/logged as values nor baked in; dirty/untracked admissible source is accounted for; and Tilt loaded-source receipts remain independently truthful. Record source fingerprint, image digest, local/Kind cache hit or miss, exact build count, build seconds, peak memory, load seconds and per-role start readiness. **No current dev-4 authority-image failure cause is asserted here**; first inspect its actual build error. Existing release image behavior must be unchanged.

**FU03 host-output guard (2026-11-23, code plus read-only inventory; live registry not migrated):** `assertExclusiveHostWrite` reads `dev-environment-sessions/<slot>.json`. A host database build and a dev-slot `build-release-images.sh` run (only when `OFFSCREEN_DEV_SLOT` is `dev-*`) refuse with `shared-host-output` before writing when another session on the same checkout has a live PID and matching start ticks. A missing session directory, a dead PID, or the calling slot itself does not refuse. An unreadable session or `/proc` stat refuses with `ownership-unreadable` before the write. Release builds that leave `OFFSCREEN_DEV_SLOT` unset are unchanged. Pod compilation stays on the per-slot image and live_update sync. Focused tests: `dev-host-output-guard.test.mjs` 2 pass, plus `dev-fu03-startup.test.mjs` and `dev-environment-session.test.mjs`, 16 pass combined. No environment was started, parked, or stopped.

Read-only inventory, registry still v1, v2 session directory absent:

| id | checkout | game port | registry lease PID | lease vs /proc | legacy session | legacy vs /proc | namespace UID | workloads | classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dev-1 | `/home/dskul/projects/offscreen-rpg-dxk09` | 13100 | 201268 ticks 1684727 | not running | absent | n/a | `b08f1dd8-08c2-46b4-ab12-97d0b99e07c2` | 6/6 ready | ambiguous: workloads ready, recorded lease process gone, `resourceUids` empty |
| dev-2 | `/home/dskul/projects/offscreen-rpg-dxk09-b` | 13104 | none | n/a | absent | n/a | `a229bf90-c4b9-4e7f-9eb5-a04e8e0a9da2` | 6/6 ready | ambiguous: workloads ready, no lease, no session, `resourceUids` empty |
| dev-3 | `/home/dskul/projects/offscreen-rpg-dxk09-c` | 13108 | none | n/a | pid 441971 ticks 2095190 | match | `c08c617c-15f0-4c5b-9f09-6c8e2ee617d9` | 6/6 ready | active by legacy session; registry has no lease |
| dev-4 | `/home/dskul/projects/offscreen-rpg-dxk09-d` | 13112 | none | n/a | pid 646970 ticks 2158365 | match | `09819ec6-abc6-4316-85a6-011357900767` | 6/6 ready | active by legacy session; registry has no lease |

Cutover blockers: registry is still v1; `resourceUids` is `{}` on all four; dev-1 lease PID is dead while Deployments are ready; dev-2 has neither a lease nor a session while Deployments are ready; dev-3 and dev-4 process ownership exists only in legacy session files, not in the registry. No ids were manufactured and the live file was not rewritten.

**FU03 cutover-readiness correction (code only; live cutover NOT RUN):** `preflightLiveCutover` classifies a v1 registry against injected live namespace and Deployment evidence. Verified legacy PID/start ticks plus matching slot, namespace and `offscreen.dev/slot` labels are `active_verified`. Ready workloads with no verified session are `orphaned_running` and are not reusable or adopted. Zero desired replicas with no live owner process are `parked_verified`. A recorded UID that differs from the live UID, a foreign slot label, or a corrupt session/registry refuses. Discovered UIDs stay in the preflight result. The function records `registryWrites`, `signals` and `scales` as zero and does not accept a writer. `assertExclusiveHostWrite` also reads the checkout's `.offscreen/dev-session.json`, so a live legacy session still conflicts when the v2 session directory is absent. The live dev-1 through dev-4 registry was not migrated, parked, started, or stopped.

**Orphan park attempt (2026-11-23, blocked, no mutation):** Owner authorized parking dev-1 and dev-2 only if every ownership check passed. Both namespace UIDs still match the previously observed values (`b08f1dd8-08c2-46b4-ab12-97d0b99e07c2`, `a229bf90-c4b9-4e7f-9eb5-a04e8e0a9da2`). Both namespaces and all six Deployments carry `offscreen.dev/slot` and `offscreen.dev/owner=offscreen-dev`. Registry `resourceUids` is still `{}`. v2 session directory is absent. dev-1 lease PID 201268 is dead and its checkout has no `.offscreen/dev-session.json`, but kubectl PID 342587 is listening on assigned game port 13100 and forwarding `offscreen-dev-1` `game-web`. dev-2 has no registry lease, and Tilt PID 290871 is alive with `OFFSCREEN_DEV_SLOT=dev-2`, cwd `/home/dskul/projects/offscreen-rpg-dxk09-b`, and Tilt port 13105; kubectl PID 340819 forwards its game port 13104. Those are active consumers, so neither environment was scaled. No process was signalled, no lease was written, and the v1 registry was not rewritten. dev-3 and dev-4 stayed at 1/1 on all six Deployments. Shared Postgres reported healthy, SeaweedFS and Temporal server pods were Running, and `kind-offscreen-lab` was not modified. RAM before the refused park was about 3.8 GiB available and 2.8 GiB swap used; nothing was scaled, so there is no after measurement from this operation. Remaining cutover blockers are unchanged: live registry is still v1, and dev-1/dev-2 still have running workloads plus live port or Tilt processes that this park refused to adopt or kill.

**Toy-breaker campaign (2026-11-23, fixtures only):** Live Phase B was blocked because the registry was still v1 and the orphan park had been refused. The first fixture run was 39 pass, 2 fail, 7 not implemented. The bounded repair then made L01 and S06 pass. The revised fixture run is 38 PASS, 3 PARTIAL, 0 FAIL, 7 NOT IMPLEMENTED. R01, W05, and I06 are narrower coverage results. No live namespace, registry, Tilt process, or release context was changed. Report: `evidence/runs/2026-11-23--dxk09-toy-breaker/REPORT.md`.

**Maintenance park (2026-11-23, owner-authorized, dev-1 through dev-4 only):** Before any signal, registry SHA-256 was `c1336c67e093e5504c72b5cc8a01f4dc6e8760314a123a22ab2a03535399a5b8` (v1, `nextSequence` 5). Namespace UIDs matched the prior inventory. Each environment had six Deployments at desired 1 / ready 1. Verified and stopped, after re-reading `/proc/<pid>/stat` start ticks: dev-1 game forward 342587/1875382; dev-2 Tilt 290871/1795552 then forward 340819/1820195; dev-3 Tilt 441971/2095190 then forward 762125/2207340; dev-4 Tilt 646970/2158365 then replacement forward 757135/2192096. Recorded dev-4 forward 646971 was already absent and was not replaced by a search. The six application Deployments in each verified namespace were scaled to 0. Deployment UIDs were unchanged. Application Pods reached zero. Ports 13100, 13104, 13105, 13108, 13109, 13112 and 13113 had no remaining listeners from those processes. Shared Postgres, Temporal and object-store pods stayed Running; their namespace UIDs were unchanged. `kind-offscreen-lab` was not used. Registry file was not rewritten. `preflightLiveCutover` against live kubectl observation returned `ok: true`, `sessionsVerified: true`, and `parked_verified` / `parked-ownership` for all four. `reusableSlotIds` stayed empty because that field is hardcoded false in the classifier. RAM moved from about 3.6 GiB available / 15 GiB used / 2.8 GiB swap to about 9.0 GiB available / 10 GiB used / 2.6 GiB swap. v2 migration was not run.

**Two-worktree unattended proof (2026-11-23, source `22bf2569c433566b17a86e6abc1cea33ca853471`):** FAIL at startup. Clean detached worktrees: `/home/dskul/projects/offscreen-rpg-dxk09-proof-a` and `...-proof-b`. Registry was v2, hash `4773a8a3617acd2d05126a0f5e007dda8e85fd9f99fe380739f8073966220ed0`, and dev-1 through dev-4 were desired 0. Host had about 8.3 GiB available and 2.0 GiB swap free. `kind-offscreen-dev` nodes were Ready. Ambient context stayed `kind-offscreen-lab`.

`pnpm dev` in proof A ran 10 seconds and exited 1. The only diagnostic was `Dev slot reconciliation stopped at cluster: approved local OAuth file is missing`. The candidates are `OFFSCREEN_DEV_OAUTH_FILE`, `<worktree>/.env`, and `~/.local/state/offscreen-rpg/dev-oauth.env`. The home file is absent. The primary checkout has a gitignored `.env`; the clean worktree does not. No database, S3, Temporal, image, Deployment, or port-forward was created by hand, and none was created by the CLI. No image build ran. B was not started.

Residual: registry `nextSequence` is 6. `dev-5` is the default for proof A, namespace `offscreen-dev-5`, ports 13116–13119, empty `resourceUids`, no lease. That namespace does not exist. dev-1 through dev-4 remain desired 0. The dev-1 lease PID 201268 is still dead and was not erased. The registry hash changed because allocation wrote `dev-5` before the OAuth refusal. It was not rolled back.

| # | Result | Evidence |
| --- | --- | --- |
| 1 | FAIL | `pnpm dev` in proof A, phase `cluster`, environment `dev-5`, 10s, OAuth file missing |
| 2 | BLOCKED | B was not started after A failed |
| 3 | BLOCKED | no session, namespace, or tenant for a second environment |
| 4 | BLOCKED | no application Pods were started |
| 5 | BLOCKED | no Web URL was served |
| 6 | FAIL | unattended start cannot pass while the required OAuth file is absent from a clean worktree |
| 7 | BLOCKED | Web edit was not attempted |
| 8 | BLOCKED | API edit was not attempted |
| 9 | BLOCKED | compile-fault case was not attempted |
| 10 | BLOCKED | no source edit to revert |
| 11 | BLOCKED | A never became ready, so park/restart persistence was not run |
| 12 | BLOCKED | B was never live; A had no workload to park |

HR01, HR02, and HR03 stay blocked by this failed gate. MA12 (`e55829b4`), CL01 (`8452f0b4`), and WR11 (`c78a20a5`) are ancestors of this integration HEAD. No HR Cursor was started.

**Shared OAuth and continued proof (2026-11-23, integration `f78b4862`):** The machine-local file `/home/dskul/.local/state/offscreen-rpg/dev-oauth.env` was created from the primary checkout's gitignored `.env` with mode `0600` and directory mode `0700`. The existing parser accepted the three required keys. Values were not printed, copied into a worktree, or committed. The primary `.env` was not modified. A second run validates that file instead of overwriting it. `resolveOauthReadiness` now uses `assertApprovedOauthFile` before the database build and again before SQL. Focused test: `node --test scripts/repo-tools/dev-slot-startup.test.mjs` — 11 pass.

Proof A was reused as `dev-5` (`nextSequence` stayed 6 until B). Its namespace did not exist before the restart. `pnpm dev` at `f78b4862` provisioned `offscreen-dev-5` and reached six Deployments at 1/1. `http://127.0.0.1:13116/sign-in` and `/api/health/ready` returned 200. Available memory before B was about 5815 MiB. The first image context observed in the Tilt log was 88.27 kB for the API image `sha256:0fb2685a7afc1766b2f1cfcf78f253e4357a95db4066f316722a84f1ac446876` (`tilt-build-1795403160`). An earlier attempt at `9e01d223` died in `ensureOwnedSlotImages` with `ReferenceError: fingerprintDevImageContext is not defined` after tenant work; the re-export did not create a local binding. That binding is fixed at `f78b4862`.

Proof B allocated `dev-6` and stopped before workloads. Command `pnpm dev`, phase `temporal`, detail `offscreen-dev-6`. Source: `ensureDevTemporalTenant` returns `namespace-not-ready` with that namespace as the detail when describe yields no id (`infra/kubernetes/lab/dev/backing/dev-temporal-tenant.mjs`). `offscreen-dev-6` has no Deployments. dev-1 through dev-4 stayed desired 0. Ambient context stayed `kind-offscreen-lab`. No manual SQL, S3, Temporal, image, or port-forward repair was applied. Dependent edit, fault, and persistence cases were not run.

`pnpm dev:stop` in A exited 0 twice and scaled all six `offscreen-dev-5` Deployments to 0. Tilt PID 990813 remained: `tilt up --context kind-offscreen-dev --host 127.0.0.1 --port 13118`. That process is a residual owned by this proof. It was not killed outside the CLI.

| # | Result | Evidence |
| --- | --- | --- |
| 1 | PASS | proof A `pnpm dev` reused `dev-5`; six roles ready; Web and API health 200 |
| 2 | FAIL | proof B `pnpm dev` exited 1 at phase `temporal`, detail `offscreen-dev-6` |
| 3 | FAIL | `dev-6` was allocated, but its Temporal namespace was not confirmed and no app namespace workloads exist |
| 4 | FAIL | B never started the six roles |
| 5 | BLOCKED | B served no Web URL, so independent markers were not compared |
| 6 | FAIL | A became ready only after the fingerprint binding fix; B still needs a manual-equivalent Temporal diagnosis |
| 7 | BLOCKED | both environments were not running |
| 8 | BLOCKED | API edit not attempted |
| 9 | BLOCKED | compile fault not attempted |
| 10 | BLOCKED | no test edit to revert |
| 11 | BLOCKED | restart persistence needs a healthy pair |
| 12 | FAIL | A replicas reached 0, but Tilt PID 990813 on port 13118 survived `pnpm dev:stop`; B had no workload |

HR01, HR02, and HR03 remain BLOCKED. The NEXT-WAVE unattended two-worktree gate is not met. Predecessors MA12, CL01, and WR11 remain integrated. No HR Cursor was started.

**Retry at integration `c9689d507` (2026-11-23).** The earlier `f78b4862` rows stay historical. Clean proof worktrees were moved to that SHA. Registry `nextSequence` stayed 7. Defaults remained proof A `dev-5` and proof B `dev-6`. dev-1 through dev-4 stayed desired 0. Shared OAuth file remained mode `0600` and was not rewritten. Ambient context stayed `kind-offscreen-lab`; mutations used `kind-offscreen-dev`.

Available memory was 8133 MiB before A and 6165 MiB before B. With both stacks up, available memory was about 4891–5039 MiB and swap free fell to about 1497–1749 MiB. No third stack was started.

A reused `dev-5` / `offscreen-dev-5` / ports 13116–13119. Six Deployments reached 1/1. In-cluster Web and API returned 200. The dedicated forward PID 1092983 exited before `svc/game-web` was reachable, so `http://127.0.0.1:13116` stayed connection-refused. Tilt PID 1092982 stayed up. No manual port-forward was added.

B reused `dev-6`. SQL database `dev_6`, bucket `offscreen-dev-6`, and Temporal namespace `offscreen-dev-6` id `d9f8f0d7-27e6-455c-b820-127cceab82ec` retention `86400s` were still present. Six Deployments reached 1/1. Host Web and API on port 13120 returned 200, then that forward exited while Tilt PID 1279475 remained. In-cluster B Web and API stayed 200.

A sign-in edit `DXK09-PROOF-A-MARKER` appeared in A's pod and not in B. An API health edit `DXK09-PROOF-A-API` was served by the existing API pod (`game-api-657bcdc788-8xfvt`, start `2026-11-23T03:21:32Z`, restart count 0) after `Found 0 errors` at 03:34. A following type error was logged as `error TS`. `pnpm dev:status` then reported `NOT READY missing_receipt` for every role in both A and B, so it did not isolate the compiler fault. The two test files were restored with `git checkout` before parking. READY after restore was not rechecked.

The first `pnpm dev:stop` in A exited 0, Tilt 1092982 was gone, all six `offscreen-dev-5` Deployments were desired 0, and the session was `released: true`. B stayed in-cluster 200. No `the object has been modified` line was present in the captured A or B logs.

Restarting A attached to the same `dev-5` and brought six Deployments back to 1/1. Docker reported cached Dockerfile steps, then still named a new tag `offscreen-dev-workspace:tilt-build-1795404939` and logged `ERROR: image: ... not present locally` before loading it into Kind. The first stop of that restart exited 1 with `process-stop-incomplete`: Tilt was gone, forward PID 1385069 still listened on 13116, replicas stayed 1, and the session stayed `released: false`. A second ordinary `pnpm dev:stop` exited 0, the forward exited, replicas reached 0, and the session was released. B's single `pnpm dev:stop` exited 0 with Tilt and forward gone and replicas 0.

Final inventory: no owned `tilt up` or `game-web` forward; ports 13116–13123 free; dev-1 through dev-6 desired 0; `nextSequence` 7; `kind-offscreen-lab` untouched.

| # | Result | This retry |
| --- | --- | --- |
| 1 | FAIL | A reused dev-5 and six Deployments were ready in-cluster, but the host forward died and host HTTP was not 200 |
| 2 | PASS | B reused dev-6, including Temporal id `d9f8f0d7-27e6-455c-b820-127cceab82ec`, and reached six ready Deployments |
| 3 | PASS | Separate namespaces, ports, sessions, SQL databases, and buckets |
| 4 | PASS | A's marker rendered in A and was absent from B; A's own host URL was down |
| 5 | PASS | The Web edit updated only A |
| 6 | PASS | API marker was served by the already running pod with restart count 0 |
| 7 | FAIL | The type error was logged, but status said `missing_receipt` for A and B alike |
| 8 | BLOCKED | Test edits were reverted; READY after recovery was not observed |
| 9 | PASS | First A park exited 0, Tilt was gone, six replicas were 0, and B stayed healthy |
| 10 | PASS | Restart reused dev-5; no new environment id |
| 11 | FAIL | Restart still published a new `tilt-build-1795404939` tag after cached layers |
| 12 | FAIL | Restarted A's first stop left the forward and desired replicas; the second stop and B's stop then cleared both |

HR01, HR02, and HR03 stay BLOCKED. The unattended host path, status receipt, and single-stop park are not proven. No HR lane was started.

## Lifecycle repair receipt (code only)

The live dev-5/dev-6 campaign was not repeated.

Confirmed causes:

- Park could treat process signals as complete while a listener remained. Release now waits until the owned Tilt process exits, then the owned forwarder exits, then the game and Tilt ports are free, then all six Deployments read desired 0. A surviving forwarder, a foreign listener, or a replaced PID is refused. Environment A does not signal environment B.
- `pnpm dev:status` read the worktree receipt directory. The API, authority, and worker processes write loaded receipts in the Pod working directory, so the host reader reported `missing_receipt` for every role. Status now reads only the selected slot directory, reports `PARKED` for a parked session, rejects another slot's `environmentId`, and reports `image_loading` until the selected image generation is ready.
- `tilt-build-1795404939` is a Tilt expected-ref alias. `load-dev-image.sh` was still running `docker build` for every non-slot ref. A matching canonical fingerprint is now retagged and may still be loaded into Kind. A new tag alone is not a cache miss. Status cannot be READY while that load or Pod generation is unfinished.

Focused tests: `dev-environment-session.test.mjs`, `dev-tilt.test.mjs`, and `dev-slot-image-plan.test.mjs` — 41 pass. The watched-receipt package test was not rerun because this worktree has no installed `packages/runtime-logging` build. Live port-forward, Pod receipt, and Kind image proof remain NOT RUN.

## Live verification at `02b2e7ec` (2026-11-23)

Proof worktrees were detached at this SHA. Docker Desktop was down, so the first `pnpm dev` in proof A exited at phase `temporal` with `command-failed: temporal describe exited non-zero` while the shared Temporal server was still restarting. No new environment id was allocated. The retry below is the startup under test. `nextSequence` stayed 7. dev-1 through dev-4 stayed desired 0. `kind-offscreen-lab` was not modified.

**Forwarder.** Retry `pnpm dev` in proof A reused `dev-5` / `offscreen-dev-5` / ports 13116–13119. Six Deployments reached 1/1. Tilt PID 3368 start ticks 24581 and forwarder PID 3369 start ticks 24583 matched the session. The forwarder was `kubectl --context kind-offscreen-dev -n offscreen-dev-5 port-forward svc/game-web 13116:3000` and stayed up. `http://127.0.0.1:13116/sign-in` and `/api/health/ready` returned 200. No manual forwarder was added.

**Receipts.** `pnpm dev:status` exited 2. Every role was `NOT READY missing_receipt`. Host `.offscreen-dev-runtime/dev-5` does not exist. The API pod `game-api-57d554c454-7tsms` has working directory `/app/apps/api`, no `.offscreen-dev-runtime` directory, and only `OFFSCREEN_DEV_SLOT=dev-5`. `writeDevLoadedRuntimeReceipt` in `apps/api/src/main.ts` runs only when `OFFSCREEN_DEV_WATCHED_COMPILATION=1` and `OFFSCREEN_DEV_COMPILED_ENTRY` are set. Those variables are absent, so the producer never wrote `api.loaded.json`. The compile-error, restore, stale-generation, and image-loading live cases were not run. HTTP 200 was not treated as freshness.

**dev-6.** Available memory before B was about 18 GiB. `pnpm dev` in proof B reused `dev-6`, ports 13120–13123, namespace `offscreen-dev-6`. Six Deployments reached 1/1. Host `/sign-in` and `/api/health/ready` on port 13120 returned 200. Session Tilt 61349 and forwarder 61350. A comment-only edit in proof A's `apps/api/src/main.ts` did not replace dev-6's API pod `game-api-754dcb7799-xgh55` (start `2026-11-23T12:56:38Z`). The edit was reverted. dev-5 status still had no receipt directory to confuse with dev-6.

**Image reuse.** Before restart the canonical fingerprint was `0a00857b57901ffcd080df11c90d8338d73cc4177c9971d025ab68268b4835be` and `offscreen-dev-workspace:union-0a00857b57901ffc` was `sha256:22903d2a8ec45d1dc458d9abc2a7f389baf9ef53b6a4fbb1a2807455868f51f8`. After an unchanged restart both were the same. The restart log contains 0 `docker build` lines, 4 `phase=alias-canonical` lines, and 8 `not yet present` Kind load lines. One `docker save` failed with WSL `UtilAcceptVsock` 110 and the load was retried. Deployments selected `dev-5-api`, `dev-5-authority`, `dev-5-worker`, and `dev-5-web`. Ready pods reported Kind import `sha256:340822eb8c5556b9d81ffe4b8d44ab795d0e6e0b4a757fce34a659b22b5c5b14`, which is not the Docker canonical id.

**Stop.** The first stop of the original dev-5 start exited 0: Tilt and forwarder gone, ports 13116 and 13118 free, six desired replicas 0, session `parked` and `released`, dev-6 still HTTP 200. The first stop after the image-reuse restart exited 1 with `process-stop-incomplete`. Tilt 190891 was already gone. Forwarder 190892, start ticks 64460, still listened on 13116. Replicas stayed 1 and the session stayed `released: false`, `parkIncomplete: true`. The park loop polls 5 times at 50ms, about 250ms, which this forwarder outlived. A later SIGTERM to that same owned PID exited it. A second `pnpm dev:stop` then exited 0 and scaled dev-5 to 0. That second stop is not a first-stop pass. dev-6's first `pnpm dev:stop` exited 0 with both processes gone, ports free, six desired replicas 0, and `parked`/`released` true. SQL, S3, and Temporal identities were not deleted. `nextSequence` stayed 7.

The 250ms wait is extended to 40 polls in the park loop, with a test that a forwarder still alive for the first polls still releases. That change was not in the process that failed the live stop.

Focused proof-A tests after `pnpm --filter @offscreen/runtime-logging build`: watched-receipt, session, tilt, and image-plan tests, 45 pass. The new slow-forwarder test passed in the lifecycle worktree, 12 session tests.

HR01–HR03 stay BLOCKED. Pod receipt production and a first-try stop of a slow forwarder are not proven. No HR lane was started.

## Live verification at 6af5ba73 (2026-11-23) — FAIL

Change branch `change/dxk09-lifecycle-freshness` commits `ee589b89`, `fac98e96`, and `6af5ba73` point the six workloads at the existing receipt writers and make `pnpm dev:status` pull those files from the selected namespace. Focused tests on that branch: app-graph 3, receipt 5, tilt and session tests 42 pass, including the 40-poll park wait. Not integrated.

Proof A `pnpm dev` reused dev-5. Web reached 1/1 and `http://127.0.0.1:13116/sign-in` returned 200. API, authority, control, executor, and relay stayed 0/1. The running API image was still Kind import `sha256:340822eb8c5556b9d81ffe4b8d44ab795d0e6e0b4a757fce34a659b22b5c5b14`. Its command was `node dev-pod-compile-watch.mjs`, and the container exited with `MODULE_NOT_FOUND` for `/app/apps/api/dev-pod-compile-watch.mjs`. Docker had built `sha256:a8940fb5adc7b0ce17ae0a27a281cbaf6fe58524c72ded68fdcb066e7059d8b1`, which does contain that file, but Tilt reported `the object has been modified` while applying `game-api`, `game-authority`, `game-control`, `game-executor`, and `game-relay`, so the new digest never became the pod image. Receipt, compile-error, recovery, dev-6, and image-reuse checks were not run. HTTP 200 was not treated as freshness.

`pnpm dev:stop` then exited 0 and left all six dev-5 desired replicas at 0. That stop was of a crash-looping stack, with dev-6 not running, so it is not the required first-stop proof. dev-6 was not started. HR01–HR03 stay BLOCKED.

## Status repair and dev-5 acceptance (2026-11-23) — PASS for this stack

Parent `f76e4132` on `change/dxk09-lifecycle-freshness`. Two status defects were repaired in the lifecycle worktree and the same file bytes were the copies exercised from proof A (`/home/dskul/projects/offscreen-rpg-dxk09-proof-a`, detached at `f76e4132` during the run). Proof-only source edits were reverted before this record. The two untracked infra watcher copies were not part of the repair.

**Web image equivalence.** `canonicalDockerImageReference` treats `offscreen-dev-workspace:tilt-build-1795443662` and `docker.io/library/offscreen-dev-workspace:tilt-build-1795443662` as the same reference. A different repository, tag, digest, or registry stays unequal. Namespace, pod readiness, and HTTP status checks remain in `assessWebDevServerReadiness`.

**Worker compiled artifacts.** `evaluateDevLoadedRuntimeReadiness` uses the container receipt `diskIdentity` when the status path already pulled it. A missing host `dist` file does not fail that case. A local read that finds no file returns `missing_artifact` instead of an uncaught `ENOENT`. Compile error, missing receipt, stale generation, and a foreign slot or runtime stay `NOT READY`.

**Focused tests.** `node --test scripts/repo-tools/dev-web-readiness.test.mjs infra/kubernetes/lab/dev/dev-watched-compilation-receipt.test.mjs` — 36 pass, 0 fail.

**Live dev-5, no restart before the recheck.** `pnpm dev:status` exited 0:

- web READY `dev_server_serving` `docker.io/library/offscreen-dev-workspace:tilt-build-1795443662`
- api READY `loaded_matches_desired` `f379a16f60e2f50991507708cc6daa9b9e5709ee3554f100760cb08af5f7967b`
- authority READY `loaded_matches_desired` `9c9d04db56f59fdac28e9ffba30b479557cc6820cde1c2773b7b644d0b93ed65`
- control READY `loaded_matches_desired` `e06f92888247a8a25445835cda4fc3f0fb4064be9982de3eeb6bcb1a5b99cecd`
- executor READY `loaded_matches_desired` `7405205aa9731b6af83323b95d7985776ceee3048800fdf8840def2c3ebb4049`
- relay READY `loaded_matches_desired` `3d282a26b6d4897c51a7048e03303311436babbc655d42113a07337efd53802a`

`http://127.0.0.1:13116/sign-in` and `http://127.0.0.1:13116/api/health/ready` both returned 200.

**Web edit.** A reversible marker in `apps/web/app/sign-in/page.tsx` was served on port 13116 on the first check, then the file was restored.

**API compile error.** A syntax error in `apps/api/src/main.ts` made `pnpm dev:status` report `api NOT READY compile_error`. Restoring the file returned `api READY loaded_matches_desired`.

**First stop.** One `pnpm dev:stop` exited 0. Tilt PID 740587 and kubectl PID 769312 were gone. Ports 13116 and 13118 were free. All six `offscreen-dev-5` Deployments were desired 0. Tenant Secret UIDs were unchanged: `dev-5-app` `cd146db7-c962-4bef-ad82-adad2c099c2f`, `dev-5-run-auth` `58ef4bac-0287-4ee8-af43-8571e26208ba`, `dev-5-s3` `ce1d32a5-751c-43e2-b9a2-ccf0ce6db179`.

This receipt is one stack. The two-worktree gate, the unattended ordinary-worktree gate, and four-stack acceptance are not claimed here. HR01–HR03 stay BLOCKED.

## Two-worktree gate at `9f1eab1c` (2026-11-23) — partial

Proof A and proof B were detached at `9f1eab1c`. Each used `pnpm dev` with no manual Kubernetes repair. A reused `dev-5` / `offscreen-dev-5` / ports 13116 and 13118, Tilt PID 840443. B reused `dev-6` / `offscreen-dev-6` / ports 13120 and 13122, Tilt PID 940544. Web image tags differed: A `tilt-build-1795444429`, B `tilt-build-1795444759`. Compiled role hashes matched because the source was the same commit. Host `/sign-in` and `/api/health/ready` returned 200 on both 13116 and 13120. `pnpm dev:status` exited 0 in both checkouts.

Secret UIDs stayed distinct: dev-5 `dev-5-app` `cd146db7-c962-4bef-ad82-adad2c099c2f`, `dev-5-run-auth` `58ef4bac-0287-4ee8-af43-8571e26208ba`, `dev-5-s3` `ce1d32a5-751c-43e2-b9a2-ccf0ce6db179`; dev-6 `dev-6-app` `b3dfd6c7-fd75-4e7c-8896-c5f10def0a93`, `dev-6-run-auth` `55536671-dd62-496f-9ac5-36226fe8931e`, `dev-6-s3` `c168ad8e-661c-4f11-9c2b-9d1407832a96`.

A marker `DXK09-A-ONLY` in proof A's `apps/web/app/sign-in/page.tsx` appeared on port 13116 and did not appear on port 13120. The marker was removed.

`pnpm dev:stop` in A exited 0. Ports 13116 and 13118 were free. dev-5 desired replicas were 0. B stayed on 13120 with HTTP 200, desired replicas 1, and the same Secret and Deployment UIDs. dev-5 Secret UIDs were unchanged.

**Restart while B stayed up: capacity refusal, with a late scale.** Before the retry, MemAvailable was about 2.8 GiB and swap used about 2.6 GiB of 4.0 GiB. `pnpm dev` in A exited 1 with `MemAvailable is 2648324 KiB, below 4194304 KiB (4 GiB).` That check in `runDevTiltLaunch` runs after `reconcileOwnedDevSlot`. The refusal left dev-5 desired replicas at 1, status `PARKED`, `game-web` Running, and the other five pods `Error`, with no listener on 13116. A follow-up `pnpm dev:stop` returned those replicas to 0. B was still HTTP 200. This is host pressure plus admission ordered after workload reconcile, not a failed image build.

A third ordinary worktree was not started. Two stacks already sat under the 4 GiB gate. Four-stack acceptance is not met. HR01–HR03 stay BLOCKED. DXK09 is not ready to archive.

## Capacity refusal ordered before mutation (2026-11-23)

`runDevTiltLaunch` now runs the existing stack preflight and exits on `memory-low` or `memory-unknown` before `reconcileOwnedDevSlot` and before `replaceOwnedDevSessionTilt` / `replaceOwnedEnvironmentTilt`. The 4 GiB threshold and refusal text are unchanged. Docker, port, and PID/start-time checks stay where they were. `node --test scripts/repo-tools/dev-tilt.test.mjs` — 27 pass, including low memory (no reconcile, no signal, no spawn, exit 1), sufficient memory (reconcile and spawn), unknown memory (exit 1 before reconcile), and an owned session that is not signalled.

**Live refusal was not run.** At the measurement after the earlier stop, MemAvailable was 5976976 KiB, above 4194304 KiB. SwapTotal 4194304 KiB, SwapFree 2197092 KiB. dev-5 stayed desired replicas 0. Ports 13116 and 13118 were free. dev-6 stayed desired replicas 1 and `http://127.0.0.1:13120/sign-in` returned 200. Starting A would have passed the memory gate, so it was not started.

The earlier live failure remains the evidence of the old order: MemAvailable 2648324 KiB refused only after dev-5 had already been scaled to 1. That scale is what this ordering change closes. A second `pnpm dev` under low memory was not repeated.

**Capacity decision, separate from this fix.** The gate is still 4 GiB MemAvailable. One running stack plus a second start has already been refused at 2.65 GiB available, with about 2 GiB of swap in use. Four-stack acceptance stays open. HR01–HR03 stay BLOCKED. DXK09 is not archived.

## Instrumented dev-5 restart beside dev-6 (2026-11-23) — not six READY

The 4 GiB threshold was not changed. proof-A was detached at `6328a427` and started once with `pnpm dev`. dev-6 was left running.

**Before launch.** MemAvailable 6063944 KiB, SwapFree 2224980 of 4194304 KiB. Docker: `offscreen-dev-worker` 4.893 GiB, `offscreen-dev-control-plane` 1.101 GiB, `offscreen-lab-worker` 4.751 GiB, `offscreen-lab-control-plane` 1.006 GiB. dev-5 desired replicas 0. dev-6 six ready, `http://127.0.0.1:13120/sign-in` and `/api/health/ready` 200.

**During.** Preflight passed. Tilt listened on 13118. About 90 seconds in, MemAvailable 5510808 KiB, SwapFree 2241124 KiB, dev worker 5.447 GiB. Web became Running and `http://127.0.0.1:13116/sign-in` returned 200. API, authority, control, executor, and relay stayed `Error` with restart counts 4 and reason `Error` exit 1, not `OOMKilled`. The API log was `Cannot find module '/app/apps/api/dev-pod-compile-watch.mjs'`. After the image step, MemAvailable 5492032 KiB and SwapFree 2242144 KiB. dev-6 stayed 1/1 and HTTP 200.

**Stop.** `pnpm dev:stop` in proof-A exited 0. dev-5 desired replicas returned to 0. Ports 13116 and 13118 were free. dev-6 stayed 1/1 and HTTP 200. MemAvailable after stop was 6166284 KiB. Swap did not grow during the attempt.

**Footprint of this partial second stack.** Host MemAvailable fell by about 572 MiB (6063944 → 5492032). The dev worker cgroup rose by about 0.59 GiB (4.893 → 5.486). SwapFree rose slightly. That is not the cost of six healthy workloads. The lab Kind node, about 5.76 GiB combined, was resident the whole time and was not part of dev-5.

Restart-isolation edits were not run because A never reached six READY. No third stack was started. DXK09 stays open.

## Watcher packaging and two-stack restart (2026-11-23)

The five Node commands are `node dev-pod-compile-watch.mjs` with working directories `apps/api`, `apps/game-authority`, and `apps/worker`, and `node dev-pod-web-receipt.mjs` under `apps/web`. Those four files are tracked application source. The untracked copies under `infra/kubernetes/lab/dev/` are not the command paths and were left untracked. `ac39ba78` copies the four entrypoints again in the runner stage and fails `docker build` when `dev-image-runtime-modules.mjs --check` finds one missing.

A fresh image `offscreen-dev-workspace:watcher-proof` (`sha256:06441490a1911a8272420575abf29ae6b732d3234b7389567254e535287d2c37`) printed `present` for all four paths. `node --test` on the runtime-module and slot-graph tests passed, 8 tests.

proof-A was detached at `ac39ba78`. Before `pnpm dev`, MemAvailable was 5983240 KiB and SwapFree 2372304 of 4194304 KiB. dev-5 desired replicas were 0. dev-6 was six ready and `http://127.0.0.1:13120/sign-in` returned 200. Preflight passed. Tilt aliased the canonical image `sha256:116b50756a08`, which contains both watcher files. The first pods still ran Kind import `sha256:340822eb8c55` and exited `MODULE_NOT_FOUND` until each Deployment rolled. All six dev-5 Deployments then reached 1/1. `http://127.0.0.1:13116/sign-in` and `http://127.0.0.1:13120/sign-in` returned 200. Peak observed pressure was MemAvailable 2763036 KiB and SwapFree 652996 KiB. dev-6 stayed 1/1 throughout.

A marker `DXK09-A-WATCHER` in proof-A `apps/web/app/sign-in/page.tsx` was served on port 13116 and absent on port 13120. The marker was removed and the next read of port 13116 no longer contained it. `pnpm dev:stop` in proof-A returned dev-5 to 0 replicas and freed 13116 and 13118. dev-6 stayed 1/1 and HTTP 200.

No third stack was started. Two healthy stacks already left MemAvailable below the 4 GiB gate and used most of the 4 GiB swap. The unattended ordinary-worktree gate and four-stack acceptance are not met. HR01–HR03 stay BLOCKED. DXK09 is not archived. DXK10 was not implemented.

## Unattended ordinary worktree at `11d2e021` (2026-11-23) — not accepted

dev-6 was parked first with its own `pnpm dev:stop` because a second full stack had already fallen under the 4 GiB gate. That stop exited 0 and left `offscreen-dev-6` desired replicas at 0. Before the new start, MemAvailable was 6892660 KiB and SwapFree 1623268 of 4194304 KiB. The 4 GiB threshold was not changed. A third simultaneous stack was not started.

The checkout was a new detached worktree `/home/dskul/projects/offscreen-rpg-dxk09-ordinary` at `11d2e021`. `pnpm install --offline` and `pnpm dev` were the start path. No kubectl apply, image retag, or port assignment was done by hand. The launcher selected `dev-7` / `offscreen-dev-7`, game port 13124, Tilt port 13126, Tilt PID 1320939.

**What passed.** All six Deployments reached desired 1 and ready 1. `http://127.0.0.1:13124/sign-in` and `/api/health/ready` returned 200. API, authority, control, executor, and relay reported `READY loaded_matches_desired`. A `console.log('DXK09-ORDINARY-API')` in `apps/api/src/main.ts` changed the API loaded hash to `59f6b1707ca303adb145318fae018916091e15adee01cdfbd1aa40b6c137fde5` and the log printed `DXK09-ORDINARY-API`. Replacing that line with `const = 'DXK09-ORDINARY-BROKEN'` made `pnpm dev:status` report `api NOT READY compile_error`. The file was restored. One `pnpm dev:stop` exited 0, status became `runtime PARKED`, desired replicas returned to 0, and ports 13124 and 13126 were free. dev-7 Secret UIDs were unchanged: `dev-7-app` `18a86f46-bd9c-4d35-a63d-7aa54120a43f`, `dev-7-run-auth` `38355106-af4b-460b-811e-f954cfe2b526`, `dev-7-s3` `80b6e862-eb8d-4fc2-8014-177e515a998d`. dev-6 stayed desired 0 with the same Secret UIDs: `dev-6-app` `b3dfd6c7-fd75-4e7c-8896-c5f10def0a93`, `dev-6-run-auth` `55536671-dd62-496f-9ac5-36226fe8931e`, `dev-6-s3` `c168ad8e-661c-4f11-9c2b-9d1407832a96`. `.offscreen/dev-session.json` remains gitignored.

**What failed.** `pnpm dev:status` kept `web NOT READY image_mismatch` and exited 2. The game-web Deployment asked for `offscreen-dev-workspace:tilt-build-1795447256`. The running container reported `docker.io/library/offscreen-dev-workspace:dev-7-api`. On `offscreen-dev-worker`, `crictl` showed `dev-7-api`, `dev-7-web`, and the four `tilt-build-1795447*` tags sharing image id `6006f82bf68ae`. The host image `offscreen-dev-workspace:tilt-build-1795447256` was `sha256:02de705415e3e52e9e5e7374723633c6d58812438f885d8575bac44ba8269138`. Tilt logged that id as not yet present, then the pods ran the other id. Six truthful READY statuses were not reached. No manual image repair was applied.

**HR gate.** The two-stack source-isolation and first-stop receipts stay as previously recorded. This ordinary-worktree attempt does not meet the NEXT-WAVE requirement of six truthful READY statuses and correct image convergence. HR01–HR03 stay BLOCKED. Four-stack capacity was not attempted and stays unproven. That capacity gap is separate from this narrower failure: even with one stack and MemAvailable still above 4 GiB (5189464 KiB while the stack was up), image convergence did not pass. DXK09 is not ready to integrate or archive.

## Fail-closed partial startup (2026-11-23) — unit proof only

`runDevTiltLaunch` still refuses memory before mutation. After Tilt is spawned, it now waits up to 15 minutes for the six Deployment readyReplicas. Success leaves the stack running. Memory exhaustion during that window, Tilt exiting early, or a partial set at the deadline calls `rollbackFailedOwnedStartup`, which parks only that slot's six workloads and its owned processes. Desired replicas must read back as zero. A failed park logs `rollback-incomplete` and does not claim `startup-parked`. Reservation and tenant UIDs are not cleared. `node --test scripts/repo-tools/dev-tilt.test.mjs` passed 32 tests. Those tests cover one-ready/five-failed, memory exhaustion after admission, full success, rollback failure, and a foreign namespace that is not scaled. Live rollback was not run. The unattended ordinary-worktree gate remains unproven.

No live negative was run. dev-6 stayed parked. Host memory was not exhausted on purpose. The ordinary-worktree image-id mismatch from the `11d2e021` attempt is still unresolved, so a new full stack was not started and the unattended gate remains unmet. Four-stack capacity remains unproven. HR01–HR03 stay blocked. DXK10 was not implemented.

## Kind alias identity at `c1fd73ea` (2026-11-23) — not accepted

`load-dev-slot-image.sh` no longer treats a present slot tag as current. It compares Docker's image ID with the `ctr images ls` digest for that alias, reloads only the stale node, and exits on a post-load mismatch. Focused unit tests passed: `node --test scripts/repo-tools/dev-slot-image-plan.test.mjs scripts/repo-tools/dev-web-readiness.test.mjs scripts/repo-tools/dev-tilt.test.mjs` reported 45 passes before the live retry.

`pnpm dev` in this worktree selected `dev-8`. The first attempt exited 1 during image load because the check compared the OCI index digest with the CRI config id (`post-load-mismatch`). After comparing index digests to each other, a second `pnpm dev` reached Tilt on port 13130. Node tags `dev-8-*` and `tilt-build-1795448824` shared `sha256:6fe018c2b81c5ec118e44ffa4efa400cd72b4ee3bdda3e1f91e417d31c290902`. The running game-web pod spec asked for that tilt tag, but its container image ID stayed `sha256:32c59a1de2ffac188ea1a1b07c783338c0c13e12f3e1bdc09e745cb7154fbc4e`. Six truthful READY lines were not observed. `pnpm dev:stop` exited 0 and returned `offscreen-dev-8` desired replicas to 0. HR01–HR03 stay blocked. Four-stack capacity was not attempted. DXK10 was not implemented.

## Tilt-owned union image on `dev-8` (2026-11-23) — functional start, status and workflow still open

Source SHA `e93f33c7` with uncommitted image-ownership edits on `change/dxk09-lifecycle-freshness`. Image preparation wrote the content tag and did not patch Deployments. Tilt selected `offscreen-dev-workspace:union-250f5d2592d600ce` on all six Deployments. The Kind worker recorded that tag at `sha256:b2399037617cd8c01d0bd6f83756d446c613f11a5679e2614b748a23a3f86a7b`. Pod status printed the sibling alias `offscreen-dev-workspace:dev-8-api` for every role; containerd held the slot aliases and the union tag on that same digest.

All six Deployments were ready at 1 replica. Web returned HTTP 200. The API port accepted a connection and returned 404 for `/health`. Tilt synced `apps/web/app/layout.tsx` and `apps/api/src/main.ts`; both markers were in the containers and were reverted. A deliberate API syntax error produced `src/main.ts(4,21): error TS1109: Expression expected.` After the line was removed, the watcher reported `Found 0 errors`. `pnpm dev:stop` scaled all six `offscreen-dev-8` Deployments to 0. Secret UIDs stayed `dev-8-app` `a2063742-e7d7-40c1-a26c-1c875672fc4e`, `dev-8-run-auth` `48097ed4-5385-40f8-8ef8-d49fd92e41f9`, `dev-8-s3` `63b3298c-e452-482a-9a48-6a2c246debc7`. `offscreen-dev-1` stayed at 0 replicas on its previous image.

`pnpm dev:status` was not captured while the pods were serving. No Temporal workflow task was executed. Four-stack capacity, browser OAuth, and release-lab acceptance were not run. HR01–HR03 stay blocked until a later receipt shows six truthful current-generation READY lines and one processed workflow task. DXK10 was not implemented.

## Owned-slot acceptance at `d0e35b63` (2026-11-23) — functional gate passed

`pnpm dev` on `change/dxk09-lifecycle-freshness` at `d0e35b63` selected `dev-8` and reached Tilt at `http://127.0.0.1:13130/`. All six Deployments used `offscreen-dev-workspace:union-21b8a1688220dcd5` and were ready at 1 replica. `pnpm dev:status` while they were serving:

- `web READY dev_server_serving docker.io/library/offscreen-dev-workspace:union-21b8a1688220dcd5`
- `api READY loaded_matches_desired f379a16f60e2f50991507708cc6daa9b9e5709ee3554f100760cb08af5f7967b`
- `authority READY loaded_matches_desired 9c9d04db56f59fdac28e9ffba30b479557cc6820cde1c2773b7b644d0b93ed65`
- `control READY loaded_matches_desired e06f92888247a8a25445835cda4fc3f0fb4064be9982de3eeb6bcb1a5b99cecd`
- `executor READY loaded_matches_desired 7405205aa9731b6af83323b95d7985776ceee3048800fdf8840def2c3ebb4049`
- `relay READY loaded_matches_desired 3d282a26b6d4897c51a7048e03303311436babbc655d42113a07337efd53802a`

The pod status alias remained a sibling tag of that digest. Readiness accepted it only after the running container digest matched the selected image. `http://127.0.0.1:13128/sign-in` returned 200. `http://127.0.0.1:13128/api/health/ready` returned 200 `{"status":"ok"}`.

A body marker `DXK09-LIVE-WEB` was served from `apps/web/app/layout.tsx`. `console.log('DXK09-LIVE-API')` was present in the API pod and printed `DXK09-LIVE-API`. Replacing that line with `const dxk09Broken = ;` made status report `api NOT READY compile_error` and the watcher logged `src/main.ts(19,21): error TS1109: Expression expected.` Restoring the file returned `api READY`. Both files were reverted.

Relay namespace `offscreen-dev-8`, queue `offscreen-local`. Workflow `dxk09-relay-ping-1795454621418` of type `scriptedOpeningV1` was started with a missing opening id. The relay log recorded `Workflow failed` for that type after `Activity task failed`. History event types were `1,5,6,7,10,11,13,5,6,7,3` and status `FAILED`. That is workflow-task and activity processing, not a completed story. The dev relay still uses `debugMode` when `OFFSCREEN_DEV_WATCHED_COMPILATION=1`. `game-control` logged `RangeError: Invalid atomic access index` and restarted under its watcher; Kubernetes still reported it ready and status reported `loaded_matches_desired`.

`pnpm dev:stop` exited 0. All six `offscreen-dev-8` desired replicas were 0. Listeners `13128` and `13130` were closed. Secret UIDs stayed `dev-8-app` `a2063742-e7d7-40c1-a26c-1c875672fc4e`, `dev-8-run-auth` `48097ed4-5385-40f8-8ef8-d49fd92e41f9`, `dev-8-s3` `63b3298c-e452-482a-9a48-6a2c246debc7`. `offscreen-dev-1` stayed desired 0 on its previous images, including `offscreen-dev-workspace:tilt-build-1795394042` for web.

Four-stack capacity, browser OAuth, release-lab acceptance, a brand-new unattended worktree, and a completed provider-free story were not run. HR01–HR03 stay blocked on that new-worktree prerequisite. DXK09 is not archived. DXK10 was not implemented. Memory admission was not changed.

## Unattended cold worktree at `e3fa10b7` (2026-11-23) — lifecycle gate passed

Detached worktree `/home/dskul/projects/offscreen-rpg-dxk09-cold-gate` at `e3fa10b7`. No manual namespace, SQL, S3, Temporal, or port-forward setup. `pnpm dev` began `2026-11-23T17:29:33Z`, selected new slot `dev-9`, and recorded its Tilt session at `2026-11-23T17:35:57Z` (`http://127.0.0.1:13134/`). Reconciliation before Tilt was about 6 minutes 24 seconds. The union image `offscreen-dev-workspace:union-af00da505c96e8bc` already existed (`created 2026-11-23T16:25:11Z`, 1.81GB). Every Tilt custom build printed `builds=0` for that digest. Docker stage durations for a miss were not observed. Kind-load durations were not printed. Tilt's first four role steps took 6.73s, 6.67s, 5.35s, and 6.14s; executor and relay used cached images.

`pnpm dev:status` while serving:

- `web READY dev_server_serving docker.io/library/offscreen-dev-workspace:union-af00da505c96e8bc`
- `api READY loaded_matches_desired f379a16f60e2f50991507708cc6daa9b9e5709ee3554f100760cb08af5f7967b`
- `authority READY loaded_matches_desired 9c9d04db56f59fdac28e9ffba30b479557cc6820cde1c2773b7b644d0b93ed65`
- `control READY loaded_matches_desired e06f92888247a8a25445835cda4fc3f0fb4064be9982de3eeb6bcb1a5b99cecd`
- `executor READY loaded_matches_desired 7405205aa9731b6af83323b95d7985776ceee3048800fdf8840def2c3ebb4049`
- `relay READY loaded_matches_desired 3d282a26b6d4897c51a7048e03303311436babbc655d42113a07337efd53802a`

`http://127.0.0.1:13132/sign-in` returned 200. `http://127.0.0.1:13132/api/health/ready` returned 200 `{"status":"ok"}`. The prior `dev-8` live-edit, compile-error, and relay-task receipts were not repeated. `game-control` again logged `RangeError: Invalid atomic access index` while status stayed `loaded_matches_desired`. That crash remains an outstanding follow-up. It is not a Temporal redesign.

`pnpm dev:stop` exited 0. No `offscreen-dev-1` through `offscreen-dev-9` deployment kept a desired replica above 0. `dev-8` web stayed `offscreen-dev-workspace:union-21b8a1688220dcd5` at 0 replicas. `dev-1` web stayed `offscreen-dev-workspace:tilt-build-1795394042` at 0. New tenant secrets remained: `dev-9-app` `28ea0a34-dd6b-4b9f-a060-5d4be8356c2c`, `dev-9-run-auth` `d9f93a66-9471-4212-a3be-059ea52bfef3`, `dev-9-s3` `096d99aa-2f3e-415d-8412-224a5f470d3c`.

This accepts the ordinary unattended start/status/stop milestone. It does not accept four-stack capacity, browser OAuth, release-lab acceptance, or a completed provider-free story. Those stay open, so DXK09 is not archived. HR01–HR03 were not started. DXK10 was not implemented.
