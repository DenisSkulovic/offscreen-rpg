# DB02 | bounded Composer tasks

Base SHA 2fb3f056; Ready / commissioned; DB01 joined. [Program and frozen contracts](../../../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Move declarations | READY

Requires: DB01; no overlapping API identity/terminal files.
Read: packages/db/src/schema/auth.ts; packages/db/src/schema/terminal-auth.ts; apps/api/src/modules/auth/auth.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move exact declarations to packages/identity-persistence/src/auth.ts and terminal-auth.ts; leaf dependencies drizzle-orm only, exports ./auth and ./terminal-auth. Use existing package config convention. Replace relative auth imports in remaining DB schema files with @offscreen/identity-persistence/auth, temporary DB manifest edge only until DB04. Update all old schema/terminal-auth-schema consumers and registry auth module; no old alias. Preserve Better Auth schema namespace and all relation definitions.
Verification (root): `pnpm --filter @offscreen/identity-persistence build; pnpm --filter @offscreen/db-migrations test`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Move terminal SQL operations | READY

Requires: previous task accepted.
Read: packages/db/src/terminal-auth-store.ts; apps/api/src/modules/terminal-auth/service.ts; apps/api/src/modules/stories/story-player-identity.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move entire store to apps/api/src/modules/terminal-auth/store.ts, import DB type from root, identity tables from new leaf; update service relative import and story-player-identity relative import, no behavior change. Delete old DB exports/files; preserve constant-time comparison, token expiry, locked one-time exchange and revoke predicates.
Verification (root): `pnpm exec turbo run build typecheck --filter=@offscreen/api; pnpm --filter @offscreen/db-migrations check:schema`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

Read [SOURCE-MAP.md](SOURCE-MAP.md) before dispatch. No further planner approval.
