# WR07L | Durable idempotent Launch operation ledger

**READY / OWNER-COMMISSIONED.** Standalone implementation Change, parallel to WR05P2 (Documents/Story Engine) and WR07N (pure Storyteller tasks). Integration target `undertaking/storyteller-workshop`, never `main`. This Change writes **only** `packages/db/src/schema/launch.ts`, `packages/db/package.json`, `packages/db/migrations/{0020_wr07l_launch_ledger.sql,meta/_journal.json}`, new `apps/game-authority/src/launch-ledger.ts`, focused GA/DB tests, and packet/ledger metadata. **No Story Engine, Documents, Contracts, Web, API routes, worker, outbox or provider execution modifications.**

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
