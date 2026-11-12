# API: authenticated HTTP composition

`@offscreen/api` composes HTTP routes using NestJS, Better Auth and application operations. Controllers handle request/identity/response mapping; they do **not** become another source of game rules, campaign scheduling or Storyteller admission. [Client/identity](../../docs/technical/client-and-identity.md) and [story lifecycle](../../docs/technical/story-lifecycle.md) own the intended API behavior.

**One-hop context:** [stories/controller and developer-mode map](src/modules/stories/README.md) for W04/W16/W19, [draft/openings map](src/modules/drafts/README.md) for W08/W09. These are **current source guides**; read only the owner relevant to the Change. The [frontend target](../../docs/engineering/targets/react-next.md) is future design, not installed API code.

## Find the request route

| Concern | Actual entry | Responsible next layer |
| --- | --- | --- |
| Nest application wiring, optional developer routes | [src/app.ts](src/app.ts) `createApp` | [Application guide](../../packages/application/README.md) |
| Config, DB/auth, process startup | [src/main.ts](src/main.ts), [src/config.ts](src/config.ts) | Database and runtime dependencies |
| Sessions and owner identity | [auth.ts](src/modules/auth/auth.ts), [identity.ts](src/modules/auth/identity.ts) | `IdentityService` and application ownership guards |
| Draft saving, opening requests and profile selection | [draft controller](src/modules/drafts/controller.ts), [opening controller](src/modules/drafts/openings-controller.ts), [profile controller](src/modules/drafts/storytellers-controller.ts) | `@offscreen/application/drafts` and generation operations |
| Story read, Start/fork, selected actions, controls | [stories controller](src/modules/stories/controller.ts) | `@offscreen/application/stories`, validated public contracts |
| Chamber/QA inspection | [Chamber tool controller](src/modules/stories/chamber-tools-controller.ts), [QA controller](src/modules/stories/qa-journeys-controller.ts) | Tool-enabled composition, not production player's default surface |

## Debug without recreating policy

Trace **controller → owning application use case → transaction/retry path**. A valid DTO or successful HTTP route does not prove the caller owns the story or that a command settled. Application failures are mapped to HTTP responses; do not "fix" business state by adding a second controller-side transaction.

[Web](../web/README.md) renders; [worker](../worker/README.md) runs durable Activities. They share application operations rather than importing each other's service logic. `createApp` is an explicitly composable entrypoint; [main.ts](src/main.ts) starts the process and dependencies.

The manifest has `build`, `typecheck` and auth schema generation, **not** a package test command. HTTP/auth integration checks live in [tools/api-integration](../../tools/api-integration/). Auth schema generation or local server startup is not a harmless documentation check; inspect side effects first.
