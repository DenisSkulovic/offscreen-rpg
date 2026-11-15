# OBS01 | Every real campaign Storyteller generation is findable before its first attempt

**State: Done (2026-11-15).** Evidence: [obs01-operation-coverage-2026-11-15](../../observability/evidence/obs01-operation-coverage-2026-11-15.md). **Code-bearing:** S1 read-only Admin diagnostics + tests; no schema migration, raw context access, model/provider traffic. Provider spend: zero.

**Design authorities:** [forensic vision](../../observability/product-vision.md), [source inventory](../../observability/evidence/current-source-inventory-2026-11-15.md), [source-level private data map](../../observability/evidence/private-content-retention-inventory-2026-11-15.md), [temporal/coverage contract](../../observability/technical/temporal-frontiers-and-coverage-v1.md), [role-safe read policy](../../observability/technical/forensic-access-and-read-contract-v1.md). **Dependency:** AD01–AD08 Done, existing safe `ai.operation.read` and campaign visibility checks. **Cursor must not start** without explicit owner code authorization.

## Cursor first screen

> **Player impact:** none. **Support/Engineering diagnostic impact:** campaign operations no longer disappear simply because Storyteller G was held during context materialization, never dispatched or had no `storyteller_attempt` row.
>
> **Current source flaw:** `packages/application/src/admin/diagnostics-reads.ts::listCampaignOperations` starts `FROM storytellerAttempt INNER JOIN generation` and filters by `storytellerAttempt.storyId`, then deduplicates generations in JavaScript. Therefore genuine G linked through `storyResolution`, `storytellerContextCapture`, `storyPassage.sourceGenerationId` or `campaignReport.generationId` can be invisible until an attempt exists. `listPlayerCampaigns` computes pending/uncertain similarly. This is an actual source-level omission, not a fabricated bug report.
>
> **Do not change:** game mechanics, source publication, player API, current Admin package names/grants, prompt exposure, budget/attempt state, old raw task JSONB or UX redesign. No new provider calls.

## Bounded result

### 1. A source-union read, not another event store

Implement one purpose-built **read-only** campaign-G discovery query or small indexed union of existing authorities:
- controlling `story_resolution.story_id→generation_id`, including pending/provisional and failed/held before attempt;
- `story_passage.story_id/source_generation_id` for historical published scenes without current resolution;
- `campaign_report.story_id/generation_id` for historical report G;
- `storyteller_context_capture.story_id/capture_id` for captured G with explicit source record;
- `storyteller_attempt.story_id/generation_id` for genuine attempted model work and associated funding/uncertainty.

**Exact identity:** one G once per campaign, origin/source associations preserved and reasons for link clearly labelled in **private projection**. Never dedupe two distinct G by operationId, passageId or identical packet hash. Do not infer a campaign link solely from `generation.ownerId`: an opening draft or another campaign from the same owner is not the current story's operation.

**Join safety:** use actual SQL foreign keys/source IDs, validate story ID/owner through existing authenticated controller before exposing results. Unknown generation kind and free-text error collapse to bounded safe categories. A generation associated with multiple source classes (e.g. an old published passage and prior resolution) appears **once** with multiple actual source refs or selected primary known linkage.

### 2. Truthful coverage and stable pagination

- Preserve existing `RedactedOperationV1` default contract and current Admin scopes if possible. An additive `sourceStatus/coverage` field requires explicit backwards-compatible Zod/DTO review; do not break AD05 clients by returning unknown keys to strict schemas.
- Distinguish real states `captured/pending/held-before-attempt` from `provider-sent` and `publication-published/stale/blocked` using **recorded source rows**. If the existing public enum cannot express a phase without suggesting a model ran, keep the current state and add a safe provenance/coverage flag in a new versioned read model.
- **Null attempt** is not proof that an LLM was not configured; it proves **no attempt row found under the inspected source set**. Use `attemptCoverage:'none-recorded'`, not "cost=0, never called" unless source invariants actually establish that conclusion.
- Pagination must be **deterministic** under simultaneous inserts/updated timestamps. Use stable composite cursor `(lastObservedAt,generationId)` with validated descending tie-breaker, or a source-compatible snapshot cursor; don't use timestamp alone with `lt` because two G can share a timestamp and cause skipped items.
- One bounded query/list strategy, no N+1 `listPlayerCampaigns` loop per player with one expensive full attempt scan per campaign if it can be replaced by grouped indexed aggregate. Preserve "unknown" when source health is incomplete, not a false healthy badge.
- All timestamps are **observations**, not whole operation causal order. No new business meaning attached to `viewVersion`/`story.revision`.

### 3. Keep this S1 support-safe

The source lookup may visit private storage rows internally, but the HTTP response is a **strict allowlisted redacted projection**: G, source kind/status, state, publication status, safe failure category, observed time, explicit partial coverage. **No** raw `generation.input/output`, `storyteller_dispatch_review.packet`, private `story.`premise, `storyPassage.content`, model/tool bodies, hidden plans, raw SQL driver errors or staff grant metadata.

**Existing authorization:** `apps/api/src/modules/admin/controller.ts` currently calls `assertLegacyCampaignVisible` and `requireCapability(ai.operation.read)`. Preserve these gates for every operation list/detail. Do not use a case link as permission. A future S2/S3 capability remains out of scope.

## Normal/negative proof

| Fixture | Expected |
| --- | --- |
| C2 provisional context G, no attempt row | Included once, correctly labelled pending/preparation and not player-retryable |
| Captured/promotion held G after three materialization failures | Included with safe held/operator status; no raw error string |
| Committed consequence G promoted but provider held before attempt | Included, with no invented paid model round |
| Historical report G with report hook but no current story resolution | Included once in appropriate story |
| Published passage G after old resolution superseded/absent | Included via `sourceGenerationId` with actual publication source |
| Ordinary attempted G linked to same story by multiple sources | Appears once, with actual attempt/publication status |
| Same owner has another draft/G or second story | Neither leaks into this campaign |
| Two G share same updatedAt, page boundary | Both seen across pagination, no missing/duplicate |
| Unauthorized/foreign campaign | 404/non-enumerating result, no returned operations or existence count |
| Untrusted raw task/prompt containing sentinel | Safe API JSON contains none of its bytes |
| Several attempted model rounds for one G | List one G, details may state observed attempt count only when source-confirmed |
| Existing AD05 player/campaign/operation tests | Continue to pass; no change to permissions or payment state |

**Focused test anchors:** `packages/application/test/admin-diagnostics.test.mjs` and unit projection tests; `packages/application/src/admin/diagnostics-reads.ts`; `apps/api/src/modules/admin/controller.ts` existing guards; `@offscreen/contracts/admin` safe schemas; old AD05 SSR/browser tests if DTO/route changes. Use a disposable DB and provider-disabled fixtures **only after separately authorized**; no destructive reset of developer's actual DB.

## Out of scope / Ready gate

No historical transition ledger, raw packets, prompt provenance, staff grant expansion, Admin visualization overhaul, Redis or OTel integration. Do not mark Done simply because a SQL union exists: prove empty-attempt and cross-story negative cases. Benchmark list with 1/100/1000 generations in disposable DB to avoid N+1 or accidental full-table scan. Index only if measured query plan truly requires it and bring an **additive migration design** to owner before modifying schema.

**Ready only when:** owner explicitly selects OBS01 for code, Cursor rechecks latest `main` source, confirms existing Admin read contract and permissions, identifies safe source joins and targeted provider-free tests. `Current change: none` stays untouched until authorization.
