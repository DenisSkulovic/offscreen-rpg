# Local development

The foundation contains a TypeScript workspace, Next.js web application, NestJS API, PostgreSQL persistence and Better Auth identity/session handling. GitHub is the first OAuth provider. Signed-in users can create, save and reopen private story drafts. Opening preparation and generation-record operations are tested backend components; generation UI, shared setup, workflow workers and playable stories are not implemented yet. See [implementation overview](progress.md) for coverage and current priorities. Paid services remain disconnected during broader application development.

## Requirements and startup

Use Node **24.19.0** (also recorded in `.node-version`) and pnpm **11.19.0**. The system's default Node must match before running package scripts. Install the pinned pnpm with `npm install --global pnpm@11.19.0` if necessary.

Install Docker with Compose v2 and start the dependencies below. Copy `.env.example` to `.env` in the repository root. Generate `BETTER_AUTH_SECRET` using the command in that file; supply your own GitHub OAuth app client ID and secret. Set its homepage to `http://localhost:3000` and callback to `http://localhost:3000/api/auth/callback/github`. Keep `.env` private; it is ignored by Git. Use `localhost` consistently in the browser so the configured origin and cookies agree.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm infra:up
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. The API listens on `127.0.0.1:3001`; `/api` is proxied through the web server. Entering the application sends anonymous users to GitHub sign-in and signed-in users to their saved drafts. Both applications watch their own source changes; rebuild shared packages and restart after changing shared package code. Stop the task with Ctrl+C. No model credentials or paid calls are involved.

API and migration commands read the root `.env`; existing process variables take precedence. The API validates database and auth configuration and checks PostgreSQL before listening. `APP_ORIGIN` must be an exact HTTPS origin or HTTP localhost origin. `API_HOST` and `API_PORT` default to `127.0.0.1` and `3001`. Keep these defaults locally; the web proxy targets that address. `API_INTERNAL_ORIGIN` is an optional server-only Next setting for authenticated page reads and must point to a trusted API. Deployment ingress/proxy configuration remains separate work.

## Local dependencies

With Docker and Compose v2 installed:

```sh
pnpm infra:up
pnpm infra:down
```

Compose defines application PostgreSQL on localhost:5432 and Temporal on localhost:7233, with its UI on localhost:8233. Named volumes preserve their data when stopped. `infra:down` retains those volumes. The PostgreSQL database/user are `offscreen`; the checked-in password `local-development-only` is only for this loopback-bound development service. The API uses PostgreSQL; Temporal has no application worker yet.

Temporal uses its [development server](https://docs.temporal.io/cli/command-reference/server) with a persistent SQLite file in a separate volume. The volume mounts its existing home directory so the image's non-root user can write the file. This is local infrastructure, not a production deployment. CI starts both containers and waits for their health checks; persisted workflow recovery must be tested with the first actual workflow. Docker is not installed on the current Windows development machine, so local container execution has not been verified there.

Use host application processes and Compose dependencies first. Kubernetes comes after a working containerized story slice, when a deployment can demonstrate something useful. The production images and cluster manifests will be built against those actual processes.

## Checks and boundaries

`@offscreen/ai/opening` is an offline component for preparing a saved premise and validating opening prose. Its tests run under `pnpm test` without credentials: they check snapshot isolation, separation of user input from application instructions, source metadata exclusion, and rejection of malformed or authority-bearing model output. The exported JSON Schema is not yet verified against a hosted provider. No Generate button or provider adapter is wired into the application.

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
python scripts/check_docs.py
```

The API test compiles with TypeScript's decorator metadata, boots Nest against an ephemeral HTTP port, checks routing and closes the app. Configuration tests reject invalid ports without exposing their values. This uses Node's test runner so the first test also exercises the same emitted JavaScript as production startup. A pure-policy runner can be added when there are policies to test.

`/api/health/live` indicates process liveness; `/api/health/ready` checks PostgreSQL connectivity. Neither verifies schema compatibility, OAuth provider availability or workflow recovery. `/api/me` requires a valid database session and returns only the user's ID, name and email. All API responses use `Cache-Control: no-store`; authenticated draft pages are rendered dynamically with uncached API reads.

`packages/config` exports shared compiler settings. `packages/contracts` contains browser-safe draft validation and types; `packages/server` contains owned draft operations and revision checking, independent of HTTP frameworks. API configuration stays with its consumer. Workspace imports must use package names/exports, not reach across directories into another package. Add deterministic workflow packages when the first workflow is implemented.

## PostgreSQL component

`@offscreen/db` owns a process-local `pg` pool and exposes Drizzle as `database.db`. It has no dependency on Nest, Next, Temporal or game policy. Consumers create one instance per process, supply a synchronous background-error handler and call `close()` during shutdown. Importing the package opens no connections. `checkConnection()` performs a real query; it does not check schema compatibility.

`readDatabaseConfig(process.env)` requires an explicit `DATABASE_URL` pointing to a named PostgreSQL database. It does not load `.env` or fall back to a developer's database. Configuration errors report field names rather than supplied values. Optional positive integer settings are `DB_POOL_MAX` (default 5, maximum 100), `DB_CONNECT_TIMEOUT_MS` (5000, maximum 60000), `DB_STATEMENT_TIMEOUT_MS` and `DB_IDLE_TRANSACTION_TIMEOUT_MS` (both 10000, maximum 300000). Idle pool connections expire after 30 seconds. These are per-process limits; replicas multiply the total. Deployment TLS/CA settings must match the chosen database service; the package does not disable certificate verification.

Use `database.db.transaction(async (tx) => { ... })` for atomic operations and issue every participating query through `tx`. Do not make network/LLM calls while holding a transaction. There is no automatic transaction retry: the application operation must decide whether retry is safe. Close drains checked-out connections; callers must finish their operations, and process-level shutdown deadlines remain a deployment responsibility. Background error handlers must avoid logging credentials, raw SQL or sensitive error details.

`@offscreen/db/migrate` exports `applyMigrations(config, folder)` for a Drizzle migration directory. It opens its own connection, takes a database-scoped advisory lock and invokes Drizzle's migrator. A competing runner fails promptly with a retry message. Closing the connection releases the lock even after SQL failure. Run migrations as a separate deployment operation, never implicitly on API startup. The runtime database account should eventually have narrower permissions than the migration account.

The first application migration creates Better Auth's five tables: user, account, session, verification and rate_limit. The generated schema was reviewed and includes an added unique constraint on `(provider_id, account_id)` to prevent a provider identity belonging to multiple records. `pnpm --filter @offscreen/api schema:generate` generates from the offline auth configuration: review the output and preserve that additional constraint before generating SQL with `pnpm --filter @offscreen/db generate --name <description>`. `pnpm db:migrate` uses the separate locked migration runner. Applied migration files must remain immutable. The wrapper does not add checksum-drift detection beyond Drizzle's bookkeeping. SQL under `packages/db/test/fixtures` remains a disposable test fixture.

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

## Identity checks

The same PostgreSQL suite exercises generation records through server application operations with a fake generator: duplicate admission, immutable input capture, competing claims, restart/retry behavior, uncertain and late outcomes, stale previews, ownership and transactional rollback. It also uses a separate test task schema to check that the common lifecycle has no dependency on opening fields. Migration `0002_generation_records` adds `generation` and `draft_opening`. These operations have no public endpoint or background dispatcher yet; no paid calls occur.

Install the browser used by this suite with `pnpm --filter @offscreen/api exec playwright install chromium` (Linux CI also uses `--with-deps`). In addition to identity checks, the suite exercises draft ownership, validation, CSRF, concurrent saves, retry recovery and pagination against PostgreSQL. Chromium checks saving and reopening through the actual editor and preserving conflicting text in two tabs. Migration `0001_story_drafts` adds the owned draft table. Generation tests use a fake callback and make no provider calls.

`pnpm test:auth` uses a separate disposable database named `offscreen_auth_test`, configured through `DATABASE_TEST_URL`. Create it with `docker compose exec postgres createdb -U offscreen offscreen_auth_test`, then use the same connection pattern as above with that name. Stop local application processes first: the suite starts the real API on port 3001 and the production Next server on 3100. CI provisions its own database. This suite is not cached.

Test-only library helpers seed sessions; no test login routes, passwords or identity bypasses exist in the application. Tests exercise migrations, proxy/cookie forwarding, anonymous redirects, private rendering, OAuth initiation, external redirect rejection, invalid callback state, logout/revocation and expiry. They do not complete a real GitHub token exchange. A live OAuth app and a manual browser sign-in are still required to verify that external integration.

Sessions live in PostgreSQL for seven days and are eligible for renewal after one day. Cookie caching is disabled so revoked sessions stop authorizing immediately. OAuth tokens are encrypted by Better Auth. Automatic account linking is disabled. Auth routes use the library's Node handler before Nest's JSON parser; the API is ESM as required by that integration.

Auth rate limits use the database. A server-written client-IP header prevents callers supplying their own rate-limit key; behind the current local Next proxy, requests share the proxy's address. Before public hosting, configure trusted ingress/client-IP forwarding, request size/time limits and operational error reporting. Library error logging is disabled to avoid leaking credentials; current process logs are deliberately minimal. Invitations, SSE authorization and story membership are not implemented by this identity slice.

Use [implementation overview](progress.md) for the next slice rather than inferring priority from this setup guide. Decisions listed in [open questions](questions.md) remain open until the affected behavior needs them.
