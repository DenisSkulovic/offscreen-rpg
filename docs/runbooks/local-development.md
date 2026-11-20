# Local development

This page is the safe local boot route: install, loopback dependencies, `pnpm dev`, and ordinary checks. Disposable-database resets and live model commands are on other pages. An ordinary no-spend check stays here.

**Explore by question:** [requirements and startup](#requirements-and-startup) · [fast frontend workflow](#fast-frontend-workflow) · [dependencies](#local-dependencies) · [checks and boundaries](#checks-and-boundaries). Provider-free database and identity checks are [Local integration tests](local-integration-tests.md). A provider-free Chamber demo is [Provider-free Chamber](local-storyteller-rehearsal.md#provider-free-chamber). The paid rehearsal is [Explicitly authorized paid rehearsal](local-storyteller-rehearsal.md#explicitly-authorized-paid-rehearsal); leave that heading closed during an ordinary no-spend check.

## What a command touches

| Job | What it touches | Where |
| --- | --- | --- |
| Safe initial boot | Host processes and the local kind lab cluster. No model credentials | [Requirements and startup](#requirements-and-startup) |
| Frontend only | Next or Vitest on the host. Docker is not required | [Fast frontend workflow](#fast-frontend-workflow) |
| Ordinary no-spend checks | Format, lint, typecheck, `pnpm test`, and build. Live inference stays disabled | [Checks and boundaries](#checks-and-boundaries) |
| Provider-free integration | Recreates only `offscreen_db_test` or `offscreen_auth_test` | [Local integration tests](local-integration-tests.md) |
| Provider-free Chamber demo | Local `offscreen_chamber` only. Does not read `.env.openrouter` | [Provider-free Chamber](local-storyteller-rehearsal.md#provider-free-chamber) |
| Explicitly authorized paid rehearsal | OpenRouter credentials and `offscreen_story_local` | [Paid rehearsal](local-storyteller-rehearsal.md#explicitly-authorized-paid-rehearsal) |
| Live model, remote database, or a reset of `offscreen` | No command on this page grants that | Stop. Startup is not that permission |

The TypeScript workspace runs a Next.js web application, NestJS API, Temporal workers and PostgreSQL, with Better Auth sessions and optional GitHub OAuth. Ordinary Story mode supports persistent creation/opening review, generated choices, timed mechanical commitments and saved consequences. The local Story launcher supplies a loopback development identity; provider execution is a separate explicit configuration and spending decision. Chamber supplies authored rehearsal and inspection through ordinary application operations. `/demo` is a separate browser-only presentation prototype. Keep the worker running when exercising background progression. See [STATUS](../../STATUS.md) for demonstrated coverage. Mechanics, time and memory limits are [chronology](../technical/engine/chronology-and-activities.md) and [selected architecture](../technical/engine/selected-architecture.md). General inventory, combat and shared play remain unfinished.

## Requirements and startup

To inspect just the public story prototype, run `pnpm --filter @offscreen/contracts build` and `pnpm --filter @offscreen/web dev` after installing dependencies, then open http://localhost:3000/demo. This route needs neither PostgreSQL nor OAuth credentials. It uses a local authored script and manually advanced demonstration time; state is not saved. The full application startup below still requires its configured dependencies.

Use Node **24.19.0** (also recorded in `.node-version`) and pnpm **11.19.0**. The system's default Node must match before running package scripts. Install the pinned pnpm with `npm install --global pnpm@11.19.0` if necessary.

Install Docker for the kind lab and start the stack below. Copy `.env.example` to `.env` in the repository root. Generate `BETTER_AUTH_SECRET` using the command in that file; supply your own GitHub OAuth app client ID and secret. Set its homepage to `http://localhost:3000` and callback to `http://localhost:3000/api/auth/callback/github`. Keep `.env` private; it is ignored by Git. Use `localhost` consistently in the browser so the configured origin and cookies agree.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm stack:up
pnpm db:migrate
pnpm dev
```

`pnpm stack:acceptance` is the read-only clean-clone gate. It refuses a foreign kubectl context, a non-loopback API bind, a port held by something other than this cluster, a failed `game-migrate` Job, a missing game Pod, an active Compose boot path, and a green health check that never saw a signed-in player. It does not reset the cluster. `--execute` and `reset` are refused. A fresh workstation timing, a browser play-through, and a Headlamp desktop Pod delete were not run when this command was added.

Open http://localhost:3000. The API listens on `127.0.0.1:3001`; `/api` is proxied through the web server. Entering the application sends anonymous users to sign-in and signed-in users to their saved drafts. By default that sign-in is GitHub OAuth (client ID and secret required; email/password off). With `LOCAL_DEMO_AUTH=1` on a loopback `APP_ORIGIN` (`http://localhost` or `http://127.0.0.1`) and non-production `NODE_ENV`, the sign-in page also offers email/password and the player chooses the password—that flag is not POC open access and is not an anonymous admin path. The web, API and worker watch their own source changes; rebuild shared packages and restart after changing shared package code. Stop the task with Ctrl+C. No model credentials or paid calls are involved.

Status commands from the repository root:

```sh
pnpm repo:brief
pnpm repo:brief --json
pnpm stack:status
```

`pnpm db:baseline`, `pnpm db:reset:test`, and `pnpm test:focus` are not startup. They are [disposable database checks](local-integration-tests.md#disposable-database-checks). `pnpm db:baseline` rewrites migration files; it does not reset PostgreSQL.

API, worker and migration commands read the root `.env`; existing process variables take precedence. The API validates database and auth configuration and checks PostgreSQL before listening. `APP_ORIGIN` must be an exact HTTPS origin or HTTP localhost origin. `API_HOST` and `API_PORT` default to `127.0.0.1` and `3001`. Keep these defaults locally; the web proxy targets that address. `API_INTERNAL_ORIGIN` is an optional server-only Next setting for authenticated page reads and must point to a trusted API. `API_PROXY_ORIGIN` is the optional Node-only Nest origin for Next's same-origin `/api` rewrite (defaults to the same loopback address); do not expose either via `NEXT_PUBLIC_*`. `OFFSCREEN_DOCUMENT_ROOT` enables the local immutable campaign-document store and should identify the same ignored private `data/` directory for every API instance that can serve a campaign. When enabled, `OFFSCREEN_DEFAULT_RULE_SOURCE` selects the checked-in/default rule-package source directory; startup validates and seeds its immutable objects before accepting stories. Without document storage, document operations return unavailable while existing SQL-owned stories continue to work. Deployment ingress/proxy configuration remains separate work.

The worker uses `TEMPORAL_ADDRESS` (default `127.0.0.1:7233`), `TEMPORAL_NAMESPACE` (`default`) and `TEMPORAL_TASK_QUEUE` (`offscreen-local`). Run it separately with `pnpm --filter @offscreen/worker start` after building if not using `pnpm dev`. Requests remain saved while it is stopped. The preview page checks status briefly, then offers reloading; closing it does not cancel work. These plaintext local connection settings are not a hosted deployment configuration.

## Fast frontend workflow

For React/Next portfolio work, use [.agents/skills/frontend-engineering/SKILL.md](../../.agents/skills/frontend-engineering/SKILL.md) and the [client architecture](../technical/client/architecture.md), plus the **one** selected Change. The [2026-11 frontend execution playbook](../../research/legacy-engineering/frontend-execution-playbook.md) is dated evidence, not the current executor. `pnpm dev` starts Tilt against the lab cluster. It is not needed for a pure selector, Query/RHF component, Vitest or Storybook state.

Existing direct commands after dependency setup (use only when relevant):

```bash
pnpm --filter @offscreen/web dev          # One Next dev server if browser rendering is needed
pnpm --filter @offscreen/web typecheck    # Next typegen + incremental tsc, no Next production build
pnpm exec eslint apps/web/src/features/play/view.tsx  # A single touched file
```

`pnpm --filter @offscreen/web test:watch`, `pnpm --filter @offscreen/web test:fast`, and root `pnpm test:fast` are present in package.json. `test:fast` runs the web Vitest suite through Turbo and does not build Next first. A script name is not a fresh test pass; this runbook does not record one. Do not treat those commands as still planned.

Keep pnpm's store and warm `.turbo`, `.next/dev`, `dist` and TypeScript incremental output. Use host-side Next/Node; Docker is required only for the actual PostgreSQL/Temporal integration step. Do not run `pnpm install` absent a changed lockfile/new checkout, or restart a successful dev/test watcher after each edit. Check one normal/negative behavior when its code boundary is complete, then batch expensive checks at architecture integration milestones. `pnpm test:focus` destroys/recreates only disposable `offscreen_auth_test`; it is never the quick React test. Its procedure is [Disposable database checks](local-integration-tests.md#disposable-database-checks).

## Local dependencies

With Docker installed for the kind lab:

```sh
pnpm stack:up
pnpm stack:down
```

Docker Desktop with its WSL 2 backend is the verified Windows path. A previous
startup failure was not a broken WSL installation or container data: stale
Windows AF_UNIX reparse points prevented Docker from renaming
`%LOCALAPPDATA%\Docker\run\sailor-ingest.sock` and
`%LOCALAPPDATA%\docker-secrets-engine\engine.sock`. If the backend reports that
either socket "cannot be accessed by the system," quit every Docker Desktop
process and run `pnpm infra:repair`. The guarded command renames both transient
parent directories in the same stopped state, keeps timestamped recoverable
backups, and restarts Docker Desktop. It recreates them. Do not reinstall Docker or WSL,
reset container data, or clean only one directory first; the first failed
restart creates another socket that becomes stale before the second repair.

`wsl --update` confirms that this workstation's Store WSL is current, and its
kernel, DNS and outbound HTTPS are healthy. Docker Engine may also be installed
directly in `Ubuntu-24.04` as a recovery option. Docker Desktop remains the
normal development runtime for the kind lab.

`pnpm stack:up` installs the lab release on `kind-offscreen-lab`. Loopback port-forwards expose application PostgreSQL on localhost:5432, Temporal on localhost:7233, and optional Redis on localhost:6379 when the release provides them. `stack:down` removes app workloads while keeping cluster data policies described in [deployment and compatibility](../technical/platform/deployment-and-compatibility.md#local-development). The PostgreSQL database/user are `offscreen`; the checked-in password `local-development-only` is only for this loopback-bound development service. The API admits requests in PostgreSQL; the application worker relays their outbox notices and executes scripted preview workflows in Temporal. `REDIS_URL` enables version-addressed public snapshot caching; omitting it keeps the same application behavior without a cache.

Local boot, including `pnpm stack:up` and `pnpm dev`, is not a restore rehearsal. The untested checklist is [Release and restore readiness](release-restore-readiness.md). CI uses a GitHub-hosted Postgres service and does not require a local cluster. Local startup is verified on Windows through Docker Desktop's WSL 2 backend. After installing Docker, reopen terminals so the CLI and credential helper are available on PATH. The scripted opening integration suite exercises saved-request processing and duplicate delivery after worker restart.

Repository launchers also resolve Docker Desktop's standard Windows CLI path directly when their inherited process PATH is stale. CLI discovery uses `docker --version` and does not contact the daemon; a stopped backend, inaccessible named pipe or Docker configuration permission error is therefore reported as that actual runtime failure rather than “Docker CLI was not found.”

Focused integration reset connects to the loopback PostgreSQL service directly through the database package's installed driver. It does not require Docker CLI or named-pipe access once `pnpm stack:up` has published the database port. Infrastructure lifecycle commands are `pnpm stack:preflight`, `pnpm stack:up`, `pnpm stack:status`, `pnpm stack:down`, and `pnpm stack:reset`.

## Game Authority seam

`apps/game-authority` is a separate process for one operation: the owned story snapshot read and one scripted resolution admission. The lab release can run it as a Pod when configured for distributed mode. Leave `GAME_AUTHORITY_MODE` unset on host API processes and the API keeps the embedded in-process writer for that seam. The lab release requires `GAME_AUTHORITY_MODE=distributed`; `GAME_AUTHORITY_MODE=compose` is rejected. Set `GAME_AUTHORITY_MODE=distributed` only together with `GAME_AUTHORITY_ORIGIN` and `GAME_AUTHORITY_SERVICE_TOKEN` on the API, and the same token on the Game Authority process. Nest still checks the browser session, then calls `/internal/v1`. A failed call does not fall back to a second SQL write. The process has no `/api` route, no start route, and no publication route. Do not put it on the public gateway. No model call is part of this seam.

## Checks and boundaries

Checks are optional under the [verification policy](../../.agents/rules/verification.md); choose a focused command when it answers a concrete question. `@offscreen/storyteller/tasks` prepares and validates opening, continuation, consequence and report tasks. Provider-free fixtures and real-provider execution are separate paths. Hosted structured-output and mechanical play have historical live evidence in the [connected proof](../../research/legacy-engineering/connected-poc-proof.md); that does not establish every schema, scenario or recovery path. Ordinary checks must keep live inference disabled.

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
python scripts/check_docs.py
```

The API test compiles with TypeScript's decorator metadata, boots Nest against an ephemeral HTTP port, checks routing and closes the app. Configuration tests reject invalid ports without exposing their values. Game and Storyteller packages also contain pure-policy tests. Inspect the selected script before running it; suites that consume compiled output need fresh affected builds.

`/api/health/live` indicates process liveness; `/api/health/ready` checks PostgreSQL connectivity. Neither verifies schema compatibility, OAuth provider availability or workflow recovery. `/api/me` requires a valid database session and returns only the user's ID, name and email. All API responses use `Cache-Control: no-store`; authenticated draft pages are rendered dynamically with uncached API reads.

`packages/config` exports shared compiler settings. `packages/contracts` contains browser-safe transport validation and types; `packages/application` contains owned use cases, transactions and revision checking, independent of HTTP frameworks. API configuration stays with its consumer. Workspace imports must use package names/exports, not reach across directories into another package. `packages/workflows` owns deterministic Temporal orchestration; worker Activity bindings call application operations.

Disposable database suites are [Local integration tests](local-integration-tests.md). They are not part of the ordinary check list above. `pnpm test` remains usable without PostgreSQL.

## PostgreSQL component

`checkConnection()` performs a real query; it does not check schema compatibility. Run migrations as a separate deployment operation, never implicitly on API startup. Database tests run only against a dedicated disposable database named **offscreen_db_test**, separate from `offscreen`. Those tests create and remove fixture tables, so that database must be disposable and runs must not share it concurrently. Do not reset a non-disposable database. The suite procedure, pool limits, and migration runner are [PostgreSQL component](local-integration-tests.md#postgresql-component).

## Identity checks

Identity and story integration tests make no paid calls. They use disposable `offscreen_auth_test` and do not complete a real GitHub token exchange. The procedure is [Identity checks](local-integration-tests.md#identity-checks). Do not point `DATABASE_TEST_URL` at `offscreen`, `offscreen_story_local`, `offscreen_chamber`, or a remote database.

## Local live Story mode without OAuth

This heading is not an ordinary no-spend check, and it contains no live command. The persistent database is `offscreen_story_local`. An uncertain provider delivery stops further admission. Recovery is a separate procedure in [Uncertain work recovery](uncertain-work-recovery.md); this page does not repeat a provider send. The paid procedure, including the rule that merely launching makes no inference call, is [Explicitly authorized paid rehearsal](local-storyteller-rehearsal.md#explicitly-authorized-paid-rehearsal). Normal non-loopback application startup still requires real authentication.

## Headless play and agent operation

Headless play is part of the paid local Story path. Read-only commands never dispatch inference, and billable commands fail closed without `--confirm-live`. The procedure is [Headless play and agent operation](local-storyteller-rehearsal.md#headless-play-and-agent-operation). Do not use it as a startup or test step.

## Profiled storyteller rehearsal

This rehearsal is authored and offline. It creates no live funding allowance and does not enable provider execution. Follow [Profiled storyteller rehearsal](local-storyteller-rehearsal.md#profiled-storyteller-rehearsal) after the provider-free Chamber launcher. It is not the paid Story path.

## Mechanical rehearsal

No live key or provider call is needed. The steps are [Mechanical rehearsal](local-storyteller-rehearsal.md#mechanical-rehearsal).
