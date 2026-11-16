# AD03 | Exact-reference player finder and permission-safe Player 360 API

**State: Done (2026-11-14).** Code-bearing read model. **Depends on:** AD01 + AD02 Done. **Parent:** [Admin program](../../../../../../docs/programs/admin/implementation-program.md). Evidence: [ad03-player-safe-reads](../../../../../../docs/programs/admin/evidence/ad03-player-safe-reads-2026-11-14.md).

## Cursor first-screen

> **Outcome:** authorized Admin users can look up a permitted player by **stable ID** and get a minimal source-backed, redacted summary; protected account existence and private narratives do not leak, and absent commercial data is reported as unsupported.
>
> **Authority:** [V1 endpoint/DTO contract](../../../../../../docs/programs/admin/technical/core-v1-contracts.md#3-read-only-resource-endpoints), [read policy](../../../../../../docs/programs/admin/technical/read-models-and-privacy.md), [Player 360](../../../../../../docs/programs/admin/player-360-service-blueprint.md).
>
> **Start/revalidate:** `packages/db/src/schema/auth.ts`, `packages/db/src/schema/stories.ts`, `apps/api/src/modules/auth/identity.ts`, `apps/api/src/app.ts`, `packages/application/src/stories/reads.ts`; current Postgres integration helpers.
>
> **Do not:** add `ownerId` override to player API, serialize Better Auth OAuth tokens, inspect `story_passage` content, create an email/fulltext global search or claim Free/Premium billing.

## Landed code delta

1. Strict Zod `PlayerSummaryV1`, search page, and read envelope under `@offscreen/contracts/admin`.
2. `createAdminPlayerReads`: exact-ref search + summary from `user` + `story.ownerId` count only; status `unknown`; commercial `unsupported`.
3. Nest `GET /api/admin/players?ref=&limit=` and `GET /api/admin/players/:id` behind AD02 capability gate.
4. Unauthorized search → empty page; denied/missing detail → privacy 404. Wire JSON excludes email/tokens/story source text.
5. Pure DTO tests + `pnpm test:focus -- admin-player-reads`.

## Normal and discriminating negative

**Normal:** scoped staff finds allowed player; summary envelope parses; legacy-owned campaign count is source-backed.

**Negative:** forbidden player search empty; detail 404 indistinguishable from missing; anonymous 401; no email/OAuth/passage leakage.

## Excluded / next

No Admin UI (AD04), no campaign drilldown (AD05), no email search. Provider spend: none. Next: **AD04**.
