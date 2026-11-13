# ENG04 | Current gameplay reads do not load every historical activity

**State:** Proposed, **design-ready for approval after source reinspection**, not Ready or code-authorized. **Kind:** bounded query/projection behavior and tests. **Authority:** [read-growth investigation](../../engine-architecture/evidence/read-growth-and-availability.md), [causal authority](../../engine-architecture/domain-authority.md).

## Cursor first-screen brief

> **Goal:** reading current Now/campaign state retrieves the **active activity plus applicable nonterminal commitments**, not every completed historical activity, while preserving all interrupted/resumable/blocked work and real status.
>
> **Start:** `packages/application/src/campaign/reads.ts::readCampaign` and `projectActivity`; `packages/db/src/schema/campaign.ts::gameActivity`; `packages/contracts/src/campaign.ts`. Nearest integration tests in `tools/api-integration/test/stories-core.integration.ts` and existing campaign view fixtures.
>
> **Known trap:** a naive `WHERE state = 'running'` query would **hide paused, encounter, suspended and blocked work** and destroy the player's feeling of persistent effort. Do not change how activities settle, or how Journal history is paged.

## Source-grounded baseline

`readCampaign` selects `SELECT * FROM game_activity WHERE story_id = X` and then searches/filter activities in JavaScript for current/commitments. The historical table grows with every activity. Existing rolls/events/reports already have bounded read slices; this Change addresses the **one named unbounded activity read** only.

## One narrow code outcome

- Select the current `activeActivityId` exactly when present, plus all relevant nonterminal commitments for the story, without fetching terminal historical rows.
- Correctly preserve the behavior of repeated/interrupted/resumable work and the existing public `CampaignView` contract.
- Add or adapt **one index** only if query-plan evidence supports it; no speculative indices on every column.
- Archived/completed history remains authoritative and separately accessible; don't delete rows or make an incomplete “All history” claim.
- Scope and cache identity remain viewer/story-safe, and any cross-story activeActivityId must fail as invalid.
- Do not fetch all old rolls, sources or activities merely to compute one active state.

## Tests and proof

**Normal:** one current running job and three earlier paused/resumable commitments remain accurately visible; completed terminal rows are not included in current projection. **Negative:** 1,000 completed activities plus one interrupted 3/9 work item still returns that item, correct progress/eligibility, no duplicate. Test no activity/null character/legacy narrative-only case. Verify actual DB rows/query count or `EXPLAIN` on a disposable fixture; don't claim p95 latency without load test. All existing public DTO and state semantics remain unchanged.

## Excluded work

Storyteller context long-scene query (independent later cut), Redis rewrite, Storybook UX, REST pagination redesign, event sourcing, new worker, full indexing service, destructive DB changes. **No code permission** until the owner selects this packet and rechecks current source; provider calls and non-disposable database mutation are prohibited.

## Handoff

Cursor returns changed SQL/source owners, exact query behavior, fixture counts, tests/EXPLAIN actually run, and whether an index was required. Reject the Change if it improves speed by forgetting suspended or blocked work.
