# VER02 | Bounded Composer tasks

Baseline 0c45ae7318295398d706511b9d702720a55c8a92; main; VER01 joined; can implement while DB03–10 continue; no DB runtime API changes. MODEL=Composer Standard / DEPTH=PATCH. One child at a time. Parent owns manifests, lockfile and join. Read normative verification contract once; dispatch only selected task + anchors. All commands from repo root; stop on actual safety/semantic contradiction; no live mutation unless separately invoked by operator. Receipt paths, command, result, source/fixture/live tier, cleanup and SHA.

## T01 | Resource plan and preflight

Read infra/platform/temporal/images.pin, infra/images/release/test/pod-bind-smoke.test.mjs, infra/verification/diagnostic-engine.mjs, runner/plan.mjs. Create resources/postgres/docker-plan.mjs and test. Closed single/constrained profiles from normative doc; validate local Docker endpoint via docker context inspect (unix socket or local named pipe only; live WSL/Linux required), docker info, /proc/meminfo available >= requested RAM + 2GiB, disk free >=2GiB. Resolve pinned image locally or explicitly pull exact tag only on --live, record image ID. Generate random run name, label offscreen.verify.run=<runId>, unique role/db fixed offscreen_db_test, random 32-byte password private. No env DATABASE_URL reuse, no arbitrary Docker arguments. Plan no mutation. Test wrong context, low memory, unsupported profile, foreign IDs.

## T02 | Create and authenticate

Read docker-plan.mjs, runner resource interface, existing pod-bind smoke container ownership. Implement resources/postgres/docker.mjs; docker create --name generated --label exact --memory --cpus --tmpfs /var/lib/postgresql/data:rw,size=256m -p 127.0.0.1::5432 --env-file private file (0600, unlink after create) pinned image ID, postgres -c max_connections=profile value. Capture returned container ID; inspect exact ID/label/image/loopback binding before start; docker start ID, poll pg_isready then real SELECT current_database/current_user through pg Client, require expected db/role and server version, acquire private DSN only in memory. Use explicit bounded command execution, startup 90s. Add pg 8.23.0 tool dependency; no DB package import for resource oracle. If creation interrupted reconcile only exact run label + name + ID; no adoption on ambiguous result. Tests fake docker transitions, wrong label/port/role, readiness timeout, no secrets in report.

## T03 | Fault and cleanup

Read docker.mjs, runner/execute.mjs and report.mjs. Expose owned restart capability only for recovery profile, verify ID+label before docker restart, wait authenticated readiness, preserve same container/port; backend termination only through own fixture connection using recorded PID and role, no shared backend. Release checks exact ID+label then docker rm -f ID, verify absent, private file cleanup; no volumes/prune. Handle partially created resource, timeout, signal, cleanup failure, refuse foreign identity. Persist owner receipt without credentials. Tests with fake commands plus optional explicit live adapter smoke through runner; source tests run without Docker. No live permission implied by packet commission.

