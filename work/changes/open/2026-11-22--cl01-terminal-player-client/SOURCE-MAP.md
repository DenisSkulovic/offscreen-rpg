# CL01 | current source and owner/security map

Inspected d3ba2917. Better Auth in apps/api/src/modules/auth/auth.ts has cookie session and GitHub OAuth, no device/bearer plugin. IdentityService.requireUser in identity.ts resolves cookie. StoriesController in apps/api/src/modules/stories/controller.ts uses requireUser in run, runLaunch and separately in storyUpdates plus periodic stillAuthorized. Those **three** sites must switch to a StoryPlayerIdentity service, never the global IdentityService used by Admin, Drafts and QA.

apps/api/src/modules/auth/config.ts:readAuthConfig already reads BETTER_AUTH_SECRET of at least 32 bytes and apps/api/src/main.ts constructs authConfig and passes createApp options. CL01 passes this existing secret to a narrow server-only pairing HMAC option (not to terminal API responses or client). apps/api/src/app.ts registers Nest controllers/DI and has a global Origin check for non-Auth unsafe methods at lines ~395-409. Do not remove it; terminal sends the configured origin on PUT/POST/DELETE. After MA12 this app.ts will have a typed optional Lab extension; rebase and register terminal-auth in ordinary production API without reintroducing Lab.

packages/db/src/schema/auth.ts has user/session; migration journal in inspected HEAD ends at idx23 0023_wr09a_writer_response_object. CL01 alone owns next available migration, with two tables pairing and token. No personal credentials in cleartext SQL.

Read APIs: GET /api/stories, GET /api/stories/:id, GET /api/stories/:id/history, GET scenes/:sequence, GET resolutions/:operationId/receipt, GET launch/:operationId and optional SSE updates. Write APIs: PUT /api/stories/launch/:operationId, PUT /api/stories/:id/resolutions/:operationId, PUT /api/stories/:id/actions/:operationId, PUT /api/stories/:id/forks/:forkId. All StoriesController operations derive owner from identity.

Existing Web contracts:
- apps/web/src/features/stories/use-story-launch.ts uses storyLaunchRequestSchema, one UUID, a status GET for 202/unknown, and no new automatic retry ID.
- apps/web/src/features/play/use-resolution-command.ts freezes respondToStorySchema and digestResolutionRequest; GET receipt before replay.
- apps/web/src/features/play/ui/campaign-offer.tsx treats nested campaign offer paths as browse-only until a node.action; commits actions with expectedRevision, offerId and path.
- apps/web/src/features/play/historical-fork-story-id.ts hashes offscreen:fork-story:<storyId>:<sequence> then sets UUID v5 bits; fork body has expectedRevision + sourcePassageId. Use identical derivation in terminal, not random fork ID.
- packages/contracts/src/stories.ts exposes storySnapshotSchema, storyHistorySchema, forkStorySchema, respondToStorySchema; interactions.ts validates choice.v1; contracts/story-launch.ts owns launch status. All should be imported from contracts, not copied.

Existing tools/chamber is a DB-enabled developer Lab, unsuitable for normal user terminal. MA12 is extracting Lab from production API. New tools/terminal is a public API consumer only. WR11 owns GA/Worker/workflow, K8S10 chaos; no overlapping owner files.

Browser approval must display pair code and origin, require explicit button, owner from authenticated session, and deny mixed bearer+cookie. Prefer the existing authenticated Next route group for consent; no new OAuth provider.

**DB export correction:** packages/db/package.json exposes ./schema for auth.ts only, not a wildcard. The new schema/terminal-auth.ts must be exported as ./terminal-auth-schema (dist/src/schema/terminal-auth.js/.d.ts); Drizzle config includes ./src/schema/*.ts already. Apps/api must import the declared subpath, not a deep src relative file.
