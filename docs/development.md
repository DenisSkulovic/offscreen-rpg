# Local development

The foundation contains a TypeScript workspace, Next.js web application, NestJS API, PostgreSQL persistence and Better Auth identity/session handling. GitHub is the first OAuth provider. Signed-in users can create, save and reopen private story drafts, then request and reopen a deterministic playable opening candidate. A Temporal worker completes the scripted previews in the background. The signed-in `/chamber` page is a local scenario laboratory: developers pick an authored fixture by name and purpose, play it through ordinary story persistence, and inspect committed story/timing/item/history state in a read-only panel. A saved draft can also request a playable opening candidate and start it as a live first scene at `/play/:id`. Selecting a generated choice admits an asynchronous scripted continuation; the fake storyteller remains provider-free. A generated intention may resolve into a short scripted real wait whose arrival is committed by the same interval machinery as the chamber; `/play/:id` shows the persisted deadline, Pause/Resume when controllable, and does not restart the wait on reload. The default timed cafe fixture saves a 20-second wait and the worker publishes arrival even with the page closed. Journey pause/resume preserves the saved remaining duration across browser closure and worker restart. Select the timed gate reply to test a 15-second response window with a declared automatic departure. It holds fiction but cannot be paused. The letter fixture lets you deliver or keep one tracked item and reopen its saved holder. Pace controls, general inventory and shared setup remain unimplemented. Keep the worker running for the visit; without it, the waiting scene remains pending. See [implementation overview](progress.md) for coverage and current priorities. Paid services remain disconnected during broader application development.

## Requirements and startup

To inspect just the public story prototype, run `pnpm --filter @offscreen/contracts build` and `pnpm --filter @offscreen/web dev` after installing dependencies, then open http://localhost:3000/demo. This route needs neither PostgreSQL nor OAuth credentials. It uses a local authored script and manually advanced demonstration time; state is not saved. The full application startup below still requires its configured dependencies.

Use Node **24.19.0** (also recorded in `.node-version`) and pnpm **11.19.0**. The system's default Node must match before running package scripts. Install the pinned pnpm with `npm install --global pnpm@11.19.0` if necessary.

Install Docker with Compose v2 and start the dependencies below. Copy `.env.example` to `.env` in the repository root. Generate `BETTER_AUTH_SECRET` using the command in that file; supply your own GitHub OAuth app client ID and secret. Set its homepage to `http://localhost:3000` and callback to `http://localhost:3000/api/auth/callback/github`. Keep `.env` private; it is ignored by Git. Use `localhost` consistently in the browser so the configured origin and cookies agree.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm infra:up
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. The API listens on `127.0.0.1:3001`; `/api` is proxied through the web server. Entering the application sends anonymous users to GitHub sign-in and signed-in users to their saved drafts. The web, API and worker watch their own source changes; rebuild shared packages and restart after changing shared package code. Stop the task with Ctrl+C. No model credentials or paid calls are involved.

Repository-local maintenance shortcuts keep repeated Windows and disposable-database steps consistent:

```sh
pnpm repo:brief
pnpm infra -- ps
pnpm db:baseline
pnpm db:reset:test
pnpm test:focus -- storyteller "fake provider accounting"
```

The focused test command accepts the suites listed by `pnpm test:focus -- --help`, rebuilds before using compiled output, removes provider credentials/live opt-in from the child environment and recreates only `offscreen_auth_test`. These are opt-in maintenance/check commands; they do not replace source review, commit or push.

API, worker and migration commands read the root `.env`; existing process variables take precedence. The API validates database and auth configuration and checks PostgreSQL before listening. `APP_ORIGIN` must be an exact HTTPS origin or HTTP localhost origin. `API_HOST` and `API_PORT` default to `127.0.0.1` and `3001`. Keep these defaults locally; the web proxy targets that address. `API_INTERNAL_ORIGIN` is an optional server-only Next setting for authenticated page reads and must point to a trusted API. `OFFSCREEN_DOCUMENT_ROOT` enables the local immutable campaign-document store and should identify the same ignored private `data/` directory for every API instance that can serve a campaign. When enabled, `OFFSCREEN_DEFAULT_RULE_SOURCE` selects the checked-in/default rule-package source directory; startup validates and seeds its immutable objects before accepting stories. Without document storage, document operations return unavailable while existing SQL-owned stories continue to work. Deployment ingress/proxy configuration remains separate work.

The worker uses `TEMPORAL_ADDRESS` (default `127.0.0.1:7233`), `TEMPORAL_NAMESPACE` (`default`) and `TEMPORAL_TASK_QUEUE` (`offscreen-local`). Run it separately with `pnpm --filter @offscreen/worker start` after building if not using `pnpm dev`. Requests remain saved while it is stopped. The preview page checks status briefly, then offers reloading; closing it does not cancel work. These plaintext local connection settings are not a hosted deployment configuration.

## Local dependencies

With Docker and Compose v2 installed:

```sh
pnpm infra:up
pnpm infra:down
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
kernel, DNS and outbound HTTPS are healthy. Docker Engine and Compose are also
installed directly in `Ubuntu-24.04` as a recovery option, but do not run both
engines' project stacks simultaneously because they publish the same loopback
ports. Docker Desktop remains the normal development runtime.

Compose defines application PostgreSQL on localhost:5432, Temporal on localhost:7233 with its UI on localhost:8233, and optional Redis on localhost:6379. Named volumes preserve PostgreSQL and Temporal data when stopped; Redis is deliberately disposable and has persistence disabled. `infra:down` retains the named volumes. The PostgreSQL database/user are `offscreen`; the checked-in password `local-development-only` is only for this loopback-bound development service. The API admits requests in PostgreSQL; the application worker relays their outbox notices and executes scripted preview workflows in Temporal. `REDIS_URL` enables version-addressed public snapshot caching; omitting it keeps the same application behavior without a cache.

Temporal uses its [development server](https://docs.temporal.io/cli/command-reference/server) with a persistent SQLite file in a separate volume. The volume mounts its existing home directory so the image's non-root user can write the file. This is local infrastructure, not a production deployment. CI starts both containers and waits for their health checks. Local startup is verified on Windows through Docker Desktop's WSL 2 backend. After installing Docker, reopen terminals so the CLI and credential helper are available on PATH. The scripted opening integration suite exercises saved-request processing and duplicate delivery after worker restart.

Repository launchers also resolve Docker Desktop's standard Windows CLI path directly when their inherited process PATH is stale. CLI discovery uses `docker --version` and does not contact the daemon; a stopped backend, inaccessible named pipe or Docker configuration permission error is therefore reported as that actual runtime failure rather than “Docker CLI was not found.”

Focused integration reset connects to the loopback PostgreSQL service directly through the database package's installed driver. It does not require Docker CLI or named-pipe access once the Compose services are running. Infrastructure lifecycle commands still use Docker Compose.

Use host application processes and Compose dependencies first. Kubernetes comes after a working containerized story slice, when a deployment can demonstrate something useful. The production images and cluster manifests will be built against those actual processes.

## Checks and boundaries

`@offscreen/storyteller/tasks` prepares a saved premise into a playable-opening request and validates a scene/choice proposal. Its tests run under `pnpm test` without credentials. The opening prose helper remains in the same task capability for snapshot isolation and request-shape checks. The exported JSON Schema is not yet verified against a hosted provider. The preview and generated-continuation paths use fixed local fixtures exposed by `@offscreen/application/generations`, with no provider adapter.

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

`packages/config` exports shared compiler settings. `packages/contracts` contains browser-safe draft validation and types; `packages/application` contains owned use cases, transactions and revision checking, independent of HTTP frameworks. API configuration stays with its consumer. Workspace imports must use package names/exports, not reach across directories into another package. Add deterministic workflow packages when the first workflow is implemented.

## PostgreSQL component

`@offscreen/db` owns a process-local `pg` pool and exposes Drizzle as `database.db`. It has no dependency on Nest, Next, Temporal or game policy. Consumers create one instance per process, supply a synchronous background-error handler and call `close()` during shutdown. Importing the package opens no connections. `checkConnection()` performs a real query; it does not check schema compatibility.

`readDatabaseConfig(process.env)` requires an explicit `DATABASE_URL` pointing to a named PostgreSQL database. It does not load `.env` or fall back to a developer's database. Configuration errors report field names rather than supplied values. Optional positive integer settings are `DB_POOL_MAX` (default 5, maximum 100), `DB_CONNECT_TIMEOUT_MS` (5000, maximum 60000), `DB_STATEMENT_TIMEOUT_MS` and `DB_IDLE_TRANSACTION_TIMEOUT_MS` (both 10000, maximum 300000). Idle pool connections expire after 30 seconds. These are per-process limits; replicas multiply the total. Deployment TLS/CA settings must match the chosen database service; the package does not disable certificate verification.

Use `database.db.transaction(async (tx) => { ... })` for atomic operations and issue every participating query through `tx`. Do not make network/LLM calls while holding a transaction. There is no automatic transaction retry: the application operation must decide whether retry is safe. Close drains checked-out connections; callers must finish their operations, and process-level shutdown deadlines remain a deployment responsibility. Background error handlers must avoid logging credentials, raw SQL or sensitive error details.

`@offscreen/db/migrate` exports `applyMigrations(config, folder)` for a Drizzle migration directory. It opens its own connection, takes a database-scoped advisory lock and invokes Drizzle's migrator. A competing runner fails promptly with a retry message. Closing the connection releases the lock even after SQL failure. Run migrations as a separate deployment operation, never implicitly on API startup. The runtime database account should eventually have narrower permissions than the migration account.

The single pre-POC baseline migration creates the complete current schema, including Better Auth's user, account, session, verification and rate-limit tables. The generated auth schema was reviewed and includes an added unique constraint on `(provider_id, account_id)` to prevent a provider identity belonging to multiple records. `pnpm --filter @offscreen/api schema:generate` generates from the offline auth configuration: review the output and preserve that additional constraint before regenerating the baseline with `pnpm --filter @offscreen/db generate`. `pnpm db:migrate` uses the separate locked migration runner. While no database contains data worth preserving, replace this baseline and reset disposable databases after schema changes; do not accumulate migration history. Once the owner declares data durable, applied migrations become immutable and subsequent changes use additive files. The wrapper does not add checksum-drift detection beyond Drizzle's bookkeeping. SQL under `packages/db/test/fixtures` remains a disposable test fixture.

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

The same PostgreSQL suite exercises generation records through server application operations with a fake generator: duplicate admission, immutable input capture, competing claims, restart/retry behavior, uncertain and late outcomes, stale previews, ownership and transactional rollback. It also uses a separate test task schema to check that the common lifecycle has no dependency on opening fields. Migration `0002_generation_records` adds `generation` and `draft_opening`. The scripted HTTP path is tested for ownership, CSRF, recovery after admission, private-data exclusion and stale results. Chromium generates, reloads and checks a preview after editing the draft. Temporal integration checks admission while the worker is offline, exclusive/expired outbox leases, stale acknowledgements and delivery after restarting the worker. No paid calls occur.

Install the browser used by this suite with `pnpm --filter @offscreen/api exec playwright install chromium` (Linux CI also uses `--with-deps`). In addition to identity checks, the suite exercises draft ownership, validation, CSRF, concurrent saves, retry recovery and pagination against PostgreSQL. Chromium checks saving and reopening through the actual editor and preserving conflicting text in two tabs. Migration `0001_story_drafts` adds the owned draft table. Generation tests use a fake callback and make no provider calls.

`pnpm test:auth` builds and runs the combined application integration entry (`auth` then `stories`) against disposable `offscreen_auth_test`, configured through `DATABASE_TEST_URL`. Create it with `docker compose exec postgres createdb -U offscreen offscreen_auth_test`, then use the same connection pattern as above with that name. Keep the Compose Temporal service running. Stop local application processes first: both suites start the real API on port 3001 and the production Next server on 3100. CI provisions its own database. These suites are not cached. The combined launcher runs those two top-level files sequentially (`--test-concurrency=1`) so they do not contend for the same disposable database or ports. Identity/drafts/openings live in `auth.integration.ts`; story coverage is a separate suite (`pnpm test:stories`, or `pnpm --filter @offscreen/api-integration test:auth` for identity alone). Focused story concerns are also runnable through `@offscreen/api-integration` with `test:stories:core`, `test:stories:http` or `test:stories:browser` (each boots its own stack). The integration workspace owns worker/browser dependencies so the deployable API does not. Do not run auth and story suites concurrently on the same ports.

Test-only library helpers seed sessions; no test login routes, passwords or identity bypasses exist in the application. Tests exercise migrations, proxy/cookie forwarding, anonymous redirects, private rendering, OAuth initiation, external redirect rejection, invalid callback state, logout/revocation and expiry. They do not complete a real GitHub token exchange. A live OAuth app and a manual browser sign-in are still required to verify that external integration.

Sessions live in PostgreSQL for seven days and are eligible for renewal after one day. Cookie caching is disabled so revoked sessions stop authorizing immediately. OAuth tokens are encrypted by Better Auth. Automatic account linking is disabled. Auth routes use the library's Node handler before Nest's JSON parser; the API is ESM as required by that integration.

Auth rate limits use the database. A server-written client-IP header prevents callers supplying their own rate-limit key; behind the current local Next proxy, requests share the proxy's address. Before public hosting, configure trusted ingress/client-IP forwarding, request size/time limits and an operational log destination. Library error logging remains disabled to avoid leaking credentials. API/worker lifecycle incidents use stable JSON events with curated error classification; retryable outbox failures also carry notice, operation and topic correlation. Arbitrary exception messages, SQL, provider payloads and player prose are deliberately excluded. Invitations, SSE authorization and story membership are not implemented by this identity slice.

Use [implementation overview](progress.md) for the next slice rather than inferring priority from this setup guide. Decisions listed in [open questions](questions.md) remain open until the affected behavior needs them.

## Local scripted launcher without OAuth

For the ordinary player-facing product surface, run `pnpm story:local`. It uses
the normal `/stories`, creation, preview and play pages with a fixed loopback
identity, a dedicated persistent `offscreen_story_local` database and
`data/story-local-documents`. It does not mount Chamber scenarios, inspectors,
fault controls or QA endpoints. Provider execution remains disabled, so this
first launcher exercises the real Story flow with the scripted Storyteller at
zero model spend. Normal non-loopback application startup still requires real
authentication.

With the Compose services running, dependencies installed and Playwright Chromium available, run `pnpm chamber`. It builds the web/API and opens a separate Chromium window as a local fixture user. No GitHub or model credentials are needed. The Chamber API injects that fixed identity only in this loopback-only developer process, so any browser on the workstation can open `http://127.0.0.1:3100/stories` without a cookie or OAuth redirect. Ordinary application startup still requires real authentication. Chamber uses only loopback ports 3001 and 3100 and refuses occupied ports; stop other API/test processes before starting it. `/demo` on port 3000 remains a separate in-memory prototype.

The launcher creates and migrates the dedicated local `offscreen_chamber` database, retains its stories, starts the API/web/Temporal worker and provisions the stable local fixture user. The served API uses a Chamber-injected identity resolver; no login route or provisioning plugin is mounted, and this behavior is absent from ordinary API construction. `CHAMBER_DATABASE_URL` may change local database credentials, but must still target that exact database on localhost/127.0.0.1; no remote database or URL query overrides are allowed. The default uses the Compose development credentials. Creating the database requires the local role's create-database privilege.

During the pre-POC single-baseline lifecycle, a regenerated baseline cannot migrate an older Chamber schema forward. Run `pnpm chamber:reset` to explicitly drop and recreate only the guarded local `offscreen_chamber` database before launch. This permanently removes its disposable local stories; ordinary `pnpm chamber` continues to retain them and never resets implicitly.

Choose a named scenario from the catalog (stable `chamber.vN` IDs remain the stored source) and retain its URL to reopen the saved story in the launcher's authenticated browser. After start, the player scene uses ordinary production snapshots; a separate Inspector panel shows committed story identity, passage, timing, items, bounded recent history and generation provenance when present. That inspector is read-only in this phase and is mounted only by the local launcher (`createApp(..., { developerTools: true })`), not by ordinary API startup. Relaunching creates a fresh session for the same local user; paste the saved URL into that browser to return. The Stories page lists owned live stories, including chamber instances. Closing the browser or pressing Ctrl+C stops the launched processes, including the worker. Stored timers resume when the worker runs again; this is not an always-on hosted service. Stories and local sessions are not automatically deleted. `pnpm chamber --smoke` runs headlessly, exercises letter delivery/reload, inspector visibility and anonymous-access rejection, then shuts down.

The local launcher also mounts a developer-only scripted Storyteller control at `GET/PUT /api/chamber-tools/stories/:storyId/storyteller-control`. A PUT with `{"action":"arm-hold","expectedRevision":0}` or `arm-failure` targets only that story's next `pending-consequence` generation. GET returns the control revision, state and captured generation ID—never the pending result. Release requires `{"action":"release","expectedRevision":<current>,"generationId":"<captured>"}` and wakes that exact saved generation through the normal outbox/worker path; `clear` disarms an unused control. Optimistic revision conflicts return 409. The launcher reuses the control object across local worker restarts, while generation and wake records remain durable. This is deterministic fault/timing injection for Chamber evidence, not a production administration API or model-latency simulator. The focused offline proof is `pnpm test:focus -- storyteller "worker restart and activity replay settle one finite action exactly once"`.

The command does not read `.env.openrouter`, never constructs the live provider adapter and makes no model calls. It is a developer launcher, not public visitor onboarding or the planned live-story POC. Build scripts and tests likewise do not enable inference.

Run `pnpm chamber:packet` for the separate API-only held-packet probe. It provisions a normal authenticated draft and opening entirely through HTTP endpoints, waits for the worker's durable review artifact, verifies that no provider attempt exists, exports the exact credential-free packet under the reported temporary directory and exits. Each artifact is named with its generation ID, so another run does not overwrite the evidence being compared. It does not start Next.js or Chromium. A mandatory hold stops execution before funding reservation, provider construction or network I/O. This mode deliberately uses `dry-run/model-not-selected` with zero placeholder prices: it is for inspecting prompt composition, schema and context boundaries, not evidence that a commercial model or price was selected. It does not read `.env.openrouter`, and no release control is exposed.

Run `pnpm chamber:memory-packet` for the corresponding bounded-memory Gate-0 probe. It writes the maintained 200-passage Greywake corpus and canonical records to the local document store, prepares a minimal creative-exploration continuation with the normal admission/resource code, runs the ordinary durable memory controller and exports its exact first-round review packet. It fails unless the controller is held with one review and zero provider attempts. This is a credential-free structural check of task, context, tool contract and allowance composition; it does not prove retrieval relevance or cheap-model competence, publish a story turn, reserve funds or call a provider.

Run `pnpm chamber:memory-evaluation-packet -- --config=path/to/memory-evaluation.json` to bind that same Greywake flow to a strict `memory-evaluation-packet.v1` route snapshot. The command parses a currently verified zero-price OpenRouter route, projects its two-round/one-read authority through ordinary admission, captures the exact held first attempt and writes `memory-live-evaluation.v1` beside the packet. Its provider is a tripwire and it neither loads credentials, releases the review, reserves usage nor contacts OpenRouter. The resulting manifest authorizes nothing: each later round still needs its own review, freshness checks, explicit release and settlement reconciliation.

`pnpm chamber:memory-evaluation-run -- --config=path/to/memory-evaluation.json --authorize=<evaluation-id>` is the explicit live counterpart. Supply `OPENROUTER_API_KEY` in the invoking environment; the launcher does not read dotenv files. It admits at most two requests under the one zero-microusd operation. Round one is released only after packet preflight. If the model asks for memory, deterministic retrieval may produce a second held packet, but the command releases it only after round one has settled with matched zero charge and a fresh route verification. Any uncertainty, nonzero charge, reconciliation failure, stale route or extra attempt stops the run. This command is for deliberate local evaluation only, never tests, startup or unattended loops.

Run `pnpm storyteller:packet-audit` for the faster pure structural comparison of narrative opening, mechanical opening, continuation, consequence and report requests. The default audit also includes human turns 13–15 and a nonhuman fifteen-turn continuity case, checking independently declared evidence coverage and reporting cold serialized-request totals plus potential reusable message-content prefixes. It builds only the Storyteller package, uses deterministic authored fixtures, performs no HTTP/database/provider work and writes a fresh `manifest.json` plus `comparison.txt` beneath the reported temporary directory. Select cases with `-- --cases=scene-continuation,activity-consequence` or a profile with `-- --profile=absurd-action-comedy`. Byte counts and common prefixes are exact; token estimates, provider cache hits, cache-write prices and savings remain unknown. This audit complements rather than replaces the authenticated held-packet probe.

`pnpm chamber:evaluation-packet -- --config=path/to/evaluation.json` is the credential-free Gate-1 variant. Its strict `evaluation-packet.v1` JSON names the exact current model/route, authoritative price snapshot and validity interval, account/run identities, case and independently bounded recipe. It permits one primary/in-flight call and zero retrieval, repair, judge, comparison, background or reasoning calls. The launcher creates a new authenticated opening packet with that model already inside the hashed body, stops at dispatch review, and writes a calculated `live-evaluation.v1` manifest beside the packet. It does not read `.env.openrouter`, provision/enable funding, release the packet or contact OpenRouter. Never reuse an old configuration as current pricing evidence.

## Profiled storyteller rehearsal

Run `pnpm chamber` for the authenticated local launcher, then navigate to `/stories`. Create a draft, select either storyteller, and use a premise such as “I am SpongeBob waking in the pineapple with Gary.” Save, review/generate the opening and Start. Choose offered actions, pause/resume the 20-second quick-play journey, read saved passages and reopen through the Stories list. This is an authored offline rehearsal; arbitrary premises are not improvised. Storyteller profiles are JSON in `packages/storyteller/src/profiles/definitions/`, separate from rehearsal scenes.

Migration `0014_eminent_dagger.sql` adds nullable profile/execution/notes fields and private publication/accounting records. The launcher applies migrations to its dedicated local database. It creates no live funding allowance and does not enable provider execution.

After a fresh affected build, `pnpm --filter @offscreen/api-integration test:storyteller` runs the focused PostgreSQL/Temporal/browser suite with `DATABASE_TEST_URL` targeting `offscreen_auth_test`. Run it sequentially with other integration suites because they share ports. Storyteller package tests inject fake HTTP transports; the integration suite uses local scripted/fake providers. No saved provider credentials are read. Production live flags and execution policy are documented in [runtime](technical/storyteller-runtime.md); their presence does not supersede the spending rule.

## Mechanical rehearsal

After the local launcher builds and applies migrations, open `/stories`, create the pineapple/SpongeBob premise, select a storyteller and generate the offline preview. Keep **D&D activity rehearsal** selected, choose the starting speed and optional settings lock, then Start. Town offers work and negotiation; shore offers fishing and coastal travel. The activity worker must be running for scheduled hourly results. Creative settings remain editable unless locked. No live key or provider call is needed. Migration 0015 is new; no database was migrated or application started in the implementation turn.
