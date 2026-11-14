# AD03 | Exact-reference player finder and permission-safe Player 360 API

**State: Proposed, NOT Ready.** Code-bearing read model. **Depends on:** AD01 + AD02. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** authorized Admin users can look up a permitted player by **stable ID** and get a minimal source-backed, redacted summary; protected account existence and private narratives do not leak, and absent commercial data is reported as unsupported.
>
> **Authority:** [V1 endpoint/DTO contract](../../admin/technical/core-v1-contracts.md#3-read-only-resource-endpoints), [read policy](../../admin/technical/read-models-and-privacy.md), [Player 360](../../admin/player-360-service-blueprint.md).
>
> **Start/revalidate:** `packages/db/src/schema/auth.ts`, `packages/db/src/schema/stories.ts`, `apps/api/src/modules/auth/identity.ts`, `apps/api/src/app.ts`, `packages/application/src/stories/reads.ts`; current Postgres integration helpers.
>
> **Do not:** add `ownerId` override to player API, serialize Better Auth OAuth tokens, inspect `story_passage` content, create an email/fulltext global search or claim Free/Premium billing.

## Intended code delta

1. Define strict `PlayerSummaryV1`, subject/source/freshness and page/error Zod contracts under a dedicated Admin contracts owner. No raw DB row passthrough.
2. Add Admin-only application reader for exact-ref player lookup/summary with scope/field checks **before** querying protected resources and counts. Small bounded pagination only.
3. Report verified `user.createdAt`, stable reference and source-backed relationship count where safely affordable. Missing account restriction state is `unknown`; paid subscription is `unsupported`.
4. Add `GET /api/admin/players?ref=...` and `GET /api/admin/players/:id` to Nest Admin composition, using AD02 actor guard.
5. Tests for authorized result, forbidden/missing indistinguishability, no tokens/private JSON, no raw payment assertions and stale/degraded source behavior.

## Normal and discriminating negative

**Normal:** a staff actor with an exact player scope finds that player and sees stable ID, source coverage and permitted count; the response is parseable by strict V1 Zod.

**Negative:** another known player reference (including guessed account ID) yields no existence leak through response, list total, sorting or error. OAuth access token and private campaign text remain inaccessible even to broad summary reader. No provider call, billing claim or game state mutation on GET.

**Proof:** pure DTO tests + approved disposable DB/Nest integration seeded with two distinct owners and one forbidden player; inspect wire JSON for absent fields and correct 401/404. V1 does **not** need a Next screen yet.

## Excluded / risk

No email lookup, payer identity, membership grants, raw story title, bulk export, account mutation, case assignment or customer support automation. Respect source `story.ownerId` as current legacy-owner, not multiplayer authority.

**Ready gate:** AD02 complete and source revalidated; owner selects AD03. **Return:** exact DTOs, controlled read bounds, negative JSON proof and integration evidence, next AD04.
