# Local development

The foundation contains a pnpm/Turborepo workspace, strict TypeScript configuration, a Next.js page, a NestJS HTTP process and an independently tested PostgreSQL package. The API does not use that package yet. There is no authentication, workflow worker or playable story. Packages are created when their first implementation needs them; the architecture diagram is not a directory checklist.

## Requirements and startup

Use Node **24.19.0** (also recorded in `.node-version`) and pnpm **11.19.0**. The system's default Node must match before running package scripts. Install the pinned pnpm with `npm install --global pnpm@11.19.0` if necessary.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The API listens on `127.0.0.1:3001`; `/api/health/live` is also proxied through the web server. Both applications watch source changes. Stop the task with Ctrl+C. This shell needs no credentials, paid services or Docker.

The API accepts optional process environment variables `API_HOST` and `API_PORT`, defaulting to `127.0.0.1` and `3001`. It validates configuration before listening. The web proxy currently targets that default API address; keep the defaults for the local setup. No `.env` loading or deployment configuration is implied yet.

## Dependencies for the next slice

With Docker and Compose v2 installed:

```sh
pnpm infra:up
pnpm infra:down
```

Compose defines application PostgreSQL on localhost:5432 and Temporal on localhost:7233, with its UI on localhost:8233. Named volumes preserve their data when stopped. `infra:down` retains those volumes. The PostgreSQL database/user are `offscreen`; the checked-in password `local-development-only` is only for this loopback-bound development service. Neither application consumes these services yet.

Temporal uses its [development server](https://docs.temporal.io/cli/command-reference/server) with a persistent SQLite file in a separate volume. The volume mounts its existing home directory so the image's non-root user can write the file. This is local infrastructure, not a production deployment. CI starts both containers and waits for their health checks; persisted workflow recovery must be tested with the first actual workflow. Docker is not installed on the current Windows development machine, so local container execution has not been verified there.

Use host application processes and Compose dependencies first. Kubernetes comes after a working containerized story slice, when a deployment can demonstrate something useful. The production images and cluster manifests will be built against those actual processes.

## Checks and boundaries

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
python scripts/check_docs.py
```

The API test compiles with TypeScript's decorator metadata, boots Nest against an ephemeral HTTP port, checks routing and closes the app. Configuration tests reject invalid ports without exposing their values. This uses Node's test runner so the first test also exercises the same emitted JavaScript as production startup. A pure-policy runner can be added when there are policies to test.

The health route indicates process liveness only. Database readiness, auth, SSE delivery and durable recovery are not implemented or tested by this route. Build success is not a gameplay test.

`packages/config` currently exports only shared compiler settings. API configuration stays with its consumer. Workspace imports must use package names/exports, not reach across directories into another package. Add runtime contracts and deterministic workflow packages as the corresponding component is implemented and tested.

## PostgreSQL component

`@offscreen/db` owns a process-local `pg` pool and exposes Drizzle as `database.db`. It has no dependency on Nest, Next, Temporal or game policy. Consumers create one instance per process, supply a synchronous background-error handler and call `close()` during shutdown. Importing the package opens no connections. `checkConnection()` performs a real query; it does not check schema compatibility.

`readDatabaseConfig(process.env)` requires an explicit `DATABASE_URL` pointing to a named PostgreSQL database. It does not load `.env` or fall back to a developer's database. Configuration errors report field names rather than supplied values. Optional positive integer settings are `DB_POOL_MAX` (default 5, maximum 100), `DB_CONNECT_TIMEOUT_MS` (5000, maximum 60000), `DB_STATEMENT_TIMEOUT_MS` and `DB_IDLE_TRANSACTION_TIMEOUT_MS` (both 10000, maximum 300000). Idle pool connections expire after 30 seconds. These are per-process limits; replicas multiply the total. Deployment TLS/CA settings must match the chosen database service; the package does not disable certificate verification.

Use `database.db.transaction(async (tx) => { ... })` for atomic operations and issue every participating query through `tx`. Do not make network/LLM calls while holding a transaction. There is no automatic transaction retry: the application operation must decide whether retry is safe. Close drains checked-out connections; callers must finish their operations, and process-level shutdown deadlines remain a deployment responsibility. Background error handlers must avoid logging credentials, raw SQL or sensitive error details.

`@offscreen/db/migrate` exports `applyMigrations(config, folder)` for a Drizzle migration directory. It opens its own connection, takes a database-scoped advisory lock and invokes Drizzle's migrator. A competing runner fails promptly with a retry message. Closing the connection releases the lock even after SQL failure. Run migrations as a separate deployment operation, never implicitly on API startup. The runtime database account should eventually have narrower permissions than the migration account.

No application tables or production migration files are defined yet. Generate the auth library's actual schema during identity integration, review its SQL, and add its migration directory and CLI then. SQL under `packages/db/test/fixtures` is a disposable test fixture, not a proposed product model. Applied migration files must remain immutable; add a new migration instead of editing an applied one. The wrapper does not add checksum-drift detection beyond Drizzle's migration bookkeeping.

Run database tests against a dedicated database named **offscreen_db_test**, separate from `offscreen`. With Compose running, create it once:

```sh
docker compose exec postgres createdb -U offscreen offscreen_db_test
```

In PowerShell:

```powershell
$env:DATABASE_TEST_URL = 'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_db_test'
pnpm test:db
```

On macOS/Linux, prefix `pnpm test:db` with `DATABASE_TEST_URL='postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_db_test'`. The command refuses a missing URL or a different database name. It creates/removes fixture tables and the Drizzle migration journal, so this database must be disposable and runs must not share it concurrently. CI provisions a fresh PostgreSQL service for this job. Integration tests run without Turbo caching; ordinary `pnpm test` remains usable without PostgreSQL.

The suite checks migration reruns and contention, failed-DDL rollback, transaction rollback on a constraint error, statement cancellation, pool exhaustion/recovery, idle-connection failure/reconnection and repeatable shutdown. It does not yet prove OAuth persistence, story isolation or workflow recovery.

Next: integrate identity/sessions and their reviewed schema, then build the smallest persisted story flow. Decisions listed in [open questions](questions.md) remain open until the affected behavior needs them.
