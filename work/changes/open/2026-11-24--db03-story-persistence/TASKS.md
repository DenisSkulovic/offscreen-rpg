# DB03 | bounded Composer tasks

Base SHA 7322b6f1a6df6f5ae612763b9786563dca2989eb; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Extract story roots and generations | PLANNER-BLOCKED until promotion

Requires: DB02 and CACHE04/CACHE06B joins; no concurrent Story Engine/GA/worker consumers.
Read: packages/db/src/schema/drafts.ts; packages/db/src/schema/generations.ts; packages/db/src/schema/stories.ts; packages/db/src/schema/launch.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Create packages/story-persistence with exports ./drafts ./generations ./stories ./launch ./campaign ./storyteller; only Drizzle and identity-persistence dependencies. Move exact four files; update identity import, preserve relative internal references; stage remaining campaign/writer in same branch before build. No aliases, no table redefinition.
Verification (root): `pnpm --filter @offscreen/story-persistence build (after T02)`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Move campaign and Writer custody | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/schema/campaign.ts; packages/db/src/schema/storyteller.ts; packages/db/src/schema/storyteller/{capture,execution,funding,policy,writer}.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Move campaign and all six Writer barrel/lifecycle files verbatim, relative same layout; policy/campaign use identity leaf. Existing 20-table fingerprint remains unchanged. No pure Storyteller dependency on SQL. No funding lock or money type changes.
Verification (root): `pnpm --filter @offscreen/story-persistence build; pnpm --filter @offscreen/db-migrations test`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T03 | Migrate every consumer and registry | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/story-engine/src/stories/reads.ts; packages/story-engine/src/storyteller/budget.ts; packages/admin/src/player-reads.ts; apps/game-authority/src/launch-ledger.ts; apps/worker/src/activities/scripted-writer-scene.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Replace six old DB subpaths exactly per map; add direct dependency for actual importers; update legacy dist import paths if any, registry story module and migration proof. Delete old exports and declarations. Only import tokens/manifests; no logic changes. Consumer file inventory pinned by planner before dispatch. Preserve snapshot CACHE04 and lexical CACHE06B source.
Verification (root): `pnpm exec turbo run build typecheck --filter=@offscreen/story-engine... --filter=@offscreen/admin... --filter=@offscreen/game-authority...; pnpm --filter @offscreen/db-migrations check:schema`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
