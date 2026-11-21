# WR07L | Durable idempotent Launch operation ledger

**State:** Done (2026-11-21). Integrated on `undertaking/storyteller-workshop` by squash from `change/wr07l-launch-ledger`. Not merged to `main`. Dispatch HEAD `0d2590a1a1136d2cbb245c03a467fff34417f098`. Internal SQL and Game Authority ledger only. No public Launch route, no story row, and no provider call.

## Execution proof

T01 added `packages/db/src/schema/launch.ts`, `packages/db/package.json` export `./launch-schema`, `packages/db/migrations/0020_wr07l_launch_ledger.sql`, and journal idx 20. T02 added `apps/game-authority/src/launch-ledger.ts`. T03 extended `apps/game-authority/test/launch-ledger.test.ts`. The schema test is `packages/db/test/wr07l-launch-ledger.integration.ts`.

`pnpm --filter @offscreen/db build`, `pnpm --filter @offscreen/documents build`, `pnpm --filter @offscreen/storyteller build`, and `pnpm --filter @offscreen/game-authority build` exited 0. Disposable `DATABASE_TEST_URL` pathname `/offscreen_db_test` on 127.0.0.1: `node --test packages/db/dist/test/wr07l-launch-ledger.integration.js` 1 pass / 0 fail; `node --test apps/game-authority/dist/test/launch-ledger.test.js` 3 pass / 0 fail. Premature `ready` without `generation_id` returned SQLSTATE 23514. Concurrent different prompts produced `launch_conflict` and left the winner's hash. Reconnect through a new pool returned the same reserved id. Story, generation, passage, and outbox counts stayed unchanged. Provider spend zero. Migration `0019_wr05s_scene_checkpoint_schema` remains in `packages/db/migrations/meta/_journal.json`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| Submitting Play creates one durable launch operation that can be recovered after a lost reply, and an uncertain retry must not create a second story | docs/product/experience/entry-and-onboarding.md#launch-and-first-arrival | unchanged: that heading remains the product target. This Change stores the internal row and does not expose Play, a route, or publication | apps/game-authority/src/launch-ledger.ts and packages/db/src/schema/launch.ts at dispatch 0d2590a1a1136d2cbb245c03a467fff34417f098 plus the WR07L commits on change/wr07l-launch-ledger | fixture-tested | a different prompt for the same owner and operation id throws launch_conflict; a third owner reads launch_not_found; public pending JSON omits the prompt and storyId | apps/game-authority/README.md and packages/db/README.md |
| A reserved launch id is not a published story, passage, generation, or outbox notice, and ready requires a real first scene rather than a status flag | docs/technical/platform/data-and-persistence.md#implemented-launch-operation-ledger | changed: the durable-records owner now records `story_launch`, the composite key, the hash conflict, and the absence of a public route | packages/db/migrations/0020_wr07l_launch_ledger.sql and apps/game-authority/src/launch-ledger.ts | fixture-tested | SQLSTATE 23514 rejects ready without generation_id or scene_sequence 1; admit leaves story, generation, story_passage, and outbox counts unchanged | docs/technical/platform/data-and-persistence.md#implemented-launch-operation-ledger |

## Diff paths

packages/db/src/schema/launch.ts packages/db/package.json packages/db/migrations/0020_wr07l_launch_ledger.sql packages/db/migrations/meta/_journal.json packages/db/test/wr07l-launch-ledger.integration.ts packages/db/README.md apps/game-authority/src/launch-ledger.ts apps/game-authority/test/launch-ledger.test.ts apps/game-authority/README.md docs/technical/platform/data-and-persistence.md STATUS.md work/changes/README.md work/changes/ledger/2026-11.md work/undertakings/storyteller-workshop/PROGRAM.md work/changes/open/2026-11-21--wr07l-durable-launch-ledger/CHANGE.md work/changes/open/2026-11-21--wr07l-durable-launch-ledger/TASKS.md work/changes/open/2026-11-21--wr07l-durable-launch-ledger/PROOF.md

## Original commission

Standalone implementation Change, parallel to WR05P2 (Documents/Story Engine) and WR07N (pure Storyteller tasks). Integration target `undertaking/storyteller-workshop`, never `main`. **No Story Engine, Documents, Contracts, Web, API routes, worker, outbox or provider execution modifications.**

## Outcome

One authenticated Launch admission can be durably identified, reserved and recovered across crashes, competing HTTP requests and later Writer processing. **Do not expose a public PUT that accepts then strands commands.** This Change establishes the internal SQL/GA transaction boundary; WR07B later adds an authorized publisher + worker and only then exposes `PUT/GET /api/stories/launch/:operationId`.

## Exact schema and authority decision

New `story_launch` table with composite `PRIMARY KEY(owner_id,operation_id)` and columns:
- `owner_id TEXT NOT NULL` FK `user.id` restrict; `operation_id UUID NOT NULL`; `request_hash TEXT NOT NULL` lowercase SHA256; `request JSONB NOT NULL` exact `StoryLaunchRequest` canonical parsed shape (prompt up to 24K, preset pin/hints).
- `reserved_story_id UUID NOT NULL UNIQUE`; `reserved_first_passage_id UUID NOT NULL UNIQUE`. These UUIDs are reserved once at admission and **do not FK to story/story_passage before publication**. No created ghost story/passage.
- `generation_id UUID NULL` (eventual FK to generation.id restrict if nullable, with unique non-null index); `state TEXT NOT NULL DEFAULT 'pending'` with CHECK in `pending,preparing,composing,held,failed,uncertain,ready`; `scene_sequence INTEGER NULL`; `public_reason TEXT NULL`; `uncertain_explanation TEXT NULL`; timestamps `created_at/updated_at TIMESTAMPTZ(3)`.
- SQL CHECK: `ready` requires `scene_sequence=1` (first launch scene) and `generation_id IS NOT NULL`; non-ready has `scene_sequence IS NULL`; non-`held/failed` has `public_reason IS NULL`; non-`uncertain` has `uncertain_explanation IS NULL`; `held` reason must match WR07C's `policy|authorization|capacity`; `failed` reason `rejected|not-admitted|unavailable`; `uncertain` explanation required and bounded. **Never mark ready until actual story + scene selector exists in the same authoritative SQL transaction** (WR07B's job, not this Change). Reserved ID is not a public `ready.storyId`.
- Add `@offscreen/db/launch-schema` subpath export in `packages/db/package.json`. Update journal with exact migration ordering; no destructive reset or backfill.

## Internal GA ledger functions (no public endpoint)

In new `apps/game-authority/src/launch-ledger.ts`:
- `admitLaunchOperation(database,{ownerId,request})`: parse `storyLaunchRequestSchema`, compute `requestHash=hashCanonicalJson(parsed)`, reserve UUIDs, insert transactionally with unique index protection. On same `ownerId+operationId` conflict, read existing row under tx lock and compare hash; **identical request returns stored operation, changed request throws typed `launch_conflict`**. Never overwrite source/hash/reserved IDs, generate a second generation, invoke provider, or enqueue wake.
- `readLaunchOperation(database,{ownerId,operationId})`: retrieve solely by composite owner/operation key; missing or other owner = same `launch_not_found`. Strict parse operationId UUID. Return stored state with exact owner-scoped private source for trusted GA code, and a separately exported **public status projection** parsed with `storyLaunchStatusSchema`, which never includes source/prompt/owner, and never claims storyId for pending unless explicitly permitted; ready requires confirmed scene, not just `state='ready'`.
- `withLockedLaunchOperation(tx,{ownerId,operationId},callback)` or tightly scoped equivalent used later by WR07B to update the row in the *same SQL transaction* as first-scene selector. Do not expose a generic uncontrolled `markReady` API. Avoid read-before-insert race, avoid nested SQL transactions.
- **Owner ID is `text`** from auth user, matching `generation.ownerId` and `story.ownerId`; note that `storytellerWriterMission.ownerId` currently uses UUID, which is an integration mismatch WR07B must reconcile explicitly before mission admission. **Do not coerce non-UUID authenticated owner IDs into mission owner UUIDs or change auth identity here.** This packet does not authorize writing Writer mission rows.

## Proof/finish

[TASKS](TASKS.md). Focused disposable PostgreSQL tests: two simultaneous identical admissions yield one row, same reserved IDs/hash; conflicting duplicate cannot mutate; second user same UUID is independent/hidden; malformed prompt/UUID rejected; no leaked prompt in public status; restart/new DB connection returns same status; no generation, story, passage, outbox or provider writes. Test all SQL CHECK states, including premature `ready`. Version 0019 checkpoint migration remains intact.

Do not edit general GA seam/controller to expose a nonfunctional path; no Web feature enabling. Parent completes whole Change, reconciles docs/ledger, squash-integrates serially with other parents and retires clean worktree/branch.
