# GM05 selected product policy | source-backed public events, not a generated recap

**Status: selected V1 design, 2026-11-13; owner authorization required for implementation.** Parent [return and memory](../flows/return-and-memory.md), [mechanics program](../mechanics-evolution-program.md), [GM05 Change](../../changes/2026-11-13--gm-return-event-projection/CHANGE.md). **No code, billing, model or database migration approved by this Markdown.**

## Decision and boundaries

Create a small **append-only, owner-authorized public story event index** derived inside the same transactions that commit genuine mechanics/publication. This is a **read projection**, not a new domain truth/event bus. The first purpose is a readable **Recent developments** feed and source-linked Journal navigation; the user-specific **since last opened** claim remains GM06 and must not be inferred from GET time, list fetches or this projection alone.

Reject: (a) an LLM recap with no source references; (b) merging existing separate-table ordinals/timestamps in React and calling it a stable cursor; (c) an event per scheduler tick or speculative Storyteller candidate; (d) exposing private DCs, hidden obligations or secret NPC plans.

## Ordering decision: per-story commit sequence, independent of fictional time

Inspected `packages/db/src/schema/campaign.ts`: `game_action_execution_event`, `game_activity_event`, and `world_obligation_event` each have **their own** `ordinal`; `story_passage` has `sequence` for narrative revisions. No cross-table total order is presently proved. Wall timestamps are not a reliable global causal order, especially if later reports refer to earlier fiction.

**V1 projection must allocate one monotonically increasing `eventSequence` per story under the existing story write lock in the same SQL transaction that commits the source.** Small additive indexed table `story_public_event` (name illustrative) with unique `(storyId,eventSequence)` and unique `(storyId,sourceKind,sourceId)`; source identity must be a committed stable event/passsage/receipt identifier. A per-story counter or bounded max-seq read under the story lock is permitted if concurrency and performance are proved. New sequence allocation is transactionally committed or rolled back with source. No unguarded independent writer may append event rows out of the story lock. Avoid creating a new asynchronous projection coordinator.

`eventSequence` represents **order events became public/committed**, not guaranteed sort by `gameSecond`. Store `gameSecond` separately for the in-fiction chronology label. For same-game-second events, sequence remains unambiguous. Later historical reports appear when published, pointing back to their original source moment; they must not insert into a past cursor range.

**GM06 future cursor** may acknowledge this stable public `eventSequence`, not a mutable timestamp or the separate campaign source `ordinal` values.

## V1 public taxonomy (small and deliberately meaningful)

~~~ts
type PublicStoryEventV1 = {
  id: string;                  // stable opaque identity, no secrets
  sequence: number;            // per-story committed append order
  kind:
    | 'passage-published'
    | 'action-settled'
    | 'action-interrupted'
    | 'activity-development'
    | 'world-development';
  gameSecond: number | null;   // only when grounded
  title: string;               // safe human label, bounded
  summary?: string | null;     // strictly factual, from public committed state
  source: {
    kind: 'passage' | 'action-execution' | 'activity-event' | 'world-obligation';
    id: string;                // actual persisted source ID
    passageId?: string;        // only when a working, authorized Journal target exists
  };
};
type StoryEventPageV1 = {
  items: PublicStoryEventV1[];  // newest first, stable order by sequence
  nextBefore: number | null;
};
~~~

The exact contract file/types may use existing Zod conventions but the **semantics must not drift**. Source IDs are opaque to users but let server verify provenance. Title/summary cannot be improvised by an LLM or drawn from private model context. A public event is displayed only when player-authorized; a hidden/future obligation is excluded until its effect is actually public. Do not reveal the identity of the new item holder if it is not known to the character.

**First accepted sources**:
- `story_passage` newly *published* (not candidate/generated-but-uncommitted);
- terminal `game_action_execution_event` `settled` or `interrupted` (ENG09 gains a source-linked interruption with no success receipt, roll or item transfer);
- meaningful `game_activity_event` boundaries: actual earned milestone, pause/resume, interruption or completed state, **not** every scheduler check;
- `world_obligation_event` only when the fact is actually disclosed/visible to player; if visibility cannot be proved, omit in V1 rather than leak.

**Excluded** raw private ability DC, hidden future plan/obligation, unsent/failed Storyteller candidate, incomplete paid task, planned successor, unearned goal, all `gameRoll` details, unchanged tick events, raw worldCondition JSON. Optional published reports/relationships/inventory effects can be added later as explicit grounded taxonomy variants and disclosure proof; not an automatic join over every table.

## Read endpoint / identity

Suggested `GET /api/stories/:storyId/events?before=<sequence>`, with bounded page size (default 20, max 50), owner authorization identical in severity to story history, validated `before` positive integer, newest-first order by `sequence DESC`, stable `nextBefore` as exclusive next-page cursor. **Never** mutate a viewer-read pointer, story clock, generation, history or budget on GET.

An unauthorized or nonexistent story is owner-safe not-found/denied; no leaking event existence across viewers. A read failure is not an empty feed; existing Journal passage history remains independently accessible. The frontend may display an optional event summary and source link only when that link is real/authorized, not fabricate a `/journal/:id` page.

**Data access/retention:** this is private story data. Do not put it in public page caches, telemetry, client localStorage or operator cost analytics. Versioned typed schema, browser Query keyed by viewer + story + cursor; no parallel store. Older events paginated from DB, never loaded wholesale on Now SSR.

## Older stories / migration policy

An additive table cannot silently make old stories' events disappear. For first release, **newly committed events** are indexed while older published prose stays available via existing StoryHistory. Label the new index as “Recorded developments” only for periods where indexing is complete; **do not claim exhaustive lifetime chronology or since-last-viewed** for unbackfilled old stories.

A migration/backfill of old committed sources requires a separate deterministic, idempotent, permissioned job with schema/visibility review and explicit disposable DB proof before production. It must avoid inserting older events *behind an already acknowledged cursor* without a versioned migration policy. GM05 should expose a feed-coverage boundary (e.g. `coverage: 'since-enabled'|'complete'` with a stable baseline) so the client can show honest copy; exact field and source gate chosen with schema implementation. GM06 waits until cursor semantics and legacy coverage are proven.

## Source anchors / acceptance

Start: `packages/db/src/schema/campaign.ts` (distinct event sequences), `packages/db/src/schema/stories.ts::storyPassage`, `packages/application/src/campaign/action-executions.ts::recordActionExecutionEvent/settleActionExecution`, `packages/application/src/campaign/persistence.ts::recordActivityEvent`, `packages/application/src/stories/continuation.ts` (published passage), `packages/application/src/stories/reads.ts::readHistory`. Narrow to relevant source after inspection.

**Positive:** scripted Graywake 0→3/9 earned, later failed/paused repair, holder invalidation and a published passage appear as bounded ordered facts with working passage source where available, even with no model budget to summarize. Cursor stable across pagination and duplicated worker delivery. Equal in-world time still has deterministic display.

**Negative:** duplicate commits no duplicate `sourceKind/sourceId`; unrelated-story events never leak; hidden obligation remains hidden; unfinished candidate/pending plan excluded; stale event can't re-enable choice; viewer A/B and 401/404 isolation; late report doesn't backdate an old cursor; missing source link omitted rather than fabricated; no LLM on GET. No raw inner JSON/DC in public DTO.

**Excluded:** GM06 seen acknowledgment, notification delivery, generic event sourcing framework, prose regeneration, world simulation or model summary. The feed is derived evidence only.

## Design readiness

The event kinds, ordering invariant, public privacy and API behavior are selected. The GM05 Change can be **implementation-ready for explicit owner authorization**, with a transactional projector and bounded read model, when current-source writer map is rechecked. Its physical SQL migration and database integration need explicit approval before executing tests. No free backfill, no new engine behavior, and no frontend invented history.
