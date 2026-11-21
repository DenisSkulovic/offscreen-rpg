# WR07C | One-prompt Launch command and status wire contracts

**State:** Done (2026-11-21). Integrated on `undertaking/storyteller-workshop` by squash from `change/wr07c-launch-contract`. Not merged to `main`. Dispatch HEAD `c67e7fc5330165ee368c87a622d8726f6fe6ad0e`. Independent of MA06A and WR05S. This is the **protocol foundation** of WR07, not a fake backend or paid Launch execution. No API, app engine, UI, migrations or provider edits.

## Execution proof

T01 added `packages/contracts/src/story-launch.ts`, `packages/contracts/test/story-launch.test.ts`, and the `./story-launch` subpath. `operationId` is the client idempotency identity. `requestHash` is the immutable accepted request identity. Public `held` reasons are `policy`, `authorization`, and `capacity`. Public `failed` reasons are `rejected`, `not-admitted`, and `unavailable`. `uncertain` carries a bounded explanation and no retry field. Parser success does not authenticate, persist, or authorize spend.

`pnpm --filter @offscreen/contracts test` passed 50/50, including the four launch tests. `pnpm --filter @offscreen/contracts build` passed. Prettier check and quality ESLint passed on the new source and test. The built module exports `storyLaunchRequestSchema` and `storyLaunchStatusSchema`. Contract dependencies remain `@offscreen/documents`, `@offscreen/game`, and `zod`. `pnpm repo:code-health -- --strict-new --base undertaking/storyteller-workshop` exited 0 before the new file was committed; the added module is about 110 lines and does not cross a severe band. No model call.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| A launch command is one client operation id plus either a verbatim Story Prompt or a version-pinned preset, with no required character, title, or caller owner id | docs/product/experience/entry-and-onboarding.md#launch-and-first-arrival | unchanged: that heading already requires one Story Prompt or prepared-experience Play action and does not require a character sheet; this Change publishes the parser and does not rewrite the product page | packages/contracts/src/story-launch.ts | fixture-tested | whitespace-only, 24001-character, malformed root, ownerId, and extra title requests fail parse | packages/contracts/package.json `./story-launch` |
| Launch status can be read again by operation identity and never treats uncertain as permission to start a second attempt | docs/product/experience/entry-and-onboarding.md#launch-and-first-arrival | unchanged: the heading already requires honest queued, running, uncertain, and failed recovery of the same launch; the schema adds no endpoint | packages/contracts/src/story-launch.ts and packages/contracts/test/story-launch.test.ts | fixture-tested | ready without storyId or sceneSequence fails; pending with sceneSequence fails; uncertain with retryAllowed fails | packages/contracts/package.json `./story-launch` |

## Diff paths

packages/contracts/src/story-launch.ts packages/contracts/test/story-launch.test.ts packages/contracts/package.json work/changes/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/storyteller/2026-11-21--wr07c-launch-wire-contract/CHANGE.md

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
