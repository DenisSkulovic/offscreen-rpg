# CL01 | First-class terminal campaign client

**State: SOURCE-DESIGNED, READY AFTER MA12 INTEGRATES AND EXACT HEAD RECHECK.** Inspected snapshot d3ba291763de on undertaking/storyteller-workshop. Prior WR10/MA12/TURN03 wave remains unimplemented. No actual player terminal exists yet, no paid model call.

## Product end state

A human can sign in through the existing web browser, then use a normal terminal client to list, launch, play, inspect history, fork, and resume campaigns on the **same Nest story APIs** as the web interface. CLI can also emit validated public player DTOs via --json for automated acceptance, without a second game engine or database access. No local Writer/model/clock implementation, no special admin account.

Create one workspace tools/terminal named @offscreen/terminal, with login, logout, stories, launch from stdin or --prompt-file, launch-status, play STORY_ID (interactive), choose, refresh, history, fork SEQUENCE, resume and --json. Show paragraphs, server-provided choice options, campaign hierarchical offer paths, pending/uncertain/held state. Browse-only campaign nodes must not spend fictional time. Commit only action-bearing leaf nodes, exactly as current Web CampaignOfferPanel. Use normal StorySnapshot, StoryLaunch, StoryHistory, respondToStory, and fork schemas.

## Authentication decision

The API currently uses Better Auth cookie sessions; the CLI must **not copy HttpOnly browser cookies** or directly call SQL. Implement browser-approved, one-time device pairing with a story-only scoped bearer credential.

CLI generates 32-byte verifier and SHA256 challenge, server issues random 10-character code and five-minute pairing. User signs into existing Web app and explicitly approves that code, seeing client label, limited story-only capability and seven-day expiry. CLI exchanges verifier exactly once for a 32-byte token. DB stores SHA256 token hash, bound owner and expiry, never raw token or device code; supports revocation and replay refusal.

Add StoryPlayerIdentity resolver **only to StoriesController**, including its SSE permission recheck. Cookie-only sessions still use existing IdentityService; bearer accepted only when no cookie and scope=player-story. Do not change IdentityService globally: Admin, Drafts, developer routes and internal GA must reject terminal bearer. Browser approval requires existing browser cookie and Origin guard. Terminal sends exact configured Origin on writes; no CSRF middleware bypass.

Store token in owner-only local config file (mode 0600), refuse symlinks, atomic writes, never log tokens/prompts. A pending turn stores immutable UUID, request and digest in a 0600 state file. After network failure, consult existing server receipt and snapshot first; never allocate a replacement operation ID. Launch persists operation ID and hash, not raw prompt.

## Implementation ownership

NEW tools/terminal/**; NEW packages/contracts/src/terminal-auth.ts and export; NEW packages/db/src/schema/terminal-auth.ts and next SQL migration/journal after current 0023 (recheck after prior wave); NEW apps/api/src/modules/terminal-auth/**; narrow apps/api/src/modules/stories/{controller,story-player-identity}.ts and apps/api/src/app.ts DI after MA12 and apps/api/src/main.ts HMAC-secret injection from the existing BetterAuth config; NEW apps/web/app/(authenticated)/terminal/connect/**. Central custodian owns shared lockfile/catalog/STATUS.

Do not edit apps/game-authority, apps/worker, packages/story-engine, provider secrets or infra/kubernetes/lab/chaos. This lane is disjoint from WR11 and K8S10.

## Acceptance

Disposable SQL/browser pairing proves one-time code exchange and owner-scoped token; terminal uses real player endpoints for two scripted turns, history and independent fork. Negative tests: wrong owner, missing/expired/revoked token, ten concurrent exchange attempts yield at most one token, cookie+bearer ambiguity, wrong Origin, Admin/Drafts bearer refusal, stale revision, interrupted command retry, ANSI terminal-escape sanitization, no token in output. No paid calls. Source/implementation receipt and explicit NOT RUN for unavailable browser/SQL tests.

See SOURCE-MAP.md, EXECUTION.md, TASKS.md and PROOF.md.