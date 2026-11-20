# Local integration tests

Provider-free fixture and integration checks. These commands do not enable live inference. They may create, drop, or recreate only a named disposable database: `offscreen_db_test` or `offscreen_auth_test`. They must not reset `offscreen`, `offscreen_story_local`, `offscreen_chamber`, or a remote database.

Ordinary startup and frontend checks stay on [Local development](local-development.md). A provider-free Chamber demo is [Provider-free Chamber](local-storyteller-rehearsal.md#provider-free-chamber). Live model commands are [Explicitly authorized paid rehearsal](local-storyteller-rehearsal.md#explicitly-authorized-paid-rehearsal). Do not open that heading for a database test.

**Explore by question:** [disposable database checks](#disposable-database-checks) · [PostgreSQL component](#postgresql-component) · [identity checks](#identity-checks) · [Storyteller integration suite](#storyteller-integration-suite).

## What these commands touch

| Command | What it touches | Provider |
| --- | --- | --- |
| `pnpm db:reset:test` | Drops and recreates only local `offscreen_auth_test`, then migrates it. The script takes no database URL | No. The child path is the database package migrate |
| `pnpm test:focus` | Rebuilds, strips provider credentials and live opt-in, then recreates only `offscreen_auth_test` | No |
| `pnpm test:db` | `DATABASE_TEST_URL` must name `offscreen_db_test`. Creates and removes fixture tables | No |
| `pnpm test:auth`, `pnpm test:stories`, and the `@offscreen/api-integration` story suites | Disposable `offscreen_auth_test`, ports 3001 and 3100, local Temporal | No paid calls. Tests do not complete a real GitHub token exchange |
| `pnpm db:baseline` | Replaces generated files under `packages/db/migrations` when exactly one SQL migration exists. Refuses when more than one exists | No database connection |
| A live model command, or any reset of `offscreen` or a remote database | Not a command on this page | Stop |

`pnpm test:focus -- --help` lists the suites and states that the command recreates only `offscreen_auth_test`. This page records that help text from a local run. It does not record a suite pass.

## Disposable database checks

`pnpm db:reset:test` and `pnpm test:focus` are opt-in. They do not replace source review, commit, or push, and they are not the quick React test.

```sh
pnpm db:reset:test
pnpm test:focus -- storyteller "fake provider accounting"
```

The focused test command accepts the suites listed by `pnpm test:focus -- --help`, rebuilds before using compiled output, removes provider credentials/live opt-in from the child environment and recreates only `offscreen_auth_test`. Inspected in `scripts/repo-tools/reset-test-db.mjs`: `pnpm db:reset:test` drops and recreates only `offscreen_auth_test` on the loopback PostgreSQL service published by `pnpm stack:up`, then migrates that database. It does not accept a database URL. `scripts/repo-tools/focused-integration.mjs` calls that same reset after removing `OPENROUTER_API_KEY` and `STORYTELLER_EXECUTION_JSON` and setting `STORYTELLER_LIVE_ENABLED` to false. These checks were not re-run for this page, apart from `pnpm test:focus -- --help`.

## PostgreSQL component

`@offscreen/db` owns a process-local `pg` pool and exposes Drizzle as `database.db`. It has no dependency on Nest, Next, Temporal or game policy. Consumers create one instance per process, supply a synchronous background-error handler and call `close()` during shutdown. Importing the package opens no connections. `checkConnection()` performs a real query; it does not check schema compatibility.

`readDatabaseConfig(process.env)` requires an explicit `DATABASE_URL` pointing to a named PostgreSQL database. It does not load `.env` or fall back to a developer's database. Configuration errors report field names rather than supplied values. Optional positive integer settings are `DB_POOL_MAX` (default 5, maximum 100), `DB_CONNECT_TIMEOUT_MS` (5000, maximum 60000), `DB_STATEMENT_TIMEOUT_MS` and `DB_IDLE_TRANSACTION_TIMEOUT_MS` (both 10000, maximum 300000). Idle pool connections expire after 30 seconds. These are per-process limits; replicas multiply the total. Deployment TLS/CA settings must match the chosen database service; the package does not disable certificate verification.

Use `database.db.transaction(async (tx) => { ... })` for atomic operations and issue every participating query through `tx`. Do not make network/LLM calls while holding a transaction. There is no automatic transaction retry: the application operation must decide whether retry is safe. Close drains checked-out connections; callers must finish their operations, and process-level shutdown deadlines remain a deployment responsibility. Background error handlers must avoid logging credentials, raw SQL or sensitive error details.

`@offscreen/db/migrate` exports `applyMigrations(config, folder)` for a Drizzle migration directory. It opens its own connection, takes a database-scoped advisory lock and invokes Drizzle's migrator. A competing runner fails promptly with a retry message. Closing the connection releases the lock even after SQL failure. Run migrations as a separate deployment operation, never implicitly on API startup. The runtime database account should eventually have narrower permissions than the migration account.

The single pre-POC baseline migration creates the complete current schema, including Better Auth's user, account, session, verification and rate-limit tables. The generated auth schema was reviewed and includes an added unique constraint on `(provider_id, account_id)` to prevent a provider identity belonging to multiple records. `pnpm --filter @offscreen/api schema:generate` generates from the offline auth configuration: review the output and preserve that additional constraint before regenerating the baseline with `pnpm --filter @offscreen/db generate`. `pnpm db:migrate` uses the separate locked migration runner. While no database contains data worth preserving, replace this baseline and reset disposable databases after schema changes; do not accumulate migration history. Once the owner declares data durable, applied migrations become immutable and subsequent changes use additive files. The wrapper does not add checksum-drift detection beyond Drizzle's bookkeeping. SQL under `packages/db/test/fixtures` remains a disposable test fixture.

`pnpm db:baseline` is the repository wrapper for that regeneration. Inspected in `scripts/repo-tools/baseline.mjs`: it refuses when `packages/db/migrations` contains more than one SQL migration, and when it proceeds it replaces that directory's generated files. It does not open PostgreSQL and it does not reset a database. This page did not run it. It is not an ordinary startup command and it is not a restore rehearsal.

Run database tests against a dedicated database named **offscreen_db_test**, separate from `offscreen`. With `pnpm stack:up` running and PostgreSQL reachable on loopback, create it once:

```sh
psql "postgresql://offscreen:local-development-only@127.0.0.1:5432/postgres" -c "CREATE DATABASE offscreen_db_test"
```

In PowerShell:

```powershell
$env:DATABASE_TEST_URL = 'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_db_test'
pnpm test:db
```

On macOS/Linux, prefix `pnpm test:db` with `DATABASE_TEST_URL='postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_db_test'`. The command refuses a missing URL or a different database name. It creates/removes fixture tables and the Drizzle migration journal, so this database must be disposable and runs must not share it concurrently. CI provisions a fresh PostgreSQL service for this job. Integration tests run without Turbo caching; ordinary `pnpm test` remains usable without PostgreSQL.

The suite checks migration reruns and contention, failed-DDL rollback, transaction rollback on a constraint error, statement cancellation, pool exhaustion/recovery, idle-connection failure/reconnection and repeatable shutdown. It does not yet prove OAuth persistence, story isolation or workflow recovery.

## Identity checks

The same PostgreSQL suite exercises generation records through server application operations with a fake generator: duplicate admission, immutable input capture, competing claims, restart/retry behavior, uncertain and late outcomes, stale previews, ownership and transactional rollback. It also uses a separate test task schema to check that the common lifecycle has no dependency on opening fields. Migration `0002_generation_records` adds `generation` and `draft_opening`. The scripted HTTP path is tested for ownership, CSRF, recovery after admission, private-data exclusion and stale results. Chromium generates, reloads and checks a preview after editing the draft. Temporal integration checks admission while the worker is offline, exclusive/expired outbox leases, stale acknowledgements and delivery after restarting the worker. No paid calls occur.

The suite needs Chromium. `pnpm --filter @offscreen/api exec playwright install chromium` is inspection-needed, not a checked command: `apps/api/package.json` does not depend on Playwright. Playwright is a dependency of `@offscreen/api-integration`, and `.github/workflows/code.yml` runs `pnpm --filter @offscreen/api-integration exec playwright install --with-deps chromium`. This page did not run that install. In addition to identity checks, the suite exercises draft ownership, validation, CSRF, concurrent saves, retry recovery and pagination against PostgreSQL. Chromium checks saving and reopening through the actual editor and preserving conflicting text in two tabs. Migration `0001_story_drafts` adds the owned draft table. Generation tests use a fake callback and make no provider calls.

`pnpm test:auth` builds and runs the combined application integration entry (`auth` then `stories`) against disposable `offscreen_auth_test`, configured through `DATABASE_TEST_URL`. Create it with `pnpm db:reset:test`, or with `psql "postgresql://offscreen:local-development-only@127.0.0.1:5432/postgres" -c "CREATE DATABASE offscreen_auth_test"`, then use the same connection pattern as above with that name. Keep the lab Temporal service reachable on loopback while the worker processes run. Stop local application processes first: both suites start the real API on port 3001 and the production Next server on 3100. CI provisions its own database. These suites are not cached. The combined launcher runs those two top-level files sequentially (`--test-concurrency=1`) so they do not contend for the same disposable database or ports. Identity/drafts/openings live in `auth.integration.ts`; story coverage is a separate suite (`pnpm test:stories`, or `pnpm --filter @offscreen/api-integration test:auth` for identity alone). Focused story concerns are also runnable through `@offscreen/api-integration` with `test:stories:core`, `test:stories:http` or `test:stories:browser` (each boots its own stack). The integration workspace owns worker/browser dependencies so the deployable API does not. Do not run auth and story suites concurrently on the same ports.

Test-only library helpers seed sessions; no test login routes, passwords or identity bypasses exist in the application. Tests exercise migrations, proxy/cookie forwarding, anonymous redirects, private rendering, OAuth initiation, external redirect rejection, invalid callback state, logout/revocation and expiry. They do not complete a real GitHub token exchange. A live OAuth app and a manual browser sign-in are still required to verify that external integration.

Sessions live in PostgreSQL for seven days and are eligible for renewal after one day. Cookie caching is disabled so revoked sessions stop authorizing immediately. OAuth tokens are encrypted by Better Auth. Automatic account linking is disabled. Auth routes use the library's Node handler before Nest's JSON parser; the API is ESM as required by that integration.

Auth rate limits use the database. A server-written client-IP header prevents callers supplying their own rate-limit key; behind the current local Next proxy, requests share the proxy's address. Before public hosting, configure trusted ingress/client-IP forwarding, request size/time limits and an operational log destination. Library error logging remains disabled to avoid leaking credentials. API/worker lifecycle incidents use stable JSON events with curated error classification; retryable outbox failures also carry notice, operation and topic correlation. Arbitrary exception messages, SQL, provider payloads and player prose are deliberately excluded. Invitations, SSE authorization and story membership are not implemented by this identity slice.

Use [implementation overview](../../STATUS.md) for the next slice rather than inferring priority from this setup guide. Decisions listed in [open questions](../../work/designs/open/product-open-questions.md) remain open until the affected behavior needs them.

## Storyteller integration suite

After a fresh affected build, `pnpm --filter @offscreen/api-integration test:storyteller` runs the twelve Storyteller behavior families **serially in separate sessions** (`--test-concurrency=1`) against `DATABASE_TEST_URL` targeting `offscreen_auth_test`. Families do not share one long-lived worker. `test:storyteller:profiled` is the legacy shared-session diagnostic only. Run these sequentially with other integration suites because they share ports 3001/3100. Storyteller package tests inject fake HTTP transports; the integration suite uses local scripted/fake providers. No saved provider credentials are read. Production live flags and execution policy are documented in [runtime](../technical/storyteller/operation-and-controller.md); their presence does not supersede the spending rule.

The interactive offline rehearsal that uses `pnpm --filter @offscreen/chamber start` is [Profiled storyteller rehearsal](local-storyteller-rehearsal.md#profiled-storyteller-rehearsal). That rehearsal is not this suite, and neither one is a paid model call.
