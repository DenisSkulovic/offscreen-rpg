# INF29 proof

Current integrated live NOT-RUN until this run finishes. Catalog defines observable oracles. No acceptance based on historical DXK09 run or source-only receipts.

**2026-11-24 corrective live run, branch `change/inf29-kubeconfig-identity`, worktree `/home/dskul/projects/offscreen-rpg-inf29`.** `dev-10` stayed the reserved slot and was rebound from the primary checkout to this worktree before resume. No cluster or kubeconfig rename. Release nodes stayed Ready. `offscreen-dev-10` has no Deployments.

| Phase | Result | Correction |
| --- | --- | --- |
| platform | FAIL 1.36s, then passed | Expect Kind kubeconfig cluster `kind-<kind name>`. `commands.test.mjs` 11 pass. |
| artifact | FAIL 5.94s, then passed | Build `@offscreen/db...` so the workspace dependency exists. Focused filter test pass. `pnpm --filter @offscreen/db... build` pass. |
| migration port-forward | FAIL 37.20s, stack overflow, then passed | Local `spawn` shadowed `child_process.spawn`. `dev-slot-migrate.test.mjs` port-forward arg test pass. |
| images `kind get nodes` | FAIL 116.76s, docker build 101.9s | `kind get nodes` has no `-o`. Loader test 18 pass. |
| images node platform | FAIL 57.81s | Docker 29 container inspect uses `ImageManifestDescriptor.platform`, not `.Os` / `.Architecture`. Loader test 18 pass. |
| images post-load | FAIL 47.46s, then loader pass | Docker 29 `.Id` is the OCI index digest `sha256:1dc7c37d…`, equal to the containerd target. Platform config is `sha256:c186641c…`. Kind had imported the index. Loader now matches `targetDigest` to host `Id` and still resolves the platform manifest. Loader unit tests 18 pass. Direct `ensureKindImage` on `offscreen-dev-workspace:union-d1c4d35f87232de4`: control-plane reused, worker loaded, both targets `sha256:1dc7c37d…`, manifest `sha256:11b71c37…`, config `sha256:c186641c…`. |

Edit, TypeScript recovery, stop, warm restart, and tenant survival remain NOT-RUN. SQL, S3, and Temporal phases had already succeeded on the attempts that reached them, so those tenants were left in place.

**Resume after loader correction:** `pnpm dev` passed image distribution for `offscreen-dev-workspace:union-239ca9ffcbcdba11` (`sha256:7e0dfb9f…`): control-plane and worker both `reused`. Tilt then failed `game-web` with `node image content unreadable for offscreen-dev-worker` while `game-api` was loading the same ref. Startup rollback reported `MemAvailable` 3744212 KiB, below the 4 GiB gate, and `process-stop-incomplete`. `pnpm dev:stop` then parked `offscreen-dev-10`: all six Deployments desired 0, no owned `tilt up`. Reservation kept.

**Concurrent image isolation (memory healthy, about 8 GiB available):** two `load-dev-slot-image.sh --tilt-ref` processes for `dev-10-web` and `dev-10-api` both resolved `offscreen-dev-workspace:union-239ca9ffcbcdba11` / `sha256:7e0dfb9f…`. Each reported kind-load reused on both nodes and ctr-tag hit. Wall time matched one load after the other, which is the fingerprint `flock` held from fingerprint check through alias confirm. The worker content-read failure did not reproduce. No extra lock was added. Readiness compares CRI ids from `crictl inspecti`, not Docker `.Id`. Alias confirm accepts either the platform config id or the alias target equal to the canonical target. Docker `.Id` remains the index/target digest and is not treated as the config digest.

**Cold start with memory above the gate:** Tilt on `127.0.0.1:13138`. Web, control, executor, and relay Ready. API and authority stayed unready: `tsc --watch` prints `8:00:05 PM - Found 0 errors…`, and the supervisor regex required the line to start with `Found`, so it never launched the runtime. Compile-watch now allows that TypeScript timestamp. `dev-compile-watch.test.mjs` 16 pass. The running pods still had the previous image. Readiness then ran about 348s and `pnpm dev` exited 1: `rollback-incomplete: MemAvailable is 3795792 KiB, below 4194304 KiB (4 GiB).; process-stop-incomplete` with `scaledRoles` empty. Tilt and all six Deployments were still up. `pnpm dev:stop` then parked `offscreen-dev-10`: desired 0, no `tilt up`.

**Rollback defect:** failed-start park called `parkSelectedEnvironment` with `sleep: () => {}`, so the 40 exit polls did not wait and returned `process-stop-incomplete` before scaling. Explicit stop waits 50ms per poll via `Atomics.wait`. Both paths now use `waitOwnedProcessExitPoll`. A later start still hit `process-stop-incomplete` with `scaledRoles` empty because Tilt did not exit during the polite wait while `MemAvailable` was 3564556 KiB. That live failure was before `SIGKILL` escalation existed. The shared park now re-reads PID and start time and sends `SIGKILL` only when that same process is still owned, then scales. `park kills a tilt process that ignores SIGTERM and then scales six roles`, `park does not SIGKILL a reused PID after the polite wait`, and the readiness memory-drop test passed. `pnpm dev:stop` parked the slot again: desired 0, no Tilt. Full-stack acceptance remains incomplete. No further startup. The `SIGKILL` path has not been observed on a live Tilt process. Edit, compile-failure recovery, stop timing, warm restart, and tenant survival remain NOT-RUN.

## 2026-11-25 reconciliation

Current main c9ad30652dbf43140bc1e8154a786adc8af073b8. Later startup, release and diagnostic fixes have landed; no repeat source repair commission. Owner recalls successful last-night startup/verification; prior conversation reported 90/90 diagnostic and 10/10 release startup phases, but raw report, exact revision and complete lifecycle receipt are not attached here. Treat as operator-reported observations only. DEV edit/recovery/park/resume and retained tenant acceptance remain NOT-RUN at this baseline until INF52 evidence. No claim that all historical failures reproduce.

## INF52 programme wiring (source-only, live NOT-RUN)

[INF52](../../archive/2026-11/platform-operations/2026-11-25--inf52-owned-lifecycle-verification/CHANGE.md) registers VER01 live sections that dispatch through `infra/verification/dev-environments/dev-environment-live-dispatch.mjs`:

| Capability | Programme | Live status on current HEAD |
| --- | --- | --- |
| DEV-02/03/10 | `lifecycle-programme.mjs` | NOT-RUN until explicit `--live` |
| DEV-07/08/09 | `recovery-programme.mjs` | NOT-RUN |
| DATA-01 | `tenant-retention-programme.mjs` | NOT-RUN |
| DEV-04/05/14 | `selective-profile-programme.mjs` | BLOCKED `selective-profiles-unimplemented` until INF38 `--profile` is joined; source fixture proof only |
| DEV-12 | `selective-profile-programme.mjs` optional mixed-slot section | NOT-RUN unless explicit profile selection and measured capacity |

No INF29 closure from these registrations. Selective profile PASS requires INF38 product CLI, not verification catalogue alone.
