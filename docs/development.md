# Local development

The first foundation contains a pnpm/Turborepo workspace, strict TypeScript configuration, a Next.js page and a NestJS HTTP process. There is no authentication, database access, workflow worker or playable story yet. Packages are created when their first implementation needs them; the architecture diagram is not a directory checklist.

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

`packages/config` currently exports only shared compiler settings. API configuration stays with its consumer. Workspace imports must use package names/exports, not reach across directories into another package. Add runtime contracts, database and deterministic workflow packages as the corresponding component is implemented and tested.

Next: establish database migrations and the identity/session integration, then build the smallest persisted story flow. Decisions listed in [open questions](questions.md) remain open until the affected behavior needs them.
