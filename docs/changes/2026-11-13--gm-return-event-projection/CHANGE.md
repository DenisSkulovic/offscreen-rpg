# GM05 | Commit-ordered, source-backed public event feed for return and Journal

**State: design selected, implementation-ready for explicit owner approval (2026-11-13).** No code permission yet; active Change remains none. **Authority:** [selected event taxonomy, ordering and privacy](../../experience/patterns/committed-event-feed.md). **Parent:** [mechanics program](../../experience/mechanics-evolution-program.md). GM06 read cursor follows later.

## Cursor first-screen

> **Goal:** expose a private, bounded, cursor-paginated feed of truly committed and *player-visible* source events so Journal can explain “Recent developments” without paid recap or inferred fiction.
>
> **Start:** `packages/db/src/schema/campaign.ts` (source event ordinals), `packages/db/src/schema/stories.ts` (published passage), `packages/application/src/campaign/action-executions.ts::recordActionExecutionEvent`, `campaign/persistence.ts::recordActivityEvent`, `stories/continuation.ts` / `stories/reads.ts::readHistory`. Inspect owner-scoped Nest story route and `@offscreen/contracts/stories` only as needed.
>
> **Authority exact:** [V1 taxonomy](../../experience/patterns/committed-event-feed.md#v1-public-taxonomy-small-and-deliberately-meaningful), [per-story sequence](../../experience/patterns/committed-event-feed.md#ordering-decision-per-story-commit-sequence-independent-of-fictional-time), [read endpoint](../../experience/patterns/committed-event-feed.md#read-endpoint--identity), [legacy policy](../../experience/patterns/committed-event-feed.md#older-stories--migration-policy).
>
> **Never:** merge heterogeneous source arrays by local timestamps as a fake global cursor, emit hidden plans, make GET acknowledge seen, invoke LLM, or add a general bus.

## Bounded code-bearing outcome

1. Add **derived public event index** (additive schema) with per-story monotonic transactional event sequence and unique source-kind/source-ID dedupe; committed in same story transaction as each supported source. Its rows are projection evidence, never a new owner of game mechanics.
2. Project only initial meaningful committed kinds: published passage; terminal action settled/interrupted; meaningful activity event; player-visible world development. Hidden obligations, incomplete candidates, speculative plans and raw rolls are excluded. Summary is a bounded factual label, not generated prose.
3. Expose owner-authorized `GET /api/stories/:id/events?before=...` with typed `{items,nextBefore,coverage}`, descending stable sequence and safe source references. Default 20, cap 50. Paging is pure read and never advances GM06 read position.
4. Reuse existing viewer-scoped server/Next auth, normal no-store/private data handling and bounded query patterns. A thin frontend read consumer may be introduced only where the selected existing Journal has a genuine place for it; no broad UX re-layout or false “since last visited” label.
5. Backward compatibility: old narrative history remains; feed coverage explicitly says whether older existing stories have full/partial indexed history. Do not backfill legacy events under this Change without a *separately approved deterministic migration/coverage strategy*. Append-only cursor must not silently miss late inserted old sources.

## Acceptance / negative

**Normal:** provider-free settled/published/interrupted source fixtures append exactly once, order stable across heterogeneous source tables and same fictional time, old source links lead to authorized passages. Paging 20/50 produces no gaps/duplicates. Journal can show factual “Recent developments” without LLM or model spend.

**Negative:** hidden/future obligation remains private, unpublished candidate excluded, repeated worker delivery dedupes, A/B viewer isolation, no public raw DC/item-holder secret, timestamp backfill cannot reorder cursor, GET cannot run generation or update seen/read time, legacy unindexed history is not presented as exhaustive, transient read error differs from empty.

**Proof:** Zod contract/unit privacy cases, source-projection + owner-scoped API integration in **explicitly approved disposable SQL** only, pagination/ordering tests, one browser Journal fixture if actual client consumer changed. No cloud/prod DB, paid provider, large destructive backfill, notifications or automatic event replays.

## Next / exclusions

**Depends on ENG09 only for the new item-holder interruption source**; other source kinds can be designed independently, but don't double-map the same action event. GM06 seen cursor should consume the stable output after its coverage/sequence is accepted. No GM01/GM03/GM07 behavior, no new game authority.

**Handoff:** owner explicitly selects/authorizes GM05 + additive schema/testing permission; Cursor rechecks event writers and implements bounded projector/read DTO. Report exactly what old stories and public event classes remain unavailable.
