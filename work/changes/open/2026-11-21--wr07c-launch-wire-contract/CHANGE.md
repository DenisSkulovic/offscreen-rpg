# WR07C | One-prompt Launch command and status wire contracts

**READY; independent of MA06A and WR05S.** Integration target `undertaking/storyteller-workshop`. Inspected live `packages/contracts/src/{drafts,stories}.ts`, `packages/contracts/package.json`, and `packages/contracts/test` conventions, 2026-11-21. This is the **protocol foundation** of WR07, not a fake backend or paid Launch execution. No API, app engine, UI, migrations or provider edits.

## Selected command contract

Create `packages/contracts/src/story-launch.ts`; add `./story-launch` subpath to `packages/contracts/package.json`. Export parsers, inferable input/output types and tight status variants, with no model/provider implementation.

`storyLaunchRequestSchema` strict union discriminated by `source.kind`:
- `operationId:z.uuid()` is the **idempotency identity**, supplied once by client; `source` is either `{kind:'prompt',prompt:string}` with verbatim 1–24,000 characters (reject whitespace-only), or `{kind:'preset',presetId:string,presetRootHash:SHA256,customPrompt?:string}` with version-pinned immutable preset. Optional prompt 1–24,000 chars when present. No required human character, title, RPG rules, preview or profile.
- optional `hints` strict `{storytellerProfile?:string, worldInvention?:'original'|'source-bound'}`; omit means server-selected policy, **not unlimited invention**. Keep model spending grants out of user-chosen DTO; server must resolve independent current dispatch authority.
- No embedded arbitrary document bytes or caller-supplied owner ID. Auth actor comes from server session, not request body.
- `storyLaunchStatusSchema` strict discriminated union by `state`: `pending, preparing, composing, ready, held, failed, uncertain`. Every response includes operationId, immutable accepted request identity SHA256 (named `requestHash`), `createdAt,updatedAt` ISO strings, and `storyId?:UUID`; `ready` requires both `storyId` and `sceneSequence:positive int`; `held/failed` have bounded public `reason` enums, `uncertain` provides safe explanation but **never** an automatic retry authorization. Other states do not claim scene readiness. Do not leak hidden thoughts/provider request bodies.
- Status must be readable by the same authenticated owner and operation identity after a lost HTTP reply. This is a contract to be implemented later; current Change supplies schemas and tests, not the endpoint.

## Composer tasks (one Change)

**T01 Protocol (PATCH):** read `packages/contracts/src/{drafts,stories}.ts`, `packages/contracts/package.json`, `packages/contracts/test/stories-receipt.test.ts`. Write `src/story-launch.ts`, manifest exports and `test/story-launch.test.ts`. Use Zod strict discriminated source/status variants; export `StoryLaunchRequest`, `StoryLaunchStatus` types. Verify accepted long original-world prompt, pinned preset, no character/title; reject missing operation ID, blank/oversized prompt, malformed root, ownerId injection, extra keys, ready missing storyId or sceneSequence.
**T02 Build/close (VERIFY/PATCH):** `pnpm --filter @offscreen/contracts build`, `pnpm --filter @offscreen/contracts test`, changed-file lint/format, public export resolution and no `@offscreen/application` dependency. Reconcile canonical WR07 API contract, archive/ledger, squash-integrate to undertaking. No model calls, SQL migration or API controller yet.

## Dependencies and concurrent execution

- No prerequisite from MA06A or WR05S; no shared code paths, and contracts package already depends on Documents/Game but not Application.
- Run a distinct `change/wr07c-launch-contract` linked worktree. One integration custodian serializes shared docs, catalogs and landing. Do not change `work/QUEUE.md` from an individual concurrent parent.
- Follow-up WR07 launch backend uses these exact DTOs; authentication, captured request hash, status persistence and spending custody are **backend responsibilities**, not inferred from parser success.
- Stop only for an actual conflict with current accepted Launch product requirements or a changed existing public schema, not routine formatter, TS or test correction.

**Done = a tested public contract, not a pretend working Play button.**
